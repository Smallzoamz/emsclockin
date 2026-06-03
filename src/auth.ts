import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
    Credentials({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;

        // 1. Check master admin config from environment
        if (username === "admin" && password === process.env.ADMIN_PASSWORD) {
          return {
            id: "admin-master",
            name: "Master Admin",
            email: "lneeobee@gmail.com",
            role: "admin",
          };
        }

        // 2. Check database for custom admin credentials accounts
        try {
          const { data: settingsData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "admin_credentials_accounts")
            .single();

          const adminAccounts = (settingsData?.value || []) as Array<{ username?: string; password?: string; name?: string; email?: string }>;
          if (Array.isArray(adminAccounts)) {
            const matched = adminAccounts.find(
              (acc) => acc.username === username && acc.password === password
            );
            if (matched) {
              return {
                id: `admin-${matched.username}`,
                name: matched.name || matched.username,
                email: matched.email || `${matched.username}@local.admin`,
                role: "admin",
              };
            }
          }
        } catch (err) {
          console.error("Credentials authorize DB error:", err);
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;
        let botToken = process.env.DISCORD_BOT_TOKEN;
        let guildId = process.env.DISCORD_GUILD_ID;

        try {
          const { data: dbSettings } = await supabase
            .from("system_settings")
            .select("key, value")
            .in("key", ["discord_bot_token", "discord_guild_id"]);

          const settingsMap = (dbSettings || []).reduce((acc: Record<string, unknown>, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});

          if (typeof settingsMap["discord_bot_token"] === "string") botToken = settingsMap["discord_bot_token"];
          if (typeof settingsMap["discord_guild_id"] === "string") guildId = settingsMap["discord_guild_id"];
        } catch (dbErr) {
          console.error("[Auth Guild Guard DB Fetch] Error:", dbErr);
        }

        // Bypassing if environment variables and DB settings are not configured (e.g. local dev fallback)
        if (!botToken || !guildId) {
          console.warn("[Auth Guild Guard] DISCORD_BOT_TOKEN or DISCORD_GUILD_ID is not configured in .env or DB. Bypassing check.");
          return true;
        }

        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
          });
          
          if (!res.ok) {
            if (res.status === 404) {
              console.warn(`[Auth Guild Guard] User ${discordId} is not a member of guild ${guildId}. Sign-in rejected.`);
              return false;
            }
            console.error(`[Auth Guild Guard] Discord API returned error status: ${res.status}`);
            return false;
          }
          
          return true;
        } catch (err) {
          console.error("[Auth Guild Guard] Error verifying guild membership:", err);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (user) {
        if ("role" in user) {
          token.role = user.role;
        }
      }
      
      // If logging in via Discord, check if email matches admin email
      if (account?.provider === "discord" && user?.email) {
        token.discordId = account.providerAccountId;
        token.discordUsername = (profile as Record<string, unknown>)?.username as string;
        token.discordAvatar = (profile as Record<string, unknown>)?.avatar as string;
        
        // Auto assign admin if discord email matches default master email
        if (user?.email === "lneeobee@gmail.com") {
          token.role = "admin";
        } else {
          // Check database for registered Discord admins, bot token and guild id
          try {
            const { data: settingsRows } = await supabase
              .from("system_settings")
              .select("key, value")
              .in("key", ["admin_discord_accounts", "discord_bot_token", "discord_guild_id"]);

            const settingsMap = (settingsRows || []).reduce((acc: Record<string, any>, curr) => {
              acc[curr.key] = curr.value;
              return acc;
            }, {});

            let botToken = settingsMap["discord_bot_token"] || process.env.DISCORD_BOT_TOKEN;
            let guildId = settingsMap["discord_guild_id"] || process.env.DISCORD_GUILD_ID;
            let isGranted = false;

            // 1. Dynamic Check for Director / Deputy Director Discord roles
            if (botToken && guildId && token.discordId) {
              const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${token.discordId}`, {
                headers: {
                  Authorization: `Bot ${botToken}`
                }
              });

              if (memberRes.ok) {
                const memberData = (await memberRes.json()) as { roles?: string[] };
                const userRoles = memberData.roles || [];

                const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                  headers: {
                    Authorization: `Bot ${botToken}`
                  }
                });

                if (rolesRes.ok) {
                  const rolesData = (await rolesRes.json()) as Array<{ id: string; name: string }>;
                  const targetRoleNames = ["ผอ.", "รองผอ.", "ผอ", "รอง ผอ", "รองผอ", "รอง ผอ.", "director", "deputy director"];
                  
                  const targetRoleIds = rolesData
                    .filter(r => targetRoleNames.some(name => r.name.trim().toLowerCase() === name.toLowerCase()))
                    .map(r => r.id);

                  if (userRoles.some(roleId => targetRoleIds.includes(roleId))) {
                    isGranted = true;
                    console.log(`[Auth Discord Role Check] User ${token.discordUsername} granted admin role via Discord director role.`);
                  }
                }
              }
            }

            // 2. Check registered Discord admins as fallback
            const discordAdmins = (settingsMap["admin_discord_accounts"] || []) as Array<{ email?: string; username?: string }>;
            if (Array.isArray(discordAdmins) && !isGranted) {
              const isDiscordAdmin = discordAdmins.some(
                (adm) =>
                  (adm.email && typeof user.email === "string" && adm.email.toLowerCase() === user.email.toLowerCase()) ||
                  (adm.username && typeof token.discordUsername === "string" && adm.username.toLowerCase() === (token.discordUsername as string).toLowerCase())
              );
              if (isDiscordAdmin) {
                isGranted = true;
              }
            }

            if (isGranted) {
              token.role = "admin";
            }
          } catch (dbErr) {
            console.error("[Auth Discord Admin/Role Check] Error:", dbErr);
          }
        }
        
        const avatarUrl = token.discordAvatar 
          ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.discordAvatar}.png` 
          : `https://cdn.discordapp.com/embed/avatars/${Number(token.discordId) % 5}.png`;
        token.avatar = avatarUrl;

        // Register/update doctor in system_settings
        try {
          const { data: settingsRows } = await supabase
            .from("system_settings")
            .select("key, value")
            .in("key", ["registered_doctors", "op_nickname_mode", "user_names", "discord_bot_token", "discord_guild_id"]);

          const settingsMap = (settingsRows || []).reduce((acc: Record<string, unknown>, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});

          let registeredDoctors = (settingsMap["registered_doctors"] || []) as Array<{
            email?: string;
            name?: string;
            discordUsername?: string;
            avatarUrl?: string;
            discordId?: string;
            updatedAt?: string;
            createdAt?: string;
          }>;
          if (!Array.isArray(registeredDoctors)) {
            registeredDoctors = [];
          }

          const userEmail = user.email;
          const userName = (user.name || (token.discordUsername as string) || "Unknown") as string;

          const existingIdx = registeredDoctors.findIndex((d) => d.email === userEmail);
          
          // Check if we should fetch nickname from Discord (Mode 1 check)
          let finalName: string = userName;
          const syncMode = typeof settingsMap["op_nickname_mode"] === "string" ? settingsMap["op_nickname_mode"] : "manual";
          const botToken = typeof settingsMap["discord_bot_token"] === "string" ? settingsMap["discord_bot_token"] : process.env.DISCORD_BOT_TOKEN;
          const guildId = typeof settingsMap["discord_guild_id"] === "string" ? settingsMap["discord_guild_id"] : process.env.DISCORD_GUILD_ID;

          if (syncMode === "discord" && botToken && guildId && token.discordId) {
            try {
              const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${token.discordId}`, {
                headers: {
                  Authorization: `Bot ${botToken}`
                }
              });
              if (res.ok) {
                const memberData = (await res.json()) as { nick?: string; user?: { global_name?: string } };
                if (memberData.nick) {
                  finalName = memberData.nick;
                } else if (memberData.user?.global_name) {
                  finalName = memberData.user.global_name;
                }
              }
            } catch (err) {
              console.error("[Auth Nickname Fetch] Failed:", err);
            }
          } else {
            // Check manual custom name override from user_names setting
            const customNames = (settingsMap["user_names"] || {}) as Record<string, string>;
            if (userEmail && customNames[userEmail]) {
              finalName = customNames[userEmail];
            }
          }

          const doctorInfo = {
            email: userEmail,
            name: finalName,
            discordUsername: token.discordUsername as string,
            avatarUrl: avatarUrl,
            discordId: token.discordId as string,
            updatedAt: new Date().toISOString()
          };

          token.name = finalName;

          if (existingIdx > -1) {
            registeredDoctors[existingIdx] = {
              createdAt: registeredDoctors[existingIdx].createdAt || registeredDoctors[existingIdx].updatedAt || new Date().toISOString(),
              ...registeredDoctors[existingIdx],
              ...doctorInfo
            };
          } else {
            registeredDoctors.push({
              ...doctorInfo,
              createdAt: new Date().toISOString()
            });
          }

          await supabase
            .from("system_settings")
            .upsert({ key: "registered_doctors", value: registeredDoctors, updated_at: new Date().toISOString() });
        } catch (dbErr) {
          console.error("[Auth Register Doctor] Error:", dbErr);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as unknown as Record<string, unknown>;
        user.discordId = token.discordId;
        user.discordUsername = token.discordUsername;
        user.avatar = token.avatar || token.discordAvatar;
        user.role = token.role;
        if (typeof token.name === "string") {
          user.name = token.name;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
