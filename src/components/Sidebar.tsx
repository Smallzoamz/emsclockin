"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

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
            "🏥"
          )}
        </div>
        <div>
          <h1>EMS Clock-in</h1>
          <span>FiveM Hospital System</span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* 1. สำหรับแพทย์ (Medical Staff Section) */}
        <div style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          padding: "8px 16px 6px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          opacity: 0.85
        }}>
          <span style={{ fontSize: "0.95rem" }}>🩺</span> สำหรับแพทย์
        </div>

        {(user.role !== "admin" || !!user.discordId) && (
          <Link
            href="/dashboard"
            className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <span>⏰</span>
            เข้า-ออกเวร
          </Link>
        )}

        <Link
          href="/dashboard/op"
          className={`nav-link ${pathname === "/dashboard/op" ? "active" : ""}`}
        >
          <span>🏥</span>
          {(user.isOp || user.role === "admin") ? "ระบบจัดการคิว OP" : "ตารางเวร OP"}
        </Link>

        <Link
          href="/dashboard/announcements"
          className={`nav-link ${pathname === "/dashboard/announcements" ? "active" : ""}`}
        >
          <span>📣</span>
          ข้อความประกาศ
        </Link>

        <Link
          href="/dashboard/ranking"
          className={`nav-link ${pathname === "/dashboard/ranking" ? "active" : ""}`}
        >
          <span>🏆</span>
          จัดอันดับสัปดาห์นี้
        </Link>

        {(user.role !== "admin" || !!user.discordId) && (
          <>
            <Link
              href="/dashboard/history"
              className={`nav-link ${pathname === "/dashboard/history" ? "active" : ""}`}
            >
              <span>📊</span>
              ประวัติ & ชั่วโมง
            </Link>
            <Link
              href="/dashboard/my-bonus"
              className={`nav-link ${pathname === "/dashboard/my-bonus" ? "active" : ""}`}
            >
              <span>💸</span>
              โบนัสของฉัน
            </Link>
          </>
        )}

        {/* 2. สำหรับผู้ดูแล (Admin Section) */}
        {user.role === "admin" && (
          <>
            <div style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              padding: "16px 16px 6px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderTop: "1px solid rgba(255, 255, 255, 0.03)",
              marginTop: "8px",
              opacity: 0.85
            }}>
              <span style={{ fontSize: "0.95rem" }}>🛡️</span> สำหรับผู้ดูแล
            </div>

            <Link
              href="/dashboard/admin"
              className={`nav-link ${pathname === "/dashboard/admin" ? "active" : ""}`}
            >
              <span>👑</span>
              แดชบอร์ดแอดมิน
            </Link>

            <Link
              href="/dashboard/bonus"
              className={`nav-link ${pathname === "/dashboard/bonus" ? "active" : ""}`}
            >
              <span>💰</span>
              ตารางโบนัส
            </Link>

            <Link
              href="/dashboard/admin/announcements"
              className={`nav-link ${pathname === "/dashboard/admin/announcements" ? "active" : ""}`}
            >
              <span>📢</span>
              ตั้งค่าข้อความประกาศ
            </Link>

            {!user.discordId && (
              <Link
                href="/dashboard/admin/settings"
                className={`nav-link ${pathname === "/dashboard/admin/settings" ? "active" : ""}`}
              >
                <span>⚙️</span>
                ตั้งค่าระบบ
              </Link>
            )}
          </>
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
            <div className="user-email" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
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
