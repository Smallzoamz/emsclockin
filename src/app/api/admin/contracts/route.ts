import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// GET: Fetch all contracts (Admin only)
export async function GET() {
  const session = await auth();
  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("medical_contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ contracts: data || [] });
  } catch (err: any) {
    console.error("[Admin Contracts GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load contracts" }, { status: 500 });
  }
}

// POST: Create and send a new contract (Admin only)
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as Record<string, any>;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { doctorEmail, title, content } = body;

    if (!doctorEmail || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch registered doctors to find matching email
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "registered_doctors")
      .single();

    const registeredDoctors = (settingsRow?.value || []) as Array<{
      email?: string;
      name?: string;
      discordUsername?: string;
      avatarUrl?: string;
      discordId?: string;
    }>;

    const targetDoc = registeredDoctors.find(doc => doc.email?.toLowerCase() === doctorEmail.toLowerCase());
    if (!targetDoc) {
      return NextResponse.json({ error: "ไม่พบข้อมูลแพทย์คนนี้ในระบบ" }, { status: 404 });
    }

    const doctorName = targetDoc.name || targetDoc.discordUsername || "Unknown";
    const doctorDiscordId = targetDoc.discordId || "Unknown";
    const doctorDiscordUsername = targetDoc.discordUsername || "Unknown";

    // 2. Insert new medical contract
    const adminName = user.email || user.name || "Admin";
    const { data: contract, error: contractError } = await supabase
      .from("medical_contracts")
      .insert({
        doctor_email: doctorEmail,
        doctor_name: doctorName,
        doctor_discord_id: doctorDiscordId,
        doctor_discord_username: doctorDiscordUsername,
        title,
        content,
        status: "pending",
        created_by: adminName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (contractError) throw contractError;

    // 3. Create inbox notification for the doctor
    const { error: inboxError } = await supabase
      .from("user_inbox")
      .insert({
        user_email: doctorEmail,
        sender_name: "ระบบหลังบ้าน / ฝ่ายบริหาร",
        title: `📄 สัญญาฉบับใหม่: ${title}`,
        content: `คุณได้รับเอกสารสัญญาการทำงานฉบับใหม่จากฝ่ายบริหาร \nโปรดกดยอมรับสัญญาเพื่อทำการเซ็นยินยอมและดาวน์โหลดเอกสารเก็บไว้เป็นลายลักษณ์อักษรค่ะ`,
        type: "contract",
        is_read: false,
        contract_id: contract.id,
        created_at: new Date().toISOString()
      });

    if (inboxError) throw inboxError;

    return NextResponse.json({ success: true, contract });
  } catch (err: any) {
    console.error("[Admin Contracts POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create contract" }, { status: 500 });
  }
}
