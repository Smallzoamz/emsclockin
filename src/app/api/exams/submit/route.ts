import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";
import { formatThaiDate } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;

  try {
    const body = await req.json();
    const { attemptId, answers, focusLostCount, screenShareDetected, isAutoSubmit, isAutoSave, isFocusLossEvent } = body;

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    // 1. Fetch current attempt to verify and calculate elapsed time
    const { data: attempt, error: attemptFetchErr } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_email", userEmail)
      .single();

    if (attemptFetchErr || !attempt) {
      return NextResponse.json({ error: "ไม่พบประวัติการทำข้อสอบนี้" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({
        success: true,
        attempt,
        message: "ข้อสอบนี้ได้ถูกส่งเรียบร้อยแล้วก่อนหน้านี้"
      });
    }

    // 2a. Auto-save or focus-loss event: save progress only WITHOUT changing status
    if (isAutoSave || isFocusLossEvent) {
      const progressUpdate: Record<string, unknown> = {
        focus_lost_count: focusLostCount !== undefined ? focusLostCount : attempt.focus_lost_count,
        screen_share_detected: screenShareDetected !== undefined ? screenShareDetected : attempt.screen_share_detected
      };

      // Only update student_answers if provided and non-empty
      if (answers && Object.keys(answers).length > 0) {
        // Merge with existing answers to prevent stale closures from overwriting
        const mergedAnswers = { ...(attempt.student_answers || {}), ...answers };
        progressUpdate.student_answers = mergedAnswers;
      }

      const { error: saveErr } = await supabase
        .from("exam_attempts")
        .update(progressUpdate)
        .eq("id", attemptId);

      if (saveErr) {
        console.error("[Exams Auto-save] Error:", saveErr);
        return NextResponse.json({ error: "Auto-save failed" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Progress saved" });
    }

    // 2b. Final submission
    const now = new Date();
    const startTime = new Date(attempt.started_at);
    const elapsedMs = now.getTime() - startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
    const durationStr = `${elapsedMinutes} นาที ${elapsedSeconds} วินาที`;

    // Merge answers with existing saved progress to prevent data loss
    const finalAnswers = { ...(attempt.student_answers || {}), ...(answers || {}) };

    const { data: updatedAttempt, error: submitErr } = await supabase
      .from("exam_attempts")
      .update({
        student_answers: finalAnswers,
        status: "submitted",
        submitted_at: now.toISOString(),
        focus_lost_count: focusLostCount !== undefined ? focusLostCount : attempt.focus_lost_count,
        screen_share_detected: screenShareDetected !== undefined ? screenShareDetected : attempt.screen_share_detected
      })
      .eq("id", attemptId)
      .select()
      .single();

    if (submitErr || !updatedAttempt) {
      throw submitErr || new Error("Failed to submit exam attempt");
    }

    // 3. Resolve user display name
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "user_names")
      .single();
    
    const customNames = settingsData?.value || {};
    const finalName = customNames[userEmail] || session.user.name || "Unknown Doctor";

    // 4. Determine warnings for Discord Webhook Log
    const totalFocusLost = updatedAttempt.focus_lost_count;
    const isScreenShared = updatedAttempt.screen_share_detected;
    
    let alertLevel = "🟢 ปกติ";
    let alertIcon = "📝";
    
    if (isScreenShared) {
      alertLevel = "🚨 อันตราย (ตรวจพบความพยายามสตรีมหรือบันทึกหน้าจอ!)";
      alertIcon = "🚨";
    } else if (totalFocusLost > 3) {
      alertLevel = "⚠️ เฝ้าระวัง (สลับหน้าจอนอกหน้าต่างสอบเกิน 3 ครั้ง)";
      alertIcon = "⚠️";
    }

    // Format display exam type
    const examTypeStr = updatedAttempt.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)";

    // Send Discord Log Notification to Admins
    const discordId = (session.user as Record<string, unknown>).discordId as string || undefined;
    const discordUsername = (session.user as Record<string, unknown>).discordUsername as string || undefined;

    // Use sendDiscordWebhook to log
    try {
      // Build webhook message text
      const embedFields = [
        { name: "ผู้ส่งข้อสอบ", value: `${finalName} (${userEmail})`, inline: true },
        { name: "ประเภทข้อสอบ", value: examTypeStr, inline: true },
        { name: "เวลาที่ใช้", value: durationStr, inline: true },
        { name: "สถานะความปลอดภัย", value: alertLevel, inline: false },
        { name: "จำนวนครั้งที่ละหน้าจอ/สลับแท็บ", value: `${totalFocusLost} ครั้ง`, inline: true },
        { name: "ส่งเมื่อ", value: formatThaiDate(now), inline: true }
      ];

      // Send webhook via discord
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "ระบบคุมสอบ EMS",
            avatar_url: session.user.image || undefined,
            content: `📢 **ส่งข้อสอบเลื่อนขั้นแพทย์แล้ว** ${isScreenShared ? "🚨" : ""}`,
            embeds: [{
              title: `${alertIcon} รายงานการส่งข้อสอบ: ${examTypeStr}`,
              description: `แพทย์ <@${discordId || ""}> ส่งข้อสอบตอบคำถามเรียบร้อยแล้วค่ะ ${isAutoSubmit ? "(ส่งอัตโนมัติเนื่องจากหมดเวลา)" : ""}`,
              color: isScreenShared ? 16711680 : (totalFocusLost > 3 ? 16753920 : 65280), // Red, Orange, Green
              fields: embedFields,
              footer: { text: "ระบบสอบออนไลน์ EMS Clock-in" },
              timestamp: now.toISOString()
            }]
          })
        });
      }
    } catch (discordErr) {
      console.error("[Submit Exam] Discord Log Error:", discordErr);
    }

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      message: isAutoSubmit ? "หมดเวลาทำข้อสอบ ระบบได้รวบรวมคำตอบและส่งผลแล้วค่ะ" : "ส่งข้อสอบสำเร็จเรียบร้อยแล้วค่ะ แอดมินจะแจ้งผลให้ทราบผ่านจดหมายค่ะ"
    });
  } catch (error: any) {
    console.error("[Exams Submit POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit exam" },
      { status: 500 }
    );
  }
}
