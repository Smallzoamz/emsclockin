const https = require('https');
const fs = require('fs');

// Read .env.local
const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DISCORD_WEBHOOK_URL=(.+)/);
if (!match) {
  console.log("No webhook URL found");
  process.exit(1);
}
const webhookUrl = match[1].trim();

const url = webhookUrl + '?wait=true';

const payload = {
  username: "EMS Clock-in Bot",
  avatar_url: "https://cdn-icons-png.flaticon.com/512/2869/2869823.png",
  embeds: [
    {
      title: "📋 เข้าเวร — EMS Hospital",
      color: 0x10b981,
      fields: [
        { name: "👤 ชื่อ", value: "Test User", inline: true },
        { name: "🆔 Discord", value: "ไม่ได้เชื่อมต่อ", inline: true },
        { name: "⏰ เวลา", value: "17 พ.ค. 2026 09:51 น.", inline: false },
        { name: "📌 สถานะ", value: "🟢 เข้าเวร", inline: true }
      ],
      footer: { text: "FiveM EMS Clock-in System" },
      timestamp: new Date().toISOString()
    }
  ]
};

const data = JSON.stringify(payload);

const { URL } = require('url');
const parsedUrl = new URL(url);

const options = {
  hostname: parsedUrl.hostname,
  port: 443,
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(`BODY: ${body}`));
});

req.on('error', e => console.error(`problem with request: ${e.message}`));
req.write(data);
req.end();
