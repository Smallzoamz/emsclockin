"use client";

import { useEffect, useState } from "react";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { TrophyIcon, HospitalIcon, CrownIcon } from "@/components/Icons";
import { getSession } from "next-auth/react";

interface RankingEntry {
  email?: string;
  name: string;
  discordUsername: string;
  discordId?: string | null;
  avatarUrl?: string | null;
  totalHours: number;
}

function RankingAvatar({
  avatarUrl,
  name,
  className,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  className: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = name?.trim()?.charAt(0).toUpperCase() || "D";

  return (
    <div className={className} aria-label={`Discord profile image: ${name || "Doctor"}`}>
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt=""
          className="ranking-avatar-image"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="ranking-avatar-fallback">{fallback}</span>
      )}
    </div>
  );
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    document.title = "จัดอันดับสัปดาห์นี้ | EMS Clock-in";
    
    // Load session user
    getSession().then((session) => {
      if (session?.user) {
        setSessionUser(session.user);
      }
    });

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
  
  // Extract ranks 1, 2, 3 for the pyramid
  const rank1 = ranking[0];
  const rank2 = ranking[1];
  const rank3 = ranking[2];
  
  // Slicing others to ranks 4 to 10 (index 3 to 10)
  const others = ranking.slice(3, 10);

  // Find the logged-in user's entry and rank in the FULL ranking array
  const userIndex = ranking.findIndex(entry => 
    (sessionUser?.email && entry.email === sessionUser.email) ||
    (sessionUser?.discordId && entry.discordId === sessionUser.discordId) ||
    (sessionUser?.discordUsername && entry.discordUsername === sessionUser.discordUsername) ||
    (sessionUser?.name && entry.name === sessionUser.name)
  );
  
  const userRank = userIndex !== -1 ? userIndex + 1 : null;
  const userEntry = userIndex !== -1 ? ranking[userIndex] : null;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title ranking-page-title">
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
        <>
          {/* Pyramid podium for ranks 1-3 */}
          <div className="pyramid-container">
            {rank2 && (
              <div className="pyramid-card rank-2">
                <div className="pyramid-rank-badge rank-2">
                  <TrophyIcon size={14} style={{ filter: "grayscale(100%) brightness(1.2)" }} /> อันดับ 2
                </div>
                <RankingAvatar avatarUrl={rank2.avatarUrl} name={rank2.name} className="pyramid-avatar" />
                <div className="pyramid-name">{rank2.name}</div>
                {rank2.discordUsername && <div className="pyramid-subname">@{rank2.discordUsername}</div>}
                <div className="pyramid-hours">{formatHoursToHHMMSS(rank2.totalHours)}</div>
              </div>
            )}

            {rank1 && (
              <div className="pyramid-card rank-1">
                <div className="pyramid-rank-badge rank-1">
                  <CrownIcon size={14} /> อันดับ 1
                </div>
                <RankingAvatar avatarUrl={rank1.avatarUrl} name={rank1.name} className="pyramid-avatar" />
                <div className="pyramid-name">
                  {rank1.name}
                  <span className="top-active-badge">
                    Top Active
                  </span>
                </div>
                {rank1.discordUsername && <div className="pyramid-subname">@{rank1.discordUsername}</div>}
                <div className="pyramid-hours">{formatHoursToHHMMSS(rank1.totalHours)}</div>
              </div>
            )}

            {rank3 && (
              <div className="pyramid-card rank-3">
                <div className="pyramid-rank-badge rank-3">
                  <TrophyIcon size={14} style={{ filter: "hue-rotate(320deg) saturate(1.5)" }} /> อันดับ 3
                </div>
                <RankingAvatar avatarUrl={rank3.avatarUrl} name={rank3.name} className="pyramid-avatar" />
                <div className="pyramid-name">{rank3.name}</div>
                {rank3.discordUsername && <div className="pyramid-subname">@{rank3.discordUsername}</div>}
                <div className="pyramid-hours">{formatHoursToHHMMSS(rank3.totalHours)}</div>
              </div>
            )}
          </div>

          {/* Others list (Ranks 4-10) */}
          {others.length > 0 && (
            <div className="leaderboard-container">
              {others.map((entry, index) => {
                const rank = index + 4;
                const percentage = (entry.totalHours / maxHours) * 100;

                return (
                  <div key={index} className="leaderboard-row rank-other">
                    <div 
                      className="leaderboard-progress-bg" 
                      style={{ width: `${percentage}%` }}
                    />
                    <div 
                      className="leaderboard-progress-line" 
                      style={{ width: `${percentage}%` }}
                    />
                    
                    <div className="leaderboard-rank rank-other">
                      #{rank}
                    </div>

                    <div className="leaderboard-avatar-wrapper">
                      <RankingAvatar avatarUrl={entry.avatarUrl} name={entry.name} className="leaderboard-avatar" />
                    </div>

                    <div className="leaderboard-user-info">
                      <div className="leaderboard-name">
                        <span className="leaderboard-name-text">{entry.name}</span>
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
        </>
      )}

      {/* Personal Rank Card (Displayed at the bottom if logged in) */}
      {sessionUser && (
        <div className="personal-rank-card">
          <div className="personal-rank-info-block">
            <div className="personal-rank-title">ข้อมูลอันดับของคุณ (Your Ranking)</div>
            <div className="personal-rank-content">
              <div className="leaderboard-avatar-wrapper">
                <RankingAvatar
                  avatarUrl={userEntry?.avatarUrl || sessionUser.avatar || sessionUser.image}
                  name={userEntry?.name || sessionUser.name}
                  className="leaderboard-avatar personal-rank-avatar"
                />
              </div>
              
              <div className="leaderboard-user-info">
                <div className="leaderboard-name" style={{ color: 'var(--text-primary)' }}>
                  <span className="leaderboard-name-text">{userEntry?.name || sessionUser.name || "Unknown"}</span>
                  <span className="active-user-badge">
                    Active User
                  </span>
                </div>
                <div className="leaderboard-subname">
                  @{userEntry?.discordUsername || sessionUser.discordUsername || sessionUser.name || ""}
                </div>
              </div>

              <div className="personal-rank-badge-status">
                <div className="personal-rank-number">
                  {userRank ? `#${userRank}` : "ไม่มีอันดับ"}
                </div>
                <div className="personal-rank-label">อันดับปัจจุบัน</div>
              </div>

              <div className="leaderboard-hours-wrapper">
                <div className="leaderboard-hours" style={{ color: 'var(--accent-light)' }}>
                  {userEntry ? formatHoursToHHMMSS(userEntry.totalHours) : "00:00:00"}
                </div>
                <div className="leaderboard-hours-label">ชั่วโมงงาน</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
