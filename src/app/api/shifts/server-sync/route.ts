import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendDiscordWebhook } from "@/lib/discord-webhook";
import { formatThaiDate, calcDurationMinutes } from "@/lib/utils";
import { syncOpQueueToDiscord, teardownOpQueue } from "@/lib/op-discord-sync";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, discordId, discordUsername, action } = body;

    if (!action || (!discordId && !discordUsername)) {
      return NextResponse.json({ error: "Missing required fields: action and either discordId or discordUsername" }, { status: 400 });
    }

    if (action !== "clock_in" && action !== "clock_out") {
      return NextResponse.json({ error: "Invalid action. Must be 'clock_in' or 'clock_out'" }, { status: 400 });
    }

    // 1. Fetch settings from system_settings
    const { data: settingsData, error: settingsErr } = await supabase
      .from("system_settings")
      .select("*");

    if (settingsErr) {
      console.error("[Server Sync Settings Fetch] Error:", settingsErr);
      throw settingsErr;
    }

    const settings: Record<string, any> = {};
    if (settingsData) {
      settingsData.forEach(item => {
        settings[item.key] = item.value;
      });
    }

    const isEnabled = settings["server_sync_enabled"] === true;
    const configApiKey = settings["server_sync_api_key"] || "";
    const registeredDoctors = settings["registered_doctors"] || [];
    const customNames = settings["user_names"] || {};
    const opOpenedBy = settings["op_opened_by"] || null;
    const isOpActive = settings["op_active"] === true;

    // 2. Validate toggle and apiKey
    if (!isEnabled) {
      return NextResponse.json({ error: "Server sync integration is disabled in system settings" }, { status: 400 });
    }

    if (!configApiKey || apiKey !== configApiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // 3. Find registered doctor
    const doctor = registeredDoctors.find((d: any) => 
      (discordId && String(d.discordId) === String(discordId)) || 
      (discordUsername && d.discordUsername?.toLowerCase() === String(discordUsername).toLowerCase())
    );

    if (!doctor) {
      return NextResponse.json({ error: "Doctor profile not registered via Discord login yet. Log in to the website first." }, { status: 404 });
    }

    const userEmail = doctor.email;
    const userName = doctor.name || "Unknown";
    const finalName = customNames[userEmail] || userName;

    // 4. Handle Clock-In
    if (action === "clock_in") {
      // Check active or pending shift
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .in("status", ["active", "pending_proof"])
        .maybeSingle();

      if (activeShift) {
        return NextResponse.json({ 
          success: true, 
          message: "Already clocked in", 
          shift: activeShift 
        });
      }

      const now = new Date();
      const { data: newShift, error: insertErr } = await supabase
        .from("shifts")
        .insert({
          user_email: userEmail,
          user_name: userName,
          discord_username: doctor.discordUsername || null,
          clock_in: now.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Send Discord Webhook
      const messageId = await sendDiscordWebhook({
        username: finalName,
        discordUsername: doctor.discordUsername,
        discordId: doctor.discordId,
        action: "clock_in",
        timestamp: formatThaiDate(now),
        avatarUrl: doctor.avatarUrl,
      });

      if (messageId) {
        await supabase.from("shifts").update({ discord_message_id: messageId }).eq("id", newShift.id);
      }

      // Sync OP Queue or Closed Summary
      if (isOpActive) {
        await syncOpQueueToDiscord();
      } else {
        await teardownOpQueue();
      }

      return NextResponse.json({
        success: true,
        message: "Clocked in successfully from server ✅",
        shift: newShift
      });
    }

    // 5. Handle Clock-Out
    if (action === "clock_out") {
      // Find active shift
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .eq("status", "active")
        .maybeSingle();

      if (!activeShift) {
        // Check if already pending proof
        const { data: pendingShift } = await supabase
          .from("shifts")
          .select("*")
          .eq("user_email", userEmail)
          .eq("status", "pending_proof")
          .maybeSingle();

        if (pendingShift) {
          return NextResponse.json({
            success: true,
            message: "Already clocked out, pending proof image",
            shift: pendingShift
          });
        }

        return NextResponse.json({ error: "No active shift found to clock out" }, { status: 400 });
      }

      const now = new Date();
      const clockIn = new Date(activeShift.clock_in);
      const durationMinutes = calcDurationMinutes(clockIn, now);

      // Transition to pending_proof
      const { data: updatedShift, error: updateErr } = await supabase
        .from("shifts")
        .update({
          clock_out: now.toISOString(),
          duration_minutes: durationMinutes,
          status: "pending_proof",
        })
        .eq("id", activeShift.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Trigger OP Queue Teardown or update Closed Summary
      const isOpOwner = opOpenedBy && opOpenedBy.email === userEmail;
      if (isOpActive) {
        if (isOpOwner) {
          await teardownOpQueue();
        } else {
          await syncOpQueueToDiscord();
        }
      } else {
        await teardownOpQueue();
      }

      return NextResponse.json({
        success: true,
        message: "Clocked out from server, shift transitioned to pending_proof. Web app will prompt for proof image 🔴",
        shift: updatedShift
      });
    }
  } catch (error: any) {
    console.error("[Server Sync Webhook Error]:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
