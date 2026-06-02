"use client";

import { useEffect, useState, useRef } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatThaiDate } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  CrownIcon,
  SettingsIcon,
  SaveIcon,
  CheckIcon,
  UsersIcon,
  ClockIcon,
  WarningIcon,
  MegaphoneIcon,
  InfoIcon
} from "@/components/Icons";

interface MentorSettings {
  intern_rank_id: string;
  mentor_min_hours: number;
  acceptance_bonus: number;
  completion_bonus: number;
  max_mentees: number;
  discord_webhook_url: string;
  message_template: string;
}

interface MentorshipRelation {
  id: string;
  mentor_email: string;
  student_email: string;
  mentor_name: string;
  student_name: string;
  started_at: string;
  status: "active" | "completed" | "cancelled";
  cancelled_at: string | null;
  completed_at: string | null;
}

interface DoctorRank {
  id: string;
  name: string;
  rate: number;
}

export default function AdminMentorPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings Form State
  const [internRankId, setInternRankId] = useState("");
  const [mentorMinHours, setMentorMinHours] = useState(6);
  const [acceptanceBonus, setAcceptanceBonus] = useState(5000);
  const [completionBonus, setCompletionBonus] = useState(10000);
  const [maxMentees, setMaxMentees] = useState(2);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("แพทย์ [ชื่อพี่เลี้ยง] ได้รับนักเรียนแพทย์ [ชื่อน้องเลี้ยง] เป็นน้องเลี้ยงเรียบร้อยแล้ว!");
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ranks & Doctors lists (loaded from settings)
  const [doctorRanks, setDoctorRanks] = useState<DoctorRank[]>([]);

  // Relations History State
  const [relations, setRelations] = useState<MentorshipRelation[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchSettingsAndRelations = async () => {
    try {
      const [settingsRes, relationsRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/mentor/relations")
      ]);

      const settingsData = await settingsRes.json();
      const relationsData = await relationsRes.json();

      if (settingsData.settings) {
        if (settingsData.settings.doctor_ranks) {
          setDoctorRanks(settingsData.settings.doctor_ranks);
        }
        
        const mSettings = settingsData.settings.mentorship_settings || {};
        setInternRankId(mSettings.intern_rank_id || "");
        setMentorMinHours(mSettings.mentor_min_hours !== undefined ? Number(mSettings.mentor_min_hours) : 6);
        setAcceptanceBonus(mSettings.acceptance_bonus !== undefined ? Number(mSettings.acceptance_bonus) : 5000);
        setCompletionBonus(mSettings.completion_bonus !== undefined ? Number(mSettings.completion_bonus) : 10000);
        setMaxMentees(mSettings.max_mentees !== undefined ? Number(mSettings.max_mentees) : 2);
        setDiscordWebhookUrl(mSettings.discord_webhook_url || "");
        if (mSettings.message_template) {
          setMessageTemplate(mSettings.message_template);
        }
      }

      if (relationsData.relations) {
        setRelations(relationsData.relations);
      } else if (relationsData.error) {
        setError(relationsData.error);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load settings or relations:", err);
      setError("ไม่สามารถเชื่อมต่อข้อมูลระบบได้ค่ะ (กรุณาตั้งค่าตารางฐานข้อมูลและสิทธิ์ให้เรียบร้อย)");
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "ตั้งค่าระบบพี่เลี้ยง | EMS Clock-in";
    getSession().then((session) => {
      const user = session?.user as any;
      if (!user || user.role !== "admin") {
        router.replace("/dashboard");
      } else {
        fetchSettingsAndRelations();
      }
    });
  }, [router]);

  const insertPlaceholder = (placeholder: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = messageTemplate;
    const newText = text.substring(0, startPos) + placeholder + text.substring(endPos);
    
    setMessageTemplate(newText);
    
    // Set focus back and adjust cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const settingsPayload: MentorSettings = {
        intern_rank_id: internRankId,
        mentor_min_hours: Number(mentorMinHours),
        acceptance_bonus: Number(acceptanceBonus),
        completion_bonus: Number(completionBonus),
        max_mentees: Number(maxMentees),
        discord_webhook_url: discordWebhookUrl,
        message_template: messageTemplate
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "mentorship_settings",
          value: settingsPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกการตั้งค่าไม่สำเร็จ");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert("💾 บันทึกการตั้งค่าระบบพี่เลี้ยงเรียบร้อยแล้วค่ะ!");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner" />;
  }

  // Filter relations list
  const filteredRelations = relations.filter(r => {
    // 1. Status Filter
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    
    // 2. Search Query Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const mentorMatch = r.mentor_name?.toLowerCase().includes(query) || r.mentor_email?.toLowerCase().includes(query);
      const studentMatch = r.student_name?.toLowerCase().includes(query) || r.student_email?.toLowerCase().includes(query);
      return mentorMatch || studentMatch;
    }
    
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CrownIcon className="text-[var(--accent)]" size={24} /> ระบบจัดการพี่เลี้ยง (Mentorship)
          </h1>
          <p className="page-subtitle">จัดการเกณฑ์เงื่อนไขโบนัส, ยศ และดูประวัติการจับคู่พี่เลี้ยงและนักเรียนแพทย์</p>
        </div>
      </header>

      {error && (
        <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#fca5a5", fontSize: "0.85rem", display: "flex", gap: "10px", alignItems: "center" }}>
          <WarningIcon className="text-red-500" size={20} />
          <div>
            <strong>เกิดข้อผิดพลาด:</strong> {error}
            <br />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              โปรดตรวจสอบว่าได้สร้างตาราง <code>mentorship_relations</code> ในฐานข้อมูลเรียบร้อยแล้ว
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Settings Form left (2/5), History Table right (3/5) */}
      <div className="dashboard-grid-2-1" style={{ gridTemplateColumns: "1fr 1.5fr" }}>
        
        {/* Col 1: Settings Form */}
        <div className="active-shift-card-wrapper" style={{ height: "fit-content" }}>
          <div className="active-shift-card-header">
            <span style={{ fontSize: "0.92rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <SettingsIcon size={16} style={{ color: "var(--accent)" }} /> ตั้งค่าระบบพี่เลี้ยง
            </span>
          </div>

          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* 1. Intern Rank Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                ยศที่จะระบุว่าเป็นนักเรียนแพทย์ (Intern Rank)
              </label>
              <select
                value={internRankId}
                onChange={e => setInternRankId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="">-- เลือกยศนักเรียนแพทย์ --</option>
                {doctorRanks.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                * แพทย์ที่มียศนี้ และล็อกอินใหม่ไม่เกิน 48 ชม. จะแสดงบนบอร์ดเพื่อให้รับพี่เลี้ยง
              </span>
            </div>

            {/* 2. Min Accumulated Hours */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                ชั่วโมงสะสมขั้นต่ำที่จะมีสิทธิ์เป็นพี่เลี้ยงได้ (ชั่วโมง)
              </label>
              <input
                type="number"
                value={mentorMinHours}
                onChange={e => setMentorMinHours(Math.max(0, Number(e.target.value)))}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                * คำนวณจากยอดสะสมเวลาทั้งหมด (เกณฑ์เวร 2 วัน นับวันละ 3 ชม. = 6 ชม.)
              </span>
            </div>

            {/* 3. Acceptance Bonus */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                โบนัสเมื่อเริ่มรับเป็นพี่เลี้ยง (IC)
              </label>
              <input
                type="number"
                value={acceptanceBonus}
                onChange={e => setAcceptanceBonus(Math.max(0, Number(e.target.value)))}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* 4. Completion Bonus */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                โบนัสเมื่อดูแลครบ 2 วัน (IC)
              </label>
              <input
                type="number"
                value={completionBonus}
                onChange={e => setCompletionBonus(Math.max(0, Number(e.target.value)))}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* 5. Max Mentees Quota */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                จำนวนน้องเลี้ยงสูงสุดต่อคนในเวลาเดียวกัน (โควตา)
              </label>
              <input
                type="number"
                value={maxMentees}
                onChange={e => setMaxMentees(Math.max(1, Number(e.target.value)))}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* 6. Discord Webhook URL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                Discord Webhook สำหรับส่งแจ้งเตือนจับคู่พี่เลี้ยง
              </label>
              <input
                type="text"
                value={discordWebhookUrl}
                onChange={e => setDiscordWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                * หากเว้นว่างไว้ ระบบจะยิงประกาศแจ้งเตือนไปที่ Webhook หลักของแอดมินแทนค่ะ
              </span>
            </div>

            {/* 7. Discord Message Template */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  รูปแบบข้อความประกาศใน Discord
                </label>
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "4px" }}>
                <button type="button" onClick={() => insertPlaceholder("[พี่เลี้ยง]")} className="btn-manage-ranks" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>+ พี่เลี้ยง</button>
                <button type="button" onClick={() => insertPlaceholder("[น้องเลี้ยง]")} className="btn-manage-ranks" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>+ น้องเลี้ยง</button>
                <button type="button" onClick={() => insertPlaceholder("[พี่เลี้ยง_ดิสคอร์ด]")} className="btn-manage-ranks" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>+ แท็กพี่เลี้ยง</button>
                <button type="button" onClick={() => insertPlaceholder("[น้องเลี้ยง_ดิสคอร์ด]")} className="btn-manage-ranks" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>+ แท็กน้องเลี้ยง</button>
              </div>

              <textarea
                ref={templateTextareaRef}
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", resize: "vertical" }}
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="btn btn-primary"
              style={{
                width: "100%", padding: "10px", marginTop: "8px",
                background: saveSuccess ? "var(--success)" : "var(--primary)",
                fontWeight: 600
              }}
            >
              {isSaving ? "กำลังบันทึก..." : saveSuccess ? <><CheckIcon size={16} className="inline mr-1" /> บันทึกสำเร็จแล้ว</> : <><SaveIcon size={16} className="inline mr-1" /> บันทึกการตั้งค่าระบบ</>}
            </button>
          </div>
        </div>

        {/* Col 2: Mentorship Relations History */}
        <div className="active-shift-card-wrapper">
          <div className="active-shift-card-header" style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
              <UsersIcon size={16} style={{ color: "var(--accent)" }} /> ประวัติการดูแลของพี่เลี้ยง ({relations.length} รายการ)
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อพี่เลี้ยง/น้อง..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "180px", padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "4px 16px 0 16px" }}>
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "active", label: "กำลังดูแล (Active)" },
              { id: "completed", label: "สำเร็จแล้ว (Completed)" },
              { id: "cancelled", label: "ยกเลิกแล้ว (Cancelled)" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: "8px 12px",
                  fontSize: "0.78rem",
                  background: "none",
                  border: "none",
                  color: filterStatus === tab.id ? "var(--accent-light)" : "var(--text-muted)",
                  borderBottom: filterStatus === tab.id ? "2px solid var(--accent)" : "none",
                  cursor: "pointer",
                  fontWeight: filterStatus === tab.id ? 600 : 400,
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto", flex: 1, padding: "12px" }}>
            <table className="spreadsheet-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className="col-header" style={{ fontSize: "0.72rem" }}>แพทย์พี่เลี้ยง (Mentor)</th>
                  <th className="col-header" style={{ fontSize: "0.72rem" }}>น้องเลี้ยง (Student)</th>
                  <th className="col-header" style={{ fontSize: "0.72rem" }}>วันที่กดรับ</th>
                  <th className="col-header" style={{ fontSize: "0.72rem" }}>เวลาสิ้นสุด/ยกเลิก</th>
                  <th className="col-header" style={{ fontSize: "0.72rem", textAlign: "center" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRelations.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      ไม่มีบันทึกข้อมูลความสัมพันธ์ในกลุ่มนี้
                    </td>
                  </tr>
                ) : (
                  filteredRelations.map((rel) => {
                    const startedStr = new Date(rel.started_at).toLocaleDateString("th-TH", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    }) + " น.";
                    
                    const endedStr = rel.completed_at 
                      ? new Date(rel.completed_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น."
                      : rel.cancelled_at
                        ? new Date(rel.cancelled_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น."
                        : "—";

                    return (
                      <tr key={rel.id}>
                        <td className="cell">
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{rel.mentor_name}</span>
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{rel.mentor_email}</span>
                          </div>
                        </td>
                        <td className="cell">
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{rel.student_name}</span>
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{rel.student_email}</span>
                          </div>
                        </td>
                        <td className="cell" style={{ fontSize: "0.78rem", fontFamily: "var(--font-ui)" }}>{startedStr}</td>
                        <td className="cell" style={{ fontSize: "0.78rem", fontFamily: "var(--font-ui)" }}>{endedStr}</td>
                        <td className="cell" style={{ textAlign: "center" }}>
                          <span className={`portal-status-badge ${
                            rel.status === "active" ? "active" : rel.status === "completed" ? "completed" : "pending_proof"
                          }`} style={{
                            background: rel.status === "active" ? "rgba(59,130,246,0.1)" : rel.status === "completed" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                            color: rel.status === "active" ? "#60a5fa" : rel.status === "completed" ? "#34d399" : "#fca5a5"
                          }}>
                            {rel.status === "active" && "🟢 กำลังดูแล"}
                            {rel.status === "completed" && "✅ สำเร็จแล้ว"}
                            {rel.status === "cancelled" && "❌ ยกเลิกเวร"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
