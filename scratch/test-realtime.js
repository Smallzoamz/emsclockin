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

console.log("Subscribing to leave_requests changes...");

const channel = supabase
  .channel("test_leave_changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "leave_requests"
    },
    (payload) => {
      console.log("Received payload:");
      console.log("Event:", payload.eventType);
      console.log("Old:", payload.old);
      console.log("New:", payload.new);
    }
  )
  .subscribe((status) => {
    console.log("Subscription status:", status);
    if (status === "SUBSCRIBED") {
      console.log("Ready! Now update a row in leave_requests via Next.js dashboard to test.");
    }
  });

// Keep process alive
setInterval(() => {}, 1000);
