import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch all leave requests
export async function GET() {
  const session = await auth();

  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ leaves: data || [] });
  } catch (err: any) {
    console.error("[Leaves API GET] Error:", err);
    return NextResponse.json({ error: "Failed to load leave requests" }, { status: 500 });
  }
}

// PATCH: Update leave request status
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

    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const adminName = user.email || user.name || "Admin";

    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: status === "pending" ? null : adminName,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Send Discord status notification asynchronously
    sendLeaveStatusWebhook(data).catch((err) =>
      console.error("[Leave Webhook Async Error] Failed:", err)
    );

    return NextResponse.json({ success: true, leave: data });
  } catch (err: any) {
    console.error("[Leaves API PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update leave request status" }, { status: 500 });
  }
}

// Helper to send approval/rejection updates to Discord log channel
async function sendLeaveStatusWebhook(leave: any) {
  try {
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .single();

    const webhookUrl = setting?.value || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("[Leave Discord Webhook] Webhook URL not configured, skipping.");
      return;
    }

    const isApproved = leave.status === "approved";
    const isRejected = leave.status === "rejected";
    if (!isApproved && !isRejected) return;

    // Formatted dates in Asia/Bangkok
    const formatDateStr = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    };

    const startDateStr = formatDateStr(leave.start_date);
    const endDateStr = formatDateStr(leave.end_date);

    const embed = {
      title: isApproved ? "🟢 อนุมัติคำขอลางานสำเร็จ" : "🔴 ปฏิเสธคำขอลางาน",
      color: isApproved ? 0x10b981 : 0xef4444,
      description: `รายการขอหยุดงานของแพทย์ <@${leave.discord_id}> ได้รับการตรวจสอบและปรับสถานะโดยผู้ดูแลระบบแล้วค่ะ`,
      fields: [
        { name: "ชื่อแพทย์", value: leave.doctor_name, inline: true },
        { name: "ประเภทการลา", value: leave.leave_type, inline: true },
        { name: "ช่วงเวลาที่ลา", value: `📅 ${startDateStr} - ${endDateStr}`, inline: false },
        { name: "เหตุผลการลา", value: leave.reason, inline: false },
        { name: "ผู้ดำเนินการ", value: leave.approved_by || "Admin", inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "LUX MEDIC | ระบบใบลาพักงานอัตโนมัติ"
      }
    };

    const payload = {
      username: "EMS Leave Bot",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/262/262293.png",
      content: `<@${leave.discord_id}>`, // Mention user
      embeds: [embed]
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("[Leave Status Webhook Error] Failed to send webhook:", err);
  }
}

