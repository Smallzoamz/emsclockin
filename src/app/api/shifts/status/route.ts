import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_email", session.user.email)
      .eq("status", "active")
      .maybeSingle();

    const { data: pendingShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_email", session.user.email)
      .eq("status", "pending_proof")
      .maybeSingle();

    return NextResponse.json({
      isOnDuty: !!activeShift,
      activeShift: activeShift || null,
      pendingProofShift: pendingShift || null,
    });
  } catch (error) {
    console.error("[Shift Status GET] Error:", error);
    return NextResponse.json({
      isOnDuty: false,
      activeShift: null,
      pendingProofShift: null,
    });
  }
}
