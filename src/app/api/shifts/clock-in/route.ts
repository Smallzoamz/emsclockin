import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";
import { formatThaiDate } from "@/lib/utils";
import { syncOpQueueToDiscord, teardownOpQueue } from "@/lib/op-discord-sync";

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  const userName = session.user.name || "Unknown";
  const user = session.user as Record<string, unknown>;
  const discordUsername = (user.discordUsername as string) || undefined;
  const avatarUrl = (session.user.image as string) || undefined;

  try {
    // Check if user already has an active or pending_proof shift
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_email", userEmail)
      .in("status", ["active", "pending_proof"])
      .maybeSingle();

    if (activeShift) {
      return NextResponse.json(
        { 
          error: activeShift.status === "pending_proof"
            ? "คุณมีเวรที่รอการอัปโหลดรูปหลักฐานอยู่ กรุณาส่งรูปหลักฐานก่อนเริ่มเวรใหม่ค่ะ"
            : "คุณอยู่ในเวรอยู่แล้ว กรุณาออกเวรก่อน"
        },
        { status: 400 }
      );
    }

    // Create new shift
    const now = new Date();
    const { data: newShift, error } = await supabase
      .from("shifts")
      .insert({
        user_email: userEmail,
        user_name: userName,
        discord_username: discordUsername || null,
        clock_in: now.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch custom name from settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "user_names")
      .single();
    
    const customNames = settingsData?.value || {};
    const finalName = customNames[userEmail] || userName;

    // Send Discord webhook
    const discordId = (user.discordId as string) || undefined;
    const messageId = await sendDiscordWebhook({
      username: finalName,
      discordUsername,
      discordId,
      action: "clock_in",
      timestamp: formatThaiDate(now),
      avatarUrl,
    });

    if (messageId) {
      await supabase.from("shifts").update({ discord_message_id: messageId }).eq("id", newShift.id);
    }

    // Fetch op_active from system_settings to see if we should sync active queue or update closed summary
    const { data: opActiveData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "op_active")
      .maybeSingle();
    const isOpActive = opActiveData?.value === true;

    if (isOpActive) {
      await syncOpQueueToDiscord();
    } else {
      await teardownOpQueue();
    }

    return NextResponse.json({
      success: true,
      shift: newShift,
      message: "เข้าเวรเรียบร้อย ✅",
    });
  } catch (error) {
    console.error("[Clock-in] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าเวร" },
      { status: 500 }
    );
  }
}
