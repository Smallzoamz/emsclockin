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

  // Live Counter & Active Doctor Roster State
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [activeDoctors, setActiveDoctors] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  // Animated Stat Counters
  const [casesCount, setCasesCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = 1420;
    const duration = 1200; // 1.2 seconds
    const increment = Math.ceil(end / (duration / 16)); // ~60fps step
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCasesCount(end);
        clearInterval(timer);
      } else {
        setCasesCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, []);

  // Live Operations Feed Simulator
  const [feedItems, setFeedItems] = useState([
    { id: 1, text: "🚑 รถพยาบาลฉุกเฉินออกตรวจพื้นที่ ในเมือง", time: "เมื่อสักครู่" },
    { id: 2, text: "❤️ ทำการ CPR ผู้ป่วยวิกฤตหน้าสภา สำเร็จ", time: "2 นาทีที่แล้ว" },
    { id: 3, text: "🏥 เคสตัดลวดหัตถการ แผนกศัลยกรรมทั่วไป", time: "5 นาทีที่แล้ว" },
    { id: 4, text: "🚁 ลำเลียงผู้บาดเจ็บทางอากาศจากเขายอดสูง", time: "12 นาทีที่แล้ว" },
  ]);

  const operationsPool = [
    "🚑 รถพยาบาลฉุกเฉินออกตรวจพื้นที่ ในเมือง",
    "❤️ ทำการ CPR ผู้ป่วยวิกฤตหน้าสภา สำเร็จ",
    "🏥 เคสตัดลวดหัตถการ แผนกศัลยกรรมทั่วไป",
    "🚁 ลำเลียงผู้บาดเจ็บทางอากาศจากเขายอดสูง",
    "💊 เบิกจ่ายเวชภัณฑ์ยาควบคุม แผนกเภสัชกรรม",
    "🚑 รับแจ้งเหตุฉุกเฉินในเขต นอกเมือง",
    "🏥 รับเคสอุบัติเหตุปะทะบริเวณจุดสุ่มเสี่ยง",
    "❤️ ปั๊มหัวใจฟื้นคืนสัญญาณชีพ (CPR) ในพื้นที่กู้ชีพ",
    "🚁 ตรวจความปลอดภัยเขตเหมืองบนทางอากาศ"
  ];

  useEffect(() => {
    const feedTimer = setInterval(() => {
      const randomText = operationsPool[Math.floor(Math.random() * operationsPool.length)];
      setFeedItems((prev) => {
        const nextId = prev.length > 0 ? Math.max(...prev.map(i => i.id)) + 1 : 1;
        return [
          { id: nextId, text: randomText, time: "เมื่อสักครู่" },
          ...prev.slice(0, 3).map((item, idx) => ({
            ...item,
            time: idx === 0 ? "1 นาทีที่แล้ว" : idx === 1 ? "4 นาทีที่แล้ว" : "15 นาทีที่แล้ว"
          }))
        ];
      });
    }, 8000);
    return () => clearInterval(feedTimer);
  }, []);

  // Fee Calculator States
  const [selectedTreatment, setSelectedTreatment] = useState("cpr");
  const [selectedZone, setSelectedZone] = useState("inner");
  const [patientCount, setPatientCount] = useState(1);

  const treatmentsMap = {
    cpr: { label: "ปฐมพยาบาลเบื้องต้น (CPR)", price: 100 },
    stitch: { label: "เย็บแผลหัตถการเคสทั่วไป", price: 200 },
    medicine: { label: "จ่ายยาระงับอาการประสาท/ยาควบคุม", price: 150 },
    checkup: { label: "ตรวจวินิจฉัยโรคและประเมินอาการ", price: 50 },
  };

  const zonesMap = {
    inner: { label: "โซนในเมือง (Inner City)", multiplier: 1.0 },
    outer: { label: "โซนนอกเมือง (Outer City)", multiplier: 2.0 },
    desert: { label: "โซนเมืองบน/ทะเลทราย (Desert)", multiplier: 3.0 },
  };

  const currentPrice = treatmentsMap[selectedTreatment as keyof typeof treatmentsMap]?.price || 0;
  const currentMultiplier = zonesMap[selectedZone as keyof typeof zonesMap]?.multiplier || 1.0;
  const subtotal = currentPrice * currentMultiplier * Math.max(1, patientCount);
  const fundDeduction = Math.floor(subtotal * 0.10); // 10% Fund contribution estimation
  const totalEstimation = subtotal - fundDeduction;

  // Estimator Copy State
  const [copySuccess, setCopySuccess] = useState(false);
  const copyInvoiceDetails = () => {
    const text = `=== LOS SANTOS MEDICAL SERVICE ===
ใบรับรองประมาณการค่ารักษาพยาบาล
---------------------------------
ประเภทหัตถการ: ${treatmentsMap[selectedTreatment as keyof typeof treatmentsMap]?.label || ""}
อัตราค่าบริการคนไข้: ${currentPrice} IC / คน
โซนพื้นที่เกิดเหตุ: ${zonesMap[selectedZone as keyof typeof zonesMap]?.label || ""} (ตัวคูณ x${currentMultiplier.toFixed(1)})
จำนวนผู้รับบริการ: ${patientCount} ท่าน
---------------------------------
ยอดรวมค่าบริการดิบ: ${currentPrice * currentMultiplier * patientCount} IC
หักส่วนลดกองทุนเมือง (10%): - ${fundDeduction} IC
ยอดเงินเรียกเก็บสุทธิ: ${totalEstimation} IC
---------------------------------
* อนุมัติข้อมูลโดยศูนย์กู้ชีพกลาง (LS Medical Service) *`;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Vitals Scanner States
  const [scannerName, setScannerName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStatusText, setScannerStatusText] = useState("กรุณากรอกชื่อพลเมืองเพื่อเริ่มสแกน...");
  const [scanResult, setScanResult] = useState<{
    heartRate: number;
    bloodPressure: string;
    temperature: string;
    oxygen: number;
    diagnosis: string;
  } | null>(null);

  const startVitalsScan = () => {
    if (!scannerName.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    setScannerStatusText("🔍 กำลังเชื่อมต่อโพรบวัดสัญญาณชีพและยิงคลื่นความถี่...");
    
    setTimeout(() => {
      setScannerStatusText("⚡ กำลังตรวจสอบความเสถียรของชีพจร (Heart Rhythm)...");
      setTimeout(() => {
        setScannerStatusText("🧠 กำลังสแกนระดับสติสัมปชัญญะและเซลล์สมอง...");
        setTimeout(() => {
          const heartRate = Math.floor(Math.random() * 55) + 60; // 60 - 115 bpm
          const bpSystolic = Math.floor(Math.random() * 30) + 110; // 110 - 140
          const bpDiastolic = Math.floor(Math.random() * 15) + 70; // 70 - 85
          const temp = (Math.random() * 1.8 + 36.1).toFixed(1); // 36.1 - 37.9
          const oxygen = Math.floor(Math.random() * 4) + 96; // 96 - 99%

          const diagnoses = [
            "สัญญาณชีพเสถียรดี แนะนำให้หลีกเลี่ยงพื้นที่ปะทะหน้าสภาเพื่อความปลอดภัยของร่างกาย",
            "พบสารคาเฟอีนตกค้างระดับสูง แนะนำให้งดน้ำชา/กาแฟ และดื่มน้ำประชารัฐอย่างน้อย 3 แก้ว",
            "ตรวจพบภาวะอ่อนเพลียปานกลาง แนะนำให้ทานยาพาราเซตามอล 2 เม็ด และพักผ่อนในบ้านพักพลเมือง",
            "หัวใจเต้นผิดจังหวะเล็กน้อยเนื่องจากเหม่อลอย แนะนำให้รีบวิ่งจ๊อกกิ้งรอบโรงพยาบาลกลาง 2 รอบ",
            "ตรวจพบชีพจรมั่นคงดีเยี่ยม! สภาพร่างกายฟิตพร้อมปฏิบัติหน้าที่ในเมืองได้ร้อยเปอร์เซ็นต์"
          ];
          const randomDiagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];

          setScanResult({
            heartRate,
            bloodPressure: `${bpSystolic}/${bpDiastolic} mmHg`,
            temperature: `${temp} °C`,
            oxygen,
            diagnosis: randomDiagnosis
          });
          setIsScanning(false);
          setScannerStatusText("✅ วิเคราะห์ข้อมูลเสร็จสิ้น!");
        }, 1000);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="portal-container">
      {/* Dynamic Background Grids */}
      <div className="portal-scanner-grid"></div>
      <div className="portal-scanner-line"></div>

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
            <a href="#citizen-services" className="portal-nav-link">คำนวณค่ารักษา</a>
            <a href="#announcements" className="portal-nav-link">ข่าวสาร</a>
            <a href="#staff-gateway" className="portal-nav-link">ล็อกอินแพทย์</a>
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
        
        {/* Animated ECG Cardiogram Background */}
        <svg className="portal-ecg-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path className="portal-ecg-path" d="M0,50 L300,50 L320,40 L340,60 L360,20 L380,80 L400,45 L420,55 L440,50 L700,50 L720,30 L740,70 L760,10 L780,90 L800,40 L820,60 L840,50 L1000,50" />
        </svg>

        <div className="portal-hero-wrapper">
          <div className="portal-hero-grid">
            <div className="portal-hero-text">
              <h2>ศูนย์กู้ชีพนครลอสซานโตส</h2>
              <p>
                ช่องทางอำนวยความสะดวกสำหรับพลเมืองนครลอสซานโตสในการตรวจสอบกฎระเบียบของแพทย์ อัตราค่าบริการรักษาพยาบาลจำแนกรายเขต 
                ค้นหาทำเนียบบัญชีดำ และทางเข้าใช้ระบบบันทึกเวรและส่งเคสประชารัฐอย่างเป็นทางการสำหรับแพทย์ในหน่วยงาน
              </p>
              <div className="portal-hero-actions">
                <a href="#staff-gateway" className="login-btn" style={{ textDecoration: "none", width: "auto", margin: 0, fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={16} /> ระบบบันทึกเวรเจ้าหน้าที่
                </a>
                <button onClick={() => setActiveModal("rules")} className="login-btn" style={{ width: "auto", margin: 0, background: "transparent", border: "1px solid var(--border-subtle)", color: "#fff" }}>
                  📜 เปิดเอกสารกฎระเบียบแพทย์
                </button>
              </div>
            </div>

            {/* Live Stats Panel */}
            <div className="portal-stats-panel">
              <span className="portal-stats-title">🏥 สถานะการปฏิบัติงานสถานพยาบาล (Live Status)</span>
              
              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🟢</span>
                  <span>สถานะการกู้ชีพเมือง</span>
                </div>
                <span className="portal-stats-value" style={{ color: "var(--accent)" }}>ACTIVE</span>
              </div>

              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🚑</span>
                  <span>เคสอุบัติเหตุสัปดาห์นี้</span>
                </div>
                <span className="portal-stats-value">{casesCount} เคส</span>
              </div>

              <div className="portal-stats-row">
                <div className="portal-stats-label">
                  <span style={{ fontSize: "1.25rem" }}>🛏️</span>
                  <span>ความจุเตียงผ่าตัด/พักรักษา</span>
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

      {/* 2.5 Active On-Duty Doctors Roster Section */}
      <section className="portal-section portal-fade-up" style={{ padding: "30px 24px 10px 24px" }}>
        <div className="portal-section-wrapper">
          <div className="roster-section">
            <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
              <span className="portal-led-dot" style={{ margin: 0 }}></span>
              <h3 style={{ color: "#fff", fontSize: "1.0rem", fontWeight: "800", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                🟢 ทำเนียบแพทย์เวรปฏิบัติการขณะนี้ (Active Duty Roster)
              </h3>
            </div>
            
            {activeDoctors.length === 0 ? (
              <div style={{ 
                marginTop: "16px",
                padding: "20px", 
                background: "rgba(255,255,255,0.01)", 
                border: "1px dashed var(--border-subtle)", 
                borderRadius: "var(--radius-md)", 
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.8rem"
              }}>
                📢 ขณะนี้ไม่มีแพทย์ขึ้นเวรฉุกเฉินในระบบ หากมีเหตุร้ายแรง กรุณาติดต่อผ่านดิสคอร์ดหน่วยงานหรือสัญญาณวิทยุสภา
              </div>
            ) : (
              <div className="roster-scroll-container">
                {activeDoctors.map((doc, idx) => {
                  const clockInTime = new Date(doc.clockIn).getTime();
                  const elapsedMs = now.getTime() - clockInTime;
                  const elapsedSeconds = Math.floor(elapsedMs / 1000);
                  
                  const hours = Math.floor(elapsedSeconds / 3600);
                  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
                  const seconds = elapsedSeconds % 60;
                  
                  const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

                  return (
                    <div className="roster-card" key={idx}>
                      <div className="roster-avatar-wrapper">
                        {doc.avatarUrl ? (
                          <img src={doc.avatarUrl} alt={doc.name} className="roster-avatar" />
                        ) : (
                          <div className="roster-avatar" style={{ background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                            🩺
                          </div>
                        )}
                      </div>
                      <div className="roster-details">
                        <span className="roster-name">{doc.name}</span>
                        <span className="roster-rank">{doc.rank}</span>
                        <span className="roster-timer">
                          ⏱️ ขึ้นเวรแล้ว {formattedDuration}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Medical Services & Departments Section */}
      <section id="departments" className="portal-section alt-bg">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>แผนกและขีดความสามารถการกู้ภัย</h2>
            <p>ความปลอดภัยและความเป็นมืออาชีพในการเข้าช่วยเหลือกู้ชีพพลเมืองนครลอสซานโตส</p>
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

      {/* 4. Citizen Utilities & Calculator Section */}
      <section id="citizen-services" className="portal-section">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>บริการช่วยเหลือประชาชนและประมาณการค่าบริการ</h2>
            <p>ประมาณการค่าบริการกู้ชีพตามนโยบายกองทุนร่วมส่วนกลาง และเข้าตรวจสอบข่าวสารคลังข้อมูลกลาง</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>
            
            {/* 1. Interactive Vitals Scanner Widget */}
            <div className="vitals-scanner-card portal-fade-up">
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "800", margin: 0 }}>📟 เครื่องสแกนสัญญาณชีพพลเมือง (Vitals Scanner)</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0 }}>
                จำลองเพื่อประเมินวิเคราะห์สถานะหัวใจ ความเข้มข้นออกซิเจนในเลือด และอุณหภูมิร่างกายเบื้องต้นของประชาชน
              </p>

              {/* High-Tech Scanner Screen */}
              <div className="scanner-screen">
                <div className="scanner-screen-grid"></div>
                
                {/* Scanner pulse wave SVG */}
                <svg className="scanner-screen-wave" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <path 
                    className={`scanner-wave-path ${isScanning ? 'scanning' : ''}`} 
                    d={
                      isScanning 
                        ? "M0,50 L20,50 L30,20 L40,80 L50,45 L60,55 L70,50 L100,50 L120,50 L130,10 L140,90 L150,40 L160,60 L170,50 L200,50 L220,50 L230,20 L240,80 L250,45 L260,55 L270,50 L300,50 L320,50 L330,10 L340,90 L350,40 L360,60 L370,50 L400,50"
                        : "M0,50 Q10,48 20,50 T40,50 T60,50 T80,50 T100,50 T120,50 T140,50 T160,50 T180,50 T200,50 T220,50 T240,50 T260,50 T280,50 T300,50 T320,50 T340,50 T360,50 T380,50 T400,50"
                    } 
                  />
                </svg>

                {/* Radar sweeping scan line */}
                <div className={`scanner-radar-line ${isScanning ? 'scanning' : ''}`}></div>

                {/* Screen Center Text Overlay */}
                <div className="scanner-screen-text">
                  {scannerStatusText}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder="ป้อนชื่อผู้ต้องการตรวจสัญญาณชีพ..."
                  value={scannerName}
                  onChange={(e) => setScannerName(e.target.value)}
                  className="scanner-input"
                  disabled={isScanning}
                />
                
                <button 
                  onClick={startVitalsScan}
                  className="login-btn"
                  style={{ width: "100%", margin: 0, fontWeight: "bold" }}
                  disabled={isScanning || !scannerName.trim()}
                >
                  {isScanning ? "⚡ กำลังสแกนร่างกาย..." : "💖 เริ่มทำการสแกนชีพจร"}
                </button>
              </div>

              {/* Diagnosis Report */}
              {scanResult && (
                <div className="scanner-report">
                  <div className="scanner-report-row">
                    <span>NAME/ID:</span>
                    <span className="scanner-report-value" style={{ color: "var(--accent-light)" }}>{scannerName.toUpperCase()}</span>
                  </div>
                  <div className="scanner-report-row">
                    <span>HEART RATE:</span>
                    <span className="scanner-report-value" style={{ color: "#10b981" }}>❤️ {scanResult.heartRate} BPM</span>
                  </div>
                  <div className="scanner-report-row">
                    <span>BLOOD PRESSURE:</span>
                    <span className="scanner-report-value">{scanResult.bloodPressure}</span>
                  </div>
                  <div className="scanner-report-row">
                    <span>SPO2 (OXYGEN):</span>
                    <span className="scanner-report-value">🫧 {scanResult.oxygen}%</span>
                  </div>
                  <div className="scanner-report-row">
                    <span>BODY TEMP:</span>
                    <span className="scanner-report-value">{scanResult.temperature}</span>
                  </div>
                  <div className="scanner-report-diagnosis">
                    <b>วินิจฉัยแพทย์:</b> {scanResult.diagnosis}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Skeuomorphic Medical Invoice Card */}
            <div className="portal-calculator-card portal-fade-up delay-100">
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "800", margin: 0 }}>🧮 ประมาณการค่ารักษาพยาบาล (Fee Calculator)</h3>
              
              <div className="portal-calculator-form">
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>เลือกประเภทการรักษาพยาบาล</label>
                  <select 
                    value={selectedTreatment} 
                    onChange={(e) => setSelectedTreatment(e.target.value)}
                    className="portal-calculator-select"
                  >
                    <option value="cpr">ปฐมพยาบาลเบื้องต้น (CPR)</option>
                    <option value="stitch">เย็บแผลทำแผลหัตถการ</option>
                    <option value="medicine">จ่ายยาระงับอาการประสาท/ยาควบคุม</option>
                    <option value="checkup">ตรวจร่างกายและประเมินโรค</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>เลือกพื้นที่/โซนที่เกิดเหตุ</label>
                  <select 
                    value={selectedZone} 
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="portal-calculator-select"
                  >
                    <option value="inner">ในเขตเมือง (ในเมือง)</option>
                    <option value="outer">นอกเขตเมืองหลวง (นอกเมือง)</option>
                    <option value="desert">พื้นที่ธุรกันดารตอนบน (เมืองบน)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>จำนวนผู้เข้ารับบริการ (จำนวนคน)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={patientCount} 
                    onChange={(e) => setPatientCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="portal-calculator-select"
                  />
                </div>
              </div>

              {/* Skeuomorphic Thermal Invoice Card */}
              <div className="portal-invoice-slip">
                <div className="portal-invoice-header">
                  <h4>LOS SANTOS EMERGENCY HOSPITALS</h4>
                  <span>OFFICIAL TREATMENT ESTIMATION INVOICE</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="portal-receipt-row">
                    <span>Base rate:</span>
                    <span>{currentPrice} IC / Person</span>
                  </div>
                  <div className="portal-receipt-row">
                    <span>Zone factor:</span>
                    <span>x{currentMultiplier.toFixed(1)}</span>
                  </div>
                  <div className="portal-receipt-row">
                    <span>Patients:</span>
                    <span>{patientCount} head(s)</span>
                  </div>
                  <div className="portal-receipt-row">
                    <span>Central Fund:</span>
                    <span style={{ color: "#fca5a5" }}>- {fundDeduction} IC</span>
                  </div>
                  <div className="portal-receipt-total">
                    <span>Total charge:</span>
                    <span>{totalEstimation} IC</span>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="portal-invoice-barcode">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div 
                      className="portal-invoice-bar" 
                      key={i} 
                      style={{ 
                        width: i % 3 === 0 ? "3.2px" : i % 5 === 0 ? "1px" : "2px",
                        opacity: i % 7 === 0 ? 0.3 : 0.7 
                      }} 
                    />
                  ))}
                </div>

                {/* Diagonal stamp overlay */}
                <div className="portal-invoice-stamp">
                  ESTIMATED / APPROVED
                </div>
              </div>

              {/* Print and copy actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={copyInvoiceDetails}
                  className="login-btn"
                  style={{ flex: 1, margin: 0, fontSize: "0.75rem", background: "transparent", border: "1px solid var(--border-subtle)", color: "#fff" }}
                >
                  {copySuccess ? "✅ คัดลอกแล้ว!" : "📋 คัดลอกรายละเอียด"}
                </button>
                <button 
                  onClick={() => window.print()}
                  className="login-btn"
                  style={{ width: "auto", padding: "0 16px", margin: 0, fontSize: "0.75rem" }}
                >
                  🖨️ พิมพ์
                </button>
              </div>
            </div>

            {/* 3. CAD Dispatch Telemetry Logs Terminal & Citizen Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="portal-fade-up delay-200">
              
              {/* Telemetry live feed log terminal */}
              <div className="portal-telemetry-feed">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(16,185,129,0.15)", paddingBottom: "10px", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="terminal-siren-dot"></div>
                    <span className="portal-stats-title" style={{ margin: 0, letterSpacing: "0.03em" }}>📟 CAD TELEMETRY OPERATIONS</span>
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "var(--accent)", fontWeight: "bold" }}>● CONNECTED</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "hidden" }}>
                  {feedItems.map(item => (
                    <div className="portal-telemetry-item" key={item.id}>
                      <span style={{ color: "var(--text-primary)", fontSize: "0.75rem", fontWeight: "600", fontFamily: "'JetBrains Mono', monospace" }}>{item.text}</span>
                      <span style={{ color: "var(--accent-light)", fontSize: "0.6rem", fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        ⏱0s {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citizen shortcuts grid menu */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="widget-menu-item" style={{ padding: "16px 20px" }} onClick={() => setActiveModal("rules")}>
                  <div style={{ fontSize: "1.25rem" }}>📜</div>
                  <h3 style={{ fontSize: "0.8rem", fontWeight: "700" }}>กฎระเบียบแพทย์</h3>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0 }}>ข้อห้ามและข้อปฏิบัติสำหรับแพทย์</p>
                </div>

                <div className="widget-menu-item" style={{ padding: "16px 20px" }} onClick={() => setActiveModal("fees")}>
                  <div style={{ fontSize: "1.25rem" }}>💊</div>
                  <h3 style={{ fontSize: "0.8rem", fontWeight: "700" }}>อัตราค่าบริการ</h3>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0 }}>พิกัดราคาและการคิดเงินรักษา</p>
                </div>

                <div className="widget-menu-item" style={{ padding: "16px 20px" }} onClick={() => setActiveModal("blacklist")}>
                  <div style={{ fontSize: "1.25rem" }}>🚫</div>
                  <h3 style={{ fontSize: "0.8rem", fontWeight: "700" }}>ทำเนียบบัญชีดำ</h3>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0 }}>รายชื่อผู้กระทำความผิดต่อแพทย์</p>
                </div>

                <a href="https://discord.gg/ems-hospital" target="_blank" rel="noopener noreferrer" className="widget-menu-item" style={{ padding: "16px 20px", textDecoration: "none" }}>
                  <div style={{ fontSize: "1.25rem" }}>💬</div>
                  <h3 style={{ fontSize: "0.8rem", fontWeight: "700" }}>ดิสคอร์ดหน่วยงาน</h3>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0 }}>พูดคุย ติดต่อส่งใบสมัครออนไลน์</p>
                </a>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 5. Announcements Section & Quota Tracker */}
      <section id="announcements" className="portal-section alt-bg">
        <div className="portal-section-wrapper">
          <div className="portal-section-header">
            <h2>ประกาศสำคัญและช่องทางเปิดรับสมัคร</h2>
            <p>ติดตามข่าวด่วนประชาสัมพันธ์ กิจกรรมในเซิร์ฟเวอร์ และการประกาศรับสมัครแพทย์รุ่นถัดไป</p>
          </div>

          <div className="portal-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "32px" }}>
            {/* Sliding Carousel Card */}
            <div className="portal-slider">
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

            {/* Quota Progress Tracker Box */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="portal-quota-box">
                <div className="portal-quota-header">
                  <span>เป้าหมายรับสมัครแพทย์ (รุ่นที่ 15)</span>
                  <span style={{ color: "var(--accent-light)", fontWeight: "bold" }}>22 / 30 คน (73%)</span>
                </div>
                <div className="portal-quota-bar-bg">
                  <div className="portal-quota-bar-fill"></div>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "12px", lineHeight: "1.4" }}>
                  * โควตาผู้สมัครที่ผ่านการสอบข้อเขียนเบื้องต้นแล้ว การเปิดรอบบิลนี้จะสิ้นสุดภายในวันที่ 15 มิถุนายนนี้ ขอสงวนสิทธิ์การคัดเฉพาะแพทย์ที่ผ่านเกณฑ์เท่านั้น
                </p>
              </div>

              <div style={{ marginTop: "24px", padding: "16px", background: "rgba(16,185,129,0.03)", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                  💬 ต้องการติดต่อเรื่องการสมัครเวร?
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  สามารถเข้าร่วมกลุ่มดิสคอร์ดทางการของโรงพยาบาลกลางเพื่อยื่นเอกสารประวัติส่วนตัวและรอการประกาศผลคัดเลือกได้ทันที
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Staff Secure Access Section */}
      <section id="staff-gateway" className="portal-section">
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
              <h3 style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "bold", marginBottom: "8px" }}>เข้าสู่ระบบสำหรับแพทย์ประจำการ</h3>
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
                เข้าสู่ระบบเชื่อมต่อบัญชี Discord
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

      {/* 7. Footer */}
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
