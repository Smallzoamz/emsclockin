"use client";

import { useState, useEffect } from "react";

interface LiveTimerProps {
  isOnDuty: boolean;
  clockInTime?: string | null;
}

export function LiveTimer({ isOnDuty, clockInTime }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!isOnDuty || !clockInTime) {
      setElapsed("00:00:00");
      return;
    }

    const startTime = new Date(clockInTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, now - startTime);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOnDuty, clockInTime]);

  return (
    <div className={`live-timer ${isOnDuty ? "" : "off-duty"}`}>
      {isOnDuty ? elapsed : "ไม่ได้อยู่ในเวร"}
    </div>
  );
}
