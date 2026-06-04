# คู่มือระบบแจ้งเหตุฉุกเฉินผ่าน Discord Bot (Emergency System Integration)

คู่มือนี้สำหรับผู้ดูแลระบบ เพื่อติดตั้งโค้ดบอทดิสคอร์ด (Discord Bot) เชื่อมต่อกับระบบแจ้งเหตุฉุกเฉินของเว็บ EMS Clock-in

---

## 🛠️ สิ่งที่ต้องเตรียมความพร้อม

1. **Discord Bot Token**: บอทดิสคอร์ดของคุณต้องการ Permission สำหรับ:
   - `Read Messages / View Channel`
   - `Send Messages`
   - `Add Reactions`
   - `Message Content Intent` (ต้องเปิดใช้งานใน Discord Developer Portal)
2. **Channel ID**: ไอดีห้องดิสคอร์ดสำหรับรับแจ้งเหตุฉุกเฉิน
3. **API Key & URL**:
   - `NEXT_PUBLIC_SUPABASE_URL` (ดูในเว็บ)
   - `SUPABASE_SERVICE_ROLE_KEY` (ดูในเว็บ)
   - `EMERGENCY_API_KEY` (ค่าเริ่มต้นคือ `ems_emergency_secret_key_2026` หรือระบุใน `.env.local` ของเว็บ)

---

## 🤖 โค้ดดิสคอร์ดบอท (Node.js - discord.js v14)

สร้างไฟล์สำหรับบอทฉุกเฉิน (เช่น `emergency-bot.js`) และติดตั้งแพ็กเกจ:
```bash
npm install discord.js @supabase/supabase-js dotenv
```

และเขียนโค้ดดังต่อไปนี้:

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// 1. ตั้งค่าบอทและ Supabase
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ดึงข้อมูลการตั้งค่าจาก Environment Variables
const EMERGENCY_CHANNEL_ID = process.env.EMERGENCY_CHANNEL_ID; // ไอดีห้องแจ้งเหตุ
const WEBSITE_API_URL = process.env.WEBSITE_API_URL || 'http://localhost:3000'; // URL ของเว็บคุณ
const EMERGENCY_API_KEY = process.env.EMERGENCY_API_KEY || 'ems_emergency_secret_key_2026';

client.once('ready', () => {
  console.log(`🤖 Bot is ready as ${client.user.tag}!`);
  
  // 2. ฟังการอัปเดตจากระบบหลังบ้านเว็บ (Supabase Realtime)
  // เมื่อหมอกดติ๊กถูก "ช่วยเหลือสำเร็จแล้ว" บนเว็บ -> บอทจะมาติ๊กถูก ✅ ให้บนดิสคอร์ด
  supabase
    .channel('realtime-emergency-bot')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'emergency_calls' },
      async (payload) => {
        const newCall = payload.new;
        if (newCall && newCall.status === 'resolved' && newCall.discord_message_id) {
          try {
            console.log(`📍 เคสได้รับการช่วยเหลือสำเร็จ กำลังติ๊กถูกในดิสคอร์ด: ${newCall.discord_message_id}`);
            const channel = await client.channels.fetch(EMERGENCY_CHANNEL_ID);
            if (channel && channel.isTextBased()) {
              const msg = await channel.messages.fetch(newCall.discord_message_id);
              if (msg) {
                // เพิ่ม Reaction ✅ ลงบนข้อความแจ้งเหตุต้นฉบับ
                await msg.react('✅');
              }
            }
          } catch (err) {
            console.error('❌ ไม่สามารถติ๊กถูกให้ข้อความในดิสคอร์ดได้:', err.message);
          }
        }
      }
    )
    .subscribe();
});

// 3. ฟังข้อความแจ้งเหตุจากผู้เล่นในดิสคอร์ด
client.on('messageCreate', async (message) => {
  // กรอง: ไม่ใช่ห้องที่กำหนด หรือเป็นบอทส่งเอง
  if (message.channelId !== EMERGENCY_CHANNEL_ID || message.author.bot) return;

  // ดึงไฟล์รูปภาพที่แนบมา
  const attachment = message.attachments.first();
  const imageUrl = attachment ? attachment.url : null;
  const content = message.content.trim();

  // ตรวจสอบคีย์เวิร์ด ID (เช่น ID 123, ไอดี 456)
  const idPattern = /\b(id|ไอดี|เลข|ดิบ)\s*:?\s*\d+/i;
  const hasId = idPattern.test(content);

  // ตรวจสอบเบอร์โทรศัพท์ (ฟอร์แมตรองรับ 0812345678, 081-234-5678, 090 123 4567)
  const phonePattern = /\b0[5689]\d{8}\b|\b0\d{1,2}[- ]?\d{3}[- ]?\d{4}\b/;
  const phoneMatch = content.match(phonePattern);

  // ตรวจสอบความถูกต้องของฟอร์มการแจ้งเหตุ
  const isFormatValid = phoneMatch && !hasId && imageUrl;

  if (!isFormatValid) {
    // กรณีที่ 1: กรอกผิดฟอร์ม (ส่ง ID หรือไม่มีรูปภาพ หรือไม่มีเบอร์โทร)
    try {
      let warningMsg = `สวัสดีครับ <@${message.author.id}> 🚨 คุณกรอกข้อมูลผิดฟอร์มการแจ้งเหตุครับ\n\n`;
      warningMsg += `**ฟอร์มการแจ้งเหตุฉุกเฉินที่ถูกต้อง:**\n`;
      warningMsg += `📱 **เบอร์โทร**: [เบอร์โทรศัพท์ 9-10 หลัก]\n`;
      warningMsg += `📸 **รูปภาพ**: [แนบรูปภาพจุดเกิดเหตุ]\n\n`;
      warningMsg += `*⚠️ ห้ามใช้เลข ID แทนเบอร์โทร และต้องแนบภาพเสมอตัวอย่างการกรอก:\n`;
      warningMsg += `เบอร์โทร: 0891234567 (พร้อมแนบรูปภาพ)*`;

      // ส่งข้อความแจ้งเตือนแทกผู้เล่นคนนั้น
      await message.reply(warningMsg);
    } catch (err) {
      console.error('❌ ไม่สามารถส่งข้อความเตือนผู้เล่นได้:', err.message);
    }
    return;
  }

  // กรณีที่ 2: กรอกฟอร์มถูกต้อง -> ดึงข้อมูลยิงเข้าเว็บ
  const phone = phoneMatch[0].replace(/[- ]/g, ''); // ลบขีดหรือช่องว่างออกให้เหลือแต่ตัวเลข
  
  try {
    console.log(`📞 พบการแจ้งเหตุใหม่จากผู้เล่น: เบอร์โทร ${phone} | รูปภาพ ${imageUrl}`);
    
    // บันทึกลง Supabase หรือยิง POST ไปหลังบ้านเว็บ
    const response = await fetch(`${WEBSITE_API_URL}/api/emergency-calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        image_url: imageUrl,
        discord_message_id: message.id,
        discord_user_id: message.author.id,
        secret: EMERGENCY_API_KEY
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ บันทึกเหตุฉุกเฉินเข้าระบบแจ้งเตือนของเว็บแล้ว');
    } else {
      console.error('❌ หลังบ้านเว็บปฏิเสธข้อมูล:', result.error);
    }
  } catch (err) {
    console.error('❌ ไม่สามารถส่งเหตุฉุกเฉินเข้าเว็บได้:', err.message);
  }
});

// รันบอทของคุณ
client.login(process.env.DISCORD_BOT_TOKEN);
```

---

## ⚙️ วิธีการทดสอบระบบ

1. ตั้งค่า `.env` สำหรับบอทดิสคอร์ดของคุณ:
   ```env
   DISCORD_BOT_TOKEN=MTk4M...your_bot_token...
   EMERGENCY_CHANNEL_ID=1505...your_channel_id...
   NEXT_PUBLIC_SUPABASE_URL=https://ngkikazmllpvrxorezrw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...your_service_role_key...
   WEBSITE_API_URL=http://localhost:3000
   EMERGENCY_API_KEY=ems_emergency_secret_key_2026
   ```
2. รันบอท `node emergency-bot.js`
3. ไปยังห้องดิสคอร์ดที่ระบุไว้ และทดสอบพิมพ์:
   - **กรณีผ่าน**:พิมพ์ `เบอร์โทร 0812345678` พร้อมแนบรูปภาพ บอทจะเงียบและส่งเข้าระบบเว็บ EMS ทันที (จะขึ้นแจ้งเตือนและส่งเสียงไซเรนบนหน้าแดชบอร์ด)
   - **กรณีไม่ผ่าน**:พิมพ์ `ID 123` หรือพิมพ์เบอร์โทรแต่ไม่แนบภาพ บอทจะแทกผู้เล่นคนนั้นพร้อมส่งฟอร์มการแจ้งที่ถูกต้อง
4. เมื่อแพทย์เห็นเคสบนเว็บแดชบอร์ด กดปุ่ม **"ช่วยเหลือสำเร็จแล้ว"** บอทจะเข้าไปกด React ✅ บนโพสต์แจ้งเหตุในดิสคอร์ดอัตโนมัติ
