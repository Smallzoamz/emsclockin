"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { formatThaiDate } from "@/lib/utils";
import { ClipboardIcon, HospitalIcon, CheckIcon, LockIcon, PowerIcon, RefreshIcon, WarningIcon, SaveIcon, ClockIcon, FileTextIcon, ReturnIcon } from "@/components/Icons";

interface DoctorEntry {
  email: string;
  name: string;
  discordUsername: string;
  avatarUrl?: string;
  status: "active" | "completed";
  queueCategory: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive";
  skippedAt?: number;
}

export default function OpQueuePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const [opSchedule, setOpSchedule] = useState<Record<string, string[]>>({});
  
  // Lists
  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [opQueueState, setOpQueueState] = useState<Record<string, string>>({});
  const [registeredDoctors, setRegisteredDoctors] = useState<any[]>([]);
  
  // Notice & Posting state
  const [notice, setNotice] = useState("⚠️ คำเตือน: รบกวนหมอเวรทุกคนเปิดวิทยุช่องหลัก และรายงานตัวทันทีเมื่อเข้าพื้นที่เวร!");
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingQueue, setIsSavingQueue] = useState(false);
  const [opActive, setOpActive] = useState(false);
  const [opOpenedBy, setOpOpenedBy] = useState<{ email: string; discordUsername: string } | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  const fetchOpData = async (currentSession?: any) => {
    try {
      const res = await fetch("/api/op/status");
      if (!res.ok) {
        if (res.status === 401) throw new Error("กรุณาเข้าสู่ระบบ");
        throw new Error("ไม่สามารถโหลดข้อมูลคิวได้");
      }
      const data = await res.json();
      
      setCurrentDay(data.currentDay || "");
      setOpSchedule(data.opSchedule || {});
      setOpQueueState(data.opQueueState || {});
      setOpActive(data.opActive === true);
      setOpOpenedBy(data.opOpenedBy || null);
      setRegisteredDoctors(data.registeredDoctors || []);
      if (data.opNotice) {
        setNotice(data.opNotice);
      }

      // Verify authorization: must be admin or in today's OP schedule
      const activeSession = currentSession || session;
      const user = activeSession?.user as any;
      const isAdmin = user?.role === "admin";
      const username = user?.discordUsername;
      const todayOps = data.opSchedule?.[data.currentDay] || [];
      const hasAccess = isAdmin || (username && todayOps.includes(username));
      
      setIsAuthorized(!!hasAccess);
      if (!hasAccess) {
        setError("คุณไม่มีสิทธิ์เข้าใช้งานระบบ OP ในวันนี้นะคะ (แอดมินหรือ OP ประจำวันเท่านั้น)");
        setLoading(false);
        return;
      }

      // Assemble all doctors with their current queue categories
      const allDocs: DoctorEntry[] = [];
      const addedEmails = new Set<string>();

      // 1. Active doctors (clocked in)
      if (data.activeShifts) {
        data.activeShifts.forEach((shift: any) => {
          const email = shift.user_email;
          if (!email || addedEmails.has(email)) return;
          
          const registered = data.registeredDoctors?.find((d: any) => d.email === email);
          const name = registered?.name || shift.user_name || "Unknown Doctor";
          const discordUsername = registered?.discordUsername || shift.discord_username || "";
          const avatarUrl = registered?.avatarUrl;
          const rawCategory = data.opQueueState?.[email] || "active";
          let qCategory: string = rawCategory;
          let skippedAt: number | undefined;
          if (rawCategory.startsWith("skipped:")) {
            qCategory = "skipped";
            skippedAt = parseInt(rawCategory.split(":")[1], 10);
          }

          allDocs.push({
            email,
            name,
            discordUsername,
            avatarUrl,
            status: "active",
            queueCategory: qCategory as any,
            skippedAt
          });
          addedEmails.add(email);
        });
      }

      // 2. Inactive doctors (clocked out recently - last 12 hours)
      if (data.recentShifts) {
        data.recentShifts.forEach((shift: any) => {
          const email = shift.user_email;
          if (!email || addedEmails.has(email)) return; // skip if currently active or duplicate
          
          const registered = data.registeredDoctors?.find((d: any) => d.email === email);
          const name = registered?.name || shift.user_name || "Unknown Doctor";
          const discordUsername = registered?.discordUsername || shift.discord_username || "";
          const avatarUrl = registered?.avatarUrl;

          allDocs.push({
            email,
            name,
            discordUsername,
            avatarUrl,
            status: "completed",
            queueCategory: "inactive"
          });
          addedEmails.add(email);
        });
      }

      setDoctors(allDocs);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setLoading(false);
    }
  };

  const handleToggleOpActive = async () => {
    const isUserAdmin = session?.user?.role === "admin";
    const isUserClockedIn = doctors.some(d => d.email === session?.user?.email && d.status === "active");

    // Check: Only the opener (or Admin) can close OP
    if (opActive && !isUserAdmin && opOpenedBy && opOpenedBy.email !== session?.user?.email) {
      const openerName = opOpenedBy.discordUsername || opOpenedBy.email;
      alert(`🔒 เฉพาะ ${openerName} (คนเปิดเวร OP) เท่านั้นที่สามารถปิดเวร OP ได้ค่ะ`);
      return;
    }

    if (!opActive && !isUserAdmin && !isUserClockedIn) {
      alert("❌ คุณต้องกดเข้าเวรก่อน จึงจะสามารถเปิดระบบ OP ได้ค่ะ");
      return;
    }

    setIsTogglingActive(true);
    const nextState = !opActive;
    try {
      const res = await fetch("/api/op/toggle-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextState, notice })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
      }
      setOpActive(data.active);
      if (!data.active) setOpOpenedBy(null);
      await fetchOpData(session);
      alert(data.active ? "🟢 เปิดเวร OP และส่งข้อความแท็กแจ้งเตือนไปยัง Discord เรียบร้อยแล้วค่ะ!" : "🔴 ปิดเวร OP เรียบร้อยแล้วค่ะ!");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการปรับเปลี่ยนสถานะ OP");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleSaveNotice = async () => {
    setIsSavingNotice(true);
    try {
      const res = await fetch("/api/op/toggle-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: opActive, notice })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
      }
      alert("💾 อัปเดตประกาศบน Discord เรียบร้อยแล้วค่ะ!");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการอัปเดตประกาศ");
    } finally {
      setIsSavingNotice(false);
    }
  };

  useEffect(() => {
    document.title = "ตารางเวร OP | EMS Clock-in";
    getSession().then((sessionData) => {
      setSession(sessionData);
      if (sessionData) {
        fetchOpData(sessionData);
      } else {
        setError("กรุณาเข้าสู่ระบบก่อนการใช้งาน");
        setLoading(false);
      }
    });
  }, []);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, email: string) => {
    e.dataTransfer.setData("text/plain", email);
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: "active" | "skipped" | "story") => {
    e.preventDefault();
    const email = e.dataTransfer.getData("text/plain");
    if (!email) return;

    // We can only move doctors who are currently active/clocked-in
    const targetDoc = doctors.find(d => d.email === email);
    if (!targetDoc || targetDoc.status !== "active") return;

    moveDoctorCategory(email, targetCategory);
  };

  const moveDoctorCategory = async (email: string, category: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive") => {
    if (category === "inactive") return; // cannot move to inactive manually, only system does on clockout

    const skippedAt = category === "skipped" ? Date.now() : undefined;

    // Update locally
    const updatedDocs = doctors.map(d => {
      if (d.email === email) {
        return { ...d, queueCategory: category, skippedAt };
      }
      return d;
    });
    setDoctors(updatedDocs);

    // Prepare updated queue state key/value - store timestamp for skipped
    const stateValue = category === "skipped" ? `skipped:${skippedAt}` : category;
    const nextQueueState = { ...opQueueState, [email]: stateValue };
    setOpQueueState(nextQueueState);

    // Save to server database
    setIsSavingQueue(true);
    try {
      const res = await fetch("/api/op/update-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opQueueState: nextQueueState })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "บันทึกข้อมูลไม่สำเร็จ");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกสถานะคิว");
      fetchOpData(session); // rollback
    } finally {
      setIsSavingQueue(false);
    }
  };

  // Post Queue report to Discord Webhook
  const handleSendToDiscord = async () => {
    setIsPosting(true);
    
    // Group doctor names for report
    const activeList = doctors
      .filter(d => d.queueCategory === "active" || d.queueCategory === "receiving" || d.queueCategory === "recase")
      .map(d => {
        if (d.queueCategory === "receiving") return `${d.name} (รับเคส)`;
        if (d.queueCategory === "recase") return `${d.name} (Re-Case)`;
        return d.name;
      });
    const skippedList = doctors.filter(d => d.queueCategory === "skipped").map(d => d.name);
    const storyList = doctors.filter(d => d.queueCategory === "story").map(d => d.name);
    const inactiveList = doctors.filter(d => d.queueCategory === "inactive").map(d => d.name);

    try {
      const res = await fetch("/api/op/send-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notice,
          activeList,
          skippedList,
          storyList,
          inactiveList
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("ส่งข้อมูลคิวแพทย์ไปยัง Discord Webhook เรียบร้อยแล้วค่ะ! 🚀");
      } else {
        throw new Error(data.error || "ส่งข้อมูลไม่สำเร็จ");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการส่งข้อมูลคิว");
    } finally {
      setIsPosting(false);
    }
  };

  const scheduleDayTranslations: Record<string, string> = {
    Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัสบดี", Friday: "ศุกร์", Saturday: "เสาร์", Sunday: "อาทิตย์"
  };
  const orderedDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>กำลังดึงข้อมูลคิวระบบ OP...</div>
      </div>
    );
  }

  if (error || !isAuthorized) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: "700px", margin: "40px auto", padding: "32px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <ClipboardIcon className="text-[var(--accent)]" /> ตารางเวร OP ประจำสัปดาห์
          </h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>
            คุณสามารถดูตารางเวร OP ได้ แต่ไม่สามารถจัดการคิวได้ (สิทธิ์เฉพาะแอดมินหรือ OP ประจำวัน)
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600 }}>วัน</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600 }}>แพทย์ OP ประจำวัน</th>
                </tr>
              </thead>
              <tbody>
                {orderedDays.map((day) => {
                  const ops = opSchedule[day] || [];
                  const isToday = day === currentDay;
                  return (
                    <tr key={day} style={{
                      background: isToday ? "rgba(59, 130, 246, 0.08)" : "transparent",
                      transition: "background 0.2s"
                    }}>
                      <td style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--border)",
                        fontWeight: isToday ? "bold" : "normal",
                        color: isToday ? "var(--primary)" : "var(--text-primary)",
                        whiteSpace: "nowrap"
                      }}>
                        {isToday && "👉 "}{scheduleDayTranslations[day]}
                      </td>
                      <td style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--border)",
                        color: ops.length > 0 ? "var(--text-primary)" : "var(--text-muted)"
                      }}>
                        {ops.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {ops.map((name: string) => {
                              const registeredDoc = registeredDoctors.find((d: any) => d.discordUsername === name);
                              const displayName = registeredDoc?.name || name;
                              return (
                                <span key={name} style={{
                                  background: isToday ? "var(--primary)" : "var(--bg-secondary)",
                                  color: isToday ? "white" : "var(--text-primary)",
                                  padding: "3px 10px",
                                  borderRadius: "12px",
                                  fontSize: "0.82rem",
                                  fontWeight: isToday ? 600 : 400,
                                  border: isToday ? "none" : "1px solid var(--border)"
                                }}>
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontStyle: "italic" }}>— ยังไม่ได้กำหนด —</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Filter columns
  const activeCol = doctors.filter(d => d.queueCategory === "active" || d.queueCategory === "receiving" || d.queueCategory === "recase");
  const skippedCol = doctors.filter(d => d.queueCategory === "skipped");
  const storyCol = doctors.filter(d => d.queueCategory === "story");
  const inactiveCol = doctors.filter(d => d.queueCategory === "inactive");

  // Day translations for title
  const dayTranslations: Record<string, string> = {
    Monday: "วันจันทร์",
    Tuesday: "วันอังคาร",
    Wednesday: "วันพุธ",
    Thursday: "วันพฤหัสบดี",
    Friday: "วันศุกร์",
    Saturday: "วันเสาร์",
    Sunday: "วันอาทิตย์"
  };

  // Computed: ownership check for toggle button
  const isUserAdmin = session?.user?.role === "admin";
  const isOpOwner = opOpenedBy ? opOpenedBy.email === session?.user?.email : true; // if no opener stored, allow


  return (
    <div className="page-container">
      <header className="page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <HospitalIcon className="text-[var(--accent)]" size={28} /> ระบบจัดการคิวแพทย์ (OP Dashboard)
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              จัดการกลุ่มคิวเข้าเวรของหมอ ประจำ{dayTranslations[currentDay] || currentDay}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "bold",
                color: opActive ? "white" : "var(--text-secondary)",
                background: opActive ? "var(--success)" : "var(--bg-secondary)",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid " + (opActive ? "transparent" : "var(--border)"),
                boxShadow: opActive ? "0 0 8px var(--accent-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {opActive ? (
                <>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} className="animate-pulse" />
                  OP กำลังปฏิบัติงาน
                </>
              ) : (
                <>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                  ปิดปฏิบัติงาน OP
                </>
              )}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", border: "1px solid var(--border)", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckIcon size={14} className="text-emerald-500" /> กำลังบันทึกเบื้องหลัง: {isSavingQueue ? "จัดเก็บ..." : "เรียบร้อย"}
          </span>
          <button
            onClick={handleToggleOpActive}
            disabled={isTogglingActive || (opActive && !isOpOwner && !isUserAdmin)}
            title={opActive && !isOpOwner && !isUserAdmin && opOpenedBy ? `🔒 เฉพาะ ${opOpenedBy.discordUsername || opOpenedBy.email} เท่านั้นที่ปิดเวร OP ได้` : undefined}
            style={{
              padding: "10px 20px",
              background: (opActive && !isOpOwner && !isUserAdmin) ? "var(--bg-secondary)" : opActive ? "var(--danger)" : "var(--success)",
              color: (opActive && !isOpOwner && !isUserAdmin) ? "var(--text-muted)" : "white",
              border: (opActive && !isOpOwner && !isUserAdmin) ? "1px solid var(--border)" : "none",
              borderRadius: "8px",
              cursor: (opActive && !isOpOwner && !isUserAdmin) ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "0.9rem",
              boxShadow: (opActive && !isOpOwner && !isUserAdmin) ? "none" : opActive ? "0 4px 6px rgba(239, 68, 68, 0.25)" : "0 4px 6px color-mix(in srgb, var(--accent) 25%, transparent)",
              transition: "all 0.2s"
            }}
          >
            {isTogglingActive ? (
              "กำลังสลับเวร..."
            ) : (opActive && !isOpOwner && !isUserAdmin) ? (
              <><LockIcon size={16} className="inline mr-1 align-text-top text-amber-500" /> ล็อค — ปิดได้เฉพาะคนเปิด</>
            ) : opActive ? (
              <><PowerIcon size={16} className="inline mr-1 align-text-top" /> ปิดเวร OP</>
            ) : (
              <><PowerIcon size={16} className="inline mr-1 align-text-top" /> เปิดเวร OP</>
            )}
          </button>
          {opActive && (
            <button
              onClick={handleSendToDiscord}
              disabled={isPosting}
              style={{
                padding: "10px 20px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.9rem",
                boxShadow: "0 4px 6px rgba(59, 130, 246, 0.25)",
                transition: "all 0.2s"
              }}
            >
              {isPosting ? "กำลังซิงค์..." : <><span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>ซิงค์ข้อความ Discord <RefreshIcon size={16} /></span></>}
            </button>
          )}
        </div>
      </header>

      {/* Ownership banner: show when OP is active and current user is not the opener */}
      {opActive && opOpenedBy && !isOpOwner && !isUserAdmin && (
        <div style={{
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "0.85rem",
          color: "#f59e0b"
        }}>
          <LockIcon size={20} className="text-amber-500 flex-shrink-0" />
          <span>
            <strong>{opOpenedBy.discordUsername || opOpenedBy.email}</strong> เป็นคนเปิดเวร OP — เฉพาะเขาเท่านั้นที่สามารถปิดเวร OP ได้ คุณยังสามารถจัดการคิวหมอได้ตามปกติค่ะ
          </span>
        </div>
      )}

      {/* Editor warnings */}
      <section className="card" style={{ marginBottom: "24px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <WarningIcon size={16} className="text-amber-500" /> คำเตือน / ประกาศพิเศษ (จะอัปเดตไปที่ดิสคอร์ด)
            </span>
          </h3>
          {opActive && (
            <button
              onClick={handleSaveNotice}
              disabled={isSavingNotice}
              style={{
                padding: "6px 12px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.8rem",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              {isSavingNotice ? "กำลังบันทึก..." : <><SaveIcon size={14} /> บันทึกประกาศ & อัปเดต Discord</>}
            </button>
          )}
        </div>
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="กรอกคำเตือนสำหรับใส่ในหัวข้อประกาศ..."
          style={{
            width: "100%",
            minHeight: "60px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            padding: "10px",
            fontSize: "0.85rem",
            outline: "none",
            resize: "vertical",
            marginTop: "10px"
          }}
        />
      </section>

      {/* Queue columns (only when OP is active) */}
      {opActive && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          
          {/* Column 1: On-duty active */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "active")}
            style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", padding: "16px", display: "flex", flexDirection: "column", minHeight: "450px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--success)", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckIcon size={16} className="text-emerald-500" /> เข้าเวรรับเคส
              </span>
              <span style={{ background: "var(--bg-card)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", color: "var(--text-muted)" }}>
                {activeCol.length}
              </span>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeCol.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem", padding: "20px", textAlign: "center" }}>
                  ไม่มีหมออยู่ในกลุ่มนี้<br/>(ลากการ์ดมาวางที่นี่)
                </div>
              ) : (
                activeCol.map(doc => (
                  <DoctorCard key={doc.email} doctor={doc} onDragStart={handleDragStart} onMove={moveDoctorCategory} />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Skipped */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "skipped")}
            style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", padding: "16px", display: "flex", flexDirection: "column", minHeight: "450px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                <ClockIcon size={16} className="text-amber-500" /> ข้ามเคส / เหม่อ
              </span>
              <span style={{ background: "var(--bg-card)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", color: "var(--text-muted)" }}>
                {skippedCol.length}
              </span>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {skippedCol.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem", padding: "20px", textAlign: "center" }}>
                  ไม่มีหมออยู่ในกลุ่มนี้<br/>(ลากการ์ดมาวางที่นี่)
                </div>
              ) : (
                skippedCol.map(doc => (
                  <DoctorCard key={doc.email} doctor={doc} onDragStart={handleDragStart} onMove={moveDoctorCategory} />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Story */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "story")}
            style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", padding: "16px", display: "flex", flexDirection: "column", minHeight: "450px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#3b82f6", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileTextIcon size={16} className="text-blue-500" /> รายชื่อหมอสตอรี่
              </span>
              <span style={{ background: "var(--bg-card)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", color: "var(--text-muted)" }}>
                {storyCol.length}
              </span>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {storyCol.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem", padding: "20px", textAlign: "center" }}>
                  ไม่มีหมออยู่ในกลุ่มนี้<br/>(ลากการ์ดมาวางที่นี่)
                </div>
              ) : (
                storyCol.map(doc => (
                  <DoctorCard key={doc.email} doctor={doc} onDragStart={handleDragStart} onMove={moveDoctorCategory} />
                ))
              )}
            </div>
          </div>

          {/* Column 4: Inactive Clocked-out */}
          <div
            style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", padding: "16px", display: "flex", flexDirection: "column", minHeight: "450px", opacity: 0.85 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px" }}>
                <PowerIcon size={16} className="text-red-500" /> ออกจากระบบ (ออกเวร)
              </span>
              <span style={{ background: "var(--bg-card)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "10px", color: "var(--text-muted)" }}>
                {inactiveCol.length}
              </span>
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {inactiveCol.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem", padding: "20px", textAlign: "center" }}>
                  ไม่มีแพทย์ออกเวรล่าสุด<br/>(ภายใน 12 ชม.)
                </div>
              ) : (
                inactiveCol.map(doc => (
                  <DoctorCard key={doc.email} doctor={doc} onDragStart={handleDragStart} onMove={moveDoctorCategory} />
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Summary card when OP is closed */}
      {!opActive && doctors.length > 0 && (
        <section className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ClipboardIcon className="text-[var(--accent)]" /> สรุปรายชื่อแพทย์ในรอบเวร OP ที่ผ่านมา
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "20px" }}>
            แสดงรายชื่อแพทย์ที่เข้าเวรและออกเวรในรอบ OP ล่าสุด
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
            {doctors.map(doc => {
              const isCompleted = doc.status === "completed";
              return (
                <div
                  key={doc.email}
                  style={{
                    background: "var(--bg-card)",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${isCompleted ? "var(--border)" : "color-mix(in srgb, var(--accent) 30%, transparent)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    filter: isCompleted ? "grayscale(100%)" : "none",
                    opacity: isCompleted ? 0.55 : 1,
                    transition: "all 0.3s ease",
                  }}
                >
                  {doc.avatarUrl ? (
                    <img src={doc.avatarUrl} alt="" style={{ width: "34px", height: "34px", borderRadius: "50%", border: "1px solid var(--border)", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: isCompleted ? "var(--bg-secondary)" : "color-mix(in srgb, var(--accent) 15%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.9rem",
                      color: isCompleted ? "var(--text-muted)" : "var(--success)",
                      fontWeight: "bold",
                      flexShrink: 0
                    }}>
                      {doc.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{doc.name}</span>
                      <span style={{
                        fontSize: "0.6rem",
                        background: isCompleted ? "var(--bg-secondary)" : "var(--success)",
                        color: isCompleted ? "var(--text-muted)" : "white",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        flexShrink: 0,
                        border: isCompleted ? "1px solid var(--border)" : "none",
                      }}>
                        {isCompleted ? "ออกเวร" : "เข้าเวร"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      @{doc.discordUsername}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weekly OP Schedule Table at the bottom for OP / Admin */}
      <section className="card" style={{ marginTop: "32px", padding: "24px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <ClipboardIcon className="text-[var(--accent)]" /> ตารางเวร OP ประจำสัปดาห์
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
          ตารางแสดงรายชื่อแพทย์ปฏิบัติหน้าที่ OP ประจำวันในสัปดาห์นี้
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600 }}>วัน</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600 }}>แพทย์ OP ประจำวัน</th>
              </tr>
            </thead>
            <tbody>
              {orderedDays.map((day) => {
                const ops = opSchedule[day] || [];
                const isToday = day === currentDay;
                return (
                  <tr key={day} style={{
                    background: isToday ? "rgba(59, 130, 246, 0.08)" : "transparent",
                    transition: "background 0.2s"
                  }}>
                    <td style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: isToday ? "bold" : "normal",
                      color: isToday ? "var(--primary)" : "var(--text-primary)",
                      whiteSpace: "nowrap"
                    }}>
                      {isToday && "👉 "}{scheduleDayTranslations[day]}
                    </td>
                    <td style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      color: ops.length > 0 ? "var(--text-primary)" : "var(--text-muted)"
                    }}>
                      {ops.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {ops.map((name: string) => {
                            const registeredDoc = registeredDoctors.find((d: any) => d.discordUsername === name);
                            const displayName = registeredDoc?.name || name;
                            return (
                              <span key={name} style={{
                                background: isToday ? "var(--primary)" : "var(--bg-secondary)",
                                color: isToday ? "white" : "var(--text-primary)",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "0.82rem",
                                fontWeight: isToday ? 600 : 400,
                                border: isToday ? "none" : "1px solid var(--border)"
                              }}>
                                {displayName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ fontStyle: "italic" }}>— ยังไม่ได้กำหนด —</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

function SkippedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span style={{
      fontSize: "0.65rem",
      fontFamily: "monospace",
      background: "rgba(245, 158, 11, 0.15)",
      color: "#f59e0b",
      padding: "1px 6px",
      borderRadius: "4px",
      fontWeight: "bold",
      letterSpacing: "0.5px"
    }}>
      <span className="inline-flex items-center gap-1">
        <ClockIcon size={10} className="text-amber-500" />
        {hours > 0 ? `${pad(hours)}:` : ''}{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

interface DoctorCardProps {
  doctor: DoctorEntry;
  onDragStart: (e: React.DragEvent, email: string) => void;
  onMove: (email: string, category: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive") => void;
}

function DoctorCard({ doctor, onDragStart, onMove }: DoctorCardProps) {
  const isDraggable = doctor.status === "active";
  
  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, doctor.email)}
      style={{
        background: "var(--bg-card)",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid var(--border-subtle)",
        cursor: isDraggable ? "grab" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        userSelect: "none",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        transition: "transform 0.2s, border-color 0.2s"
      }}
      onMouseOver={e => {
        if (isDraggable) e.currentTarget.style.borderColor = "var(--primary)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
        {doctor.avatarUrl ? (
          <img src={doctor.avatarUrl} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: "var(--text-secondary)", flexShrink: 0 }}>
            {doctor.name.charAt(0)}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{doctor.name}</span>
            {doctor.queueCategory === "receiving" && (
              <span className="animate-pulse" style={{
                fontSize: "0.6rem",
                background: "var(--success)",
                color: "white",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: "bold",
                flexShrink: 0,
                boxShadow: "0 0 6px var(--accent-glow)"
              }}>
                รับเคส
              </span>
            )}
            {doctor.queueCategory === "recase" && (
              <span className="animate-pulse" style={{
                fontSize: "0.6rem",
                background: "#f59e0b",
                color: "white",
                padding: "1px 5px",
                borderRadius: "3px",
                fontWeight: "bold",
                flexShrink: 0,
                boxShadow: "0 0 6px rgba(245, 158, 11, 0.4)"
              }}>
                Re-Case
              </span>
            )}
            {doctor.queueCategory === "skipped" && doctor.skippedAt && (
              <SkippedTimer startTime={doctor.skippedAt} />
            )}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            @{doctor.discordUsername}
          </div>
        </div>
      </div>

      {/* 4 Small Buttons next to the name for active doctors */}
      {isDraggable && (
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {/* Button 1: รับเคส / คืนคิว — ซ่อนเมื่ออยู่ในคอลัมน์เหม่อหรือสตอรี่ */}
          {doctor.queueCategory !== "skipped" && doctor.queueCategory !== "story" && (
            doctor.queueCategory !== "receiving" ? (
              <button
                onClick={() => onMove(doctor.email, "receiving")}
                title="รับเคส"
                style={{
                  width: "28px",
                  height: "28px",
                  background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.9rem",
                  transition: "all 0.15s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 25%, transparent)"}
                onMouseOut={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"}
              >
                <CheckIcon size={14} className="text-emerald-500" />
              </button>
            ) : (
              <button
                onClick={() => onMove(doctor.email, "active")}
                title="คืนคิวปกติ"
                style={{
                  width: "28px",
                  height: "28px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  transition: "all 0.15s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
              >
                <ReturnIcon size={14} className="text-red-500" />
              </button>
            )
          )}

          {/* Button 2: Re-Case / คืนคิว — ซ่อนเมื่ออยู่ในคอลัมน์เหม่อหรือสตอรี่ */}
          {doctor.queueCategory !== "skipped" && doctor.queueCategory !== "story" && (
            doctor.queueCategory !== "recase" ? (
            <button
              onClick={() => onMove(doctor.email, "recase")}
              title="Re-Case"
              style={{
                width: "28px",
                height: "28px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                transition: "all 0.15s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.1)"}
            >
              <RefreshIcon size={14} className="text-amber-500" />
            </button>
          ) : (
            <button
              onClick={() => onMove(doctor.email, "active")}
              title="คืนคิวปกติ"
              style={{
                width: "28px",
                height: "28px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                transition: "all 0.15s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
              onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
            >
              <ReturnIcon size={14} className="text-red-500" />
            </button>
            )
          )}

          {/* Button 3: คืนคิวปกติสำหรับหมอที่อยู่ในกลุ่มเหม่อ */}
          {doctor.queueCategory === "skipped" && (
            <button
              onClick={() => onMove(doctor.email, "active")}
              title="คืนคิวปกติ"
              style={{
                width: "28px",
                height: "28px",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                transition: "all 0.15s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 25%, transparent)"}
              onMouseOut={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"}
            >
              <CheckIcon size={14} className="text-emerald-500" />
            </button>
          )}

          {/* Button 4: คืนคิวปกติสำหรับหมอที่อยู่ในกลุ่มสตอรี่ */}
          {doctor.queueCategory === "story" && (
            <button
              onClick={() => onMove(doctor.email, "active")}
              title="คืนคิวปกติ"
              style={{
                width: "28px",
                height: "28px",
                background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                transition: "all 0.15s"
              }}
              onMouseOver={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 25%, transparent)"}
              onMouseOut={e => e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"}
            >
              <CheckIcon size={14} className="text-emerald-500" />
            </button>
          )}

        </div>
      )}
    </div>
  );
}
