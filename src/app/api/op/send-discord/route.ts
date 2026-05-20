import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { formatThaiDate } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const discordUsername = user.discordUsername as string;
  const isAdmin = user.role === "admin";
  const opName = session.user.name || discordUsername || "Unknown OP";

  try {
    // Access control check: Admin or OP for today
    if (!isAdmin) {
      const { data: scheduleData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "op_schedule")
        .single();
      
      const opSchedule = scheduleData?.value || {};
      
      // Calculate day of week in GMT+7
      const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = dayNames[thaiTime.getUTCDay()];

      const todayOPs = opSchedule[currentDay] || [];
      const isOPForToday = discordUsername && todayOPs.includes(discordUsername);

      if (!isOPForToday) {
        return NextResponse.json({ error: "Today is not your scheduled OP duty day." }, { status: 403 });
      }
    }

    const body = await req.json();
    const { notice, activeList, skippedList, storyList, inactiveList } = body;

    // Fetch Webhook URLs from settings
    let dbWebhookOp = null;
    let dbWebhookGeneral = null;
    try {
      const { data: opUrlData } = await supabase.from("system_settings").select("value").eq("key", "discord_op_webhook_url").single();
      dbWebhookOp = opUrlData?.value;
      const { data: genUrlData } = await supabase.from("system_settings").select("value").eq("key", "discord_webhook_url").single();
      dbWebhookGeneral = genUrlData?.value;
    } catch (dbErr) {
      console.error("[send-discord API] Failed to query webhook settings:", dbErr);
    }

    const webhookUrl = dbWebhookOp || dbWebhookGeneral || process.env.DISCORD_OP_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Discord webhook URL is not configured." }, { status: 500 });
    }

    // Format list values
    const formatList = (list: string[]) => {
      if (!list || list.length === 0) return "ไม่มี";
      return list.map(name => `• ${name}`).join("\n");
    };

    const now = new Date();

    const embed = {
      title: "📋 รายงานการจัดคิวแพทย์ — EMS Hospital",
      color: 0x3b82f6, // Premium Sleek Blue
      description: [
        `**👤 ผู้ปฏิบัติหน้าที่ OP:** \`${opName}\``,
        `**📅 วันที่/เวลา:** \`${formatThaiDate(now)}\``,
        notice ? `\n**⚠️ คำเตือน / ประกาศ:**\n>>> ${notice}` : "",
      ].filter(Boolean).join("\n"),
      fields: [
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
      ],
      footer: {
        text: "FiveM EMS Hospital Queue System",
      },
      timestamp: now.toISOString(),
    };

    const requestBody = {
      username: "EMS Queue Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Discord API returned ${response.status}: ${errText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OP Send Discord API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send queue report to Discord" }, { status: 500 });
  }
}
