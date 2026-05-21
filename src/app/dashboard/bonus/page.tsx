"use client";

import { useEffect, useState, useCallback } from "react";
import * as React from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { formatHoursToHHMMSS } from "@/lib/utils";

interface PayoutRecord {
  id: string;
  bonus_history_id: string;
  doctor_email: string;
  doctor_name: string;
  amount: number;
  paid_at: string;
  paid_by: string;
}

interface RankingEntry {
  email?: string;
  name: string;
  discordUsername: string;
  totalHours: number;
  rankName?: string;
  appliedRate?: number;
  customName?: string;
  carriedOverBonus?: number;
  bonus_rate?: number;
}

interface DoctorRank {
  id: string;
  name: string;
  rate: number;
}

interface BonusHistory {
  id: string;
  week_start: string;
  week_end: string;
  bonus_rate: number;
  grand_total: number;
  hospital_fund: number;
  remaining_fund: number;
  snapshot_data: RankingEntry[];
  created_at: string;
  is_published?: boolean;
}

export default function BonusCalculatorPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [historyList, setHistoryList] = useState<BonusHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("live");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Payout State
  const [payoutMap, setPayoutMap] = useState<Record<string, PayoutRecord>>({});
  const [payingEmail, setPayingEmail] = useState<string | null>(null);

  // Bonus Calculator State
  const [hospitalFund, setHospitalFund] = useState<number>(1000000);
  const [doctorRanks, setDoctorRanks] = useState<DoctorRank[]>([]);
  const [userRanks, setUserRanks] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
  // Manage Ranks Modal
  const [showRankModal, setShowRankModal] = useState(false);
  const [rankForm, setRankForm] = useState<DoctorRank>({ id: "", name: "", rate: 50000 });
  const [bonusThreshold, setBonusThreshold] = useState<number>(20);
  const [fiftyPercentMode, setFiftyPercentMode] = useState<boolean>(false);

  // Dates
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const liveDateStr = `${format(weekStart, "d MMM", { locale: th })} - ${format(weekEnd, "d MMM yyyy", { locale: th })}`;

  useEffect(() => {
    Promise.all([
      fetch("/api/shifts/ranking").then(res => {
        if (!res.ok) {
          if (res.status === 403) throw new Error("ไม่มีสิทธิ์เข้าถึงหน้านี้");
          throw new Error("โหลดข้อมูลสัปดาห์ปัจจุบันไม่สำเร็จ");
        }
        return res.json();
      }),
      fetch("/api/admin/bonus-history").then(res => {
        if (!res.ok) return { history: [] }; // Silently fail if table not exist yet
        return res.json();
      }),
      fetch("/api/admin/settings").then(res => res.json())
    ])
      .then(([rankingData, historyData, settingsData]) => {
        if (rankingData.ranking) setRanking(rankingData.ranking);
        if (historyData.history) setHistoryList(historyData.history);
        
        if (settingsData?.settings) {
           if (settingsData.settings.doctor_ranks) setDoctorRanks(settingsData.settings.doctor_ranks);
           if (settingsData.settings.user_ranks) setUserRanks(settingsData.settings.user_ranks);
           if (settingsData.settings.user_names) setUserNames(settingsData.settings.user_names);
           if (settingsData.settings.bonus_threshold) setBonusThreshold(Number(settingsData.settings.bonus_threshold));
           if (settingsData.settings.bonus_50_percent_mode !== undefined) setFiftyPercentMode(!!settingsData.settings.bonus_50_percent_mode);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSaveSnapshot = async () => {
    if (ranking.length === 0) {
        alert("ไม่มีข้อมูลให้บันทึก");
        return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Prepare snapshot data with embedded ranks and custom names
      const snapshotDataWithRanks = ranking.map(user => {
        const rankId = user.email ? userRanks[user.email] : undefined;
        const rank = doctorRanks.find(r => r.id === rankId);
        const rate = rank ? rank.rate : 0;
        const customName = user.email ? userNames[user.email] : undefined;
        return {
          ...user,
          rankName: rank?.name || "ไม่ได้กำหนดยศ",
          appliedRate: rate,
          customName: customName
        };
      });

      const grandTotal = snapshotDataWithRanks.reduce((acc, curr) => {
        const baseBonus = Math.floor(curr.totalHours) * (curr.appliedRate || 0);
        const carried = curr.carriedOverBonus || 0;
        if (curr.totalHours < bonusThreshold) {
          if (fiftyPercentMode) {
            return acc + Math.floor(baseBonus * 0.5) + carried;
          }
          return acc; // Exclude unpaid (carried over to next week)
        }
        return acc + baseBonus + carried;
      }, 0);

      const res = await fetch("/api/admin/bonus-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: format(weekStart, "yyyy-MM-dd"),
          weekEnd: format(weekEnd, "yyyy-MM-dd"),
          bonusRate: 0, // Deprecated, but keeping for backward compat
          grandTotal: grandTotal,
          hospitalFund: hospitalFund,
          remainingFund: hospitalFund - grandTotal,
          snapshotData: snapshotDataWithRanks
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกไม่สำเร็จ (ตรวจสอบข้อมูลหรือตารางฐานข้อมูล)");
      }

      if (data.success) {
        setHistoryList([data.record, ...historyList]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (selectedHistoryId === "live") return;
    if (!confirm("คุณต้องการประกาศโบนัสสัปดาห์นี้ให้แพทย์ทุกคนทราบใช่หรือไม่?\n(ระบบจะส่งข้อความแจ้งเตือนไปที่ Discord)")) return;
    
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/bonus-history/${selectedHistoryId}/publish`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      setHistoryList(historyList.map(h => h.id === selectedHistoryId ? { ...h, is_published: true } : h));
      alert("ประกาศเรียบร้อยแล้ว!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Fetch payouts when selecting a history record
  const fetchPayouts = useCallback(async (historyId: string) => {
    if (historyId === "live") {
      setPayoutMap({});
      return;
    }
    try {
      const res = await fetch(`/api/admin/bonus-history/${historyId}/payout`);
      const data = await res.json();
      if (data.payouts) {
        const map: Record<string, PayoutRecord> = {};
        data.payouts.forEach((p: PayoutRecord) => {
          map[p.doctor_email] = p;
        });
        setPayoutMap(map);
      }
    } catch {
      setPayoutMap({});
    }
  }, []);

  useEffect(() => {
    fetchPayouts(selectedHistoryId);
  }, [selectedHistoryId, fetchPayouts]);

  // Check if payout window is open for a given history record
  const getPayoutWindowStatus = (historyId: string): { canPay: boolean; reason: string } => {
    if (historyId === "live") return { canPay: false, reason: "ต้องบันทึกประวัติก่อน" };
    
    const history = historyList.find(h => h.id === historyId);
    if (!history) return { canPay: false, reason: "ไม่พบข้อมูล" };

    const now = new Date();
    const weekEnd = new Date(history.week_end);
    
    // Payment window: Sunday 23:00 of that week → Sunday 23:00 of next week
    const windowStart = new Date(weekEnd);
    windowStart.setHours(23, 0, 0, 0);
    
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 7);

    if (now < windowStart) {
      return { canPay: false, reason: `เปิดให้จ่ายวันอาทิตย์ 23:00 น.` };
    }
    if (now > windowEnd) {
      return { canPay: false, reason: "🔒 หมดเวลาสั่งจ่าย" };
    }
    return { canPay: true, reason: "" };
  };

  const handlePayout = async (entry: RankingEntry, bonusAmount: number, customName: string) => {
    if (!entry.email) return;
    if (!confirm(`ยืนยันสั่งจ่ายโบนัส $${bonusAmount.toLocaleString()} ให้ ${customName} ?`)) return;

    setPayingEmail(entry.email);
    try {
      const res = await fetch(`/api/admin/bonus-history/${selectedHistoryId}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorEmail: entry.email,
          doctorName: customName,
          amount: bonusAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      // Update local state
      setPayoutMap(prev => ({
        ...prev,
        [entry.email as string]: data.payout,
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">💰 ตารางคำนวณโบนัส</h1>
          <p className="page-subtitle">กำลังโหลดข้อมูลชั่วโมงการทำงานสัปดาห์นี้...</p>
        </header>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          {error}
        </div>
      </div>
    );
  }

  const isLive = selectedHistoryId === "live";
  const activeData = isLive ? ranking : (historyList.find(h => h.id === selectedHistoryId)?.snapshot_data || []);
  const activeFund = isLive ? hospitalFund : (historyList.find(h => h.id === selectedHistoryId)?.hospital_fund || 0);
  
  const activeDateStr = isLive ? liveDateStr : (() => {
      const h = historyList.find(x => x.id === selectedHistoryId);
      if (!h) return "";
      return `${format(new Date(h.week_start), "d MMM", { locale: th })} - ${format(new Date(h.week_end), "d MMM yyyy", { locale: th })}`;
  })();

  const totalHoursAll = activeData.reduce((acc, curr) => acc + curr.totalHours, 0);
  
  const totalBonusAll = activeData.reduce((acc, curr) => {
    let rate = 0;
    if (isLive) {
      const rankId = curr.email ? userRanks[curr.email] : undefined;
      const rank = doctorRanks.find(r => r.id === rankId);
      rate = rank ? rank.rate : 0;
    } else {
      rate = curr.appliedRate || curr.bonus_rate || 0;
    }
    const baseBonus = Math.floor(curr.totalHours) * rate;
    const carried = curr.carriedOverBonus || 0;

    if (curr.totalHours < bonusThreshold) {
      if (fiftyPercentMode) {
        return acc + Math.floor(baseBonus * 0.5) + carried;
      }
      return acc; // Exclude from hospital fund deduction
    }
    return acc + baseBonus + carried;
  }, 0);
  
  const remainingFund = activeFund - totalBonusAll;

  return (
    <div className="page-container">
      <header className="page-header bonus-page-header">
        <div>
          <h1 className="page-title">💰 ตารางคำนวณโบนัส</h1>
          <p className="page-subtitle">
            รอบสัปดาห์: <strong style={{ color: "var(--accent-light)" }}>{activeDateStr}</strong>
          </p>
        </div>
        
        <div className="header-actions">
          <select 
            value={selectedHistoryId}
            onChange={e => setSelectedHistoryId(e.target.value)}
            className="history-select"
          >
            <option value="live">🔴 สัปดาห์ปัจจุบัน (Live)</option>
            {historyList.map(h => (
              <option key={h.id} value={h.id}>
                🗓️ {format(new Date(h.week_start), "d MMM")} - {format(new Date(h.week_end), "d MMM yyyy")}
              </option>
            ))}
          </select>

          {isLive && (
            <button 
              onClick={handleSaveSnapshot}
              disabled={isSaving}
              className="btn btn-primary save-snapshot-btn"
              style={{
                background: saveSuccess ? "var(--success)" : "var(--primary)"
              }}
            >
              {isSaving ? "กำลังบันทึก..." : saveSuccess ? "✅ บันทึกแล้ว" : "💾 บันทึกประวัติสัปดาห์นี้"}
            </button>
          )}

          {!isLive && (
             <button 
               onClick={handlePublish}
               disabled={isPublishing || historyList.find(h => h.id === selectedHistoryId)?.is_published}
               className="btn btn-primary share-bonus-btn"
               style={{
                 background: historyList.find(h => h.id === selectedHistoryId)?.is_published ? "var(--border-subtle)" : "#8b5cf6",
                 cursor: (isPublishing || historyList.find(h => h.id === selectedHistoryId)?.is_published) ? "not-allowed" : "pointer"
               }}
             >
               {historyList.find(h => h.id === selectedHistoryId)?.is_published ? "✅ ประกาศแล้ว" : isPublishing ? "กำลังประกาศ..." : "📢 แจ้งยอดให้แพทย์ (Share)"}
             </button>
          )}
        </div>
      </header>

      {/* Spreadsheet Toolbar */}
      <div className="spreadsheet-toolbar">
        <div className="toolbar-group">
          {isLive && (
            <button 
              onClick={() => setShowRankModal(true)}
              className="btn-manage-ranks"
            >
              ⭐ จัดการยศและเรทโบนัส
            </button>
          )}
        </div>
        <div className="toolbar-group">
          <label className="toolbar-label">เงินกองกลาง:</label>
          <div className="input-with-icon">
            <span className="currency-symbol">$</span>
            <input 
              type="number" 
              value={activeFund} 
              onChange={(e) => {
                if (isLive) setHospitalFund(Number(e.target.value) || 0)
              }}
              disabled={!isLive}
              className="rate-input"
              style={{ opacity: !isLive ? 0.6 : 1, cursor: !isLive ? "not-allowed" : "text", width: "160px" }}
            />
          </div>
        </div>
        <div className={`toggle-switch-wrap${fiftyPercentMode ? ' active' : ''}`}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={fiftyPercentMode}
              onChange={(e) => {
                const newVal = e.target.checked;
                setFiftyPercentMode(newVal);
                fetch("/api/admin/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "bonus_50_percent_mode", value: newVal })
                });
              }}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label" onClick={() => {
            const newVal = !fiftyPercentMode;
            setFiftyPercentMode(newVal);
            fetch("/api/admin/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: "bonus_50_percent_mode", value: newVal })
            });
          }}>
            โหมด 50%
            {fiftyPercentMode && <span className="toggle-badge">ON</span>}
          </span>
        </div>
        
        <div className="toolbar-group right">
          <div className="summary-box summary-initial">
            <span className="summary-label" style={{ color: "var(--text-secondary)" }}>ยอดกองกลางตั้งต้น</span>
            <span className="summary-value" style={{ color: "#f59e0b" }}>$ {activeFund.toLocaleString("en-US")}</span>
          </div>
          <div className="summary-box summary-deducted">
            <span className="summary-label" style={{ color: "var(--text-secondary)" }}>หักโบนัสสัปดาห์นี้</span>
            <span className="summary-value" style={{ color: "#ef4444" }}>- $ {totalBonusAll.toLocaleString("en-US")}</span>
          </div>
          <div className="summary-box summary-remaining">
            <span className="summary-label" style={{ color: "var(--text-primary)", fontWeight: "bold" }}>คงเหลือเข้าโรงพยาบาล</span>
            <span className="summary-value" style={{ fontSize: "1.4rem", color: "var(--accent)" }}>$ {remainingFund.toLocaleString("en-US")}</span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="spreadsheet-container">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              <th className="row-num-header"></th>
              <th>A</th>
              <th>B</th>
              <th>C</th>
              <th>D</th>
              <th>E</th>
              {!isLive && <th>F</th>}
            </tr>
            <tr>
              <th className="row-num-header">1</th>
              <th className="col-header">Discord Username</th>
              <th className="col-header">ชื่อ-นามสกุล (Custom Name)</th>
              <th className="col-header">ยศ (Rank)</th>
              <th className="col-header right">ชั่วโมงรวม ({isLive ? "สัปดาห์นี้" : "ที่บันทึก"})</th>
              <th className="col-header right highlight">ยอดโบนัสสุทธิ ($)</th>
              {!isLive && <th className="col-header" style={{ textAlign: "center" }}>สั่งจ่าย</th>}
            </tr>
          </thead>
          <tbody>
            {activeData.length === 0 ? (
              <tr>
                <td className="row-num">2</td>
                <td colSpan={4} className="empty-cell">ไม่มีข้อมูลในรอบนี้</td>
              </tr>
            ) : (
              activeData.map((entry, idx) => {
                const rowNum = idx + 2;
                
                let rankName = "ไม่ได้กำหนดยศ";
                let appliedRate = 0;
                let customName = entry.name || "N/A";

                if (isLive) {
                  const rankId = entry.email ? userRanks[entry.email] : undefined;
                  const rank = doctorRanks.find(r => r.id === rankId);
                  if (rank) {
                    rankName = rank.name;
                    appliedRate = rank.rate;
                  }
                  if (entry.email && userNames[entry.email]) {
                    customName = userNames[entry.email];
                  }
                } else {
                  rankName = entry.rankName || "ไม่ได้กำหนดยศ";
                  appliedRate = entry.appliedRate || entry.bonus_rate || 0;
                  customName = entry.customName || entry.name || "N/A";
                }

                const baseBonus = Math.floor(entry.totalHours) * appliedRate;
                const carriedOverBonus = entry.carriedOverBonus || 0;
                const isBelowThreshold = entry.totalHours < bonusThreshold;
                const effectiveBaseBonus = (isBelowThreshold && fiftyPercentMode) ? Math.floor(baseBonus * 0.5) : baseBonus;
                const bonusAmount = isBelowThreshold && !fiftyPercentMode ? 0 : effectiveBaseBonus + carriedOverBonus;
                
                return (
                  <tr key={idx}>
                    <td className="row-num">{rowNum}</td>
                    <td className="cell bold">@{entry.discordUsername || "N/A"}</td>
                    <td className="cell">
                      {isLive && entry.email ? (
                        <input 
                          type="text" 
                          value={customName}
                          onChange={e => {
                            if (entry.email) {
                              setUserNames(prev => ({ ...prev, [entry.email as string]: e.target.value }));
                            }
                          }}
                          onBlur={() => {
                            // Automatically save to API when leaving the input
                            fetch("/api/admin/settings", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ key: "user_names", value: { ...userNames } })
                            });
                          }}
                          placeholder="ชื่อในเกม..."
                        />
                      ) : (
                        <span className="text-muted">{customName}</span>
                      )}
                    </td>
                    <td className="cell">
                      {isLive && entry.email ? (
                        <select
                          value={userRanks[entry.email] || ""}
                          onChange={e => {
                            const newRanks = { ...userRanks, [entry.email as string]: e.target.value };
                            setUserRanks(newRanks);
                            // Save automatically
                            fetch("/api/admin/settings", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ key: "user_ranks", value: newRanks })
                            });
                          }}
                        >
                          <option value="">-- เลือกยศ --</option>
                          {doctorRanks.map(r => (
                            <option key={r.id} value={r.id}>{r.name} (${r.rate.toLocaleString()}/ชม)</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ background: "var(--bg-secondary)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>
                          {rankName} (${appliedRate.toLocaleString()})
                        </span>
                      )}
                    </td>
                    <td className="cell number">{formatHoursToHHMMSS(entry.totalHours)}</td>
                    <td 
                      className="cell number highlight-cell" 
                      style={{ 
                        color: isBelowThreshold
                          ? (fiftyPercentMode ? "#f59e0b" : "#ef4444")
                          : "var(--accent)" 
                      }}
                      title={isBelowThreshold ? (
                        fiftyPercentMode
                          ? `ชั่วโมงไม่ถึงเกณฑ์ (${bonusThreshold} ชม.) — ได้รับ 50%`
                          : `ชั่วโมงไม่ถึงเกณฑ์ (ขั้นต่ำ ${bonusThreshold} ชม.) — ยกไปสัปดาห์หน้า`
                      ) : ""}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        {isBelowThreshold && !fiftyPercentMode ? (
                          <span style={{ color: "#ef4444", fontSize: "0.85rem" }}>— ยกยอด</span>
                        ) : (
                          <>
                            <span>$ {bonusAmount.toLocaleString("en-US")}</span>
                            {isBelowThreshold && fiftyPercentMode && (
                              <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 600 }}>
                                (50% ลดจาก ${(baseBonus + carriedOverBonus).toLocaleString()})
                              </span>
                            )}
                          </>
                        )}
                        {carriedOverBonus > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            (ยกยอดมา $ {carriedOverBonus.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </td>
                    {!isLive && (
                      <td className="cell" style={{ textAlign: "center" }}>
                        {(() => {
                          const isPaid = entry.email ? !!payoutMap[entry.email] : false;
                          const isPaying = payingEmail === entry.email;
                          const windowStatus = getPayoutWindowStatus(selectedHistoryId);

                          if (isPaid) {
                            return (
                              <span style={{
                                background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                                color: "var(--accent-light)",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                              }}>✅ จ่ายแล้ว</span>
                            );
                          }
                          if (isBelowThreshold && !fiftyPercentMode) {
                            return (
                              <span style={{
                                background: "rgba(107, 114, 128, 0.15)",
                                color: "#6b7280",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                              }} title={`ชั่วโมงไม่ถึง ${bonusThreshold} ชม. — ยกยอดไปสัปดาห์หน้า`}>—</span>
                            );
                          }
                          if (!windowStatus.canPay) {
                            return (
                              <span style={{
                                background: "rgba(107, 114, 128, 0.1)",
                                color: "#6b7280",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                              }}>{windowStatus.reason}</span>
                            );
                          }
                          return (
                            <button
                              onClick={() => handlePayout(entry, bonusAmount, customName)}
                              disabled={isPaying}
                              style={{
                                background: isPaying ? "var(--border-subtle)" : "color-mix(in srgb, var(--accent) 20%, transparent)",
                                color: isPaying ? "var(--text-muted)" : "var(--accent-light)",
                                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                cursor: isPaying ? "not-allowed" : "pointer",
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                transition: "0.2s",
                              }}
                            >
                              {isPaying ? "กำลังจ่าย..." : "💸 สั่งจ่าย"}
                            </button>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
            
            {/* Total Row */}
            {activeData.length > 0 && (
              <tr className="total-row">
                <td className="row-num">{activeData.length + 2}</td>
                <td colSpan={3} className="cell right bold">GRAND TOTAL</td>
                <td className="cell number bold">{formatHoursToHHMMSS(totalHoursAll)}</td>
                <td className="cell number bold highlight-total">$ {totalBonusAll.toLocaleString("en-US")}</td>
                {!isLive && <td></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rank Management Modal */}
      {showRankModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: "24px", overflowY: "auto" }}>
            <h2 style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⭐ จัดการยศและเรทโบนัส</span>
              <button onClick={() => setShowRankModal(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {doctorRanks.map((r, i) => (
                <div key={r.id} style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
                  <input 
                    type="text" 
                    value={r.name}
                    onChange={e => {
                      const newRanks = [...doctorRanks];
                      newRanks[i].name = e.target.value;
                      setDoctorRanks(newRanks);
                    }}
                    placeholder="ชื่อยศ..."
                    style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "8px", borderRadius: "4px" }}
                  />
                  <input 
                    type="number" 
                    value={r.rate}
                    onChange={e => {
                      const newRanks = [...doctorRanks];
                      newRanks[i].rate = Number(e.target.value) || 0;
                      setDoctorRanks(newRanks);
                    }}
                    placeholder="เรท/ชม."
                    style={{ width: "100px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", padding: "8px", borderRadius: "4px" }}
                  />
                  <button 
                    onClick={() => setDoctorRanks(doctorRanks.filter(x => x.id !== r.id))}
                    style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    ลบ
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => setDoctorRanks([...doctorRanks, { id: Date.now().toString(), name: "", rate: 30000 }])}
                style={{ background: "var(--bg-secondary)", border: "1px dashed var(--border-subtle)", padding: "12px", borderRadius: "8px", color: "var(--text-primary)", cursor: "pointer", fontWeight: "bold" }}
              >
                + เพิ่มยศใหม่
              </button>
            </div>

            <button 
              onClick={() => {
                fetch("/api/admin/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "doctor_ranks", value: doctorRanks })
                }).then(() => setShowRankModal(false));
              }}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "1.1rem" }}
            >
              💾 บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
