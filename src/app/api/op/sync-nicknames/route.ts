import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function runNicknameSync() {
  const { data: settingsRows } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["registered_doctors", "discord_bot_token", "discord_guild_id", "doctor_ranks", "user_ranks"]);

  const settingsMap = (settingsRows || []).reduce((acc: Record<string, unknown>, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  const botToken = typeof settingsMap["discord_bot_token"] === "string" ? settingsMap["discord_bot_token"] : process.env.DISCORD_BOT_TOKEN;
  const guildId = typeof settingsMap["discord_guild_id"] === "string" ? settingsMap["discord_guild_id"] : process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    throw new Error("Discord Bot Token and Guild ID are not configured");
  }

  const registeredDoctors = (settingsMap["registered_doctors"] || []) as Array<{
    email?: string;
    name?: string;
    discordUsername?: string;
    avatarUrl?: string;
    discordId?: string;
    updatedAt?: string;
  }>;

  const doctorRanks = (settingsMap["doctor_ranks"] || []) as Array<{
    id: string;
    name: string;
    rate: number;
    discordRoleId?: string;
  }>;

  const userRanks = (settingsMap["user_ranks"] || {}) as Record<string, string>;
  let ranksUpdated = false;
  if (!Array.isArray(registeredDoctors)) {
    return { success: true, updatedCount: 0, message: "No registered doctors found." };
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
          const memberData = (await res.json()) as { nick?: string; user?: { global_name?: string; username?: string; avatar?: string }; roles?: string[] };
          let newName = doc.name;

          if (memberData.nick) {
            newName = memberData.nick;
          } else if (memberData.user?.global_name) {
            newName = memberData.user.global_name;
          } else if (memberData.user?.username) {
            newName = memberData.user.username;
          }

          // Sync ranks from Discord roles
          if (memberData.roles && Array.isArray(memberData.roles) && doc.email) {
            // Find which configured rank matches the user's roles on Discord.
            const matchedRank = doctorRanks.find(r => r.discordRoleId && memberData.roles?.includes(r.discordRoleId));
            
            if (matchedRank) {
              const currentRankId = userRanks[doc.email];
              if (currentRankId !== matchedRank.id) {
                userRanks[doc.email] = matchedRank.id;
                ranksUpdated = true;
              }
            } else {
              // No matching Discord role was found. 
              // Check if their current rank was bound to a Discord role.
              const currentRankId = userRanks[doc.email];
              if (currentRankId) {
                const currentRankObj = doctorRanks.find(r => r.id === currentRankId);
                // If their current rank was bound to a Discord role, but they no longer have it, clear it.
                if (currentRankObj && currentRankObj.discordRoleId) {
                  delete userRanks[doc.email];
                  ranksUpdated = true;
                }
              }
            }
          }

          const newAvatarUrl = memberData.user?.avatar 
            ? `https://cdn.discordapp.com/avatars/${doc.discordId}/${memberData.user.avatar}.png` 
            : doc.avatarUrl;

          if (newName !== doc.name || newAvatarUrl !== doc.avatarUrl) {
            updatedCount++;
            return {
              ...doc,
              name: newName,
              avatarUrl: newAvatarUrl,
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

  if (ranksUpdated) {
    await supabase
      .from("system_settings")
      .upsert({
        key: "user_ranks",
        value: userRanks,
        updated_at: new Date().toISOString()
      });
  }

  return {
    success: true,
    updatedCount,
    message: `Successfully synchronized ${updatedCount} nicknames from Discord.`
  };
}

export async function POST() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await runNicknameSync();
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error("[OP Sync Nicknames API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to sync nicknames" }, { status: 500 });
  }
}

