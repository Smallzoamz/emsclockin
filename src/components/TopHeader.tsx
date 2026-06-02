"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Mail, Moon, Calendar, Clock } from "lucide-react";
import { InboxModal } from "./InboxModal";

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

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        const count = msgs.filter((m: any) => !m.is_read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
          <span>{dateStr}</span>
          <span style={{ color: "rgba(255, 255, 255, 0.1)" }}>|</span>
          <Clock size={14} style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--accent-light)", fontWeight: 600 }}>{timeStr} น.</span>
        </div>

        {/* Mails icon */}
        <button className="header-icon-badge-btn" onClick={() => setIsInboxOpen(true)} title="กล่องจดหมาย">
          <Mail size={18} />
          {unreadCount > 0 && <span className="header-icon-badge"></span>}
        </button>

        {/* Notifications icon */}
        <button className="header-icon-badge-btn">
          <Bell size={18} />
          <span className="header-icon-badge"></span>
        </button>

        {/* Light/Dark mode toggle */}
        <button className="header-icon-badge-btn">
          <Moon size={18} />
        </button>
      </div>

      <InboxModal isOpen={isInboxOpen} onClose={() => { setIsInboxOpen(false); fetchUnreadCount(); }} />
    </header>
  );
}
