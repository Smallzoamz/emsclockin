import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET — ดึงรายการที่จ่ายแล้วของ bonus_history_id นั้น
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from("bonus_payouts")
      .select("*")
      .eq("bonus_history_id", id);

    if (error) throw error;

    return NextResponse.json({ payouts: data || [] });
  } catch (error: any) {
    console.error("[Payout GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}

// POST — สั่งจ่ายโบนัสให้แพทย์ 1 คน
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: bonusHistoryId } = await params;

  try {
    const body = await req.json();
    const { doctorEmail, doctorName, amount } = body;

    if (!doctorEmail || amount === undefined) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (doctorEmail, amount)" },
        { status: 400 }
      );
    }

    // 1. ดึงข้อมูล bonus_history เพื่อตรวจสอบ week_end
    const { data: historyData, error: historyError } = await supabase
      .from("bonus_history")
      .select("*")
      .eq("id", bonusHistoryId)
      .single();

    if (historyError || !historyData) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลประวัติโบนัสรอบนี้" },
        { status: 404 }
      );
    }

    // 2. ตรวจสอบว่าอยู่ในช่วงเวลาที่สั่งจ่ายได้หรือไม่
    //    กดจ่ายได้ตั้งแต่วันอาทิตย์ 23:00 น. ของสัปดาห์นั้น
    //    จนถึงวันอาทิตย์ 23:00 น. ของสัปดาห์ถัดไป
    const now = new Date();
    const weekEnd = new Date(historyData.week_end);
    
    // วันอาทิตย์ 23:00 ของสัปดาห์ที่ week_end อยู่ (week_end คือวันอาทิตย์)
    const paymentWindowStart = new Date(weekEnd);
    paymentWindowStart.setHours(23, 0, 0, 0);
    
    // วันอาทิตย์ 23:00 ของสัปดาห์ถัดไป
    const paymentWindowEnd = new Date(paymentWindowStart);
    paymentWindowEnd.setDate(paymentWindowEnd.getDate() + 7);

    if (now < paymentWindowStart) {
      return NextResponse.json(
        { error: `ยังไม่ถึงเวลาสั่งจ่าย (เปิดให้จ่ายวันอาทิตย์ 23:00 น.)` },
        { status: 400 }
      );
    }

    if (now > paymentWindowEnd) {
      return NextResponse.json(
        { error: "หมดเวลาสั่งจ่ายแล้ว (เลยกำหนดสัปดาห์ถัดไปแล้ว)" },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบว่ายังไม่ได้จ่ายคนนี้
    const { data: existingPayout } = await supabase
      .from("bonus_payouts")
      .select("id")
      .eq("bonus_history_id", bonusHistoryId)
      .eq("doctor_email", doctorEmail)
      .single();

    if (existingPayout) {
      return NextResponse.json(
        { error: "จ่ายโบนัสให้แพทย์คนนี้ไปแล้ว" },
        { status: 409 }
      );
    }

    // 4. Insert payout record
    const { data: payout, error: insertError } = await supabase
      .from("bonus_payouts")
      .insert({
        bonus_history_id: bonusHistoryId,
        doctor_email: doctorEmail,
        doctor_name: doctorName || "N/A",
        amount: amount,
        paid_by: (session?.user?.email as string) || "admin",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, payout });
  } catch (error: any) {
    console.error("[Payout POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการสั่งจ่าย" },
      { status: 500 }
    );
  }
}
