"use client";

import React, { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmProvider";
import { formatThaiDate } from "@/lib/utils";
import { 
  UserPlusIcon, 
  RefreshIcon, 
  CheckIcon, 
  CrossIcon, 
  MegaphoneIcon, 
  SaveIcon,
  InfoIcon,
  ClockIcon,
  WarningIcon
} from "@/components/Icons";
import { 
  User, 
  Calendar, 
  Layers, 
  HelpCircle,
  FileText,
  UserCheck,
  AlertCircle,
  Timer
} from "lucide-react";

interface DoctorApplication {
  id: string;
  discord_uid: string;
  ic_firstname: string;
  ic_lastname: string;
  age: string;
  age_type: string;
  previous_experience: string | null;
  reason_to_join: string;
  status: "pending" | "called" | "expired" | "rejected" | "approved";
  queue_number: number;
  called_at: string | null;
  created_at: string;
  expires_at: string;
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "called" | "expired">("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Webhook settings at bottom
  const [discordApplicationWebhookUrl, setDiscordApplicationWebhookUrl] = useState("");
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch applications & webhook settings
  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, settingsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/admin/settings")
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.discord_application_webhook_url) {
          setDiscordApplicationWebhookUrl(settingsData.settings.discord_application_webhook_url);
        }
      }
    } catch (error) {
      console.error("[Applications Page] Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "ระบบจัดการใบสมัครแพทย์ | EMS Clock-in";
    
    // Auth guard
    getSession().then((session) => {
      const user = session?.user as { role?: string; discordId?: string } | null | undefined;
      if (user && user.role === "admin") {
        setIsAdmin(true);
        setLoadingAuth(false);
        loadData();
      } else {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  // Action Handler: Call for exam
  const handleCallApplicant = async (appId: string, name: string) => {
    const isConfirmed = await confirm({
      title: "📋 เรียกตัวเข้าสอบสัมภาษณ์/ปฏิบัติ",
      message: `ยืนยันต้องการเรียกสอบแพทย์ "${name}" ใช่หรือไม่? ระบบจะทำการอัปเดตสถานะและส่งข้อความแจ้งเตือนปิงหาผู้สมัครผ่าน Discord Webhook`,
      confirmText: "เรียกตัว",
      cancelText: "ยกเลิก",
      variant: "success"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/applications/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action: "call" })
      });

      if (res.ok) {
        alert(`เรียกสอบแพทย์ "${name}" สำเร็จและแจ้งผ่าน Discord เรียบร้อยแล้วค่ะ`);
        loadData();
      } else {
        const errorData = await res.json();
        alert(`ล้มเหลว: ${errorData.error || "เกิดข้อผิดพลาดในการดำเนินการ"}`);
      }
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    }
  };

  // Action Handler: Reject application
  const handleRejectApplicant = async (appId: string, name: string) => {
    const isConfirmed = await confirm({
      title: "🔴 ผลประเมิน: สอบไม่ผ่าน",
      message: `ยืนยันต้องการประเมินให้ "${name}" สอบไม่ผ่าน ใช่หรือไม่?`,
      confirmText: "ยืนยัน (สอบไม่ผ่าน)",
      cancelText: "ยกเลิก",
      variant: "danger"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/applications/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action: "reject" })
      });

      if (res.ok) {
        alert(`ดำเนินการประเมิน "${name}" สอบไม่ผ่าน เรียบร้อยแล้วค่ะ`);
        loadData();
      } else {
        const errorData = await res.json();
        alert(`ล้มเหลว: ${errorData.error || "เกิดข้อผิดพลาดในการดำเนินการ"}`);
      }
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    }
  };

  // Action Handler: Approve application (Pass Exam)
  const handleApproveApplicant = async (appId: string, name: string) => {
    const isConfirmed = await confirm({
      title: "🟢 ผลประเมิน: สอบผ่าน",
      message: `ยืนยันต้องการประเมินให้ "${name}" สอบผ่านการคัดเลือก ใช่หรือไม่? ระบบจะทำการบันทึกและส่งข้อความแสดงความยินดีทาง Discord`,
      confirmText: "ยืนยัน (สอบผ่าน)",
      cancelText: "ยกเลิก",
      variant: "success"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/applications/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action: "approve" })
      });

      if (res.ok) {
        alert(`ดำเนินการประเมิน "${name}" สอบผ่าน เรียบร้อยแล้วค่ะ`);
        loadData();
      } else {
        const errorData = await res.json();
        alert(`ล้มเหลว: ${errorData.error || "เกิดข้อผิดพลาดในการดำเนินการ"}`);
      }
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    }
  };

  // Webhook URL save
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    setWebhookStatus(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "discord_application_webhook_url", value: discordApplicationWebhookUrl })
      });

      if (res.ok) {
        setWebhookStatus({ message: "บันทึกข้อมูล Discord Webhook สำหรับสมัครงานเรียบร้อยแล้วค่ะ", type: "success" });
      } else {
        const data = await res.json();
        setWebhookStatus({ message: data.error || "เกิดข้อผิดพลาดในการบันทึก", type: "error" });
      }
    } catch {
      setWebhookStatus({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", type: "error" });
    } finally {
      setIsSavingWebhook(false);
      setTimeout(() => setWebhookStatus(null), 4000);
    }
  };

  if (loadingAuth) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div className="loading-spinner"></div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>กำลังยืนยันสิทธิ์เข้าถึง...</p>
      </div>
    );
  }

  // Calculate statistics
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const calledCount = applications.filter(a => a.status === "called").length;
  const expiredCount = applications.filter(a => a.status === "expired").length;
  const totalCount = applications.length;

  // Filter list based on active tab
  const filteredApps = applications.filter(a => {
    if (filterTab === "all") return true;
    return a.status === filterTab;
  });

  return (
    <div className="page-container" style={{ padding: "0 16px 32px 16px", color: "var(--text-primary)" }}>
      {/* Page Header */}
      <header className="page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
            <UserPlusIcon size={28} />
            จัดการใบสมัครและรับสมัครแพทย์
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            จัดการตรวจสอบข้อมูลผู้ยื่นสมัครงาน เรียกตัวเข้าสอบสัมภาษณ์/ปฏิบัติ และติดตามสถานะคิวแบบ Real-Time
          </p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="btn btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshIcon size={14} className={loading ? "spin" : ""} />
          รีเฟรชข้อมูล
        </button>
      </header>

      {/* Stats Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Pending Card */}
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)" }}>
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <Timer size={24} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#3b82f6", fontFamily: "var(--font-mono)" }}>{pendingCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>รอตรวจสอบ (Pending)</div>
          </div>
        </div>

        {/* Called Card */}
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)" }}>
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <UserCheck size={24} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#f59e0b", fontFamily: "var(--font-mono)" }}>{calledCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>เรียกสอบแล้ว (Called)</div>
          </div>
        </div>

        {/* Expired Card */}
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)" }}>
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <AlertCircle size={24} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "#ef4444", fontFamily: "var(--font-mono)" }}>{expiredCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>หมดอายุ (Expired)</div>
          </div>
        </div>

        {/* Total Card */}
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)" }}>
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <Layers size={24} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{totalCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>ทั้งหมด (Total)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px", marginBottom: "20px" }}>
        <button 
          onClick={() => setFilterTab("all")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            color: filterTab === "all" ? "var(--accent-light)" : "var(--text-muted)",
            borderBottom: filterTab === "all" ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s"
          }}
        >
          ทั้งหมด ({totalCount})
        </button>
        <button 
          onClick={() => setFilterTab("pending")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            color: filterTab === "pending" ? "#3b82f6" : "var(--text-muted)",
            borderBottom: filterTab === "pending" ? "2px solid #3b82f6" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s"
          }}
        >
          🔵 รอตรวจสอบ ({pendingCount})
        </button>
        <button 
          onClick={() => setFilterTab("called")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            color: filterTab === "called" ? "#f59e0b" : "var(--text-muted)",
            borderBottom: filterTab === "called" ? "2px solid #f59e0b" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s"
          }}
        >
          🟡 เรียกสอบแล้ว ({calledCount})
        </button>
        <button 
          onClick={() => setFilterTab("expired")}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            color: filterTab === "expired" ? "#ef4444" : "var(--text-muted)",
            borderBottom: filterTab === "expired" ? "2px solid #ef4444" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
            transition: "all 0.2s"
          }}
        >
          🔴 หมดอายุ ({expiredCount})
        </button>
      </div>

      {/* Main Table Card */}
      <section className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)", marginBottom: "24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div className="loading-spinner"></div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>กำลังโหลดข้อมูลใบสมัคร...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: "80px 32px", textAlign: "center" }}>
            <HelpCircle size={48} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: "16px", display: "inline-block" }} />
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-secondary)" }}>ไม่พบรายการใบสมัครในหมวดหมู่นี้</h3>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>คิวสอบ</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>Discord UID</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>ชื่อ - นามสกุล IC</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>อายุ (ประเภท)</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700", minWidth: "150px" }}>ประสบการณ์</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700", minWidth: "180px" }}>เหตุผลที่อยากร่วมงาน</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>สถานะ</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>วันที่ยื่นสมัคร</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700" }}>หมดอายุ/เรียกสอบเมื่อ</th>
                  <th style={{ padding: "14px 16px", fontWeight: "700", textAlign: "right" }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => {
                  const fullName = `${app.ic_firstname} ${app.ic_lastname}`;
                  
                  // Status badge logic
                  let badgeBg = "rgba(255,255,255,0.05)";
                  let badgeColor = "var(--text-muted)";
                  let statusText: string = app.status;

                  if (app.status === "pending") {
                    badgeBg = "rgba(59, 130, 246, 0.15)";
                    badgeColor = "#60a5fa";
                    statusText = "รอตรวจสอบ";
                  } else if (app.status === "called") {
                    badgeBg = "rgba(245, 158, 11, 0.15)";
                    badgeColor = "#fcd34d";
                    statusText = "เรียกสอบแล้ว";
                  } else if (app.status === "expired") {
                    badgeBg = "rgba(239, 68, 68, 0.12)";
                    badgeColor = "#fca5a5";
                    statusText = "หมดอายุ";
                  } else if (app.status === "rejected") {
                    badgeBg = "rgba(239, 68, 68, 0.15)";
                    badgeColor = "#f87171";
                    statusText = "สอบไม่ผ่าน";
                  } else if (app.status === "approved") {
                    badgeBg = "rgba(16, 185, 129, 0.15)";
                    badgeColor = "#34d399";
                    statusText = "สอบผ่าน";
                  }

                  return (
                    <tr 
                      key={app.id} 
                      style={{ 
                        borderBottom: "1px solid rgba(255,255,255,0.03)", 
                        transition: "all 0.2s",
                        backgroundColor: app.status === "pending" ? "rgba(59,130,246,0.01)" : undefined
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = app.status === "pending" ? "rgba(59,130,246,0.01)" : "transparent"}
                    >
                      {/* Queue Number */}
                      <td style={{ padding: "14px 16px", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                        #{app.queue_number}
                      </td>

                      {/* Discord UID */}
                      <td style={{ padding: "14px 16px", color: "#818cf8", fontWeight: "600" }}>
                        <a 
                          href={`https://discord.com/users/${app.discord_uid}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <User size={12} />
                          {app.discord_uid}
                        </a>
                      </td>

                      {/* IC Name */}
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#ffffff" }}>
                        {fullName}
                      </td>

                      {/* Age & Type */}
                      <td style={{ padding: "14px 16px" }}>
                        {app.age} ปี ({app.age_type === "IC" ? "ตัวละคร" : "ของจริง"})
                      </td>

                      {/* Previous Experience */}
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={app.previous_experience || "ไม่มี"}>
                        {app.previous_experience || "—"}
                      </td>

                      {/* Reason */}
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={app.reason_to_join}>
                        {app.reason_to_join}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "700", background: badgeBg, color: badgeColor }}>
                          {statusText}
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>
                        {new Date(app.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Expiry or Called At */}
                      <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>
                        {app.status === "called" && app.called_at ? (
                          <span style={{ color: "#fcd34d" }}>
                            📞 {new Date(app.called_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : app.status === "pending" ? (
                          <span style={{ color: "#fca5a5" }}>
                            ⏰ {new Date(app.expires_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : app.status === "expired" ? (
                          <span style={{ color: "#ef4444" }}>
                            ❌ หมดอายุ
                          </span>
                        ) : "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {app.status === "pending" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRejectApplicant(app.id, fullName)}
                              className="btn btn-danger"
                              style={{ padding: "6px 10px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CrossIcon size={12} />
                              สอบไม่ผ่าน
                            </button>
                            <button
                              onClick={() => handleCallApplicant(app.id, fullName)}
                              className="btn btn-primary"
                              style={{ padding: "6px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CheckIcon size={12} style={{ color: "#060a13" }} />
                              เรียกสอบ
                            </button>
                          </div>
                        ) : app.status === "called" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRejectApplicant(app.id, fullName)}
                              className="btn btn-danger"
                              style={{ padding: "6px 10px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CrossIcon size={12} />
                              สอบไม่ผ่าน
                            </button>
                            <button
                              onClick={() => handleApproveApplicant(app.id, fullName)}
                              className="btn btn-success"
                              style={{ padding: "6px 12px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CheckIcon size={12} />
                              สอบผ่าน
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>ดำเนินการเสร็จสิ้น</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Webhook Configuration Card at Bottom */}
      <section className="card" style={{ padding: "24px", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", background: "var(--bg-card)" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <MegaphoneIcon size={18} style={{ color: "var(--accent)" }} />
            ตั้งค่าช่องแจ้งเตือนสมัครงาน (Recruitment Webhook Settings)
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            ตั้งค่า URL Discord Webhook ห้องที่ใช้ในการแท็กและแจ้งเตือนเรียกผู้สมัครงานเข้ามาสอบสัมภาษณ์/ปฏิบัติการแพทย์
          </p>
        </div>

        <form onSubmit={handleSaveWebhook} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
              🔗 Webhook สำหรับระบบสมัครงานแพทย์ (Recruitment Notification Webhook)
            </label>
            <input 
              type="url" 
              placeholder="https://discord.com/api/webhooks/..." 
              value={discordApplicationWebhookUrl}
              onChange={e => setDiscordApplicationWebhookUrl(e.target.value.trim())}
              style={{ width: "100%", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              ระบบจะทำการ POST ข้อความแท็กเรียกสอบไปยัง Webhook URL นี้เมื่อคุณคลิกที่ปุ่ม "เรียกสอบ" ข้างต้น (หากปล่อยว่างไว้ ระบบจะหันไปใช้ Webhook ทั่วไปของระบบในการแจ้งเตือนแทน)
            </span>
          </div>

          {/* Webhook Status Info */}
          {webhookStatus && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              background: webhookStatus.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: webhookStatus.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
              color: webhookStatus.type === "success" ? "#a7f3d0" : "#fca5a5"
            }}>
              {webhookStatus.message}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              type="submit" 
              disabled={isSavingWebhook}
              className="btn btn-primary"
              style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <SaveIcon size={14} style={{ color: "#060a13" }} />
              {isSavingWebhook ? "กำลังบันทึก..." : "บันทึกการตั้งค่า Webhook"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
