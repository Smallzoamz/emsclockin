import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as Record<string, any>;
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { status, signatureName } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (status !== "accepted" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // 1. Fetch contract to verify ownership
    const { data: contract, error: fetchError } = await supabase
      .from("medical_contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: "ไม่พบเอกสารสัญญาที่ระบุ" }, { status: 404 });
    }

    if (contract.status !== "pending") {
      return NextResponse.json({ error: "สัญญานี้ได้รับการดำเนินการไปแล้ว" }, { status: 400 });
    }

    // Verify user ownership (by email or discordId)
    const isOwner = 
      contract.doctor_email?.toLowerCase() === user.email.toLowerCase() ||
      (contract.doctor_discord_id && contract.doctor_discord_id === user.discordId);

    if (!isOwner) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ในการเข้าถึงสัญญานี้" }, { status: 403 });
    }

    if (status === "accepted" && (!signatureName || signatureName.trim() === "")) {
      return NextResponse.json({ error: "กรุณาระบุชื่อ-นามสกุลจริงเพื่อลงนามสัญญา" }, { status: 400 });
    }

    // 2. Update contract status
    const { data: updatedContract, error: updateError } = await supabase
      .from("medical_contracts")
      .update({
        status,
        signature_name: status === "accepted" ? signatureName.trim() : null,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Mark the corresponding inbox message as read
    await supabase
      .from("user_inbox")
      .update({ is_read: true })
      .eq("contract_id", id)
      .eq("user_email", user.email);

    return NextResponse.json({ success: true, contract: updatedContract });
  } catch (err: any) {
    console.error("[Contract respond PATCH] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to respond to contract" }, { status: 500 });
  }
}
