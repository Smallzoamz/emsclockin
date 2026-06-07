import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { formatBangkokDateKey, getBangkokWeekStartKey, getCurrentWeekRange } from "@/lib/utils";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get shifts from the last 8 weeks
    const weeksBack = 8;
    const currentWeekStart = getCurrentWeekRange().start;
    const startDate = new Date(currentWeekStart.getTime() - (weeksBack - 1) * WEEK_MS);

    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("clock_in, duration_minutes, status")
      .eq("user_email", session.user.email)
      .eq("status", "completed")
      .gte("clock_in", startDate.toISOString())
      .order("clock_in", { ascending: true });

    if (error) throw error;

    // Get dynamic settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("*");
    
    const bonusThreshold = (() => {
      const val = settingsData?.find(s => s.key === "bonus_threshold")?.value;
      return val ? Number(val) : 20;
    })();

    const dailyMinHours = (() => {
      const val = settingsData?.find(s => s.key === "daily_min_hours")?.value;
      return val ? Number(val) : 3; // Default 3 hours per day
    })();

    // Group by week
    const weeklyData: Record<
      string,
      { weekStart: string; totalMinutes: number; shiftCount: number; dailyMinutes: Record<string, number> }
    > = {};

    for (let i = 0; i < weeksBack; i++) {
      const weekStart = new Date(startDate.getTime() + i * WEEK_MS);
      const key = formatBangkokDateKey(weekStart);
      weeklyData[key] = {
        weekStart: key,
        totalMinutes: 0,
        shiftCount: 0,
        dailyMinutes: {},
      };
    }

    (shifts || []).forEach((shift) => {
      const shiftDate = new Date(shift.clock_in);
      const weekKey = getBangkokWeekStartKey(shiftDate);
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].totalMinutes += shift.duration_minutes || 0;
        weeklyData[weekKey].shiftCount += 1;

        // Accumulate minutes per calendar day
        const dayKey = formatBangkokDateKey(shiftDate);
        weeklyData[weekKey].dailyMinutes[dayKey] = 
          (weeklyData[weekKey].dailyMinutes[dayKey] || 0) + (shift.duration_minutes || 0);
      }
    });

    const summary = Object.values(weeklyData).map((week) => {
      // Count qualifying days: days where total hours >= dailyMinHours
      const qualifyingDays = Object.values(week.dailyMinutes).filter(
        (minutes) => minutes / 60 >= dailyMinHours
      ).length;

      return {
        ...week,
        totalHours: parseFloat((week.totalMinutes / 60).toFixed(1)),
        bonusEligible: week.totalMinutes / 60 >= bonusThreshold,
        bonusThreshold: bonusThreshold,
        qualifyingDays: qualifyingDays,
        dailyMinHours: dailyMinHours,
      };
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[Weekly Summary] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูลรายสัปดาห์" },
      { status: 500 }
    );
  }
}
