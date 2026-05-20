"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";

interface WeeklySummary {
  weekStart: string;
  totalHours: number;
  shiftCount: number;
  bonusEligible: boolean;
}

interface WeeklyChartProps {
  data: WeeklySummary[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.length === 0) {
    return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>ยังไม่มีข้อมูล</p>;
  }

  const maxHours = Math.max(...data.map((d) => d.totalHours), 25);
  const bonusThreshold = 20;
  const thresholdPercent = (bonusThreshold / maxHours) * 100;

  return (
    <div className="chart-container">
      <div style={{ position: "relative" }}>
        {/* Threshold line */}
        <div
          style={{
            position: "absolute",
            bottom: `${thresholdPercent}%`,
            left: 0,
            right: 0,
            borderTop: "2px dashed var(--warning)",
            opacity: 0.4,
            zIndex: 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 0,
              top: "-18px",
              fontSize: "0.65rem",
              color: "var(--warning)",
              fontWeight: 600,
            }}
          >
            โบนัส 20 ชม.
          </span>
        </div>

        <div className="chart-bars">
          {data.map((week, i) => {
            const heightPercent = maxHours > 0 ? (week.totalHours / maxHours) * 100 : 0;
            const weekLabel = format(new Date(week.weekStart), "d MMM", { locale: th });

            return (
              <div key={i} className="chart-bar-wrapper">
                <span className="chart-bar-value">{week.totalHours.toFixed(1)}</span>
                <div
                  className={`chart-bar ${week.bonusEligible ? "bonus" : "no-bonus"}`}
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  title={`${weekLabel}: ${week.totalHours.toFixed(1)} ชม. (${week.shiftCount} เวร)`}
                />
                <span className="chart-bar-label">{weekLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
