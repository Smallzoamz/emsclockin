import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, reason, isReset } = body;

    if (!email || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch system settings
    const { data: settingsRows } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["registered_doctors", "user_ranks", "op_schedule", "resignation_criteria_hours"]);

    const settingsMap = (settingsRows || []).reduce((acc: Record<string, any>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const registeredDoctors = (settingsMap["registered_doctors"] || []) as Array<{
      email?: string;
      name?: string;
      discordUsername?: string;
      avatarUrl?: string;
      discordId?: string;
    }>;

    const userRanks = (settingsMap["user_ranks"] || {}) as Record<string, string>;
    const opSchedule = (settingsMap["op_schedule"] || {}) as Record<string, string[]>;
    const criteriaHours = settingsMap["resignation_criteria_hours"] ? Number(settingsMap["resignation_criteria_hours"]) : 40;

    // 2. Find target doctor
    const doctorObj = registeredDoctors.find(doc => doc.email?.toLowerCase() === email.toLowerCase());
    if (!doctorObj) {
      return NextResponse.json({ error: "ไม่พบบุคลากรแพทย์ผู้นี้ในระบบ" }, { status: 404 });
    }

    const doctorEmail = doctorObj.email;
    const targetDiscordId = doctorObj.discordId;
    const targetDiscordUsername = doctorObj.discordUsername;
    const doctorName = doctorObj.name || doctorObj.discordUsername || "Unknown";

    // 3. Calculate total hours
    let totalHours = 0;
    if (doctorEmail) {
      const { data: userShifts } = await supabase
        .from("shifts")
        .select("duration_minutes")
        .eq("user_email", doctorEmail)
        .eq("status", "completed");

      const totalMinutes = (userShifts || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      totalHours = parseFloat((totalMinutes / 60).toFixed(1));
    }

    // 4. Remove from registered_doctors list
    const updatedDoctors = registeredDoctors.filter(doc => doc.email?.toLowerCase() !== email.toLowerCase());
    await supabase
      .from("system_settings")
      .upsert({
        key: "registered_doctors",
        value: updatedDoctors,
        updated_at: new Date().toISOString()
      });

    // 5. Remove from user_ranks mapping
    if (doctorEmail) {
      delete userRanks[doctorEmail];
      await supabase
        .from("system_settings")
        .upsert({
          key: "user_ranks",
          value: userRanks,
          updated_at: new Date().toISOString()
        });
    }

    // 6. Remove from op_schedule weekly slots
    if (targetDiscordUsername) {
      let scheduleChanged = false;
      const updatedSchedule = { ...opSchedule };
      for (const day of Object.keys(updatedSchedule)) {
        if (Array.isArray(updatedSchedule[day]) && updatedSchedule[day].includes(targetDiscordUsername)) {
          updatedSchedule[day] = updatedSchedule[day].filter(u => u !== targetDiscordUsername);
          scheduleChanged = true;
        }
      }
      if (scheduleChanged) {
        await supabase
          .from("system_settings")
          .upsert({
            key: "op_schedule",
            value: updatedSchedule,
            updated_at: new Date().toISOString()
          });
      }
    }

    // 7. Delete all doctor-related logs across tables
    if (doctorEmail) {
      // Delete shifts
      await supabase.from("shifts").delete().eq("user_email", doctorEmail);
      
      // Delete exam attempts
      await supabase.from("exam_attempts").delete().eq("user_email", doctorEmail);

      // Delete user inbox messages
      await supabase.from("user_inbox").delete().eq("user_email", doctorEmail);

      // Delete mentorship relationships
      await supabase
        .from("mentorship_relations")
        .delete()
        .or(`mentor_email.eq.${doctorEmail},student_email.eq.${doctorEmail}`);

      // Delete bonus payouts
      await supabase.from("bonus_payouts").delete().eq("doctor_email", doctorEmail);
    }

    // Delete leave requests
    if (targetDiscordId) {
      await supabase.from("leave_requests").delete().eq("discord_id", targetDiscordId);
    } else if (targetDiscordUsername) {
      await supabase.from("leave_requests").delete().eq("discord_username", targetDiscordUsername);
    }

    // 8. Insert record in resignation_requests as 'approved' with type 'dismissal'
    const adminName = user.email || user.name || "Admin";
    const { data: dismissalRecord, error: insertError } = await supabase
      .from("resignation_requests")
      .insert({
        discord_username: targetDiscordUsername || "Unknown",
        discord_id: targetDiscordId || "Unknown",
        doctor_name: doctorName,
        reason: reason,
        total_hours: totalHours,
        passing_hours: criteriaHours,
        is_reset: isReset !== undefined ? isReset : true,
        status: "approved",
        approved_by: adminName,
        type: "dismissal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, record: dismissalRecord });
  } catch (err: any) {
    console.error("[Dismiss API Error] Error:", err);
    return NextResponse.json({ error: err.message || "เกิดข้อผิดพลาดในการปลดบุคลากรแพทย์" }, { status: 500 });
  }
}
