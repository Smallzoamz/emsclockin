import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { startOfWeek } from "date-fns";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });

    const { data: shifts, error } = await supabase
      .from("shifts")
      .select("user_email, user_name, discord_username, duration_minutes, is_deducted")
      .eq("status", "completed")
      .gte("clock_in", startDate.toISOString())
      .or("is_deducted.is.null,is_deducted.eq.false");

    if (error) throw error;

    // Aggregate by email or discord username
    const userMap: Record<string, {
      email: string;
      name: string;
      discordUsername: string;
      totalMinutes: number;
    }> = {};

    (shifts || []).forEach(shift => {
      // Prioritize discord username if available, fallback to email
      const key = shift.discord_username || shift.user_email;
      if (!userMap[key]) {
        userMap[key] = {
          email: shift.user_email,
          name: shift.user_name || "Unknown",
          discordUsername: shift.discord_username || "",
          totalMinutes: 0
        };
      }
      userMap[key].totalMinutes += (shift.duration_minutes || 0);
    });

    const { data: settingsData } = await supabase.from("system_settings").select("*");
    const bonusThresholdStr = settingsData?.find(s => s.key === "bonus_threshold")?.value;
    const bonusThreshold = bonusThresholdStr ? Number(bonusThresholdStr) : 20;
    const registeredDoctors = settingsData?.find(s => s.key === "registered_doctors")?.value || [];

    const { data: pastHistory } = await supabase
      .from("bonus_history")
      .select("*")
      .eq("is_published", true)
      .order("week_start", { ascending: false });

    const ranking = Object.values(userMap)
      .map(user => {
        let carriedOverBonus = 0;
        
        if (pastHistory) {
          for (const history of pastHistory) {
            const entry = (history.snapshot_data as Array<{ email?: string; discordUsername?: string; name?: string; totalHours?: number; appliedRate?: number }> || []).find((e) => 
               (user.email && e.email === user.email) ||
               (user.discordUsername && e.discordUsername === user.discordUsername) ||
               (user.name && e.name === user.name)
            );
            
            if (entry) {
              const totalPastHours = entry.totalHours || 0;
              if (totalPastHours < bonusThreshold) {
                // They were not paid this past week. Add the base bonus from that week.
                const pastAppliedRate = entry.appliedRate || history.bonus_rate || 0;
                carriedOverBonus += (totalPastHours * pastAppliedRate);
                // Continue looping to older weeks to accumulate further
              } else {
                // They were paid in this week, which means prior carry-overs were also paid. Stop here.
                break;
              }
            }
          }
        }

        const docRecord = (registeredDoctors as Array<{ email?: string; name?: string; discordUsername?: string; discordId?: string }> || []).find((d) => 
          (user.email && d.email === user.email) ||
          (user.discordUsername && d.discordUsername === user.discordUsername)
        );
        const resolvedName = docRecord?.name || user.name;
        const discordId = docRecord?.discordId || null;

        const currentWeekHours = parseFloat((user.totalMinutes / 60).toFixed(1));

        return {
          email: user.email,
          name: resolvedName,
          discordUsername: user.discordUsername,
          discordId: discordId,
          currentWeekHours: currentWeekHours,
          totalHours: currentWeekHours, // Hours do not carry over!
          carriedOverBonus: carriedOverBonus
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("[Ranking] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการโหลดข้อมูลจัดอันดับ" },
      { status: 500 }
    );
  }
}
