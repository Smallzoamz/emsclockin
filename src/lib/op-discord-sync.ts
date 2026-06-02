import { supabase } from "@/lib/supabase";
import { formatThaiDate } from "@/lib/utils";

// Module-level state for Discord sync queue
let isSyncing = false;
let hasPendingSync = false;
let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Queues a Discord sync task.
 * If a sync is already running, it schedules a pending sync.
 * Ensures only one sync executes at a time and consecutive syncs are spaced by at least 1.2 seconds.
 */
export function queueSyncOpQueueToDiscord() {
  if (isSyncing) {
    hasPendingSync = true;
    return;
  }

  isSyncing = true;
  hasPendingSync = false;

  // Clear any existing timer to be safe
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }

  // Run the sync
  syncOpQueueToDiscord()
    .catch((err) => console.error("[Queue Sync] Error:", err))
    .finally(() => {
      isSyncing = false;
      if (hasPendingSync) {
        // Coalesce rapid actions with a very brief 100ms window before the next execution
        pendingSyncTimer = setTimeout(() => {
          pendingSyncTimer = null;
          queueSyncOpQueueToDiscord();
        }, 100);
      }
    });
}

/**
 * Automatically compiles the doctor queue groups and edits/sends the single Discord Webhook message.
 */
export async function syncOpQueueToDiscord(forceNewMessage = false, forceUpdate = false) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch system settings, active shifts, recent shifts, and mentorship relationships in parallel
    const [settingsRes, activeShiftsRes, recentShiftsRes, mentorshipsRes] = await Promise.all([
      supabase.from("system_settings").select("key, value"),
      supabase
        .from("shifts")
        .select("user_email, user_name, discord_username")
        .is("clock_out", null)
        .order("clock_in", { ascending: true }),
      supabase
        .from("shifts")
        .select("user_email, user_name, discord_username, clock_out")
        .not("clock_out", "is", null)
        .gte("clock_out", oneDayAgo)
        .order("clock_out", { ascending: false }),
      Promise.resolve(
        supabase
          .from("mentorship_relations")
          .select("*")
          .eq("status", "active")
      ).catch((err: any) => {
        console.error("[OP Sync Discord] Failed to fetch mentorships:", err);
        return { data: [] };
      })
    ]);

    const settings = (settingsRes.data || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const dbWebhookOp = settings.discord_op_webhook_url;
    const dbWebhookGeneral = settings.discord_webhook_url;
    const webhookUrl = dbWebhookOp || dbWebhookGeneral || process.env.DISCORD_OP_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("[OP Sync] No Discord webhook URL configured, skipping sync.");
      return;
    }

    const opActive = settings.op_active === true;
    const existingMessageId = settings.op_discord_message_id;
    const notice = settings.op_notice || "⚠️ คำเตือน: รบกวนหมอเวรทุกคนเปิดวิทยุช่องหลัก และรายงานตัวทันทีเมื่อเข้าพื้นที่เวร!";
    const opSchedule = settings.op_schedule || {};
    const registeredDoctors = settings.registered_doctors || [];
    const opQueueState = settings.op_queue_state || {};
    const opCaseCounts = settings.op_case_counts || {};

    // If OP is not active, we do not sync updates to Discord unless forced
    if (!opActive && !forceNewMessage && !forceUpdate) {
      return;
    }

    const activeShifts = activeShiftsRes.data;

    // Filter recent shifts by opOpenedAt in memory to preserve correctness without sequential DB trips
    const opOpenedAt = settings.op_opened_at;
    let recentShifts: any[] = [];
    if (opOpenedAt && recentShiftsRes.data) {
      recentShifts = recentShiftsRes.data.filter((shift: any) => shift.clock_out >= opOpenedAt);
    }

    // 4. Group doctors
    const doctors: Array<{ email: string; name: string; discordUsername: string; status: string; queueCategory: string; cases?: number; recases?: number }> = [];
    const addedEmails = new Set<string>();
    const activeMentorships = mentorshipsRes?.data || [];
    const activeEmails = new Set<string>(activeShifts?.map((s: any) => s.user_email).filter(Boolean) || []);

    const getActiveMentorOf = (studentEmail: string) => {
      return activeMentorships.find((r: any) => r.student_email === studentEmail && activeEmails.has(r.mentor_email));
    };

    const getActiveStudentsOf = (mentorEmail: string) => {
      return activeMentorships.filter((r: any) => r.mentor_email === mentorEmail && activeEmails.has(r.student_email));
    };

    if (activeShifts) {
      activeShifts.forEach((shift: any) => {
        const email = shift.user_email;
        if (!email || addedEmails.has(email)) return;

        const registered = registeredDoctors.find((d: any) => d.email === email);
        const baseName = registered?.name || shift.user_name || "Unknown Doctor";
        const discordUsername = registered?.discordUsername || shift.discord_username || "";
        const rawCat = opQueueState[email] || "active";
        const qCategory = rawCat.startsWith("skipped:") ? "skipped" : rawCat;
        const counts = opCaseCounts[email] || { cases: 0, recases: 0 };

        const relationAsStudent = getActiveMentorOf(email);
        const activeStudents = getActiveStudentsOf(email);
        const generalRelationAsStudent = activeMentorships.find((r: any) => r.student_email === email);

        if (activeStudents.length > 0) {
          // Mentor has active clocked-in students, so we skip adding them as a standalone card.
          return;
        }

        let displayName = baseName;
        if (relationAsStudent) {
          displayName = `${relationAsStudent.mentor_name} + ${baseName}`;
        } else if (generalRelationAsStudent) {
          displayName = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
        }

        doctors.push({
          email,
          name: displayName,
          discordUsername,
          status: "active",
          queueCategory: qCategory,
          cases: counts.cases || 0,
          recases: counts.recases || 0
        });
        addedEmails.add(email);
      });
    }

    if (recentShifts) {
      recentShifts.forEach((shift: any) => {
        const email = shift.user_email;
        if (!email || addedEmails.has(email)) return;

        const registered = registeredDoctors.find((d: any) => d.email === email);
        const baseName = registered?.name || shift.user_name || "Unknown Doctor";
        const discordUsername = registered?.discordUsername || shift.discord_username || "";

        const relationAsStudent = getActiveMentorOf(email);
        const activeStudents = getActiveStudentsOf(email);
        const generalRelationAsStudent = activeMentorships.find((r: any) => r.student_email === email);

        if (activeStudents.length > 0) {
          // Skip standalone mentor card if they have clocked-in students
          return;
        }

        let displayName = baseName;
        if (relationAsStudent) {
          displayName = `${relationAsStudent.mentor_name} + ${baseName}`;
        } else if (generalRelationAsStudent) {
          displayName = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
        }

        doctors.push({
          email,
          name: displayName,
          discordUsername,
          status: "completed",
          queueCategory: "inactive"
        });
        addedEmails.add(email);
      });
    }

    const formatCounts = (d: typeof doctors[0]) => {
      const parts: string[] = [];
      if (d.cases && d.cases > 0) parts.push(`🟢 ${d.cases} เคส`);
      if (d.recases && d.recases > 0) parts.push(`🟡 ${d.recases} รีเคส`);
      return parts.length > 0 ? ` [${parts.join(" | ")}]` : "";
    };

    const activeList = doctors
      .filter(d => d.queueCategory === "active" || d.queueCategory === "receiving" || d.queueCategory === "recase")
      .map(d => {
        const counts = formatCounts(d);
        if (d.queueCategory === "receiving") {
          return `${d.name} **(รับเคส)**${counts}`;
        }
        if (d.queueCategory === "recase") {
          return `${d.name} **(Re-Case)**${counts}`;
        }
        return `${d.name}${counts}`;
      });
    const skippedList = doctors.filter(d => d.queueCategory === "skipped").map(d => `${d.name}${formatCounts(d)}`);
    const storyList = doctors.filter(d => d.queueCategory === "story").map(d => `${d.name}${formatCounts(d)}`);
    const inactiveList = doctors.filter(d => d.queueCategory === "inactive").map(d => d.name);

    // 5. Determine today's day & OP details
    const thaiTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[thaiTime.getUTCDay()];
    const todayOps = opSchedule[currentDay] || [];

    const opDisplayNames = opActive
      ? (todayOps.map((username: string) => {
        const doc = registeredDoctors.find((d: any) => d.discordUsername === username);
        return doc ? doc.name : `@${username}`;
      }).join(", ") || "ไม่มีผู้ปฏิบัติหน้าที่")
      : "ว่าง";

    // 6. Build content and embed
    const formatList = (list: string[]) => {
      if (!list || list.length === 0) return "ไม่มี";
      return list.map(name => `• ${name}`).join("\n");
    };

    const now = new Date();

    // Custom tag block if starting OP
    let content = "";
    if (opActive) {
      // Find discord ID of current OPs to tag them
      const opMentions = todayOps.map((username: string) => {
        const doc = registeredDoctors.find((d: any) => d.discordUsername === username);
        return doc?.discordId ? `<@${doc.discordId}>` : `\`@${username}\``;
      }).join(" ");

      if (forceNewMessage) {
        content = `🔔 **เปิดเวร OP แล้ว:** ${opMentions} กำลังเข้าควบคุมคิวเวรประจำวันนี้!`;
      } else {
        content = `🟢 **ระบบจัดคิว OP กำลังทำงาน...** (ผู้ควบคุมเวร: ${opMentions})`;
      }
    } else {
      content = `🔴 **ปิดเวร OP แล้วเมื่อเวลา** \`${formatThaiDate(now)}\` ขอบคุณคุณหมอทุกท่านค่ะ`;
    }

    const embed = {
      title: "📋 รายงานการจัดคิวแพทย์ — EMS Hospital",
      color: opActive ? 0x3b82f6 : 0xef4444, // Blue if active, Red if closed
      description: [
        `**👤 ผู้ปฏิบัติหน้าที่ OP:** \`${opDisplayNames}\``,
        `**📅 วันที่/เวลา:** \`${formatThaiDate(now)}\``,
        opActive && notice ? `\n**⚠️ คำเตือน / ประกาศ:**\n>>> ${notice}` : "",
      ].filter(Boolean).join("\n"),
      fields: opActive ? [
        {
          name: "🟢 เข้าเวรรับเคส",
          value: formatList(activeList),
          inline: false,
        },
        {
          name: "🟡 ข้ามเคส / เหม่อ",
          value: formatList(skippedList),
          inline: false,
        },
        {
          name: "🔵 รายชื่อหมอสตอรี่",
          value: formatList(storyList),
          inline: false,
        },
        {
          name: "🔴 ออกจากระบบ (ออกเวร)",
          value: formatList(inactiveList),
          inline: false,
        },
      ] : [
        {
          name: "🏥 สถานะคิว",
          value: "ปิดรับเคสและปิดควบคุมระบบ OP แล้ว",
          inline: false
        }
      ],
      footer: {
        text: "FiveM EMS Hospital Queue System",
      },
      timestamp: now.toISOString(),
    };

    const requestBody = {
      content: content || undefined,
      username: "EMS Queue Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
      embeds: [embed],
    };

    let usePatch = !!existingMessageId;
    let url = usePatch
      ? `${webhookUrl}/messages/${existingMessageId}`
      : `${webhookUrl}?wait=true`;

    let method = usePatch ? "PATCH" : "POST";

    let response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    // Fallback: If PATCH fails (e.g. 404 message deleted), try POSTing a new message
    if (!response.ok && usePatch && (response.status === 404 || response.status === 400)) {
      console.warn(`[OP Sync] PATCH failed with status ${response.status}. The message might have been deleted. Falling back to POST.`);
      usePatch = false;
      url = `${webhookUrl}?wait=true`;
      method = "POST";
      response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    }

    if (response.ok) {
      if (!usePatch) {
        const data = await response.json();
        // Save the new message ID to settings
        await supabase
          .from("system_settings")
          .upsert({ key: "op_discord_message_id", value: data.id }, { onConflict: "key" });
      }
      console.log(`[OP Sync] Successfully synced to Discord. Method: ${method}`);
    } else {
      const errText = await response.text();
      console.error(`[OP Sync] Discord API returned ${response.status}: ${errText}`);
    }
  } catch (err: any) {
    console.error("[OP Sync] Error in syncOpQueueToDiscord:", err);
  }
}

export async function teardownOpQueue() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch system settings, active shifts, recent shifts, and mentorship relationships in parallel
    const [settingsRes, activeShiftsRes, recentShiftsRes, mentorshipsRes] = await Promise.all([
      supabase.from("system_settings").select("key, value"),
      supabase
        .from("shifts")
        .select("user_email, user_name, discord_username, clock_in")
        .is("clock_out", null)
        .order("clock_in", { ascending: true }),
      supabase
        .from("shifts")
        .select("user_email, user_name, discord_username, clock_in, clock_out, duration_minutes")
        .not("clock_out", "is", null)
        .gte("clock_out", oneDayAgo)
        .order("clock_out", { ascending: false }),
      Promise.resolve(
        supabase
          .from("mentorship_relations")
          .select("*")
          .eq("status", "active")
      ).catch((err: any) => {
        console.error("[OP Teardown Discord] Failed to fetch mentorships:", err);
        return { data: [] };
      })
    ]);

    const settings = (settingsRes.data || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const dbWebhookOp = settings.discord_op_webhook_url;
    const dbWebhookGeneral = settings.discord_webhook_url;
    const webhookUrl = dbWebhookOp || dbWebhookGeneral || process.env.DISCORD_OP_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn("[OP Teardown] No Discord webhook URL configured, skipping.");
      return;
    }

    const existingMessageId = settings.op_discord_message_id;
    const registeredDoctors = settings.registered_doctors || [];

    const activeShifts = activeShiftsRes.data;

    // Filter recent shifts by opOpenedAt in memory
    const opOpenedAt = settings.op_opened_at;
    const opOpenedBy = settings.op_opened_by;

    let recentShifts: any[] = [];
    if (opOpenedAt && recentShiftsRes.data) {
      recentShifts = recentShiftsRes.data.filter((shift: any) => shift.clock_out >= opOpenedAt);
    }

    const opOpenerEmail = opOpenedBy?.email;
    const opOpenerDoc = registeredDoctors.find((d: any) => d.email === opOpenerEmail);
    const opOpenerName = opOpenerDoc?.name || opOpenedBy?.discordUsername || "ไม่ระบุ";

    const opOpenerMention = opOpenerDoc?.discordId
      ? `<@${opOpenerDoc.discordId}>`
      : (opOpenedBy?.discordUsername ? `\`@${opOpenedBy.discordUsername}\`` : "");

    // Fallback: calculate today's day & scheduled OPs if opener not set
    const opSchedule = settings.op_schedule || {};
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[new Date(new Date().getTime() + 7 * 60 * 60 * 1000).getUTCDay()];
    const todayOps = opSchedule[currentDay] || [];
    const fallbackOpNames = todayOps.map((username: string) => {
      const doc = registeredDoctors.find((d: any) => d.discordUsername === username);
      return doc ? doc.name : `@${username}`;
    }).join(", ") || "ไม่ระบุ";

    const opDisplayNames = opOpenerName !== "ไม่ระบุ" ? opOpenerName : fallbackOpNames;

    const activeMentorships = mentorshipsRes?.data || [];

    // Format lists of doctors
    const activeEmails = new Set<string>(activeShifts?.map((s: any) => s.user_email).filter(Boolean) || []);

    const getActiveMentorOf = (studentEmail: string) => {
      return activeMentorships.find((r: any) => r.student_email === studentEmail && activeEmails.has(r.mentor_email));
    };

    const getActiveStudentsOf = (mentorEmail: string) => {
      return activeMentorships.filter((r: any) => r.mentor_email === mentorEmail && activeEmails.has(r.student_email));
    };

    const formatActiveList = () => {
      if (!activeShifts || activeShifts.length === 0) return "ไม่มีแพทย์เข้าเวรขณะนี้";
      
      const list: string[] = [];
      const seen = new Set<string>();
      activeShifts.forEach((shift: any) => {
        const email = shift.user_email;
        if (!email || seen.has(email)) return;
        seen.add(email);

        const registered = registeredDoctors.find((d: any) => d.email === email);
        const baseName = registered?.name || shift.user_name || "Unknown Doctor";
        
        const relationAsStudent = getActiveMentorOf(email);
        const activeStudents = getActiveStudentsOf(email);
        const generalRelationAsStudent = activeMentorships.find((r: any) => r.student_email === email);

        if (activeStudents.length > 0) {
          // Mentor has active clocked-in students, so we skip adding them as a standalone card.
          return;
        }

        let name = baseName;
        if (relationAsStudent) {
          name = `${relationAsStudent.mentor_name} + ${baseName}`;
        } else if (generalRelationAsStudent) {
          name = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
        }
        list.push(`• ${name}`);
      });
      return list.length > 0 ? list.join("\n") : "ไม่มีแพทย์เข้าเวรขณะนี้";
    };

    const formatRecentList = () => {
      if (!recentShifts || recentShifts.length === 0) return "ไม่มีแพทย์ออกเวรในรอบนี้";
      
      const list: string[] = [];
      const seen = new Set<string>();
      recentShifts.forEach((shift: any) => {
        const email = shift.user_email;
        if (!email || seen.has(email)) return;
        seen.add(email);

        const registered = registeredDoctors.find((d: any) => d.email === email);
        const baseName = registered?.name || shift.user_name || "Unknown Doctor";
        
        const relationAsStudent = getActiveMentorOf(email);
        const activeStudents = getActiveStudentsOf(email);
        const generalRelationAsStudent = activeMentorships.find((r: any) => r.student_email === email);

        if (activeStudents.length > 0) {
          // Skip standalone mentor card if they have clocked-in students
          return;
        }

        let name = baseName;
        if (relationAsStudent) {
          name = `${relationAsStudent.mentor_name} + ${baseName}`;
        } else if (generalRelationAsStudent) {
          name = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
        }
        list.push(`• ${name}`);
      });
      return list.length > 0 ? list.join("\n") : "ไม่มีแพทย์ออกเวรในรอบนี้";
    };

    // 4. Build summary embed
    const now = new Date();
    const embed = {
      title: "📋 สรุปรายงานเวรแพทย์ — EMS Hospital",
      color: 0xef4444, // Red / Closed color
      description: [
        `**👤 ผู้ปฏิบัติหน้าที่ OP:** ${opOpenerMention ? `${opOpenerMention} (${opOpenerName})` : `\`${opDisplayNames}\``}`,
        `**📅 วันที่/เวลาปิดเวร:** \`${formatThaiDate(now)}\``,
        `**🏥 สถานะระบบ OP:** \`🔴 ปิดปฏิบัติงานจัดคิว OP แล้ว\``,
      ].filter(Boolean).join("\n"),
      fields: [
        {
          name: "🟢 แพทย์ที่ยังเข้าเวรอยู่ (On Duty)",
          value: formatActiveList(),
          inline: false,
        },
        {
          name: "🔴 แพทย์ที่ออกเวรแล้ววันนี้ (Off Duty)",
          value: formatRecentList(),
          inline: false,
        },
      ],
      footer: {
        text: "FiveM EMS Hospital Shift Summary",
      },
      timestamp: now.toISOString(),
    };

    // 5. Delete the persistent queue message from Discord
    if (existingMessageId) {
      const deleteUrl = `${webhookUrl}/messages/${existingMessageId}`;
      try {
        const delRes = await fetch(deleteUrl, { method: "DELETE" });
        if (delRes.ok) {
          console.log(`[OP Teardown] Successfully deleted active OP message ID: ${existingMessageId}`);
        } else {
          console.warn(`[OP Teardown] Failed to delete active OP message. Status: ${delRes.status}`);
        }
      } catch (delErr) {
        console.error("[OP Teardown] Error deleting Discord message:", delErr);
      }
    }

    // 6. Send the new summary message
    const summaryRequestBody = {
      username: "EMS Summary Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
      embeds: [embed],
    };

    const postRes = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summaryRequestBody),
    });

    if (postRes.ok) {
      console.log("[OP Teardown] Successfully posted summary message to Discord.");
    } else {
      const errText = await postRes.text();
      console.error(`[OP Teardown] Discord API returned ${postRes.status} for summary: ${errText}`);
    }

    // 7. Clear state, message ID, OP owner, and case counts
    await Promise.all([
      supabase.from("system_settings").upsert({ key: "op_discord_message_id", value: null }, { onConflict: "key" }),
      supabase.from("system_settings").upsert({ key: "op_queue_state", value: {} }, { onConflict: "key" }),
      supabase.from("system_settings").upsert({ key: "op_opened_by", value: null }, { onConflict: "key" }),
      supabase.from("system_settings").upsert({ key: "op_case_counts", value: {} }, { onConflict: "key" })
    ]);
  } catch (err: any) {
    console.error("[OP Teardown] Error in teardownOpQueue:", err);
  }
}
