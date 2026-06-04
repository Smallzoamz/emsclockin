"use client";

import { useEffect, useState } from "react";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { TrophyIcon, HospitalIcon, CrownIcon } from "@/components/Icons";

interface RankingEntry {
  name: string;
  discordUsername: string;
  totalHours: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "จัดอันดับสัปดาห์นี้ | EMS Clock-in";
    fetch("/api/shifts/ranking")
      .then((res) => res.json())
      .then((data) => {
        if (data.ranking) {
          setRanking(data.ranking);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load ranking", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1 className="page-title">
              <TrophyIcon className="inline mr-2 text-[#f59e0b]" size={28} /> จัดอันดับแพทย์
            </h1>
            <p className="page-subtitle">กำลังโหลดข้อมูล...</p>
          </div>
        </header>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const maxHours = ranking.length > 0 && ranking[0].totalHours > 0 ? ranking[0].totalHours : 1;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            <TrophyIcon className="text-[#f59e0b]" size={28} /> ทำเนียบแพทย์ดีเด่น
          </h1>
          <p className="page-subtitle">ชั่วโมงการเข้าเวรสูงสุดประจำสัปดาห์</p>
        </div>
      </header>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <HospitalIcon size={48} className="text-[var(--accent)]" />
          </div>
          <h3 style={{ color: "var(--text-secondary)" }}>ยังไม่มีข้อมูลการเข้าเวรในสัปดาห์นี้</h3>
        </div>
      ) : (
        <div className="leaderboard-container">
          {ranking.map((entry, index) => {
            const rank = index + 1;
            const percentage = (entry.totalHours / maxHours) * 100;

            return (
              <div key={index} className={`leaderboard-row rank-${rank <= 3 ? rank : 'other'}`}>
                <div 
                  className="leaderboard-progress-bg" 
                  style={{ width: `${percentage}%` }}
                />
                <div 
                  className="leaderboard-progress-line" 
                  style={{ width: `${percentage}%` }}
                />
                
                <div className={`leaderboard-rank rank-${rank <= 3 ? rank : 'other'}`}>
                  {rank === 1 && <CrownIcon size={24} />}
                  {rank === 2 && <TrophyIcon size={22} style={{ filter: "grayscale(100%) brightness(1.2)" }} />}
                  {rank === 3 && <TrophyIcon size={22} style={{ filter: "hue-rotate(320deg) saturate(1.5)" }} />}
                  {rank > 3 && `#${rank}`}
                </div>

                <div className="leaderboard-avatar-wrapper">
                  <div className="leaderboard-avatar">
                    {entry.name ? entry.name.charAt(0).toUpperCase() : (entry.discordUsername ? entry.discordUsername.charAt(0).toUpperCase() : "D")}
                  </div>
                </div>

                <div className="leaderboard-user-info">
                  <div className="leaderboard-name">
                    {entry.name}
                    {rank === 1 && (
                      <span className="text-[10px] bg-[#fbbf24]/20 text-[#fbbf24] px-2 py-0.5 rounded-full border border-[#fbbf24]/30 uppercase font-extrabold tracking-wider animate-pulse">
                        Top Active
                      </span>
                    )}
                  </div>
                  {entry.discordUsername && (
                    <div className="leaderboard-subname">@{entry.discordUsername}</div>
                  )}
                </div>

                <div className="leaderboard-hours-wrapper">
                  <div className="leaderboard-hours">
                    {formatHoursToHHMMSS(entry.totalHours)}
                  </div>
                  <div className="leaderboard-hours-label">ชั่วโมงงาน</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
