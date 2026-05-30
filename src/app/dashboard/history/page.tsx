"use client";

import { useState, useEffect, useCallback } from "react";
import { WeeklyChart } from "@/components/WeeklyChart";
import { ShiftHistory } from "@/components/ShiftHistory";
import { formatHoursToHHMMSS } from "@/lib/utils";

interface WeeklySummary {
  weekStart: string;
  totalMinutes: number;
  totalHours: number;
  shiftCount: number;
  bonusEligible: boolean;
  bonusThreshold: number;
}

interface Shift {
  id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  status: string;
}

export default function HistoryPage() {
  const [weeklyData, setWeeklyData] = useState<WeeklySummary[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [weeklyRes, historyRes] = await Promise.all([
        fetch("/api/shifts/weekly-summary"),
        fetch("/api/shifts/history?limit=50"),
      ]);
      const weeklyJson = await weeklyRes.json();
      const historyJson = await historyRes.json();
      setWeeklyData(weeklyJson.summary || []);
      setShifts(historyJson.shifts || []);
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "ประวัติ & ชั่วโมง | EMS Clock-in";
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="loading-spinner" />;

  const currentWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📊 ประวัติ & ชั่วโมง</h1>
        <p className="page-desc">ติดตามชั่วโมงเวรรายสัปดาห์และคำนวณโบนัส</p>
      </div>

      {/* Current Week Summary */}
      {currentWeek && (
        <div className="stats-grid" style={{ marginBottom: "24px" }}>
          <div className="stat-card">
            <div className="stat-value" style={{ fontFamily: "var(--font-mono)" }}>{formatHoursToHHMMSS(currentWeek.totalHours)}</div>
            <div className="stat-label">ชั่วโมงสัปดาห์นี้</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{currentWeek.shiftCount}</div>
            <div className="stat-label">จำนวนเวร</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              <span className={`bonus-badge ${currentWeek.bonusEligible ? "eligible" : "not-eligible"}`}>
                {currentWeek.bonusEligible ? "✅ ผ่านเกณฑ์" : "❌ ยังไม่ผ่าน"}
              </span>
            </div>
            <div className="stat-label">โบนัสรายสัปดาห์ (≥{currentWeek.bonusThreshold} ชม.)</div>
          </div>
        </div>
      )}

      {/* Weekly Chart */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header">
          <span className="card-title">📈 ชั่วโมงรายสัปดาห์ (8 สัปดาห์ล่าสุด)</span>
        </div>
        <WeeklyChart data={weeklyData} />
      </div>

      {/* Shift History Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 ประวัติเวรล่าสุด</span>
        </div>
        <ShiftHistory shifts={shifts} />
      </div>
    </>
  );
}
