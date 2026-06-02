import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;

  try {
    // 1. Fetch mentorship settings
    const { data: settingsRows } = await supabase
      .from("system_settings")
      .select("key, value");

    const settingsMap = (settingsRows || []).reduce((acc: Record<string, any>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const mentorSettings = settingsMap["mentorship_settings"] || {
      intern_rank_id: "",
      mentor_min_hours: 6,
      acceptance_bonus: 5000,
      completion_bonus: 10000,
      max_mentees: 2,
      discord_webhook_url: "",
      message_template: "แพทย์ [ชื่อพี่เลี้ยง] ได้รับนักเรียนแพทย์ [ชื่อน้องเลี้ยง] เป็นน้องเลี้ยงเรียบร้อยแล้ว!"
    };

    // 2. Passive check & complete active mentorships older than 48 hours
    try {
      const now = new Date();
      const { data: activeRelations } = await supabase
        .from("mentorship_relations")
        .select("*")
        .eq("status", "active");

      if (activeRelations && activeRelations.length > 0) {
        for (const rel of activeRelations) {
          const startTime = new Date(rel.started_at).getTime();
          const elapsedMs = now.getTime() - startTime;
          const fortyEightHours = 48 * 60 * 60 * 1000;
          if (elapsedMs >= fortyEightHours) {
            await supabase
              .from("mentorship_relations")
              .update({
                status: "completed",
                completed_at: new Date(startTime + fortyEightHours).toISOString(),
                completion_bonus_added: true
              })
              .eq("id", rel.id);
          }
        }
      }
    } catch (err) {
      console.error("[Passive Mentorship Completion Check] Failed:", err);
    }

    // 3. Check mentor eligibility (calculate accumulated hours)
    const { data: completedShifts, error: shiftsErr } = await supabase
      .from("shifts")
      .select("duration_minutes")
      .eq("user_email", userEmail)
      .eq("status", "completed");

    if (shiftsErr) throw shiftsErr;

    const totalMinutes = (completedShifts || []).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    const accumulatedHours = totalMinutes / 60;
    const requiredHours = Number(mentorSettings.mentor_min_hours) || 6;
    const isEligible = accumulatedHours >= requiredHours;

    // 4. Fetch mentorship relations
    const { data: allRelations } = await supabase
      .from("mentorship_relations")
      .select("*")
      .in("status", ["active", "completed", "cancelled"]);

    const relations = allRelations || [];
    const activeRelations = relations.filter(r => r.status === "active");

    // Mentees currently cared by this doctor
    const myActiveMentees = activeRelations.filter(r => r.mentor_email === userEmail);

    // 5. Get available students (interns logged in within last 48 hours)
    const registeredDoctors = settingsMap["registered_doctors"] || [];
    const userRanks = settingsMap["user_ranks"] || {};
    const internRankId = mentorSettings.intern_rank_id;

    const availableStudents: any[] = [];
    const nowTime = new Date().getTime();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    registeredDoctors.forEach((doc: any) => {
      // Must be intern
      if (!internRankId || userRanks[doc.email] !== internRankId) return;
      
      // Must be new (within 48 hours since first login)
      const firstLogin = doc.createdAt || doc.updatedAt;
      if (!firstLogin) return;
      
      const firstLoginTime = new Date(firstLogin).getTime();
      const ageMs = nowTime - firstLoginTime;
      if (ageMs > fortyEightHours) return;

      // Find relation status
      const activeRel = activeRelations.find(r => r.student_email === doc.email);

      // Skip if already has mentor, unless it's mentored by someone else, we show status
      if (activeRel) {
        availableStudents.push({
          email: doc.email,
          name: doc.name,
          discordUsername: doc.discordUsername,
          avatarUrl: doc.avatarUrl,
          createdAt: firstLogin,
          remainingTimeMs: fortyEightHours - ageMs,
          mentorName: activeRel.mentor_name,
          mentorEmail: activeRel.mentor_email,
          status: "has_mentor"
        });
      } else {
        availableStudents.push({
          email: doc.email,
          name: doc.name,
          discordUsername: doc.discordUsername,
          avatarUrl: doc.avatarUrl,
          createdAt: firstLogin,
          remainingTimeMs: fortyEightHours - ageMs,
          status: "available"
        });
      }
    });

    return NextResponse.json({
      isEligible,
      accumulatedHours,
      requiredHours,
      activeMentees: myActiveMentees,
      availableStudents,
      settings: mentorSettings
    });

  } catch (error: any) {
    console.error("[Mentor Status GET] Error:", error);
    // Return graceful structure if database tables are not setup yet
    return NextResponse.json({
      isEligible: false,
      accumulatedHours: 0,
      requiredHours: 6,
      activeMentees: [],
      availableStudents: [],
      error: "กรุณารัน SQL setup สำหรับตาราง mentorship_relations ในฐานข้อมูลก่อนใช้งานค่ะ"
    });
  }
}
