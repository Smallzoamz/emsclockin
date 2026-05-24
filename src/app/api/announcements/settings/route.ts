import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

const defaultCategories = [
  { id: "cat_blacklist", name: "Blacklist", description: "แจ้งแบล็คลิสต์บุคคล" },
  { id: "cat_notfound", name: "หาเคสไม่เจอ", description: "แจ้งหาเคสประวัติไม่เจอในระบบ" },
  { id: "cat_general", name: "ประกาศทั่วไป", description: "ประกาศข้อมูลข่าวสารทั่วไป" }
];

const defaultTemplates = [
  {
    id: "tpl_blacklist",
    categoryId: "cat_blacklist",
    title: "ประกาศติด Blacklist",
    content: "**[ประกาศ Blacklist บุคคล]**\nชื่อ-นามสกุล: [ชื่อคน]\nเบอร์โทรศัพท์: [เบอร์โทร]\nชื่อกลุ่ม/แก๊ง: [ชื่อแก๊ง]\nความผิด: [โทษ]\nค่าปรับ: [ค่าปรับ] (จำนวนซ้ำ x[ตัวคูณ])\nสถานะ: ห้ามรักษา / ห้ามชุบชีวิต"
  },
  {
    id: "tpl_notfound",
    categoryId: "cat_notfound",
    title: "แจ้งหาเคสประวัติไม่พบ",
    content: "**[หาเคสไม่เจอ]**\nชื่อคนไข้: [ชื่อคน]\nเบอร์โทรศัพท์: [เบอร์โทร]\nสังกัด/แก๊ง: [ชื่อแก๊ง]\nรายละเอียด: แพทย์หาเคสไม่เจอในประวัติการรักษา กรุณาติดต่อแพทย์ด่วนที่สุด"
  },
  {
    id: "tpl_general",
    categoryId: "cat_general",
    title: "แจ้งประกาศทั่วไป",
    content: "**[ประกาศโรงพยาบาล]**\nรายละเอียด: [รายละเอียด]"
  }
];

const defaultPenalties = [
  { id: "pen_1", name: "ทำร้ายร่างกายเจ้าหน้าที่", fine: 50000 },
  { id: "pen_2", name: "ป่วนบริเวณโรงพยาบาล", fine: 20000 },
  { id: "pen_3", name: "ขโมยรถพยาบาล/ยานพาหนะ", fine: 100000 },
  { id: "pen_4", name: "พกพาอาวุธร้ายแรงในรพ.", fine: 30000 }
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "announcement_categories",
        "announcement_templates",
        "blacklist_penalties",
        "announcement_command_prefix",
        "discord_announcement_webhook_url"
      ]);

    if (error) throw error;

    const settingsMap = (data || []).reduce((acc: Record<string, any>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const categories = settingsMap["announcement_categories"] || defaultCategories;
    const templates = settingsMap["announcement_templates"] || defaultTemplates;
    const penalties = settingsMap["blacklist_penalties"] || defaultPenalties;
    const commandPrefix = settingsMap["announcement_command_prefix"] || "/ems";
    const announcementWebhookUrl = settingsMap["discord_announcement_webhook_url"] || "";

    return NextResponse.json({
      categories,
      templates,
      penalties,
      commandPrefix,
      announcementWebhookUrl
    });
  } catch (error) {
    console.error("[Announcements GET] Error:", error);
    return NextResponse.json({
      categories: defaultCategories,
      templates: defaultTemplates,
      penalties: defaultPenalties,
      commandPrefix: "/ems",
      announcementWebhookUrl: ""
    });
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
    const { key, value } = body;

    const allowedKeys = [
      "announcement_categories",
      "announcement_templates",
      "blacklist_penalties",
      "announcement_command_prefix",
      "discord_announcement_webhook_url"
    ];
    if (!key || !allowedKeys.includes(key) || value === undefined) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { error } = await supabase
      .from("system_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Announcements POST] Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
