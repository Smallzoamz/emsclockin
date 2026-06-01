"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  Lock, 
  X,
  Search,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PortalClientProps {
  logoUrl: string;
  error?: string;
  onAdminLogin: (formData: FormData) => Promise<void>;
  onDiscordLogin: () => Promise<void>;
}

export function PortalClient({ 
  logoUrl, 
  error, 
  onAdminLogin, 
  onDiscordLogin 
}: PortalClientProps) {
  // Carousel State
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = [
    {
      badge: "🏥 รับสมัครบุคลากรทางการแพทย์",
      title: "เปิดรับสมัครแพทย์ EMS รุ่นที่ 15",
      description: "โรงพยาบาลกลางเปิดทดสอบความรู้และทักษะเพื่อบรรจุเข้ารับราชการเป็นแพทย์ประจำการเมืองประชารัฐ ตั้งแต่วันนี้ถึงวันที่ 15 มิถุนายนนี้เท่านั้น",
      actionText: "ส่งใบสมัครออนไลน์",
      actionUrl: "https://discord.gg/ems-hospital"
    },
    {
      badge: "📢 ประกาศคะแนนสตอรี่ล่าสุด",
      title: "สรุปตารางคะแนนและสถิติไฟท์ล่าสุด",
      description: "ตารางสรุปผลการปฏิบัติการหน่วยงานช่วยเหลือนอกสถานที่และสตอรี่ความร่วมมือคะแนนคู่ปะทะ สามารถตรวจสอบตารางคะแนนแบบเต็มได้ที่กลุ่มประชาสัมพันธ์",
      actionText: "อ่านรายละเอียดกฎสตอรี่",
      actionUrl: "#rules"
    },
    {
      badge: "⚠️ ข้อมูลฉุกเฉิน / ประชาสัมพันธ์",
      title: "แนวทางปฏิบัติเมื่อพบเคสหมดสติในจุดสุ่มเสี่ยง",
      description: "กรุณาแจ้งพิกัดและรายละเอียดผ่านสัญญาณวิทยุช่องหลัก และรอการอนุมัติความปลอดภัยจากตำรวจก่อนปฏิบัติงานช่วยเหลือนอกพื้นที่ทุกครั้ง",
      actionText: "ดาวน์โหลดคู่มือปฐมพยาบาล",
      actionUrl: "#fees"
    }
  ];

  // Auto-play Slider
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Live Counter State
  const [activeCount, setActiveCount] = useState<number | null>(null);
  useEffect(() => {
    async function fetchOnDuty() {
      try {
        const res = await fetch("/api/shifts/status");
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.activeShifts)) {
            setActiveCount(data.activeShifts.length);
          } else if (typeof data.activeCount === "number") {
            setActiveCount(data.activeCount);
          } else {
            setActiveCount(0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch on-duty count:", err);
      }
    }
    fetchOnDuty();
    const poll = setInterval(fetchOnDuty, 30000); // Check every 30s
    return () => clearInterval(poll);
  }, []);

  // Modals States
  const [activeModal, setActiveModal] = useState<"rules" | "fees" | "blacklist" | null>(null);

  // Blacklist Search States
  const [blacklistSearch, setBlacklistSearch] = useState("");
  const [blacklistData, setBlacklistData] = useState<any[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);

  useEffect(() => {
    if (activeModal === "blacklist") {
      fetchBlacklist();
    }
  }, [activeModal]);

  async function fetchBlacklist() {
    setBlacklistLoading(true);
    try {
      const { data } = await supabase
        .from("blacklist_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setBlacklistData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBlacklistLoading(false);
    }
  }

  const filteredBlacklist = blacklistData.filter((item) => {
    const term = blacklistSearch.toLowerCase();
    return (
      (item.person_name && item.person_name.toLowerCase().includes(term)) ||
      (item.gang_name && item.gang_name.toLowerCase().includes(term)) ||
      (item.reason && item.reason.toLowerCase().includes(term)) ||
      (item.doctor_name && item.doctor_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="portal-container">
      {/* 1. Branded Navigation Bar */}
      <nav className="portal-nav">
        <div className="portal-nav-wrapper">
          <div className="portal-logo-group">
            <div className="sidebar-logo" style={{ padding: 0, margin: 0 }}>
              <div className="logo-icon" style={{ background: logoUrl ? "transparent" : undefined, boxShadow: logoUrl ? "none" : undefined }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="City Logo" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                ) : (
                  "🏥"
                )}
              </div>
            </div>
            <div className="portal-title-text">
              <h1>LOS SANTOS MEDICAL</h1>
              <span>Emergency Services Department</span>
            </div>
          </div>

          <div className="portal-nav-links">
            <a href="#hero" className="portal-nav-link">หน้าแรก</a>
            <a href="#departments" className="portal-nav-link">แผนกกู้ชีพ</a>
            <a href="#citizen-services" className="portal-nav-link">บริการประชาชน</a>
            <a href="#announcements" className="portal-nav-link">ประกาศข่าวสาร</a>
            <a href="#staff-gateway" className="portal-nav-link">ช่องทางเจ้าหน้าที่</a>
          </div>

          <div className="portal-led-pulse-group">
            <span className="portal-led-dot"></span>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-light)", fontWeight: "bold" }}>
              {activeCount !== null ? `มีแพทย์ปฏิบัติงาน ${activeCount} ท่าน` : "คลังข้อมูลแพทย์กลาง"}
            </span>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section id="hero" className="portal-hero">
        <div className="portal-hero-bg"></div>
        <div className="portal-hero-overlay"></div>
        <div className="portal-hero-wrapper">
          <div className="portal-hero-grid">
            <div className="portal-hero-text">
              <h2>ศูนย์การแพทย์ฉุกเฉินนครลอสซานโตส</h2>
              <p>
                ยินดีต้อนรับสู่ระบบข้อมูลกลางสำหรับประชาชนและบุคลากรทางการแพทย์ 
                ตรวจสอบกฎระเบียบการปฏิบัติตนของแพทย์ อัตราค่าบริการรักษาพยาบาลรายบุคคล/กลุ่มแก๊ง 
                และตรวจสอบรายชื่อผู้ติดทำเนียบบัญชีดำอย่างเป็นทางการได้ทันที
              </p>
              <div className="portal-hero-actions">
                <a href="#staff-gateway" className="login-btn" style={{ textDecoration: "none", width: "auto", margin: 0, fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={16} /> เข้าสู่ระบบเจ้าหน้าที่
                </a>
                <button onClick={() => setActiveModal("rules")} className="login-btn" style={{ width: "auto", margin: 0, background: "transparent", border: "1px solid var(--border-subtle)", color: "#fff" }}>
                  📜 คู่มือกฎระเบียบแพทย์
                </button>
              </div>
            </div>

            {/* Live Stats Panel */}
            <div className="portal-stats-panel">
              <span className="portal-stats-title">🏥 สถานะการปฏิบัติงานสถานพยาบาล (Live Status)</span>
              
              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🟢</span>
                  <span>สถานะระบบกู้ภัยเมือง</span>
                </div>
                <span className="portal-stats-value" style={{ color: "var(--accent)" }}>ACTIVE</span>
              </div>

              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🚑</span>
                  <span>แพทย์ขึ้นเวรสูงสุดวันนี้</span>
                </div>
                <span className="portal-stats-value">{activeCount !== null ? activeCount + 3 : 8} ท่าน</span>
              </div>

              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🛏️</span>
                  <span>เตียงผู้ป่วยว่างที่รองรับ</span>
                </div>
                <span className="portal-stats-value">32 / 40 เตียง</span>
              </div>

              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>⏱️</span>
                  <span>เวลาตอบสนองเหตุฉุกเฉิน</span>
                </div>
                <span className="portal-stats-value">&lt; 3 นาที</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Medical Services & Departments Section */}
      <section id="departments" className="portal-section alt-bg">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>แผนกบริการทางการแพทย์</h2>
            <p>ความปลอดภัยและความเป็นมืออาชีพในการช่วยเหลือพลเมืองนครลอสซานโตส</p>
          </div>

          <div className="portal-dept-grid">
            <div className="portal-dept-card">
              <div className="portal-dept-icon">🚑</div>
              <h3>แผนกอุบัติเหตุและฉุกเฉิน (Trauma &amp; Emergency)</h3>
              <p>บริการกู้ชีพฉุกเฉินเคลื่อนที่เร็วในพื้นที่เมืองและต่างจังหวัด ช่วยเหลือเคสหัวใจหยุดเต้น (CPR) เคสปะทะไฟท์ และอุบัติเหตุร้ายแรงตลอด 24 ชั่วโมง</p>
            </div>

            <div className="portal-dept-card">
              <div className="portal-dept-icon">🏥</div>
              <h3>แผนกศัลยกรรมและหัตถการ (General Surgery &amp; Care)</h3>
              <p>ทีมศัลยแพทย์ที่มีความเชี่ยวชาญสูงในการผ่าตัด เย็บแผลทำแผลในห้องปฏิบัติการปลอดเชื้อ และการตรวจประเมินสุขภาพคนไข้หลังประสบเหตุ</p>
            </div>

            <div className="portal-dept-card">
              <div className="portal-dept-icon">🚁</div>
              <h3>หน่วยส่งกลับกู้ชีพทางอากาศ (Air Ambulance Unit)</h3>
              <p>เฮลิคอปเตอร์กู้ภัยกู้ชีพฉุกเฉินพร้อมขนย้ายผู้ป่วยวิกฤตจากจุดสุ่มเสี่ยง พื้นที่สูงชัน บนยอดเขา หรือพื้นที่ห่างไกลที่รถเข้าไม่ถึงอย่างปลอดภัย</p>
            </div>

            <div className="portal-dept-card">
              <div className="portal-dept-icon">💊</div>
              <h3>แผนกเภสัชกรรมกลาง (Pharmacy &amp; Diagnostics)</h3>
              <p>ระบบตรวจวินิจฉัยโรคและจ่ายยาเวชภัณฑ์ที่มีคุณภาพสูง จ่ายยาควบคุมพิเศษ ยาระงับอาการประสาท และน้ำยาทำความสะอาดแผลแก่คนไข้และคุณหมอ</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Citizen Utilities Section */}
      <section id="citizen-services" className="portal-section">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>บริการประชาชนและประชาสัมพันธ์</h2>
            <p>เข้าถึงข้อมูลข่าวสาร อัตราค่าบริการ และกฎระเบียบของหน่วยงานแพทย์ฉุกเฉินได้ทันที</p>
          </div>

          <div className="portal-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
            {/* Announcements sliding carousel inside a wide block */}
            <div id="announcements" className="portal-slider">
              <div className="slide-content">
                <span style={{ 
                  fontSize: "0.7rem", 
                  background: "color-mix(in srgb, var(--accent) 15%, transparent)", 
                  border: "1px solid var(--border-subtle)", 
                  color: "var(--accent-light)", 
                  padding: "4px 10px", 
                  borderRadius: "4px",
                  fontWeight: "bold" 
                }}>
                  {slides[activeSlide].badge}
                </span>
                <h3>{slides[activeSlide].title}</h3>
                <p>{slides[activeSlide].description}</p>
              </div>

              <div className="portal-slider-controls">
                <div className="portal-slider-dots">
                  {slides.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`portal-slider-dot ${idx === activeSlide ? "active" : ""}`}
                      onClick={() => setActiveSlide(idx)}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="portal-slider-arrow-btn"
                    onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button 
                    className="portal-slider-arrow-btn"
                    onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border-subtle)", paddingTop: "20px" }}>
                {slides[activeSlide].actionUrl.startsWith("http") ? (
                  <a 
                    href={slides[activeSlide].actionUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="login-btn"
                    style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", width: "auto", margin: 0 }}
                  >
                    {slides[activeSlide].actionText} <ExternalLink size={14} />
                  </a>
                ) : (
                  <button 
                    className="login-btn"
                    style={{ width: "auto", margin: 0 }}
                    onClick={() => {
                      const dest = slides[activeSlide].actionUrl.substring(1);
                      setActiveModal(dest as any);
                    }}
                  >
                    {slides[activeSlide].actionText}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="widget-menu-item" onClick={() => setActiveModal("rules")}>
                <div style={{ fontSize: "1.5rem" }}>📜</div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "4px" }}>กฎระเบียบแพทย์สาธารณะ</h3>
                  <p style={{ fontSize: "0.75rem" }}>เปิดอ่านคู่มือระเบียบการปฏิบัติตนและวินัยแพทย์กลางในเวปไซต์</p>
                </div>
              </div>

              <div className="widget-menu-item" onClick={() => setActiveModal("fees")}>
                <div style={{ fontSize: "1.5rem" }}>💊</div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "4px" }}>อัตราค่ารักษาพยาบาล</h3>
                  <p style={{ fontSize: "0.75rem" }}>ตรวจสอบอัตราค่าธรรมเนียมหัตถการตามโซนพื้นที่นโยบาย</p>
                </div>
              </div>

              <div className="widget-menu-item" onClick={() => setActiveModal("blacklist")}>
                <div style={{ fontSize: "1.5rem" }}>🚫</div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "4px" }}>ตรวจสอบบัญชีดำ (Blacklist)</h3>
                  <p style={{ fontSize: "0.75rem" }}>ค้นหาประวัติบุคคลหรือกลุ่มคนที่ติดแบล็กลิสต์หน่วยงานแพทย์</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Staff Secure Access Section */}
      <section id="staff-gateway" className="portal-section alt-bg">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>Staff Operations Portal</h2>
            <p>ระบบควบคุมการปฏิบัติงานภายในเฉพาะเจ้าหน้าที่โรงพยาบาลกลางเท่านั้น</p>
          </div>

          <div style={{ maxWidth: "550px", margin: "0 auto" }}>
            <div className="login-card" style={{ padding: "32px", margin: 0, width: "100%" }}>
              <div className="login-icon" style={{ width: "48px", height: "48px", marginBottom: "16px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                <Lock size={20} style={{ color: "var(--accent)" }} />
              </div>
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "8px" }}>เข้าสู่ระบบสำหรับแพทย์</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "24px", lineHeight: "1.5" }}>
                กรุณาล็อกอินผ่าน Discord ที่ได้รับการยืนยันยศและสิทธิ์แพทย์ในดิสคอร์ดหลักของโรงพยาบาลแล้ว 
                ระบบจะบันทึกชั่วโมงเวร คำนวณเบี้ยเลี้ยง และบันทึกประวัติการส่งเคสเข้า Discord Log โดยอัตโนมัติ
              </p>

              {error && (
                <div className="error-banner" style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  fontSize: "0.75rem",
                  color: "#fca5a5",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>⚠️</span>
                  <span>
                    {error === "AccessDenied" 
                      ? "บัญชี Discord ของคุณไม่มีชื่ออยู่ในกลุ่มแพทย์เซิร์ฟเวอร์ที่กำหนด" 
                      : "การเข้าสู่ระบบล้มเหลว"}
                  </span>
                </div>
              )}

              {/* Discord Login Trigger */}
              <button 
                onClick={() => onDiscordLogin()} 
                className="login-btn discord" 
                id="discord-login-btn"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 24px" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                </svg>
                เข้าสู่ระบบสำหรับเจ้าหน้าที่แพทย์
              </button>

              {/* Secure Credentials-based admin accordion */}
              <details style={{ width: "100%", marginTop: "16px" }}>
                <summary 
                  className="login-btn" 
                  style={{ 
                    background: "transparent", 
                    color: "var(--text-muted)", 
                    border: "1px dashed var(--border-subtle)", 
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    padding: "10px"
                  }}
                >
                  🔒 Admin Portal Secure Access
                </summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    onAdminLogin(formData);
                  }}
                  style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <input 
                    type="text" 
                    name="username" 
                    placeholder="ชื่อผู้ใช้ Admin (เช่น admin)"
                    defaultValue="admin"
                    required
                    style={{ 
                      width: "100%",
                      padding: "8px 12px", 
                      borderRadius: "var(--radius-sm)", 
                      border: "1px solid var(--border-subtle)", 
                      background: "var(--bg-dark)",
                      color: "white",
                      outline: "none",
                      fontSize: "0.75rem"
                    }} 
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="รหัสผ่าน Admin"
                      required
                      style={{ 
                        flex: 1, 
                        padding: "8px 12px", 
                        borderRadius: "var(--radius-sm)", 
                        border: "1px solid var(--border-subtle)", 
                        background: "var(--bg-dark)",
                        color: "white",
                        outline: "none",
                        fontSize: "0.75rem"
                      }} 
                    />
                    <button 
                      type="submit" 
                      className="login-btn" 
                      style={{ width: "auto", padding: "0 16px", margin: 0, fontSize: "0.75rem" }}
                    >
                      เข้าสู่ระบบ
                    </button>
                  </div>
                </form>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-wrapper">
          <p>© 2026 Los Santos Emergency Medical Department. All rights reserved.</p>
          <div className="portal-footer-links">
            <a href="https://discord.gg/ems-hospital" target="_blank" rel="noopener noreferrer" className="portal-footer-link">
              เข้าสู่ดิสคอร์ดหน่วยงาน
            </a>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>·</span>
            <span className="portal-footer-link" style={{ cursor: "pointer" }}>ติดต่อแอดมิน</span>
          </div>
        </div>
      </footer>

      {/* Interactive Modal Portals */}
      {activeModal && (
        <div className="portal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="portal-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h3 style={{ color: "#fff", margin: 0 }}>
                {activeModal === "rules" && "📜 กฎระเบียบและแนวทางการปฏิบัติงานแพทย์"}
                {activeModal === "fees" && "💊 อัตราค่าบริการทางการแพทย์กลาง (Medical Fees)"}
                {activeModal === "blacklist" && "🚫 ค้นหาทำเนียบบัญชีดำ (EMS Blacklist)"}
              </h3>
              <button className="portal-modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="portal-modal-body">
              {activeModal === "rules" && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                  <p style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                    สำหรับบุคคลทั่วไปและผู้เล่นในเซิร์ฟเวอร์ สามารถตรวจสอบหลักเกณฑ์และข้อปฏิบัติต่างๆ ได้ดังนี้:
                  </p>
                  <ul style={{ paddingLeft: "20px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li><b>การรักษา:</b> แพทย์ต้องรักษาตามคิวหัตถการ ไม่ลัดคิว ยกเว้นเคสฉุกเฉินระดับสีแดง</li>
                    <li><b>การคิดค่าบริการ:</b> บันทึกและแจ้งเรียกเก็บค่าบริการแก่คนไข้ตามเรทนโยบายโรงพยาบาลเมืองเท่านั้น</li>
                    <li><b>จรรยาบรรณแพทย์:</b> ห้ามแพร่งพรายความลับคนไข้ หรือกริยามารยาทที่ไม่ดีต่อประชาชนโดยเด็ดขาด</li>
                  </ul>
                  <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                    <a 
                      href="/dashboard/rules" 
                      className="login-btn" 
                      style={{ width: "auto", margin: 0, textDecoration: "none", fontSize: "0.8rem" }}
                    >
                      เปิดอ่านกฎระเบียบฉบับเต็มของหน่วยงาน <ChevronRight size={16} />
                    </a>
                  </div>
                </div>
              )}

              {activeModal === "fees" && (
                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6" }}>
                  <p style={{ color: "var(--text-primary)", fontWeight: "bold" }}>
                    อัตราค่ารักษาพยาบาลแบ่งตามโซนแผนที่หน่วยงานแพทย์:
                  </p>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "#fff", textAlign: "left" }}>
                        <th style={{ padding: "8px" }}>รายการรักษา</th>
                        <th style={{ padding: "8px" }}>โซนในเมือง</th>
                        <th style={{ padding: "8px" }}>โซนนอกเมือง</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px" }}>ปฐมพยาบาลเบื้องต้น (CPR)</td>
                        <td style={{ padding: "8px" }}>100 IC</td>
                        <td style={{ padding: "8px" }}>200 IC</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px" }}>เย็บแผลหัตถการ</td>
                        <td style={{ padding: "8px" }}>200 IC</td>
                        <td style={{ padding: "8px" }}>300 IC</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px" }}>จ่ายยาระงับอาการประสาท</td>
                        <td style={{ padding: "8px" }}>150 IC</td>
                        <td style={{ padding: "8px" }}>150 IC</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                    <a 
                      href="/dashboard/rules" 
                      className="login-btn" 
                      style={{ width: "auto", margin: 0, textDecoration: "none", fontSize: "0.8rem" }}
                    >
                      ดูแผนที่พิกัดค่ารักษา <ChevronRight size={16} />
                    </a>
                  </div>
                </div>
              )}

              {activeModal === "blacklist" && (
                <div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input 
                        type="text" 
                        placeholder="พิมพ์ค้นหาชื่อ, ชื่อแก๊ง หรือสาเหตุ..."
                        value={blacklistSearch}
                        onChange={(e) => setBlacklistSearch(e.target.value)}
                        style={{ 
                          width: "100%",
                          padding: "10px 12px 10px 36px", 
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--bg-primary)",
                          color: "#fff",
                          outline: "none",
                          fontSize: "0.8rem"
                        }}
                      />
                      <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
                    </div>
                  </div>

                  {blacklistLoading ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      กำลังดึงข้อมูล...
                    </div>
                  ) : filteredBlacklist.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      ไม่พบประวัติการติดแบล็กลิสต์
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {filteredBlacklist.map((item) => (
                        <div 
                          key={item.id} 
                          style={{ 
                            background: "rgba(239, 68, 68, 0.03)", 
                            border: "1px solid rgba(239, 68, 68, 0.15)", 
                            borderRadius: "var(--radius-sm)", 
                            padding: "12px",
                            fontSize: "0.75rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <strong style={{ color: "#fca5a5", fontSize: "0.8rem" }}>
                              ❌ {item.person_name || item.gang_name || "ไม่ระบุชื่อ"}
                            </strong>
                            <span style={{ color: "var(--text-muted)" }}>
                              {item.gang_name ? `แก๊ง: ${item.gang_name}` : "แบล็กลิสต์รายบุคคล"}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0", color: "var(--text-secondary)" }}>
                            <b>สาเหตุ:</b> {item.reason}
                          </p>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                            <span>ผู้ประกาศ: {item.doctor_name}</span>
                            <span>ค่าปรับค้าง: <span style={{ color: "var(--warning)" }}>{item.penalty_fine} IC</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
