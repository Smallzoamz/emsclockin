import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { debouncedSyncOpQueueToDiscord } from "@/lib/op-discord-sync";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const discordUsername = user.discordUsername as string;
  const isAdmin = user.role === "admin";

  try {
    // Access control check: Admin or OP for today
    if (!isAdmin) {
      const { data: scheduleData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "op_schedule")
        .single();
      
      const opSchedule = scheduleData?.value || {};
      
      // Calculate day of week in GMT+7
      const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = dayNames[thaiTime.getUTCDay()];

      const todayOPs = opSchedule[currentDay] || [];
      const isOPForToday = discordUsername && todayOPs.includes(discordUsername);

      if (!isOPForToday) {
        return NextResponse.json({ error: "Today is not your scheduled OP duty day." }, { status: 403 });
      }
    }

    const body = await req.json();
    const { opQueueState } = body; // This is the email -> status map

    if (opQueueState === undefined) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "op_queue_state",
        value: opQueueState,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Trigger debounced async sync to Discord message (coalesces rapid updates)
    debouncedSyncOpQueueToDiscord().catch(err => console.error("Discord sync error:", err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OP Update Queue API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update queue" }, { status: 500 });
  }
}
