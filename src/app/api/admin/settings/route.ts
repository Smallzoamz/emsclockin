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

    // Run reset check for conduct points
    const session = await auth();
    const userEmail = session?.user?.email;
    const registeredDoctors = settings['registered_doctors'] || [];
    let updated = false;

    if (userEmail && Array.isArray(registeredDoctors)) {
      const docIdx = registeredDoctors.findIndex((d: any) => d.email?.toLowerCase() === userEmail.toLowerCase());
      if (docIdx !== -1) {
        const doc = registeredDoctors[docIdx];
        const now = new Date();
        const lastUpdated = doc.conductPointsUpdatedAt ? new Date(doc.conductPointsUpdatedAt) : null;
        const daysDiff = lastUpdated ? (now.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24) : 0;
        
        // Initialize or reset conduct points to 10
        if (doc.conductPoints === undefined) {
          doc.conductPoints = 10;
          doc.conductPointsUpdatedAt = now.toISOString();
          updated = true;
        } else if (!lastUpdated || daysDiff >= 30) {
          doc.conductPoints = 10;
          doc.conductPointsUpdatedAt = now.toISOString();
          updated = true;
        }
        
        if (updated) {
          registeredDoctors[docIdx] = doc;
          await supabase
            .from("system_settings")
            .upsert({ 
              key: "registered_doctors", 
              value: registeredDoctors, 
              updated_at: now.toISOString() 
            });
          settings['registered_doctors'] = registeredDoctors;
        }
      }
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
          conductPoints?: number;
          conductPointsUpdatedAt?: string;
        }>;

        // Check for doctors who reached 0 conduct points to trigger dismissal requests
        for (const doc of newDoctors) {
          if (doc.conductPoints === 0) {
            const docDiscordId = doc.discordId || "Unknown";
            const docDiscordUsername = doc.discordUsername || "Unknown";
            const docName = doc.name || "Unknown";
            
            const { data: existing } = await supabase
              .from("resignation_requests")
              .select("id")
              .eq("discord_id", docDiscordId)
              .eq("type", "dismissal")
              .eq("status", "pending")
              .maybeSingle();

            if (!existing) {
              // Calculate total completed shift hours
              let totalHours = 0;
              if (doc.email) {
                const { data: userShifts } = await supabase
                  .from("shifts")
                  .select("duration_minutes")
                  .eq("user_email", doc.email)
                  .eq("status", "completed");
                const totalMinutes = (userShifts || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
                totalHours = parseFloat((totalMinutes / 60).toFixed(1));
              }

              // Insert pending dismissal request
              await supabase
                .from("resignation_requests")
                .insert({
                  discord_username: docDiscordUsername,
                  discord_id: docDiscordId,
                  doctor_name: docName,
                  reason: "คะแนนความประพฤติสะสมเหลือ 0 คะแนน (โดนหักคะแนนความประพฤติครบ 10 แต้ม)",
                  total_hours: totalHours,
                  passing_hours: 40,
                  is_reset: true,
                  status: "pending",
                  type: "dismissal",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
            }
          }
        }

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
