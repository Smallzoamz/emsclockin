import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as Record<string, any>;
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }); // Newest first

    if (error) {
      console.error("Failed to fetch complaints:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, complaints: data || [] });
  } catch (err: any) {
    console.error("Fetch complaints error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, phone, image_url, discord_message_id, discord_user_id, discord_username, discord_nickname, discord_thread_id, secret } = body;

    // Check shared API key secret for security
    const apiKey = process.env.EMERGENCY_API_KEY || "ems_emergency_secret_key_2026";
    if (secret !== apiKey) {
      return NextResponse.json({ error: "Forbidden: Invalid secret key" }, { status: 403 });
    }

    if (!content || !discord_message_id) {
      return NextResponse.json({ error: "Missing required fields (content, discord_message_id)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("complaints")
      .insert([
        {
          content,
          phone: phone || null,
          image_url: image_url || null,
          discord_message_id,
          discord_user_id: discord_user_id || null,
          discord_username: discord_username || null,
          discord_nickname: discord_nickname || null,
          discord_thread_id: discord_thread_id || null,
          status: "pending"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to insert complaint:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("POST complaint error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
