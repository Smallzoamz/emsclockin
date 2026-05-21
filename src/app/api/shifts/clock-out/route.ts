import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";
import {
  formatThaiDate,
  formatDuration,
  calcDurationMinutes,
  getCurrentWeekRange,
} from "@/lib/utils";
import { queueSyncOpQueueToDiscord, teardownOpQueue } from "@/lib/op-discord-sync";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  const userName = session.user.name || "Unknown";
  const user = session.user as Record<string, unknown>;
  const discordUsername = (user.discordUsername as string) || undefined;
  const avatarUrl = (session.user.image as string) || undefined;

  try {
    // Find active shift
    const { data: activeShift, error: findError } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_email", userEmail)
      .eq("status", "active")
      .single();

    if (findError || !activeShift) {
      return NextResponse.json(
        { error: "คุณไม่ได้อยู่ในเวร กรุณาเข้าเวรก่อน" },
        { status: 400 }
      );
    }

    // Check if OP is active and this user is on OP duty today
    const { data: opActiveData } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["op_active", "op_schedule", "op_opened_by"]);

    const opSettings = (opActiveData || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const isOpActive = opSettings.op_active === true;
    const opOpenedBy = opSettings.op_opened_by || null;

    // Only the OP opener is blocked from clocking out while OP is active
    // Other OP doctors can clock out freely (e.g. Sup who stepped in temporarily)
    if (isOpActive && opOpenedBy && opOpenedBy.email === userEmail) {
      return NextResponse.json(
        { error: "กรุณากดปิดระบบ OP บนหน้า OP Dashboard ก่อน จึงจะสามารถออกเวรได้ค่ะ" },
        { status: 400 }
      );
    }

    // Process FormData
    const formData = await req.formData();
    const proofFile = formData.get("proof") as File | null;

    if (!proofFile) {
      return NextResponse.json(
        { error: "กรุณาแนบรูปภาพยืนยันการออกเวร" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileExt = proofFile.name.split('.').pop();
    const fileName = `${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExt}`;
    const arrayBuffer = await proofFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("proofs")
      .upload(fileName, buffer, {
        contentType: proofFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("[Upload Error]", uploadError);
      return NextResponse.json(
        { error: "อัปโหลดรูปภาพไม่สำเร็จ (ตรวจสอบว่าสร้าง bucket proofs แล้วหรือยัง)" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("proofs")
      .getPublicUrl(fileName);
      
    const proofImageUrl = publicUrlData.publicUrl;

    // Calculate duration
    const now = new Date();
    const clockIn = new Date(activeShift.clock_in);
    const durationMinutes = calcDurationMinutes(clockIn, now);

    // Update shift
    const { data: updatedShift, error: updateError } = await supabase
      .from("shifts")
      .update({
        clock_out: now.toISOString(),
        duration_minutes: durationMinutes,
        status: "completed",
        proof_image_url: proofImageUrl,
      })
      .eq("id", activeShift.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Calculate weekly hours
    const weekRange = getCurrentWeekRange();
    const { data: weeklyShifts } = await supabase
      .from("shifts")
      .select("duration_minutes")
      .eq("user_email", userEmail)
      .eq("status", "completed")
      .gte("clock_in", weekRange.start.toISOString())
      .lte("clock_in", weekRange.end.toISOString());

    const weeklyMinutes = (weeklyShifts || []).reduce(
      (acc, s) => acc + (s.duration_minutes || 0),
      0
    );
    const weeklyHours = weeklyMinutes / 60;

    // Fetch custom name from settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "user_names")
      .single();
    
    const customNames = settingsData?.value || {};
    const finalName = customNames[userEmail] || userName;

    // Send Discord webhook
    const discordId = (user.discordId as string) || undefined;
    await sendDiscordWebhook({
      username: finalName,
      discordUsername,
      discordId,
      action: "clock_out",
      timestamp: formatThaiDate(now),
      duration: formatDuration(durationMinutes),
      weeklyHours,
      avatarUrl,
    }, activeShift.discord_message_id);

    // Check if the user who clocked out is the OP opener
    const isOpOwner = opOpenedBy && opOpenedBy.email === userEmail;

    if (isOpOwner) {
      // If OP opener clocks out, perform complete queue teardown:
      // clear op_queue_state, delete queue message and post daily summary.
      teardownOpQueue().catch(err => console.error("OP Teardown error:", err));
    } else {
      // Otherwise, update OP Discord queue message normally in real-time (via coalesced queue)
      queueSyncOpQueueToDiscord();
    }

    return NextResponse.json({
      success: true,
      shift: updatedShift,
      duration: formatDuration(durationMinutes),
      weeklyHours: weeklyHours.toFixed(1),
      message: "ออกเวรเรียบร้อย 🔴",
    });
  } catch (error) {
    console.error("[Clock-out] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการออกเวร" },
      { status: 500 }
    );
  }
}
