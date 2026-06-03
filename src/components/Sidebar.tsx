"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  StethoscopeIcon,
  ClockIcon,
  HospitalIcon,
  MegaphoneIcon,
  TrophyIcon,
  ChartBarIcon,
  MoneyIcon,
  ShieldIcon,
  CrownIcon,
  CoinsIcon,
  SettingsIcon,
  FileTextIcon,
  UserPlusIcon
} from "./Icons";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    isOp?: boolean | null;
    discordId?: string | null;
  };
  logoUrl?: string;
}

export function Sidebar({ user, logoUrl }: SidebarProps) {
  const pathname = usePathname();
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [bonusThreshold, setBonusThreshold] = useState(20);
  const [userRankName, setUserRankName] = useState("แพทย์ประจำการ");

  useEffect(() => {
    // Fetch weekly summary and settings to render profile details
    async function loadData() {
      try {
        const [weeklyRes, settingsRes] = await Promise.all([
          fetch("/api/shifts/weekly-summary"),
          fetch("/api/admin/settings")
        ]);
        const weeklyData = await weeklyRes.json();
        const settingsData = await settingsRes.json();

        if (settingsData.settings) {
          const threshold = Number(settingsData.settings.bonus_threshold) || 20;
          setBonusThreshold(threshold);

          if (user.email && settingsData.settings.user_ranks && settingsData.settings.doctor_ranks) {
            const userRankId = settingsData.settings.user_ranks[user.email];
            const rankObj = settingsData.settings.doctor_ranks.find((r: any) => r.id === userRankId);
            if (rankObj) {
              setUserRankName(rankObj.name);
            }
          }
        }

        if (weeklyData.summary && weeklyData.summary.length > 0) {
          const current = weeklyData.summary[weeklyData.summary.length - 1];
          setWeeklyHours(current.totalHours || 0);
        }
      } catch (err) {
        console.error("[Sidebar Data Fetch] Error:", err);
      }
    }
    loadData();
  }, [user.email]);

  const percentage = Math.min(100, Math.floor((weeklyHours / bonusThreshold) * 100));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div 
          className="logo-icon" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "40px", 
            height: "40px", 
            padding: logoUrl ? "4px" : "0", 
            background: logoUrl ? "var(--bg-glass)" : undefined,
            border: logoUrl ? "1px solid var(--border-subtle)" : undefined
          }}
        >
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="City Logo" 
              style={{ 
                maxWidth: "100%", 
                maxHeight: "100%", 
                objectFit: "contain" 
              }} 
            />
          ) : (
            <HospitalIcon size={24} style={{ color: "var(--accent)" }} />
          )}
        </div>
        <div>
          <h1 style={{ fontSize: "0.95rem", letterSpacing: "-0.5px", fontWeight: "900" }}>FiveM EMS Service</h1>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1, paddingRight: "4px" }} className="sidebar-nav">
        {/* MAIN MENU SECTION */}
        <div>
          <div style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            padding: "0 16px 8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: 0.85
          }}>
            <StethoscopeIcon size={16} style={{ color: "var(--accent)" }} /> MAIN MENU
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.015)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}>
            {(user.role !== "admin" || !!user.discordId) && (
              <Link
                href="/dashboard"
                className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
              >
                <ClockIcon size={18} />
                เข้า-ออกเวร
              </Link>
            )}

            <Link
              href="/dashboard/op"
              className={`nav-link ${pathname === "/dashboard/op" ? "active" : ""}`}
            >
              <HospitalIcon size={18} />
              {(user.isOp || user.role === "admin") ? "ระบบจัดการคิว OP" : "ตารางเวร OP"}
            </Link>

            <Link
              href="/dashboard/announcements"
              className={`nav-link ${pathname === "/dashboard/announcements" ? "active" : ""}`}
            >
              <MegaphoneIcon size={18} />
              ข้อความประกาศ
            </Link>

            <Link
              href="/dashboard/rules"
              className={`nav-link ${pathname === "/dashboard/rules" ? "active" : ""}`}
            >
              <FileTextIcon size={18} />
              กฎระเบียบแพทย์
            </Link>

            <Link
              href="/dashboard/ranking"
              className={`nav-link ${pathname === "/dashboard/ranking" ? "active" : ""}`}
            >
              <TrophyIcon size={18} />
              จัดอันดับสัปดาห์นี้
            </Link>

            {(user.role !== "admin" || !!user.discordId) && (
              <>
                <Link
                  href="/dashboard/history"
                  className={`nav-link ${pathname === "/dashboard/history" ? "active" : ""}`}
                >
                  <ChartBarIcon size={18} />
                  ประวัติ & ชั่วโมง
                </Link>
                <Link
                  href="/dashboard/my-bonus"
                  className={`nav-link ${pathname === "/dashboard/my-bonus" ? "active" : ""}`}
                >
                  <MoneyIcon size={18} />
                  โบนัสของฉัน
                </Link>
              </>
            )}
          </div>
        </div>

        {/* SYSTEM SECTION */}
        {user.role === "admin" && (
          <div>
            <div style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              padding: "0 16px 8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: 0.85
            }}>
              <ShieldIcon size={16} style={{ color: "var(--accent)" }} /> SYSTEM
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.015)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px"
            }}>
              <Link
                href="/dashboard/admin"
                className={`nav-link ${pathname === "/dashboard/admin" ? "active" : ""}`}
              >
                <CrownIcon size={18} />
                แดชบอร์ดผู้ดูแล
              </Link>

              <Link
                href="/dashboard/admin/exams"
                className={`nav-link ${pathname === "/dashboard/admin/exams" ? "active" : ""}`}
              >
                <FileTextIcon size={18} />
                จัดการระบบสอบ
              </Link>

              <Link
                href="/dashboard/admin/applications"
                className={`nav-link ${pathname === "/dashboard/admin/applications" ? "active" : ""}`}
              >
                <UserPlusIcon size={18} />
                จัดการใบสมัครแพทย์
              </Link>

              <Link
                href="/dashboard/admin/leaves"
                className={`nav-link ${pathname === "/dashboard/admin/leaves" ? "active" : ""}`}
              >
                <FileTextIcon size={18} />
                จัดการใบลาพักงาน/ลาออก
              </Link>

              <Link
                href="/dashboard/bonus"
                className={`nav-link ${pathname === "/dashboard/bonus" ? "active" : ""}`}
              >
                <CoinsIcon size={18} />
                ตารางโบนัส
              </Link>

              <Link
                href="/dashboard/admin/mentor"
                className={`nav-link ${pathname === "/dashboard/admin/mentor" ? "active" : ""}`}
              >
                <CrownIcon size={18} />
                ระบบพี่เลี้ยง
              </Link>

              {!user.discordId && (
                <Link
                  href="/dashboard/admin/settings"
                  className={`nav-link ${pathname === "/dashboard/admin/settings" ? "active" : ""}`}
                >
                  <SettingsIcon size={18} />
                  ตั้งค่าระบบ
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          {user.image && (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="user-avatar"
              referrerPolicy="no-referrer"
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </div>
            <span className="rank-badge">{userRankName}</span>
          </div>
        </div>

        {/* Weekly hours meter */}
        <div className="sidebar-hours-progress-container">
          <div className="sidebar-hours-header">
            <span>สะสมสัปดาห์นี้</span>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
              {weeklyHours.toFixed(1)} / {bonusThreshold} ชม.
            </span>
          </div>
          <div className="sidebar-progress-track">
            <div className="sidebar-progress-bar" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: "12px", justifyContent: "center" }}
          id="logout-btn"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
