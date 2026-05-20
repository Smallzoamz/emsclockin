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

          const adminAccounts = settingsData?.value || [];
          if (Array.isArray(adminAccounts)) {
            const matched = adminAccounts.find(
              (acc: any) => acc.username === username && acc.password === password
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
          // Check database for registered Discord admins (by email or username)
          try {
            const { data: discAdminsData } = await supabase
              .from("system_settings")
              .select("value")
              .eq("key", "admin_discord_accounts")
              .single();

            const discordAdmins = discAdminsData?.value || [];
            if (Array.isArray(discordAdmins)) {
              const isDiscordAdmin = discordAdmins.some(
                (adm: any) =>
                  (adm.email && typeof user.email === "string" && adm.email.toLowerCase() === user.email.toLowerCase()) ||
                  (adm.username && typeof token.discordUsername === "string" && adm.username.toLowerCase() === (token.discordUsername as string).toLowerCase())
              );
              if (isDiscordAdmin) {
                token.role = "admin";
              }
            }
          } catch (dbErr) {
            console.error("[Auth Discord Admin Check] Error:", dbErr);
          }
        }
        
        const avatarUrl = token.discordAvatar 
          ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.discordAvatar}.png` 
          : `https://cdn.discordapp.com/embed/avatars/${Number(token.discordId) % 5}.png`;
        token.avatar = avatarUrl;

        // Register/update doctor in system_settings
        try {
          const { data: settingsData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "registered_doctors")
            .single();

          let registeredDoctors = settingsData?.value || [];
          if (!Array.isArray(registeredDoctors)) {
            registeredDoctors = [];
          }

          const userEmail = user.email;
          const userName = user.name || token.discordUsername || "Unknown";

          const existingIdx = registeredDoctors.findIndex((d: any) => d.email === userEmail);
          
          // Check if we should fetch nickname from Discord (Mode 1 check)
          let finalName = userName;
          const { data: opModeData } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "op_nickname_mode")
            .single();
          const syncMode = opModeData?.value || "manual";
          const botToken = process.env.DISCORD_BOT_TOKEN;
          const guildId = process.env.DISCORD_GUILD_ID;

          if (syncMode === "discord" && botToken && guildId && token.discordId) {
            try {
              const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${token.discordId}`, {
                headers: {
                  Authorization: `Bot ${botToken}`
                }
              });
              if (res.ok) {
                const memberData = await res.json();
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
            const { data: namesData } = await supabase
              .from("system_settings")
              .select("value")
              .eq("key", "user_names")
              .single();
            const customNames = namesData?.value || {};
            if (customNames[userEmail]) {
              finalName = customNames[userEmail];
            }
          }

          const doctorInfo = {
            email: userEmail,
            name: finalName,
            discordUsername: token.discordUsername,
            avatarUrl: avatarUrl,
            discordId: token.discordId,
            updatedAt: new Date().toISOString()
          };

          if (existingIdx > -1) {
            registeredDoctors[existingIdx] = {
              ...registeredDoctors[existingIdx],
              ...doctorInfo
            };
          } else {
            registeredDoctors.push(doctorInfo);
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
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
