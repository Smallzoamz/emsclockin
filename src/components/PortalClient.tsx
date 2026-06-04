"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Lock, 
  Search, 
  Activity, 
  Shield, 
  FileText, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  UserPlus, 
  Users, 
  BookOpen, 
  Phone, 
  Download, 
  MapPin, 
  MessageSquare, 
  Clock, 
  Heart, 
  User, 
  ShieldAlert, 
  Calendar,
  ExternalLink,
  ChevronRight,
  Menu,
  Eye,
  LogOut,
  CheckCircle,
  Info,
  ClipboardList,
  Send,
  X
} from "lucide-react";
import { supabaseClient } from "@/lib/supabase-client";

interface PortalClientProps {
  logoUrl: string;
  error?: string;
  onAdminLogin: (formData: FormData) => Promise<void>;
  onDiscordLogin: () => Promise<void>;
  landingPageData?: any;
}

export function PortalClient({ 
  logoUrl, 
  error, 
  onAdminLogin, 
  onDiscordLogin,
  landingPageData
}: PortalClientProps) {
  const [mounted, setMounted] = useState(false);

  // Live Counter & Active Doctor Roster State
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [activeDoctors, setActiveDoctors] = useState<any[]>([]);
  const [recentShifts, setRecentShifts] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  // Blacklist Search States
  const [blacklistSearch, setBlacklistSearch] = useState("");
  const [blacklistData, setBlacklistData] = useState<any[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);
  const [blacklistSearchResults, setBlacklistSearchResults] = useState<any[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Layout States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Application Form Modal States
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [appStep, setAppStep] = useState<1 | 2 | 3>(1);
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appResult, setAppResult] = useState<any>(null);
  const [appForm, setAppForm] = useState({
    discord_uid: "",
    ic_firstname: "",
    ic_lastname: "",
    age: "",
    age_type: "IC" as "IC" | "OC",
    previous_experience: "",
    reason_to_join: ""
  });
  const [appError, setAppError] = useState("");

  // Error modal states for duplicate applications
  const [appErrorModalOpen, setAppErrorModalOpen] = useState(false);
  const [appErrorModalMessage, setAppErrorModalMessage] = useState("");

  // Application History board states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyApplications, setHistoryApplications] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusTab, setHistoryStatusTab] = useState<"all" | "pending" | "called" | "approved" | "expired">("all");
  const [selectedHistoryApp, setSelectedHistoryApp] = useState<any | null>(null);

  // Selected news modal states
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // Image Slideshow Banner State
  const [activeImageSlide, setActiveImageSlide] = useState(0);

  const [slides] = useState<any[]>(() => {
    if (landingPageData?.slides && landingPageData.slides.length > 0) {
      return landingPageData.slides;
    }
    return [
      {
        image: "/images/ems_hero_bg.png",
        tag: "FiveM EMS Service",
        title: "เราพร้อมดูแล และช่วยเหลือประชาชนในทุกสถานการณ์",
        description: "ยินดีต้อนรับสู่ศูนย์บริการการแพทย์"
      }
    ];
  });

  const [newsItems] = useState<any[]>(landingPageData?.news || []);

  // Recruitment slides state
  const [recruitmentSlides] = useState<any[]>(() => {
    if (landingPageData?.recruitment_slides && landingPageData.recruitment_slides.length > 0) {
      return landingPageData.recruitment_slides;
    }
    return [
      { image: "/images/leave_banner.jpg" },
      { image: "/images/welcome_banner.jpg" }
    ];
  });
  const [activeRecruitmentSlide, setActiveRecruitmentSlide] = useState(0);

  // Fetch Blacklist data (all records including released)
  async function fetchBlacklist() {
    setBlacklistLoading(true);
    try {
      const { data } = await supabaseClient
        .from("blacklist_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setBlacklistData(data);
    } catch (err) {
      console.error("Failed to fetch blacklist:", err);
    } finally {
      setBlacklistLoading(false);
    }
  }

  // Load blacklist records on page mount
  useEffect(() => {
    setMounted(true);
    fetchBlacklist();
  }, []);

  // Timer Effect to update live session clock-in durations
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch Public Active Doctors
  useEffect(() => {
    async function fetchOnDuty() {
      try {
        const res = await fetch("/api/shifts/status");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.activeCount === "number") {
            setActiveCount(data.activeCount);
          }
          if (data.activeDoctors && Array.isArray(data.activeDoctors)) {
            setActiveDoctors(data.activeDoctors);
          }
          if (data.recentShifts && Array.isArray(data.recentShifts)) {
            setRecentShifts(data.recentShifts);
          }
        }
      } catch (err) {
        console.error("Failed to fetch on-duty count:", err);
      }
    }
    fetchOnDuty();
    const poll = setInterval(fetchOnDuty, 30000); // Poll every 30s
    return () => clearInterval(poll);
  }, []);

  // Auto-rotate image slides every 6 seconds
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setActiveImageSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Auto-rotate recruitment slides every 6 seconds
  useEffect(() => {
    if (recruitmentSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveRecruitmentSlide((prev) => (prev + 1) % recruitmentSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [recruitmentSlides.length]);

  // Fetch public applications history
  const fetchHistoryApplications = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/applications?history=true");
      if (res.ok) {
        const data = await res.json();
        const apps = data.applications || [];
        setHistoryApplications(apps);
        if (apps.length > 0) {
          setSelectedHistoryApp(apps[0]);
        } else {
          setSelectedHistoryApp(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch applications history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isHistoryModalOpen) {
      fetchHistoryApplications();
    }
  }, [isHistoryModalOpen]);

  // Handle Blacklist Search
  const handleBlacklistSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistSearch.trim()) {
      setBlacklistSearchResults(null);
      setHasSearched(false);
      return;
    }
    const term = blacklistSearch.toLowerCase().trim();
    const matches = blacklistData.filter((item) => {
      return (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.phone && item.phone.toLowerCase().includes(term)) ||
        (item.gang && item.gang.toLowerCase().includes(term)) ||
        (item.target_type && item.target_type.toLowerCase().includes(term))
      );
    });
    setBlacklistSearchResults(matches);
    setHasSearched(true);
  };

  // Handle Application Form Submit
  const handleApplicationSubmit = async () => {
    if (!appForm.discord_uid.trim() || !appForm.ic_firstname.trim() || !appForm.ic_lastname.trim() || !appForm.age.trim() || !appForm.reason_to_join.trim()) {
      setAppError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!/^\d{17,20}$/.test(appForm.discord_uid.trim())) {
      setAppError("Discord UID ต้องเป็นตัวเลข 17-20 หลัก");
      return;
    }
    setAppSubmitting(true);
    setAppError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appForm)
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.error === "duplicate_application") {
          setAppErrorModalMessage(data.message || "เนื่องจากระบบยังมีข้อมูลการสมัครของคุณอยู่...");
          setAppErrorModalOpen(true);
          setIsAppModalOpen(false); // ปิดหน้าต่างกรอกฟอร์มหลัก
        } else {
          setAppError(data.error || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
        }
        return;
      }
      setAppResult(data);
      setAppStep(3);
    } catch (err) {
      setAppError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setAppSubmitting(false);
    }
  };

  // Reset application modal
  const resetAppModal = () => {
    setAppStep(1);
    setAppForm({ discord_uid: "", ic_firstname: "", ic_lastname: "", age: "", age_type: "IC", previous_experience: "", reason_to_join: "" });
    setAppError("");
    setAppResult(null);
    setIsAppModalOpen(false);
  };

  // Date/Time formatting helpers
  const formatThaiTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatThaiDateLong = (date: Date) => {
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "numeric",
      year: "numeric"
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === "day")?.value || "";
    const monthIndex = parseInt(parts.find(p => p.type === "month")?.value || "1") - 1;
    const year = parseInt(parts.find(p => p.type === "year")?.value || "2026");
    return `${day} ${months[monthIndex]} ${year}`;
  };

  const formatTimeHHMM = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCompletedDuration = (inTimeStr: string, outTimeStr: string | null) => {
    if (!outTimeStr) return "-";
    const diffMs = new Date(outTimeStr).getTime() - new Date(inTimeStr).getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    }
    return `${minutes} นาที`;
  };

  // Group active doctors by rank: แพทย์ชำนาญ / แพทย์ / นักเรียนแพทย์
  let specialistCount = 0;
  let doctorCount = 0;
  let studentCount = 0;

  activeDoctors.forEach((doc) => {
    const rank = (doc.rank || "").toLowerCase();
    if (rank.includes("ชำนาญ") || rank.includes("specialist")) {
      specialistCount++;
    } else if (rank.includes("นักเรียน") || rank.includes("นร.") || rank.includes("student") || rank.includes("นร.แพทย์")) {
      studentCount++;
    } else {
      doctorCount++;
    }
  });

  const displayShifts = recentShifts;

  const recruitmentTerms = landingPageData?.recruitment_terms || {
    title: "เงื่อนไขการสมัครเข้าร่วมหน่วยงานแพทย์",
    subtext: "กรุณาอ่านเงื่อนไขให้ครบถ้วนก่อนดำเนินการสมัคร",
    terms_title: "ข้อกำหนดและเงื่อนไข",
    items: [
      "ผู้สมัครจะต้องเป็นสมาชิกของ Discord Server หน่วยงานแพทย์เท่านั้น",
      "ข้อมูลที่กรอกต้องเป็นข้อมูลจริงตามตัวละครในเกม (IC) ห้ามกรอกข้อมูลเท็จ",
      "หลังจากส่งใบสมัคร ผู้สมัครจะต้องเข้ารับการสอบภายใน 48 ชั่วโมง",
      "หากไม่เข้ารับการสอบภายในเวลาที่กำหนด ระบบจะทำการลบข้อมูลผู้สมัครออกโดยอัตโนมัติ",
      "ผู้สมัครที่ถูกลบข้อมูลสามารถกรอกใบสมัครใหม่ได้",
      "การตัดสินผลสอบขึ้นอยู่กับดุลยพินิจของ ผอ. และทีมผู้ดูแลเท่านั้น ผลการตัดสินถือเป็นที่สิ้นสุด",
      "ผู้สมัครที่ผ่านการสอบจะเข้าสู่ตำแหน่ง \"นักเรียนแพทย์\" และต้องปฏิบัติตามกฎระเบียบของหน่วยงานอย่างเคร่งครัด"
    ]
  };

  const renderLoginModal = () => {
    if (!isLoginModalOpen) return null;
    const modalContent = (
      <div className="portal-centered-modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
        <div className="portal-centered-modal-card" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsLoginModalOpen(false)}
            className="portal-modal-close-btn"
            style={{ position: "absolute", top: "16px", right: "16px" }}
          >
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              color: "var(--accent)"
            }}>
              <Lock size={16} />
            </div>
            
            <h3 style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: "600", marginBottom: "6px" }}>
              ระบบลงทะเบียนเข้ากะปฏิบัติหน้าที่
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginBottom: "20px", lineHeight: "1.45" }}>
              สงวนสิทธิ์การเข้าถึงข้อมูลเฉพาะแพทย์ในสังกัดโรงพยาบาลนครลอสซานโตสเท่านั้น กรุณายืนยันตัวตนด้วยบัญชี Discord หรือ ข้อมูลผู้ดูแลระบบ
            </p>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.04)",
                border: "1px solid rgba(239, 68, 68, 0.1)",
                borderRadius: "4px",
                padding: "8px 12px",
                marginBottom: "14px",
                fontSize: "0.7rem",
                color: "#fca5a5",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                <span>
                  {error === "AccessDenied" 
                    ? "บัญชี Discord ของคุณไม่มีสิทธิ์ของทีมแพทย์ในสารบบ" 
                    : "การล็อกอินล้มเหลว"}
                </span>
              </div>
            )}

            {/* Discord Login Button */}
            <button 
              onClick={() => onDiscordLogin()} 
              className="login-btn discord" 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 20px",
                width: "100%",
                background: "#5865F2",
                border: "none",
                borderRadius: "4px",
                color: "#ffffff",
                fontSize: "0.78rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.15s",
                marginBottom: "16px"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#4752c4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#5865F2"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
              </svg>
              เข้าสู่ระบบด้วย Discord
            </button>

            {/* Credentials Forms */}
            <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onAdminLogin(formData);
                }}
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <input 
                  type="text" 
                  name="username" 
                  placeholder="Username / ชื่อผู้ใช้งาน"
                  defaultValue="admin"
                  required
                  style={{ 
                    width: "100%",
                    padding: "9px 12px", 
                    borderRadius: "4px", 
                    border: "1px solid rgba(255, 255, 255, 0.08)", 
                    background: "rgba(0, 0, 0, 0.2)",
                    color: "#ffffff",
                    outline: "none",
                    fontSize: "0.76rem"
                  }} 
                />
                <input 
                  type="password" 
                  name="password" 
                  placeholder="Password / รหัสผ่าน"
                  required
                  style={{ 
                    width: "100%", 
                    padding: "9px 12px", 
                    borderRadius: "4px", 
                    border: "1px solid rgba(255, 255, 255, 0.08)", 
                    background: "rgba(0, 0, 0, 0.2)",
                    color: "#ffffff",
                    outline: "none",
                    fontSize: "0.76rem"
                  }} 
                />
                <button 
                  type="submit" 
                  style={{ 
                    width: "100%", 
                    padding: "9px 0", 
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: "4px",
                    color: "#ffffff",
                    fontSize: "0.76rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
                >
                  เข้าสู่ระบบ
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
    return createPortal(modalContent, document.body);
  };

  return (
    <div className="portal-container" style={{
      backgroundColor: "transparent",
      backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.002) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.002) 1px, transparent 1px)",
      backgroundSize: "40px 40px"
    }}>
      <div className="portal-shell-layout">
        
        {/* 1. LEFT SIDEBAR (Fixed Column) */}
        <aside className="portal-sidebar-wrapper">
          {/* Header branding */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", paddingLeft: "8px" }}>
            {logoUrl ? (
              <img src={logoUrl} alt="LSMS Logo" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
            ) : (
              <Activity size={32} style={{ color: "var(--accent)" }} />
            )}
            <div>
              <h2 style={{ fontSize: "0.95rem", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "0.5px", lineHeight: "1.1" }}>
                FiveM EMS Service
              </h2>
            </div>
          </div>

          {/* Navigation links */}
          <div className="portal-sidebar-section-title">Main Menu</div>
          <a href="#" className="portal-sidebar-link active">
            <Home size={16} />
            <span>หน้าแรก</span>
          </a>
          <a href="#news-section" className="portal-sidebar-link">
            <FileText size={16} />
            <span>ข่าวสาร & ประกาศ</span>
          </a>
          <a href="#recruitment-section" className="portal-sidebar-link">
            <UserPlus size={16} />
            <span>ประกาศรับสมัคร</span>
          </a>
          <a href="#blacklist-section" className="portal-sidebar-link">
            <ShieldAlert size={16} />
            <span>ตรวจสอบ BLACKLIST</span>
          </a>
          <a href="#shifts-section" className="portal-sidebar-link">
            <Clock size={16} />
            <span>ตรวจสอบการเข้า-ออกเวร</span>
          </a>
          <a href="#roster-section" className="portal-sidebar-link">
            <Users size={16} />
            <span>รายชื่อแพทย์</span>
          </a>
          <a href="/dashboard/rules" className="portal-sidebar-link">
            <BookOpen size={16} />
            <span>กฎระเบียบหน่วยงาน</span>
          </a>
          <a href="#footer" className="portal-sidebar-link">
            <Phone size={16} />
            <span>ติดต่อเรา</span>
          </a>

          {/* Quick links */}
          <div className="portal-sidebar-section-title">Quick Links</div>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "var(--accent)" }}>●</span> ระบบแจ้งเหตุฉุกเฉิน
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "var(--accent)" }}>●</span> แผนที่โรงพยาบาล
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "var(--accent)" }}>●</span> คู่มือการปฏิบัติงาน
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "var(--accent)" }}>●</span> ดาวน์โหลดเอกสาร
          </a>

          {/* Join us promo */}
          <div className="portal-sidebar-promo" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="portal-sidebar-promo-text" style={{ marginBottom: 0 }}>มาเป็นส่วนหนึ่งกับเรา ร่วมช่วยเหลือประชาชนในเมือง</div>
            <button className="portal-sidebar-promo-btn" onClick={() => { setIsAppModalOpen(true); setAppStep(1); }} style={{ padding: "8px 0" }}>
              สมัครเข้าร่วมหน่วยงาน
            </button>
            <button 
              className="portal-sidebar-promo-btn" 
              onClick={() => setIsHistoryModalOpen(true)}
              style={{
                padding: "8px 0",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            >
              ดูประวัติการสมัครทั้งหมด
            </button>
          </div>

          {/* Socials footer */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "24px", opacity: 0.5 }}>
            <a href="#" style={{ color: "#fff" }}><Users size={16} /></a>
            <a href="#" style={{ color: "#fff" }}><ExternalLink size={16} /></a>
          </div>
        </aside>

        {/* 2. RIGHT CONTENT AREA */}
        <div className="portal-content-wrapper">
          
          {/* Sticky Top Header */}
          <header className="portal-header-bar">
            {/* Header left: Horizontal links */}
            <div className="portal-header-nav-links">
              <a href="#" className="portal-header-nav-link">หน้าแรก</a>
              <a href="#news-section" className="portal-header-nav-link">ข่าวสาร</a>
              <a href="#recruitment-section" className="portal-header-nav-link">ประกาศรับสมัคร</a>
              <a href="/dashboard/rules" className="portal-header-nav-link">เกี่ยวกับเรา</a>
              <a href="#footer" className="portal-header-nav-link">ติดต่อเรา</a>
            </div>

            {/* Header right: Clock & Profile */}
            <div className="portal-header-clock-group">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} style={{ color: "var(--accent)" }} />
                <span className="portal-header-clock">
                  {formatThaiTime(now)}
                </span>
                <span className="portal-header-date">
                  {formatThaiDateLong(now)}
                </span>
              </div>

              {/* Login Button Gate trigger */}
              <div className="portal-header-user-welcome">
                <button 
                  onClick={() => setIsLoginModalOpen(true)}
                  style={{
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                    borderRadius: "4px",
                    color: "var(--accent)",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    padding: "5px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <User size={12} />
                  <span>เข้าสู่ระบบแพทย์ / Staff Login</span>
                </button>
              </div>
            </div>
          </header>

          {/* Scrollable Viewport Grid */}
          <main className="portal-dashboard-viewport">
            
            {/* ROW 1: Hero Carousel (2/3 width) + OnDuty counters (1/3 width) */}
            <div className="portal-grid-3-1">
              {/* Left Column: Carousel Slider */}
              <div className="web-slide-container" style={{ height: "350px" }}>
                {slides.map((slide, idx) => (
                  <div 
                    key={idx}
                    className="web-slide-image"
                    style={{
                      backgroundImage: `url(${slide.image})`,
                      opacity: idx === activeImageSlide ? 1 : 0
                    }}
                  />
                ))}

                <div className="web-slide-overlay" style={{ background: "linear-gradient(to right, rgba(3, 7, 18, 0.95) 0%, rgba(3, 7, 18, 0.35) 70%, rgba(3, 7, 18, 0.05) 100%)" }} />

                {slides.map((slide, idx) => (
                  <div 
                    key={idx}
                    className="web-slide-text-wrapper"
                    style={{
                      left: "32px",
                      bottom: "32px",
                      opacity: idx === activeImageSlide ? 1 : 0,
                      transform: idx === activeImageSlide ? "translateY(0)" : "translateY(15px)",
                      pointerEvents: idx === activeImageSlide ? "auto" : "none"
                    }}
                  >
                    <span className="web-slide-tag" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
                      {slide.tag}
                    </span>
                    <h2 className="web-slide-title" style={{ fontSize: "1.7rem", marginBottom: "8px" }}>
                      {slide.title}
                    </h2>
                    <p className="web-slide-desc" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                      {slide.description}
                    </p>
                    <div style={{ marginTop: "16px" }}>
                      <a href="/dashboard/rules" className="web-news-button" style={{ border: "none", background: "var(--accent)", color: "#ffffff", padding: "8px 16px" }}>
                        ดูรายละเอียดเพิ่มเติม
                      </a>
                    </div>
                  </div>
                ))}

                {/* Left/Right arrow clickers */}
                <button 
                  onClick={() => setActiveImageSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  className="web-slide-chevron left"
                  style={{ width: "32px", height: "32px", left: "12px" }}
                >
                  <ArrowLeft size={16} />
                </button>
                <button 
                  onClick={() => setActiveImageSlide((prev) => (prev + 1) % slides.length)}
                  className="web-slide-chevron right"
                  style={{ width: "32px", height: "32px", right: "12px" }}
                >
                  <ArrowRight size={16} />
                </button>

                {/* Dot pagination */}
                <div className="web-slide-dots" style={{ bottom: "16px", right: "32px" }}>
                  {slides.map((_, idx) => (
                    <span 
                      key={idx}
                      onClick={() => setActiveImageSlide(idx)}
                      className={`web-slide-dot ${idx === activeImageSlide ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column: On-Duty & Hospital status panels */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* On-Duty Counter */}
                <div className="portal-onduty-widget">
                  <div className="portal-onduty-main-header">
                    <div>
                      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", fontWeight: "700", textTransform: "uppercase" }}>
                        แพทย์เข้าเวรปัจจุบัน
                      </span>
                      <div className="portal-onduty-total-label">
                        {activeCount !== null ? activeCount : 0} <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)" }}>/ 60 คน</span>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 6px #10b981" }}></span>
                      <span style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: "800" }}>ONLINE</span>
                    </div>
                  </div>
                  
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", marginTop: "-10px", display: "block" }}>
                    ประจำการอยู่ในขณะนี้
                  </span>

                  <div className="portal-onduty-grid">
                    <div className="portal-onduty-card">
                      <div className="portal-onduty-card-val">{specialistCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">แพทย์ชำนาญ</div>
                    </div>
                    <div className="portal-onduty-card">
                      <div className="portal-onduty-card-val nurse">{doctorCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">แพทย์</div>
                    </div>
                    <div className="portal-onduty-card">
                      <div className="portal-onduty-card-val emt">{studentCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">นักเรียนแพทย์</div>
                    </div>
                  </div>
                </div>

                {/* Main Hospital Status */}
                <div className="portal-hospital-widget">
                  <div className="portal-hospital-header">
                    <div>
                      <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>โรงพยาบาลหลัก</span>
                      <div className="portal-hospital-title">Pillbox Hill Medical Center</div>
                    </div>
                    <span className="portal-hospital-status-badge">เปิดบริการ</span>
                  </div>
                  
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                      <span>เจ้าหน้าที่ประจำการ: {activeCount !== null ? activeCount : 0} คน</span>
                      <span>{Math.min(100, Math.round(((activeCount !== null ? activeCount : 0) / 20) * 100))}%</span>
                    </div>
                    <div className="portal-progress-container">
                      <div className="portal-progress-bar-fill" style={{ width: `${Math.min(100, Math.round(((activeCount !== null ? activeCount : 0) / 20) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <a href="/dashboard/rules" className="web-news-button" style={{ fontSize: "0.68rem", padding: "5px 0", justifyContent: "center" }}>
                      ดูข้อมูลโรงพยาบาล
                    </a>
                    <a href="/dashboard/rules" className="web-news-button" style={{ fontSize: "0.68rem", padding: "5px 0", justifyContent: "center" }}>
                      แผนที่นำทาง
                    </a>
                  </div>
                </div>

              </div>
            </div>

            {/* ROW 2: News List (2/3) + Blacklist Search (1/3) */}
            <div id="news-section" className="portal-news-grid">
              
              {/* Column 1: News & Announcements */}
              <div style={{ background: "#090f1d", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={15} style={{ color: "var(--accent)" }} />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>ข่าวสาร & ประกาศ</h3>
                  </div>
                  <a href="#news-section" style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none" }}>ดูทั้งหมด</a>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {newsItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 16px", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
                      ไม่มีข่าวสารหรือประกาศประชาสัมพันธ์ในขณะนี้
                    </div>
                  ) : (
                    newsItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setSelectedNews(item);
                          setIsNewsModalOpen(true);
                        }}
                        style={{ 
                          display: "flex", 
                          gap: "16px", 
                          borderBottom: idx < newsItems.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", 
                          paddingBottom: idx < newsItems.length - 1 ? "16px" : 0,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        className="portal-news-item-hover"
                      >
                        <img src={item.image} alt={item.title} style={{ width: "80px", height: "80px", borderRadius: "6px", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.05)" }} />
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "0.58rem", color: item.tagColor, fontWeight: "800", background: `${item.tagColor}15`, border: `1px solid ${item.tagColor}30`, padding: "1px 5px", borderRadius: "3px", display: "inline-block" }}>
                                {item.tag}
                              </span>
                              <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>{item.date}</span>
                            </div>
                            <h4 className="portal-news-title-text" style={{ fontSize: "0.82rem", fontWeight: "700", color: "#ffffff", margin: "0 0 4px 0", transition: "color 0.2s" }}>
                              {item.title}
                            </h4>
                            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.4" }}>
                              {item.desc}
                            </p>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
                              <Eye size={10} /> {item.views} ครั้ง
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px" }} className="portal-news-readmore-text">
                              อ่านรายละเอียดเพิ่มเติม <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Blacklist database Search */}
              <div id="blacklist-section" style={{ background: "#090f1d", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "20px" }}>
                <div style={{ marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Shield size={15} style={{ color: "#ef4444" }} />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>ตรวจสอบ BLACKLIST</h3>
                  </div>
                </div>

                {/* Search field form */}
                <form onSubmit={handleBlacklistSearch} style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ / ID / เลขบัตร..." 
                      value={blacklistSearch}
                      onChange={(e) => setBlacklistSearch(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(0, 0, 0, 0.2)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "4px",
                        padding: "6px 8px 6px 26px",
                        color: "#ffffff",
                        fontSize: "0.72rem",
                        outline: "none",
                        fontFamily: "inherit"
                      }}
                    />
                    <Search size={12} style={{ position: "absolute", left: "8px", top: "8px", color: "rgba(255,255,255,0.3)" }} />
                  </div>
                  <button 
                    type="submit"
                    style={{
                      background: "var(--accent)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0 14px",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      cursor: "pointer"
                    }}
                  >
                    ค้นหา
                  </button>
                </form>

                {/* Blacklist Search Results */}
                {blacklistLoading ? (
                  <div style={{ textAlign: "center", padding: "24px 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                    กำลังสืบค้นฐานข้อมูล...
                  </div>
                ) : !hasSearched ? (
                  <div style={{
                    padding: "24px 16px",
                    background: "color-mix(in srgb, var(--accent) 2%, transparent)",
                    border: "1px dashed color-mix(in srgb, var(--accent) 12%, transparent)",
                    borderRadius: "6px",
                    textAlign: "center",
                    color: "color-mix(in srgb, var(--accent) 50%, transparent)",
                    fontSize: "0.72rem"
                  }}>
                    <Search size={16} style={{ margin: "0 auto 6px auto", display: "block", opacity: 0.5 }} />
                    กรุณาพิมพ์ชื่อ / ID / เลขบัตร เพื่อค้นหาข้อมูล Blacklist
                  </div>
                ) : blacklistSearchResults && blacklistSearchResults.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                    {blacklistSearchResults.map((record, idx) => (
                      <div key={record.id || idx}>
                        <div className="portal-blacklist-profile-card">
                          <div className="portal-blacklist-avatar-container">
                            {record.avatarUrl ? (
                              <img src={record.avatarUrl} alt="Avatar" className="portal-blacklist-avatar-image" />
                            ) : (
                              <User size={36} style={{ color: "rgba(255,255,255,0.15)" }} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              {record.status === "released" ? (
                                <span style={{ fontSize: "0.56rem", fontWeight: "800", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", padding: "1px 6px", borderRadius: "3px" }}>ปลดแล้ว</span>
                              ) : (
                                <span className="portal-blacklist-badge">BLACKLIST</span>
                              )}
                              {record.target_type && (
                                <span style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: "3px" }}>{record.target_type}</span>
                              )}
                            </div>
                            <h4 className="portal-blacklist-name">{record.name || record.gang || "ไม่ระบุชื่อ"}</h4>
                            {record.phone && <div className="portal-blacklist-cid">Citizen ID: {record.phone}</div>}
                            {record.gang && <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>แก๊ง: {record.gang}</div>}
                            <div className="portal-blacklist-note">
                              <strong>หมายเหตุ:</strong> {record.penalty}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                              <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>
                                วันที่: {formatTimeHHMM(record.created_at)}
                              </span>
                              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: record.status === "released" ? "#10b981" : "#ef4444", fontFamily: "JetBrains Mono" }}>
                                {record.status === "released" ? "ปลดแล้ว" : `${Number(record.fine * (record.multiplier || 1)).toLocaleString()} IC`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="portal-blacklist-warning-text">
                      *ข้อมูล BLACKLIST ใช้สำหรับการตรวจสอบภายในหน่วยงานเท่านั้น
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: "24px 16px",
                    background: "rgba(16, 185, 129, 0.03)",
                    border: "1px dashed rgba(16, 185, 129, 0.15)",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontSize: "0.72rem"
                  }}>
                    <CheckCircle size={18} style={{ margin: "0 auto 6px auto", display: "block", color: "#10b981" }} />
                    <span style={{ color: "#10b981" }}>ไม่พบข้อมูลประวัติบัญชีดำสำหรับคำค้นหานี้</span>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.64rem", marginTop: "4px" }}>รายชื่อนี้ไม่ถูก Blacklist ในระบบ</div>
                  </div>
                )}
              </div>

            </div>

            {/* ROW 3: Shift Logs Table (2/3 width) + Citizens promo banner (1/3 width) */}
            <div id="shifts-section" className="portal-grid-3-1">
              
              {/* Left Column: Shift Logs Table */}
              <div style={{ background: "#090f1d", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Clock size={15} style={{ color: "var(--accent)" }} />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>ตรวจสอบการเข้า-ออกเวร</h3>
                  </div>
                  
                  {/* Mock selector dropdown */}
                  <select style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: "4px", color: "#fff", fontSize: "0.72rem", outline: "none", fontFamily: "inherit" }}>
                    <option>{formatThaiDateLong(now)}</option>
                  </select>
                </div>

                <div className="portal-shifts-table-container">
                  <table className="portal-shifts-table">
                    <thead>
                      <tr>
                        <th>ชื่อ-นามสกุล</th>
                        <th>ตำแหน่ง</th>
                        <th>เวลาเข้าเวร</th>
                        <th>เวลาออกเวร</th>
                        <th>รวมเวลา</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayShifts.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>
                            ไม่พบข้อมูลการปฏิบัติหน้าที่ในปัจจุบัน
                          </td>
                        </tr>
                      ) : (
                        displayShifts.map((shift, idx) => (
                          <tr key={shift.id || idx}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                  {shift.avatarUrl ? (
                                    <img src={shift.avatarUrl} alt={shift.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <span style={{ fontSize: "0.68rem" }}>🩺</span>
                                  )}
                                </div>
                                <span style={{ fontWeight: "600", color: "#ffffff" }}>{shift.name}</span>
                              </div>
                            </td>
                            <td style={{ color: "rgba(255,255,255,0.5)" }}>{shift.rank}</td>
                            <td>{formatTimeHHMM(shift.clockIn)}</td>
                            <td>{shift.clockOut ? formatTimeHHMM(shift.clockOut) : "-"}</td>
                            <td>{shift.clockOut ? getCompletedDuration(shift.clockIn, shift.clockOut) : "-"}</td>
                            <td>
                              {shift.status === "active" ? (
                                <span className="portal-status-badge active">
                                  <span className="portal-status-pulse"></span>
                                  กำลังปฏิบัติงาน
                                </span>
                              ) : (
                                <span className="portal-status-badge completed">
                                  ออกเวรแล้ว
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Auto-rotating Recruitment image slideshow */}
              <div id="recruitment-section" className="web-slide-container" style={{
                height: "100%",
                minHeight: "340px",
                position: "relative",
                overflow: "hidden",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                {recruitmentSlides.map((slide, idx) => (
                  <div 
                    key={idx}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundImage: `url(${slide.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: idx === activeRecruitmentSlide ? 1 : 0,
                      transition: "opacity 0.6s ease-in-out"
                    }}
                  />
                ))}

                {/* Floating button to view application history */}
                <button
                  onClick={() => setIsHistoryModalOpen(true)}
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "16px",
                    background: "rgba(3, 7, 18, 0.75)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    padding: "8px 14px",
                    cursor: "pointer",
                    zIndex: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(3, 7, 18, 0.9)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(3, 7, 18, 0.75)"; }}
                >
                  <ClipboardList size={12} style={{ color: "var(--accent)" }} />
                  <span>ดูประวัติการสมัคร</span>
                </button>

                {recruitmentSlides.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveRecruitmentSlide((prev) => (prev - 1 + recruitmentSlides.length) % recruitmentSlides.length)}
                      className="web-slide-chevron left"
                      style={{ width: "28px", height: "28px", left: "10px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 10 }}
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button 
                      onClick={() => setActiveRecruitmentSlide((prev) => (prev + 1) % recruitmentSlides.length)}
                      className="web-slide-chevron right"
                      style={{ width: "28px", height: "28px", right: "10px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 10 }}
                    >
                      <ArrowRight size={14} />
                    </button>

                    <div className="web-slide-dots" style={{ bottom: "12px", right: "0", left: "0", display: "flex", justifyContent: "center", gap: "6px", zIndex: 10 }}>
                      {recruitmentSlides.map((_, idx) => (
                        <span 
                          key={idx}
                          onClick={() => setActiveRecruitmentSlide(idx)}
                          className={`web-slide-dot ${idx === activeRecruitmentSlide ? 'active' : ''}`}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>

          </main>

          {/* Footer */}
          <footer id="footer" style={{
            background: "#060b13",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            marginTop: "auto",
            padding: "24px 32px"
          }}>
            <div style={{
              maxWidth: "1280px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.35)"
            }}>
              <p style={{ margin: 0 }}>© 2026 FiveM EMS Service | All rights reserved.</p>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <a href="/dashboard/rules" style={{ textDecoration: "none", color: "rgba(255,255,255,0.4)" }}>กฎระเบียบหน่วยงาน</a>
                <span>·</span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Designed for FiveM</span>
              </div>
            </div>
          </footer>

        </div>
      </div>

      {/* React Portal Login Modal */}
      {mounted && renderLoginModal()}

      {/* React Portal Error Modal */}
      {mounted && appErrorModalOpen && createPortal(
        <div className="portal-centered-modal-overlay" onClick={() => setAppErrorModalOpen(false)}>
          <div className="portal-centered-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", width: "90vw", textAlign: "center" }}>
            <button onClick={() => setAppErrorModalOpen(false)} className="portal-modal-close-btn" style={{ position: "absolute", top: "16px", right: "16px" }}>
              <X size={18} />
            </button>
            
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <AlertTriangle size={24} style={{ color: "#ef4444" }} />
            </div>
            
            <h3 style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: "700", margin: "0 0 8px 0" }}>ส่งใบสมัครไม่สำเร็จ</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.76rem", marginBottom: "20px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {appErrorModalMessage}
            </p>
            
            <button onClick={() => setAppErrorModalOpen(false)} style={{ width: "100%", padding: "10px", background: "#ef4444", border: "none", borderRadius: "4px", color: "#ffffff", fontSize: "0.76rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
              ตกลง
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* React Portal Application History Modal */}
      {mounted && isHistoryModalOpen && createPortal(
        <div className="portal-centered-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div 
            className="portal-centered-modal-card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: "960px", 
              width: "95vw", 
              height: "85vh", 
              maxHeight: "680px", 
              display: "flex", 
              flexDirection: "column",
              padding: 0,
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(3, 7, 18, 0.4)" }}>
              <div>
                <h3 style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <ClipboardList size={16} style={{ color: "var(--accent)" }} />
                  บอร์ดตรวจสอบประวัติใบสมัคร (Application Archive)
                </h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.68rem", margin: "2px 0 0 0" }}>
                  รายชื่อประวัติแบบสอบสมัครแพทย์ประจำศูนย์ปฏิบัติการกู้ชีพ
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="portal-modal-close-btn">
                <X size={18} />
              </button>
            </div>

            {/* Content Body Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", flex: 1, overflow: "hidden" }}>
              {/* Left Column: List + Filters */}
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "rgba(3, 7, 18, 0.2)", overflow: "hidden" }}>
                {/* Search & Tabs */}
                <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อผู้สมัคร IC..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px 7px 28px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)", color: "#fff", fontSize: "0.72rem", outline: "none", fontFamily: "inherit" }}
                    />
                  </div>

                  {/* Tiny Tabs */}
                  <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.15)", padding: "2px", borderRadius: "6px" }}>
                    {([
                      { id: "all", label: "ทั้งหมด" },
                      { id: "pending", label: "รอสอบ" },
                      { id: "called", label: "เรียกสอบ" },
                      { id: "approved", label: "สอบผ่าน" },
                      { id: "expired", label: "ไม่ผ่าน/หมดอายุ" }
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHistoryStatusTab(tab.id)}
                        style={{
                          flex: 1,
                          padding: "4px 0",
                          border: "none",
                          borderRadius: "4px",
                          background: historyStatusTab === tab.id ? "rgba(255,255,255,0.04)" : "transparent",
                          color: historyStatusTab === tab.id ? "#ffffff" : "rgba(255,255,255,0.4)",
                          fontSize: "0.64rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Candidate List */}
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }} className="portal-custom-scrollbar">
                  {historyLoading ? (
                    <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                      กำลังโหลดข้อมูลประวัติ...
                    </div>
                  ) : historyApplications.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                      ไม่มีข้อมูลใบสมัครในระบบ
                    </div>
                  ) : (() => {
                    const filtered = historyApplications.filter(app => {
                      const fullName = `${app.ic_firstname || ""} ${app.ic_lastname || ""}`.toLowerCase();
                      const matchesSearch = fullName.includes(historySearch.toLowerCase());
                      const matchesTab = historyStatusTab === "all" 
                        || (historyStatusTab === "pending" && app.status === "pending")
                        || (historyStatusTab === "called" && app.status === "called")
                        || (historyStatusTab === "approved" && app.status === "approved")
                        || (historyStatusTab === "expired" && (app.status === "expired" || app.status === "rejected"));
                      return matchesSearch && matchesTab;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "32px", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>
                          ไม่พบประวัติการค้นหาสำหรับฟิลเตอร์นี้
                        </div>
                      );
                    }

                    return filtered.map((app) => {
                      const isSelected = selectedHistoryApp?.id === app.id;
                      let badgeColor = "#94a3b8";
                      let badgeBg = "rgba(148, 163, 184, 0.1)";
                      let statusText = "หมดอายุ";

                      if (app.status === "pending") {
                        badgeColor = "var(--accent)";
                        badgeBg = "color-mix(in srgb, var(--accent) 10%, transparent)";
                        statusText = "รอดำเนินการ";
                      } else if (app.status === "called") {
                        badgeColor = "#f59e0b";
                        badgeBg = "rgba(245, 158, 11, 0.1)";
                        statusText = "เรียกสอบแล้ว";
                      } else if (app.status === "rejected") {
                        badgeColor = "#ef4444";
                        badgeBg = "rgba(239, 68, 68, 0.1)";
                        statusText = "สอบไม่ผ่าน";
                      } else if (app.status === "approved") {
                        badgeColor = "#10b981";
                        badgeBg = "rgba(16, 185, 129, 0.1)";
                        statusText = "สอบผ่าน";
                      }

                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedHistoryApp(app)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "6px",
                            background: isSelected ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                            border: `1px solid ${isSelected ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "transparent"}`,
                            cursor: "pointer",
                            marginBottom: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            transition: "all 0.15s"
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: "700", color: isSelected ? "var(--accent)" : "#ffffff" }}>
                              {app.ic_firstname} {app.ic_lastname}
                            </span>
                            <span style={{ fontSize: "0.6rem", color: badgeColor, background: badgeBg, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              {statusText}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.35)", fontSize: "0.64rem" }}>
                            <span>คิวลำดับที่: {app.queue_number}</span>
                            <span>{new Date(app.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Column: Clipboard Paper Form Render */}
              <div style={{ background: "rgba(6, 11, 20, 0.4)", overflowY: "auto", padding: "32px", display: "flex", justifyContent: "center", alignItems: "flex-start" }} className="portal-custom-scrollbar">
                {selectedHistoryApp ? (
                  <div style={{
                    width: "100%",
                    maxWidth: "520px",
                    background: "linear-gradient(to bottom, #090f1d, #0d1527)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "10px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    padding: "24px 28px",
                    position: "relative"
                  }}>
                    {/* Clipboard Top Clip */}
                    <div style={{
                      position: "absolute",
                      top: "-10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "100px",
                      height: "18px",
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "4px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center"
                    }}>
                      <div style={{ width: "20px", height: "4px", borderRadius: "2px", background: "var(--accent)" }} />
                    </div>

                    {/* Paper Title Header */}
                    <div style={{ textAlign: "center", borderBottom: "2px dashed rgba(255,255,255,0.06)", paddingBottom: "14px", marginBottom: "20px", marginTop: "4px" }}>
                      <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Medical Personnel Recruitment Form
                      </span>
                      <h4 style={{ fontSize: "1.05rem", fontWeight: "800", color: "#ffffff", margin: "4px 0 2px 0" }}>
                        ใบประเมินและคัดกรองบุคคลเข้ากู้เวรแพทย์
                      </h4>
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>
                        ข้อมูลตัวละครปฏิบัติการด่านหน้าโรงพยาบาลประเสริฐประจำเมือง
                      </div>
                    </div>

                    {/* Form Layout Content */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Name & Age Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block" }}>ชื่อ-นามสกุลตัวละคร (IC Name)</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff" }}>
                            {selectedHistoryApp.ic_firstname} {selectedHistoryApp.ic_lastname}
                          </span>
                        </div>
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block" }}>อายุ (Age)</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff" }}>
                            {selectedHistoryApp.age} ปี ({selectedHistoryApp.age_type === "OC" ? "OC" : "IC"})
                          </span>
                        </div>
                      </div>

                      {/* Queue & Date Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block" }}>คิวสมัครปัจจุบัน (Queue No.)</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--accent)" }}>
                            # {selectedHistoryApp.queue_number}
                          </span>
                        </div>
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block" }}>วันที่ทำรายการ (Date Submitted)</span>
                          <span style={{ fontSize: "0.76rem", fontWeight: "700", color: "#ffffff" }}>
                            {new Date(selectedHistoryApp.created_at).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Previous Experience */}
                      <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "6px", padding: "12px 14px" }}>
                        <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "4px" }}>
                          ข้อมูลบันทึกประสบการณ์ปฏิบัติงานแพทย์
                        </span>
                        <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.85)", margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>
                          {selectedHistoryApp.previous_experience || "— ไม่มีบันทึกข้อมูลประสบการณ์ —"}
                        </p>
                      </div>

                      {/* Reason to Join */}
                      <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "6px", padding: "12px 14px" }}>
                        <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", display: "block", marginBottom: "4px" }}>
                          ความมุ่งมั่นและวัตถุประสงค์ในการสมัครเข้าหน่วยงาน
                        </span>
                        <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.85)", margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>
                          {selectedHistoryApp.reason_to_join}
                        </p>
                      </div>

                      {/* Status Stamp */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                        <div style={{
                          border: `2px solid ${
                            selectedHistoryApp.status === "pending" ? "var(--accent)" :
                            selectedHistoryApp.status === "called" ? "#f59e0b" :
                            selectedHistoryApp.status === "approved" ? "#10b981" :
                            selectedHistoryApp.status === "rejected" ? "#ef4444" : "#64748b"
                          }`,
                          borderRadius: "4px",
                          padding: "6px 16px",
                          fontWeight: "900",
                          fontSize: "0.85rem",
                          color: 
                            selectedHistoryApp.status === "pending" ? "var(--accent)" :
                            selectedHistoryApp.status === "called" ? "#f59e0b" :
                            selectedHistoryApp.status === "approved" ? "#10b981" :
                            selectedHistoryApp.status === "rejected" ? "#ef4444" : "#94a3b8",
                          background: "rgba(0,0,0,0.2)",
                          textTransform: "uppercase",
                          transform: "rotate(-4deg)",
                          opacity: 0.85,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                        }}>
                          {
                            selectedHistoryApp.status === "pending" ? "รอดำเนินการ" :
                            selectedHistoryApp.status === "called" ? "เรียกสอบแล้ว" :
                            selectedHistoryApp.status === "approved" ? "สอบผ่าน" :
                            selectedHistoryApp.status === "rejected" ? "สอบไม่ผ่าน" : "หมดอายุการตรวจสอบ"
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                    <ClipboardList size={40} style={{ margin: "0 auto 12px auto", opacity: 0.3, display: "block" }} />
                    <span style={{ fontSize: "0.76rem" }}>เลือกรายชื่อฝั่งซ้ายเพื่อเรียกดูฟอร์มประวัติการสมัคร</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* React Portal Application Form Modal */}
      {mounted && isAppModalOpen && createPortal(
        <div className="portal-centered-modal-overlay" onClick={resetAppModal}>
          <div className="portal-centered-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", width: "90vw", maxHeight: "85vh", overflowY: "auto" }}>
            <button onClick={resetAppModal} className="portal-modal-close-btn" style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}>
              <X size={18} />
            </button>

            {/* Step 1: Terms & Conditions */}
            {appStep === 1 && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto" }}>
                    <ClipboardList size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <h3 style={{ color: "#ffffff", fontSize: "1rem", fontWeight: "700", margin: "0 0 6px 0" }}>{recruitmentTerms.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>{recruitmentTerms.subtext}</p>
                </div>

                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "16px", marginBottom: "20px", fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", lineHeight: "1.7" }}>
                  <div style={{ fontWeight: "700", color: "#ffffff", marginBottom: "8px", fontSize: "0.78rem" }}>{recruitmentTerms.terms_title}</div>
                  <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {(recruitmentTerms.items || []).map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={resetAppModal} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontSize: "0.76rem", cursor: "pointer", fontFamily: "inherit" }}>
                    ยกเลิก
                  </button>
                  <button onClick={() => setAppStep(2)} style={{ flex: 2, padding: "10px", background: "var(--accent)", border: "none", borderRadius: "4px", color: "#ffffff", fontSize: "0.76rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>
                    ฉันยินยอมและรับทราบเงื่อนไข
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Application Form */}
            {appStep === 2 && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto" }}>
                    <UserPlus size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <h3 style={{ color: "#ffffff", fontSize: "1rem", fontWeight: "700", margin: "0 0 6px 0" }}>แบบฟอร์มสมัครแพทย์</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>กรอกข้อมูลให้ครบถ้วนเพื่อเข้าสู่ระบบคิวสอบ</p>
                </div>

                {appError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "4px", padding: "8px 12px", marginBottom: "14px", fontSize: "0.7rem", color: "#fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    {appError}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Discord UID */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>Discord UID <span style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      type="text"
                      placeholder="ตัวอย่าง: 123456789012345678"
                      value={appForm.discord_uid}
                      onChange={(e) => setAppForm(p => ({ ...p, discord_uid: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit" }}
                    />
                    <div style={{ marginTop: "6px", background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius: "4px", padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                        <Info size={10} style={{ color: "var(--accent)" }} />
                        <span style={{ fontSize: "0.62rem", fontWeight: "700", color: "var(--accent)" }}>วิธีหา Discord UID</span>
                      </div>
                      <ol style={{ margin: 0, paddingLeft: "14px", fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}>
                        <li>เปิด Discord แล้วไปที่ <strong style={{ color: "rgba(255,255,255,0.6)" }}>Settings (ตั้งค่า)</strong></li>
                        <li>ไปที่ <strong style={{ color: "rgba(255,255,255,0.6)" }}>Advanced (ขั้นสูง)</strong> แล้วเปิด <strong style={{ color: "rgba(255,255,255,0.6)" }}>Developer Mode</strong></li>
                        <li>กลับไปหน้า Server แล้ว<strong style={{ color: "rgba(255,255,255,0.6)" }}>คลิกขวาที่ชื่อตัวเอง</strong></li>
                        <li>กด <strong style={{ color: "rgba(255,255,255,0.6)" }}>Copy User ID</strong> แล้วนำมาวางในช่องนี้</li>
                      </ol>
                    </div>
                  </div>

                  {/* IC Name */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>ชื่อ IC <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="text"
                        placeholder="ชื่อตัวละคร"
                        value={appForm.ic_firstname}
                        onChange={(e) => setAppForm(p => ({ ...p, ic_firstname: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>นามสกุล IC <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="text"
                        placeholder="นามสกุลตัวละคร"
                        value={appForm.ic_lastname}
                        onChange={(e) => setAppForm(p => ({ ...p, ic_lastname: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                  </div>

                  {/* Age */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>อายุ <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="text"
                        placeholder="อายุตัวละคร / ของจริง"
                        value={appForm.age}
                        onChange={(e) => setAppForm(p => ({ ...p, age: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>ประเภท</label>
                      <select
                        value={appForm.age_type}
                        onChange={(e) => setAppForm(p => ({ ...p, age_type: e.target.value as "IC" | "OC" }))}
                        style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit" }}
                      >
                        <option value="IC">IC (ตัวละคร)</option>
                        <option value="OC">OC (ของจริง)</option>
                      </select>
                    </div>
                  </div>

                  {/* Previous Experience */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>เคยเป็นหน่วยงานแพทย์มาก่อนหรือไม่?</label>
                    <textarea
                      placeholder="ระบุรายละเอียดประสบการณ์ หรือพิมพ์ 'ไม่เคย'"
                      value={appForm.previous_experience}
                      onChange={(e) => setAppForm(p => ({ ...p, previous_experience: e.target.value }))}
                      rows={2}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit", resize: "vertical" }}
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>อยากเป็นหน่วยงานแพทย์ เพราะอะไร? <span style={{ color: "#ef4444" }}>*</span></label>
                    <textarea
                      placeholder="บอกเหตุผลที่อยากเข้าร่วมหน่วยงานแพทย์"
                      value={appForm.reason_to_join}
                      onChange={(e) => setAppForm(p => ({ ...p, reason_to_join: e.target.value }))}
                      rows={3}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", color: "#fff", fontSize: "0.76rem", outline: "none", fontFamily: "inherit", resize: "vertical" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={() => setAppStep(1)} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.5)", fontSize: "0.76rem", cursor: "pointer", fontFamily: "inherit" }}>
                    <ArrowLeft size={12} style={{ marginRight: "4px" }} />
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handleApplicationSubmit}
                    disabled={appSubmitting}
                    style={{ flex: 2, padding: "10px", background: appSubmitting ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "var(--accent)", border: "none", borderRadius: "4px", color: "#ffffff", fontSize: "0.76rem", fontWeight: "700", cursor: appSubmitting ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <Send size={14} />
                    {appSubmitting ? "กำลังส่ง..." : "ยืนยันส่งแบบฟอร์ม"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success + Queue Info */}
            {appStep === 3 && appResult && (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                  <CheckCircle size={28} style={{ color: "#10b981" }} />
                </div>
                <h3 style={{ color: "#ffffff", fontSize: "1rem", fontWeight: "700", margin: "0 0 6px 0" }}>ส่งใบสมัครสำเร็จ!</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", marginBottom: "20px" }}>ใบสมัครของคุณถูกส่งเข้าสู่ระบบเรียบร้อยแล้ว</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  <div style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius: "6px", padding: "14px" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "var(--accent)" }}>{appResult.totalPending || 0}</div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>คิวสอบทั้งหมด</div>
                  </div>
                  <div style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "6px", padding: "14px" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#10b981" }}>{appResult.application?.queue_number || 0}</div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>ลำดับคิวของคุณ</div>
                  </div>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: "6px", padding: "14px", marginBottom: "20px", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#f59e0b" }}>ข้อควรทราบ</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)", lineHeight: "1.7" }}>
                    <li>หากไม่มาเข้ารับการสอบ<strong style={{ color: "#f59e0b" }}>ภายใน 48 ชั่วโมง</strong> ระบบจะทำการลบข้อมูลผู้สมัครออกโดยอัตโนมัติ</li>
                    <li>คุณจะต้องกรอกแบบฟอร์มใหม่เพื่อเข้ารับการสอบอีกครั้ง</li>
                    <li>กรุณารอการแจ้งเตือนเรียกสอบผ่าน Discord ของคุณ</li>
                  </ul>
                </div>

                <button onClick={resetAppModal} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", color: "rgba(255,255,255,0.6)", fontSize: "0.76rem", cursor: "pointer", fontFamily: "inherit" }}>
                  ปิดหน้าต่าง
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* News Details Modal */}
      {mounted && isNewsModalOpen && selectedNews && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.65)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}
        onClick={() => setIsNewsModalOpen(false)}
        >
          <div style={{
            width: "100%",
            maxWidth: "600px",
            background: "linear-gradient(to bottom, #090f1d, #0d1527)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Banner Image */}
            {selectedNews.image && (
              <div style={{ width: "100%", height: "240px", position: "relative", overflow: "hidden" }}>
                <img src={selectedNews.image} alt={selectedNews.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(9, 15, 29, 0.95))" }} />
                {/* Close Button */}
                <button 
                  onClick={() => setIsNewsModalOpen(false)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)"}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Content Container */}
            <div style={{ padding: "24px", position: "relative" }}>
              {!selectedNews.image && (
                <button 
                  onClick={() => setIsNewsModalOpen(false)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.6)",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                >
                  <X size={16} />
                </button>
              )}
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.6rem", color: selectedNews.tagColor, fontWeight: "800", background: `${selectedNews.tagColor}15`, border: `1px solid ${selectedNews.tagColor}30`, padding: "2px 6px", borderRadius: "4px" }}>
                  {selectedNews.tag}
                </span>
                <span style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)" }}>
                  {selectedNews.date}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)" }}>
                  <Eye size={12} /> {selectedNews.views}
                </span>
              </div>
              
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", margin: "0 0 16px 0", lineHeight: "1.4" }}>
                {selectedNews.title}
              </h2>
              
              <div style={{
                fontSize: "0.85rem",
                color: "rgba(255, 255, 255, 0.85)",
                lineHeight: "1.7",
                maxHeight: "300px",
                overflowY: "auto",
                whiteSpace: "pre-line",
                paddingRight: "8px"
              }}
              className="portal-custom-scrollbar"
              >
                {selectedNews.content || selectedNews.desc}
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  onClick={() => setIsNewsModalOpen(false)}
                  style={{
                    padding: "8px 20px",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "0.76rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--accent-light)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
