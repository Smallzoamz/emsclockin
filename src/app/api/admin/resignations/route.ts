import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch all resignation requests
export async function GET() {
  const session = await auth();

  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("resignation_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ resignations: data || [] });
  } catch (err: any) {
    console.error("[Resignations API GET] Error:", err);
    return NextResponse.json({ error: "Failed to load resignation requests" }, { status: 500 });
  }
}

// PATCH: Update resignation request status
export async function PATCH(request: Request) {
  const session = await auth();

  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status !== "approved" && status !== "rejected" && status !== "pending" && status !== "acknowledged") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const adminName = user.email || user.name || "Admin";

    const { data, error } = await supabase
      .from("resignation_requests")
      .update({
        status,
        approved_by: status === "pending" ? null : adminName,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Clear doctor data if resignation is approved
    if (status === "approved" && data) {
      const targetDiscordId = data.discord_id;
      const targetDiscordUsername = data.discord_username;

      // 1. Fetch system settings
      const { data: settingsRows } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["registered_doctors", "user_ranks", "op_schedule"]);

      const settingsMap = (settingsRows || []).reduce((acc: Record<string, any>, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const registeredDoctors = (settingsMap["registered_doctors"] || []) as Array<{
        email?: string;
        name?: string;
        discordUsername?: string;
        avatarUrl?: string;
        discordId?: string;
      }>;

      const userRanks = (settingsMap["user_ranks"] || {}) as Record<string, string>;
      const opSchedule = (settingsMap["op_schedule"] || {}) as Record<string, string[]>;

      // 2. Find doctor object using discordId or discordUsername fallback
      const doctorObj = registeredDoctors.find(
        doc => doc.discordId === targetDiscordId || 
        (doc.discordUsername && doc.discordUsername.toLowerCase() === targetDiscordUsername?.toLowerCase())
      );
      const doctorEmail = doctorObj?.email;

      // 3. Remove from registered_doctors list
      const updatedDoctors = registeredDoctors.filter(
        doc => doc.discordId !== targetDiscordId && 
        !(doc.discordUsername && doc.discordUsername.toLowerCase() === targetDiscordUsername?.toLowerCase())
      );
      await supabase
        .from("system_settings")
        .upsert({
          key: "registered_doctors",
          value: updatedDoctors,
          updated_at: new Date().toISOString()
        });

      // 4. Remove from user_ranks mapping
      if (doctorEmail) {
        delete userRanks[doctorEmail];
        await supabase
          .from("system_settings")
          .upsert({
            key: "user_ranks",
            value: userRanks,
            updated_at: new Date().toISOString()
          });
      }

      // 5. Remove from op_schedule weekly slots
      if (targetDiscordUsername) {
        let scheduleChanged = false;
        const updatedSchedule = { ...opSchedule };
        for (const day of Object.keys(updatedSchedule)) {
          if (Array.isArray(updatedSchedule[day]) && updatedSchedule[day].includes(targetDiscordUsername)) {
            updatedSchedule[day] = updatedSchedule[day].filter(u => u !== targetDiscordUsername);
            scheduleChanged = true;
          }
        }
        if (scheduleChanged) {
          await supabase
            .from("system_settings")
            .upsert({
              key: "op_schedule",
              value: updatedSchedule,
              updated_at: new Date().toISOString()
            });
        }
      }

      // 6. Delete all doctor-related logs across tables
      if (doctorEmail) {
        // Delete shifts
        await supabase.from("shifts").delete().eq("user_email", doctorEmail);
        
        // Delete exam attempts
        await supabase.from("exam_attempts").delete().eq("user_email", doctorEmail);

        // Delete user inbox messages
        await supabase.from("user_inbox").delete().eq("user_email", doctorEmail);

        // Delete mentorship relationships
        await supabase
          .from("mentorship_relations")
          .delete()
          .or(`mentor_email.eq.${doctorEmail},student_email.eq.${doctorEmail}`);

        // Delete bonus payouts
        await supabase.from("bonus_payouts").delete().eq("doctor_email", doctorEmail);
      }

      // Delete leave requests (using discord_id or fallback to username match)
      if (targetDiscordId) {
        await supabase.from("leave_requests").delete().eq("discord_id", targetDiscordId);
      } else if (targetDiscordUsername) {
        await supabase.from("leave_requests").delete().eq("discord_username", targetDiscordUsername);
      }
    }

    return NextResponse.json({ success: true, resignation: data });
  } catch (err: any) {
    console.error("[Resignations API PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update resignation request status" }, { status: 500 });
  }
}
