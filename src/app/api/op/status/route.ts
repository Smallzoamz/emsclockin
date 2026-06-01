import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { subHours } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get active shifts
    const { data: activeShifts, error: activeErr } = await supabase
      .from("shifts")
      .select("*")
      .eq("status", "active")
      .order("clock_in", { ascending: true });

    if (activeErr) throw activeErr;

    // 2. Get system settings (registered_doctors, op_schedule, op_nickname_mode, op_queue_state, op_opened_at)
    const { data: settingsData, error: settingsErr } = await supabase
      .from("system_settings")
      .select("*");

    if (settingsErr && settingsErr.code !== "42P01") throw settingsErr;

    const settings: Record<string, any> = {};
    if (settingsData) {
      settingsData.forEach((item) => {
        settings[item.key] = item.value;
      });
    }

    const registeredDoctors = settings["registered_doctors"] || [];
    const opSchedule = settings["op_schedule"] || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    };
    const opNicknameMode = settings["op_nickname_mode"] || "manual";
    const opQueueState = settings["op_queue_state"] || {}; // email -> "skipped" | "story"
    const opCaseCounts = settings["op_case_counts"] || {};
    const opActive = settings["op_active"] === true;
    const opNotice = settings["op_notice"] || "⚠️ คำเตือน: รบกวนหมอเวรทุกคนเปิดวิทยุช่องหลัก และรายงานตัวทันทีเมื่อเข้าพื้นที่เวร!";
    const opOpenedAt = settings["op_opened_at"];
    const opOpenedBy = settings["op_opened_by"] || null;

    // 3. Get recently completed shifts (clocked out after op_opened_at if set)
    let recentShifts: any[] = [];
    if (opOpenedAt) {
      const { data: fetchedRecent, error: recentErr } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "completed")
        .gte("clock_out", opOpenedAt)
        .order("clock_out", { ascending: false });

      if (recentErr) throw recentErr;
      recentShifts = fetchedRecent || [];
    }

    // 4. Calculate day of week in GMT+7
    const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[thaiTime.getUTCDay()];

    return NextResponse.json({
      activeShifts: activeShifts || [],
      recentShifts: recentShifts || [],
      registeredDoctors,
      opSchedule,
      opNicknameMode,
      opQueueState,
      opCaseCounts,
      currentDay,
      opActive,
      opNotice,
      opOpenedBy,
    });
  } catch (error: any) {
    console.error("[OP Status API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch OP status" }, { status: 500 });
  }
}
