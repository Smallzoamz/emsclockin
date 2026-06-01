"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClockButton } from "@/components/ClockButton";
import { LiveTimer } from "@/components/LiveTimer";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { 
  ClockIcon, 
  CheckIcon, 
  HospitalIcon,
  MoneyIcon,
  MegaphoneIcon,
  TrophyIcon,
  ChartBarIcon,
  FileTextIcon
} from "@/components/Icons";

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
  
  // Weekly Metrics
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [qualifyingDays, setQualifyingDays] = useState(0);
  const [dailyMinHours, setDailyMinHours] = useState(3);
  const [bonusThreshold, setBonusThreshold] = useState(20);
  
  // User Profile details
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [doctorRanks, setDoctorRanks] = useState<any[]>([]);
  const [userRanks, setUserRanks] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
  // Roster co-workers
  const [activeDoctors, setActiveDoctors] = useState<any[]>([]);

  // Shift History logs
  const [shiftsHistory, setShiftsHistory] = useState<any[]>([]);
  const [totalShiftsCount, setTotalShiftsCount] = useState(0);
  const [currentMonthFilter, setCurrentMonthFilter] = useState("");

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
      if (data.activeDoctors) {
        setActiveDoctors(data.activeDoctors);
      }
    } catch {
      console.error("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/history?page=1&limit=5");
      const data = await res.json();
      if (data.shifts) {
        setShiftsHistory(data.shifts);
        setTotalShiftsCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch shifts history:", err);
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
      
      if (settingsData.settings) {
        if (settingsData.settings.bonus_threshold) {
          setBonusThreshold(Number(settingsData.settings.bonus_threshold));
        }
        if (settingsData.settings.doctor_ranks) {
          setDoctorRanks(settingsData.settings.doctor_ranks);
        }
        if (settingsData.settings.user_ranks) {
          setUserRanks(settingsData.settings.user_ranks);
        }
        if (settingsData.settings.user_names) {
          setUserNames(settingsData.settings.user_names);
        }
      }

      if (data.summary && data.summary.length > 0) {
        const current = data.summary[data.summary.length - 1];
        setWeeklyHours(current.totalHours || 0);
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
      setSessionUser(user);
      if (user?.role === "admin" && !user?.discordId) {
        router.replace("/dashboard/admin");
      } else {
        fetchStatus();
        fetchWeekly();
        fetchHistory();
      }
    });
  }, [router, fetchStatus, fetchWeekly, fetchHistory]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStatus();
      fetchWeekly();
      fetchHistory();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchStatus, fetchWeekly, fetchHistory]);

  useEffect(() => {
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
        fetchHistory();
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
        fetchHistory();
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
        fetchHistory();
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

  // Calculate dynamic weekly bonus values
  const userEmail = sessionUser?.email;
  const userRankId = userEmail ? userRanks[userEmail] : undefined;
  const userRank = doctorRanks.find((r) => r.id === userRankId);
  const hourlyRate = userRank ? userRank.rate : 30000;
  const estimatedPayout = Math.floor(weeklyHours) * hourlyRate;

  // Filter history logs by calendar month locally
  const filteredHistory = shiftsHistory.filter((shift) => {
    if (!currentMonthFilter) return true;
    const date = new Date(shift.clock_in);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return monthKey === currentMonthFilter;
  });

  // Calculate latest clock-in and clock-out details from history list
  const lastCompleted = shiftsHistory.find(s => s.status === "completed");
  const latestInStr = activeShift 
    ? new Date(activeShift.clock_in).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
    : lastCompleted 
      ? new Date(lastCompleted.clock_in).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
      : "ไม่มีประวัติ";

  const latestOutStr = lastCompleted 
    ? new Date(lastCompleted.clock_out).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
    : "ไม่มีประวัติ";

  // Calculate today's total accumulated hours
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const todayMinutes = shiftsHistory
    .filter(s => s.status === "completed" && new Date(s.clock_in) >= startOfToday)
    .reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

  const todayHoursStr = formatHoursToHHMMSS(todayMinutes / 60);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Row 1 Grid */}
      <div className="dashboard-grid-2-1">
        
        {/* Col 1: Active Clock-in Card (2/3 width) */}
        <div className="active-shift-card-wrapper">
          <div className="active-shift-card-header">
            <div className="active-shift-status-title">
              <span className={`status-dot ${isOnDuty ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-gray-500"}`} style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%" }} />
              <span style={{ color: isOnDuty ? "var(--accent-light)" : "var(--text-secondary)" }}>
                {isOnDuty ? "กำลังปฏิบัติหน้าที่ (ACTIVE)" : "ยังไม่ได้เข้าเวร (OFF DUTY)"}
              </span>
            </div>
            {isOnDuty && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-light)", fontWeight: 500 }}>
                ปฏิบัติงานในระบบอยู่
              </span>
            )}
          </div>

          <div className="active-shift-split-content">
            {/* Live timer and click control */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  เวลาสะสมในเซสชันปัจจุบัน
                </span>
                <LiveTimer isOnDuty={isOnDuty} clockInTime={activeShift?.clock_in} />
              </div>

              {pendingProofShift ? (
                <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "8px", fontSize: "0.78rem", color: "#fca5a5" }}>
                  🚨 ตรวจพบการลงเวรจากเกมกรุณาแนบรูปภาพอัปโหลดเพื่อยืนยันประวัติค่ะ
                </div>
              ) : (
                <ClockButton
                  isOnDuty={isOnDuty}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                />
              )}
            </div>

            {/* Shift proof upload column */}
            <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.04)", paddingLeft: "24px" }}>
              {pendingProofShift ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label 
                    htmlFor="page-proof-upload" 
                    style={{ 
                      display: "block", 
                      padding: previewUrl ? "8px" : "24px", 
                      border: "2px dashed var(--border-subtle)", 
                      borderRadius: "8px", 
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.01)",
                      transition: "all 0.2s"
                    }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100px", borderRadius: "4px", objectFit: "contain", margin: "0 auto" }} />
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                        <span>📸</span>
                        <span>อัปโหลดรูปหลักฐานการลงเวร</span>
                      </div>
                    )}
                  </label>
                  <input 
                    id="page-proof-upload" 
                    type="file" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={handleConfirmPendingClockOut}
                    disabled={!proofFile || pressing}
                    className="btn btn-primary"
                    style={{ 
                      width: "100%",
                      padding: "8px", 
                      background: "var(--danger)",
                      fontSize: "0.78rem",
                      opacity: (!proofFile || pressing) ? 0.5 : 1
                    }}
                  >
                    {pressing ? "กำลังอัปโหลด..." : "ส่งรูป & บันทึกเวลาลงเวร"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center", minHeight: "130px", opacity: 0.4, textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem" }}>📁</div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    ฟอร์มแนบหลักฐานอัปโหลดรูปภาพเวร<br/>จะแสดงที่นี่เมื่อตรวจพบการลงเวรในเกม
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="active-shift-card-footer">
            <span>ℹ️ กรุณาอยู่ในโรงพยาบาลและพร้อมปฏิบัติงานก่อนกดเข้าเวร</span>
            <span>ตำแหน่งปัจจุบัน: Pillbox Hill Medical Center</span>
          </div>
        </div>

        {/* Col 2: Weekly Payout Calculator (1/3 width) */}
        <div className="weekly-bonus-summary-card">
          <div className="active-shift-card-header" style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
              โบนัส & ผลตอบแทนสะสมสัปดาห์นี้
            </span>
          </div>

          <div className="bonus-metrics-list">
            <div className="bonus-metric-item">
              <span className="label">ยศและเรทค่าเหนื่อย</span>
              <span className="value" style={{ color: "var(--accent-light)" }}>
                {userRank ? userRank.name : "แพทย์ประจำการ"} (${hourlyRate.toLocaleString()}/ชม)
              </span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">ชั่วโมงเวรสะสมสัปดาห์นี้</span>
              <span className="value">{weeklyHours.toFixed(1)} ชม.</span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">ยอดเงินโบนัสประมาณการ</span>
              <span className="value" style={{ color: "var(--accent-light)", fontSize: "1.1rem" }}>
                $ {estimatedPayout.toLocaleString("en-US")} IC
              </span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">จำนวนวันที่ปฏิบัติงานครบเกณฑ์</span>
              <span className="value">{qualifyingDays} วัน (เกณฑ์ ≥ {dailyMinHours} ชม./วัน)</span>
            </div>
          </div>

          <Link href="/dashboard/my-bonus" className="btn btn-ghost" style={{ width: "100%", fontSize: "0.75rem", padding: "10px", border: "1px solid var(--border-subtle)", justifyContent: "center" }}>
            ดูรายละเอียดสรุปโบนัสรายสัปดาห์ทั้งหมด
          </Link>
        </div>
      </div>

      {/* Row 2: 5-Column Stats Row */}
      <div className="dashboard-metrics-row">
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาเข้าเวรล่าสุด</span>
          <span className="metric-badge-value" style={{ fontSize: "0.85rem", fontFamily: "var(--font-ui)" }}>{latestInStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาลงเวรล่าสุด</span>
          <span className="metric-badge-value" style={{ fontSize: "0.85rem", fontFamily: "var(--font-ui)" }}>{latestOutStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาสะสมวันนี้</span>
          <span className="metric-badge-value">{todayHoursStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาสะสมสัปดาห์นี้</span>
          <span className="metric-badge-value">{formatHoursToHHMMSS(weeklyHours)}</span>
        </div>
        <div className="metric-badge-card" style={{ borderColor: weeklyHours >= bonusThreshold ? "var(--border-glow)" : "rgba(255,255,255,0.04)" }}>
          <span className="metric-badge-label">สถานะโบนัสสัปดาห์นี้</span>
          {weeklyHours >= bonusThreshold ? (
            <span className="metric-badge-value" style={{ color: "var(--accent-light)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.95rem" }}>
              <CheckIcon size={16} /> ผ่านเกณฑ์แล้ว
            </span>
          ) : (
            <span className="metric-badge-value" style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
              ขาดอีก {(bonusThreshold - weeklyHours).toFixed(1)} ชม.
            </span>
          )}
        </div>
      </div>

      {/* Row 3 Grid */}
      <div className="dashboard-grid-2-1">
        
        {/* Col 1: Shifts logs table (2/3 width) */}
        <div className="active-shift-card-wrapper" style={{ minHeight: "360px" }}>
          <div className="active-shift-card-header">
            <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>ประวัติการขึ้นเวรล่าสุด (5 ลำดับล่าสุด)</span>
            <select
              value={currentMonthFilter}
              onChange={(e) => setCurrentMonthFilter(e.target.value)}
              className="history-select"
              style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", width: "130px" }}
            >
              <option value="">ทั้งหมดทุกเดือน</option>
              {Array.from(new Set(shiftsHistory.map(s => {
                const d = new Date(s.clock_in);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              }))).map((monthStr) => {
                const [year, month] = monthStr.split("-");
                const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                return (
                  <option key={monthStr} value={monthStr}>
                    เดือน {thaiMonths[parseInt(month) - 1]} {parseInt(year) + 543}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ overflowX: "auto", marginTop: "12px", flex: 1 }}>
            <table className="spreadsheet-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>วันที่</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>เวลาเข้าเวร</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>เวลาลงเวร</th>
                  <th className="col-header right" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>ระยะเวลา</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px", textAlign: "center" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      ไม่มีบันทึกข้อมูลประวัติเวร
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((shift) => (
                    <tr key={shift.id}>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px" }}>
                        {new Date(shift.clock_in).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {new Date(shift.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} น.
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น." : "—"}
                      </td>
                      <td className="cell number" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {shift.status === "active" ? (
                          <span style={{ color: "var(--accent-light)" }}>กำลังเข้างาน...</span>
                        ) : (
                          formatHoursToHHMMSS((shift.duration_minutes || 0) / 60)
                        )}
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", textAlign: "center" }}>
                        <span className={`portal-status-badge ${shift.status}`}>
                          {shift.status === "active" && (
                            <>
                              <span className="portal-status-pulse" /> กำลังเข้าเวร
                            </>
                          )}
                          {shift.status === "completed" && "สำเร็จแล้ว"}
                          {shift.status === "pending_proof" && "รอแนบรูป"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px", marginTop: "12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <span>แสดง {filteredHistory.length} จากทั้งหมด {totalShiftsCount} บันทึกประวัติ</span>
            <Link href="/dashboard/history" style={{ color: "var(--accent-light)", textDecoration: "none", fontWeight: 600 }}>
              ดูหน้าประวัติเต็มทั้งหมด →
            </Link>
          </div>
        </div>

        {/* Col 2: Online Roster + Shortcuts (1/3 width) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Active Co-workers */}
          <div className="weekly-bonus-summary-card" style={{ flex: 1 }}>
            <div className="active-shift-card-header" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                เพื่อนร่วมเวรตอนนี้ (On-Duty Roster)
              </span>
            </div>

            <div className="roster-list">
              {activeDoctors.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "16px 0", textAlign: "center" }}>
                  ไม่มีหมอขึ้นเวรอยู่ในขณะนี้
                </div>
              ) : (
                activeDoctors.map((doc, idx) => (
                  <div key={idx} className="roster-doctor-item">
                    {doc.avatarUrl ? (
                      <img src={doc.avatarUrl} alt={doc.name} className="roster-doctor-avatar" />
                    ) : (
                      <div className="roster-doctor-fallback">🩺</div>
                    )}
                    <div className="roster-doctor-info">
                      <div className="roster-doctor-name">{doc.name}</div>
                      <div className="roster-doctor-rank">{doc.rank}</div>
                    </div>
                    <div className="roster-status-indicator" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Menu shortcuts */}
          <div className="weekly-bonus-summary-card">
            <div className="active-shift-card-header" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                เมนูลัดของหน่วยงาน
              </span>
            </div>

            <div className="shortcuts-grid">
              <Link href="/dashboard/op" className="shortcut-item-btn">
                <HospitalIcon size={20} className="shortcut-item-icon" />
                <span>จัดการเวร OP</span>
              </Link>
              <Link href="/dashboard/my-bonus" className="shortcut-item-btn">
                <MoneyIcon size={20} className="shortcut-item-icon" />
                <span>โบนัสของฉัน</span>
              </Link>
              <Link href="/dashboard/history" className="shortcut-item-btn">
                <ChartBarIcon size={20} className="shortcut-item-icon" />
                <span>ประวัติสะสม</span>
              </Link>
              <Link href="/dashboard/announcements" className="shortcut-item-btn">
                <MegaphoneIcon size={20} className="shortcut-item-icon" />
                <span>ข้อความประกาศ</span>
              </Link>
              <Link href="/dashboard/rules" className="shortcut-item-btn">
                <FileTextIcon size={20} className="shortcut-item-icon" />
                <span>กฎระเบียบแพทย์</span>
              </Link>
              <Link href="/dashboard/ranking" className="shortcut-item-btn">
                <TrophyIcon size={20} className="shortcut-item-icon" />
                <span>จัดอันดับสัปดาห์</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
