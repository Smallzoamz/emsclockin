"use client";

import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  SettingsIcon,
  PaletteIcon,
  TrashIcon,
  UploadIcon,
  SunIcon,
  LayoutIcon,
  MegaphoneIcon,
  UsersIcon,
  LockIcon,
  PlusIcon,
  SaveIcon
} from "@/components/Icons";

interface AdminOverviewEntry {
  email: string;
  name: string;
  discordUsername: string;
  totalHours: number;
  status: "active" | "completed";
  lastClockIn: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Webhook Configuration State
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [discordOpWebhookUrl, setDiscordOpWebhookUrl] = useState("");
  const [discordApplicationWebhookUrl, setDiscordApplicationWebhookUrl] = useState("");
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);

  // Discord Bot and Guild State
  const [discordBotToken, setDiscordBotToken] = useState("");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [isSavingBotConfig, setIsSavingBotConfig] = useState(false);
  const [botConfigStatus, setBotConfigStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);

  // Admin Management State
  const [adminCredentials, setAdminCredentials] = useState<Array<{ username: string, name: string, password?: string }>>([]);
  const [adminDiscord, setAdminDiscord] = useState<Array<{ email?: string, username?: string, name: string }>>([]);
  
  // New Admin Form State
  const [newCredUsername, setNewCredUsername] = useState("");
  const [newCredPassword, setNewCredPassword] = useState("");
  const [newCredName, setNewCredName] = useState("");
  
  const [newDiscordEmail, setNewDiscordEmail] = useState("");
  const [newDiscordUsername, setNewDiscordUsername] = useState("");
  const [newDiscordName, setNewDiscordName] = useState("");
  const [discordAddMode, setDiscordAddMode] = useState<"email" | "username">("email");

  // Branding & Theme State
  const [themeAccentColor, setThemeAccentColor] = useState("#10b981");
  const [themeLogoUrl, setThemeLogoUrl] = useState("");
  const [themeBgOpacity, setThemeBgOpacity] = useState(5); // 1-40%
  const [themeBgStyle, setThemeBgStyle] = useState<"contain" | "cover">("contain");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [themeStatus, setThemeStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);

  // Server Sync Integration State
  const [serverSyncEnabled, setServerSyncEnabled] = useState(false);
  const [serverSyncApiKey, setServerSyncApiKey] = useState("");
  const [isSavingServerSync, setIsSavingServerSync] = useState(false);
  const [serverSyncStatus, setServerSyncStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);

  // Landing Page Management State
  const [landingSlides, setLandingSlides] = useState<Array<{ image: string; tag: string; title: string; description: string }>>([]);
  const [landingNews, setLandingNews] = useState<Array<{ tag: string; tagColor: string; title: string; date: string; views: number; image: string; desc: string; content?: string }>>([]);

  const [isSavingLanding, setIsSavingLanding] = useState(false);
  const [landingStatus, setLandingStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);
  const [activeLandingTab, setActiveLandingTab] = useState<"slides" | "news" | "recruitment_slides">("slides");
  
  // Slide Upload state (to track which slide image is uploading)
  const [isUploadingSlideIndex, setIsUploadingSlideIndex] = useState<number | null>(null);
  // News Upload state (to track which news image is uploading)
  const [isUploadingNewsIndex, setIsUploadingNewsIndex] = useState<number | null>(null);

  // Recruitment slides state
  const [landingRecruitmentSlides, setLandingRecruitmentSlides] = useState<Array<{ image: string }>>([]);
  const [isUploadingRecruitmentSlideIndex, setIsUploadingRecruitmentSlideIndex] = useState<number | null>(null);

  // Resignation System State
  const [resignationCriteriaHours, setResignationCriteriaHours] = useState(40);
  const [resignationDocTemplate, setResignationDocTemplate] = useState("");
  const [resignationDmTemplate, setResignationDmTemplate] = useState("");
  const [resignationCooldownText, setResignationCooldownText] = useState("7 วัน");
  const [isSavingResignationSettings, setIsSavingResignationSettings] = useState(false);
  const [resignationSettingsStatus, setResignationSettingsStatus] = useState<{ message: string, type: "success" | "error" } | null>(null);

  const moveSlide = (index: number, direction: "up" | "down") => {
    const updated = [...landingSlides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    setLandingSlides(updated);
  };

  const addSlide = () => {
    setLandingSlides([
      ...landingSlides,
      {
        image: "/images/ems_hero_bg.png",
        tag: "NEW SLIDE",
        title: "ประกาศใหม่จากโรงพยาบาล",
        description: "รายละเอียดการประกาศกู้ชีพฉุกเฉินประจำวัน"
      }
    ]);
  };

  const addNews = () => {
    setLandingNews([
      ...landingNews,
      {
        tag: "ประกาศ",
        tagColor: "#3b82f6",
        title: "ประกาศใหม่",
        date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }),
        views: 0,
        image: "/images/rules/doctor_duty.png",
        desc: "รายละเอียดคำอธิบายของข่าวสารประกาศใหม่",
        content: "รายละเอียดเนื้อหาประกาศฉบับเต็ม..."
      }
    ]);
  };



  const deleteSlide = async (index: number) => {
    if (!await confirm({
      title: "🗑️ ลบรูปภาพสไลด์แบนเนอร์",
      message: `ยืนยันว่าต้องการลบสไลด์แบนเนอร์ลำดับที่ ${index + 1} หรือไม่?`,
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;

    const updated = landingSlides.filter((_, idx) => idx !== index);
    setLandingSlides(updated);
  };

  const deleteNews = async (index: number) => {
    if (!await confirm({
      title: "🗑️ ลบประกาศข่าวสาร",
      message: `ยืนยันว่าต้องการลบประกาศข่าวสาร "${landingNews[index].title || "ไม่มีชื่อ"}" หรือไม่?`,
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;

    const updated = landingNews.filter((_, idx) => idx !== index);
    setLandingNews(updated);
  };



  const moveRecruitmentSlide = (index: number, direction: "up" | "down") => {
    const updated = [...landingRecruitmentSlides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    setLandingRecruitmentSlides(updated);
  };

  const addRecruitmentSlide = () => {
    setLandingRecruitmentSlides([
      ...landingRecruitmentSlides,
      { image: "/images/leave_banner.jpg" }
    ]);
  };

  const deleteRecruitmentSlide = async (index: number) => {
    if (!await confirm({
      title: "🗑️ ลบรูปภาพสไลด์รับสมัคร",
      message: `ยืนยันว่าต้องการลบสไลด์รับสมัครลำดับที่ ${index + 1} หรือไม่?`,
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;

    const updated = landingRecruitmentSlides.filter((_, idx) => idx !== index);
    setLandingRecruitmentSlides(updated);
  };

  const handleRecruitmentSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !isMasterAdmin) return;

    setIsUploadingRecruitmentSlideIndex(index);
    setLandingStatus(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [...landingRecruitmentSlides];
        updated[index].image = data.imageUrl;
        setLandingRecruitmentSlides(updated);
        setLandingStatus({ message: `อัปโหลดรูปภาพสไลด์รับสมัครที่ ${index + 1} เรียบร้อยแล้วค่ะ`, type: "success" });
      } else {
        setLandingStatus({ message: data.error || "อัปโหลดรูปภาพไม่สำเร็จ", type: "error" });
      }
    } catch {
      setLandingStatus({ message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", type: "error" });
    } finally {
      setIsUploadingRecruitmentSlideIndex(null);
      setTimeout(() => setLandingStatus(null), 4000);
    }
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !isMasterAdmin) return;

    setIsUploadingSlideIndex(index);
    setLandingStatus(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [...landingSlides];
        updated[index].image = data.imageUrl;
        setLandingSlides(updated);
        setLandingStatus({ message: `อัปโหลดรูปภาพสไลด์ที่ ${index + 1} เรียบร้อยแล้วค่ะ`, type: "success" });
      } else {
        setLandingStatus({ message: data.error || "อัปโหลดรูปภาพไม่สำเร็จ", type: "error" });
      }
    } catch {
      setLandingStatus({ message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", type: "error" });
    } finally {
      setIsUploadingSlideIndex(null);
      setTimeout(() => setLandingStatus(null), 4000);
    }
  };

  const handleNewsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !isMasterAdmin) return;

    setIsUploadingNewsIndex(index);
    setLandingStatus(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [...landingNews];
        updated[index].image = data.imageUrl;
        setLandingNews(updated);
        setLandingStatus({ message: `อัปโหลดรูปภาพข่าวสารที่ ${index + 1} เรียบร้อยแล้วค่ะ`, type: "success" });
      } else {
        setLandingStatus({ message: data.error || "อัปโหลดรูปภาพไม่สำเร็จ", type: "error" });
      }
    } catch {
      setLandingStatus({ message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", type: "error" });
    } finally {
      setIsUploadingLogo(false);
      setTimeout(() => setThemeStatus(null), 4000);
    }
  };

  const handleSaveResignationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingResignationSettings(true);
    setResignationSettingsStatus(null);

    try {
      const res1 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "resignation_criteria_hours", value: resignationCriteriaHours }),
      });
      const res2 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "resignation_doc_template", value: resignationDocTemplate }),
      });
      const res3 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "resignation_dm_template", value: resignationDmTemplate }),
      });
      const res4 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "resignation_cooldown_text", value: resignationCooldownText }),
      });

      if (res1.ok && res2.ok && res3.ok && res4.ok) {
        setResignationSettingsStatus({ message: "บันทึกการตั้งค่าระบบลาออกเรียบร้อยแล้วค่ะ", type: "success" });
        router.refresh();
      } else {
        const d1 = await res1.json();
        const d2 = await res2.json();
        const d3 = await res3.json();
        const d4 = await res4.json();
        setResignationSettingsStatus({ message: d1.error || d2.error || d3.error || d4.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setResignationSettingsStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingResignationSettings(false);
      setTimeout(() => setResignationSettingsStatus(null), 4000);
    }
  };

  const handleSaveLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingLanding(true);
    setLandingStatus(null);

    const payload = {
      slides: landingSlides,
      news: landingNews,
      forum: [],
      recruitment_slides: landingRecruitmentSlides
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "landing_page_data", value: payload }),
      });

      if (res.ok) {
        setLandingStatus({ message: "บันทึกการจัดการเนื้อหาหน้าแรกเรียบร้อยแล้วค่ะ", type: "success" });
        router.refresh();
      } else {
        const data = await res.json();
        setLandingStatus({ message: data.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setLandingStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingLanding(false);
      setTimeout(() => setLandingStatus(null), 4000);
    }
  };

  useEffect(() => {
    document.title = "ตั้งค่าระบบ | EMS Clock-in";
    // Get Session and determine Master Admin
    getSession().then((session) => {
      const user = session?.user as { role?: string; discordId?: string } | null | undefined;
      if (user && user.role === "admin" && !user.discordId) {
        setIsMasterAdmin(true);
        setLoadingAuth(false);
      } else {
        // Redirection for unauthorized users
        router.replace("/dashboard");
      }
    });

    // Fetch Settings
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings?.admin_credentials_accounts) {
          setAdminCredentials(data.settings.admin_credentials_accounts);
        }
        if (data.settings?.admin_discord_accounts) {
          setAdminDiscord(data.settings.admin_discord_accounts);
        }
        if (data.settings?.discord_webhook_url) {
          setDiscordWebhookUrl(data.settings.discord_webhook_url);
        }
        if (data.settings?.discord_op_webhook_url) {
          setDiscordOpWebhookUrl(data.settings.discord_op_webhook_url);
        }
        if (data.settings?.discord_application_webhook_url) {
          setDiscordApplicationWebhookUrl(data.settings.discord_application_webhook_url);
        }
        if (data.settings?.discord_bot_token) {
          setDiscordBotToken(data.settings.discord_bot_token);
        }
        if (data.settings?.discord_guild_id) {
          setDiscordGuildId(data.settings.discord_guild_id);
        }
        if (data.settings?.theme_accent_color) {
          setThemeAccentColor(data.settings.theme_accent_color);
        }
        if (data.settings?.theme_logo_url) {
          setThemeLogoUrl(data.settings.theme_logo_url);
        }
        if (data.settings?.theme_bg_opacity !== undefined) {
          // Database stores decimal, convert to percentage e.g. 0.05 -> 5
          setThemeBgOpacity(Math.round(Number(data.settings.theme_bg_opacity) * 100));
        }
        if (data.settings?.theme_bg_style) {
          setThemeBgStyle(data.settings.theme_bg_style);
        }
        if (data.settings?.server_sync_enabled !== undefined) {
          setServerSyncEnabled(data.settings.server_sync_enabled);
        }
        if (data.settings?.server_sync_api_key) {
          setServerSyncApiKey(data.settings.server_sync_api_key);
        }
        if (data.settings?.resignation_criteria_hours !== undefined) {
          setResignationCriteriaHours(Number(data.settings.resignation_criteria_hours));
        }
        if (data.settings?.resignation_doc_template) {
          setResignationDocTemplate(data.settings.resignation_doc_template);
        }
        if (data.settings?.resignation_dm_template) {
          setResignationDmTemplate(data.settings.resignation_dm_template);
        }
        if (data.settings?.resignation_cooldown_text) {
          setResignationCooldownText(data.settings.resignation_cooldown_text);
        }
        if (data.settings?.landing_page_data) {
          const lpd = typeof data.settings.landing_page_data === 'string'
            ? JSON.parse(data.settings.landing_page_data)
            : data.settings.landing_page_data;
          if (lpd.slides) setLandingSlides(lpd.slides);
          if (lpd.news) setLandingNews(lpd.news);

          if (lpd.recruitment_slides) {
            setLandingRecruitmentSlides(lpd.recruitment_slides);
          } else {
            setLandingRecruitmentSlides([
              { image: "/images/leave_banner.jpg" },
              { image: "/images/welcome_banner.jpg" }
            ]);
          }
        } else {
          setLandingSlides([
            {
              image: "/images/ems_hero_bg.png",
              tag: "FiveM EMS Service",
              title: "เราพร้อมดูแล และช่วยเหลือประชาชนในทุกสถานการณ์",
              description: "เพราะชีวิต...คือหน้าที่ของเรา"
            },
            {
              image: "/images/rules/hospital_area.png",
              tag: "PILLBOX HILL MEDICAL CENTER",
              title: "ศูนย์ปฏิบัติการรักษาพยาบาลหลักประจำเมือง",
              description: "พร้อมให้บริการตรวจรักษาและกู้ภัยฉุกเฉินตลอด 24 ชั่วโมง"
            },
            {
              image: "/images/rules/doctor_duty.png",
              tag: "EMS TRAINING CENTER",
              title: "หลักสูตรฝึกกู้ชีพและวินัยพื้นฐานแพทย์กู้ภัย",
              description: "อบรมขั้นตอนช่วยเหลือเบื้องต้นและการสวมบทบาททางการแพทย์"
            }
          ]);
          setLandingNews([
            {
              tag: "ประกาศสำคัญ",
              tagColor: "#3b82f6",
              title: "ประกาศปรับปรุงระบบการเข้าเวร",
              date: "23 พ.ค. 2026",
              views: 125,
              image: "/images/rules/doctor_duty.png",
              desc: "แจ้งปรับปรุงระบบการเข้า-ออกเวร แพทย์ทุกท่านกรุณาอ่านรายละเอียดในระบบ"
            },
            {
              tag: "อัปเดต",
              tagColor: "#10b981",
              title: "อัปเดตแพทย์ 1.2.0",
              date: "22 พ.ค. 2026",
              views: 210,
              image: "/images/rules/hospital_area.png",
              desc: "เพิ่มระบบการรักษาและอุปกรณ์ทางการแพทย์ใหม่สำหรับแพทย์ออนเวร"
            },
            {
              tag: "กิจกรรม",
              tagColor: "#eab308",
              title: "กิจกรรมอบรม CPR ประจำเดือน",
              date: "21 พ.ค. 2026",
              views: 98,
              image: "/images/rules/case_story.png",
              desc: "ขอเชิญแพทย์และผู้สนใจเข้าร่วมอบรมการทำ CPR ปฐมพยาบาลเบื้องต้น"
            }
          ]);

          setLandingRecruitmentSlides([
            { image: "/images/leave_banner.jpg" },
            { image: "/images/welcome_banner.jpg" }
          ]);
        }
      })
      .catch(err => console.error("Failed to load settings:", err));
  }, [router]);

  const handleSaveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingWebhooks(true);
    setWebhookStatus(null);

    try {
      // Save general webhook
      const res1 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_webhook_url", value: discordWebhookUrl }),
      });
      // Save OP webhook
      const res2 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_op_webhook_url", value: discordOpWebhookUrl }),
      });
      // Save Application webhook
      const res3 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_application_webhook_url", value: discordApplicationWebhookUrl }),
      });

      if (res1.ok && res2.ok && res3.ok) {
        setWebhookStatus({ message: "บันทึกข้อมูล Discord Webhook เรียบร้อยแล้วค่ะ", type: "success" });
      } else {
        const d1 = await res1.json();
        const d2 = await res2.json();
        const d3 = await res3.json();
        setWebhookStatus({ message: d1.error || d2.error || d3.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setWebhookStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingWebhooks(false);
      setTimeout(() => setWebhookStatus(null), 4000);
    }
  };

  const handleSaveBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingBotConfig(true);
    setBotConfigStatus(null);

    try {
      // Save Bot Token
      const res1 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_bot_token", value: discordBotToken }),
      });
      // Save Guild ID
      const res2 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_guild_id", value: discordGuildId }),
      });

      if (res1.ok && res2.ok) {
        setBotConfigStatus({ message: "บันทึกข้อมูล Discord Bot & Guild ID เรียบร้อยแล้วค่ะ", type: "success" });
      } else {
        const d1 = await res1.json();
        const d2 = await res2.json();
        setBotConfigStatus({ message: d1.error || d2.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setBotConfigStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingBotConfig(false);
      setTimeout(() => setBotConfigStatus(null), 4000);
    }
  };

  const handleSaveServerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingServerSync(true);
    setServerSyncStatus(null);

    try {
      // Save enabled toggle
      const res1 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "server_sync_enabled", value: serverSyncEnabled }),
      });
      // Save API key
      const res2 = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "server_sync_api_key", value: serverSyncApiKey }),
      });

      if (res1.ok && res2.ok) {
        setServerSyncStatus({ message: "บันทึกการตั้งค่า Server Sync เรียบร้อยแล้วค่ะ", type: "success" });
      } else {
        const d1 = await res1.json();
        const d2 = await res2.json();
        setServerSyncStatus({ message: d1.error || d2.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setServerSyncStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingServerSync(false);
      setTimeout(() => setServerSyncStatus(null), 4000);
    }
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "ems_sync_";
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setServerSyncApiKey(result);
  };

  const handleAddCredAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;

    if (!newCredUsername || !newCredPassword || !newCredName) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนค่ะ");
      return;
    }

    if (newCredUsername.toLowerCase() === "admin") {
      alert("ไม่สามารถใช้ชื่อผู้ใช้ 'admin' ได้เนื่องจากเป็นบัญชีมาสเตอร์ของระบบค่ะ");
      return;
    }

    if (adminCredentials.some(acc => acc.username.toLowerCase() === newCredUsername.toLowerCase())) {
      alert("มีชื่อผู้ใช้นี้ในระบบแล้วค่ะ");
      return;
    }

    const updated = [...adminCredentials, { username: newCredUsername, password: newCredPassword, name: newCredName }];
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_credentials_accounts", value: updated })
      });
      if (res.ok) {
        setAdminCredentials(updated);
        setNewCredUsername("");
        setNewCredPassword("");
        setNewCredName("");
        alert("เพิ่มบัญชีผู้ดูแลระบบสำเร็จแล้วค่ะ");
      } else {
        alert("ไม่สามารถเพิ่มบัญชีผู้ดูแลระบบได้");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleAddDiscordAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;

    if (discordAddMode === "email" && !newDiscordEmail) {
      alert("กรุณากรอกอีเมล Discord ค่ะ");
      return;
    }
    if (discordAddMode === "username" && !newDiscordUsername) {
      alert("กรุณากรอกชื่อผู้ใช้ Discord ค่ะ");
      return;
    }
    if (!newDiscordName) {
      alert("กรุณากรอกชื่อแสดงค่ะ");
      return;
    }

    const newAdmin: { name: string; email?: string; username?: string } = { name: newDiscordName };
    if (discordAddMode === "email") {
      newAdmin.email = newDiscordEmail;
      if (newDiscordEmail.toLowerCase() === "lneeobee@gmail.com") {
        alert("ไม่จำเป็นต้องเพิ่มอีเมลนี้เนื่องจากได้รับสิทธิ์นักพัฒนาของระบบแล้วค่ะ");
        return;
      }
      if (adminDiscord.some(acc => acc.email?.toLowerCase() === newDiscordEmail.toLowerCase())) {
        alert("มีอีเมลนี้ในระบบแล้วค่ะ");
        return;
      }
    } else {
      newAdmin.username = newDiscordUsername;
      if (adminDiscord.some(acc => acc.username?.toLowerCase() === newDiscordUsername.toLowerCase())) {
        alert("มีชื่อผู้ใช้นี้ในระบบแล้วค่ะ");
        return;
      }
    }

    const updated = [...adminDiscord, newAdmin];
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_discord_accounts", value: updated })
      });
      if (res.ok) {
        setAdminDiscord(updated);
        setNewDiscordEmail("");
        setNewDiscordUsername("");
        setNewDiscordName("");
        alert("เพิ่มสิทธิ์แอดมิน Discord สำเร็จแล้วค่ะ");
      } else {
        alert("ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDeleteCredAdmin = async (username: string) => {
    if (!isMasterAdmin) return;
    if (!await confirm({
      title: "🗑️ ลบบัญชีผู้ดูแล",
      message: `ยืนยันต้องการลบบัญชีผู้ดูแล "${username}" หรือไม่?`,
      confirmText: "ลบบัญชี",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;

    const updated = adminCredentials.filter(acc => acc.username !== username);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_credentials_accounts", value: updated })
      });
      if (res.ok) {
        setAdminCredentials(updated);
        alert("ลบบัญชีแอดมินสำเร็จ");
      }
    } catch {
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleDeleteDiscordAdmin = async (adminObj: { email?: string; username?: string; name?: string }) => {
    if (!isMasterAdmin) return;
    const displayName = adminObj.email ? adminObj.email : `@${adminObj.username}`;
    if (!await confirm({
      title: "🗑️ ถอนสิทธิ์ผู้ดูแล Discord",
      message: `ยืนยันต้องการถอนสิทธิ์แอดมินของ "${displayName}" หรือไม่?`,
      confirmText: "ถอนสิทธิ์",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;
    
    const updated = adminDiscord.filter(acc => 
      !(acc.email === adminObj.email && acc.username === adminObj.username)
    );
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_discord_accounts", value: updated })
      });
      if (res.ok) {
        setAdminDiscord(updated);
        alert("ลบสิทธิ์แอดมิน Discord สำเร็จ");
      }
    } catch {
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) return;
    setIsSavingTheme(true);
    setThemeStatus(null);

    try {
      // Save accent color
      const resColor = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_accent_color", value: themeAccentColor }),
      });

      // Save opacity (stored as decimal in database: e.g. 15% -> 0.15)
      const opacityDecimal = themeBgOpacity / 100;
      const resOpacity = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_bg_opacity", value: opacityDecimal }),
      });

      // Save background style
      const resStyle = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_bg_style", value: themeBgStyle }),
      });

      if (resColor.ok && resOpacity.ok && resStyle.ok) {
        setThemeStatus({ message: "บันทึกการตั้งค่าธีมและโลโก้เมืองเรียบร้อยแล้วค่ะ", type: "success" });
        router.refresh();
      } else {
        const d1 = await resColor.json();
        const d2 = await resOpacity.json();
        const d3 = await resStyle.json();
        setThemeStatus({ message: d1.error || d2.error || d3.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setThemeStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsSavingTheme(false);
      setTimeout(() => setThemeStatus(null), 4000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isMasterAdmin) return;

    setIsUploadingLogo(true);
    setThemeStatus(null);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch("/api/admin/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setThemeLogoUrl(data.logoUrl);
        setThemeStatus({ message: "อัปโหลดโลโก้เมืองเรียบร้อยแล้วค่ะ", type: "success" });
        router.refresh();
      } else {
        setThemeStatus({ message: data.error || "อัปโหลดรูปภาพไม่สำเร็จ", type: "error" });
      }
    } catch {
      setThemeStatus({ message: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์", type: "error" });
    } finally {
      setIsUploadingLogo(false);
      setTimeout(() => setThemeStatus(null), 4000);
    }
  };

  const handleRemoveLogo = async () => {
    if (!isMasterAdmin) return;
    if (!await confirm({
      title: "🖼️ ลบโลโก้เมือง",
      message: "ยืนยันว่าต้องการลบโลโก้เมืองและกลับไปใช้โลโก้เริ่มต้นของระบบหรือไม่?",
      confirmText: "ลบโลโก้",
      cancelText: "ยกเลิก",
      variant: "warning"
    })) return;

    setIsUploadingLogo(true);
    setThemeStatus(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme_logo_url", value: "" }),
      });

      if (res.ok) {
        setThemeLogoUrl("");
        setThemeStatus({ message: "ลบโลโก้เมืองและคืนค่าเริ่มต้นเรียบร้อยแล้วค่ะ", type: "success" });
        router.refresh();
      } else {
        const data = await res.json();
        setThemeStatus({ message: data.error || "เกิดข้อผิดพลาดในการลบโลโก้", type: "error" });
      }
    } catch {
      setThemeStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
    } finally {
      setIsUploadingLogo(false);
      setTimeout(() => setThemeStatus(null), 4000);
    }
  };

  if (loadingAuth) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text-secondary)" }}>
        กำลังยืนยันสิทธิ์ Master Admin...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingsIcon size={24} style={{ color: "var(--accent)" }} />
            ตั้งค่าระบบผู้ดูแลหลัก
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>จัดการสิทธิ์แอดมินของเว็บไซต์และตั้งค่าการเชื่อมต่อ Discord Webhook</p>
        </div>
      </div>

      {/* Branding & Theme Customization */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <PaletteIcon size={20} style={{ color: "var(--accent)" }} />
            ตั้งค่าธีมและโลโก้เมือง (Branding & Theme Settings)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            ปรับแต่งโทนสีหลักของเว็บไซต์ และอัปโหลดภาพโลโก้เมืองเพื่อแสดงเป็นภาพพื้นหลังและบนส่วนหัวของเมนูข้าง
          </p>
        </div>

        <form onSubmit={handleSaveTheme} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
            
            {/* Left Side: Accent Color & Background Properties */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Accent Color Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <PaletteIcon size={16} />
                  สีหลักของระบบ (Accent Color)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  {/* Preset Colors */}
                  {[
                    { hex: "#10b981", name: "Emerald Green" },
                    { hex: "#3b82f6", name: "Sky Blue" },
                    { hex: "#ef4444", name: "Crimson Red" },
                    { hex: "#8b5cf6", name: "Amethyst Purple" },
                    { hex: "#f59e0b", name: "Sunset Gold" },
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setThemeAccentColor(color.hex)}
                      title={color.name}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: color.hex,
                        border: themeAccentColor.toLowerCase() === color.hex.toLowerCase() ? "3px solid white" : "1px solid rgba(255,255,255,0.2)",
                        boxShadow: themeAccentColor.toLowerCase() === color.hex.toLowerCase() ? `0 0 10px ${color.hex}` : "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        position: "relative"
                      }}
                    >
                      {themeAccentColor.toLowerCase() === color.hex.toLowerCase() && (
                        <span style={{ color: "white", fontSize: "12px", fontWeight: "bold", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>✓</span>
                      )}
                    </button>
                  ))}
                  
                  {/* Custom Picker Container */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ระบุเอง:</span>
                    <input
                      type="color"
                      value={themeAccentColor}
                      onChange={(e) => setThemeAccentColor(e.target.value)}
                      style={{
                        width: "36px",
                        height: "32px",
                        border: "1px solid var(--border)",
                        background: "none",
                        cursor: "pointer",
                        borderRadius: "4px",
                        padding: 0
                      }}
                    />
                    <input
                      type="text"
                      maxLength={7}
                      value={themeAccentColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith("#") && val.length <= 7) {
                          setThemeAccentColor(val);
                        } else if (!val.startsWith("#") && val.length <= 6) {
                          setThemeAccentColor("#" + val);
                        }
                      }}
                      style={{
                        width: "80px",
                        padding: "6px 10px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Opacity Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <SunIcon size={16} />
                    ความโปร่งใสโลโก้พื้นหลัง (Background Opacity)
                  </label>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--accent)" }}>
                    {themeBgOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={themeBgOpacity}
                  onChange={(e) => setThemeBgOpacity(Number(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor: "var(--accent)",
                    background: "var(--bg-secondary)",
                    height: "6px",
                    borderRadius: "3px",
                    outline: "none",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ระดับความจางของโลโก้พื้นหลังไม่ให้บดบังเนื้อหา (แนะนำ: 3% - 15%)
                </span>
              </div>

              {/* Background Style Toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <LayoutIcon size={16} />
                  รูปแบบการจัดวางพื้นหลัง (Background Style)
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setThemeBgStyle("contain")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: themeBgStyle === "contain" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-secondary)",
                      border: `1px solid ${themeBgStyle === "contain" ? "var(--accent)" : "var(--border)"}`,
                      color: themeBgStyle === "contain" ? "var(--accent-light)" : "var(--text-secondary)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      transition: "all 0.2s"
                    }}
                  >
                    📦 Centered Watermark
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeBgStyle("cover")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: themeBgStyle === "cover" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--bg-secondary)",
                      border: `1px solid ${themeBgStyle === "cover" ? "var(--accent)" : "var(--border)"}`,
                      color: themeBgStyle === "cover" ? "var(--accent-light)" : "var(--text-secondary)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "0.85rem",
                      transition: "all 0.2s"
                    }}
                  >
                    🖼️ Full Cover (เต็มจอ)
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Logo Upload & Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                  🏙️ โลโก้เมือง (City Logo Image)
                </label>
                
                {/* Upload / Preview Card */}
                <div style={{
                  flex: 1,
                  minHeight: "180px",
                  background: "var(--bg-secondary)",
                  border: "2px dashed var(--border)",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  position: "relative",
                  gap: "12px",
                  overflow: "hidden"
                }}>
                  {themeLogoUrl ? (
                    <>
                      {/* Logo Preview */}
                      <img
                        src={themeLogoUrl}
                        alt="Uploaded Logo Preview"
                        style={{
                          maxHeight: "120px",
                          maxWidth: "100%",
                          objectFit: "contain",
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid var(--danger)",
                          color: "var(--danger)",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        🗑️ ลบโลโก้เมือง
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <PaletteIcon size={36} style={{ color: "var(--text-muted)" }} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "500" }}>
                          ยังไม่มีโลโก้เมืองผู้จัดตั้ง
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          รูปภาพจะแสดงในหน้าล็อกอิน เมนูด้านข้าง และเป็นภาพลายน้ำพื้นหลัง
                        </p>
                      </div>
                    </>
                  )}
                  
                  {/* File Input */}
                  <div style={{ marginTop: "8px", width: "100%", display: "flex", justifyContent: "center" }}>
                    <label style={{
                      padding: "8px 16px",
                      background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                      border: "1px solid var(--border-glow)",
                      color: "var(--accent-light)",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s",
                      opacity: isUploadingLogo ? 0.6 : 1
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        style={{ display: "none" }}
                      />
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <UploadIcon size={14} />
                        {isUploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้ใหม่"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Status Alert */}
          {themeStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: themeStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${themeStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: themeStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {themeStatus.message}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSavingTheme}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingTheme ? 0.7 : 1,
              transition: "all 0.2s"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingTheme ? "กำลังบันทึก..." : "บันทึกการตั้งค่าธีม"}
            </span>
          </button>
        </form>
      </section>

      {/* Webhook Configuration */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <MegaphoneIcon size={20} style={{ color: "var(--accent)" }} />
            ตั้งค่า Discord Webhook (Webhook Settings)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            ตั้งค่า URL สำหรับส่ง log การ เข้า-ออกเวร และรายงานกลุ่มแพทย์เวร (OP) ไปยัง Discord Channel
          </p>
        </div>

        <form onSubmit={handleSaveWebhooks} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
            
            {/* Input 1: General Webhook */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🔗 Webhook แจ้งเตือนทั่วไป (General Log Webhook)
              </label>
              <input 
                type="url" 
                placeholder="https://discord.com/api/webhooks/..." 
                value={discordWebhookUrl}
                onChange={e => setDiscordWebhookUrl(e.target.value.trim())}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ใช้ส่งข้อมูลบันทึกเข้างาน-ออกงานของแพทย์ทั่วไป และประกาศโบนัสประจำสัปดาห์
              </span>
            </div>

            {/* Input 2: OP Webhook */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🔗 Webhook คิวหมอเวร OP (OP Queue Webhook)
              </label>
              <input 
                type="url" 
                placeholder="https://discord.com/api/webhooks/..." 
                value={discordOpWebhookUrl}
                onChange={e => setDiscordOpWebhookUrl(e.target.value.trim())}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ใช้รายงานคิวแพทย์เวร (OP) และสถานะคิวเคสแบบอัปเดตเรียลไทม์ (ถ้าปล่อยว่างไว้จะใช้ร่วมกับตัวแจ้งเตือนทั่วไปด้านซ้าย)
              </span>
            </div>

            {/* Input 3: Applications Webhook */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🔗 Webhook ใบสมัครและเรียกสอบ (Recruitment Webhook)
              </label>
              <input 
                type="url" 
                placeholder="https://discord.com/api/webhooks/..." 
                value={discordApplicationWebhookUrl}
                onChange={e => setDiscordApplicationWebhookUrl(e.target.value.trim())}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ใช้แจ้งเตือนการส่งใบสมัครใหม่ และใช้เมื่อแอดมินกดเรียกตัวผู้สมัครเพื่อสัมภาษณ์/สอบสอบปฏิบัติ
              </span>
            </div>

          </div>

          {/* Status Message */}
          {webhookStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: webhookStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${webhookStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: webhookStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {webhookStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSavingWebhooks}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingWebhooks ? 0.7 : 1
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingWebhooks ? "กำลังบันทึก..." : "บันทึกการตั้งค่า Webhook"}
            </span>
          </button>
        </form>
      </section>

      {/* Resignation Settings Configuration */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <SettingsIcon size={20} style={{ color: "var(--accent)" }} />
            ตั้งค่าระบบการแจ้งลาออก (Resignation System Settings)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            จัดการเกณฑ์การทำงานสะสมเพื่อไม่ให้ถูกรีตัว ข้อความคูลดาวน์ เทมเพลตใบประกาศพ้นสภาพ และข้อความขอบคุณทาง DM
          </p>
        </div>

        <form onSubmit={handleSaveResignationSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
            
            {/* Input 1: Criteria Hours */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                ⏱️ เกณฑ์ชั่วโมงที่ไม่ถูกรีตัว (ชั่วโมงสะสมขั้นต่ำ)
              </label>
              <input 
                type="number" 
                min="0"
                value={resignationCriteriaHours}
                onChange={e => setResignationCriteriaHours(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ยอดชั่วโมงเข้าเวรรวมที่ต้องผ่านเพื่อไม่ให้โดนรีตัวเมื่อยื่นเรื่องลาออก
              </span>
            </div>

            {/* Input 2: Cooldown text */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                ⏳ ระยะเวลาคูลดาวน์ในการเข้าแก๊ง/ครอบครัว/หน่วยงานอื่น
              </label>
              <input 
                type="text" 
                placeholder="เช่น 7 วัน หรือ 30 วัน" 
                value={resignationCooldownText}
                onChange={e => setResignationCooldownText(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                แสดงข้อมูลระยะคูลดาวน์พ้นสภาพเพื่อแนบในเอกสารและ DM แจ้งเตือนผู้เล่น
              </span>
            </div>

          </div>

          {/* Textarea 1: Doc Template */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
              📄 ข้อความบนเอกสารประกาศพ้นสภาพแพทย์
            </label>
            <textarea
              value={resignationDocTemplate}
              onChange={e => setResignationDocTemplate(e.target.value)}
              rows={5}
              placeholder="ระบุข้อความประกาศ..."
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              * ตัวแปรที่ระบบจะแปลงข้อมูลให้อัตโนมัติ: 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[ชื่อแพทย์]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[Discord]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[เหตุผล]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[ชั่วโมงสะสม]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[เกณฑ์ชั่วโมง]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[สถานะรีตัว]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[วันที่]</code>
            </span>
          </div>

          {/* Textarea 2: DM Template */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
              ✉️ ข้อความที่จะแจ้งไปยัง Discord DM ขอบคุณ
            </label>
            <textarea
              value={resignationDmTemplate}
              onChange={e => setResignationDmTemplate(e.target.value)}
              rows={5}
              placeholder="ระบุข้อความ DM..."
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              * ตัวแปรที่ซัพพอร์ต: 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[ชื่อแพทย์]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[ชั่วโมงสะสม]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[คูลดาวน์]</code>, 
              <code style={{ color: "var(--accent-light)", background: "rgba(0,0,0,0.2)", padding: "2px 4px", margin: "0 2px", borderRadius: "3px" }}>[สถานะรีตัว]</code>
            </span>
          </div>

          {/* Status Message */}
          {resignationSettingsStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: resignationSettingsStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${resignationSettingsStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: resignationSettingsStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {resignationSettingsStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSavingResignationSettings}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingResignationSettings ? 0.7 : 1
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingResignationSettings ? "กำลังบันทึก..." : "บันทึกการตั้งค่าระบบลาออก"}
            </span>
          </button>
        </form>
      </section>

      {/* Discord Bot & Guild Configuration */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <LockIcon size={20} style={{ color: "var(--accent)" }} />
            ตั้งค่าบอทและเซิร์ฟเวอร์ Discord (Discord Bot & Guild Settings)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            กำหนด Token บอทดิสคอร์ด และ Server ID สำหรับใช้ตรวจสอบสิทธิ์การเป็นสมาชิกกลุ่ม (Guild Membership Guard) และใช้ซิงค์ชื่อเล่น (Discord Nicknames)
          </p>
        </div>

        <form onSubmit={handleSaveBotConfig} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
            
            {/* Input 1: Bot Token */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🤖 Discord Bot Token
              </label>
              <input 
                type="password" 
                placeholder="MT..." 
                value={discordBotToken}
                onChange={e => setDiscordBotToken(e.target.value.trim())}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                รหัสโทเค็นของบอทดิสคอร์ดสำหรับดึงข้อมูลสมาชิกและชื่อเล่น (ระบบจะเก็บและแสดงผลแบบปิดบังเพื่อความปลอดภัย)
              </span>
            </div>

            {/* Input 2: Guild ID */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🆔 Discord Server ID (Guild ID)
              </label>
              <input 
                type="text" 
                placeholder="เช่น 1505396570563022988" 
                value={discordGuildId}
                onChange={e => setDiscordGuildId(e.target.value.trim())}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                รหัสไอดีของเซิร์ฟเวอร์ Discord ของหน่วยงาน
              </span>
            </div>

          </div>

          {/* Status Message */}
          {botConfigStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: botConfigStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${botConfigStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: botConfigStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {botConfigStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSavingBotConfig}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingBotConfig ? 0.7 : 1
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingBotConfig ? "กำลังบันทึก..." : "บันทึกการตั้งค่าบอท Discord"}
            </span>
          </button>
        </form>
      </section>

      {/* Server Sync Integration */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <SettingsIcon size={20} style={{ color: "var(--accent)" }} />
            เชื่อมต่อระบบเข้า-ออกเวรอัตโนมัติ (Server Sync Integration)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            เชื่อมโยงการเข้า-ออกเวรในเกม (เช่น FiveM) หรือผ่านบอทดึงข้อมูล Discord Log มายังหน้าเว็บนี้
          </p>
        </div>

        <form onSubmit={handleSaveServerSync} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Toggle Switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-secondary)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
            <div>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--text-primary)", display: "block" }}>
                เปิดใช้งานการเชื่อมต่อจากภายนอก (Enable Server Sync)
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                หากเปิดใช้งาน ระบบจะยอมรับการซิงค์ข้อมูลผ่านช่องทาง API
              </span>
            </div>
            
            {/* Animated Custom Switch */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setServerSyncEnabled(!serverSyncEnabled)}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  background: serverSyncEnabled ? "var(--accent)" : "rgba(255,255,255,0.1)",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: serverSyncEnabled ? "0 0 10px var(--accent-glow)" : "none"
                }}
              >
                <div style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: "3px",
                  left: serverSyncEnabled ? "23px" : "3px",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }} />
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
            {/* API Key */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                🔑 คีย์สำหรับเชื่อมต่อ API (Server Sync API Key)
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder="สุ่มสร้างคีย์เพื่อความปลอดภัย..." 
                  value={serverSyncApiKey}
                  onChange={e => setServerSyncApiKey(e.target.value.trim())}
                  disabled={!serverSyncEnabled}
                  style={{ 
                    flex: 1, 
                    padding: "10px 14px", 
                    background: "var(--bg-secondary)", 
                    border: "1px solid var(--border)", 
                    color: "var(--text-primary)", 
                    borderRadius: "8px", 
                    outline: "none", 
                    fontSize: "0.85rem",
                    opacity: serverSyncEnabled ? 1 : 0.5,
                    fontFamily: "var(--font-mono)"
                  }}
                />
                <button
                  type="button"
                  onClick={generateApiKey}
                  disabled={!serverSyncEnabled}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    borderRadius: "8px",
                    cursor: serverSyncEnabled ? "pointer" : "not-allowed",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    opacity: serverSyncEnabled ? 1 : 0.5,
                    transition: "all 0.2s"
                  }}
                >
                  🎲 สุ่มสร้างคีย์
                </button>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                ใช้สิทธิ Master Admin ในการเข้าถึงข้อมูล กรุณาเก็บเป็นความลับและห้ามเผยแพร่คีย์นี้
              </span>
            </div>

            {/* Integration Details / Manual */}
            {serverSyncEnabled && (
              <div style={{ background: "rgba(0, 0, 0, 0.2)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border-subtle)", fontSize: "0.85rem" }}>
                <h4 style={{ margin: "0 0 8px 0", color: "var(--accent-light)", fontWeight: "bold" }}>
                  💡 วิธีการติดตั้งและส่งข้อมูลจากเซิฟเวอร์ (API Integration Manual)
                </h4>
                <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: "1.4" }}>
                  ให้ส่งคำขอแบบ <strong style={{ color: "var(--text-primary)" }}>POST JSON</strong> ไปยัง Endpoint ลิงก์ระบบดังนี้:
                </p>
                <div style={{ background: "var(--bg-card)", padding: "10px 14px", borderRadius: "6px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-light)", overflowX: "auto", border: "1px solid var(--border)", marginBottom: "12px" }}>
                  POST {typeof window !== "undefined" ? window.location.origin : ""}/api/shifts/server-sync
                </div>
                
                <p style={{ margin: "0 0 6px 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  <strong>รูปแบบของ Payload (JSON Body):</strong>
                </p>
                <pre style={{ margin: 0, padding: "12px", background: "var(--bg-card)", borderRadius: "6px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", overflowX: "auto", border: "1px solid var(--border)" }}>
{`{
  "apiKey": "\${serverSyncApiKey || "ระบุคีย์เชื่อมต่อของบอส"}",
  "discordId": "345389657056302290", // ไอดีดิสคอร์ดของหมอ (แนะนำ)
  "discordUsername": "doctor_name", // หรือชื่อบัญชีดิสคอร์ดของหมอ
  "action": "clock_in" // ส่ง "clock_in" หรือ "clock_out"
}`}
                </pre>
                
                <div style={{ marginTop: "12px", color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span>⚠️ *ระบบจะบันทึกเข้า-ออกงานให้อัตโนมัติทันทีหากตรวจพบรหัสผู้ใช้งานที่ลงทะเบียนไว้</span>
                  <span>⚠️ *การออกงานจากระบบเซิฟเวอร์ จะเป็นการเปลี่ยนสถานะเป็น &quot;รอส่งหลักฐาน&quot; (Pending Proof) เพื่อให้หมอมาแนบรูปสกรีนช็อตที่หน้าเว็บของตนเองก่อน จึงจะสิ้นสุดชั่วโมงเวรสมบูรณ์และส่ง Log เข้าห้องดิสคอร์ดหลัก</span>
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          {serverSyncStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: serverSyncStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid \${serverSyncStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: serverSyncStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {serverSyncStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSavingServerSync}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingServerSync ? 0.7 : 1
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingServerSync ? "กำลังบันทึก..." : "บันทึกการตั้งค่า Server Sync"}
            </span>
          </button>
        </form>
      </section>

      {/* Admin Management */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <UsersIcon size={20} style={{ color: "var(--accent)" }} />
            จัดการสิทธิ์ผู้ดูแลระบบ (Admin Management)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            จัดการบัญชีผู้ดูแลระบบ (ทั้งแบบ Login ด้วย Username และเชื่อมสิทธิ์ Discord Account)
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "32px" }}>
          
          {/* Left Side: Credentials Admin */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, paddingBottom: "8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <LockIcon size={18} style={{ color: "var(--accent)" }} />
                แอดมินล็อกอินด้วย Username
              </span>
            </h3>
            
            {/* List */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "16px", minHeight: "150px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>ชื่อผู้ใช้</span>
                <span>ชื่อแสดง</span>
                <span>การจัดการ</span>
              </div>
              
              {/* Default Master */}
              <div style={{ padding: "10px 12px", background: "var(--bg-card)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "bold" }}>admin</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Master Admin (ระบบหลัก)</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>ลบไม่ได้</span>
              </div>

              {adminCredentials.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>ไม่มีแอดมินเพิ่มเติม</div>
              ) : (
                adminCredentials.map((acc, idx) => (
                  <div key={idx} style={{ padding: "10px 12px", background: "var(--bg-card)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{acc.username}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{acc.name}</span>
                    <button 
                      onClick={() => handleDeleteCredAdmin(acc.username)}
                      style={{ padding: "4px 8px", background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      ลบออก
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Form */}
            <form onSubmit={handleAddCredAdmin} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", border: "1px dashed var(--border)", borderRadius: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusIcon size={16} />
                เพิ่มบัญชีผู้ดูแลระบบ (Credentials)
              </h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder="ชื่อผู้ใช้ (Username)" 
                  value={newCredUsername}
                  onChange={e => setNewCredUsername(e.target.value.replace(/\s+/g, ""))}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
                <input 
                  type="password" 
                  placeholder="รหัสผ่าน (Password)" 
                  value={newCredPassword}
                  onChange={e => setNewCredPassword(e.target.value.trim())}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <input 
                type="text" 
                placeholder="ชื่อแสดง (เช่น หมอสมศักดิ์ แอดมิน)" 
                value={newCredName}
                onChange={e => setNewCredName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                required
              />

              <button type="submit" style={{ padding: "8px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem", marginTop: "4px" }}>
                สร้างบัญชีผู้ดูแลระบบ
              </button>
            </form>
          </div>

          {/* Right Side: Discord Authorization Admin */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, paddingBottom: "8px", borderBottom: "1px solid var(--border-subtle)" }}>
              👾 แอดมินได้รับสิทธิ์ผ่าน Discord
            </h3>
            
            {/* List */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "16px", minHeight: "150px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>สิทธิ์อ้างอิง Discord</span>
                <span>ชื่อแสดง</span>
                <span>การจัดการ</span>
              </div>
              
              {/* Default Dev */}
              <div style={{ padding: "10px 12px", background: "var(--bg-card)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "bold" }}>lneeobee@gmail.com</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Developer (ระบบหลัก)</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>ลบไม่ได้</span>
              </div>

              {adminDiscord.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>ไม่มีแอดมิน Discord เพิ่มเติม</div>
              ) : (
                adminDiscord.map((acc, idx) => (
                  <div key={idx} style={{ padding: "10px 12px", background: "var(--bg-card)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {acc.email ? acc.email : `@${acc.username}`}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{acc.name}</span>
                    <button 
                      onClick={() => handleDeleteDiscordAdmin(acc)}
                      style={{ padding: "4px 8px", background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      ลบออก
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Form */}
            <form onSubmit={handleAddDiscordAdmin} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", border: "1px dashed var(--border)", borderRadius: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusIcon size={16} />
                มอบสิทธิ์ผู้ดูแลระบบให้กับ Discord Account
              </h4>
              
              <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input type="radio" checked={discordAddMode === "email"} onChange={() => setDiscordAddMode("email")} />
                  ระบุด้วย Email Discord
                </label>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input type="radio" checked={discordAddMode === "username"} onChange={() => setDiscordAddMode("username")} />
                  ระบุด้วย Username Discord
                </label>
              </div>

              {discordAddMode === "email" ? (
                <input 
                  type="email" 
                  placeholder="อีเมล Discord (เช่น test@gmail.com)" 
                  value={newDiscordEmail}
                  onChange={e => setNewDiscordEmail(e.target.value.trim())}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
              ) : (
                <input 
                  type="text" 
                  placeholder="ชื่อผู้ใช้ Discord (เช่น test_username)" 
                  value={newDiscordUsername}
                  onChange={e => setNewDiscordUsername(e.target.value.trim())}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
              )}

              <input 
                type="text" 
                placeholder="ชื่อแสดง (เช่น หมอสมพงษ์ แอดมินร่วม)" 
                value={newDiscordName}
                onChange={e => setNewDiscordName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                required
              />
              
              <button type="submit" style={{ padding: "8px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem", marginTop: "4px" }}>
                มอบสิทธิ์แอดมิน
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* Landing Page Content Management */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <LayoutIcon size={20} style={{ color: "var(--accent)" }} />
            จัดการเนื้อหาหน้าแรกของเว็บไซต์ (Landing Page Content Management)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            แก้ไขข้อมูลสไลด์แบนเนอร์ ข่าวสารประกาศของหน่วยงาน และกระทู้บอร์ดสนทนาล่าสุดบนหน้าแรก
          </p>
        </div>

        {/* Tabs selector */}
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "24px" }}>
          {([
            { id: "slides", label: "🖼️ สไลด์แบนเนอร์ (Slideshow)" },
            { id: "news", label: "📰 ข่าวสาร & ประกาศ (News)" },
            { id: "recruitment_slides", label: "🩺 สไลด์รับสมัคร (Recruitment)" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLandingTab(tab.id)}
              style={{
                padding: "8px 16px",
                background: activeLandingTab === tab.id ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
                border: "1px solid",
                borderColor: activeLandingTab === tab.id ? "var(--accent)" : "transparent",
                color: activeLandingTab === tab.id ? "var(--accent-light)" : "var(--text-secondary)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "bold",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveLanding} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Tab 1: Slideshow Banner */}
          {activeLandingTab === "slides" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
                  รายการรูปภาพสไลด์หมุนวน ({landingSlides.length} สไลด์)
                </h3>
                <button
                  type="button"
                  onClick={addSlide}
                  style={{
                    padding: "6px 12px",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    border: "1px solid var(--border-glow)",
                    color: "var(--accent-light)",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <PlusIcon size={12} /> เพิ่มสไลด์ใหม่
                </button>
              </div>

              {landingSlides.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-secondary)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px dashed var(--border)" }}>
                  ไม่มีข้อมูลสไลด์แบนเนอร์หน้าแรก กรุณากดปุ่มเพิ่มเพื่อเริ่มต้นสร้างค่ะ
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {landingSlides.map((slide, idx) => (
                    <div key={idx} style={{ background: "var(--bg-secondary)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                        
                        {/* Slide Image Uploader & Preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ height: "100px", background: "black", borderRadius: "6px", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={slide.image || "/images/ems_hero_bg.png"} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <label style={{
                            padding: "6px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            textAlign: "center",
                            cursor: "pointer",
                            display: "block"
                          }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSlideImageUpload(e, idx)}
                              style={{ display: "none" }}
                              disabled={isUploadingSlideIndex !== null}
                            />
                            {isUploadingSlideIndex === idx ? "กำลังอัปโหลด..." : "📸 อัปโหลดรูปภาพ"}
                          </label>
                          <input
                            type="text"
                            value={slide.image}
                            onChange={(e) => {
                              const updated = [...landingSlides];
                              updated[idx].image = e.target.value;
                              setLandingSlides(updated);
                            }}
                            placeholder="หรือพิมพ์พาทรูปภาพ (URL)"
                            style={{ width: "100%", padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.75rem", outline: "none" }}
                          />
                        </div>

                        {/* Slide Text Inputs */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>แท็กหัวข้อ (Tag)</span>
                              <input
                                type="text"
                                value={slide.tag}
                                onChange={(e) => {
                                  const updated = [...landingSlides];
                                  updated[idx].tag = e.target.value;
                                  setLandingSlides(updated);
                                }}
                                placeholder="LOS SANTOS EMS"
                                style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>ชื่อเรื่องสไลด์ (Title)</span>
                              <input
                                type="text"
                                value={slide.title}
                                onChange={(e) => {
                                  const updated = [...landingSlides];
                                  updated[idx].title = e.target.value;
                                  setLandingSlides(updated);
                                }}
                                placeholder="เราพร้อมดูแลทุกชีวิต"
                                style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>คำอธิบายเพิ่มเติมใต้ภาพสไลด์</span>
                            <textarea
                              value={slide.description}
                              onChange={(e) => {
                                const updated = [...landingSlides];
                                updated[idx].description = e.target.value;
                                setLandingSlides(updated);
                              }}
                              placeholder="รายละเอียดข้อความประชาสัมพันธ์สั้นๆ..."
                              rows={2}
                              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none", resize: "none" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, "up")}
                            disabled={idx === 0}
                            style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.75rem", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}
                          >
                            ▲ เลื่อนขึ้น
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(idx, "down")}
                            disabled={idx === landingSlides.length - 1}
                            style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.75rem", cursor: idx === landingSlides.length - 1 ? "not-allowed" : "pointer", opacity: idx === landingSlides.length - 1 ? 0.4 : 1 }}
                          >
                            ▼ เลื่อนลง
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSlide(idx)}
                          style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          ลบสไลด์นี้
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: News & Announcements */}
          {activeLandingTab === "news" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
                  รายการการ์ดข่าวสารกู้ชีพประชาสัมพันธ์ ({landingNews.length} ข่าว)
                </h3>
                <button
                  type="button"
                  onClick={addNews}
                  style={{
                    padding: "6px 12px",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    border: "1px solid var(--border-glow)",
                    color: "var(--accent-light)",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <PlusIcon size={12} /> เพิ่มข่าวสารใหม่
                </button>
              </div>

              {landingNews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-secondary)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px dashed var(--border)" }}>
                  ไม่มีข้อมูลข่าวสารประกาศบนหน้าแรก กรุณากดปุ่มเพิ่มเพื่อเริ่มต้นสร้างค่ะ
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {landingNews.map((item, idx) => (
                    <div key={idx} style={{ background: "var(--bg-secondary)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                        
                        {/* News Image Uploader & Preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ height: "100px", background: "black", borderRadius: "6px", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={item.image || "/images/rules/doctor_duty.png"} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <label style={{
                            padding: "6px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            textAlign: "center",
                            cursor: "pointer",
                            display: "block"
                          }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleNewsImageUpload(e, idx)}
                              style={{ display: "none" }}
                              disabled={isUploadingNewsIndex !== null}
                            />
                            {isUploadingNewsIndex === idx ? "กำลังอัปโหลด..." : "📸 อัปโหลดรูปภาพ"}
                          </label>
                          <input
                            type="text"
                            value={item.image}
                            onChange={(e) => {
                              const updated = [...landingNews];
                              updated[idx].image = e.target.value;
                              setLandingNews(updated);
                            }}
                            placeholder="หรือพิมพ์พาทรูปภาพ (URL)"
                            style={{ width: "100%", padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.75rem", outline: "none" }}
                          />
                        </div>

                        {/* News Content Inputs */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>แท็กประเภทข่าว</span>
                              <input
                                type="text"
                                value={item.tag}
                                onChange={(e) => {
                                  const updated = [...landingNews];
                                  updated[idx].tag = e.target.value;
                                  setLandingNews(updated);
                                }}
                                placeholder="ประกาศสำคัญ"
                                style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>สีพื้นหลังแท็ก</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-card)", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", height: "36px" }}>
                                <input
                                  type="color"
                                  value={item.tagColor}
                                  onChange={(e) => {
                                    const updated = [...landingNews];
                                    updated[idx].tagColor = e.target.value;
                                    setLandingNews(updated);
                                  }}
                                  style={{ width: "30px", height: "24px", border: "1px solid var(--border)", background: "none", cursor: "pointer", borderRadius: "4px", padding: 0 }}
                                />
                                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>{item.tagColor}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>หัวเรื่องข่าวประกาศ</span>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => {
                                  const updated = [...landingNews];
                                  updated[idx].title = e.target.value;
                                  setLandingNews(updated);
                                }}
                                placeholder="กิจกรรมจัดอบรมบุคลากรแพทย์กู้ภัย"
                                style={{ padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>เนื้อความข่าวสารสั้น</span>
                              <textarea
                                value={item.desc}
                                onChange={(e) => {
                                  const updated = [...landingNews];
                                  updated[idx].desc = e.target.value;
                                  setLandingNews(updated);
                                }}
                                placeholder="คำโปรยหรือรายละเอียดเบื้องต้นของหัวข้อประกาศ..."
                                rows={2}
                                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none", resize: "none" }}
                              />
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>รายละเอียดเนื้อหาประกาศฉบับเต็ม (markdown/ข้อความยาว)</span>
                            <textarea
                              value={item.content || ""}
                              onChange={(e) => {
                                const updated = [...landingNews];
                                updated[idx].content = e.target.value;
                                setLandingNews(updated);
                              }}
                              placeholder="รายละเอียดข้อมูลเนื้อหาประกาศตัวเต็ม..."
                              rows={4}
                              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none", resize: "vertical" }}
                            />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>วันที่ลงประกาศ</span>
                              <input
                                type="text"
                                value={item.date}
                                onChange={(e) => {
                                  const updated = [...landingNews];
                                  updated[idx].date = e.target.value;
                                  setLandingNews(updated);
                                }}
                                placeholder="23 พ.ค. 2026"
                                style={{ padding: "8px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.75rem", outline: "none" }}
                              />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>จำนวนผู้เข้าชม</span>
                              <input
                                type="number"
                                value={item.views}
                                onChange={(e) => {
                                  const updated = [...landingNews];
                                  updated[idx].views = Number(e.target.value);
                                  setLandingNews(updated);
                                }}
                                placeholder="125"
                                style={{ padding: "8px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.75rem", outline: "none" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                        <button
                          type="button"
                          onClick={() => deleteNews(idx)}
                          style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          ลบประกาศข่าวสารนี้
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Tab 4: Recruitment Slides */}
          {activeLandingTab === "recruitment_slides" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
                  รายการรูปภาพสไลด์รับสมัคร ({landingRecruitmentSlides.length} สไลด์)
                </h3>
                <button
                  type="button"
                  onClick={addRecruitmentSlide}
                  style={{
                    padding: "6px 12px",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    border: "1px solid var(--border-glow)",
                    color: "var(--accent-light)",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <PlusIcon size={12} /> เพิ่มสไลด์รับสมัครใหม่
                </button>
              </div>

              {landingRecruitmentSlides.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-secondary)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px dashed var(--border)" }}>
                  ไม่มีข้อมูลรูปภาพสไลด์รับสมัคร กรุณากดปุ่มเพิ่มเพื่อเริ่มต้นสร้างค่ะ
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {landingRecruitmentSlides.map((slide, idx) => (
                    <div key={idx} style={{ background: "var(--bg-secondary)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                        
                        {/* Slide Image Uploader & Preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ height: "150px", background: "black", borderRadius: "6px", border: "1px solid var(--border)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <img src={slide.image || "/images/leave_banner.jpg"} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          </div>
                          <label style={{
                            padding: "6px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            textAlign: "center",
                            cursor: "pointer",
                            display: "block"
                          }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleRecruitmentSlideImageUpload(e, idx)}
                              style={{ display: "none" }}
                              disabled={isUploadingRecruitmentSlideIndex !== null}
                            />
                            {isUploadingRecruitmentSlideIndex === idx ? "กำลังอัปโหลด..." : "📸 อัปโหลดรูปภาพ"}
                          </label>
                          <input
                            type="text"
                            value={slide.image}
                            onChange={(e) => {
                              const updated = [...landingRecruitmentSlides];
                              updated[idx].image = e.target.value;
                              setLandingRecruitmentSlides(updated);
                            }}
                            placeholder="หรือพิมพ์พาทรูปภาพ (URL)"
                            style={{ width: "100%", padding: "6px 10px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.75rem", outline: "none" }}
                          />
                        </div>
                      </div>

                      {/* Actions row */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "10px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => moveRecruitmentSlide(idx, "up")}
                            disabled={idx === 0}
                            style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.75rem", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1 }}
                          >
                            ▲ เลื่อนขึ้น
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRecruitmentSlide(idx, "down")}
                            disabled={idx === landingRecruitmentSlides.length - 1}
                            style={{ padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.75rem", cursor: idx === landingRecruitmentSlides.length - 1 ? "not-allowed" : "pointer", opacity: idx === landingRecruitmentSlides.length - 1 ? 0.4 : 1 }}
                          >
                            ▼ เลื่อนลง
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteRecruitmentSlide(idx)}
                          style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          ลบสไลด์นี้
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Landing Status Message */}
          {landingStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.85rem",
              background: landingStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${landingStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
              color: landingStatus.type === "success" ? "var(--success)" : "var(--danger)"
            }}>
              {landingStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSavingLanding}
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: isSavingLanding ? 0.7 : 1,
              transition: "all 0.2s"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <SaveIcon size={14} />
              {isSavingLanding ? "กำลังบันทึก..." : "บันทึกเนื้อหาหน้าแรก"}
            </span>
          </button>

        </form>
      </section>

    </div>
  );
}
