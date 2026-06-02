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
      <div className="flex flex-col items-center justify-center p-20 text-white min-h-[400px]">
        <div className="inbox-spinner mb-4"></div>
        <p className="text-sm text-[var(--text-secondary)] font-mono">กำลังยืนยันสิทธิ์ความปลอดภัย...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="admin-exams-container pb-20">
      
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ShieldAlert size={28} className="text-[var(--accent)]" /> ระบบจัดการสอบเลื่อนขั้นแพทย์ (HR Exam Desk)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            คลังข้อสอบสุ่มแบบเขียนตอบอัตนัย, การมอบหมายงานสอบรายหัว และระบบตรวจข้อเขียนพร้อม Anti-cheat Telemetry
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2 bg-[#090f1d] border border-[var(--border-subtle)] p-1 rounded-md">
          <button 
            className={`px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === "questions" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-white"}`}
            onClick={() => { setActiveTab("questions"); setSelectedAttempt(null); }}
          >
            <FileText size={14} /> คลังข้อสอบ
          </button>
          <button 
            className={`px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === "assign" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-white"}`}
            onClick={() => { setActiveTab("assign"); setSelectedAttempt(null); }}
          >
            <Send size={14} /> มอบหมายสิทธิ์สอบ
          </button>
          <button 
            className={`px-4 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === "grading" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-white"}`}
            onClick={() => { setActiveTab("grading"); setSelectedAttempt(null); }}
          >
            <CheckSquare size={14} /> โต๊ะตรวจข้อสอบ
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="inbox-error-banner mb-6">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-950 bg-opacity-20 border border-green-800 text-green-400 p-4 rounded mb-6 text-sm">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: Question Pool */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📂 รายการคำถามในคลังข้อสอบ ({questions.length} ข้อ)
            </h2>
            <button 
              className="btn btn-primary px-4 py-2 font-bold text-xs flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-light)] rounded"
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
            <div className="text-center py-10 text-[var(--text-secondary)] text-sm">กำลังโหลดคลังข้อสอบ...</div>
          ) : questions.length === 0 ? (
            <div className="bg-[#090f1d] border border-dashed border-[var(--border-subtle)] rounded-lg p-10 text-center text-[var(--text-secondary)]">
              <FileText size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">ไม่มีข้อสอบแพทย์ในคลัง</p>
              <p className="text-xs mt-1">กรุณากดปุ่มเพิ่มข้อสอบเพื่อเริ่มสร้างคลังคำถามสุ่มเขียนตอบ</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {questions.map((q) => (
                <div key={q.id} className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-5 flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${q.exam_type === "general_doctor" ? "bg-[rgba(59,130,246,0.15)] text-blue-400 border border-blue-800" : "bg-[rgba(168,85,247,0.15)] text-purple-400 border border-purple-800"}`}>
                        {q.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">ID: {q.id.substring(0, 8)}</span>
                    </div>
                    <p className="text-sm text-white font-medium leading-relaxed">{q.question_text}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="p-1.5 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all"
                      onClick={() => handleEditClick(q)}
                      title="แก้ไข"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      className="p-1.5 rounded bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)] text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
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
        <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            ✉️ ออกจดหมายส่งมอบสิทธิ์สอบรายคน
          </h2>

          <form onSubmit={handleAssignExam} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)]">เลือกแพทย์ที่จะมอบสิทธิ์สอบ:</label>
              <select
                className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">ยศการสอบ:</label>
                <select
                  className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none"
                  value={assignExamType}
                  onChange={(e) => setAssignExamType(e.target.value)}
                >
                  <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                  <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">จำนวนข้อสอบที่สุ่ม (Default 5 ข้อ):</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white font-mono outline-none"
                  value={assignQuestionCount}
                  onChange={(e) => setAssignQuestionCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)]">หัวข้อจดหมาย (มีค่าเริ่มต้นให้):</label>
              <input
                type="text"
                placeholder="เช่น ใบแจ้งสิทธิ์สอบเลื่อนระดับ..."
                className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)]">เนื้อหาคำอธิบายจดหมาย (มีค่าเริ่มต้นให้):</label>
              <textarea
                placeholder="คำอธิบายกฎกติกาการสอบ..."
                className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none resize-none min-h-[100px]"
                value={assignContent}
                onChange={(e) => setAssignContent(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full p-3 font-bold text-sm bg-[var(--accent)] hover:bg-[var(--accent-light)] rounded flex items-center justify-center gap-2 mt-4"
              disabled={assigning || !selectedDoctorEmail}
            >
              <Send size={15} /> {assigning ? "กำลังส่งสิทธิ์สอบ..." : "ส่งคำเชิญสอบเข้า Inbox 📬"}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Grading Attempts */}
      {activeTab === "grading" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🧑‍⚖️ รายงานส่งข้อสอบและการบันทึกคะแนนจากผู้สอบ
          </h2>

          {loadingData ? (
            <div className="text-center py-10 text-[var(--text-secondary)] text-sm">กำลังดึงข้อมูลงานสอบ...</div>
          ) : attempts.length === 0 ? (
            <div className="bg-[#090f1d] border border-dashed border-[var(--border-subtle)] rounded-lg p-10 text-center text-[var(--text-secondary)]">
              <CheckSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">ไม่พบบันทึกประวัติการสอบใดๆ</p>
              <p className="text-xs mt-1">ผู้ใช้ที่สอบเลื่อนขั้นแล้วจะปรากฏรายการให้เกรดและรายงานการโกงที่นี่ค่ะ</p>
            </div>
          ) : (
            <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text-secondary)]">
                <thead className="bg-[#030712] text-xs font-bold text-white uppercase border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="px-6 py-4">ผู้สอบ (Doctor)</th>
                    <th className="px-6 py-4">การสอบ (Exam)</th>
                    <th className="px-6 py-4">เริ่มสอบเมื่อ</th>
                    <th className="px-6 py-4">ความปลอดภัย (Telemetry)</th>
                    <th className="px-6 py-4">สถานะ (Status)</th>
                    <th className="px-6 py-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {attempts.map((att) => {
                    const totalFocusLost = att.focus_lost_count;
                    const screenShared = att.screen_share_detected;
                    
                    return (
                      <tr key={att.id} className="hover:bg-white hover:bg-opacity-5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{getDoctorNameByEmail(att.user_email)}</div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">{att.user_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${att.exam_type === "general_doctor" ? "bg-[rgba(59,130,246,0.1)] text-blue-400" : "bg-[rgba(168,85,247,0.1)] text-purple-400"}`}>
                            {att.exam_type === "general_doctor" ? "แพทย์ทั่วไป" : "แพทย์ชำนาญการ"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {formatDate(att.started_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
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
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            att.status === "passed" ? "bg-green-950 text-green-400 border border-green-800" :
                            att.status === "failed" ? "bg-red-950 text-red-400 border border-red-800" :
                            att.status === "submitted" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                            "bg-slate-900 text-slate-400 border border-slate-700"
                          }`}>
                            {att.status === "passed" ? "สอบผ่าน" :
                             att.status === "failed" ? "ตกเกณฑ์" :
                             att.status === "submitted" ? "รอตรวจผล" : "กำลังรันสอบ"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            className={`px-3 py-1 text-xs font-bold rounded border ${
                              att.status === "submitted" 
                                ? "bg-[var(--accent)] border-[var(--accent)] hover:bg-[var(--accent-light)] text-white" 
                                : "bg-transparent border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)]"
                            }`}
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100000] flex items-center justify-center p-4">
          <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-base font-bold text-white">
                {questionId ? "📝 แก้ไขโจทย์ข้อสอบแพทย์" : "➕ เพิ่มโจทย์ข้อสอบใหม่"}
              </h3>
              <button 
                className="text-[var(--text-secondary)] hover:text-white"
                onClick={() => setShowQuestionModal(false)}
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">ประเภทข้อสอบ:</label>
                <select
                  className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                >
                  <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                  <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)]">โจทย์คำถามเขียนตอบ:</label>
                <textarea
                  placeholder="เช่น อธิบายขั้นตอนการชุบชีวิตผู้ประสบภัยกรณีเคสสตอรี่ปะทะ..."
                  className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-3 text-sm text-white outline-none resize-y min-h-[120px]"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)] text-xs font-bold rounded"
                  onClick={() => setShowQuestionModal(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-light)] text-white text-xs font-bold rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100000] flex justify-end">
          <div className="bg-[#030712] border-l border-[var(--border-subtle)] w-[650px] max-w-full h-full flex flex-col shadow-2xl animate-slide-drawer">
            
            {/* Drawer Header */}
            <div className="p-6 bg-[#090f1d] border-b border-[var(--border-subtle)] flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  🧑‍⚕️ โต๊ะประเมินข้อสอบแพทย์เขียนตอบ
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Telemetry Warning Box */}
              <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-4 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="text-[var(--accent)]" size={16} /> รายงานข้อมูลการโกง (Anti-Cheat Logs)
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#030712] p-2.5 rounded border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block mb-1">การแชร์หน้าจอ (Screen Share)</span>
                    {selectedAttempt.screen_share_detected ? (
                      <span className="text-red-500 font-extrabold">🚨 ตรวจพบความพยายามแชร์จอ!</span>
                    ) : (
                      <span className="text-green-400 font-semibold">🔒 ไม่พบบันทึกการโกง</span>
                    )}
                  </div>
                  <div className="bg-[#030712] p-2.5 rounded border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block mb-1">การหลุดโฟกัสหน้าเว็บ (Alt-Tab)</span>
                    <span className={`font-bold ${selectedAttempt.focus_lost_count > 3 ? "text-amber-500" : "text-white"}`}>
                      {selectedAttempt.focus_lost_count} ครั้ง {selectedAttempt.focus_lost_count > 3 ? "⚠️ ผิดปกติ" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answers list */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">คำถามและผลการเขียนบรรยาย</h4>
                
                {selectedAttempt.randomized_questions.map((q, idx) => (
                  <div key={q.id} className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] text-xs text-[var(--accent-light)] font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-white leading-relaxed">{q.question_text}</p>
                    </div>

                    <div className="bg-[#030712] border border-[var(--border-subtle)] rounded p-4 text-sm text-[var(--text-secondary)] leading-relaxed select-text min-h-[80px]">
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
              <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Award size={14} className="text-[var(--accent)]" /> ฟอร์มประเมินผลการสอบ
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">คะแนนที่ได้ (เต็ม 100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white font-mono outline-none"
                      placeholder="กรอกคะแนน เช่น 85"
                      value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)}
                      disabled={selectedAttempt.status !== "submitted" && selectedAttempt.status !== "passed" && selectedAttempt.status !== "failed"}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">สถานะการส่งผลสอบ:</label>
                    <div className="text-xs font-bold py-3 text-white">
                      {selectedAttempt.status === "passed" ? "✅ ผ่านการสอบแพทย์" :
                       selectedAttempt.status === "failed" ? "❌ ตกเกณฑ์การสอบ" :
                       selectedAttempt.status === "submitted" ? "⏳ รอประเมินตัดสิน" : "ยังออนเวรสอบอยู่"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">ข้อคิดเห็น / คำอธิบายประกอบผลสอบ:</label>
                  <textarea
                    placeholder="เช่น ตอบข้อ 2 ได้ดีมาก แต่กรุณาระมัดระวังเรื่องกฎระเบียบ..."
                    className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-2.5 text-sm text-white outline-none resize-none min-h-[90px]"
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    disabled={selectedAttempt.status !== "submitted" && selectedAttempt.status !== "passed" && selectedAttempt.status !== "failed"}
                  />
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            {(selectedAttempt.status === "submitted" || selectedAttempt.status === "passed" || selectedAttempt.status === "failed") && (
              <div className="p-6 bg-[#090f1d] border-t border-[var(--border-subtle)] flex gap-3 flex-shrink-0">
                <button
                  className="flex-1 btn p-3 rounded font-bold text-xs bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 transition-all flex items-center justify-center gap-1.5"
                  onClick={() => handleGradeAttempt("failed")}
                  disabled={gradingProgress}
                >
                  <XCircle size={15} /> ตัดสินใจสอบไม่ผ่าน (Failed)
                </button>
                <button
                  className="flex-1 btn p-3 rounded font-bold text-xs bg-green-950 text-green-400 border border-green-800 hover:bg-green-900 transition-all flex items-center justify-center gap-1.5"
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
