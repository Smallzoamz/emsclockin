import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// Helper to check admin permission
async function checkAdmin() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;
  return {
    isAdmin: !!(user && user.role === "admin"),
    adminEmail: user?.email || "Unknown Admin"
  };
}

// 1. GET: Fetch exam configurations, pool, and student attempts
export async function GET(req: Request) {
  const { isAdmin } = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action"); // 'questions' | 'attempts' | 'doctors'

  try {
    if (action === "questions") {
      const { data, error } = await supabase
        .from("exam_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ questions: data || [] });
    }

    if (action === "assignments") {
      const { data, error } = await supabase
        .from("user_inbox")
        .select("*")
        .eq("type", "exam");

      if (error) throw error;
      return NextResponse.json({ assignments: data || [] });
    }

    if (action === "attempts") {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .order("started_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ attempts: data || [] });
    }

    if (action === "doctors") {
      // Get list of doctors from system_settings registered_doctors
      const { data: dbData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "registered_doctors")
        .single();
      
      const doctors = dbData?.value || [];
      return NextResponse.json({ doctors });
    }

    // Default: return questions and attempts
    const [questionsRes, attemptsRes] = await Promise.all([
      supabase.from("exam_questions").select("*").order("created_at", { ascending: false }),
      supabase.from("exam_attempts").select("*").order("started_at", { ascending: false })
    ]);

    return NextResponse.json({
      questions: questionsRes.data || [],
      attempts: attemptsRes.data || []
    });
  } catch (error: any) {
    console.error("[Admin Exams GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load data" }, { status: 500 });
  }
}

// 2. POST: Create a question or assign an exam to a doctor
export async function POST(req: Request) {
  const { isAdmin, adminEmail } = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body; // 'create_question' | 'assign_exam'

    if (action === "create_question") {
      const { examType, questionText } = body;
      if (!examType || !questionText) {
        return NextResponse.json({ error: "Exam type and Question text are required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("exam_questions")
        .insert({
          exam_type: examType,
          question_text: questionText
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, question: data });
    }

    if (action === "assign_exam") {
      const { doctorEmail, examType, questionCount, title, content } = body;
      if (!doctorEmail || !examType) {
        return NextResponse.json({ error: "Doctor email and Exam type are required" }, { status: 400 });
      }

      // Check if there are questions in the pool for this exam type
      const { count } = await supabase
        .from("exam_questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_type", examType);

      if (!count || count === 0) {
        return NextResponse.json({ error: "ไม่พบข้อสอบในคลังข้อสอบสำหรับยศนี้ กรุณาเพิ่มข้อสอบในคลังก่อน" }, { status: 400 });
      }

      // Send to user inbox
      const defaultTitle = examType === "general_doctor" ? "📝 ใบแจ้งสิทธิ์สอบเลื่อนขั้นเป็น แพทย์ทั่วไป" : "📝 ใบแจ้งสิทธิ์สอบเลื่อนขั้นเป็น แพทย์ชำนาญการ";
      const defaultContent = `คุณได้รับอนุมัติสิทธิ์เข้าสอบเลื่อนระดับแพทย์ กรุณากดปุ่มด้านล่างเพื่อเริ่มสอบเขียนตอบจับเวลา ระบบจะทำการสุ่มข้อสอบขึ้นมาทันทีเพื่อป้องกันการทุจริต`;

      const { data, error } = await supabase
        .from("user_inbox")
        .insert({
          user_email: doctorEmail,
          sender_name: "ฝ่ายทรัพยากรบุคคล (HR)",
          title: title || defaultTitle,
          content: content || defaultContent,
          type: "exam",
          exam_type: examType,
          exam_question_count: Number(questionCount) || 5,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Add a Discord Webhook sync for notification (optional but nice)
      try {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "ระบบประชาสัมพันธ์ EMS",
              content: `📬 **มีการส่งสิทธิ์สอบเลื่อนขั้นใหม่** ให้กับแพทย์ที่มีอีเมล \`${doctorEmail}\` กรุณาตรวจสอบซองจดหมายของตนเองทางเว็บระบบจัดการเวรแพทย์ค่ะ`
            })
          });
        }
      } catch (err) {
        console.error("Discord send exam notify error:", err);
      }

      return NextResponse.json({ success: true, inbox: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Exams POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}

// 3. PATCH: Edit a question or grade a student attempt
export async function PATCH(req: Request) {
  const { isAdmin, adminEmail } = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body; // 'edit_question' | 'grade_attempt'

    if (action === "edit_question") {
      const { id, examType, questionText } = body;
      if (!id || !examType || !questionText) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("exam_questions")
        .update({
          exam_type: examType,
          question_text: questionText
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, question: data });
    }

    if (action === "reset_attempt") {
      const { attemptId } = body;
      if (!attemptId) {
        return NextResponse.json({ error: "Attempt ID is required" }, { status: 400 });
      }

      // 1. Reset user_inbox message linked to this attemptId
      const { error: inboxErr } = await supabase
        .from("user_inbox")
        .update({ exam_attempt_id: null, is_read: false })
        .eq("exam_attempt_id", attemptId);

      if (inboxErr) throw inboxErr;

      // 2. Delete the attempt
      const { error: attemptErr } = await supabase
        .from("exam_attempts")
        .delete()
        .eq("id", attemptId);

      if (attemptErr) throw attemptErr;

      return NextResponse.json({ success: true });
    }

    if (action === "grade_attempt") {
      const { attemptId, status, score, adminFeedback } = body;
      if (!attemptId || !status) {
        return NextResponse.json({ error: "Attempt ID and Status are required" }, { status: 400 });
      }

      // Update attempt status
      const { data: updatedAttempt, error: attemptErr } = await supabase
        .from("exam_attempts")
        .update({
          status,
          score: score !== undefined ? Number(score) : null,
          admin_feedback: adminFeedback || "",
          graded_by: adminEmail,
          graded_at: new Date().toISOString()
        })
        .eq("id", attemptId)
        .select()
        .single();

      if (attemptErr || !updatedAttempt) throw attemptErr || new Error("Attempt not found");

      // Auto-send an inbox result mail to the doctor
      const isPassed = status === "passed";
      const resultTitle = isPassed 
        ? `🎉 ยินดีด้วย! คุณผ่านการสอบเลื่อนขั้นแพทย์` 
        : `❌ แจ้งผลการสอบเลื่อนขั้นแพทย์`;
      
      const resultBody = `ผลสอบการเลื่อนขั้นประเภท ${updatedAttempt.exam_type === "general_doctor" ? "แพทย์ทั่วไป" : "แพทย์ชำนาญการ"} ได้รับการตรวจเรียบร้อยแล้วค่ะ\n\n` +
        `**ผลการสอบ:** ${isPassed ? "✅ ผ่านการทดสอบ (Passed)" : "❌ ไม่ผ่านเกณฑ์ (Failed)"}\n` +
        `**คะแนนที่ได้:** ${score !== undefined ? `${score} คะแนน` : "ไม่มี"}\n` +
        `**ความคิดเห็นจากผู้ตรวจ:** ${adminFeedback || "ไม่มีข้อคิดเห็นเพิ่มเติม"}\n\n` +
        `กรุณาติดต่อผู้นำฝ่ายแพทย์เพื่อดำเนินการแต่งตั้งยศต่อไปค่ะ`;

      await supabase
        .from("user_inbox")
        .insert({
          user_email: updatedAttempt.user_email,
          sender_name: "ฝ่ายทดสอบและวัดผล",
          title: resultTitle,
          content: resultBody,
          type: "message",
          is_read: false
        });

      return NextResponse.json({ success: true, attempt: updatedAttempt });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Exams PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}

// 4. DELETE: Delete a question from the pool
export async function DELETE(req: Request) {
  const { isAdmin } = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("exam_questions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: "ลบคำถามออกจากคลังข้อสอบแล้วค่ะ" });
  } catch (error: any) {
    console.error("[Admin Exams DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete question" }, { status: 500 });
  }
}
