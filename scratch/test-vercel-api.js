import fs from "fs";
import path from "path";

const envLocal = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
const env = {};
envLocal.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
  }
});

const apiKey = env.EMERGENCY_API_KEY || "ems_emergency_secret_key_2026";
const websiteUrl = "https://emsclockin.vercel.app";

async function run() {
  console.log("Testing POST to Vercel API...");
  try {
    const res = await fetch(`${websiteUrl}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Test complaint content from script",
        phone: "123456789",
        discord_message_id: "TEST_MSG_ID",
        discord_user_id: "test_user_id",
        discord_username: "test_user",
        discord_nickname: "Test User Nickname",
        discord_thread_id: "test_thread_id",
        secret: apiKey
      })
    });
    console.log("POST Status:", res.status);
    const data = await res.json();
    console.log("POST Response:", data);
  } catch (err) {
    console.error("POST failed:", err);
  }
}

run();
