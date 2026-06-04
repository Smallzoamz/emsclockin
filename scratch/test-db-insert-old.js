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

async function testInsert() {
  console.log("Attempting to insert test complaint without discord_thread_id...");
  const { data, error } = await supabase
    .from("complaints")
    .insert([
      {
        content: "Test complaint content from local script without thread ID",
        phone: "123456789",
        discord_message_id: "TEST_MSG_ID_LOCAL",
        discord_user_id: "test_user_id_local",
        discord_username: "test_user_local",
        discord_nickname: "Test Local Nickname",
        status: "pending"
      }
    ])
    .select();
  
  if (error) {
    console.error("Error inserting:", error.message);
  } else {
    console.log("Success! Inserted row:", data);
    
    // Now let's delete it so we don't leave trash in the DB
    const { error: delError } = await supabase
      .from("complaints")
      .delete()
      .eq("id", data[0].id);
    if (delError) {
      console.error("Error deleting test row:", delError.message);
    } else {
      console.log("Successfully cleaned up test row.");
    }
  }
}

testInsert();
