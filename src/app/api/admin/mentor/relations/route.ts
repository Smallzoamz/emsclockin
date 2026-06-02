import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data: relations, error } = await supabase
      .from("mentorship_relations")
      .select("*")
      .order("started_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ relations: [] });
      }
      throw error;
    }

    return NextResponse.json({ relations });
  } catch (error: any) {
    console.error("[Mentor Relations GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch relations" }, { status: 500 });
  }
}
