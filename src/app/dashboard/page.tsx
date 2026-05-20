"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClockButton } from "@/components/ClockButton";
import { LiveTimer } from "@/components/LiveTimer";
import { formatHoursToHHMMSS } from "@/lib/utils";

interface ActiveShift {
  id: string;
  clock_in: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
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
        <h1 className="page-title">⏰ เข้า-ออกเวร</h1>
        <p className="page-desc">กดปุ่มด้านล่างเพื่อเข้าเวรหรือออกเวร</p>
      </div>

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
          <div className="stat-value" style={{ color: weeklyHours >= bonusThreshold ? "var(--accent-light)" : "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: weeklyHours >= bonusThreshold ? "1.5rem" : "1.2rem" }}>
            {weeklyHours >= bonusThreshold ? "✅" : `${formatHoursToHHMMSS(bonusThreshold - weeklyHours)} ชม.`}
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
