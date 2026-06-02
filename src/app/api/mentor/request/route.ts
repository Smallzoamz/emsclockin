import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { syncOpQueueToDiscord } from "@/lib/op-discord-sync";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mentorEmail = session.user.email;
  const mentorUser = session.user as Record<string, any>;
  const mentorDiscordId = mentorUser.discordId;

  try {
    const { studentEmail } = await req.json();
    if (!studentEmail) {
      return NextResponse.json({ error: "กรุณาระบุนักเรียนแพทย์ที่ต้องการดูแล" }, { status: 400 });
    }

    if (mentorEmail === studentEmail) {
      return NextResponse.json({ error: "คุณไม่สามารถรับตัวเองเป็นน้องเลี้ยงได้ค่ะ" }, { status: 400 });
    }

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

    // 2. Check if mentor is clocked in (On Duty)
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("id")
      .eq("user_email", mentorEmail)
      .eq("status", "active")
      .maybeSingle();

    if (!activeShift) {
      return NextResponse.json({ error: "คุณต้องกดเข้าเวรก่อนจึงจะสามารถรับดูแลน้องเลี้ยงได้ค่ะ" }, { status: 400 });
    }

    // 3. Calculate accumulated hours and check eligibility
    const { data: completedShifts } = await supabase
      .from("shifts")
      .select("duration_minutes")
      .eq("user_email", mentorEmail)
      .eq("status", "completed");

    const totalMinutes = (completedShifts || []).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    const accumulatedHours = totalMinutes / 60;
    const requiredHours = Number(mentorSettings.mentor_min_hours) || 6;

    if (accumulatedHours < requiredHours) {
      return NextResponse.json({ error: `คุณต้องมีชั่วโมงเข้าเวรสะสมอย่างน้อย ${requiredHours} ชม. ปัจจุบันมี ${accumulatedHours.toFixed(1)} ชม.` }, { status: 400 });
    }

    // 4. Check active mentees quota
    const { data: activeRelations } = await supabase
      .from("mentorship_relations")
      .select("id")
      .eq("mentor_email", mentorEmail)
      .eq("status", "active");

    const maxMentees = Number(mentorSettings.max_mentees) || 2;
    if (activeRelations && activeRelations.length >= maxMentees) {
      return NextResponse.json({ error: `คุณได้รับเป็นพี่เลี้ยงครบตามจำนวนที่กำหนดแล้ว (สูงสุด ${maxMentees} คน)` }, { status: 400 });
    }

    // 5. Verify student eligibility
    const registeredDoctors = settingsMap["registered_doctors"] || [];
    const userRanks = settingsMap["user_ranks"] || {};
    const internRankId = mentorSettings.intern_rank_id;

    const studentDoc = registeredDoctors.find((d: any) => d.email === studentEmail);
    if (!studentDoc) {
      return NextResponse.json({ error: "ไม่พบข้อมูลแพทย์คนนี้ในระบบ" }, { status: 400 });
    }

    // Check rank
    if (!internRankId || userRanks[studentEmail] !== internRankId) {
      return NextResponse.json({ error: "แพทย์คนนี้ไม่ใช่นักเรียนแพทย์ตามยศที่กำหนดไว้" }, { status: 400 });
    }

    // Check first login <= 48h
    const firstLogin = studentDoc.createdAt || studentDoc.updatedAt;
    if (!firstLogin) {
      return NextResponse.json({ error: "ไม่พบวันที่เข้าสู่ระบบครั้งแรกของนักเรียนแพทย์คนนี้" }, { status: 400 });
    }

    const firstLoginTime = new Date(firstLogin).getTime();
    const ageMs = new Date().getTime() - firstLoginTime;
    const fortyEightHours = 48 * 60 * 60 * 1000;

    if (ageMs > fortyEightHours) {
      return NextResponse.json({ error: "นักเรียนแพทย์คนนี้เข้าสู่ระบบเกิน 48 ชม. แล้ว ไม่สามารถรับดูแลได้" }, { status: 400 });
    }

    // Check if student already has mentor
    const { data: existingStudentRel } = await supabase
      .from("mentorship_relations")
      .select("id")
      .eq("student_email", studentEmail)
      .eq("status", "active")
      .maybeSingle();

    if (existingStudentRel) {
      return NextResponse.json({ error: "นักเรียนแพทย์คนนี้มีพี่เลี้ยงดูแลอยู่แล้วค่ะ" }, { status: 400 });
    }

    // 6. Save relation to database
    // Get custom names
    const customNames = settingsMap["user_names"] || {};
    const mentorName = customNames[mentorEmail] || mentorUser.name || "Unknown Mentor";
    const studentName = customNames[studentEmail] || studentDoc.name || "Unknown Student";

    const { data: newRel, error: insertErr } = await supabase
      .from("mentorship_relations")
      .insert({
        mentor_email: mentorEmail,
        student_email: studentEmail,
        mentor_name: mentorName,
        student_name: studentName,
        status: "active",
        started_at: new Date().toISOString(),
        acceptance_bonus_added: true,
        completion_bonus_added: false
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 7. Send Discord Notification Webhook
    let discordWebhookUrl = mentorSettings.discord_webhook_url;
    // Fallback to default setting if empty
    if (!discordWebhookUrl) {
      const defaultWebhook = settingsMap["discord_webhook_url"];
      if (typeof defaultWebhook === "string") {
        discordWebhookUrl = defaultWebhook;
      }
    }

    if (discordWebhookUrl) {
      try {
        let template = mentorSettings.message_template || "แพทย์ [ชื่อพี่เลี้ยง] ได้รับนักเรียนแพทย์ [ชื่อน้องเลี้ยง] เป็นน้องเลี้ยงเรียบร้อยแล้ว!";
        const studentDiscordId = studentDoc.discordId;

        // Replace placeholders
        template = template.replace(/\[ชื่อพี่เลี้ยง\]/g, mentorName);
        template = template.replace(/\[พี่เลี้ยง\]/g, mentorName);
        template = template.replace(/\[ชื่อน้องเลี้ยง\]/g, studentName);
        template = template.replace(/\[น้องเลี้ยง\]/g, studentName);
        template = template.replace(/\[ลิงก์ดิสคอร์ดพี่เลี้ยง\]/g, mentorDiscordId ? `<@${mentorDiscordId}>` : mentorName);
        template = template.replace(/\[พี่เลี้ยง_ดิสคอร์ด\]/g, mentorDiscordId ? `<@${mentorDiscordId}>` : mentorName);
        template = template.replace(/\[ลิงก์ดิสคอร์ดน้องเลี้ยง\]/g, studentDiscordId ? `<@${studentDiscordId}>` : studentName);
        template = template.replace(/\[น้องเลี้ยง_ดิสคอร์ด\]/g, studentDiscordId ? `<@${studentDiscordId}>` : studentName);

        // Customize webhook profile dynamically
        const avatarUrl = mentorUser.avatar || mentorUser.image;
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: `ระบบพี่เลี้ยง | ${mentorName}`,
            avatar_url: avatarUrl || undefined,
            content: template
          })
        });
      } catch (webhookErr) {
        console.error("[Mentor Discord Webhook] Send failed:", webhookErr);
      }
    }

    // 8. Re-sync OP queue Discord immediately (coalesced)
    await syncOpQueueToDiscord();

    return NextResponse.json({
      success: true,
      relation: newRel,
      message: `คุณได้รับการเป็นพี่เลี้ยงให้ ${studentName} เรียบร้อยแล้วค่ะ! 🎉`
    });

  } catch (error: any) {
    console.error("[Mentor Request POST] Error:", error);
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการส่งคำขอ" }, { status: 500 });
  }
}
