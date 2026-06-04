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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function getSchema() {
  console.log("Fetching OpenAPI schema from Supabase with service role...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    const complaintsDef = data.definitions && data.definitions.complaints;
    if (complaintsDef) {
      console.log("Complaints definition in schema:", JSON.stringify(complaintsDef, null, 2));
    } else {
      console.log("Could not find complaints definition in OpenAPI schema.");
      console.log("Available definitions:", Object.keys(data.definitions || {}));
    }
  } catch (err) {
    console.error("Failed to fetch schema:", err);
  }
}

getSchema();
