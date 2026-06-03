import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*");

    if (error) {
      if (error.code === '42P01') {
         // Table doesn't exist yet, return defaults
         return NextResponse.json({ settings: { bonus_threshold: 20 } });
      }
      throw error;
    }

    const settings: Record<string, any> = {};
    if (data) {
      data.forEach(item => {
        settings[item.key] = item.value;
      });
    }

    // Return all settings, while ensuring defaults
    return NextResponse.json({ 
      settings: {
        ...settings,
        bonus_threshold: settings['bonus_threshold'] ? Number(settings['bonus_threshold']) : 20,
        server_sync_enabled: settings['server_sync_enabled'] === true,
        server_sync_api_key: settings['server_sync_api_key'] || ""
      } 
    });
  } catch (error) {
    console.error("[Settings GET] Error:", error);
    return NextResponse.json({ settings: { bonus_threshold: 20 } });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Block non-master admins (like Discord admins) from editing sensitive administrative role keys
    const isSensitiveKey = [
      "admin_credentials_accounts", 
      "admin_discord_accounts", 
      "discord_webhook_url", 
      "discord_op_webhook_url",
      "discord_application_webhook_url",
      "server_sync_enabled",
      "server_sync_api_key",
      "discord_bot_token",
      "discord_guild_id"
    ].includes(key);
    if (isSensitiveKey && (user.discordId || user.email !== "lneeobee@gmail.com")) {
      return NextResponse.json({ error: "เฉพาะบัญชีผู้ดูแลระบบหลักของเว็บ (Master Admin) เท่านั้นที่สามารถจัดการสิทธิ์ผู้ดูแลระบบได้" }, { status: 403 });
    }

    // Restrict theme customization keys to Master Admin (credentials-based admins, i.e., no discordId)
    const isThemeKey = ["theme_accent_color", "theme_logo_url", "theme_bg_opacity", "theme_bg_style", "landing_page_data"].includes(key);
    if (isThemeKey && user.discordId) {
      return NextResponse.json(
        { error: "เฉพาะบัญชีผู้ดูแลระบบหลัก (Master Admin) เท่านั้นที่สามารถปรับแต่งธีมระบบหรือข้อมูลหน้าแรกได้ค่ะ" },
        { status: 403 }
      );
    }

    // If updating registered_doctors, perform cleanup for deleted doctors
    if (key === "registered_doctors") {
      try {
        const { data: settingsRows } = await supabase
          .from("system_settings")
          .select("key, value")
          .in("key", ["registered_doctors", "user_ranks", "op_schedule"]);

        const settingsMap = (settingsRows || []).reduce((acc: Record<string, any>, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});

        const oldDoctors = (settingsMap["registered_doctors"] || []) as Array<{
          email?: string;
          name?: string;
          discordUsername?: string;
          avatarUrl?: string;
          discordId?: string;
        }>;

        const userRanks = (settingsMap["user_ranks"] || {}) as Record<string, string>;
        const opSchedule = (settingsMap["op_schedule"] || {}) as Record<string, string[]>;

        const newDoctors = value as Array<{
          email?: string;
          name?: string;
          discordUsername?: string;
          avatarUrl?: string;
          discordId?: string;
        }>;

        const deletedDoctors = oldDoctors.filter(oldDoc => 
          !newDoctors.some(newDoc => newDoc.email === oldDoc.email)
        );

        if (deletedDoctors.length > 0) {
          let ranksChanged = false;
          let scheduleChanged = false;

          for (const doc of deletedDoctors) {
            const doctorEmail = doc.email;
            const targetDiscordId = doc.discordId;
            const targetDiscordUsername = doc.discordUsername;

            if (doctorEmail) {
              if (userRanks[doctorEmail]) {
                delete userRanks[doctorEmail];
                ranksChanged = true;
              }
            }

            if (targetDiscordUsername) {
              for (const day of Object.keys(opSchedule)) {
                if (Array.isArray(opSchedule[day]) && opSchedule[day].includes(targetDiscordUsername)) {
                  opSchedule[day] = opSchedule[day].filter(u => u !== targetDiscordUsername);
                  scheduleChanged = true;
                }
              }
            }

            if (doctorEmail) {
              await supabase.from("shifts").delete().eq("user_email", doctorEmail);
              await supabase.from("exam_attempts").delete().eq("user_email", doctorEmail);
              await supabase.from("user_inbox").delete().eq("user_email", doctorEmail);
              await supabase
                .from("mentorship_relations")
                .delete()
                .or(`mentor_email.eq.${doctorEmail},student_email.eq.${doctorEmail}`);
              await supabase.from("bonus_payouts").delete().eq("doctor_email", doctorEmail);
            }

            if (targetDiscordId) {
              await supabase.from("leave_requests").delete().eq("discord_id", targetDiscordId);
            } else if (targetDiscordUsername) {
              await supabase.from("leave_requests").delete().eq("discord_username", targetDiscordUsername);
            }
          }

          if (ranksChanged) {
            await supabase
              .from("system_settings")
              .upsert({
                key: "user_ranks",
                value: userRanks,
                updated_at: new Date().toISOString()
              });
          }

          if (scheduleChanged) {
            await supabase
              .from("system_settings")
              .upsert({
                key: "op_schedule",
                value: opSchedule,
                updated_at: new Date().toISOString()
              });
          }
        }
      } catch (err) {
        console.error("[Settings POST] Failed to cleanup deleted doctors:", err);
      }
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings POST] Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
