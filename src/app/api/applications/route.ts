import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch applications (public count or admin full list)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";

    if (isPublic) {
      // Public: return count of pending applications only
      const { count, error } = await supabase
        .from("doctor_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return NextResponse.json({ count: 0, dbWarning: true });
        }
        throw error;
      }

      return NextResponse.json({ count: count || 0 });
    }

    // Admin: require auth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-expire: update pending applications past their expiry
    await supabase
      .from("doctor_applications")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    // Fetch all applications
    const { data, error } = await supabase
      .from("doctor_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ applications: [], dbWarning: true });
      }
      throw error;
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error: any) {
    console.error("[Applications GET] Error:", error);
    return NextResponse.json({ applications: [], error: error.message || "Failed to load applications" }, { status: 500 });
  }
}

// POST: Submit a new doctor application (public, no auth)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { discord_uid, ic_firstname, ic_lastname, age, age_type, previous_experience, reason_to_join } = body;

    // Validate required fields
    if (!discord_uid || !ic_firstname || !ic_lastname || !age || !reason_to_join) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    // Check for existing pending application
    const { data: existing, error: checkError } = await supabase
      .from("doctor_applications")
      .select("id")
      .eq("discord_uid", discord_uid)
      .eq("status", "pending")
      .maybeSingle();

    if (checkError) {
      if (checkError.code === "42P01" || checkError.message?.includes("does not exist")) {
        return NextResponse.json({ error: "กรุณาแจ้งแอดมินติดตั้งตาราง doctor_applications ในฐานข้อมูลก่อนค่ะ" }, { status: 400 });
      }
      throw checkError;
    }

    if (existing) {
      return NextResponse.json({ error: "คุณมีใบสมัครที่รอดำเนินการอยู่แล้ว" }, { status: 409 });
    }

    // Calculate next queue number
    const { data: maxRow } = await supabase
      .from("doctor_applications")
      .select("queue_number")
      .eq("status", "pending")
      .order("queue_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextQueue = (maxRow?.queue_number || 0) + 1;

    // Set expires_at to 48 hours from now
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Insert the application
    const { data: inserted, error: insertError } = await supabase
      .from("doctor_applications")
      .insert({
        discord_uid,
        ic_firstname,
        ic_lastname,
        age,
        age_type: age_type || "IC",
        previous_experience: previous_experience || null,
        reason_to_join,
        status: "pending",
        queue_number: nextQueue,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get total pending count
    const { count: pendingCount } = await supabase
      .from("doctor_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      success: true,
      application: inserted,
      pendingCount: pendingCount || 0,
      queuePosition: nextQueue
    });
  } catch (error: any) {
    console.error("[Applications POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
