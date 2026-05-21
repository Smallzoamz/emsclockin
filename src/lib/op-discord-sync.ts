import { supabase } from "@/lib/supabase";
import { formatThaiDate } from "@/lib/utils";

// ปรับ Delay ลงเหลือ 300ms เพื่อให้ตอบสนองเกือบจะทันทีที่กดย้าย
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncDebounceResolvers: Array<() => void> = [];

export function debouncedSyncOpQueueToDiscord(delay = 300): Promise<void> {
  return new Promise<void>((resolve) => {
    syncDebounceResolvers.push(resolve);

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    syncDebounceTimer = setTimeout(async () => {
      syncDebounceTimer = null;
      const resolvers = [...syncDebounceResolvers];
      syncDebounceResolvers = [];

      try {
        await syncOpQueueToDiscord();
      } catch (err) {
        console.error("[OP Sync Debounced] Error:", err);
      }

      resolvers.forEach(r => r());
    }, delay);
  });
}

export async function syncOpQueueToDiscord(forceNewMessage = false, forceUpdate = false) {
  try {
    // 1. ดึง Settings ก่อนเพื่อเอาค่า config พื้นฐาน
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value");

    const settings = (settingsData || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const webhookUrl = settings.discord_op_webhook_url || settings.discord_webhook_url || process.env.DISCORD_OP_WEBHOOK_URL;
    if (!webhookUrl) return;

    const opActive = settings.op_active === true;
    if (!opActive && !forceNewMessage && !forceUpdate) return;

    const opOpenedAt = settings.op_opened_at;

    // 2. ใช้ Promise.all เพื่อดึงข้อมูล Shifts ทั้งแบบ Active และ Recent พร้อมกัน (ลดเวลา Query)
    const [activeShiftsRes, recentShiftsRes] = await Promise.all([
      supabase.from("shifts").select("user_email, user_name, discord_username").is("clock_out", null).order("clock_in", { ascending: true }),
      opOpenedAt
        ? supabase.from("shifts").select("user_email, user_name, discord_username").not("clock_out", "is", null).gte("clock_out", opOpenedAt).order("clock_out", { ascending: false })
        : Promise.resolve({ data: [] })
    ]);

    const activeShifts = activeShiftsRes.data || [];
    const recentShifts = recentShiftsRes.data || [];

    // 3. จัดกลุ่มแพทย์ (Logic เดิมแต่รวบรวมข้อมูลจากที่ดึงมาพร้อมกัน)
    const registeredDoctors = settings.registered_doctors || [];
    const opQueueState = settings.op_queue_state || {};
    const doctors: any[] = [];
    const addedEmails = new Set<string>();

    const processShift = (shift: any, status: string, qCatDefault: string) => {
      if (!shift.user_email || addedEmails.has(shift.user_email)) return;
      const reg = registeredDoctors.find((d: any) => d.email === shift.user_email);
      const rawCat = opQueueState[shift.user_email] || qCatDefault;
      doctors.push({
        name: reg?.name || shift.user_name || "Unknown",
        queueCategory: rawCat.startsWith("skipped:") ? "skipped" : rawCat
      });
      addedEmails.add(shift.user_email);
    };

    activeShifts.forEach(s => processShift(s, "active", "active"));
    recentShifts.forEach(s => processShift(s, "completed", "inactive"));

    // 4. เตรียมข้อมูลสำหรับ Embed
    const activeList = doctors.filter(d => ["active", "receiving", "recase"].includes(d.queueCategory))
      .map(d => d.queueCategory === "receiving" ? `${d.name} **(รับเคส)**` : d.queueCategory === "recase" ? `${d.name} **(Re-Case)**` : d.name);

    const skippedList = doctors.filter(d => d.queueCategory === "skipped").map(d => d.name);
    const storyList = doctors.filter(d => d.queueCategory === "story").map(d => d.name);
    const inactiveList = doctors.filter(d => d.queueCategory === "inactive").map(d => d.name);

    const formatList = (list: string[]) => list.length ? list.map(n => `• ${n}`).join("\n") : "ไม่มี";

    const now = new Date();
    const embed = {
      title: "📋 รายงานการจัดคิวแพทย์ — EMS Hospital",
      color: opActive ? 0x3b82f6 : 0xef4444,
      description: `**👤 ผู้ปฏิบัติหน้าที่ OP:** \`${settings.op_active ? "กำลังตรวจสอบ..." : "ว่าง"}\`\n**📅 วันที่/เวลา:** \`${formatThaiDate(now)}\`\n${opActive && settings.notice ? `\n**⚠️ ประกาศ:**\n>>> ${settings.notice}` : ""}`,
      fields: opActive ? [
        { name: "🟢 เข้าเวรรับเคส", value: formatList(activeList), inline: false },
        { name: "🟡 ข้ามเคส / เหม่อ", value: formatList(skippedList), inline: false },
        { name: "🔵 รายชื่อหมอสตอรี่", value: formatList(storyList), inline: false },
        { name: "🔴 ออกจากระบบ (ออกเวร)", value: formatList(inactiveList), inline: false },
      ] : [{ name: "🏥 สถานะคิว", value: "ปิดระบบ OP แล้ว", inline: false }],
      footer: { text: "FiveM EMS Hospital Queue System" },
      timestamp: now.toISOString(),
    };

    // 5. ส่งข้อมูลไป Discord (PATCH ข้อความเดิมจะไวกว่า POST ใหม่)
    const existingMessageId = settings.op_discord_message_id;
    const usePatch = !!existingMessageId && !forceNewMessage;
    const url = usePatch ? `${webhookUrl}/messages/${existingMessageId}` : `${webhookUrl}?wait=true`;

    const response = await fetch(url, {
      method: usePatch ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "EMS Queue Bot",
        embeds: [embed],
      }),
    });

    if (response.ok && !usePatch) {
      const data = await response.json();
      await supabase.from("system_settings").upsert({ key: "op_discord_message_id", value: data.id });
    }
  } catch (err) {
    console.error("[OP Sync] Critical Error:", err);
  }
}