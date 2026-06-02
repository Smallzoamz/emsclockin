"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Mail, Moon, Calendar, Clock } from "lucide-react";
import { InboxModal } from "./InboxModal";
import { supabase } from "@/lib/supabase";

interface TopHeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    isOp?: boolean | null;
    discordId?: string | null;
  } | null;
}

export function TopHeader({ user }: TopHeaderProps) {
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Leave notifications state
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      case "/dashboard/admin/leaves":
        return "จัดการใบลาพักงาน";
      default:
        return "หน้าหลัก";
    }
  };

  // Synthesize notification sound
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Node 1 (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);
      
      // Node 2 (A5)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 100);
    } catch (e) {
      console.warn("AudioContext blocked or failed to play chime:", e);
    }
  };

  // Trigger HTML5 desktop notification
  const triggerDesktopNotification = (leave: any) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`📋 คำขอลางานใหม่จาก ${leave.doctor_name}`, {
          body: `ประเภท: ${leave.leave_type}\nช่วงเวลา: ${new Date(leave.start_date).toLocaleDateString('th-TH')} - ${new Date(leave.end_date).toLocaleDateString('th-TH')}\nเหตุผล: ${leave.reason}`,
          tag: leave.id
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  };

  // Quick approve handler from dropdown
  const handleQuickApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ 
          status: "approved", 
          approved_by: user?.email || user?.name || "Admin",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      setPendingLeaves(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error("[Quick Approve Error] Failed to approve leave request:", err);
      alert("อนุมัติคำขอลางานล้มเหลว: " + err.message);
    }
  };

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

  // Load initial pending leave requests for admin
  const fetchPendingLeaves = async () => {
    if (user?.role !== "admin") return;
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingLeaves(data || []);
    } catch (err) {
      console.error("Failed to fetch pending leave requests:", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Request desktop notification permission & load initial leaves
  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingLeaves();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [user]);

  // Real-time Supabase subscription for admins
  useEffect(() => {
    if (user?.role !== "admin") return;

    const channel = supabase
      .channel("realtime-leave-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leave_requests",
        },
        (payload: any) => {
          const newLeave = payload.new;
          if (newLeave && newLeave.status === "pending") {
            setPendingLeaves(prev => [newLeave, ...prev]);
            playChime();
            triggerDesktopNotification(newLeave);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leave_requests",
        },
        (payload: any) => {
          const updatedLeave = payload.new;
          if (updatedLeave) {
            if (updatedLeave.status !== "pending") {
              // Remove if approved/rejected elsewhere
              setPendingLeaves(prev => prev.filter(item => item.id !== updatedLeave.id));
            } else {
              // Update content if changed
              setPendingLeaves(prev => prev.map(item => item.id === updatedLeave.id ? updatedLeave : item));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
        <div style={{ position: "relative" }}>
          <button 
            className="header-icon-badge-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            title="การแจ้งเตือนลางาน"
          >
            <Bell size={18} />
            {pendingLeaves.length > 0 && (
              <span 
                className="header-icon-badge" 
                style={{ 
                  backgroundColor: "#ef4444", 
                  boxShadow: "0 0 8px #ef4444", 
                  animation: "pulse-red 2s infinite" 
                }}
              ></span>
            )}
          </button>
          
          {dropdownOpen && (
            <div className="notif-dropdown show" style={{
              position: "absolute",
              top: "45px",
              right: 0,
              width: "320px",
              backgroundColor: "rgba(12, 18, 32, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6)",
              zIndex: 1000,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#f1f5f9" }}>คำขออนุมัติลางาน</h4>
                <span style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#fca5a5",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}>{pendingLeaves.length} รายการใหม่</span>
              </div>
              <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                {pendingLeaves.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    ไม่มีคำขอลางานค้างอยู่
                  </div>
                ) : (
                  pendingLeaves.map(leave => (
                    <div key={leave.id} style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--accent-light)" }}>{leave.doctor_name}</span>
                        <span style={{
                          backgroundColor: leave.leave_type === "ลาป่วย" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: leave.leave_type === "ลาป่วย" ? "#fca5a5" : "#fcd34d",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 600
                        }}>{leave.leave_type}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {new Date(leave.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {new Date(leave.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        "{leave.reason}"
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <a 
                          href="/dashboard/admin/leaves" 
                          style={{
                            flex: 1,
                            padding: "6px",
                            fontSize: "0.7rem",
                            borderRadius: "6px",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            color: "#f1f5f9",
                            textDecoration: "none",
                            textAlign: "center",
                            fontWeight: 600,
                            display: "block"
                          }}
                          onClick={() => setDropdownOpen(false)}
                        >
                          ดูรายละเอียด
                        </a>
                        <button 
                          style={{
                            flex: 1,
                            padding: "6px",
                            fontSize: "0.7rem",
                            borderRadius: "6px",
                            backgroundColor: "var(--accent)",
                            color: "#060a13",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600
                          }}
                          onClick={(e) => handleQuickApprove(leave.id, e)}
                        >
                          อนุมัติ
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Light/Dark mode toggle */}
        <button className="header-icon-badge-btn">
          <Moon size={18} />
        </button>
      </div>

      <InboxModal isOpen={isInboxOpen} onClose={() => { setIsInboxOpen(false); fetchUnreadCount(); }} />
    </header>
  );
}
