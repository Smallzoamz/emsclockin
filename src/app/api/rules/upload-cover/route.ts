import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const coverFile = formData.get("cover") as File | null;
    const deleteCover = formData.get("deleteCover") === "true";
    const catId = formData.get("catId") as string | null;

    // 1. Fetch current rules config
    let rulesData: any = null;
    const { data: currentDbData, error: getError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "doctor_rules")
      .single();

    if (getError && getError.code !== "PGRST116" && getError.code !== "42P01") {
      throw getError;
    }
    
    rulesData = currentDbData?.value || {
      title: "กฏของโรงพยาบาล",
      categories: []
    };

    // 2. Handle cover removal
    if (deleteCover) {
      if (catId) {
        const cat = rulesData.categories.find((c: any) => c.id === catId);
        if (cat) {
          cat.coverUrl = "";
        }
      } else {
        rulesData.coverUrl = "";
      }
      
      const { error: dbError } = await supabase
        .from("system_settings")
        .upsert({
          key: "doctor_rules",
          value: rulesData,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (dbError) throw dbError;

      return NextResponse.json({
        success: true,
        coverUrl: "",
        message: catId ? "ลบรูปภาพปกหมวดหมู่เรียบร้อยแล้วค่ะ" : "ลบรูปภาพปกเรียบร้อยแล้วค่ะ"
      });
    }

    // 3. Handle cover upload
    if (!coverFile) {
      return NextResponse.json(
        { error: "กรุณาแนบไฟล์รูปภาพปก" },
        { status: 400 }
      );
    }

    const fileExt = coverFile.name.split('.').pop() || 'jpg';
    const fileName = `theme/rules-cover-${Date.now()}.${fileExt}`;
    const arrayBuffer = await coverFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("proofs")
      .upload(fileName, buffer, {
        contentType: coverFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("[Cover Upload Error]", uploadError);
      return NextResponse.json(
        { error: "อัปโหลดรูปภาพไม่สำเร็จ (ไม่สามารถบันทึกไฟล์ได้)" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("proofs")
      .getPublicUrl(fileName);
      
    const coverUrl = publicUrlData.publicUrl;

    // 4. Update the JSON rules value
    if (catId) {
      const cat = rulesData.categories.find((c: any) => c.id === catId);
      if (cat) {
        cat.coverUrl = coverUrl;
      } else {
        return NextResponse.json({ error: "ไม่พบหมวดหมู่ย่อยที่ระบุในระบบ" }, { status: 404 });
      }
    } else {
      rulesData.coverUrl = coverUrl;
    }

    const { error: dbError } = await supabase
      .from("system_settings")
      .upsert({
        key: "doctor_rules",
        value: rulesData,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      coverUrl,
      message: catId ? "อัปโหลดรูปภาพปกหมวดหมู่เรียบร้อยแล้วค่ะ" : "อัปโหลดรูปภาพปกเรียบร้อยแล้วค่ะ"
    });
  } catch (error) {
    console.error("[Cover Upload API] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพปก" },
      { status: 500 }
    );
  }
}
