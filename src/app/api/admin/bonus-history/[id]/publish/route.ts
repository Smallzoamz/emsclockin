import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 1. Update DB
    const { data, error } = await supabase
      .from("bonus_history")
      .update({ is_published: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === '42703') {
        throw new Error("คอลัมน์ is_published ไม่มีอยู่ใน Database (อย่าลืมรัน SQL)");
      }
      throw error;
    }

    // 2. Send Discord Webhook (Optional)
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "EMS Clock-in Bot",
            avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
            embeds: [{
              title: "🎉 สรุปโบนัสประจำสัปดาห์ออกแล้ว!",
              description: `ประกาศโบนัสรอบวันที่ **${data.week_start}** ถึง **${data.week_end}** เรียบร้อยแล้ว\n\nแพทย์ทุกท่านสามารถล็อคอินเข้าสู่ระบบและไปที่เมนู **"💰 โบนัสของฉัน"** เพื่อตรวจสอบชั่วโมงและยอดโบนัสของท่านได้เลยครับ`,
              color: 0x10b981, // Emerald 500
            }]
          })
        });
      } catch (e) {
        console.error("Failed to send publish webhook", e);
      }
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error: any) {
    console.error("[Publish Bonus] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish bonus" }, { status: 500 });
  }
}
