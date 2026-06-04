import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASEUrl or KEY in env configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking complaints table...");
  const { data, error } = await supabase
    .from("complaints")
    .select("*");
  
  if (error) {
    console.error("Error selecting from complaints:", error.message);
  } else {
    console.log("Success! Found complaints rows:", data);
  }
}

test();
