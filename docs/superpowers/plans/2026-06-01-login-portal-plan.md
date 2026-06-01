# EMS Central Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the clock-in login page into an official EMS Central Portal landing page for both citizens (rules, fees, recruitment) and doctors (login and stats).

**Architecture:** Keep `src/app/page.tsx` as a Server Component for secure data pre-fetching (branding logo, authentication status) and login actions, while delegating the interactive portal features (slider, search filters, modals) to a new client component `src/components/PortalClient.tsx`. Styles will be colocated in `src/app/globals.css`.

**Tech Stack:** Next.js (App Router), NextAuth.js (v5), Lucide-react (icons), Supabase, Vanilla CSS.

---

## Proposed File Changes

### [globals.css](file:///f:/Clockin/src/app/globals.css)
Add portal UI layout tokens, slider animations, glassmorphic panel styling, pulse effects, and responsive breakpoints.

### [PortalClient.tsx](file:///f:/Clockin/src/components/PortalClient.tsx) [NEW]
Build the interactive landing page. Fetch live duty count, run the announcements slide carousel, and render rules, fees, and blacklist search overlays.

### [page.tsx](file:///f:/Clockin/src/app/page.tsx)
Replace old login boxes with the `<PortalClient />` container, passing server-authenticated login actions as props.

---

### Task 1: Add Portal Styles to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write styling code for the portal portal-grid, slider, LED pulse, and animations**

Append the following styles to `src/app/globals.css` around line 2100:

```css
/* ===== EMS Portal Styles ===== */
.portal-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  position: relative;
  z-index: 1;
}

.portal-wrapper {
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.portal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 16px;
}

.portal-logo-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.portal-title-text h1 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.portal-title-text span {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.portal-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .portal-grid {
    grid-template-columns: 1fr;
  }
}

/* LED Pulse Indicator */
.led-pulse-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
}

.led-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent);
  animation: ledPulse 2s infinite;
}

@keyframes ledPulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

/* Slider styling */
.portal-slider {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 32px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  transition: border-color 0.3s;
}

.portal-slider:hover {
  border-color: var(--border-glow);
}

.slide-content h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin-top: 8px;
  margin-bottom: 12px;
}

.slide-content p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

.slider-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.slider-dots {
  display: flex;
  gap: 8px;
}

.slider-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  cursor: pointer;
  transition: all 0.3s;
}

.slider-dot.active {
  background: var(--accent);
  width: 20px;
  border-radius: 4px;
}

.slider-arrow-btn {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.slider-arrow-btn:hover {
  border-color: var(--border-glow);
  color: #fff;
}

/* Grid menu links */
.widget-menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.widget-menu-item {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  backdrop-filter: blur(12px);
}

.widget-menu-item:hover {
  border-color: var(--border-glow);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.widget-menu-item h3 {
  font-size: 0.95rem;
  color: #fff;
  font-weight: 600;
}

.widget-menu-item p {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Modal Portal Backdrop */
.portal-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.portal-modal-container {
  width: 100%;
  max-width: 750px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  box-shadow: var(--shadow-elevated);
}

.portal-modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.portal-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.portal-modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.portal-modal-close-btn:hover {
  color: #fff;
}
```

- [ ] **Step 2: Commit global styles**

```bash
git add src/app/globals.css
git commit -m "style: add portal layout and carousel styles to globals.css"
```

---

### Task 2: Create PortalClient Component

**Files:**
- Create: `src/components/PortalClient.tsx`

- [ ] **Step 1: Write the PortalClient interactive component**

Write the complete code for `src/components/PortalClient.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  DollarSign, 
  UserX, 
  Users, 
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
      actionUrl: "https://discord.gg/ems-hospital" // In production can be linked to dynamic URL
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
          // Assuming API returns array of shifts, count active ones
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
      <div className="portal-wrapper">
        
        {/* System Header & Branding */}
        <header className="portal-header">
          <div className="portal-logo-group">
            <div className="sidebar-logo" style={{ padding: 0, margin: 0 }}>
              <div className="logo-icon" style={{ background: logoUrl ? "transparent" : undefined, boxShadow: logoUrl ? "none" : undefined }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="City Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
                ) : (
                  "🏥"
                )}
              </div>
            </div>
            <div className="portal-title-text">
              <h1>EMS CENTRAL PORTAL</h1>
              <span>Los Santos Medical Department</span>
            </div>
          </div>

          <div className="led-pulse-group">
            <span className="led-dot"></span>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-light)", fontWeight: "bold" }}>
              {activeCount !== null ? `มีแพทย์ปฏิบัติงาน ${activeCount} ท่าน` : "คลังข้อมูลแพทย์กลาง"}
            </span>
          </div>
        </header>

        {/* Main Grid Split */}
        <main className="portal-grid">
          
          {/* Left Column: Carousel Board */}
          <section className="portal-slider">
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
              <h2>{slides[activeSlide].title}</h2>
              <p>{slides[activeSlide].description}</p>
            </div>

            <div className="slider-controls">
              <div className="slider-dots">
                {slides.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`slider-dot ${idx === activeSlide ? "active" : ""}`}
                    onClick={() => setActiveSlide(idx)}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  className="slider-arrow-btn"
                  onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                >
                  <ArrowLeft size={16} />
                </button>
                <button 
                  className="slider-arrow-btn"
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
          </section>

          {/* Right Column: Portal Utilities & Login */}
          <section style={{ display: "flex", flex-direction: "column", gap: "24px" }}>
            
            {/* Quick Action Navigation Grid */}
            <div className="widget-menu-grid">
              <div className="widget-menu-item" onClick={() => setActiveModal("rules")}>
                <div style={{ fontSize: "1.5rem" }}>📜</div>
                <h3>กฎระเบียบแพทย์สาธารณะ</h3>
                <p>เปิดอ่านคู่มือระเบียบการปฏิบัติตนและวินัยแพทย์กลางในเวปไซต์</p>
              </div>

              <div className="widget-menu-item" onClick={() => setActiveModal("fees")}>
                <div style={{ fontSize: "1.5rem" }}>💊</div>
                <h3>อัตราค่ารักษาพยาบาล</h3>
                <p>ตรวจสอบอัตราค่าธรรมเนียมหัตถการตามโซนพื้นที่นโยบาย</p>
              </div>

              <div className="widget-menu-item" onClick={() => setActiveModal("blacklist")}>
                <div style={{ fontSize: "1.5rem" }}>🚫</div>
                <h3>ตรวจสอบบัญชีดำ (Blacklist)</h3>
                <p>ค้นหาประวัติบุคคลหรือกลุ่มคนที่ติดแบล็กลิสต์หน่วยงานแพทย์</p>
              </div>

              <a href="https://discord.gg/ems-hospital" target="_blank" rel="noopener noreferrer" className="widget-menu-item" style={{ textDecoration: "none" }}>
                <div style={{ fontSize: "1.5rem" }}>💬</div>
                <h3>เข้าสู่ Discord หน่วยงาน</h3>
                <p>เข้าร่วมคอมมูนิตี้สำหรับข่าวสาร ประกาศด่วน และติดต่อแอดมิน</p>
              </a>
            </div>

            {/* Staff Secure Gateway */}
            <div className="login-card" style={{ padding: "24px", margin: 0, width: "100%" }}>
              <div className="login-icon" style={{ width: "48px", height: "48px", marginBottom: "12px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                <Lock size={20} style={{ color: "var(--accent)" }} />
              </div>
              <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: "bold", marginBottom: "4px" }}>Staff Operations Portal</h3>
              <p style={{ color: var(--text-muted), fontSize: "0.75rem", marginBottom: "20px", lineHeight: "1.4" }}>
                ระบบล็อกอินความปลอดภัยสูงผ่าน Discord สำหรับแพทย์ที่ได้รับแต่งตั้งในกลุ่มดิสคอร์ดทางการของโรงพยาบาลเท่านั้น
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
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
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
                    padding: "8px"
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
          </section>
        </main>

      </div>

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
                    <li><b>การรักษา:</b> แพทย์ต้องรักษาตามคิวหัตถการ ไม่ลัดคิว ยกเว้นเคสฉุกเฉินระดับ ⚠️ แดง</li>
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
```

- [ ] **Step 2: Commit new Client Component**

```bash
git add src/components/PortalClient.tsx
git commit -m "feat: create PortalClient layout, live counters, modals, and blacklist lookup"
```

---

### Task 3: Overhaul page.tsx with PortalClient

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace old login elements in page.tsx**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PortalClient } from "@/components/PortalClient";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const resolvedSearchParams = await searchParams;
  const error = typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : undefined;

  let logoUrl = "";
  try {
    const { data: logoSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "theme_logo_url")
      .single();
    if (logoSetting?.value) {
      logoUrl = logoSetting.value;
    }
  } catch (err) {
    console.error("[LoginPage Logo Fetch] Error:", err);
  }

  async function handleAdminLogin(formData: FormData) {
    "use server";
    await signIn("admin-login", { 
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard" 
    });
  }

  async function handleDiscordLogin() {
    "use server";
    await signIn("discord", { redirectTo: "/dashboard" });
  }

  return (
    <PortalClient 
      logoUrl={logoUrl} 
      error={error} 
      onAdminLogin={handleAdminLogin} 
      onDiscordLogin={handleDiscordLogin} 
    />
  );
}
```

- [ ] **Step 2: Verify production build runs successfully**

Run: `npm run build`
Expected: Compile successfully with 0 TypeScript/Turbopack errors.

- [ ] **Step 3: Run anti-pattern checks**

Run: `npx impeccable detect src`
Expected: 0 UI anti-patterns found.

- [ ] **Step 4: Commit changes and push**

```bash
git add src/app/page.tsx
git commit -m "feat: wire Server Actions to PortalClient in page.tsx, completing portal landing page overhaul"
git push
```
