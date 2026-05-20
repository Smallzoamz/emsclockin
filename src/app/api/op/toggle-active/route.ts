import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { syncOpQueueToDiscord, teardownOpQueue } from "@/lib/op-discord-sync";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const discordUsername = user.discordUsername as string;
  const isAdmin = user.role === "admin";

  try {
    // 1. Authorization check: Admin or today's OP
    const { data: scheduleData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "op_schedule")
      .single();
    
    const opSchedule = scheduleData?.value || {};
    
    const thaiTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[thaiTime.getUTCDay()];
    const todayOPs = opSchedule[currentDay] || [];
    
    const isOPForToday = discordUsername && todayOPs.includes(discordUsername);
    if (!isAdmin && !isOPForToday) {
      return NextResponse.json({ error: "Access Denied: You are not on OP duty today." }, { status: 403 });
    }

    const { active, notice } = await req.json();

    // 2. Clock-in check for non-admins when opening OP
    if (active && !isAdmin) {
      const userEmail = session.user.email;
      if (!userEmail) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("user_email", userEmail)
        .eq("status", "active")
        .maybeSingle();

      if (!activeShift) {
        return NextResponse.json(
          { error: "คุณต้องกดเข้าเวรก่อน จึงจะสามารถเปิดระบบ OP ได้ค่ะ" },
          { status: 400 }
        );
      }
    }

    // 3. Perform DB updates
    if (active) {
      // Starting OP: Keep the existing message ID if present to edit it instead of sending new
      await Promise.all([
        supabase.from("system_settings").upsert({ key: "op_active", value: true }, { onConflict: "key" }),
        supabase.from("system_settings").upsert({ key: "op_notice", value: notice || "" }, { onConflict: "key" })
      ]);

      // Call sync with forceNewMessage = true to signal activation (will tag OP, but still PATCH if existing)
      await syncOpQueueToDiscord(true);
    } else {
      // Stopping OP: Update database status first so embeds will render as CLOSED
      await supabase.from("system_settings").upsert({ key: "op_active", value: false }, { onConflict: "key" });

      // Teardown: Delete queue message, send summary report, clear op_queue_state & message ID
      await teardownOpQueue();
    }

    return NextResponse.json({ success: true, active });
  } catch (error: any) {
    console.error("[Toggle OP API] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle OP state" }, { status: 500 });
  }
}
