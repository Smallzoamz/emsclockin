import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// 1. GET: Fetch all active blacklist records
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("blacklist_records")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      // Check if table does not exist
      if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({ records: [], dbWarning: true });
      }
      throw error;
    }

    return NextResponse.json({ records: data || [] });
  } catch (error: any) {
    console.error("[Blacklist GET] Error:", error);
    return NextResponse.json({ records: [], error: error.message || "Failed to load records" }, { status: 500 });
  }
}

// 2. POST: Create or update a blacklist record
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, phone, gang, penalty, fine, multiplier } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const email = session.user.email || session.user.name || "Unknown Doctor";
    const recordData = {
      name,
      phone: phone || "",
      gang: gang || "",
      penalty: penalty || "",
      fine: Number(fine) || 0,
      multiplier: Number(multiplier) || 1,
      created_by: email
    };

    let data, error;
    if (id) {
      // Update existing record
      const res = await supabase
        .from("blacklist_records")
        .update(recordData)
        .eq("id", id)
        .select();
      data = res.data;
      error = res.error;
    } else {
      // Insert new active record
      const res = await supabase
        .from("blacklist_records")
        .insert({ ...recordData, status: "active" })
        .select();
      data = res.data;
      error = res.error;
    }

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ error: "กรุณาแจ้งแอดมินติดตั้งสคริปต์ตาราง blacklist_records ในฐานข้อมูลก่อนค่ะ" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, record: data?.[0] });
  } catch (error: any) {
    console.error("[Blacklist POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save record" }, { status: 500 });
  }
}

// 3. PUT: Release a blacklist record
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const email = session.user.email || session.user.name || "Unknown Doctor";

    const { data, error } = await supabase
      .from("blacklist_records")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        released_by: email
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, record: data?.[0] });
  } catch (error: any) {
    console.error("[Blacklist PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to release record" }, { status: 500 });
  }
}
