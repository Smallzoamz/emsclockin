const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Parse .env.local manually
const envPath = path.join(__dirname, "../.env.local");
let supabaseUrl = "https://ngkikazmllpvrxorezrw.supabase.co";
let supabaseKey = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove quotes if present
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      
      if (key === "NEXT_PUBLIC_SUPABASE_URL") {
        supabaseUrl = val;
      } else if (key === "SUPABASE_SERVICE_ROLE_KEY") {
        supabaseKey = val;
      }
    }
  }
}

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    console.log("Checking emergency_calls table...");
    const { data, error } = await supabase
      .from("emergency_calls")
      .select("*")
      .limit(1);

    if (error) {
      console.log("Table check failed. Error:", error);
    } else {
      console.log("Table exists! Rows found:", data.length);
    }
  } catch (err) {
    console.error("Test error:", err);
  }
}

test();
