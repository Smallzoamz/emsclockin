"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  clockIn?: string;
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
  
  // Case counts: { [email]: { cases: number, recases: number } }
  const [opCaseCounts, setOpCaseCounts] = useState<Record<string, { cases: number; recases: number }>>({});
  
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
      setOpCaseCounts(data.opCaseCounts || {});
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

      // Pre-process active shifts to find active mentors and students
      const activeEmails = new Set<string>(data.activeShifts?.map((s: any) => s.user_email).filter(Boolean) || []);
      const activeMentors = data.activeMentors || []; // status = 'active'
      
      const getActiveMentorOf = (studentEmail: string) => {
        return activeMentors.find((r: any) => r.student_email === studentEmail && activeEmails.has(r.mentor_email));
      };

      const getActiveStudentsOf = (mentorEmail: string) => {
        return activeMentors.filter((r: any) => r.mentor_email === mentorEmail && activeEmails.has(r.student_email));
      };

      // 1. Active doctors (clocked in)
      if (data.activeShifts) {
        data.activeShifts.forEach((shift: any) => {
          const email = shift.user_email;
          if (!email || addedEmails.has(email)) return;
          
          const registered = data.registeredDoctors?.find((d: any) => d.email === email);
          const baseName = registered?.name || shift.user_name || "Unknown Doctor";
          
          const relationAsStudent = getActiveMentorOf(email);
          const activeStudents = getActiveStudentsOf(email);
          const generalRelationAsStudent = activeMentors.find((r: any) => r.student_email === email);

          if (activeStudents.length > 0) {
            // Mentor has active clocked-in students, so we skip adding them as a standalone card.
            return;
          }

          let name = baseName;
          if (relationAsStudent) {
            name = `${relationAsStudent.mentor_name} + ${baseName}`;
          } else if (generalRelationAsStudent) {
            name = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
          }

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
            skippedAt,
            clockIn: shift.clock_in
          });
          addedEmails.add(email);
        });
      }

      // 2. Inactive doctors (clocked out recently)
      if (data.recentShifts) {
        data.recentShifts.forEach((shift: any) => {
          const email = shift.user_email;
          if (!email || addedEmails.has(email)) return;
          
          const registered = data.registeredDoctors?.find((d: any) => d.email === email);
          const baseName = registered?.name || shift.user_name || "Unknown Doctor";
          
          const relationAsStudent = getActiveMentorOf(email);
          const activeStudents = getActiveStudentsOf(email);
          const generalRelationAsStudent = activeMentors.find((r: any) => r.student_email === email);

          if (activeStudents.length > 0) {
            // Skip standalone mentor card if they have clocked-in students
            return;
          }

          let name = baseName;
          if (relationAsStudent) {
            name = `${relationAsStudent.mentor_name} + ${baseName}`;
          } else if (generalRelationAsStudent) {
            name = `${baseName} (พี่เลี้ยง: ${generalRelationAsStudent.mentor_name} - นอกเวร)`;
          }

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
    const targetDoc = doctors.find(d => d.email === email);
    if (!targetDoc || targetDoc.status !== "active") return;
    moveDoctorCategory(email, targetCategory);
  };

  const saveCaseCountsToServer = async (nextCaseCounts: Record<string, { cases: number; recases: number }>, nextQueueState: Record<string, string>) => {
    setIsSavingQueue(true);
    try {
      const res = await fetch("/api/op/update-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opQueueState: nextQueueState, opCaseCounts: nextCaseCounts })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "บันทึกข้อมูลไม่สำเร็จ");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกสถานะคิว");
      fetchOpData(session);
    } finally {
      setIsSavingQueue(false);
    }
  };

  const moveDoctorCategory = async (email: string, category: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive") => {
    if (category === "inactive") return;

    const skippedAt = category === "skipped" ? Date.now() : undefined;
    let nextCaseCounts = { ...opCaseCounts };
    let localDocs = [...doctors];

    // ── New logic: credit the PREVIOUS "receiving" doctor when a NEW doctor starts receiving ──
    // A completed case = doctor was "receiving" and was NOT re-cased, then the next doctor starts receiving.
    if (category === "receiving") {
      const prevReceiver = localDocs.find(d => d.queueCategory === "receiving" && d.email !== email);
      if (prevReceiver) {
        // Previous receiver completed their case successfully → +1 case, return to active
        const curr = nextCaseCounts[prevReceiver.email] || { cases: 0, recases: 0 };
        nextCaseCounts[prevReceiver.email] = { ...curr, cases: curr.cases + 1 };
        localDocs = localDocs.map(d => d.email === prevReceiver.email ? { ...d, queueCategory: "active" as const } : d);
      }
    }

    // ── Re-case: doctor was receiving but case is being re-assigned → +1 recase ──
    if (category === "recase") {
      const prevDoc = localDocs.find(d => d.email === email);
      if (prevDoc && prevDoc.queueCategory !== "recase") {
        const curr = nextCaseCounts[email] || { cases: 0, recases: 0 };
        nextCaseCounts[email] = { ...curr, recases: curr.recases + 1 };
      }
    }

    // Update the target doctor's category
    localDocs = localDocs.map(d => {
      if (d.email === email) {
        return { ...d, queueCategory: category, skippedAt };
      }
      return d;
    });
    setDoctors(localDocs);
    setOpCaseCounts(nextCaseCounts);

    // Build queue state from the updated local doctors list
    const nextQueueState: Record<string, string> = {};
    for (const d of localDocs) {
      if (d.queueCategory === "skipped") {
        nextQueueState[d.email] = `skipped:${d.skippedAt || Date.now()}`;
      } else {
        nextQueueState[d.email] = d.queueCategory;
      }
    }
    setOpQueueState(nextQueueState);

    await saveCaseCountsToServer(nextCaseCounts, nextQueueState);
  };

  const adjustCaseCount = async (email: string, type: "cases" | "recases", delta: number) => {
    const curr = opCaseCounts[email] || { cases: 0, recases: 0 };
    const newVal = Math.max(0, curr[type] + delta);
    const nextCaseCounts = { ...opCaseCounts, [email]: { ...curr, [type]: newVal } };
    setOpCaseCounts(nextCaseCounts);
    await saveCaseCountsToServer(nextCaseCounts, opQueueState);
  };

  // Post Queue report to Discord Webhook
  const handleSendToDiscord = async () => {
    setIsPosting(true);
    
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
          <ScheduleTable
            orderedDays={orderedDays}
            opSchedule={opSchedule}
            currentDay={currentDay}
            scheduleDayTranslations={scheduleDayTranslations}
            registeredDoctors={registeredDoctors}
          />
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
    Monday: "วันจันทร์", Tuesday: "วันอังคาร", Wednesday: "วันพุธ",
    Thursday: "วันพฤหัสบดี", Friday: "วันศุกร์", Saturday: "วันเสาร์", Sunday: "วันอาทิตย์"
  };

  const isUserAdmin = session?.user?.role === "admin";
  const isOpOwner = opOpenedBy ? opOpenedBy.email === session?.user?.email : true;

  // Stats for the top cards
  const stats = [
    { label: "เข้าเวรรับเคส", count: activeCol.length, color: "var(--success)", icon: <CheckIcon size={18} /> },
    { label: "พักเวร / เหม่อ", count: skippedCol.length, color: "#f59e0b", icon: <ClockIcon size={18} /> },
    { label: "หมอสตอรี่", count: storyCol.length, color: "#3b82f6", icon: <FileTextIcon size={18} /> },
    { label: "ออกเวรแล้ว", count: inactiveCol.length, color: "var(--danger)", icon: <PowerIcon size={18} /> }
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "1.35rem" }}>
            <HospitalIcon className="text-[var(--accent)]" size={26} /> ระบบจัดการคิวแพทย์ OP
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              ประจำ{dayTranslations[currentDay] || currentDay}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: opActive ? "white" : "var(--text-secondary)",
                background: opActive ? "var(--success)" : "var(--bg-secondary)",
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${opActive ? "transparent" : "var(--border-subtle)"}`,
                boxShadow: opActive ? "0 0 8px var(--accent-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span style={{
                display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
                background: opActive ? "#10b981" : "#ef4444",
                boxShadow: opActive ? "0 0 6px rgba(16,185,129,0.6)" : "none"
              }} className={opActive ? "animate-pulse" : ""} />
              {opActive ? "OP กำลังปฏิบัติงาน" : "ปิดปฏิบัติงาน OP"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            background: "var(--bg-secondary)", padding: "5px 12px", borderRadius: "var(--radius-full)",
            fontSize: "0.78rem", border: "1px solid var(--border-subtle)", color: "var(--text-muted)",
            display: "inline-flex", alignItems: "center", gap: "4px"
          }}>
            <CheckIcon size={12} className="text-emerald-500" /> {isSavingQueue ? "บันทึก..." : "ซิงค์แล้ว"}
          </span>
          <button
            onClick={handleToggleOpActive}
            disabled={isTogglingActive || (opActive && !isOpOwner && !isUserAdmin)}
            title={opActive && !isOpOwner && !isUserAdmin && opOpenedBy ? `🔒 เฉพาะ ${opOpenedBy.discordUsername || opOpenedBy.email} เท่านั้นที่ปิดเวร OP ได้` : undefined}
            style={{
              padding: "8px 18px",
              background: (opActive && !isOpOwner && !isUserAdmin) ? "var(--bg-secondary)" : opActive ? "var(--danger)" : "var(--success)",
              color: (opActive && !isOpOwner && !isUserAdmin) ? "var(--text-muted)" : "white",
              border: (opActive && !isOpOwner && !isUserAdmin) ? "1px solid var(--border-subtle)" : "none",
              borderRadius: "var(--radius-sm)",
              cursor: (opActive && !isOpOwner && !isUserAdmin) ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "0.82rem",
              transition: "all 0.2s"
            }}
          >
            {isTogglingActive ? "กำลังสลับเวร..." :
              (opActive && !isOpOwner && !isUserAdmin) ? <><LockIcon size={14} className="inline mr-1 align-text-top text-amber-500" /> ล็อค</> :
              opActive ? <><PowerIcon size={14} className="inline mr-1 align-text-top" /> ปิดเวร OP</> :
              <><PowerIcon size={14} className="inline mr-1 align-text-top" /> เปิดเวร OP</>
            }
          </button>
          {opActive && (
            <button
              onClick={handleSendToDiscord}
              disabled={isPosting}
              style={{
                padding: "8px 18px", background: "var(--primary)", color: "white",
                border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                fontWeight: 600, fontSize: "0.82rem", transition: "all 0.2s"
              }}
            >
              {isPosting ? "ซิงค์..." : <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>ซิงค์ Discord <RefreshIcon size={14} /></span>}
            </button>
          )}
        </div>
      </header>

      {/* Ownership banner */}
      {opActive && opOpenedBy && !isOpOwner && !isUserAdmin && (
        <div style={{
          background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "var(--radius-md)", padding: "10px 16px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem", color: "#f59e0b"
        }}>
          <LockIcon size={18} className="text-amber-500 flex-shrink-0" />
          <span>
            <strong>{opOpenedBy.discordUsername || opOpenedBy.email}</strong> เป็นคนเปิดเวร OP (เฉพาะเขาเท่านั้นที่สามารถปิดเวร OP ได้ คุณยังสามารถจัดการคิวหมอได้ตามปกติค่ะ)
          </span>
        </div>
      )}

      {/* Stats Row */}
      {opActive && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "12px",
              transition: "border-color 0.2s"
            }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "var(--radius-sm)",
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color, flexShrink: 0
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>{s.count}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content: 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: opActive ? "1fr 320px" : "1fr", gap: "20px" }}>
        {/* LEFT: Queue Columns or Summary */}
        <div>
          {opActive ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              {/* Column 1: On-duty active */}
              <QueueColumn
                title="เข้าเวรรับเคส"
                titleColor="var(--success)"
                icon={<CheckIcon size={15} className="text-emerald-500" />}
                count={activeCol.length}
                doctors={activeCol}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "active")}
                onDragStart={handleDragStart}
                onMove={moveDoctorCategory}
                opCaseCounts={opCaseCounts}
                onAdjustCase={adjustCaseCount}
              />
              {/* Column 2: Skipped */}
              <QueueColumn
                title="ข้ามเคส / เหม่อ"
                titleColor="#f59e0b"
                icon={<ClockIcon size={15} className="text-amber-500" />}
                count={skippedCol.length}
                doctors={skippedCol}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "skipped")}
                onDragStart={handleDragStart}
                onMove={moveDoctorCategory}
                opCaseCounts={opCaseCounts}
                onAdjustCase={adjustCaseCount}
              />
              {/* Column 3: Story */}
              <QueueColumn
                title="รายชื่อหมอสตอรี่"
                titleColor="#3b82f6"
                icon={<FileTextIcon size={15} className="text-blue-500" />}
                count={storyCol.length}
                doctors={storyCol}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "story")}
                onDragStart={handleDragStart}
                onMove={moveDoctorCategory}
                opCaseCounts={opCaseCounts}
                onAdjustCase={adjustCaseCount}
              />
              {/* Column 4: Inactive */}
              <QueueColumn
                title="ออกจากระบบ (ออกเวร)"
                titleColor="var(--danger)"
                icon={<PowerIcon size={15} className="text-red-500" />}
                count={inactiveCol.length}
                doctors={inactiveCol}
                onDragStart={handleDragStart}
                onMove={moveDoctorCategory}
                opCaseCounts={opCaseCounts}
                onAdjustCase={adjustCaseCount}
                inactive
              />
            </div>
          ) : doctors.length > 0 ? (
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
                    <div key={doc.email} style={{
                      background: "var(--bg-card)", padding: "12px 14px", borderRadius: "var(--radius-md)",
                      border: `1px solid ${isCompleted ? "var(--border-subtle)" : "color-mix(in srgb, var(--accent) 30%, transparent)"}`,
                      display: "flex", alignItems: "center", gap: "10px",
                      filter: isCompleted ? "grayscale(100%)" : "none",
                      opacity: isCompleted ? 0.55 : 1, transition: "all 0.3s ease"
                    }}>
                      {doc.avatarUrl ? (
                        <img src={doc.avatarUrl} alt="" style={{ width: "34px", height: "34px", borderRadius: "50%", border: "1px solid var(--border-subtle)", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%",
                          background: isCompleted ? "var(--bg-secondary)" : "color-mix(in srgb, var(--accent) 15%, transparent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.9rem", color: isCompleted ? "var(--text-muted)" : "var(--success)",
                          fontWeight: "bold", flexShrink: 0 }}>
                          {doc.name.charAt(0)}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{doc.name}</span>
                          <span style={{
                            fontSize: "0.6rem", background: isCompleted ? "var(--bg-secondary)" : "var(--success)",
                            color: isCompleted ? "var(--text-muted)" : "white", padding: "1px 6px", borderRadius: "4px",
                            fontWeight: "bold", flexShrink: 0, border: isCompleted ? "1px solid var(--border-subtle)" : "none"
                          }}>
                            {isCompleted ? "ออกเวร" : "เข้าเวร"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{doc.discordUsername}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Schedule table shown below on non-active OR mobile */}
          {!opActive && (
            <section className="card" style={{ marginTop: "20px", padding: "24px" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardIcon className="text-[var(--accent)]" /> ตารางเวร OP ประจำสัปดาห์
              </h3>
              <ScheduleTable
                orderedDays={orderedDays}
                opSchedule={opSchedule}
                currentDay={currentDay}
                scheduleDayTranslations={scheduleDayTranslations}
                registeredDoctors={registeredDoctors}
              />
            </section>
          )}
        </div>

        {/* RIGHT: Side Panel (only when OP active) */}
        {opActive && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Notice / Warning */}
            <section style={{
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ fontSize: "0.82rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  <WarningIcon size={14} className="text-amber-500" /> ประกาศ / คำเตือน
                </h4>
                <button
                  onClick={handleSaveNotice}
                  disabled={isSavingNotice}
                  style={{
                    padding: "4px 10px", background: "var(--primary)", color: "white",
                    border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
                    fontWeight: 600, fontSize: "0.7rem", transition: "all 0.2s",
                    display: "inline-flex", alignItems: "center", gap: "4px"
                  }}
                >
                  {isSavingNotice ? "..." : <><SaveIcon size={12} /> บันทึก</>}
                </button>
              </div>
              <textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder="กรอกคำเตือน..."
                style={{
                  width: "100%", minHeight: "60px", background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)", padding: "8px 10px", fontSize: "0.78rem",
                  outline: "none", resize: "vertical"
                }}
              />
            </section>

            {/* Weekly Schedule */}
            <section style={{
              background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "16px", flex: 1
            }}>
              <h4 style={{ fontSize: "0.82rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                <ClipboardIcon size={14} className="text-[var(--accent)]" /> ตารางเวร OP
              </h4>
              <ScheduleTable
                orderedDays={orderedDays}
                opSchedule={opSchedule}
                currentDay={currentDay}
                scheduleDayTranslations={scheduleDayTranslations}
                registeredDoctors={registeredDoctors}
                compact
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Schedule Table Component ==========
function ScheduleTable({ orderedDays, opSchedule, currentDay, scheduleDayTranslations, registeredDoctors, compact }: {
  orderedDays: string[];
  opSchedule: Record<string, string[]>;
  currentDay: string;
  scheduleDayTranslations: Record<string, string>;
  registeredDoctors: any[];
  compact?: boolean;
}) {
  const fontSize = compact ? "0.78rem" : "0.9rem";
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: compact ? "6px 8px" : "10px 12px", borderBottom: "2px solid var(--border-subtle)", color: "var(--text-secondary)", fontWeight: 600 }}>วัน</th>
            <th style={{ textAlign: "left", padding: compact ? "6px 8px" : "10px 12px", borderBottom: "2px solid var(--border-subtle)", color: "var(--text-secondary)", fontWeight: 600 }}>แพทย์ OP</th>
          </tr>
        </thead>
        <tbody>
          {orderedDays.map((day) => {
            const ops = opSchedule[day] || [];
            const isToday = day === currentDay;
            return (
              <tr key={day} style={{ background: isToday ? "rgba(59, 130, 246, 0.08)" : "transparent", transition: "background 0.2s" }}>
                <td style={{
                  padding: compact ? "6px 8px" : "10px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontWeight: isToday ? "bold" : "normal",
                  color: isToday ? "var(--primary)" : "var(--text-primary)",
                  whiteSpace: "nowrap", fontSize: compact ? "0.75rem" : undefined
                }}>
                  {isToday && "👉 "}{scheduleDayTranslations[day]}
                </td>
                <td style={{
                  padding: compact ? "6px 8px" : "10px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: ops.length > 0 ? "var(--text-primary)" : "var(--text-muted)"
                }}>
                  {ops.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {ops.map((name: string) => {
                        const registeredDoc = registeredDoctors.find((d: any) => d.discordUsername === name);
                        const displayName = registeredDoc?.name || name;
                        return (
                          <span key={name} style={{
                            background: isToday ? "var(--primary)" : "var(--bg-secondary)",
                            color: isToday ? "white" : "var(--text-primary)",
                            padding: compact ? "1px 7px" : "3px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: compact ? "0.68rem" : "0.82rem",
                            fontWeight: isToday ? 600 : 400,
                            border: isToday ? "none" : "1px solid var(--border-subtle)"
                          }}>
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ fontStyle: "italic", fontSize: compact ? "0.7rem" : undefined }}>(ยังไม่กำหนด)</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ========== Queue Column Component ==========
interface QueueColumnProps {
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  count: number;
  doctors: DoctorEntry[];
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, email: string) => void;
  onMove: (email: string, category: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive") => void;
  opCaseCounts: Record<string, { cases: number; recases: number }>;
  onAdjustCase: (email: string, type: "cases" | "recases", delta: number) => void;
  inactive?: boolean;
}

function QueueColumn({ title, titleColor, icon, count, doctors, onDragOver, onDrop, onDragStart, onMove, opCaseCounts, onAdjustCase, inactive }: QueueColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        background: "var(--bg-secondary)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)", padding: "14px",
        display: "flex", flexDirection: "column", minHeight: "380px",
        opacity: inactive ? 0.8 : 1
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: titleColor, display: "flex", alignItems: "center", gap: "5px" }}>
          {icon} {title}
        </span>
        <span style={{ background: "var(--bg-card)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "var(--radius-full)", color: "var(--text-muted)" }}>
          {count}
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {doctors.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.75rem", padding: "16px", textAlign: "center" }}>
            ไม่มีหมอในกลุ่มนี้<br/>(ลากการ์ดมาวางที่นี่)
          </div>
        ) : (
          doctors.map(doc => (
            <DoctorCard
              key={doc.email}
              doctor={doc}
              onDragStart={onDragStart}
              onMove={onMove}
              caseCounts={opCaseCounts[doc.email] || { cases: 0, recases: 0 }}
              onAdjustCase={onAdjustCase}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ========== Skipped Timer ==========
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
      fontSize: "0.62rem", fontFamily: "var(--font-mono)",
      background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b",
      padding: "1px 6px", borderRadius: "4px", fontWeight: 600, letterSpacing: "0.5px"
    }}>
      <span className="inline-flex items-center gap-1">
        <ClockIcon size={9} className="text-amber-500" />
        {hours > 0 ? `${pad(hours)}:` : ''}{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

// ========== Shift Duration Timer ==========
function ShiftDurationTimer({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const clockInTime = new Date(clockIn).getTime();
    setElapsed(Math.floor((Date.now() - clockInTime) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - clockInTime) / 1000));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [clockIn]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  let display = "";
  if (hours > 0) {
    display = `${hours} ชม. ${minutes} นาที`;
  } else {
    display = `${minutes} นาที`;
  }

  return (
    <span style={{
      fontSize: "0.6rem", fontFamily: "var(--font-mono)",
      background: "color-mix(in srgb, var(--accent) 10%, transparent)",
      color: "var(--accent-light)", padding: "1px 6px", borderRadius: "4px",
      fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "3px"
    }}>
      ⏱️ {display}
    </span>
  );
}

// ========== Doctor Card ==========
interface DoctorCardProps {
  doctor: DoctorEntry;
  onDragStart: (e: React.DragEvent, email: string) => void;
  onMove: (email: string, category: "active" | "receiving" | "recase" | "skipped" | "story" | "inactive") => void;
  caseCounts: { cases: number; recases: number };
  onAdjustCase: (email: string, type: "cases" | "recases", delta: number) => void;
}

function DoctorCard({ doctor, onDragStart, onMove, caseCounts, onAdjustCase }: DoctorCardProps) {
  const isDraggable = doctor.status === "active";

  const tinyBtnStyle = (bg: string, border: string): React.CSSProperties => ({
    width: "20px", height: "20px", borderRadius: "4px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.7rem", fontWeight: 700, transition: "all 0.15s",
    background: bg, border: `1px solid ${border}`, color: "var(--text-secondary)",
    lineHeight: 1, padding: 0
  });

  const actionBtnStyle = (bg: string, border: string): React.CSSProperties => ({
    width: "26px", height: "26px", background: bg, border: `1px solid ${border}`,
    borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "0.85rem", transition: "all 0.15s"
  });
  
  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, doctor.email)}
      style={{
        background: "var(--bg-card)", padding: "10px 12px", borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-subtle)", cursor: isDraggable ? "grab" : "default",
        display: "flex", flexDirection: "column", gap: "6px",
        userSelect: "none", transition: "border-color 0.2s"
      }}
      onMouseOver={e => { if (isDraggable) e.currentTarget.style.borderColor = "var(--primary)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      {/* Row 1: Avatar + Name + Status Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {doctor.avatarUrl ? (
          <img src={doctor.avatarUrl} alt="" style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid var(--border-subtle)", flexShrink: 0 }} />
        ) : (
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: "var(--text-secondary)", flexShrink: 0 }}>
            {doctor.name.charAt(0)}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{doctor.name}</span>
            {doctor.queueCategory === "receiving" && (
              <span className="animate-pulse" style={{ fontSize: "0.58rem", background: "var(--success)", color: "white", padding: "1px 5px", borderRadius: "3px", fontWeight: 700, flexShrink: 0, boxShadow: "0 0 6px var(--accent-glow)" }}>รับเคส</span>
            )}
            {doctor.queueCategory === "recase" && (
              <span className="animate-pulse" style={{ fontSize: "0.58rem", background: "#f59e0b", color: "white", padding: "1px 5px", borderRadius: "3px", fontWeight: 700, flexShrink: 0, boxShadow: "0 0 6px rgba(245, 158, 11, 0.4)" }}>Re-Case</span>
            )}
            {doctor.queueCategory === "skipped" && doctor.skippedAt && (
              <SkippedTimer startTime={doctor.skippedAt} />
            )}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "1px" }}>
            <span>@{doctor.discordUsername}</span>
            {doctor.clockIn && doctor.status === "active" && <ShiftDurationTimer clockIn={doctor.clockIn} />}
          </div>
        </div>
      </div>

      {/* Row 2: Case Counts + Action Buttons */}
      {isDraggable && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginTop: "2px" }}>
          {/* Case counters */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Cases */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={() => onAdjustCase(doctor.email, "cases", -1)} style={tinyBtnStyle("rgba(239,68,68,0.08)", "rgba(239,68,68,0.15)")}>-</button>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--success)", fontWeight: 600, minWidth: "28px", textAlign: "center" }}>
                🟢 {caseCounts.cases}
              </span>
              <button onClick={() => onAdjustCase(doctor.email, "cases", 1)} style={tinyBtnStyle("rgba(16,185,129,0.08)", "rgba(16,185,129,0.15)")}>+</button>
            </div>
            {/* Re-cases */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button onClick={() => onAdjustCase(doctor.email, "recases", -1)} style={tinyBtnStyle("rgba(239,68,68,0.08)", "rgba(239,68,68,0.15)")}>-</button>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#f59e0b", fontWeight: 600, minWidth: "28px", textAlign: "center" }}>
                🟡 {caseCounts.recases}
              </span>
              <button onClick={() => onAdjustCase(doctor.email, "recases", 1)} style={tinyBtnStyle("rgba(245,158,11,0.08)", "rgba(245,158,11,0.15)")}>+</button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
            {doctor.queueCategory !== "skipped" && doctor.queueCategory !== "story" && (
              doctor.queueCategory !== "receiving" ? (
                <button onClick={() => onMove(doctor.email, "receiving")} title="รับเคส" style={actionBtnStyle("color-mix(in srgb, var(--accent) 10%, transparent)", "color-mix(in srgb, var(--accent) 20%, transparent)")}>
                  <CheckIcon size={13} className="text-emerald-500" />
                </button>
              ) : (
                <button onClick={() => onMove(doctor.email, "active")} title="คืนคิวปกติ" style={actionBtnStyle("rgba(239, 68, 68, 0.1)", "rgba(239, 68, 68, 0.2)")}>
                  <ReturnIcon size={13} className="text-red-500" />
                </button>
              )
            )}

            {doctor.queueCategory !== "skipped" && doctor.queueCategory !== "story" && (
              doctor.queueCategory !== "recase" ? (
                <button onClick={() => onMove(doctor.email, "recase")} title="Re-Case" style={actionBtnStyle("rgba(245, 158, 11, 0.1)", "rgba(245, 158, 11, 0.2)")}>
                  <RefreshIcon size={13} className="text-amber-500" />
                </button>
              ) : (
                <button onClick={() => onMove(doctor.email, "active")} title="คืนคิวปกติ" style={actionBtnStyle("rgba(239, 68, 68, 0.1)", "rgba(239, 68, 68, 0.2)")}>
                  <ReturnIcon size={13} className="text-red-500" />
                </button>
              )
            )}

            {(doctor.queueCategory === "skipped" || doctor.queueCategory === "story") && (
              <button onClick={() => onMove(doctor.email, "active")} title="คืนคิวปกติ" style={actionBtnStyle("color-mix(in srgb, var(--accent) 10%, transparent)", "color-mix(in srgb, var(--accent) 20%, transparent)")}>
                <CheckIcon size={13} className="text-emerald-500" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
