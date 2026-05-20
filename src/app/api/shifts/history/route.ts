import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  try {
    const { data: shifts, error, count } = await supabase
      .from("shifts")
      .select("*", { count: "exact" })
      .eq("user_email", session.user.email)
      .order("clock_in", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      shifts: shifts || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[History] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงประวัติ" },
      { status: 500 }
    );
  }
}
