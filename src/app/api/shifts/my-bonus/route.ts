import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find user's discord username to match in the snapshot
  const { data: userData } = await supabase
    .from("users")
    .select("discord_username")
    .eq("email", session.user.email)
    .single();

  const discordUsername = userData?.discord_username;

  try {
    const { data: historyData, error } = await supabase
      .from("bonus_history")
      .select("*")
      .eq("is_published", true)
      .order("week_start", { ascending: false });

    if (error) {
      if (error.code === '42703') {
        // is_published doesn't exist yet, just return empty to prevent crash
        return NextResponse.json({ myBonuses: [] });
      }
      throw error;
    }

    // Fetch bonus threshold from settings
    const { data: settingsData } = await supabase.from("system_settings").select("*");
    const bonusThresholdStr = settingsData?.find(s => s.key === "bonus_threshold")?.value;
    const bonusThreshold = bonusThresholdStr ? Number(bonusThresholdStr) : 20;

    // Fetch all payouts for the current user
    const { data: payoutsData } = await supabase
      .from("bonus_payouts")
      .select("*")
      .eq("doctor_email", session.user.email);

    const payoutsMap = new Map<string, { paid_at: string }>();
    (payoutsData || []).forEach((p: any) => {
      payoutsMap.set(p.bonus_history_id, { paid_at: p.paid_at });
    });

    // Filter snapshot data to only include the current user
    const myBonuses = (historyData || []).map(record => {
      const myData = record.snapshot_data.find((entry: any) => 
        (entry.email && entry.email === session.user?.email) ||
        (discordUsername && entry.discordUsername === discordUsername) ||
        entry.name === session.user?.name
      );

      const totalHours = myData ? myData.totalHours : 0;
      const isBelowThreshold = totalHours < bonusThreshold;
      const appliedRate = myData?.appliedRate || record.bonus_rate || 0;
      const baseBonus = Math.floor(totalHours) * appliedRate;
      const carriedOverBonus = myData?.carriedOverBonus || 0;
      const mentorBonus = myData?.mentorBonus || 0;
      
      // If below threshold, they don't actually "receive" it this week, it gets carried over.
      // We still show the calculated value, but UI flags it in red.
      // Note: mentorBonus is always paid, it does not get carried over.
      const myBonus = baseBonus + carriedOverBonus + mentorBonus;

      // Check payout status
      const payoutInfo = payoutsMap.get(record.id);

      return {
        id: record.id,
        week_start: record.week_start,
        week_end: record.week_end,
        bonus_rate: appliedRate,
        my_hours: totalHours,
        my_bonus: myBonus,
        mentor_bonus: mentorBonus,
        rank_name: myData?.rankName || "ไม่ได้กำหนดยศ",
        custom_name: myData?.customName || myData?.name || session.user?.name || "N/A",
        is_below_threshold: isBelowThreshold,
        is_paid: !!payoutInfo,
        paid_at: payoutInfo?.paid_at || null,
        created_at: record.created_at
      };
    });

    return NextResponse.json({ myBonuses });
  } catch (error) {
    console.error("[My Bonus GET] Error:", error);
    return NextResponse.json({ error: "Failed to load my bonus" }, { status: 500 });
  }
}
