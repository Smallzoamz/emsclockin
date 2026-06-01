# Global Dashboard & Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard layout shell, desktop sidebar navigation, and main clock-in dashboard into a premium dark-slate medical operational grid inspired by modern developer platforms, binding all metrics to actual database configurations and removing mockups.

**Architecture:** We will separate layout widgets and add a sticky top header containing a live GMT+7 clock. The sidebar will fetch the logged-in doctor's active rank rate, name, and weekly progress dynamically. The main dashboard will render a symmetrical grid split containing status timers, estimated payouts, metrics, a 5-entry shifts history log, live co-worker roster list, and shortcut menu buttons.

**Tech Stack:** Next.js 16 (App Router), NextAuth.js (v5), Supabase client, Vanilla CSS, Lucide React icons.

---

## Proposed File Changes

### [globals.css](file:///f:/Clockin/src/app/globals.css)
- Modify to append premium CSS classes for top headers, grid columns, status indicators, progress meters, and shortcut menus.

### [TopHeader.tsx](file:///f:/Clockin/src/components/TopHeader.tsx) [NEW]
- Create a new sticky header client component with page title indicators, live Asia/Bangkok time, notification icons, and moon light/dark mode icon toggle.

### [Sidebar.tsx](file:///f:/Clockin/src/components/Sidebar.tsx)
- Modify to update the brand logo banner, section link categories, and user profile footer with rank badge and active weekly hours progress meter.

### [layout.tsx](file:///f:/Clockin/src/app/dashboard/layout.tsx)
- Modify to insert `<TopHeader />` and integrate the full-viewport flex dashboard layout container.

### [page.tsx](file:///f:/Clockin/src/app/dashboard/page.tsx)
- Modify to implement the multi-row grid layout: Active Clock-in Card (2/3 width) paired with Weekly Payout Calculator (1/3 width), 5-column metric counters, and a bottom row displaying shifts history logs alongside live active co-workers and quick menu actions.

---

### Task 1: Append Redesign Classes to globals.css

**Files:**
- Modify: [globals.css](file:///f:/Clockin/src/app/globals.css)

- [ ] **Step 1: Append styles for layout, top header, grids, roster list, metrics, and progress bars**

Append the following code block to the end of `src/app/globals.css`:

```css
/* ===== Dashboard Redesign Styles ===== */
.dashboard-layout-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background-color: #030712;
  position: relative;
}

.dashboard-top-header {
  height: 64px;
  background-color: #090f1d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
}

.header-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.header-breadcrumbs a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.header-breadcrumbs a:hover {
  color: var(--text-primary);
}

.header-breadcrumbs span.active {
  color: var(--text-primary);
  font-weight: 500;
}

.header-right-widgets {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon-badge-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: color 0.2s;
}

.header-icon-badge-btn:hover {
  color: var(--text-primary);
}

.header-icon-badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 6px;
  background-color: var(--danger);
  border-radius: 50%;
}

.header-clock-widget {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Row 1 Layout */
.dashboard-grid-2-1 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .dashboard-grid-2-1 {
    grid-template-columns: 1fr;
  }
}

.active-shift-card-wrapper {
  background-color: #090f1d;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 240px;
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s;
}

.active-shift-card-wrapper:hover {
  border-color: var(--border-glow);
}

.active-shift-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.active-shift-status-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
}

.active-shift-split-content {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  margin: 16px 0;
  align-items: center;
}

@media (max-width: 768px) {
  .active-shift-split-content {
    grid-template-columns: 1fr;
  }
}

.active-shift-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 16px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.weekly-bonus-summary-card {
  background-color: #090f1d;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s;
}

.weekly-bonus-summary-card:hover {
  border-color: var(--border-glow);
}

.bonus-metrics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.bonus-metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.bonus-metric-item span.label {
  color: var(--text-secondary);
}

.bonus-metric-item span.value {
  color: var(--text-primary);
  font-weight: 600;
  font-family: var(--font-mono);
}

/* Row 2: Metric Row */
.dashboard-metrics-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .dashboard-metrics-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard-metrics-row {
    grid-template-columns: 1fr;
  }
}

.metric-badge-card {
  background-color: #090f1d;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-badge-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-badge-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-mono);
}

/* Sidebar weekly hours progress */
.sidebar-hours-progress-container {
  margin-top: 16px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.sidebar-hours-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.sidebar-progress-track {
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.sidebar-progress-bar {
  height: 100%;
  background-color: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* On-Duty Roster List */
.roster-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.roster-doctor-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.02);
  transition: background-color 0.2s;
}

.roster-doctor-item:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

.roster-doctor-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-glow);
  object-fit: cover;
}

.roster-doctor-fallback {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.roster-doctor-info {
  flex: 1;
  min-width: 0;
}

.roster-doctor-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.roster-doctor-rank {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.roster-status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

/* Shortcuts Grid */
.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.shortcut-item-btn {
  background-color: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.72rem;
  transition: all 0.2s;
  cursor: pointer;
}

.shortcut-item-btn:hover {
  background-color: rgba(255, 255, 255, 0.03);
  border-color: var(--border-glow);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.shortcut-item-icon {
  font-size: 1.2rem;
  color: var(--accent);
}

.rank-badge {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--accent-light);
  background-color: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
  display: inline-block;
}

.timer-accent-label {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-light);
}
```

- [ ] **Step 2: Run verification compilation**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit CSS changes**

```bash
git add src/app/globals.css
git commit -m "style: add responsive grid layouts and dashboard components to globals.css"
```

---

### Task 2: Create TopHeader Component

**Files:**
- Create: [TopHeader.tsx](file:///f:/Clockin/src/components/TopHeader.tsx)

- [ ] **Step 1: Implement the TopHeader client component with live Bangkok timer clock**

Write the complete code for `src/components/TopHeader.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BellIcon, MailIcon, MoonIcon, CalendarIcon, ClockIcon } from "@/components/Icons";

export function TopHeader() {
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  // Map route path to Thai page name
  const getBreadcrumbName = (path: string) => {
    switch (path) {
      case "/dashboard":
        return "เข้า-ออกเวร";
      case "/dashboard/op":
        return "ตารางเวร OP";
      case "/dashboard/announcements":
        return "ข้อความประกาศ";
      case "/dashboard/rules":
        return "กฏระเบียบแพทย์";
      case "/dashboard/ranking":
        return "จัดอันดับสัปดาห์นี้";
      case "/dashboard/history":
        return "ประวัติ & ชั่วโมง";
      case "/dashboard/my-bonus":
        return "โบนัสของฉัน";
      case "/dashboard/admin":
        return "แดชบอร์ดแอดมิน";
      case "/dashboard/bonus":
        return "ตารางโบนัส";
      case "/dashboard/admin/announcements":
        return "ตั้งค่าข้อความประกาศ";
      case "/dashboard/admin/settings":
        return "ตั้งค่าระบบ";
      default:
        return "หน้าหลัก";
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in Asia/Bangkok
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      // Format date in Thai locale in Asia/Bangkok
      const dateFormatter = new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      setTimeStr(timeFormatter.format(now));
      setDateStr(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dashboard-top-header">
      <div className="header-breadcrumbs">
        <a href="/">หน้าแรก</a>
        <span>/</span>
        <span className="active">{getBreadcrumbName(pathname)}</span>
      </div>

      <div className="header-right-widgets">
        {/* Calendar and Clock Widget */}
        <div className="header-clock-widget">
          <CalendarIcon size={14} style={{ color: "var(--text-secondary)" }} />
          <span>{dateStr}</span>
          <span style={{ color: "rgba(255, 255, 255, 0.1)" }}>|</span>
          <ClockIcon size={14} style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--accent-light)", fontWeight: 600 }}>{timeStr} น.</span>
        </div>

        {/* Mails icon */}
        <button className="header-icon-badge-btn">
          <MailIcon size={18} />
        </button>

        {/* Notifications icon */}
        <button className="header-icon-badge-btn">
          <BellIcon size={18} />
          <span className="header-icon-badge"></span>
        </button>

        {/* Light/Dark mode toggle */}
        <button className="header-icon-badge-btn">
          <MoonIcon size={18} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify compile safety**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit the new component**

```bash
git add src/components/TopHeader.tsx
git commit -m "feat: create sticky TopHeader component with live Asia/Bangkok time"
```

---

### Task 3: Redesign the Sidebar Component

**Files:**
- Modify: [Sidebar.tsx](file:///f:/Clockin/src/components/Sidebar.tsx)

- [ ] **Step 1: Replace Sidebar code to support branding banner, styled links sections, and weekly hours progress footer**

Modify `src/components/Sidebar.tsx` to read user rank settings and weekly progress dynamically:

```tsx
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
  SpeakerIcon,
  SettingsIcon,
  FileTextIcon
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
          <h1 style={{ fontSize: "0.95rem", letterSpacing: "-0.5px" }}>MEDICAL SERVICE</h1>
          <span style={{ letterSpacing: "1px" }}>FIVEM HOSPITAL SYSTEM</span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                href="/dashboard/bonus"
                className={`nav-link ${pathname === "/dashboard/bonus" ? "active" : ""}`}
              >
                <CoinsIcon size={18} />
                ตารางโบนัส
              </Link>

              <Link
                href="/dashboard/admin/announcements"
                className={`nav-link ${pathname === "/dashboard/admin/announcements" ? "active" : ""}`}
              >
                <SpeakerIcon size={18} />
                ตั้งค่าข้อความประกาศ
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
```

- [ ] **Step 2: Run verification compilation**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit sidebar changes**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: upgrade Sidebar branding, links, and user weekly progress meter footer"
```

---

### Task 4: Integrate Header layout

**Files:**
- Modify: [layout.tsx](file:///f:/Clockin/src/app/dashboard/layout.tsx)

- [ ] **Step 1: Wrap pages in layout with TopHeader and sidebar navigation container**

Update `src/app/dashboard/layout.tsx` to mount the newly created sticky `<TopHeader />` component:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { TopHeader } from "@/components/TopHeader";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { HospitalIcon } from "@/components/Icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  let logoUrl = "/images/logo.png";
  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("key", "theme_logo_url")
      .single();

    if (settingsData?.value) {
      logoUrl = settingsData.value;
    }
  } catch (err) {
    console.error("[DashboardLayout Logo Check] Error:", err);
  }

  if (!session?.user) {
    if (pathname === "/dashboard/rules") {
      return (
        <div className="public-layout" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
          <header style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                width: "32px", 
                height: "32px", 
                padding: logoUrl ? "4px" : "0", 
                background: logoUrl ? "var(--bg-glass)" : undefined,
                border: logoUrl ? "1px solid var(--border-subtle)" : undefined,
                borderRadius: logoUrl ? "4px" : undefined
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="City Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <HospitalIcon size={20} style={{ color: "var(--accent)" }} />
                )}
              </div>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "block" }}>EMS Hospital</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>กฏระเบียบและการกู้ชีพ</span>
              </div>
            </div>
            <a 
              href="/" 
              className="btn btn-primary" 
              style={{ fontSize: "0.75rem", padding: "6px 16px", borderRadius: "8px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              เข้าสู่ระบบ / Login
            </a>
          </header>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <main className="main-content" style={{ margin: "0 auto", width: "100%", maxWidth: "1200px", padding: "24px 16px" }}>
              {children}
            </main>
          </div>
        </div>
      );
    }
    redirect("/");
  }

  const user = session.user as any;
  let isOp = user.role === "admin";
  const discordUsername = user.discordUsername;

  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("key", "op_schedule")
      .single();

    if (settingsData?.value) {
      const op_schedule = settingsData.value;
      if (!isOp && discordUsername && op_schedule) {
        const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = dayNames[thaiTime.getUTCDay()];

        const todayOPs = op_schedule[currentDay] || [];
        isOp = todayOPs.includes(discordUsername);
      }
    }
  } catch (err) {
    console.error("[DashboardLayout OP Check] Error:", err);
  }

  const userWithOp = {
    ...session.user,
    isOp,
  };

  return (
    <div className="app-layout">
      <Sidebar user={userWithOp as any} logoUrl={logoUrl} />
      <div className="dashboard-layout-container">
        <TopHeader />
        <main className="main-content" style={{ maxWidth: "100%", margin: "0", padding: "32px" }}>
          {children}
        </main>
      </div>
      <MobileNav user={userWithOp as any} />
    </div>
  );
}
```

- [ ] **Step 2: Run verification compilation**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit layout changes**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: mount sticky TopHeader in dashboard layout layout.tsx"
```

---

### Task 5: Redesign the Clock-in Page (page.tsx)

**Files:**
- Modify: [page.tsx](file:///f:/Clockin/src/app/dashboard/page.tsx)

- [ ] **Step 1: Replace clock-in page logic and layout grid structures**

Update `src/app/dashboard/page.tsx` to implement grid alignments, stats row, co-worker roster lists, and shortcuts panel:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClockButton } from "@/components/ClockButton";
import { LiveTimer } from "@/components/LiveTimer";
import { formatHoursToHHMMSS } from "@/lib/utils";
import { 
  ClockIcon, 
  CheckIcon, 
  HospitalIcon,
  MoneyIcon,
  MegaphoneIcon,
  TrophyIcon,
  ChartBarIcon,
  FileTextIcon
} from "@/components/Icons";

interface ActiveShift {
  id: string;
  clock_in: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [pendingProofShift, setPendingProofShift] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pressing, setPressing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Weekly Metrics
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [qualifyingDays, setQualifyingDays] = useState(0);
  const [dailyMinHours, setDailyMinHours] = useState(3);
  const [bonusThreshold, setBonusThreshold] = useState(20);
  
  // User Profile details
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [doctorRanks, setDoctorRanks] = useState<any[]>([]);
  const [userRanks, setUserRanks] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
  // Roster co-workers
  const [activeDoctors, setActiveDoctors] = useState<any[]>([]);

  // Shift History logs
  const [shiftsHistory, setShiftsHistory] = useState<any[]>([]);
  const [totalShiftsCount, setTotalShiftsCount] = useState(0);
  const [currentMonthFilter, setCurrentMonthFilter] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/status");
      const data = await res.json();
      setIsOnDuty(data.isOnDuty);
      setActiveShift(data.activeShift);
      setPendingProofShift(data.pendingProofShift);
      if (data.activeDoctors) {
        setActiveDoctors(data.activeDoctors);
      }
    } catch {
      console.error("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/history?page=1&limit=5");
      const data = await res.json();
      if (data.shifts) {
        setShiftsHistory(data.shifts);
        setTotalShiftsCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch shifts history:", err);
    }
  }, []);

  const fetchWeekly = useCallback(async () => {
    try {
      const [weeklyRes, settingsRes] = await Promise.all([
        fetch("/api/shifts/weekly-summary"),
        fetch("/api/admin/settings")
      ]);
      const data = await weeklyRes.json();
      const settingsData = await settingsRes.json();
      
      if (settingsData.settings) {
        if (settingsData.settings.bonus_threshold) {
          setBonusThreshold(Number(settingsData.settings.bonus_threshold));
        }
        if (settingsData.settings.doctor_ranks) {
          setDoctorRanks(settingsData.settings.doctor_ranks);
        }
        if (settingsData.settings.user_ranks) {
          setUserRanks(settingsData.settings.user_ranks);
        }
        if (settingsData.settings.user_names) {
          setUserNames(settingsData.settings.user_names);
        }
      }

      if (data.summary && data.summary.length > 0) {
        const current = data.summary[data.summary.length - 1];
        setWeeklyHours(current.totalHours || 0);
        setQualifyingDays(current.qualifyingDays || 0);
        setDailyMinHours(current.dailyMinHours || 3);
      }
    } catch {
      console.error("Failed to fetch weekly data");
    }
  }, []);

  useEffect(() => {
    document.title = "เข้า-ออกเวร | EMS Clock-in";
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      const user = session?.user as any;
      setSessionUser(user);
      if (user?.role === "admin" && !user?.discordId) {
        router.replace("/dashboard/admin");
      } else {
        fetchStatus();
        fetchWeekly();
        fetchHistory();
      }
    });
  }, [router, fetchStatus, fetchWeekly, fetchHistory]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStatus();
      fetchWeekly();
      fetchHistory();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchStatus, fetchWeekly, fetchHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirmPendingClockOut = async () => {
    if (!proofFile) return;
    setPressing(true);
    try {
      const formData = new FormData();
      formData.append("proof", proofFile);

      const res = await fetch("/api/shifts/clock-out", { 
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.message} (${data.duration})`, "success");
        setProofFile(null);
        setPreviewUrl(null);
        fetchStatus();
        fetchWeekly();
        fetchHistory();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "error");
    } finally {
      setPressing(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const res = await fetch("/api/shifts/clock-in", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        fetchStatus();
        fetchHistory();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleClockOut = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("proof", file);

      const res = await fetch("/api/shifts/clock-out", { 
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.message} (${data.duration})`, "success");
        fetchStatus();
        fetchWeekly();
        fetchHistory();
      } else {
        showToast(data.error, "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการออกเวร", "error");
    }
  };

  if (loading) {
    return <div className="loading-spinner" />;
  }

  // Calculate dynamic weekly bonus values
  const userEmail = sessionUser?.email;
  const userRankId = userEmail ? userRanks[userEmail] : undefined;
  const userRank = doctorRanks.find((r) => r.id === userRankId);
  const hourlyRate = userRank ? userRank.rate : 30000;
  const estimatedPayout = Math.floor(weeklyHours) * hourlyRate;

  // Filter history logs by calendar month locally
  const filteredHistory = shiftsHistory.filter((shift) => {
    if (!currentMonthFilter) return true;
    const date = new Date(shift.clock_in);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return monthKey === currentMonthFilter;
  });

  // Calculate latest clock-in and clock-out details from history list
  const lastCompleted = shiftsHistory.find(s => s.status === "completed");
  const latestInStr = activeShift 
    ? new Date(activeShift.clock_in).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
    : lastCompleted 
      ? new Date(lastCompleted.clock_in).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
      : "ไม่มีประวัติ";

  const latestOutStr = lastCompleted 
    ? new Date(lastCompleted.clock_out).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." 
    : "ไม่มีประวัติ";

  // Calculate today's total accumulated hours
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const todayMinutes = shiftsHistory
    .filter(s => s.status === "completed" && new Date(s.clock_in) >= startOfToday)
    .reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

  const todayHoursStr = formatHoursToHHMMSS(todayMinutes / 60);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Row 1 Grid */}
      <div className="dashboard-grid-2-1">
        
        {/* Col 1: Active Clock-in Card (2/3 width) */}
        <div className="active-shift-card-wrapper">
          <div className="active-shift-card-header">
            <div className="active-shift-status-title">
              <span className={`status-dot ${isOnDuty ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-gray-500"}`} />
              <span style={{ color: isOnDuty ? "var(--accent-light)" : "var(--text-secondary)" }}>
                {isOnDuty ? "กำลังปฏิบัติหน้าที่ (ACTIVE)" : "ยังไม่ได้เข้าเวร (OFF DUTY)"}
              </span>
            </div>
            {isOnDuty && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-light)", fontWeight: 500 }}>
                ปฏิบัติงานในระบบอยู่
              </span>
            )}
          </div>

          <div className="active-shift-split-content">
            {/* Live timer and click control */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", uppercase: true }}>
                  เวลาสะสมในเซสชันปัจจุบัน
                </span>
                <LiveTimer isOnDuty={isOnDuty} clockInTime={activeShift?.clock_in} />
              </div>

              {pendingProofShift ? (
                <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "8px", fontSize: "0.78rem", color: "#fca5a5" }}>
                  🚨 ตรวจพบการลงเวรจากเกมกรุณาแนบรูปภาพอัปโหลดเพื่อยืนยันประวัติค่ะ
                </div>
              ) : (
                <ClockButton
                  isOnDuty={isOnDuty}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                />
              )}
            </div>

            {/* Shift proof upload column */}
            <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.04)", paddingLeft: "24px" }}>
              {pendingProofShift ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label 
                    htmlFor="page-proof-upload" 
                    style={{ 
                      display: "block", 
                      padding: previewUrl ? "8px" : "24px", 
                      border: "2px dashed var(--border-subtle)", 
                      borderRadius: "8px", 
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(255,255,255,0.01)",
                      transition: "all 0.2s"
                    }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100px", borderRadius: "4px", objectFit: "contain", margin: "0 auto" }} />
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                        <span>📸</span>
                        <span>อัปโหลดรูปหลักฐานการลงเวร</span>
                      </div>
                    )}
                  </label>
                  <input 
                    id="page-proof-upload" 
                    type="file" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={handleConfirmPendingClockOut}
                    disabled={!proofFile || pressing}
                    className="btn btn-primary"
                    style={{ 
                      width: "100%",
                      padding: "8px", 
                      background: "var(--danger)",
                      fontSize: "0.78rem",
                      opacity: (!proofFile || pressing) ? 0.5 : 1
                    }}
                  >
                    {pressing ? "กำลังอัปโหลด..." : "ส่งรูป & บันทึกเวลาลงเวร"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center", minHeight: "130px", opacity: 0.4, textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem" }}>📁</div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    ฟอร์มแนบหลักฐานอัปโหลดรูปภาพเวร<br/>จะแสดงที่นี่เมื่อตรวจพบการลงเวรในเกม
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="active-shift-card-footer">
            <span>ℹ️ กรุณาอยู่ในโรงพยาบาลและพร้อมปฏิบัติงานก่อนกดเข้าเวร</span>
            <span>ตำแหน่งปัจจุบัน: Pillbox Hill Medical Center</span>
          </div>
        </div>

        {/* Col 2: Weekly Payout Calculator (1/3 width) */}
        <div className="weekly-bonus-summary-card">
          <div className="active-shift-card-header" style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
              โบนัส & ผลตอบแทนสะสมสัปดาห์นี้
            </span>
          </div>

          <div className="bonus-metrics-list">
            <div className="bonus-metric-item">
              <span className="label">ยศและเรทค่าเหนื่อย</span>
              <span className="value" style={{ color: "var(--accent-light)" }}>
                {userRank ? userRank.name : "แพทย์ประจำการ"} (${hourlyRate.toLocaleString()}/ชม)
              </span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">ชั่วโมงเวรสะสมสัปดาห์นี้</span>
              <span className="value">{weeklyHours.toFixed(1)} ชม.</span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">ยอดเงินโบนัสประมาณการ</span>
              <span className="value" style={{ color: "var(--accent-light)", fontSize: "1.1rem" }}>
                $ {estimatedPayout.toLocaleString("en-US")} IC
              </span>
            </div>
            <div className="bonus-metric-item">
              <span className="label">จำนวนวันที่ปฏิบัติงานครบเกณฑ์</span>
              <span className="value">{qualifyingDays} วัน (เกณฑ์ ≥ {dailyMinHours} ชม./วัน)</span>
            </div>
          </div>

          <Link href="/dashboard/my-bonus" className="btn btn-ghost" style={{ width: "100%", fontSize: "0.75rem", padding: "10px", border: "1px solid var(--border-subtle)", justifyContent: "center" }}>
            ดูรายละเอียดสรุปโบนัสรายสัปดาห์ทั้งหมด
          </Link>
        </div>
      </div>

      {/* Row 2: 5-Column Stats Row */}
      <div className="dashboard-metrics-row">
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาเข้าเวรล่าสุด</span>
          <span className="metric-badge-value" style={{ fontSize: "0.85rem", fontFamily: "var(--font-ui)" }}>{latestInStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาลงเวรล่าสุด</span>
          <span className="metric-badge-value" style={{ fontSize: "0.85rem", fontFamily: "var(--font-ui)" }}>{latestOutStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาสะสมวันนี้</span>
          <span className="metric-badge-value">{todayHoursStr}</span>
        </div>
        <div className="metric-badge-card">
          <span className="metric-badge-label">เวลาสะสมสัปดาห์นี้</span>
          <span className="metric-badge-value">{formatHoursToHHMMSS(weeklyHours)}</span>
        </div>
        <div className="metric-badge-card" style={{ borderColor: weeklyHours >= bonusThreshold ? "var(--border-glow)" : "rgba(255,255,255,0.04)" }}>
          <span className="metric-badge-label">สถานะโบนัสสัปดาห์นี้</span>
          {weeklyHours >= bonusThreshold ? (
            <span className="metric-badge-value" style={{ color: "var(--accent-light)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.95rem" }}>
              <CheckIcon size={16} /> ผ่านเกณฑ์แล้ว
            </span>
          ) : (
            <span className="metric-badge-value" style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
              ขาดอีก {(bonusThreshold - weeklyHours).toFixed(1)} ชม.
            </span>
          )}
        </div>
      </div>

      {/* Row 3 Grid */}
      <div className="dashboard-grid-2-1">
        
        {/* Col 1: Shifts logs table (2/3 width) */}
        <div className="active-shift-card-wrapper" style={{ minHeight: "360px" }}>
          <div className="active-shift-card-header">
            <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>ประวัติการขึ้นเวรล่าสุด (5 ลำดับล่าสุด)</span>
            <select
              value={currentMonthFilter}
              onChange={(e) => setCurrentMonthFilter(e.target.value)}
              className="history-select"
              style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", width: "130px" }}
            >
              <option value="">ทั้งหมดทุกเดือน</option>
              {Array.from(new Set(shiftsHistory.map(s => {
                const d = new Date(s.clock_in);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              }))).map((monthStr) => {
                const [year, month] = monthStr.split("-");
                const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                return (
                  <option key={monthStr} value={monthStr}>
                    เดือน {thaiMonths[parseInt(month) - 1]} {parseInt(year) + 543}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ overflowX: "auto", marginTop: "12px", flex: 1 }}>
            <table className="spreadsheet-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>วันที่</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>เวลาเข้าเวร</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>เวลาลงเวร</th>
                  <th className="col-header right" style={{ fontSize: "0.72rem", padding: "8px 12px" }}>ระยะเวลา</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", padding: "8px 12px", textAlign: "center" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      ไม่มีบันทึกข้อมูลประวัติเวร
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((shift) => (
                    <tr key={shift.id}>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px" }}>
                        {new Date(shift.clock_in).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {new Date(shift.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} น.
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น." : "—"}
                      </td>
                      <td className="cell number" style={{ fontSize: "0.78rem", padding: "8px 12px", fontFamily: "var(--font-mono)" }}>
                        {shift.status === "active" ? (
                          <span style={{ color: "var(--accent-light)" }}>กำลังเข้างาน...</span>
                        ) : (
                          formatHoursToHHMMSS((shift.duration_minutes || 0) / 60)
                        )}
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", padding: "8px 12px", textAlign: "center" }}>
                        <span className={`portal-status-badge ${shift.status}`}>
                          {shift.status === "active" && (
                            <>
                              <span className="portal-status-pulse" /> กำลังเข้าเวร
                            </>
                          )}
                          {shift.status === "completed" && "สำเร็จแล้ว"}
                          {shift.status === "pending_proof" && "รอแนบรูป"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px", marginTop: "12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <span>แสดง {filteredHistory.length} จากทั้งหมด {totalShiftsCount} บันทึกประวัติ</span>
            <Link href="/dashboard/history" style={{ color: "var(--accent-light)", textDecoration: "none", fontWeight: 600 }}>
              ดูหน้าประวัติเต็มทั้งหมด →
            </Link>
          </div>
        </div>

        {/* Col 2: Online Roster + Shortcuts (1/3 width) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Active Co-workers */}
          <div className="weekly-bonus-summary-card" style={{ flex: 1 }}>
            <div className="active-shift-card-header" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                เพื่อนร่วมเวรตอนนี้ (On-Duty Roster)
              </span>
            </div>

            <div className="roster-list">
              {activeDoctors.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "16px 0", textAlign: "center" }}>
                  ไม่มีหมอขึ้นเวรอยู่ในขณะนี้
                </div>
              ) : (
                activeDoctors.map((doc, idx) => (
                  <div key={idx} className="roster-doctor-item">
                    {doc.avatarUrl ? (
                      <img src={doc.avatarUrl} alt={doc.name} className="roster-doctor-avatar" />
                    ) : (
                      <div className="roster-doctor-fallback">🩺</div>
                    )}
                    <div className="roster-doctor-info">
                      <div className="roster-doctor-name">{doc.name}</div>
                      <div className="roster-doctor-rank">{doc.rank}</div>
                    </div>
                    <div className="roster-status-indicator" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Menu shortcuts */}
          <div className="weekly-bonus-summary-card">
            <div className="active-shift-card-header" style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
                เมนูลัดของหน่วยงาน
              </span>
            </div>

            <div className="shortcuts-grid">
              <Link href="/dashboard/op" className="shortcut-item-btn">
                <HospitalIcon size={20} className="shortcut-item-icon" />
                <span>จัดการเวร OP</span>
              </Link>
              <Link href="/dashboard/my-bonus" className="shortcut-item-btn">
                <MoneyIcon size={20} className="shortcut-item-icon" />
                <span>โบนัสของฉัน</span>
              </Link>
              <Link href="/dashboard/history" className="shortcut-item-btn">
                <ChartBarIcon size={20} className="shortcut-item-icon" />
                <span>ประวัติสะสม</span>
              </Link>
              <Link href="/dashboard/announcements" className="shortcut-item-btn">
                <MegaphoneIcon size={20} className="shortcut-item-icon" />
                <span>ข้อความประกาศ</span>
              </Link>
              <Link href="/dashboard/rules" className="shortcut-item-btn">
                <FileTextIcon size={20} className="shortcut-item-icon" />
                <span>กฎระเบียบแพทย์</span>
              </Link>
              <Link href="/dashboard/ranking" className="shortcut-item-btn">
                <TrophyIcon size={20} className="shortcut-item-icon" />
                <span>จัดอันดับสัปดาห์</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run verification compilation**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit page changes**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: complete redesign of the Clock-In Dashboard page with metrics and roster widgets"
```
