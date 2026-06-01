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
  LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [blacklistSearchResult, setBlacklistSearchResult] = useState<any | null>(null);

  // Layout States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Image Slideshow Banner State
  const [activeImageSlide, setActiveImageSlide] = useState(0);

  const [slides] = useState<any[]>(() => {
    if (landingPageData?.slides && landingPageData.slides.length > 0) {
      return landingPageData.slides;
    }
    return [
      {
        image: "/images/ems_hero_bg.png",
        tag: "LOS SANTOS MEDICAL SERVICE",
        title: "เราพร้อมดูแล และช่วยเหลือประชาชนในทุกสถานการณ์",
        description: "ยินดีต้อนรับสู่ศูนย์บริการการแพทย์นครลอสซานโตส"
      }
    ];
  });

  const [newsItems] = useState<any[]>(landingPageData?.news || []);
  const [forumTopics] = useState<any[]>(landingPageData?.forum || []);

  // Fetch Blacklist data
  async function fetchBlacklist() {
    setBlacklistLoading(true);
    try {
      const { data } = await supabase
        .from("blacklist_records")
        .select("*")
        .eq("status", "active")
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

  // Handle Blacklist Search
  const handleBlacklistSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistSearch.trim()) {
      setBlacklistSearchResult(null);
      return;
    }
    const term = blacklistSearch.toLowerCase().trim();
    const match = blacklistData.find((item) => {
      return (
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.phone && item.phone.toLowerCase().includes(term)) ||
        (item.gang && item.gang.toLowerCase().includes(term))
      );
    });
    setBlacklistSearchResult(match || "no_match");
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

  // Group active doctors by rank
  let doctorCount = 0;
  let nurseCount = 0;
  let emtCount = 0;

  activeDoctors.forEach((doc) => {
    const rank = (doc.rank || "").toLowerCase();
    if (rank.includes("nurse") || rank.includes("พยาบาล")) {
      nurseCount++;
    } else if (rank.includes("emt") || rank.includes("rescue") || rank.includes("กู้ชีพ") || rank.includes("กู้ภัย")) {
      emtCount++;
    } else {
      doctorCount++;
    }
  });

  // Blacklist card resolution
  const activeBlacklistRecord = blacklistSearchResult === "no_match" 
    ? null 
    : blacklistSearchResult || blacklistData[0] || null;

  const displayShifts = recentShifts;

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
              color: "#3b82f6"
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
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: "4px",
                    color: "#ffffff",
                    fontSize: "0.76rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#2563eb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#3b82f6"; }}
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
      backgroundColor: "#030712",
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
              <Activity size={32} style={{ color: "#3b82f6" }} />
            )}
            <div>
              <h2 style={{ fontSize: "0.95rem", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "0.5px", lineHeight: "1.1" }}>
                LOS SANTOS
              </h2>
              <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Medical Service
              </span>
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
          <a href="#discussion-section" className="portal-sidebar-link">
            <MessageSquare size={16} />
            <span>บอร์ดสนทนา</span>
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
            <span style={{ color: "#3b82f6" }}>●</span> ระบบแจ้งเหตุฉุกเฉิน
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "#3b82f6" }}>●</span> แผนที่โรงพยาบาล
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "#3b82f6" }}>●</span> คู่มือการปฏิบัติงาน
          </a>
          <a href="#" className="portal-quick-link-item">
            <span style={{ color: "#3b82f6" }}>●</span> ดาวน์โหลดเอกสาร
          </a>

          {/* Join us promo */}
          <div className="portal-sidebar-promo">
            <div className="portal-sidebar-promo-text">มาเป็นส่วนหนึ่งกับเรา ร่วมช่วยเหลือประชาชนในเมือง</div>
            <button className="portal-sidebar-promo-btn" onClick={() => setIsLoginModalOpen(true)}>
              สมัครเข้าร่วมหน่วยงาน
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
              <a href="#discussion-section" className="portal-header-nav-link">บอร์ด</a>
              <a href="/dashboard/rules" className="portal-header-nav-link">เกี่ยวกับเรา</a>
              <a href="#footer" className="portal-header-nav-link">ติดต่อเรา</a>
            </div>

            {/* Header right: Clock & Profile */}
            <div className="portal-header-clock-group">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} style={{ color: "#3b82f6" }} />
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
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "4px",
                    color: "#3b82f6",
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
                    <span className="web-slide-tag" style={{ background: "rgba(59, 130, 246, 0.15)", borderColor: "rgba(59, 130, 246, 0.3)", color: "#3b82f6" }}>
                      {slide.tag}
                    </span>
                    <h2 className="web-slide-title" style={{ fontSize: "1.7rem", marginBottom: "8px" }}>
                      {slide.title}
                    </h2>
                    <p className="web-slide-desc" style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>
                      {slide.description}
                    </p>
                    <div style={{ marginTop: "16px" }}>
                      <a href="/dashboard/rules" className="web-news-button" style={{ border: "none", background: "#3b82f6", color: "#ffffff", padding: "8px 16px" }}>
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
                      <div className="portal-onduty-card-val">{doctorCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">แพทย์</div>
                    </div>
                    <div className="portal-onduty-card">
                      <div className="portal-onduty-card-val nurse">{nurseCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">พยาบาล</div>
                    </div>
                    <div className="portal-onduty-card">
                      <div className="portal-onduty-card-val emt">{emtCount} <span style={{ fontSize: "0.65rem", fontWeight: "normal" }}>คน</span></div>
                      <div className="portal-onduty-card-label">EMT</div>
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

            {/* ROW 2: News List (1/3) + Forums list (1/3) + Blacklist Search (1/3) */}
            <div id="news-section" className="portal-grid-3-cols">
              
              {/* Column 1: News & Announcements */}
              <div style={{ background: "#090f1d", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={15} style={{ color: "#3b82f6" }} />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>ข่าวสาร & ประกาศ</h3>
                  </div>
                  <a href="#news-section" style={{ fontSize: "0.68rem", color: "#3b82f6", textDecoration: "none" }}>ดูทั้งหมด</a>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {newsItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 16px", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
                      ไม่มีข่าวสารหรือประกาศประชาสัมพันธ์ในขณะนี้
                    </div>
                  ) : (
                    newsItems.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "10px", borderBottom: idx < newsItems.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", paddingBottom: idx < newsItems.length - 1 ? "12px" : 0 }}>
                        <img src={item.image} alt={item.title} style={{ width: "64px", height: "64px", borderRadius: "4px", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.05)" }} />
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: "0.58rem", color: item.tagColor, fontWeight: "800", background: `${item.tagColor}15`, border: `1px solid ${item.tagColor}30`, padding: "1px 5px", borderRadius: "3px", display: "inline-block", marginBottom: "4px" }}>
                            {item.tag}
                          </span>
                          <h4 style={{ fontSize: "0.75rem", fontWeight: "700", color: "#ffffff", margin: "0 0 2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.title}
                          </h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
                            <span>{item.date}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "2px" }}><Eye size={10} /> {item.views}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Web Forum Discussions */}
              <div id="discussion-section" style={{ background: "#090f1d", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MessageSquare size={15} style={{ color: "#3b82f6" }} />
                    <h3 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#ffffff", margin: 0, textTransform: "uppercase" }}>บอร์ดสนทนาล่าสุด</h3>
                  </div>
                  <a href="#discussion-section" style={{ fontSize: "0.68rem", color: "#3b82f6", textDecoration: "none" }}>ดูทั้งหมด</a>
                </div>

                <div className="portal-forum-list">
                  {forumTopics.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 16px", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>
                      ไม่มีหัวข้อสนทนาล่าสุดในขณะนี้
                    </div>
                  ) : (
                    forumTopics.map((topic, idx) => (
                      <div key={idx} className="portal-forum-item">
                        <div style={{ minWidth: 0, paddingRight: "8px" }}>
                          <h4 className="portal-forum-title">{topic.title}</h4>
                          <span className="portal-forum-author">โดย {topic.author}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: "4px" }}>
                          <span className="portal-forum-reply">
                            <MessageSquare size={10} /> {topic.replies}
                          </span>
                          <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)" }}>{topic.time}</span>
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
                      background: "#3b82f6",
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

                {/* Profile Card Output */}
                {blacklistLoading ? (
                  <div style={{ textAlign: "center", padding: "24px 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                    กำลังสืบค้นฐานข้อมูล...
                  </div>
                ) : activeBlacklistRecord ? (
                  <div>
                    <div className="portal-blacklist-profile-card">
                      <div className="portal-blacklist-avatar-container">
                        {activeBlacklistRecord.avatarUrl ? (
                          <img src={activeBlacklistRecord.avatarUrl} alt="Avatar" className="portal-blacklist-avatar-image" />
                        ) : (
                          <User size={36} style={{ color: "rgba(255,255,255,0.15)" }} />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="portal-blacklist-badge">BLACKLIST</span>
                        <h4 className="portal-blacklist-name">{activeBlacklistRecord.name}</h4>
                        <div className="portal-blacklist-cid">Citizen ID: {activeBlacklistRecord.phone || "A8C123"}</div>
                        <div className="portal-blacklist-note">
                          <strong>หมายเหตุ:</strong> {activeBlacklistRecord.penalty}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                          <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)" }}>
                            วันที่บันทึก: {formatTimeHHMM(activeBlacklistRecord.created_at)}
                          </span>
                          <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#ef4444", fontFamily: "JetBrains Mono" }}>
                            {Number(activeBlacklistRecord.fine * (activeBlacklistRecord.multiplier || 1)).toLocaleString()} IC
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="portal-blacklist-warning-text">
                      *ข้อมูล BLACKLIST ใช้สำหรับการตรวจสอบภายในหน่วยงานเท่านั้น ห้ามนำข้อมูลไปใช้ในทางที่ผิด
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: "24px 16px",
                    background: "rgba(239, 68, 68, 0.02)",
                    border: "1px dashed rgba(239, 68, 68, 0.12)",
                    borderRadius: "6px",
                    textAlign: "center",
                    color: "rgba(239, 68, 68, 0.5)",
                    fontSize: "0.72rem"
                  }}>
                    ไม่พบข้อมูลประวัติบัญชีดำสำหรับคำค้นหานี้
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
                    <Clock size={15} style={{ color: "#3b82f6" }} />
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

              {/* Right Column: Citizen/EMS Promo banner card */}
              <div id="recruitment-section" className="portal-sidebar-promo" style={{
                background: "linear-gradient(to bottom, rgba(3, 7, 18, 0.8), rgba(3, 7, 18, 0.95)), url('/images/ems_hero_bg.png') center/cover",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "auto",
                minHeight: "220px",
                padding: "24px",
                margin: 0,
                textAlign: "left"
              }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#ffffff", margin: "0 0 4px 0" }}>ชีวิตคือหน้าที่</h3>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", lineHeight: "1.4", margin: 0 }}>
                    เราจะไม่ทอดทิ้งใครไว้ข้างหลัง มาร่วมเป็นหนึ่งในผู้ช่วยเหลือประชาชนชาวลอสซานโตสกับเรา
                  </p>
                </div>
                <div>
                  <a href="/dashboard/rules" className="web-news-button" style={{ border: "none", background: "#3b82f6", color: "#ffffff", padding: "10px 20px", width: "100%", justifyContent: "center" }}>
                    ดูรายละเอียดรับสมัคร
                  </a>
                </div>
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
              <p style={{ margin: 0 }}>© 2024 Los Santos Medical Service | All rights reserved.</p>
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
    </div>
  );
}
