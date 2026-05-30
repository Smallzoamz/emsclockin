"use client";

import { useEffect, useState } from "react";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CoinsIcon, MoneyIcon, CrossIcon, CheckIcon, ClockIcon } from "@/components/Icons";

interface MyBonusEntry {
  id: string;
  week_start: string;
  week_end: string;
  bonus_rate: number;
  my_hours: number;
  my_bonus: number;
  rank_name?: string;
  custom_name?: string;
  is_below_threshold?: boolean;
  is_paid?: boolean;
  paid_at?: string | null;
  created_at: string;
}

export default function MyBonusPage() {
  const [bonuses, setBonuses] = useState<MyBonusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "โบนัสของฉัน | EMS Clock-in";
    fetch("/api/shifts/my-bonus")
      .then(res => {
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        return res.json();
      })
      .then(data => {
        if (data.myBonuses) {
          setBonuses(data.myBonuses);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">
            <CoinsIcon className="inline mr-2 text-[var(--accent)]" /> โบนัสของฉัน
          </h1>
          <p className="page-subtitle">กำลังโหลดประวัติโบนัสส่วนตัว...</p>
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

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            <CoinsIcon className="inline mr-2 text-[var(--accent)]" /> โบนัสของฉัน
          </h1>
          <p className="page-subtitle">ตรวจสอบประวัติยอดโบนัสรายสัปดาห์ของคุณ</p>
        </div>
      </header>

      {bonuses.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <MoneyIcon size={48} className="text-[var(--accent)]" />
          </div>
          <h3 style={{ color: "var(--text-secondary)" }}>ยังไม่มีการประกาศโบนัส</h3>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
          {bonuses.map(bonus => {
            // Determine payment status
            let statusBadge: React.ReactNode;
            if (bonus.is_below_threshold) {
              statusBadge = (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}>
                  <CrossIcon size={14} className="text-red-500" /> ชั่วโมงไม่ถึงเกณฑ์ (ยกไปสัปดาห์ถัดไป)
                </div>
              );
            } else if (bonus.is_paid) {
              statusBadge = (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  color: "var(--accent-light)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                }}>
                  <CheckIcon size={14} className="text-emerald-500" /> ได้รับโบนัสแล้ว
                  {bonus.paid_at && (
                    <span style={{ fontWeight: "normal", opacity: 0.8 }}>
                      ({format(new Date(bonus.paid_at), "d MMM yyyy HH:mm", { locale: th })})
                    </span>
                  )}
                </div>
              );
            } else {
              statusBadge = (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}>
                  <ClockIcon size={14} className="text-amber-500" /> รอสั่งจ่าย
                </div>
              );
            }

            return (
              <div key={bonus.id} className="card" style={{ padding: "24px" }}>
                {/* Top row: date + status badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    รอบวันที่ {format(new Date(bonus.week_start), "d MMM")} - {format(new Date(bonus.week_end), "d MMM yyyy", { locale: th })}
                  </div>
                  {statusBadge}
                </div>

                {/* Content row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}>
                        {bonus.custom_name || "N/A"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                        ยศ: {bonus.rank_name || "ไม่ได้กำหนดยศ"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "24px" }}>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ชั่วโมงรวม</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                          {formatHoursToHHMMSS(bonus.my_hours)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>เรท/ชม.</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          ${bonus.bonus_rate.toLocaleString("en-US")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: bonus.is_below_threshold ? "rgba(239, 68, 68, 0.1)" : bonus.is_paid ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "rgba(245, 158, 11, 0.1)", 
                    padding: "16px 24px", 
                    borderRadius: "12px", 
                    border: bonus.is_below_threshold ? "1px solid rgba(239, 68, 68, 0.2)" : bonus.is_paid ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" : "1px solid rgba(245, 158, 11, 0.2)", 
                    textAlign: "right", 
                    minWidth: "200px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end"
                  }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "bold", marginBottom: "4px" }}>ยอดโบนัสที่ได้รับ</div>
                    <div style={{ 
                      fontSize: "2rem", 
                      fontWeight: "800", 
                      color: bonus.is_below_threshold ? "#ef4444" : bonus.is_paid ? "var(--accent-light)" : "#f59e0b", 
                      fontFamily: "var(--font-mono)" 
                    }}>
                      $ {bonus.my_bonus.toLocaleString("en-US")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
