import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";
import { formatThaiDate } from "@/lib/utils";
import { queueSyncOpQueueToDiscord } from "@/lib/op-discord-sync";

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
    // Check if user already has an active shift
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_email", userEmail)
      .eq("status", "active")
      .single();

    if (activeShift) {
      return NextResponse.json(
        { error: "คุณอยู่ในเวรอยู่แล้ว กรุณาออกเวรก่อน" },
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

    // Update OP Discord queue message in real-time (via coalesced queue)
    queueSyncOpQueueToDiscord();

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
