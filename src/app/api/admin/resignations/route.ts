import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch all resignation requests
export async function GET() {
  const session = await auth();

  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("resignation_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ resignations: data || [] });
  } catch (err: any) {
    console.error("[Resignations API GET] Error:", err);
    return NextResponse.json({ error: "Failed to load resignation requests" }, { status: 500 });
  }
}

// PATCH: Update resignation request status
export async function PATCH(request: Request) {
  const session = await auth();

  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status !== "approved" && status !== "rejected" && status !== "pending" && status !== "acknowledged") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const adminName = user.email || user.name || "Admin";

    const { data, error } = await supabase
      .from("resignation_requests")
      .update({
        status,
        approved_by: status === "pending" ? null : adminName,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, resignation: data });
  } catch (err: any) {
    console.error("[Resignations API PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update resignation request status" }, { status: 500 });
  }
}
