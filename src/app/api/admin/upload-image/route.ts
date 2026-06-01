import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  // Restrict upload to Master Admin (credentials-based admin, i.e., no discordId)
  if (!user || user.role !== "admin" || user.discordId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "กรุณาแนบไฟล์รูปภาพ" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage in "proofs" bucket
    const fileExt = imageFile.name.split('.').pop() || 'png';
    const fileName = `landing/img-${Date.now()}.${fileExt}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("proofs")
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("[Landing Image Upload Error]", uploadError);
      return NextResponse.json(
        { error: "อัปโหลดรูปภาพไม่สำเร็จ (ตรวจสอบว่าสร้าง bucket proofs แล้วหรือยัง)" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("proofs")
      .getPublicUrl(fileName);
      
    const imageUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "อัปโหลดรูปภาพสำเร็จแล้วค่ะ"
    });
  } catch (error) {
    console.error("[Landing Image Upload API] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการอัปโหลดรูปภาพ" },
      { status: 500 }
    );
  }
}
