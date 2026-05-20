"use client";

import { useEffect, useState } from "react";
import { formatThaiDate, formatHoursToHHMMSS, formatDuration } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface AdminOverviewEntry {
  email: string;
  name: string;
  discordUsername: string;
  totalHours: number;
  status: "active" | "completed";
  lastClockIn: string;
}

interface ShiftDetail {
  id: string;
  clock_in: string;
  clock_out: string;
  duration_minutes: number;
  status: string;
  proof_image_url: string | null;
  is_deducted?: boolean;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isMasterAdmin = currentUser && currentUser.role === "admin" && !currentUser.discordId;

  const [overview, setOverview] = useState<AdminOverviewEntry[]>([]);
  const [totalShifts, setTotalShifts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [bonusThreshold, setBonusThreshold] = useState<number>(20);
  const [dailyMinHours, setDailyMinHours] = useState<number>(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Gallery Modal
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [userShifts, setUserShifts] = useState<ShiftDetail[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // OP Schedule & Settings State
  const [registeredDoctors, setRegisteredDoctors] = useState<Array<{ email: string, name: string, discordUsername: string, avatarUrl?: string, discordId?: string }>>([]);
  const [opSchedule, setOpSchedule] = useState<Record<string, Array<string>>>({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  });
  const [opNicknameMode, setOpNicknameMode] = useState<string>("manual");
  const [isSyncingNicknames, setIsSyncingNicknames] = useState(false);
  const [isSavingOpSettings, setIsSavingOpSettings] = useState(false);

  // Admin Management State
  const [adminCredentials, setAdminCredentials] = useState<Array<{ username: string, name: string, password?: string }>>([]);
  const [adminDiscord, setAdminDiscord] = useState<Array<{ email?: string, username?: string, name: string }>>([]);
  
  // New Admin Form State
  const [newCredUsername, setNewCredUsername] = useState("");
  const [newCredPassword, setNewCredPassword] = useState("");
  const [newCredName, setNewCredName] = useState("");
  
  const [newDiscordEmail, setNewDiscordEmail] = useState("");
  const [newDiscordUsername, setNewDiscordUsername] = useState("");
  const [newDiscordName, setNewDiscordName] = useState("");
  const [discordAddMode, setDiscordAddMode] = useState<"email" | "username">("email");

  useEffect(() => {
    // Fetch Settings
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings?.bonus_threshold) {
          setBonusThreshold(data.settings.bonus_threshold);
        }
        if (data.settings?.daily_min_hours) {
          setDailyMinHours(Number(data.settings.daily_min_hours));
        }
        if (data.settings?.admin_credentials_accounts) {
          setAdminCredentials(data.settings.admin_credentials_accounts);
        }
        if (data.settings?.admin_discord_accounts) {
          setAdminDiscord(data.settings.admin_discord_accounts);
        }
      })
      .catch(err => console.error("Failed to load settings:", err));

    // Fetch Overview
    fetch("/api/admin/overview")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error("ไม่มีสิทธิ์เข้าถึงหน้านี้");
          throw new Error("โหลดข้อมูลไม่สำเร็จ");
        }
        return res.json();
      })
      .then((data) => {
        if (data.overview) {
          setOverview(data.overview);
          setTotalShifts(data.totalShifts);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Fetch OP Status/Settings
    fetch("/api/op/status")
      .then(res => res.json())
      .then(data => {
        if (data.registeredDoctors) {
          setRegisteredDoctors(data.registeredDoctors);
        }
        if (data.opSchedule) {
          setOpSchedule(data.opSchedule);
        }
        if (data.opNicknameMode) {
          setOpNicknameMode(data.opNicknameMode);
        }
      })
      .catch(err => console.error("Failed to load OP settings:", err));
  }, []);

  const handleDragStart = (e: React.DragEvent, username: string) => {
    e.dataTransfer.setData("text/plain", username);
  };

  const handleDrop = (e: React.DragEvent, day: string) => {
    const username = e.dataTransfer.getData("text/plain");
    if (!username) return;
    
    setOpSchedule(prev => {
      const currentList = prev[day] || [];
      if (currentList.includes(username)) return prev;
      return {
        ...prev,
        [day]: [...currentList, username]
      };
    });
  };

  const handleRemoveOpFromDay = (day: string, username: string) => {
    setOpSchedule(prev => {
      const currentList = prev[day] || [];
      return {
        ...prev,
        [day]: currentList.filter(u => u !== username)
      };
    });
  };

  const saveOpSettings = async (updatedSchedule: any, mode: string) => {
    setIsSavingOpSettings(true);
    try {
      await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "op_schedule", value: updatedSchedule })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "op_nickname_mode", value: mode })
        })
      ]);
      alert("บันทึกตารางเวรและโหมดการทำงาน OP สำเร็จ");
    } catch (err) {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setIsSavingOpSettings(false);
    }
  };

  const handleSyncNicknames = async () => {
    if (!confirm("ยืนยันซิงค์ชื่อเล่นแพทย์ทุกคนผ่านบอท Discord?")) return;
    setIsSyncingNicknames(true);
    try {
      const res = await fetch("/api/op/sync-nicknames", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "ซิงค์ชื่อเล่นสำเร็จ");
        // Reload OP status
        const statusRes = await fetch("/api/op/status");
        const statusData = await statusRes.json();
        if (statusData.registeredDoctors) {
          setRegisteredDoctors(statusData.registeredDoctors);
        }
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการซิงค์");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการซิงค์");
    } finally {
      setIsSyncingNicknames(false);
    }
  };

  const handleDeleteDoctor = async (email: string) => {
    if (!confirm("ต้องการลบแพทย์คนนี้ออกจากรายชื่อลงทะเบียนในระบบหรือไม่? (หากแพทย์ล็อกอินเข้ามาใหม่จะถูกเพิ่มเข้ามาอีกครั้ง)")) return;
    const updated = registeredDoctors.filter(d => d.email !== email);
    setRegisteredDoctors(updated);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "registered_doctors", value: updated })
      });
    } catch (err) {
      console.error("Failed to delete doctor:", err);
    }
  };

  const handleEditDoctorName = async (email: string, newName: string) => {
    const updated = registeredDoctors.map(d => d.email === email ? { ...d, name: newName } : d);
    setRegisteredDoctors(updated);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "registered_doctors", value: updated })
      });
      // Try updating user_names mapping for backward compatibility
      const settingsRes = await fetch("/api/admin/settings");
      const settingsData = await settingsRes.json();
      const userNames = settingsData?.settings?.user_names || {};
      userNames[email] = newName;
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "user_names", value: userNames })
      });
    } catch (err) {
      console.error("Failed to update doctor name:", err);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await Promise.all([
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "bonus_threshold", value: bonusThreshold })
        }),
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "daily_min_hours", value: dailyMinHours })
        })
      ]);
      alert("บันทึกการตั้งค่าสำเร็จ");
    } catch (err) {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openGallery = async (email: string, name: string) => {
    setSelectedUserEmail(email);
    setSelectedUserName(name);
    setLoadingShifts(true);
    try {
      const res = await fetch(`/api/admin/user-shifts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.shifts) {
        setUserShifts(data.shifts);
      }
    } catch (err) {
      console.error("Failed to load user shifts", err);
    } finally {
      setLoadingShifts(false);
    }
  };

  const closeGallery = () => {
    setSelectedUserEmail(null);
    setSelectedUserName(null);
    setUserShifts([]);
  };

  const handleDeduct = async (shiftId: string, currentlyDeducted: boolean) => {
    const action = currentlyDeducted ? "ยกเลิกการหัก" : "หักเวรนี้ออกจากโบนัส";
    if (!confirm(`ยืนยัน${action}?`)) return;

    try {
      const res = await fetch("/api/admin/deduct-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, deducted: !currentlyDeducted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");

      // Update local state
      setUserShifts(prev =>
        prev.map(s => s.id === shiftId ? { ...s, is_deducted: !currentlyDeducted } : s)
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCredAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert("เฉพาะบัญชีแอดมินระบบหลัก (Master Admin) เท่านั้นที่มีสิทธิ์จัดการสิทธิ์ผู้ดูแลระบบได้");
      return;
    }
    if (!newCredUsername || !newCredPassword || !newCredName) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนค่ะ");
      return;
    }

    if (newCredUsername.toLowerCase() === "admin") {
      alert("ไม่สามารถใช้ชื่อผู้ใช้ 'admin' ได้เนื่องจากเป็นบัญชีมาสเตอร์ของระบบค่ะ");
      return;
    }

    // Check duplicate
    if (adminCredentials.some(acc => acc.username.toLowerCase() === newCredUsername.toLowerCase())) {
      alert("มีชื่อผู้ใช้นี้ในระบบแล้วค่ะ");
      return;
    }

    const updated = [...adminCredentials, { username: newCredUsername, password: newCredPassword, name: newCredName }];
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_credentials_accounts", value: updated })
      });
      if (res.ok) {
        setAdminCredentials(updated);
        setNewCredUsername("");
        setNewCredPassword("");
        setNewCredName("");
        alert("เพิ่มบัญชีผู้ดูแลระบบสำเร็จแล้วค่ะ");
      } else {
        alert("ไม่สามารถเพิ่มบัญชีผู้ดูแลระบบได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleAddDiscordAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert("เฉพาะบัญชีแอดมินระบบหลัก (Master Admin) เท่านั้นที่มีสิทธิ์จัดการสิทธิ์ผู้ดูแลระบบได้");
      return;
    }
    if (discordAddMode === "email" && !newDiscordEmail) {
      alert("กรุณากรอกอีเมล Discord ค่ะ");
      return;
    }
    if (discordAddMode === "username" && !newDiscordUsername) {
      alert("กรุณากรอกชื่อผู้ใช้ Discord ค่ะ");
      return;
    }
    if (!newDiscordName) {
      alert("กรุณากรอกชื่อแสดงค่ะ");
      return;
    }

    const newAdmin: any = { name: newDiscordName };
    if (discordAddMode === "email") {
      newAdmin.email = newDiscordEmail;
      if (newDiscordEmail.toLowerCase() === "lneeobee@gmail.com") {
        alert("ไม่จำเป็นต้องเพิ่มอีเมลนี้เนื่องจากได้รับสิทธิ์นักพัฒนาของระบบแล้วค่ะ");
        return;
      }
      // Duplicate check
      if (adminDiscord.some(acc => acc.email?.toLowerCase() === newDiscordEmail.toLowerCase())) {
        alert("มีอีเมลนี้ในระบบแล้วค่ะ");
        return;
      }
    } else {
      newAdmin.username = newDiscordUsername;
      // Duplicate check
      if (adminDiscord.some(acc => acc.username?.toLowerCase() === newDiscordUsername.toLowerCase())) {
        alert("มีชื่อผู้ใช้นี้ในระบบแล้วค่ะ");
        return;
      }
    }

    const updated = [...adminDiscord, newAdmin];
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_discord_accounts", value: updated })
      });
      if (res.ok) {
        setAdminDiscord(updated);
        setNewDiscordEmail("");
        setNewDiscordUsername("");
        setNewDiscordName("");
        alert("เพิ่มสิทธิ์แอดมิน Discord สำเร็จแล้วค่ะ");
      } else {
        alert("ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDeleteCredAdmin = async (username: string) => {
    if (!isMasterAdmin) {
      alert("เฉพาะบัญชีแอดมินระบบหลัก (Master Admin) เท่านั้นที่มีสิทธิ์จัดการสิทธิ์ผู้ดูแลระบบได้");
      return;
    }
    if (!confirm(`ยืนยันต้องการลบแอดมิน "${username}" หรือไม่?`)) return;
    const updated = adminCredentials.filter(acc => acc.username !== username);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_credentials_accounts", value: updated })
      });
      if (res.ok) {
        setAdminCredentials(updated);
        alert("ลบบัญชีแอดมินสำเร็จ");
      }
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleDeleteDiscordAdmin = async (adminObj: any) => {
    if (!isMasterAdmin) {
      alert("เฉพาะบัญชีแอดมินระบบหลัก (Master Admin) เท่านั้นที่มีสิทธิ์จัดการสิทธิ์ผู้ดูแลระบบได้");
      return;
    }
    const displayName = adminObj.email ? adminObj.email : `@${adminObj.username}`;
    if (!confirm(`ยืนยันต้องการลบสิทธิ์แอดมินของ "${displayName}" หรือไม่?`)) return;
    
    const updated = adminDiscord.filter(acc => 
      !(acc.email === adminObj.email && acc.username === adminObj.username)
    );
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_discord_accounts", value: updated })
      });
      if (res.ok) {
        setAdminDiscord(updated);
        alert("ลบสิทธิ์แอดมิน Discord สำเร็จ");
      }
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div>
            <h1 className="page-title">👑 แดชบอร์ดผู้ดูแลระบบ</h1>
            <p className="page-subtitle">กำลังโหลดข้อมูลภาพรวม...</p>
          </div>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">👑 แดชบอร์ดผู้ดูแลระบบ</h1>
          <p className="page-subtitle">ภาพรวมการเข้าเวรทั้งหมด</p>
        </div>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {/* Settings Box */}
          <div style={{ background: "var(--bg-secondary)", padding: "12px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>เกณฑ์ชั่วโมงโบนัส</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input 
                  type="number" 
                  value={bonusThreshold}
                  onChange={e => setBonusThreshold(Number(e.target.value) || 0)}
                  style={{ width: "60px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ชม./สัปดาห์</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>ชั่วโมงขั้นต่ำต่อวัน</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input 
                  type="number" 
                  value={dailyMinHours}
                  onChange={e => setDailyMinHours(Number(e.target.value) || 0)}
                  style={{ width: "60px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ชม./วัน</span>
              </div>
            </div>
            <button 
              onClick={saveSettings}
              disabled={isSavingSettings}
              style={{ padding: "6px 12px", background: "var(--primary)", color: "white", border: "none", borderRadius: "4px", cursor: isSavingSettings ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: "600" }}
            >
              {isSavingSettings ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>

          <div style={{ background: "var(--bg-card)", padding: "12px 24px", borderRadius: "var(--radius)", border: "1px solid var(--border)", textAlign: "center" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>เวรทั้งหมดที่บันทึก</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary)" }}>{totalShifts}</div>
          </div>
        </div>
      </header>

      <div className="admin-list" style={{ marginTop: "24px" }}>
        {overview.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px" }}>
            <h3 style={{ color: "var(--text-secondary)" }}>ยังไม่มีข้อมูลเจ้าหน้าที่</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {overview.map((entry, index) => (
              <div key={index} className="admin-card card">
                <div className="admin-card-header">
                  <div className="admin-avatar">
                    {entry.discordUsername ? entry.discordUsername.charAt(0).toUpperCase() : entry.name.charAt(0)}
                  </div>
                  <div className="admin-info">
                    <div className="admin-name">
                      {entry.discordUsername ? `@${entry.discordUsername}` : entry.name}
                    </div>
                    {entry.discordUsername && entry.name && (
                      <div className="admin-subname">{entry.name}</div>
                    )}
                    <div className="admin-email">{entry.email}</div>
                  </div>
                  
                  <div className="admin-status-wrapper">
                    {entry.status === "active" ? (
                      <span className="status-badge on-duty">
                        <span className="status-dot"></span> กำลังเข้าเวร
                      </span>
                    ) : (
                      <span className="status-badge off-duty">
                        <span className="status-dot" style={{ opacity: 0.5 }}></span> ออกเวรแล้ว
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-card-stats">
                  <div className="stat-item">
                    <span className="stat-label">เข้าเวรล่าสุด:</span>
                    <span className="stat-value-small">{formatThaiDate(new Date(entry.lastClockIn))}</span>
                  </div>
                  <div className="stat-item highlight">
                    <span className="stat-label">ชั่วโมงรวม:</span>
                    <span className="stat-value-large" style={{ fontFamily: "var(--font-mono)" }}>{formatHoursToHHMMSS(entry.totalHours)}</span>
                  </div>
                </div>

                <div style={{ padding: "0 16px 16px", display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => openGallery(entry.email, entry.discordUsername ? `@${entry.discordUsername}` : entry.name)}
                    title="ดูประวัติการเข้าเวรและรูปยืนยัน"
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", transition: "all 0.2s ease" }}
                  >
                    📸
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OP Schedule section */}
      <section className="card" style={{ marginTop: "32px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>🗓️ ตารางเวรและตั้งค่าระบบ OP</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>จัดการรายชื่อแพทย์ผู้มีสิทธิ์ควบคุมคิวในแต่ละวัน (ลากและวางการ์ดเพื่อจัดตาราง)</p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Mode Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ซิงค์ชื่อเล่นจาก Discord Bot:</span>
              <button 
                onClick={() => {
                  const nextMode = opNicknameMode === "discord" ? "manual" : "discord";
                  setOpNicknameMode(nextMode);
                }}
                style={{
                  padding: "4px 10px",
                  background: opNicknameMode === "discord" ? "var(--success)" : "var(--bg-card)",
                  color: opNicknameMode === "discord" ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  transition: "0.2s"
                }}
              >
                {opNicknameMode === "discord" ? "เปิด (Active)" : "ปิด (Manual)"}
              </button>
            </div>

            <button
              onClick={handleSyncNicknames}
              disabled={isSyncingNicknames || opNicknameMode !== "discord"}
              style={{
                padding: "8px 14px",
                background: opNicknameMode === "discord" ? "var(--primary)" : "var(--bg-secondary)",
                color: opNicknameMode === "discord" ? "white" : "var(--text-muted)",
                border: "none",
                borderRadius: "6px",
                cursor: opNicknameMode === "discord" && !isSyncingNicknames ? "pointer" : "not-allowed",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "0.2s"
              }}
            >
              {isSyncingNicknames ? "กำลังซิงค์..." : "ซิงค์ชื่อเล่น Discord 🔄"}
            </button>

            <button
              onClick={() => saveOpSettings(opSchedule, opNicknameMode)}
              disabled={isSavingOpSettings}
              style={{
                padding: "8px 16px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              {isSavingOpSettings ? "กำลังบันทึก..." : "บันทึกตารางเวร OP 💾"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {/* Left Column: Registered Doctors List */}
          <div style={{ flex: "1 1 300px", background: "var(--bg-secondary)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}>
              <span>👥 แพทย์ที่ลงทะเบียนในระบบ ({registeredDoctors.length})</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto", paddingRight: "4px", marginTop: "12px" }}>
              {registeredDoctors.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  ยังไม่มีแพทย์ลงทะเบียน (ต้องล็อกอินผ่านเว็บอย่างน้อย 1 ครั้ง)
                </div>
              ) : (
                registeredDoctors.map((doc) => (
                  <div
                    key={doc.email}
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc.discordUsername)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "var(--bg-card)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      cursor: "grab",
                      userSelect: "none",
                      transition: "0.2s"
                    }}
                  >
                    {doc.avatarUrl ? (
                      <img src={doc.avatarUrl} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                    ) : (
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "white" }}>
                        {doc.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          value={doc.name}
                          onChange={(e) => handleEditDoctorName(doc.email, e.target.value)}
                          title="พิมพ์เพื่อเปลี่ยนชื่อเรียกแพทย์"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            fontWeight: "500",
                            width: "100%",
                            outline: "none",
                            padding: "2px 0",
                            borderBottom: "1px dashed transparent"
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{doc.discordUsername}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoctor(doc.email)}
                      title="ลบออกจากรายชื่อลงทะเบียน"
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", fontSize: "1rem" }}
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Weekly Schedule Days Grid */}
          <div style={{ flex: "2 2 600px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {Object.keys(opSchedule).map((day) => {
              const dayTranslations: Record<string, string> = {
                Monday: "วันจันทร์",
                Tuesday: "วันอังคาร",
                Wednesday: "วันพุธ",
                Thursday: "วันพฤหัสบดี",
                Friday: "วันศุกร์",
                Saturday: "วันเสาร์",
                Sunday: "วันอาทิตย์"
              };
              const dayColors: Record<string, string> = {
                Monday: "#ffe066",
                Tuesday: "#ff8787",
                Wednesday: "#8ce99a",
                Thursday: "#ffc078",
                Friday: "#74c0fc",
                Saturday: "#da77f2",
                Sunday: "#ff6b6b"
              };

              const ops = opSchedule[day] || [];

              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, day)}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "150px",
                    transition: "0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dayColors[day] }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>{dayTranslations[day]}</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--bg-card)", padding: "1px 6px", borderRadius: "10px" }}>{ops.length}</span>
                  </div>
                  
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {ops.length === 0 ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "6px", color: "var(--text-muted)", fontSize: "0.75rem", padding: "12px", textAlign: "center" }}>
                        ลากรายชื่อมาวางที่นี่
                      </div>
                    ) : (
                      ops.map((username) => {
                        const docInfo = registeredDoctors.find(d => d.discordUsername === username);
                        const nameDisplay = docInfo ? docInfo.name : `@${username}`;
                        return (
                          <div
                            key={username}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "var(--bg-card)",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              border: "1px solid var(--border-subtle)",
                              fontSize: "0.8rem",
                              color: "var(--text-primary)"
                            }}
                          >
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "80%" }}>{nameDisplay}</span>
                            <button
                              onClick={() => handleRemoveOpFromDay(day, username)}
                              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem", padding: "0 2px" }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section: Admin Management */}
      <section className="card" style={{ marginTop: "32px", padding: "24px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            👥 จัดการสิทธิ์ผู้ดูแลระบบ (Admin Management)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            จัดการบัญชีผู้ดูแลระบบ ทั้งแบบป้อนรหัสผ่านตรง (Credentials) และแบบมอบสิทธิ์ผ่านบัญชี Discord
          </p>
        </div>

        {/* Warning Banner for Discord Admins / Sub-admins */}
        {!isMasterAdmin && (
          <div style={{
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px dashed rgb(245, 158, 11)",
            borderRadius: "8px",
            padding: "14px 18px",
            color: "rgb(245, 158, 11)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            lineHeight: "1.4"
          }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <span>เฉพาะบัญชีผู้ดูแลระบบหลักของเว็บ (Master Admin) เท่านั้นที่มีสิทธิ์จัดการหรือสลับสิทธิ์การเข้าถึงผู้ดูแลระบบคนอื่นค่ะ</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
          
          {/* Column 1: Credentials Admin Accounts */}
          <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              🔑 บัญชีแอดมินทั่วไป (Credentials)
            </h3>
            
            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
              {/* Default Master Admin is always implicit and cannot be deleted */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>Master Admin (admin)</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>บัญชีหลักจากระบบ (.env)</div>
                </div>
                <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", padding: "2px 8px", borderRadius: "12px", fontWeight: "bold" }}>ระบบ</span>
              </div>

              {adminCredentials.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                  ยังไม่มีบัญชีทั่วไปเพิ่มเติม
                </div>
              ) : (
                adminCredentials.map((acc) => (
                  <div key={acc.username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>{acc.name} ({acc.username})</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>สิทธิ์: แอดมินทั่วไป</div>
                    </div>
                    {isMasterAdmin && (
                      <button 
                        onClick={() => handleDeleteCredAdmin(acc.username)}
                        style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "0.8rem", cursor: "pointer", transition: "0.2s" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                      >
                        ลบ 🚫
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form (Only visible to Master Admin) */}
            {isMasterAdmin && (
              <form onSubmit={handleAddCredAdmin} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)" }}>➕ เพิ่มบัญชีทั่วไป</div>
                <input 
                  type="text" 
                  placeholder="ชื่อผู้ใช้ (Username)" 
                  value={newCredUsername}
                  onChange={e => setNewCredUsername(e.target.value.trim())}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
                <input 
                  type="password" 
                  placeholder="รหัสผ่าน (Password)" 
                  value={newCredPassword}
                  onChange={e => setNewCredPassword(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
                <input 
                  type="text" 
                  placeholder="ชื่อแสดง (Display Name)" 
                  value={newCredName}
                  onChange={e => setNewCredName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
                <button type="submit" style={{ padding: "8px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem", marginTop: "4px" }}>
                  เพิ่มบัญชีแอดมิน
                </button>
              </form>
            )}
          </div>

          {/* Column 2: Discord Admin Accounts */}
          <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              🌐 มอบสิทธิ์ผ่าน Discord
            </h3>

            {/* List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
              {/* Default lneeobee developer account is always implicit and cannot be deleted */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>Developer Account</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>lneeobee@gmail.com</div>
                </div>
                <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--success)", padding: "2px 8px", borderRadius: "12px", fontWeight: "bold" }}>ระบบ</span>
              </div>

              {adminDiscord.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                  ยังไม่มีสิทธิ์ผ่าน Discord เพิ่มเติม
                </div>
              ) : (
                adminDiscord.map((acc, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>{acc.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {acc.email ? `อีเมล: ${acc.email}` : `ชื่อผู้ใช้: @${acc.username}`}
                      </div>
                    </div>
                    {isMasterAdmin && (
                      <button 
                        onClick={() => handleDeleteDiscordAdmin(acc)}
                        style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "0.8rem", cursor: "pointer", transition: "0.2s" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                      >
                        ลบ 🚫
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form (Only visible to Master Admin) */}
            {isMasterAdmin && (
              <form onSubmit={handleAddDiscordAdmin} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)" }}>➕ มอบสิทธิ์ Discord</span>
                  {/* Select Mode */}
                  <div style={{ display: "flex", gap: "4px", background: "var(--bg-card)", padding: "2px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                    <button 
                      type="button" 
                      onClick={() => setDiscordAddMode("email")}
                      style={{ background: discordAddMode === "email" ? "var(--primary)" : "transparent", color: discordAddMode === "email" ? "white" : "var(--text-secondary)", border: "none", padding: "2px 8px", borderRadius: "3px", fontSize: "0.7rem", fontWeight: "bold", cursor: "pointer" }}
                    >
                      ระบุเมล
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setDiscordAddMode("username")}
                      style={{ background: discordAddMode === "username" ? "var(--primary)" : "transparent", color: discordAddMode === "username" ? "white" : "var(--text-secondary)", border: "none", padding: "2px 8px", borderRadius: "3px", fontSize: "0.7rem", fontWeight: "bold", cursor: "pointer" }}
                    >
                      ระบุชื่อเล่น
                    </button>
                  </div>
                </div>

                {discordAddMode === "email" ? (
                  <input 
                    type="email" 
                    placeholder="อีเมล Discord (เช่น test@gmail.com)" 
                    value={newDiscordEmail}
                    onChange={e => setNewDiscordEmail(e.target.value.trim())}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                    required
                  />
                ) : (
                  <input 
                    type="text" 
                    placeholder="ชื่อผู้ใช้ Discord (เช่น test_username)" 
                    value={newDiscordUsername}
                    onChange={e => setNewDiscordUsername(e.target.value.trim())}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                    required
                  />
                )}

                <input 
                  type="text" 
                  placeholder="ชื่อแสดง (เช่น หมอสมพงษ์ แอดมินร่วม)" 
                  value={newDiscordName}
                  onChange={e => setNewDiscordName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  required
                />
                
                <button type="submit" style={{ padding: "8px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem", marginTop: "4px" }}>
                  มอบสิทธิ์แอดมิน
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* Gallery Modal */}
      {selectedUserEmail && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)" }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>ประวัติการเข้าเวรของ {selectedUserName}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>แสดง 20 รายการล่าสุด</p>
              </div>
              <button onClick={closeGallery} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "var(--bg-secondary)" }}>
              {loadingShifts ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>กำลังโหลดประวัติ...</div>
              ) : userShifts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>ไม่มีประวัติการออกเวร</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {userShifts.map((shift) => (
                    <div key={shift.id} className="card" style={{
                      padding: "16px",
                      display: "flex",
                      gap: "20px",
                      flexWrap: "wrap",
                      alignItems: "center",
                      opacity: shift.is_deducted ? 0.5 : 1,
                      border: shift.is_deducted ? "1px solid rgba(239, 68, 68, 0.4)" : undefined,
                      background: shift.is_deducted ? "rgba(239, 68, 68, 0.05)" : undefined,
                      position: "relative",
                    }}>
                      {shift.is_deducted && (
                        <div style={{
                          position: "absolute", top: "8px", right: "8px",
                          background: "rgba(239, 68, 68, 0.2)", color: "#ef4444",
                          padding: "2px 8px", borderRadius: "4px",
                          fontSize: "0.7rem", fontWeight: "bold",
                        }}>🚫 ถูกหัก</div>
                      )}
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "4px" }}>📅 {formatThaiDate(new Date(shift.clock_in))}</div>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ color: "var(--success)", fontWeight: "bold", textDecoration: shift.is_deducted ? "line-through" : "none" }}>เข้า: {new Date(shift.clock_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span style={{ color: "var(--text-muted)" }}>→</span>
                          <span style={{ color: "var(--danger)", fontWeight: "bold", textDecoration: shift.is_deducted ? "line-through" : "none" }}>ออก: {shift.clock_out ? new Date(shift.clock_out).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                        </div>
                        <div style={{ display: "inline-block", background: "var(--bg-secondary)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem", color: shift.is_deducted ? "#ef4444" : "var(--primary)", fontFamily: "var(--font-mono)", textDecoration: shift.is_deducted ? "line-through" : "none" }}>
                          ⏱️ {formatDuration(shift.duration_minutes)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ width: "120px", height: "80px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", cursor: shift.proof_image_url ? "pointer" : "default" }}
                             onClick={() => shift.proof_image_url && setFullscreenImage(shift.proof_image_url)}
                        >
                          {shift.proof_image_url ? (
                            <img src={shift.proof_image_url} alt="Proof" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9, transition: "0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "1"} onMouseOut={e => e.currentTarget.style.opacity = "0.9"} />
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>ไม่มีรูปภาพ</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeduct(shift.id, !!shift.is_deducted)}
                          title={shift.is_deducted ? "ยกเลิกการหัก" : "หักเวรนี้ออกจากโบนัส"}
                          style={{
                            padding: "8px 12px",
                            background: shift.is_deducted ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: shift.is_deducted ? "#f59e0b" : "#ef4444",
                            border: `1px solid ${shift.is_deducted ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                            transition: "0.2s",
                          }}
                        >
                          {shift.is_deducted ? "↩️ คืน" : "🚫 หัก"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreenImage && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.95)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: "40px", cursor: "zoom-out" }}
          onClick={() => setFullscreenImage(null)}
        >
          <img src={fullscreenImage} alt="Fullscreen Proof" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", top: "20px", right: "20px", color: "white", fontSize: "1.2rem", fontWeight: "bold", background: "rgba(0,0,0,0.5)", padding: "8px 16px", borderRadius: "20px" }}>คลิกที่ใดก็ได้เพื่อปิด</div>
        </div>
      )}

    </div>
  );
}
