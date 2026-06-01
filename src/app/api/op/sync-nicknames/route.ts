import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: settingsRows } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["registered_doctors", "discord_bot_token", "discord_guild_id"]);

    const settingsMap = (settingsRows || []).reduce((acc: Record<string, unknown>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const botToken = typeof settingsMap["discord_bot_token"] === "string" ? settingsMap["discord_bot_token"] : process.env.DISCORD_BOT_TOKEN;
    const guildId = typeof settingsMap["discord_guild_id"] === "string" ? settingsMap["discord_guild_id"] : process.env.DISCORD_GUILD_ID;

    if (!botToken || !guildId) {
      return NextResponse.json({
        error: "กรุณาตั้งค่า Discord Bot Token และ Guild ID ในระบบตั้งค่าผู้ดูแลหลัก หรือไฟล์ .env ก่อนค่ะ"
      }, { status: 400 });
    }

    const registeredDoctors = (settingsMap["registered_doctors"] || []) as Array<{
      email?: string;
      name?: string;
      discordUsername?: string;
      avatarUrl?: string;
      discordId?: string;
      updatedAt?: string;
    }>;
    if (!Array.isArray(registeredDoctors)) {
      return NextResponse.json({ success: true, count: 0, message: "No registered doctors found." });
    }

    let updatedCount = 0;
    const updatedDoctors = await Promise.all(
      registeredDoctors.map(async (doc) => {
        if (!doc.discordId) return doc;

        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${doc.discordId}`, {
            headers: {
              Authorization: `Bot ${botToken}`
            }
          });

          if (res.ok) {
            const memberData = (await res.json()) as { nick?: string; user?: { global_name?: string; username?: string; avatar?: string } };
            let newName = doc.name;

            if (memberData.nick) {
              newName = memberData.nick;
            } else if (memberData.user?.global_name) {
              newName = memberData.user.global_name;
            } else if (memberData.user?.username) {
              newName = memberData.user.username;
            }

            if (newName !== doc.name) {
              updatedCount++;
              return {
                ...doc,
                name: newName,
                avatarUrl: memberData.user?.avatar 
                  ? `https://cdn.discordapp.com/avatars/${doc.discordId}/${memberData.user.avatar}.png` 
                  : doc.avatarUrl,
                updatedAt: new Date().toISOString()
              };
            }
          }
        } catch (fetchErr) {
          console.error(`[Sync Nickname] Failed for user ${doc.email}:`, fetchErr);
        }

        return doc;
      })
    );

    if (updatedCount > 0) {
      await supabase
        .from("system_settings")
        .upsert({
          key: "registered_doctors",
          value: updatedDoctors,
          updated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully synchronized ${updatedCount} nicknames from Discord.`
    });
  } catch (error) {
    const err = error as Error;
    console.error("[OP Sync Nicknames API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync nicknames" }, { status: 500 });
  }
}
