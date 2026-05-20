import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    return NextResponse.json({
      error: "Discord Bot Token or Guild ID is not configured in .env.local"
    }, { status: 400 });
  }

  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "registered_doctors")
      .single();

    let registeredDoctors = settingsData?.value || [];
    if (!Array.isArray(registeredDoctors)) {
      return NextResponse.json({ success: true, count: 0, message: "No registered doctors found." });
    }

    let updatedCount = 0;
    const updatedDoctors = await Promise.all(
      registeredDoctors.map(async (doc: any) => {
        if (!doc.discordId) return doc;

        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${doc.discordId}`, {
            headers: {
              Authorization: `Bot ${botToken}`
            }
          });

          if (res.ok) {
            const memberData = await res.json();
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
  } catch (error: any) {
    console.error("[OP Sync Nicknames API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync nicknames" }, { status: 500 });
  }
}
