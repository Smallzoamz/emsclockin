import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Restrict logo configuration to Master Admin (identified by having no discordId)
  if (user.discordId) {
    return NextResponse.json(
      { error: "เฉพาะบัญชีผู้ดูแลระบบหลัก (Master Admin) เท่านั้นที่สามารถตั้งค่าโลโก้ระบบได้ค่ะ" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const logoFile = formData.get("logo") as File | null;

    if (!logoFile) {
      return NextResponse.json(
        { error: "กรุณาแนบไฟล์รูปภาพโลโก้เมือง" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage in "proofs" bucket
    const fileExt = logoFile.name.split('.').pop() || 'png';
    const fileName = `theme/logo-${Date.now()}.${fileExt}`;
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("proofs")
      .upload(fileName, buffer, {
        contentType: logoFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("[Logo Upload Error]", uploadError);
      return NextResponse.json(
        { error: "อัปโหลดรูปภาพไม่สำเร็จ (ตรวจสอบว่าสร้าง bucket proofs แล้วหรือยัง)" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("proofs")
      .getPublicUrl(fileName);
      
    const logoUrl = publicUrlData.publicUrl;

    // Persist path setting in system_settings
    const { error: dbError } = await supabase
      .from("system_settings")
      .upsert({
        key: "theme_logo_url",
        value: logoUrl,
        updated_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      logoUrl,
      message: "อัปโหลดโลโก้เมืองเรียบร้อยแล้วค่ะ"
    });
  } catch (error) {
    console.error("[Logo Upload API] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการอัปโหลดรูปภาพ" },
      { status: 500 }
    );
  }
}
