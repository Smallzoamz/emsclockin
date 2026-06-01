import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();

  // Check if user is admin
  const user = session?.user as Record<string, unknown>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("*")
      .order("clock_in", { ascending: false });

    if (error) throw error;

    // Aggregate data by user
    const userMap: Record<string, {
      email: string;
      name: string;
      discordUsername: string;
      totalMinutes: number;
      status: "active" | "completed";
      lastClockIn: string;
    }> = {};

    (shifts || []).forEach(shift => {
      const key = shift.discord_username || shift.user_email;
      if (!userMap[key]) {
        userMap[key] = {
          email: shift.user_email,
          name: shift.user_name || "Unknown",
          discordUsername: shift.discord_username || "",
          totalMinutes: 0,
          status: "completed",
          lastClockIn: shift.clock_in
        };
      }

      if (shift.status === "completed") {
        userMap[key].totalMinutes += (shift.duration_minutes || 0);
      } else if (shift.status === "active") {
        // If they have any active shift, their overall status is active
        userMap[key].status = "active";
        userMap[key].lastClockIn = shift.clock_in;
      }
    });

    let registeredDoctors: Array<{ email?: string; name?: string }> = [];
    try {
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "registered_doctors")
        .single();
      if (settingsData?.value) {
        registeredDoctors = settingsData.value;
      }
    } catch {
      // safe ignore
    }

    const overview = Object.values(userMap).map(u => {
      const docRecord = registeredDoctors.find(d => d.email === u.email);
      return {
        ...u,
        name: docRecord?.name || u.name,
        totalHours: parseFloat((u.totalMinutes / 60).toFixed(1))
      };
    }).sort((a, b) => b.totalHours - a.totalHours);

    return NextResponse.json({ overview, totalShifts: shifts?.length || 0 });
  } catch (error) {
    console.error("[Admin Overview] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูล Admin" },
      { status: 500 }
    );
  }
}
