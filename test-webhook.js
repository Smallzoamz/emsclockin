require('dotenv').config({ path: '.env.local' });
const url = process.env.DISCORD_WEBHOOK_URL + '?wait=true';

const payload = {
  username: "EMS Clock-in Bot",
  embeds: [
    {
      title: "Test Clock In",
      color: 0x10b981
    }
  ]
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
