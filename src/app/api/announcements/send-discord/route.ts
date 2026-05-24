import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Retrieve Webhook URL
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .single();

    const webhookUrl = settingsData?.value || process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: "ไม่ได้กำหนดตั้งค่า Discord Webhook ในระบบ กรุณาติดต่อแอดมินค่ะ" }, { status: 400 });
    }

    // Send to Discord
    const discordPayload = {
      username: "Announcement Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/3199/3199859.png",
      content: content,
      embeds: title ? [
        {
          title: title,
          color: 0x10b981, // Emerald Green
          description: content,
          timestamp: new Date().toISOString(),
          footer: {
            text: `ส่งโดยแพทย์: ${session.user.name || session.user.email}`
          }
        }
      ] : undefined
    };

    // If embeds are used, we don't duplicate content in the main text block
    const payload = title ? { ...discordPayload, content: undefined } : { username: discordPayload.username, avatar_url: discordPayload.avatar_url, content: content };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Announcement Discord Webhook] Failed:", res.status, text);
      return NextResponse.json({ error: "ส่งประกาศไปยัง Discord ไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Announcement Discord POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
