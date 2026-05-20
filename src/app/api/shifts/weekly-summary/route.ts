import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { startOfWeek, subWeeks, format } from "date-fns";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get shifts from the last 8 weeks
    const weeksBack = 8;
    const startDate = startOfWeek(subWeeks(new Date(), weeksBack - 1), {
      weekStartsOn: 1,
    });

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
      const weekStart = startOfWeek(subWeeks(new Date(), weeksBack - 1 - i), {
        weekStartsOn: 1,
      });
      const key = format(weekStart, "yyyy-MM-dd");
      weeklyData[key] = {
        weekStart: key,
        totalMinutes: 0,
        shiftCount: 0,
        dailyMinutes: {},
      };
    }

    (shifts || []).forEach((shift) => {
      const shiftWeekStart = startOfWeek(new Date(shift.clock_in), {
        weekStartsOn: 1,
      });
      const weekKey = format(shiftWeekStart, "yyyy-MM-dd");
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].totalMinutes += shift.duration_minutes || 0;
        weeklyData[weekKey].shiftCount += 1;

        // Accumulate minutes per calendar day
        const dayKey = format(new Date(shift.clock_in), "yyyy-MM-dd");
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
