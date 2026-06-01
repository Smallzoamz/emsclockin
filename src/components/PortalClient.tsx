"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, 
  Search, 
  Clock, 
  Activity, 
  Shield, 
  FileText,
  AlertTriangle,
  UserCheck,
  ArrowLeft,
  ArrowRight
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
  // Live Counter & Active Doctor Roster State
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [activeDoctors, setActiveDoctors] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  // Blacklist Search States
  const [blacklistSearch, setBlacklistSearch] = useState("");
  const [blacklistData, setBlacklistData] = useState<any[]>([]);
  const [blacklistLoading, setBlacklistLoading] = useState(false);

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
        }
      } catch (err) {
        console.error("Failed to fetch on-duty count:", err);
      }
    }
    fetchOnDuty();
    const poll = setInterval(fetchOnDuty, 30000); // Poll every 30s
    return () => clearInterval(poll);
  }, []);

  // Filter blacklist data based on search input
  const filteredBlacklist = blacklistData.filter((item) => {
    const term = blacklistSearch.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.gang && item.gang.toLowerCase().includes(term)) ||
      (item.penalty && item.penalty.toLowerCase().includes(term)) ||
      (item.created_by && item.created_by.toLowerCase().includes(term))
    );
  });

  // Slide carousel state for Announcements
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = React.useMemo(() => {
    const latest = blacklistData[0];
    const blacklistSlide = latest ? {
      badge: "🚫 LATEST BLACKLIST / บัญชีดำล่าสุด",
      title: `ตรวจพบการกระทำผิด: ${latest.name}`,
      description: `ข้อหา: ${latest.penalty || "ไม่ระบุ"} | ค่าปรับค้างจ่าย: ${Number(latest.fine * (latest.multiplier || 1)).toLocaleString()} IC | ประกาศโดยแพทย์: ${latest.created_by?.split("@")[0] || "ระบบ"}`,
      actionText: "ตรวจสอบรายชื่อแบล็กลิสต์",
      actionUrl: "#blacklist-section"
    } : {
      badge: "🚫 BLACKLIST STATUS",
      title: "ไม่พบประวัติผู้ติดแบล็กลิสต์ขณะนี้",
      description: "สภาพแวดล้อมความปลอดภัยดีเยี่ยม พลเมืองให้ความร่วมมือดีและไม่มีการทำร้ายร่างกายเจ้าหน้าที่แพทย์ขณะนี้",
      actionText: "เปิดเอกสารกฎระเบียบ",
      actionUrl: "/dashboard/rules"
    };

    return [
      blacklistSlide,
      {
        badge: "📢 HOSPITAL ANNOUNCEMENT / ประกาศจากโรงพยาบาล",
        title: "คู่มือกฎระเบียบและข้อปฏิบัติของหน่วยงานแพทย์",
        description: "โปรดอ่านกฎระเบียบและข้อตกลงในการปฏิบัติหน้าที่และการทำสตอรี่อย่างเคร่งครัดเพื่อรักษามาตรฐานการสวมบทบาทกู้ชีพ",
        actionText: "อ่านกฎของโรงพยาบาล",
        actionUrl: "/dashboard/rules"
      },
      {
        badge: "🚑 ON-DUTY OPERATIONS / รายงานยอดขึ้นเวร",
        title: `มีแพทย์ปฏิบัติงานขึ้นกะในเวลานี้ ${activeCount ?? 0} ท่าน`,
        description: "ระบบลงเวลาเข้าเวรอัตโนมัติ พลเมืองสามารถติดตามรายชื่อและตรวจสอบเวลาออนเวรของคุณหมอได้ที่ด้านล่าง",
        actionText: "ดูรายชื่อแพทย์ปฏิบัติการ",
        actionUrl: "#blacklist-section"
      }
    ];
  }, [blacklistData, activeCount]);

  // Slide Auto-play effect (6s interval)
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="portal-container" style={{
      backgroundColor: "#030712",
      backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.002) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.002) 1px, transparent 1px)",
      backgroundSize: "40px 40px"
    }}>
      {/* 1. Minimal Header */}
      <nav className="portal-nav" style={{
        background: "#090e1a",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "16px 24px",
        boxShadow: "none"
      }}>
        <div className="portal-nav-wrapper" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div className="portal-logo-group">
            <div className="logo-icon" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem"
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="City Logo" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
              ) : (
                <span>🩺</span>
              )}
            </div>
            <div className="portal-title-text">
              <h1 style={{ letterSpacing: "0.5px", color: "#ffffff", fontWeight: "700", fontSize: "1.05rem" }}>
                EMS MEDICAL PORTAL
              </h1>
            </div>
          </div>

          <div className="portal-nav-links" style={{ gap: "24px" }}>
            <a href="#hero" className="portal-nav-link" style={{ fontSize: "0.8rem" }}>หน้าแรก</a>
            <a href="/dashboard/rules" className="portal-nav-link" style={{ fontSize: "0.8rem" }}>กฎของโรงพยาบาล</a>
            <a href="#blacklist-section" className="portal-nav-link" style={{ fontSize: "0.8rem" }}>ประวัติบัญชีดำ</a>
            <a href="#staff-gateway" className="portal-nav-link" style={{ fontSize: "0.8rem" }}>ระบบหลังบ้าน</a>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "5px 12px",
            borderRadius: "4px"
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              background: "#00f0ff",
              borderRadius: "50%"
            }}></span>
            <span style={{ fontSize: "0.7rem", color: "#00f0ff", fontWeight: "600", fontFamily: "'Outfit', sans-serif" }}>
              {activeCount !== null ? `${activeCount} ACTIVE` : "STANDBY"}
            </span>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section id="hero" className="portal-hero" style={{
        minHeight: "35vh",
        display: "flex",
        alignItems: "center",
        padding: "48px 24px 24px 24px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)"
      }}>
        <div className="portal-hero-wrapper" style={{ width: "100%", maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ maxWidth: "680px", textAlign: "left" }}>
            <h2 style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#ffffff",
              lineHeight: "1.25",
              letterSpacing: "-0.015em",
              marginBottom: "12px"
            }}>
              ระบบบริการข้อมูลหน่วยงานแพทย์
            </h2>
            <p style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              lineHeight: "1.55",
              margin: 0
            }}>
              ศูนย์ปฏิบัติการข้อมูลกู้ชีพนครลอสซานโตส ค้นหารายชื่อแพทย์เวรปฏิบัติหน้าที่ในกะ ตรวจสอบทำเนียบประวัติผู้กระทำผิดบัญชีดำ และทางเข้าใช้ระบบบันทึกเวลาปฏิบัติงานของบุคลากรแพทย์
            </p>
          </div>
        </div>
      </section>

      <main className="portal-section-wrapper" style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 24px" }}>
        
        {/* 3. Recruitment Callout Banner */}
        <section style={{
          background: "#090f1d",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "8px",
          padding: "24px 32px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          boxShadow: "none"
        }}>
          <div style={{ flex: "1 1 450px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#ffffff", margin: "0 0 6px 0" }}>
              เปิดรับสมัครหน่วยงานแพทย์
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.45" }}>
              หากต้องการมีสิทธิ์สมัครเข้าร่วมหน่วยงานแพทย์ลอสซานโตส กรุณาเปิดศึกษาข้อปฏิบัติตามมาตรฐานและกฎของโรงพยาบาลอย่างละเอียด
            </p>
          </div>
          <div>
            <a 
              href="/dashboard/rules" 
              style={{
                background: "transparent",
                border: "1px solid #00f0ff",
                color: "#00f0ff",
                padding: "10px 20px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#00f0ff";
                e.currentTarget.style.color = "#030712";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#00f0ff";
              }}
            >
              <FileText size={14} /> เปิดอ่านกฎโรงพยาบาล
            </a>
          </div>
        </section>

        {/* News & Announcements Sliding Banner */}
        <section style={{
          background: "#090f1d",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "8px",
          padding: "24px 32px",
          marginBottom: "32px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "130px", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
              <span style={{
                fontSize: "0.65rem",
                color: "#00f0ff",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
                background: "rgba(0, 240, 255, 0.04)",
                border: "1px solid rgba(0, 240, 255, 0.15)",
                padding: "3px 8px",
                borderRadius: "3px"
              }}>
                {slides[activeSlide]?.badge}
              </span>
              
              {/* Navigation Arrows */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button 
                  onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    transition: "border-color 0.15s, color 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00f0ff"; e.currentTarget.style.color = "#00f0ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <ArrowLeft size={14} />
                </button>
                <button 
                  onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    transition: "border-color 0.15s, color 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00f0ff"; e.currentTarget.style.color = "#00f0ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "600", color: "#ffffff", margin: "6px 0" }}>
                {slides[activeSlide]?.title}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                {slides[activeSlide]?.description}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "14px" }}>
              {/* Manual Indicators */}
              <div style={{ display: "flex", gap: "6px" }}>
                {slides.map((_, idx) => (
                  <span 
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    style={{
                      width: "6px",
                      height: "6px",
                      background: idx === activeSlide ? "#00f0ff" : "rgba(255,255,255,0.12)",
                      borderRadius: "50%",
                      cursor: "pointer",
                      transition: "background 0.15s"
                    }}
                  />
                ))}
              </div>

              <a 
                href={slides[activeSlide]?.actionUrl}
                style={{
                  fontSize: "0.72rem",
                  color: "#00f0ff",
                  fontWeight: "600",
                  textDecoration: "none",
                  transition: "opacity 0.15s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
              >
                {slides[activeSlide]?.actionText} &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* 4. Split Grid: Roster + Blacklist */}
        <section id="blacklist-section" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: "24px",
          alignItems: "start",
          marginBottom: "40px"
        }}>
          
          {/* Active Duty Roster */}
          <div style={{
            background: "#090f1d",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            boxShadow: "none",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "14px 20px"
            }}>
              <Activity size={16} style={{ color: "#00f0ff" }} />
              <h3 style={{
                margin: 0,
                fontSize: "0.8rem",
                fontWeight: "600",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#ffffff"
              }}>
                แพทย์ปฏิบัติหน้าที่ขณะนี้
              </h3>
            </div>
            
            <div style={{ padding: "20px" }}>
              {activeDoctors.length === 0 ? (
                <div style={{
                  padding: "32px 16px",
                  background: "rgba(255, 255, 255, 0.005)",
                  border: "1px dashed rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem"
                }}>
                  ขณะนี้ไม่มีแพทย์อยู่ในระบบบันทึกเวร
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeDoctors.map((doc, idx) => {
                    const clockInTime = new Date(doc.clockIn).getTime();
                    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - clockInTime) / 1000));
                    const hours = Math.floor(elapsedSeconds / 3600);
                    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
                    const seconds = elapsedSeconds % 60;
                    const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

                    return (
                      <div key={idx} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid rgba(255, 255, 255, 0.03)",
                        borderRadius: "6px",
                        transition: "all 0.15s ease-out"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.2)";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.transform = "none";
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "28px",
                            height: "28px",
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            overflow: "hidden"
                          }}>
                            {doc.avatarUrl ? (
                              <img src={doc.avatarUrl} alt={doc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              "🩺"
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#ffffff", display: "block" }}>
                              {doc.name}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              ยศ: {doc.rank}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
                            <span style={{ width: "5px", height: "5px", background: "#00f0ff", borderRadius: "50%" }}></span>
                            <span style={{ fontSize: "0.6rem", color: "#00f0ff", fontWeight: "700" }}>ACTIVE</span>
                          </div>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.68rem",
                            color: "var(--text-secondary)",
                            display: "block",
                            marginTop: "2px"
                          }}>
                            {formattedDuration}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Blacklist Logs */}
          <div style={{
            background: "#090f1d",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            boxShadow: "none",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "12px 20px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={16} style={{ color: "#ef4444" }} />
                <h3 style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "#ffffff"
                }}>
                  รายชื่อแบล็กลิสต์ของหน่วยงาน
                </h3>
              </div>
              <div style={{ position: "relative" }}>
                <input 
                  type="text" 
                  placeholder="ค้นหาตามรายชื่อ/ข้อหา..." 
                  value={blacklistSearch}
                  onChange={(e) => setBlacklistSearch(e.target.value)}
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "4px",
                    padding: "6px 8px 6px 26px",
                    color: "#ffffff",
                    fontSize: "0.7rem",
                    outline: "none",
                    width: "140px",
                    transition: "width 0.15s, border-color 0.15s",
                    fontFamily: "inherit"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#00f0ff";
                    e.currentTarget.style.width = "180px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.width = "140px";
                  }}
                />
                <Search size={10} style={{
                  position: "absolute",
                  left: "8px",
                  top: "9px",
                  color: "var(--text-muted)"
                }} />
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              {blacklistLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  กำลังตรวจสอบประวัติ...
                </div>
              ) : filteredBlacklist.length === 0 ? (
                <div style={{
                  padding: "32px 16px",
                  background: "rgba(255, 255, 255, 0.005)",
                  border: "1px dashed rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem"
                }}>
                  ไม่พบประวัติการติดแบล็กลิสต์ในคลังข้อมูล
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "250px",
                  overflowY: "auto",
                  paddingRight: "4px"
                }}>
                  {filteredBlacklist.map((item) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        background: "rgba(255, 255, 255, 0.008)", 
                        border: "1px solid rgba(255, 255, 255, 0.03)", 
                        borderRadius: "6px", 
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s ease-out"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ paddingRight: "12px" }}>
                        <strong style={{ color: "#fca5a5", fontSize: "0.78rem", display: "block" }}>
                          {item.name || "ไม่ระบุ"}
                        </strong>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", display: "block", marginTop: "1px" }}>
                          {item.gang ? `กลุ่มแก๊ง: ${item.gang}` : "บุคคลทั่วไป"}
                        </span>
                        <p style={{ margin: "3px 0 0 0", color: "var(--text-secondary)", fontSize: "0.72rem", lineHeight: "1.4" }}>
                          <b>ข้อหา:</b> {item.penalty || "-"}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ 
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          color: "#f59e0b",
                          background: "rgba(245, 158, 11, 0.03)",
                          border: "1px solid rgba(245, 158, 11, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          display: "inline-block"
                        }}>
                          {Number(item.fine * (item.multiplier || 1)).toLocaleString()} IC
                        </span>
                        <span style={{
                          display: "block",
                          fontSize: "0.58rem",
                          color: "var(--text-muted)",
                          marginTop: "2px"
                        }}>
                          โดย: {item.created_by?.split("@")[0] || "ระบบ"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </section>

        {/* 5. Secure Access Gateway for Staff */}
        <section id="staff-gateway" style={{
          borderTop: "1px dashed rgba(255, 255, 255, 0.05)",
          paddingTop: "32px",
          maxWidth: "460px",
          margin: "0 auto"
        }}>
          <div style={{
            background: "#090f1d",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "28px",
            textAlign: "center"
          }}>
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
              color: "#00f0ff"
            }}>
              <Lock size={16} />
            </div>
            
            <h3 style={{ color: "#ffffff", fontSize: "0.95rem", fontWeight: "600", marginBottom: "6px" }}>
              ระบบลงทะเบียนเข้ากะปฏิบัติหน้าที่
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginBottom: "20px", lineHeight: "1.45" }}>
              สงวนสิทธิ์การเข้าถึงข้อมูลเฉพาะแพทย์ในสังกัดโรงพยาบาลนครลอสซานโตสเท่านั้น กรุณายืนยันตัวตนด้วยบัญชี Discord ที่เชื่อมต่อยศแพทย์แล้ว
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

            {/* Discord Connect button */}
            <button 
              onClick={() => onDiscordLogin()} 
              className="login-btn discord" 
              id="discord-login-btn"
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
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#4752c4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#5865F2"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
              </svg>
              เข้าสู่ระบบเชื่อมต่อบัญชี Discord
            </button>

            {/* Admin Portal Gateway input fold */}
            <details style={{ width: "100%", marginTop: "12px" }}>
              <summary 
                style={{ 
                  color: "var(--text-muted)", 
                  cursor: "pointer",
                  listStyle: "none",
                  display: "flex",
                  justifyContent: "center",
                  fontSize: "0.68rem",
                  padding: "8px",
                  border: "1px dashed rgba(255,255,255,0.05)",
                  borderRadius: "4px"
                }}
              >
                🔐 Admin Secure Access
              </summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onAdminLogin(formData);
                }}
                style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <input 
                  type="text" 
                  name="username" 
                  placeholder="Admin Username"
                  defaultValue="admin"
                  required
                  style={{ 
                    width: "100%",
                    padding: "7px 10px", 
                    borderRadius: "4px", 
                    border: "1px solid rgba(255, 255, 255, 0.08)", 
                    background: "rgba(0, 0, 0, 0.2)",
                    color: "#ffffff",
                    outline: "none",
                    fontSize: "0.7rem"
                  }} 
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <input 
                    type="password" 
                    name="password" 
                    placeholder="Password"
                    required
                    style={{ 
                      flex: 1, 
                      padding: "7px 10px", 
                      borderRadius: "4px", 
                      border: "1px solid rgba(255, 255, 255, 0.08)", 
                      background: "rgba(0, 0, 0, 0.2)",
                      color: "#ffffff",
                      outline: "none",
                      fontSize: "0.7rem"
                    }} 
                  />
                  <button 
                    type="submit" 
                    style={{ 
                      width: "auto", 
                      padding: "0 14px", 
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "4px",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      cursor: "pointer"
                    }}
                  >
                    ส่งข้อมูล
                  </button>
                </div>
              </form>
            </details>
          </div>
        </section>

      </main>

      {/* 6. Footer */}
      <footer style={{
        background: "#02040a",
        borderTop: "1px solid rgba(255, 255, 255, 0.03)",
        marginTop: "auto",
        padding: "20px 24px",
        textAlign: "center"
      }}>
        <div style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "0.72rem",
          color: "var(--text-muted)"
        }}>
          <p style={{ margin: 0 }}>© 2026 EMS MEDICAL PORTAL. All rights reserved.</p>
          <div style={{ display: "flex", gap: "14px" }}>
            <a href="/dashboard/rules" style={{ textDecoration: "none", color: "var(--text-muted)" }}>
              กฎโรงพยาบาล
            </a>
            <span>·</span>
            <a href="#hero" style={{ textDecoration: "none", color: "var(--text-muted)" }}>
              กลับสู่ด้านบน
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
