import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// POST — toggle deduction on a specific shift
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { shiftId, deducted } = body;

    if (!shiftId || deducted === undefined) {
      return NextResponse.json(
        { error: "Missing shiftId or deducted parameter" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shifts")
      .update({ is_deducted: !!deducted })
      .eq("id", shiftId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, shift: data });
  } catch (error: any) {
    console.error("[Deduct Shift] Error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการหักเวร" },
      { status: 500 }
    );
  }
}
