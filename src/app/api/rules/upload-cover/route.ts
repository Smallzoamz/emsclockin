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
    const isMap = formData.get("isMap") === "true";
    const mapType = formData.get("mapType") as string | null;

    // Custom Marker parameters
    const isMarker = formData.get("isMarker") === "true";
    const markerName = formData.get("markerName") as string | null;
    const deleteMarker = formData.get("deleteMarker") === "true";
    const markerId = formData.get("markerId") as string | null;

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

    // Handle Custom Marker Deletion
    if (isMarker && deleteMarker) {
      if (!markerId) {
        return NextResponse.json({ error: "กรุณาระบุมาร์คเกอร์ ID ที่ต้องการลบ" }, { status: 400 });
      }
      
      const cat = rulesData.categories.find((c: any) => c.id === "medical_fees");
      if (cat) {
        if (cat.custom_markers) {
          cat.custom_markers = cat.custom_markers.filter((m: any) => m.id !== markerId);
        }
        // Cleanup zone_markers association if any zone used this deleted marker
        if (cat.zone_markers) {
          for (const zone in cat.zone_markers) {
            if (cat.zone_markers[zone] === markerId) {
              delete cat.zone_markers[zone];
            }
          }
        }
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
        rules: rulesData,
        message: "ลบสัญลักษณ์มาร์คเกอร์เรียบร้อยแล้วค่ะ"
      });
    }

    // Handle Custom Marker Upload
    if (isMarker) {
      if (!coverFile) {
        return NextResponse.json({ error: "กรุณาแนบไฟล์รูปภาพมาร์คเกอร์" }, { status: 400 });
      }
      
      const fileExt = coverFile.name.split('.').pop() || 'png';
      const fileName = `theme/rules-marker-${Date.now()}.${fileExt}`;
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
        console.error("[Marker Upload Error]", uploadError);
        return NextResponse.json(
          { error: "อัปโหลดรูปภาพมาร์คเกอร์ไม่สำเร็จ (ไม่สามารถบันทึกไฟล์ได้)" },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("proofs")
        .getPublicUrl(fileName);
        
      const markerUrl = publicUrlData.publicUrl;

      const cat = rulesData.categories.find((c: any) => c.id === "medical_fees");
      if (cat) {
        if (!cat.custom_markers) {
          cat.custom_markers = [];
        }
        const newMarkerId = `marker_${Date.now()}`;
        cat.custom_markers.push({
          id: newMarkerId,
          name: markerName || "หมุดที่อัปโหลด",
          url: markerUrl
        });
      } else {
        return NextResponse.json({ error: "ไม่พบหมวดหมู่ย่อยระบบค่ารักษาพยาบาล" }, { status: 404 });
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
        rules: rulesData,
        coverUrl: markerUrl,
        message: "อัปโหลดรูปภาพมาร์คเกอร์เรียบร้อยแล้วค่ะ"
      });
    }

    // 2. Handle cover removal
    if (deleteCover) {
      if (catId) {
        const cat = rulesData.categories.find((c: any) => c.id === catId);
        if (cat) {
          if (isMap) {
            if (mapType === "central") {
              cat.mapCentralUrl = "";
            } else if (mapType === "desert") {
              cat.mapDesertUrl = "";
            } else {
              cat.mapUrl = "";
            }
          } else {
            cat.coverUrl = "";
          }
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
        message: isMap ? "ลบรูปแผนที่เรียบร้อยแล้วค่ะ" : (catId ? "ลบรูปภาพปกหมวดหมู่เรียบร้อยแล้วค่ะ" : "ลบรูปภาพปกเรียบร้อยแล้วค่ะ")
      });
    }

    // 3. Handle cover upload
    if (!coverFile) {
      return NextResponse.json(
        { error: isMap ? "กรุณาแนบไฟล์รูปภาพแผนที่" : "กรุณาแนบไฟล์รูปภาพปก" },
        { status: 400 }
      );
    }

    const fileExt = coverFile.name.split('.').pop() || 'jpg';
    const fileName = isMap ? `theme/rules-map-${Date.now()}.${fileExt}` : `theme/rules-cover-${Date.now()}.${fileExt}`;
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
        if (isMap) {
          if (mapType === "central") {
            cat.mapCentralUrl = coverUrl;
          } else if (mapType === "desert") {
            cat.mapDesertUrl = coverUrl;
          } else {
            cat.mapUrl = coverUrl;
          }
        } else {
          cat.coverUrl = coverUrl;
        }
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
      message: isMap ? "อัปโหลดรูปแผนที่เรียบร้อยแล้วค่ะ" : (catId ? "อัปโหลดรูปภาพปกหมวดหมู่เรียบร้อยแล้วค่ะ" : "อัปโหลดรูปภาพปกเรียบร้อยแล้วค่ะ")
    });
  } catch (error) {
    console.error("[Cover Upload API] Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพปก" },
      { status: 500 }
    );
  }
}
