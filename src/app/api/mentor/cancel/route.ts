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

  try {
    const { relationId } = await req.json();
    if (!relationId) {
      return NextResponse.json({ error: "กรุณาระบุไอดีของความสัมพันธ์พี่เลี้ยง" }, { status: 400 });
    }

    // 1. Fetch the relationship record
    const { data: rel, error: relErr } = await supabase
      .from("mentorship_relations")
      .select("*")
      .eq("id", relationId)
      .maybeSingle();

    if (relErr) throw relErr;

    if (!rel) {
      return NextResponse.json({ error: "ไม่พบข้อมูลความสัมพันธ์พี่เลี้ยงนี้ในระบบ" }, { status: 404 });
    }

    // 2. Security Check: Only the mentor themselves can cancel
    if (rel.mentor_email !== mentorEmail) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ยกเลิกการเป็นพี่เลี้ยงของแพทย์คู่นี้ค่ะ" }, { status: 403 });
    }

    // 3. Status Check: Must be active
    if (rel.status !== "active") {
      return NextResponse.json({ error: "ความสัมพันธ์นี้ไม่ได้อยู่ในสถานะดูแล (Active)" }, { status: 400 });
    }

    // 4. Time Check: Must be within 24 hours
    const startedTime = new Date(rel.started_at).getTime();
    const elapsedMs = new Date().getTime() - startedTime;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (elapsedMs > twentyFourHours) {
      return NextResponse.json({ error: "คุณสามารถยกเลิกการเป็นพี่เลี้ยงได้ภายใน 24 ชั่วโมงแรกหลังจากกดรับดูแลเท่านั้นค่ะ" }, { status: 400 });
    }

    // 5. Update relation record in database
    const { data: updatedRel, error: updateErr } = await supabase
      .from("mentorship_relations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        acceptance_bonus_added: false // Remove the acceptance bonus
      })
      .eq("id", relationId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 6. Re-sync OP Queue Discord embed immediately
    await syncOpQueueToDiscord();

    return NextResponse.json({
      success: true,
      relation: updatedRel,
      message: `ยกเลิกการเป็นพี่เลี้ยงให้ ${rel.student_name} เรียบร้อยแล้วค่ะ`
    });

  } catch (error: any) {
    console.error("[Mentor Cancel POST] Error:", error);
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการยกเลิก" }, { status: 500 });
  }
}
