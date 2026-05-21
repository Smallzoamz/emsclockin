const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data: settings } = await supabase.from('system_settings').select('*');
  console.log("=== SYSTEM SETTINGS ===");
  settings.forEach(s => {
    if (s.key === 'op_queue_state' || s.key === 'registered_doctors') {
      console.log(`${s.key}:`, JSON.stringify(s.value, null, 2));
    }
  });

  const { data: shifts } = await supabase.from('shifts').select('*').eq('status', 'active');
  console.log("=== ACTIVE SHIFTS ===");
  console.log(JSON.stringify(shifts, null, 2));
}

run().catch(console.error);
