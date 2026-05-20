interface WebhookPayload {
  username: string;
  discordUsername?: string;
  discordId?: string;
  action: "clock_in" | "clock_out";
  timestamp: string;
  duration?: string;
  weeklyHours?: number;
  avatarUrl?: string;
}

export async function sendDiscordWebhook(
  payload: WebhookPayload,
  existingMessageId?: string
): Promise<string | undefined> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[Discord Webhook] No webhook URL configured, skipping...");
    return;
  }

  const isClockIn = payload.action === "clock_in";

  const isValidAvatarUrl = payload.avatarUrl && payload.avatarUrl.startsWith("http");

  const description = [
    `**👤 ชื่อ:** \`${payload.username}\``,
    `**🆔 Discord ID:** \`${payload.discordId || payload.discordUsername || "ไม่ได้เชื่อมต่อ"}\``,
    `**⏰ เวลา:** \`${payload.timestamp}\``,
    `**📌 สถานะ:** ${isClockIn ? "\`🟢 เข้าเวร\`" : "\`🔴 ออกเวร\`"}`,
  ];

  if (payload.duration) {
    description.push("");
    description.push(`**⏱️ ระยะเวลาเวรนี้:** \`${payload.duration}\``);
  }

  if (payload.weeklyHours !== undefined) {
    description.push(`**📊 ชั่วโมงสัปดาห์นี้:** \`${payload.weeklyHours.toFixed(1)} ชม.\``);
  }

  const embed = {
    title: isClockIn ? "📋 เข้าเวร — EMS Hospital" : "📋 ออกเวร — EMS Hospital",
    color: isClockIn ? 0x10b981 : 0xef4444,
    description: description.join("\n"),
    thumbnail: isValidAvatarUrl ? { url: payload.avatarUrl } : undefined,
    footer: {
      text: "FiveM EMS Clock-in System",
    },
    timestamp: new Date().toISOString(),
  };

  const url = existingMessageId 
    ? `${webhookUrl}/messages/${existingMessageId}`
    : `${webhookUrl}?wait=true`;

  const method = existingMessageId ? "PATCH" : "POST";

  const requestBody = {
    username: "EMS Clock-in Bot",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
    embeds: [embed],
  };

  // Log the payload for debugging if it fails
  try {
    require("fs").writeFileSync("webhook-debug.log", JSON.stringify(requestBody, null, 2) + "\n\n", { flag: 'a' });
  } catch (e) {}

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok && !existingMessageId) {
      const data = await response.json();
      return data.id;
    } else if (!response.ok) {
      const text = await response.text();
      console.error(`[Discord Webhook] Failed: ${response.status} ${response.statusText}`);
      console.error(text);
      try {
        require("fs").writeFileSync("webhook-error.log", `[${new Date().toISOString()}] Failed: ${response.status} ${text}\nPayload: ${JSON.stringify(requestBody)}\n\n`, { flag: 'a' });
      } catch (e) {}
    }
  } catch (error: any) {
    console.error("[Discord Webhook] Error:", error);
    try {
        require("fs").writeFileSync("webhook-error.log", `[${new Date().toISOString()}] Exception: ${error.message}\n`, { flag: 'a' });
    } catch (e) {}
  }
}
