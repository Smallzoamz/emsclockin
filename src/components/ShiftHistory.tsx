"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Shift {
  id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  status: string;
}

interface ShiftHistoryProps {
  shifts: Shift[];
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} นาที`;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

export function ShiftHistory({ shifts }: ShiftHistoryProps) {
  if (shifts.length === 0) {
    return <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>ยังไม่มีประวัติเวร</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="shift-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>เข้าเวร</th>
            <th>ออกเวร</th>
            <th>ระยะเวลา</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id}>
              <td>{format(new Date(shift.clock_in), "d MMM yyyy", { locale: th })}</td>
              <td className="mono">{format(new Date(shift.clock_in), "HH:mm")}</td>
              <td className="mono">
                {shift.clock_out ? format(new Date(shift.clock_out), "HH:mm") : "—"}
              </td>
              <td className="mono">
                {shift.duration_minutes ? formatDuration(shift.duration_minutes) : "—"}
              </td>
              <td>
                <span className={`status-badge ${shift.status === "active" ? "on-duty" : "off-duty"}`}>
                  <span className="status-dot" />
                  {shift.status === "active" ? "อยู่ในเวร" : "เสร็จสิ้น"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
