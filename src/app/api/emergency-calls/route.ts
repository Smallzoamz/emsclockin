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
      .from("emergency_calls")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }); // Newest first

    if (error) {
      console.error("Failed to fetch emergency calls:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, calls: data || [] });
  } catch (err: any) {
    console.error("Fetch emergency calls error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, image_url, discord_message_id, discord_user_id, secret } = body;

    // Check shared API key secret for security
    const apiKey = process.env.EMERGENCY_API_KEY || "ems_emergency_secret_key_2026";
    if (secret !== apiKey) {
      return NextResponse.json({ error: "Forbidden: Invalid secret key" }, { status: 403 });
    }

    if (!phone || !image_url || !discord_message_id) {
      return NextResponse.json({ error: "Missing required fields (phone, image_url, discord_message_id)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("emergency_calls")
      .insert([
        {
          phone,
          image_url,
          discord_message_id,
          discord_user_id: discord_user_id || null,
          status: "pending"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to insert emergency call:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("POST emergency call error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
