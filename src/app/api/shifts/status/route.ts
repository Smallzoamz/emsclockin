import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const userEmail = session?.user?.email;

  try {
    // 1. Fetch all active shifts (public data)
    const { data: activeShifts } = await supabase
      .from("shifts")
      .select("user_email, clock_in, user_name")
      .eq("status", "active")
      .order("clock_in", { ascending: true });

    // 2. Fetch registered doctors for details
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "registered_doctors")
      .maybeSingle();
    const registeredDoctors = settingsData?.value || [];

    // Map to public output
    const activeDoctors = (activeShifts || []).map((shift: any) => {
      const doctor = registeredDoctors.find((d: any) => d.email === shift.user_email);
      return {
        name: doctor?.name || shift.user_name || "แพทย์ประจำการ",
        avatarUrl: doctor?.avatarUrl || null,
        rank: doctor?.rank || "แพทย์ประจำการ",
        clockIn: shift.clock_in
      };
    });

    // 3. If authenticated, fetch their personal active/pending shifts
    if (userEmail) {
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .eq("status", "active")
        .maybeSingle();

      const { data: pendingShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .eq("status", "pending_proof")
        .maybeSingle();

      return NextResponse.json({
        isOnDuty: !!activeShift,
        activeShift: activeShift || null,
        pendingProofShift: pendingShift || null,
        activeCount: activeDoctors.length,
        activeDoctors
      });
    }

    // 4. If not authenticated, return only public counts and roster
    return NextResponse.json({
      isOnDuty: false,
      activeShift: null,
      pendingProofShift: null,
      activeCount: activeDoctors.length,
      activeDoctors
    });
  } catch (error) {
    console.error("[Shift Status GET] Error:", error);
    return NextResponse.json({
      isOnDuty: false,
      activeShift: null,
      pendingProofShift: null,
      activeCount: 0,
      activeDoctors: []
    });
  }
}
