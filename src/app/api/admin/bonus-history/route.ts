import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("bonus_history")
      .select("*")
      .order("week_start", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error("[Bonus History GET] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติ" },
      { status: 500 }
    );
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
    const { weekStart, weekEnd, bonusRate, grandTotal, hospitalFund, remainingFund, snapshotData } = body;

    if (!weekStart || !weekEnd || !snapshotData) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bonus_history")
      .insert([
        {
          week_start: weekStart,
          week_end: weekEnd,
          bonus_rate: bonusRate,
          grand_total: grandTotal,
          hospital_fund: hospitalFund || 0,
          remaining_fund: remainingFund || 0,
          snapshot_data: snapshotData,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("[Bonus History POST DB Error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error: any) {
    console.error("[Bonus History POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการบันทึกประวัติ" },
      { status: 500 }
    );
  }
}
