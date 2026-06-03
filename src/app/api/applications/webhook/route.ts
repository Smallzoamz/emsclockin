import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// Fetch the webhook URL for application notifications
async function getApplicationWebhookUrl(): Promise<string | undefined> {
  try {
    // Try application-specific webhook first
    const { data: appWebhook } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "discord_application_webhook_url")
      .single();
    if (appWebhook?.value) return appWebhook.value;

    // Fallback to general webhook
    const { data: generalWebhook } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "discord_webhook_url")
      .single();
    if (generalWebhook?.value) return generalWebhook.value;
  } catch (err) {
    console.error("[Application Webhook] Failed to fetch url from db:", err);
  }
  return process.env.DISCORD_WEBHOOK_URL;
}

// POST: Handle application actions (call / reject)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { application_id, action } = body;

    if (!application_id || !action) {
      return NextResponse.json({ error: "application_id and action are required" }, { status: 400 });
    }

    if (action === "call") {
      // Update status to 'called'
      const { data: application, error: updateError } = await supabase
        .from("doctor_applications")
        .update({ status: "called", called_at: new Date().toISOString() })
        .eq("id", application_id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      // Send Discord webhook notification
      const webhookUrl = await getApplicationWebhookUrl();
      if (webhookUrl) {
        const embed = {
          title: "📋 เรียกเข้ารับการสอบ — EMS Hospital",
          color: 0x3b82f6,
          description: [
            `**👤 ผู้สมัคร:** <@${application.discord_uid}>`,
            `**📝 ชื่อ IC:** ${application.ic_firstname} ${application.ic_lastname}`,
            `**🔢 คิวที่:** ${application.queue_number}`,
            "",
            "กรุณาเข้ามารับการสอบภายในเวลาที่กำหนด"
          ].join("\n"),
          footer: {
            text: "FiveM EMS Recruitment System"
          },
          timestamp: new Date().toISOString()
        };

        const requestBody = {
          username: "EMS Recruitment Bot",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
          content: `<@${application.discord_uid}>`,
          embeds: [embed]
        };

        try {
          const response = await fetch(`${webhookUrl}?wait=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const text = await response.text();
            console.error(`[Application Webhook] Failed: ${response.status} ${response.statusText}`);
            console.error(text);
          }
        } catch (webhookError: any) {
          console.error("[Application Webhook] Error sending webhook:", webhookError);
        }
      }

      return NextResponse.json({ success: true, application });
    }

    if (action === "reject") {
      // Update status to 'rejected'
      const { data: application, error: updateError } = await supabase
        .from("doctor_applications")
        .update({ status: "rejected" })
        .eq("id", application_id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      // Send Discord webhook notification
      const webhookUrl = await getApplicationWebhookUrl();
      if (webhookUrl) {
        const embed = {
          title: "❌ ผลการประเมิน: สอบไม่ผ่าน — EMS Hospital",
          color: 0xef4444,
          description: [
            `**👤 ผู้สมัคร:** <@${application.discord_uid}>`,
            `**📝 ชื่อ IC:** ${application.ic_firstname} ${application.ic_lastname}`,
            `**🔢 คิวที่:** ${application.queue_number}`,
            "",
            "ขออภัยด้วยค่ะ คุณไม่ผ่านการสอบในรอบนี้ สามารถยื่นสมัครใหม่ได้เมื่อระยะเวลาใบสมัครสิ้นสุดลง"
          ].join("\n"),
          footer: {
            text: "FiveM EMS Recruitment System"
          },
          timestamp: new Date().toISOString()
        };

        const requestBody = {
          username: "EMS Recruitment Bot",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
          content: `<@${application.discord_uid}>`,
          embeds: [embed]
        };

        try {
          await fetch(`${webhookUrl}?wait=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          });
        } catch (webhookError) {
          console.error("[Application Webhook] Error sending fail webhook:", webhookError);
        }
      }

      return NextResponse.json({ success: true, application });
    }

    if (action === "approve") {
      // Update status to 'approved'
      const { data: application, error: updateError } = await supabase
        .from("doctor_applications")
        .update({ status: "approved" })
        .eq("id", application_id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      // Send Discord webhook notification
      const webhookUrl = await getApplicationWebhookUrl();
      if (webhookUrl) {
        const embed = {
          title: "🎉 สอบผ่านการคัดเลือก — EMS Hospital",
          color: 0x10b981,
          description: [
            `**👤 ผู้สมัคร:** <@${application.discord_uid}>`,
            `**📝 ชื่อ IC:** ${application.ic_firstname} ${application.ic_lastname}`,
            `**🔢 คิวที่:** ${application.queue_number}`,
            "",
            "ยินดีด้วยค่ะ! คุณผ่านการสอบคัดเลือกเข้าเป็นแพทย์เรียบร้อยแล้ว"
          ].join("\n"),
          footer: {
            text: "FiveM EMS Recruitment System"
          },
          timestamp: new Date().toISOString()
        };

        const requestBody = {
          username: "EMS Recruitment Bot",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
          content: `<@${application.discord_uid}>`,
          embeds: [embed]
        };

        try {
          await fetch(`${webhookUrl}?wait=true`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          });
        } catch (webhookError) {
          console.error("[Application Webhook] Error sending pass webhook:", webhookError);
        }
      }

      return NextResponse.json({ success: true, application });
    }

    return NextResponse.json({ error: "Invalid action. Use 'call', 'reject' or 'approve'" }, { status: 400 });
  } catch (error: any) {
    console.error("[Application Webhook POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process application action" }, { status: 500 });
  }
}
