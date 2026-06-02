import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch all inbox messages/exams for the currently logged in doctor
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;

  try {
    const { data, error } = await supabase
      .from("user_inbox")
      .select(`
        *,
        exam_attempts (
          status,
          score,
          started_at,
          submitted_at
        )
      `)
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
        // Safe fallback if database tables aren't created yet
        return NextResponse.json({ messages: [], dbWarning: true });
      }
      throw error;
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    console.error("[Inbox GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inbox messages" },
      { status: 500 }
    );
  }
}

// PATCH: Mark a message as read
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, isRead } = body;

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_inbox")
      .update({ is_read: isRead !== undefined ? isRead : true })
      .eq("id", id)
      .eq("user_email", session.user.email)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data });
  } catch (error: any) {
    console.error("[Inbox PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update inbox message" },
      { status: 500 }
    );
  }
}
