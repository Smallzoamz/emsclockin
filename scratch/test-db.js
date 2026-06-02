const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");

let url = "";
let key = "";

envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join("=").trim();
    if (k === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (k === "SUPABASE_SERVICE_ROLE_KEY") key = v;
  }
});

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function test() {
  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Query Error:", error);
    } else {
      console.log("Success! Query returned rows count:", data.length);
      console.log("First row details:", data[0]);
    }
  } catch (err) {
    console.error("Unexpected Error:", err);
  }
}

test();
