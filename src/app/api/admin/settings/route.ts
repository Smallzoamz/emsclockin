import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*");

    if (error) {
      if (error.code === '42P01') {
         // Table doesn't exist yet, return defaults
         return NextResponse.json({ settings: { bonus_threshold: 20 } });
      }
      throw error;
    }

    const settings: Record<string, any> = {};
    if (data) {
      data.forEach(item => {
        settings[item.key] = item.value;
      });
    }

    // Return all settings, while ensuring defaults
    return NextResponse.json({ 
      settings: {
        ...settings,
        bonus_threshold: settings['bonus_threshold'] ? Number(settings['bonus_threshold']) : 20
      } 
    });
  } catch (error) {
    console.error("[Settings GET] Error:", error);
    return NextResponse.json({ settings: { bonus_threshold: 20 } });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Settings POST] Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
