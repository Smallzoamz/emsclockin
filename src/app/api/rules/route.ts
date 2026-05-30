import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

const defaultRules = {
  title: "กฏของโรงพยาบาล",
  categories: [
    {
      id: "hospital_area",
      name: "กฏในพื้นที่โรงพยาบาล",
      coverUrl: "/images/rules/hospital_area.png",
      rules: [
        { id: "ha_1", content: "ห้ามพกพาอาวุธร้ายแรงทุกชนิดเข้ามาในพื้นที่โรงพยาบาลเด็ดขาด (ฝ่าฝืนปรับ 50,000 IC / แจ้งความดำเนินคดี)" },
        { id: "ha_2", content: "ห้ามทำร้ายร่างกายแพทย์ พยาบาล หรือคนไข้ท่านอื่นในบริเวณโรงพยาบาล (หากฝ่าฝืนปรับและติด Blacklist ทันที)" },
        { id: "ha_3", content: "ห้ามส่งเสียงดัง โวยวาย หรือป่วนพื้นที่รักษา เพื่อความสงบเรียบร้อยในการกู้ชีพ" },
        { id: "ha_4", content: "ห้ามจอดรถขวางทางเข้า-ออกของรถฉุกเฉิน" }
      ]
    },
    {
      id: "doctor_duty",
      name: "กฏการปฏิบัติหน้าที่ของแพทย์",
      coverUrl: "/images/rules/doctor_duty.png",
      rules: [
        { id: "dd_1", content: "ต้องแต่งกายด้วยเครื่องแบบแพทย์ให้เรียบร้อยทุกครั้งขณะปฏิบัติหน้าที่" },
        { id: "dd_2", content: "เมื่อเข้าเวรแล้ว ให้รับเคสตามลำดับคิวอย่างเป็นธรรมและเต็มความสามารถ" },
        { id: "dd_3", content: "การขออนุมัติเบิกจ่ายอุปกรณ์ทางการแพทย์ต้องทำอย่างโปร่งใสตามความจำเป็นจริง" },
        { id: "dd_4", content: "ห้ามทิ้งคนไข้ในขณะที่กำลังรักษา ยกเว้นมีเหตุฉุกเฉินร้ายแรงที่ต้องช่วยเหลือชีวิตเร่งด่วนกว่า" }
      ]
    },
    {
      id: "case_story",
      name: "กฏช่วยเหลือเคสสตอรี่",
      coverUrl: "/images/rules/case_story.png",
      rules: [
        { id: "cs_1", content: "การรักษาเคสสตอรี่ให้เป็นไปตามลำดับคิวของระบบ OP เท่านั้น ห้ามลัดคิว" },
        { id: "cs_2", content: "ห้ามเปิดเผยข้อมูลคนไข้สตอรี่ให้กับบุคคลภายนอกเด็ดขาดเพื่อความปลอดภัย" },
        { id: "cs_3", content: "ทุกไฟท์ที่มีการสตอรี่ แพทย์ต้องดูแลความสงบเรียบร้อยและบันทึกผลคะแนนตามความจริง" },
        { id: "cs_4", content: "หากมีเคสฟาสต์ (Fast Case) ให้ทำการแยกและจัดการชุบตามกติกาของโรงพยาบาลอย่างเคร่งครัด" }
      ]
    },
    {
      id: "blacklist",
      name: "Blacklist",
      coverUrl: "/images/rules/blacklist.png",
      rules: [
        { id: "bl_1", content: "บุคคลที่มีพฤติกรรมทำร้ายร่างกายเจ้าหน้าที่ขณะปฏิบัติงาน (ระยะเวลาแบล็คลิสต์ 7 วัน / ค่าปรับ 100,000 IC)" },
        { id: "bl_2", content: "บุคคลที่ขโมยรถพยาบาลหรือทรัพย์สินของโรงพยาบาล (ระยะเวลาแบล็คลิสต์ 3 วัน / ค่าปรับ 50,000 IC)" },
        { id: "bl_3", content: "กลุ่มหรือแก๊งที่ก่อความวุ่นวายซ้ำซากในพื้นที่เขตปลอดอาวุธ" },
        { id: "bl_4", content: "ผู้มีหนี้ค้างชำระค่ารักษาพยาบาลสะสม" }
      ]
    },
    {
      id: "medical_fees",
      name: "ค่ารักษาพยาบาล",
      coverUrl: "/images/rules/medical_fees.png",
      rules: [
        { id: "mf_1", content: "เคสตรวจรักษาโรคทั่วไป / บาดเจ็บเล็กน้อย: 1,000 IC" },
        { id: "mf_2", content: "เคสฉุกเฉิน / ชุบชีวิตนอกสถานที่: 3,000 IC" },
        { id: "mf_3", content: "เคสสตอรี่ปะทะ / นับไฟท์ปะทะ: 5,000 IC (จ่ายตรงโดยหัวหน้ากลุ่ม)" },
        { id: "mf_4", content: "ค่าธรรมเนียมอุปกรณ์เสริมการรักษา: ตามอัตราที่คณะผู้ดูแลประกาศ" }
      ]
    }
  ]
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "doctor_rules")
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.code === "42P01") {
        // No row found or table doesn't exist, return default values
        return NextResponse.json({ rules: defaultRules });
      }
      throw error;
    }

    if (data?.value) {
      const rules = data.value;
      let hasUpdates = false;
      if (Array.isArray(rules.categories)) {
        rules.categories = rules.categories.map((cat: any) => {
          const defaultCat = defaultRules.categories.find((dc) => dc.id === cat.id);
          if (defaultCat && !cat.coverUrl) {
            cat.coverUrl = defaultCat.coverUrl;
            hasUpdates = true;
          }
          return cat;
        });
      }

      if (hasUpdates) {
        // Heal config permanently in Supabase
        await supabase
          .from("system_settings")
          .upsert({
            key: "doctor_rules",
            value: rules,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });
      }

      return NextResponse.json({ rules });
    }

    return NextResponse.json({ rules: defaultRules });
  } catch (error) {
    console.error("[Rules GET] Error:", error);
    return NextResponse.json({ rules: defaultRules });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as Record<string, unknown>;

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { rules } = body;

    if (!rules || typeof rules !== "object" || !Array.isArray(rules.categories)) {
      return NextResponse.json({ error: "Invalid rules format" }, { status: 400 });
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert(
        {
          key: "doctor_rules",
          value: rules,
          updated_at: new Date().toISOString()
        },
        { onConflict: "key" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, message: "บันทึกกฏระเบียบเรียบร้อยแล้วค่ะ" });
  } catch (error) {
    console.error("[Rules POST] Error:", error);
    return NextResponse.json({ error: "Failed to update rules" }, { status: 500 });
  }
}
