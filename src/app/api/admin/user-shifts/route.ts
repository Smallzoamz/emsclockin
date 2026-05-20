import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
  }

  try {
    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("id, clock_in, clock_out, duration_minutes, status, proof_image_url, is_deducted")
      .eq("user_email", email)
      .eq("status", "completed")
      .order("clock_in", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("[User Shifts GET] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดประวัติเวร" },
      { status: 500 }
    );
  }
}
