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

async function trigger() {
  console.log("Triggering UPDATE on leave_requests...");
  
  // Fetch current row status
  const { data: row } = await supabase
    .from("leave_requests")
    .select("status")
    .eq("id", "3154119e-8c66-46e9-aeda-f4c174548626")
    .single();
    
  const newStatus = row.status === "approved" ? "pending" : "approved";
  console.log(`Current status: ${row.status}. Updating to: ${newStatus}`);

  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", "3154119e-8c66-46e9-aeda-f4c174548626")
    .select();
    
  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update successful!", data[0].status);
  }
}

trigger();
