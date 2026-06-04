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

async function runMock() {
  const action = process.argv[2] || "insert";
  
  if (action === "insert") {
    console.log("Inserting mock emergency call...");
    const { data, error } = await supabase
      .from("emergency_calls")
      .insert([
        {
          phone: "089-765-4321",
          image_url: "https://ngkikazmllpvrxorezrw.supabase.co/storage/v1/object/public/proofs/mock_emergency.png",
          discord_message_id: "123456789012345678",
          discord_user_id: "956866340474478642",
          status: "pending"
        }
      ])
      .select();

    if (error) {
      console.error("Insert failed:", error);
    } else {
      console.log("Mock call inserted successfully:", data);
      console.log("\nTo resolve this mock call via script, run: node mock-emergency.js resolve <id>");
      console.log("To clear all mock calls, run: node mock-emergency.js clear");
    }
  } else if (action === "resolve") {
    const id = process.argv[3];
    if (!id) {
      console.error("Please provide the ID to resolve");
      process.exit(1);
    }
    console.log(`Resolving call ${id}...`);
    const { data, error } = await supabase
      .from("emergency_calls")
      .update({ status: "resolved" })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Resolve failed:", error);
    } else {
      console.log("Resolved successfully:", data);
    }
  } else if (action === "clear") {
    console.log("Clearing all emergency calls...");
    const { data, error } = await supabase
      .from("emergency_calls")
      .delete()
      .neq("status", "completed"); // delete anything that is not completed, or delete all

    if (error) {
      console.error("Clear failed:", error);
    } else {
      console.log("Cleared emergency calls successfully.");
    }
  }
}

runMock();
