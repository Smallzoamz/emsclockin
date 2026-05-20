"use client";

import { useEffect, useState } from "react";
import { formatHoursToHHMMSS } from "@/lib/utils";

interface RankingEntry {
  name: string;
  discordUsername: string;
  totalHours: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            <h1 className="page-title">🏆 จัดอันดับแพทย์</h1>
            <p className="page-subtitle">กำลังโหลดข้อมูล...</p>
          </div>
        </header>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const top3 = ranking.slice(0, 3);
  const others = ranking.slice(3);

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🏆 ทำเนียบแพทย์ดีเด่น
          </h1>
          <p className="page-subtitle">ชั่วโมงการเข้าเวรสูงสุดประจำสัปดาห์</p>
        </div>
      </header>

      {ranking.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🏥</div>
          <h3 style={{ color: "var(--text-secondary)" }}>ยังไม่มีข้อมูลการเข้าเวรในสัปดาห์นี้</h3>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="podium-grid">
            {top3.map((entry, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const rankIcon = isFirst ? "👑" : rank === 2 ? "🥈" : "🥉";
              const accentColor = isFirst ? "#f59e0b" : rank === 2 ? "#94a3b8" : "#d97706";

              return (
                <div key={index} className={`podium-card rank-${rank}`}>
                  <div className="rank-badge" style={{ background: accentColor }}>
                    {rankIcon} อันดับ {rank}
                  </div>
                  <div className="podium-avatar">
                    {entry.discordUsername ? entry.discordUsername.charAt(0).toUpperCase() : entry.name.charAt(0)}
                  </div>
                  <div className="podium-info">
                    <div className="podium-name">
                      {entry.discordUsername ? `@${entry.discordUsername}` : entry.name}
                    </div>
                    {entry.discordUsername && entry.name && (
                      <div className="podium-subname">{entry.name}</div>
                    )}
                    <div className="podium-hours" style={{ color: accentColor }}>
                      {formatHoursToHHMMSS(entry.totalHours)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Others List */}
          {others.length > 0 && (
            <div className="ranking-list card" style={{ marginTop: "32px", padding: "0" }}>
              {others.map((entry, index) => (
                <div key={index + 3} className="ranking-list-item">
                  <div className="rank-number">#{index + 4}</div>
                  <div className="ranking-user-info">
                    <div className="ranking-name">
                      {entry.discordUsername ? `@${entry.discordUsername}` : entry.name}
                    </div>
                    {entry.discordUsername && entry.name && (
                      <div className="ranking-subname">{entry.name}</div>
                    )}
                  </div>
                  <div className="ranking-hours">
                    {formatHoursToHHMMSS(entry.totalHours)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
