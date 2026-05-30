"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClockButton } from "@/components/ClockButton";
import { LiveTimer } from "@/components/LiveTimer";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { ClockIcon, CheckIcon } from "@/components/Icons";

interface ActiveShift {
  id: string;
  clock_in: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [pendingProofShift, setPendingProofShift] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [qualifyingDays, setQualifyingDays] = useState(0);
  const [dailyMinHours, setDailyMinHours] = useState(3);
  const [bonusThreshold, setBonusThreshold] = useState(20);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/status");
      const data = await res.json();
      setIsOnDuty(data.isOnDuty);
      setActiveShift(data.activeShift);
      setPendingProofShift(data.pendingProofShift);
    } catch {
      console.error("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const [weeklyRes, settingsRes] = await Promise.all([
        fetch("/api/shifts/weekly-summary"),
        fetch("/api/admin/settings")
      ]);
      const data = await weeklyRes.json();
      const settingsData = await settingsRes.json();
      
      if (settingsData.settings?.bonus_threshold) {
        setBonusThreshold(settingsData.settings.bonus_threshold);
      }

      if (data.summary?.length > 0) {
        const current = data.summary[data.summary.length - 1];
        setWeeklyHours(current.totalHours);
        setQualifyingDays(current.qualifyingDays || 0);
        setDailyMinHours(current.dailyMinHours || 3);
      }
    } catch {
      console.error("Failed to fetch weekly data");
    }
  }, []);

  useEffect(() => {
    document.title = "เข้า-ออกเวร | EMS Clock-in";
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      const user = session?.user as any;
      if (user?.role === "admin" && !user?.discordId) {
        router.replace("/dashboard/admin");
      } else {
        fetchStatus();
        fetchWeekly();
      }
    });
  }, [router, fetchStatus, fetchWeekly]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStatus();
      fetchWeekly();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchStatus, fetchWeekly]);

  useEffect(() => {
    // Check every 10 seconds in case they keep the page open on another monitor
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirmPendingClockOut = async () => {
    if (!proofFile) return;
    setPressing(true);
    try {
      const formData = new FormData();
      formData.append("proof", proofFile);

      const res = await fetch("/api/shifts/clock-out", { 
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.message} (${data.duration})`, "success");
        setProofFile(null);
        setPreviewUrl(null);
        fetchStatus();
        fetchWeekly();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "error");
    } finally {
      setPressing(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const res = await fetch("/api/shifts/clock-in", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchStatus();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleClockOut = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("proof", file);

      const res = await fetch("/api/shifts/clock-out", { 
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.message} (${data.duration})`, "success");
        fetchStatus();
        fetchWeekly();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการออกเวร", "error");
    }
  };

  if (loading) {
    return <div className="loading-spinner" />;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ClockIcon size={24} style={{ color: "var(--accent)" }} />
          เข้า-ออกเวร
        </h1>
        <p className="page-desc">กดปุ่มด้านล่างเพื่อเข้าเวรหรือออกเวร</p>
      </div>

      {pendingProofShift ? (
        <div className="card" style={{ maxWidth: "500px", margin: "0 auto 32px auto", padding: "28px", border: "1px solid var(--border-subtle)", boxShadow: "0 0 20px var(--accent-glow)", background: "rgba(255,255,255,0.01)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "12px" }}>
            <div className="status-badge off-duty" style={{ border: "1px solid var(--danger)", boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="status-dot" style={{ backgroundColor: "var(--danger)" }} />
              ตรวจพบการออกเวรจากระบบในเกม
            </div>
            
            <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-primary)", marginTop: "8px" }}>
              กรุณาอัปโหลดหลักฐานเพื่อสิ้นสุดเวร
            </h3>
            
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "380px", lineHeight: "1.5" }}>
              ระบบได้ทำการเช็คเอาท์ในเซิฟเวอร์ให้คุณเมื่อ{" "}
              <strong style={{ color: "var(--accent-light)" }}>
                {new Date(pendingProofShift.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </strong>{" "}
              (ชั่วโมงเวร: <strong style={{ color: "var(--accent-light)" }}>{formatHoursToHHMMSS(pendingProofShift.duration_minutes / 60)}</strong>) กรุณาแนบรูปแคปภาพหลักฐานเพื่อยืนยันประวัติเวรค่ะ
            </p>

            {/* Upload Area */}
            <div style={{ width: "100%", marginTop: "12px" }}>
              <label 
                htmlFor="dashboard-proof-upload" 
                style={{ 
                  display: "block", 
                  padding: previewUrl ? "12px" : "32px", 
                  border: "2px dashed var(--border-subtle)", 
                  borderRadius: "12px", 
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--bg-secondary)",
                  transition: "all 0.2s",
                  overflow: "hidden"
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", objectFit: "contain", margin: "0 auto" }} />
                ) : (
                  <div style={{ color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "2rem" }}>📸</span>
                    คลิกหรือลากรูปภาพมาวางที่นี่เพื่ออัปโหลดหลักฐาน<br/>
                    <small style={{ fontSize: "0.75rem" }}>(รองรับไฟล์ภาพ .jpg, .png, .jpeg)</small>
                  </div>
                )}
              </label>
              <input 
                id="dashboard-proof-upload" 
                type="file" 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handleFileChange}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", width: "100%", gap: "12px", marginTop: "16px" }}>
              <button 
                onClick={handleConfirmPendingClockOut}
                disabled={!proofFile || pressing}
                style={{ 
                  flex: 1, 
                  padding: "12px", 
                  background: "var(--danger)", 
                  border: "none", 
                  color: "white", 
                  borderRadius: "8px", 
                  fontWeight: "bold", 
                  opacity: (!proofFile || pressing) ? 0.5 : 1, 
                  cursor: (!proofFile || pressing) ? "not-allowed" : "pointer",
                  boxShadow: proofFile && !pressing ? "0 0 15px rgba(239, 68, 68, 0.4)" : "none",
                  transition: "all 0.2s",
                  fontSize: "0.9rem"
                }}
              >
                {pressing ? "กำลังส่งหลักฐาน..." : "ส่งรูปภาพ & สิ้นสุดเวร 🔴"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Status Badge */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <span className={`status-badge ${isOnDuty ? "on-duty" : "off-duty"}`}>
              <span className="status-dot" />
              {isOnDuty ? "กำลังปฏิบัติหน้าที่" : "ไม่ได้อยู่ในเวร"}
            </span>
          </div>

          {/* Live Timer */}
          <LiveTimer isOnDuty={isOnDuty} clockInTime={activeShift?.clock_in} />

          {/* Clock Button */}
          <ClockButton
            isOnDuty={isOnDuty}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />
        </>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ fontFamily: "var(--font-mono)" }}>{formatHoursToHHMMSS(weeklyHours)}</div>
          <div className="stat-label">ชั่วโมงสัปดาห์นี้</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{qualifyingDays}</div>
          <div className="stat-label">วันเข้าเวรครบ (≥{dailyMinHours} ชม./วัน)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: weeklyHours >= bonusThreshold ? "var(--accent-light)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: weeklyHours >= bonusThreshold ? "1.5rem" : "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "36px" }}>
            {weeklyHours >= bonusThreshold ? (
              <CheckIcon size={24} style={{ color: "var(--success)" }} />
            ) : (
              `${formatHoursToHHMMSS(bonusThreshold - weeklyHours)} ชม.`
            )}
          </div>
          <div className="stat-label">{weeklyHours >= bonusThreshold ? "ผ่านเกณฑ์โบนัส" : "เหลืออีกถึงโบนัส"}</div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </>
  );
}
