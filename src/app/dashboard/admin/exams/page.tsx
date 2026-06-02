"use client";

import React, { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmProvider";
import { 
  FileText, Plus, Send, CheckSquare, Settings, AlertTriangle, ShieldAlert,
  Edit2, Trash2, CheckCircle2, XCircle, Search, Info, Award
} from "lucide-react";

interface Question {
  id: string;
  exam_type: string;
  question_text: string;
  created_at: string;
}

interface Attempt {
  id: string;
  user_email: string;
  exam_type: string;
  randomized_questions: Question[];
  student_answers: Record<string, string>;
  status: string;
  started_at: string;
  submitted_at: string | null;
  focus_lost_count: number;
  screen_share_detected: boolean;
  score: number | null;
  admin_feedback: string | null;
  graded_by: string | null;
}

interface Doctor {
  email: string;
  name: string;
  discordUsername?: string;
  avatarUrl?: string;
}

export default function AdminExamsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<"questions" | "assign" | "grading">("questions");
  
  // Data lists
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Question Form State
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [examType, setExamType] = useState("general_doctor");
  const [questionText, setQuestionText] = useState("");
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Assign Form State
  const [selectedDoctorEmail, setSelectedDoctorEmail] = useState("");
  const [assignExamType, setAssignExamType] = useState("general_doctor");
  const [assignQuestionCount, setAssignQuestionCount] = useState(5);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContent, setAssignContent] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Grading State
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [gradeScore, setGradeScore] = useState<number | string>("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingProgress, setGradingProgress] = useState(false);

  // Verification & Access Guard
  useEffect(() => {
    async function checkAccess() {
      const session = await getSession();
      if (!session || !session.user || (session.user as any).role !== "admin") {
        router.push("/dashboard");
      } else {
        setIsAdmin(true);
        loadAllData();
      }
      setLoadingSession(false);
    }
    checkAccess();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    setErrorMsg("");
    try {
      const [qRes, aRes, dRes] = await Promise.all([
        fetch("/api/admin/exams?action=questions"),
        fetch("/api/admin/exams?action=attempts"),
        fetch("/api/admin/exams?action=doctors")
      ]);

      if (!qRes.ok || !aRes.ok || !dRes.ok) {
        throw new Error("Failed to load backend databases");
      }

      const qData = await qRes.json();
      const aData = await aRes.json();
      const dData = await dRes.json();

      setQuestions(qData.questions || []);
      setAttempts(aData.attempts || []);
      setDoctors(dData.doctors || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถเชื่อมต่อฐานข้อมูลสอบแพทย์ได้ กรุณารันตาราง SQL หรือตรวจสอบสิทธิ์ค่ะ");
    } finally {
      setLoadingData(false);
    }
  };

  // Question pool CRUD handlers
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    
    setErrorMsg("");
    setSuccessMsg("");
    
    try {
      const payload = questionId 
        ? { action: "edit_question", id: questionId, examType, questionText }
        : { action: "create_question", examType, questionText };

      const res = await fetch("/api/admin/exams", {
        method: questionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(questionId ? "แก้ไขข้อสอบเรียบร้อยแล้วค่ะ" : "เพิ่มข้อสอบเข้าคลังสำเร็จค่ะ");
        setQuestionText("");
        setQuestionId(null);
        setShowQuestionModal(false);
        loadAllData();
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการเซฟคำถาม");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to API");
    }
  };

  const handleEditClick = (q: Question) => {
    setQuestionId(q.id);
    setExamType(q.exam_type);
    setQuestionText(q.question_text);
    setShowQuestionModal(true);
  };

  const handleDeleteClick = async (q: Question) => {
    const ok = await confirm({
      title: "ยืนยันการลบคำถาม",
      message: `คุณกำลังลบคำถาม: "${q.question_text.substring(0, 50)}..." หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบข้อสอบ",
      cancelText: "ยกเลิก",
      variant: "danger"
    });

    if (ok) {
      setErrorMsg("");
      setSuccessMsg("");
      try {
        const res = await fetch(`/api/admin/exams?id=${q.id}`, { method: "DELETE" });
        if (res.ok) {
          setSuccessMsg("ลบข้อสอบออกจากคลังสำเร็จแล้วค่ะ");
          loadAllData();
        } else {
          const data = await res.json();
          setErrorMsg(data.error || "Failed to delete question");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to delete");
      }
    }
  };

  // Assign Exam handlers
  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorEmail) return;

    setAssigning(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_exam",
          doctorEmail: selectedDoctorEmail,
          examType: assignExamType,
          questionCount: assignQuestionCount,
          title: assignTitle || undefined,
          content: assignContent || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`ส่งมอบสิทธิ์สอบให้แพทย์ ${selectedDoctorEmail} เรียบร้อยแล้วค่ะ`);
        setSelectedDoctorEmail("");
        setAssignTitle("");
        setAssignContent("");
        loadAllData();
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการมอบหมายสิทธิ์สอบ");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to assign exam");
    } finally {
      setAssigning(false);
    }
  };

  // Grade student attempt handler
  const handleGradeAttempt = async (status: "passed" | "failed") => {
    if (!selectedAttempt) return;

    setGradingProgress(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade_attempt",
          attemptId: selectedAttempt.id,
          status,
          score: gradeScore !== "" ? Number(gradeScore) : undefined,
          adminFeedback: gradeFeedback
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`ตรวจบันทึกผลสอบแพทย์ (${status === "passed" ? "ผ่าน ✅" : "ไม่ผ่าน ❌"}) สำเร็จพร้อมแจ้งเตือนแล้วค่ะ`);
        setSelectedAttempt(null);
        setGradeScore("");
        setGradeFeedback("");
        loadAllData();
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการตรวจเกรดข้อสอบ");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save grading result");
    } finally {
      setGradingProgress(false);
    }
  };

  const openGradingModal = (att: Attempt) => {
    setSelectedAttempt(att);
    setGradeScore(att.score !== null ? att.score : "");
    setGradeFeedback(att.admin_feedback || "");
  };

  const getDoctorNameByEmail = (email: string) => {
    const doc = doctors.find(d => d.email === email);
    return doc ? doc.name : email;
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " น.";
  };

  if (loadingSession) {
    return (
      <div className="inbox-loading" style={{ minHeight: "400px" }}>
        <div className="inbox-spinner"></div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>กำลังยืนยันสิทธิ์ความปลอดภัย...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "80px" }}>
      
      {/* Page Header */}
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={28} className="text-[var(--accent)]" /> ระบบจัดการสอบเลื่อนขั้นแพทย์ (HR Exam Desk)
          </h1>
          <p className="page-subtitle">
            คลังข้อสอบสุ่มแบบเขียนตอบอัตนัย, การมอบหมายงานสอบรายหัว และระบบตรวจข้อเขียนพร้อม Anti-cheat Telemetry
          </p>
        </div>

        {/* Tab switchers */}
        <div className="blacklist-filter-tabs">
          <button 
            className={`blacklist-filter-tab ${activeTab === "questions" ? "active" : ""}`}
            onClick={() => { setActiveTab("questions"); setSelectedAttempt(null); }}
          >
            <FileText size={14} /> คลังข้อสอบ
          </button>
          <button 
            className={`blacklist-filter-tab ${activeTab === "assign" ? "active" : ""}`}
            onClick={() => { setActiveTab("assign"); setSelectedAttempt(null); }}
          >
            <Send size={14} /> มอบหมายสิทธิ์สอบ
          </button>
          <button 
            className={`blacklist-filter-tab ${activeTab === "grading" ? "active" : ""}`}
            onClick={() => { setActiveTab("grading"); setSelectedAttempt(null); }}
          >
            <CheckSquare size={14} /> โต๊ะตรวจข้อสอบ
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="inbox-error-banner mb-6">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#4ade80", padding: "12px 16px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "24px" }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              📂 รายการคำถามในคลังข้อสอบ ({questions.length} ข้อ)
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setQuestionId(null);
                setQuestionText("");
                setExamType("general_doctor");
                setShowQuestionModal(true);
              }}
            >
              <Plus size={14} /> เพิ่มข้อสอบใหม่
            </button>
          </div>

          {loadingData ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>กำลังโหลดคลังข้อสอบ...</div>
          ) : questions.length === 0 ? (
            <div className="card" style={{ borderStyle: "dashed", textAlign: "center", padding: "48px 24px" }}>
              <FileText size={48} className="exam-mx-auto opacity-20" style={{ marginBottom: "12px" }} />
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-secondary)" }}>ไม่มีข้อสอบแพทย์ในคลัง</p>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", color: "var(--text-muted)" }}>กรุณากดปุ่มเพิ่มข้อสอบเพื่อเริ่มสร้างคลังคำถามสุ่มเขียนตอบ</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {questions.map((q) => (
                <div key={q.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", padding: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="exam-flex-row-center">
                      <span 
                        className={q.exam_type === "general_doctor" ? "exam-badge-blue" : "exam-badge-purple"}
                        style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "12px", fontSize: "0.68rem", fontWeight: "bold" }}
                      >
                        {q.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ID: {q.id.substring(0, 8)}</span>
                    </div>
                    <p style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 500, lineHeight: 1.6 }}>{q.question_text}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      className="btn btn-ghost"
                      style={{ padding: "6px", borderRadius: "6px" }}
                      onClick={() => handleEditClick(q)}
                      title="แก้ไข"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      className="btn btn-danger"
                      style={{ padding: "6px", borderRadius: "6px" }}
                      onClick={() => handleDeleteClick(q)}
                      title="ลบ"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assign Exam */}
      {activeTab === "assign" && (
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
          <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "1.1rem" }}>
            ✉️ ออกจดหมายส่งมอบสิทธิ์สอบรายคน
          </h2>

          <form onSubmit={handleAssignExam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="exam-flex-col exam-gap-1">
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>เลือกแพทย์ที่จะมอบสิทธิ์สอบ:</label>
              <select
                className="exam-select"
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none" }}
                value={selectedDoctorEmail}
                onChange={(e) => setSelectedDoctorEmail(e.target.value)}
                required
              >
                <option value="">-- ค้นหารายชื่อแพทย์ประจำการ --</option>
                {doctors.map((doc) => (
                  <option key={doc.email} value={doc.email}>
                    {doc.name} ({doc.email}) {doc.discordUsername ? `@${doc.discordUsername}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="exam-grid-2-col">
              <div className="exam-flex-col exam-gap-1">
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>ยศการสอบ:</label>
                <select
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none" }}
                  value={assignExamType}
                  onChange={(e) => setAssignExamType(e.target.value)}
                >
                  <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                  <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                </select>
              </div>

              <div className="exam-flex-col exam-gap-1">
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>จำนวนข้อสอบที่สุ่ม (Default 5 ข้อ):</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", fontFamily: "var(--font-mono)" }}
                  value={assignQuestionCount}
                  onChange={(e) => setAssignQuestionCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="exam-flex-col exam-gap-1">
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>หัวข้อจดหมาย (มีค่าเริ่มต้นให้):</label>
              <input
                type="text"
                placeholder="เช่น ใบแจ้งสิทธิ์สอบเลื่อนระดับ..."
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none" }}
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
              />
            </div>

            <div className="exam-flex-col exam-gap-1">
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>เนื้อหาคำอธิบายจดหมาย (มีค่าเริ่มต้นให้):</label>
              <textarea
                placeholder="คำอธิบายกฎกติกาการสอบ..."
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", resize: "none", minHeight: "100px" }}
                value={assignContent}
                onChange={(e) => setAssignContent(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: "bold", marginTop: "16px" }}
              disabled={assigning || !selectedDoctorEmail}
            >
              <Send size={15} /> {assigning ? "กำลังส่งสิทธิ์สอบ..." : "ส่งคำเชิญสอบเข้า Inbox 📬"}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Grading Attempts */}
      {activeTab === "grading" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            🧑‍⚖️ รายงานส่งข้อสอบและการบันทึกคะแนนจากผู้สอบ
          </h2>

          {loadingData ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>กำลังดึงข้อมูลงานสอบ...</div>
          ) : attempts.length === 0 ? (
            <div className="card" style={{ borderStyle: "dashed", textAlign: "center", padding: "48px 24px" }}>
              <CheckSquare size={48} className="exam-mx-auto opacity-20" style={{ marginBottom: "12px" }} />
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-secondary)" }}>ไม่พบบันทึกประวัติการสอบใดๆ</p>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", color: "var(--text-muted)" }}>ผู้ใช้ที่สอบเลื่อนขั้นแล้วจะปรากฏรายการให้เกรดและรายงานการโกงที่นี่ค่ะ</p>
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto", padding: "12px" }}>
              <table className="spreadsheet-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th className="col-header">ผู้สอบ (Doctor)</th>
                    <th className="col-header">การสอบ (Exam)</th>
                    <th className="col-header">เริ่มสอบเมื่อ</th>
                    <th className="col-header">ความปลอดภัย (Telemetry)</th>
                    <th className="col-header">สถานะ (Status)</th>
                    <th className="col-header" style={{ textAlign: "right" }}>ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => {
                    const totalFocusLost = att.focus_lost_count;
                    const screenShared = att.screen_share_detected;
                    
                    return (
                      <tr key={att.id}>
                        <td className="cell">
                          <div style={{ fontWeight: "bold", color: "#fff" }}>{getDoctorNameByEmail(att.user_email)}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{att.user_email}</div>
                        </td>
                        <td className="cell">
                          <span 
                            className={att.exam_type === "general_doctor" ? "exam-badge-blue" : "exam-badge-purple"}
                            style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "12px", fontSize: "0.68rem", fontWeight: "bold" }}
                          >
                            {att.exam_type === "general_doctor" ? "แพทย์ทั่วไป" : "แพทย์ชำนาญการ"}
                          </span>
                        </td>
                        <td className="cell" style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                          {formatDate(att.started_at)}
                        </td>
                        <td className="cell">
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.78rem" }}>
                            {screenShared ? (
                              <span className="text-red-400 font-extrabold flex items-center gap-1 animate-pulse">
                                🚨 ตรวจพบการแชร์จอ!
                              </span>
                            ) : (
                              <span className="text-green-400 font-semibold">🔒 ปลอดภัย</span>
                            )}
                            <span className={totalFocusLost > 3 ? "text-amber-400 font-bold" : "text-[var(--text-muted)]"}>
                              หลุดโฟกัส: {totalFocusLost} ครั้ง
                            </span>
                          </div>
                        </td>
                        <td className="cell">
                          <span 
                            className={
                              att.status === "passed" ? "exam-badge-green" :
                              att.status === "failed" ? "exam-badge-red" :
                              att.status === "submitted" ? "exam-badge-amber" : "exam-badge-blue"
                            }
                            style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "12px", fontSize: "0.68rem", fontWeight: "bold" }}
                          >
                            {att.status === "passed" ? "สอบผ่าน" :
                             att.status === "failed" ? "ตกเกณฑ์" :
                             att.status === "submitted" ? "รอตรวจผล" : "กำลังรันสอบ"}
                          </span>
                        </td>
                        <td className="cell" style={{ textAlign: "right" }}>
                          <button
                            className={att.status === "submitted" ? "btn btn-primary" : "btn btn-ghost"}
                            style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                            onClick={() => openGradingModal(att)}
                          >
                            {att.status === "submitted" ? "ตรวจข้อเขียน" : "เปิดดูผล"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Question Form Popup Modal */}
      {showQuestionModal && (
        <div className="exam-popup-backdrop">
          <div className="exam-popup-card" style={{ maxWidth: "500px", width: "100%", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <div className="exam-flex-row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>
                {questionId ? "📝 แก้ไขโจทย์ข้อสอบแพทย์" : "➕ เพิ่มโจทย์ข้อสอบใหม่"}
              </h3>
              <button 
                className="inbox-close-btn"
                onClick={() => setShowQuestionModal(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="exam-flex-col exam-gap-1">
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>ประเภทข้อสอบ:</label>
                <select
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none" }}
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                  <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                </select>
              </div>

              <div className="exam-flex-col exam-gap-1">
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>โจทย์คำถามเขียนตอบ:</label>
                <textarea
                  placeholder="เช่น อธิบายขั้นตอนการชุบชีวิตผู้ประสบภัยกรณีเคสสตอรี่ปะทะ..."
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", resize: "vertical", minHeight: "120px" }}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.75rem", padding: "8px 16px" }}
                  onClick={() => setShowQuestionModal(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: "0.75rem", padding: "8px 16px", fontWeight: "bold" }}
                >
                  บันทึกข้อสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Exam Grading & Detail Review Portal Drawer */}
      {selectedAttempt && (
        <div className="inbox-drawer-backdrop" onClick={() => setSelectedAttempt(null)}>
          <div className="inbox-drawer" style={{ width: "650px" }} onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="inbox-drawer-header" style={{ padding: "20px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>
                  🧑‍⚕️ โต๊ะประเมินข้อสอบแพทย์เขียนตอบ
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ผู้สอบ: {getDoctorNameByEmail(selectedAttempt.user_email)} ({selectedAttempt.user_email})
                </span>
              </div>
              <button 
                className="inbox-close-btn"
                onClick={() => setSelectedAttempt(null)}
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="inbox-drawer-body" style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
              
              {/* Telemetry Warning Box */}
              <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldAlert className="text-[var(--accent)]" size={16} /> รายงานข้อมูลการโกง (Anti-Cheat Logs)
                </div>
                <div className="exam-grid-2-col" style={{ fontSize: "0.78rem" }}>
                  <div style={{ background: "#030712", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>การแชร์หน้าจอ (Screen Share)</span>
                    {selectedAttempt.screen_share_detected ? (
                      <span className="text-red-500 font-extrabold">🚨 ตรวจพบความพยายามแชร์จอ!</span>
                    ) : (
                      <span className="text-green-400 font-semibold">🔒 ไม่พบบันทึกการโกง</span>
                    )}
                  </div>
                  <div style={{ background: "#030712", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>การหลุดโฟกัสหน้าเว็บ (Alt-Tab)</span>
                    <span className={`font-bold ${selectedAttempt.focus_lost_count > 3 ? "text-amber-500" : "text-white"}`}>
                      {selectedAttempt.focus_lost_count} ครั้ง {selectedAttempt.focus_lost_count > 3 ? "⚠️ ผิดปกติ" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answers list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>คำถามและผลการเขียนบรรยาย</h4>
                
                {selectedAttempt.randomized_questions.map((q, idx) => (
                  <div key={q.id} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", fontSize: "0.75rem", color: "var(--accent-light)", fontWeight: "bold", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {idx + 1}
                      </span>
                      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", lineHeight: 1.5 }}>{q.question_text}</p>
                    </div>

                    <div style={{ background: "#030712", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "16px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, userSelect: "text", minHeight: "80px" }}>
                      {selectedAttempt.student_answers[q.id] ? (
                        selectedAttempt.student_answers[q.id]
                      ) : (
                        <em className="text-[var(--text-muted)] text-xs">ผู้สอบไม่ได้กรอกคำตอบข้อนี้ค่ะ</em>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grading Form */}
              <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Award size={14} className="text-[var(--accent)]" /> ฟอร์มประเมินผลการสอบ
                </h4>

                <div className="exam-grid-2-col">
                  <div className="exam-flex-col exam-gap-1">
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>คะแนนที่ได้ (เต็ม 100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", fontFamily: "var(--font-mono)" }}
                      placeholder="กรอกคะแนน เช่น 85"
                      value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)}
                      disabled={selectedAttempt.status !== "submitted" && selectedAttempt.status !== "passed" && selectedAttempt.status !== "failed"}
                    />
                  </div>

                  <div className="exam-flex-col exam-gap-1">
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>สถานะการส่งผลสอบ:</label>
                    <div style={{ fontSize: "0.82rem", fontWeight: "bold", padding: "12px 0", color: "#fff" }}>
                      {selectedAttempt.status === "passed" ? "✅ ผ่านการสอบแพทย์" :
                       selectedAttempt.status === "failed" ? "❌ ตกเกณฑ์การสอบ" :
                       selectedAttempt.status === "submitted" ? "⏳ รอประเมินตัดสิน" : "ยังออนเวรสอบอยู่"}
                    </div>
                  </div>
                </div>

                <div className="exam-flex-col exam-gap-1">
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>ข้อคิดเห็น / คำอธิบายประกอบผลสอบ:</label>
                  <textarea
                    placeholder="เช่น ตอบข้อ 2 ได้ดีมาก แต่กรุณาระมัดระวังเรื่องกฎระเบียบ..."
                    style={{ width: "100%", padding: "10px 14px", fontSize: "0.85rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", resize: "none", minHeight: "90px" }}
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    disabled={selectedAttempt.status !== "submitted" && selectedAttempt.status !== "passed" && selectedAttempt.status !== "failed"}
                  />
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            {(selectedAttempt.status === "submitted" || selectedAttempt.status === "passed" || selectedAttempt.status === "failed") && (
              <div style={{ padding: "24px", background: "#090f1d", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "12px", flexShrink: 0 }}>
                <button
                  className="flex-1 btn btn-danger"
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: "bold" }}
                  onClick={() => handleGradeAttempt("failed")}
                  disabled={gradingProgress}
                >
                  <XCircle size={15} /> ตัดสินใจสอบไม่ผ่าน (Failed)
                </button>
                <button
                  className="flex-1 btn btn-primary"
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: "bold", background: "#10b981" }}
                  onClick={() => handleGradeAttempt("passed")}
                  disabled={gradingProgress}
                >
                  <CheckCircle2 size={15} /> ตัดสินใจสอบผ่าน (Passed)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Slide Drawer CSS Animation */}
      <style jsx global>{`
        .admin-exams-container select {
          cursor: pointer;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-drawer {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
