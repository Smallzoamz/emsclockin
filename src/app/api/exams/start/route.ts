import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;

  try {
    const body = await req.json();
    const { inboxMessageId } = body;

    if (!inboxMessageId) {
      return NextResponse.json({ error: "inboxMessageId is required" }, { status: 400 });
    }

    // 1. Fetch the inbox message to verify ownership and check details
    const { data: inboxMsg, error: inboxErr } = await supabase
      .from("user_inbox")
      .select("*")
      .eq("id", inboxMessageId)
      .eq("user_email", userEmail)
      .single();

    if (inboxErr || !inboxMsg) {
      return NextResponse.json({ error: "ไม่พบข้อมูลใบแจ้งมอบหมายข้อสอบนี้" }, { status: 404 });
    }

    if (inboxMsg.type !== "exam" || !inboxMsg.exam_type) {
      return NextResponse.json({ error: "จดหมายฉบับนี้ไม่ใช่ข้อสอบ" }, { status: 400 });
    }

    // 2. If already started, check and return existing attempt
    if (inboxMsg.exam_attempt_id) {
      const { data: existingAttempt } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", inboxMsg.exam_attempt_id)
        .single();

      if (existingAttempt) {
        return NextResponse.json({
          success: true,
          attempt: existingAttempt,
          message: "กลับเข้าทำข้อสอบเดิมที่ยังไม่ส่ง"
        });
      }
    }

    // 3. Fetch all questions matching the exam type
    const { data: questions, error: qErr } = await supabase
      .from("exam_questions")
      .select("id, question_text")
      .eq("exam_type", inboxMsg.exam_type);

    if (qErr || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "ไม่มีข้อสอบในคลังสำหรับยศนี้ กรุณาแจ้งผู้ดูแลระบบเพื่อเพิ่มข้อสอบในระบบหลังบ้านก่อนค่ะ" },
        { status: 400 }
      );
    }

    // 4. Randomize and select N questions
    const questionCount = Math.min(inboxMsg.exam_question_count || 5, questions.length);
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, questionCount);

    // 5. Create new exam attempt record
    const { data: newAttempt, error: attemptErr } = await supabase
      .from("exam_attempts")
      .insert({
        user_email: userEmail,
        exam_type: inboxMsg.exam_type,
        randomized_questions: selectedQuestions,
        student_answers: {},
        status: "in_progress",
        started_at: new Date().toISOString(),
        focus_lost_count: 0,
        screen_share_detected: false
      })
      .select()
      .single();

    if (attemptErr || !newAttempt) {
      throw attemptErr || new Error("Failed to create exam attempt");
    }

    // 6. Link the attempt to the inbox message and mark message as read
    await supabase
      .from("user_inbox")
      .update({
        exam_attempt_id: newAttempt.id,
        is_read: true
      })
      .eq("id", inboxMessageId);

    return NextResponse.json({
      success: true,
      attempt: newAttempt,
      message: "สุ่มชุดข้อสอบเสร็จสิ้น เริ่มการสอบได้ ⏱️"
    });
  } catch (error: any) {
    console.error("[Exams Start POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start exam" },
      { status: 500 }
    );
  }
}
