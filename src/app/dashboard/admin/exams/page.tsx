"use client";

import React, { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmProvider";
import { 
  FileText, Plus, Send, CheckSquare, AlertTriangle, ShieldAlert,
  Edit2, Trash2, CheckCircle2, XCircle, Search, Award,
  ChevronLeft, ChevronRight, User, Eye, EyeOff, ShieldCheck, Clock
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

interface CandidateItem {
  email: string;
  name: string;
  avatarUrl?: string;
  discordUsername?: string;
  status: "in_progress" | "waiting" | "passed" | "failed" | "submitted";
  examType: string;
  startedAt: string;
  attempt?: Attempt;
  assignment?: any;
}

export default function AdminExamsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Data lists
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [userRanks, setUserRanks] = useState<Record<string, string>>({});
  const [doctorRanks, setDoctorRanks] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [showQuestionPool, setShowQuestionPool] = useState(false);
  const [showAssignExam, setShowAssignExam] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Question Form State (nested in Question Pool Modal)
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [examType, setExamType] = useState("general_doctor");
  const [questionText, setQuestionText] = useState("");

  // Assign Form State
  const [selectedDoctorEmail, setSelectedDoctorEmail] = useState("");
  const [assignExamType, setAssignExamType] = useState("general_doctor");
  const [assignQuestionCount, setAssignQuestionCount] = useState(5);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignContent, setAssignContent] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Active Grading / Review Panel State
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionGrades, setQuestionGrades] = useState<Record<string, "correct" | "incorrect">>({});
  const [gradeScore, setGradeScore] = useState<number | string>("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradingProgress, setGradingProgress] = useState(false);

  // Left Column Filters
  const [candidateSearchQuery, setCandidateSearchQuery] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("all");
  const [candidatePage, setCandidatePage] = useState(1);
  const candidatesPerPage = 8;

  // Question pool search state
  const [poolSearchQuery, setPoolSearchQuery] = useState("");

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
      const [qRes, aRes, dRes, sRes, asRes] = await Promise.all([
        fetch("/api/admin/exams?action=questions"),
        fetch("/api/admin/exams?action=attempts"),
        fetch("/api/admin/exams?action=doctors"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/exams?action=assignments")
      ]);

      if (!qRes.ok || !aRes.ok || !dRes.ok || !sRes.ok || !asRes.ok) {
        throw new Error("Failed to load backend databases");
      }

      const qData = await qRes.json();
      const aData = await aRes.json();
      const dData = await dRes.json();
      const sData = await sRes.json();
      const asData = await asRes.json();

      setQuestions(qData.questions || []);
      setAttempts(aData.attempts || []);
      setDoctors(dData.doctors || []);
      setAssignments(asData.assignments || []);
      
      setUserRanks(sData.settings?.user_ranks || {});
      setDoctorRanks(sData.settings?.doctor_ranks || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("ไม่สามารถเชื่อมต่อฐานข้อมูลสอบแพทย์ได้ กรุณาตรวจสอบสิทธิ์และตาราง SQL ค่ะ");
    } finally {
      setLoadingData(false);
    }
  };

  // Question Pool CRUD handlers
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
        setShowQuestionForm(false);
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
    setShowQuestionForm(true);
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

  // Assign Exam Handlers
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
        setShowAssignExam(false);
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

  // Reset/Retake exam handler (ส่งสอบใหม่)
  const handleResetAttempt = async (attemptId: string, email: string) => {
    const ok = await confirm({
      title: "🔄 ยืนยันส่งสอบใหม่ (Reset Exam)",
      message: `คุณต้องการลบผลการสอบเดิมของแพทย์ (${email}) และรีเซ็ตจดหมายแจ้งสอบในกล่องข้อความ ให้สามารถคลิกเข้าสอบใหม่ได้อีกครั้งหรือไม่? ผลสอบเดิมจะถูกล้างออกทั้งหมด`,
      confirmText: "ตกลง ส่งสอบใหม่",
      cancelText: "ยกเลิก",
      variant: "warning"
    });

    if (!ok) return;

    setGradingProgress(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_attempt",
          attemptId
        })
      });

      if (res.ok) {
        setSuccessMsg("รีเซ็ตสิทธิ์และส่งการสอบใหม่ให้แพทย์สำเร็จแล้วค่ะ");
        setSelectedCandidate(null);
        loadAllData();
      } else {
        const d = await res.json();
        setErrorMsg(d.error || "เกิดข้อผิดพลาดในการรีเซ็ตผลสอบ");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reset exam");
    } finally {
      setGradingProgress(false);
    }
  };

  // Grade student attempt handler
  const handleGradeAttempt = async (status: "passed" | "failed") => {
    if (!selectedCandidate || !selectedCandidate.attempt) return;

    setGradingProgress(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Serialize question grades
    const serializedFeedback = `---GRADES---${JSON.stringify(questionGrades)}---FEEDBACK---${gradeFeedback}`;

    try {
      const res = await fetch("/api/admin/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade_attempt",
          attemptId: selectedCandidate.attempt.id,
          status,
          score: gradeScore !== "" ? Number(gradeScore) : undefined,
          adminFeedback: serializedFeedback
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`ตรวจบันทึกผลสอบแพทย์ (${status === "passed" ? "ผ่าน ✅" : "ไม่ผ่าน ❌"}) สำเร็จพร้อมแจ้งเตือนแล้วค่ะ`);
        setSelectedCandidate(null);
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

  // Handle selecting candidate
  const selectCandidate = (candidate: CandidateItem) => {
    setSelectedCandidate(candidate);
    setActiveQuestionIndex(0);
    
    if (candidate.attempt) {
      const att = candidate.attempt;
      
      // Parse serialized grades from admin_feedback
      let initialGrades: Record<string, "correct" | "incorrect"> = {};
      let initialFeedback = "";
      
      if (att.admin_feedback) {
        const feedbackStr = att.admin_feedback;
        if (feedbackStr.includes("---GRADES---") && feedbackStr.includes("---FEEDBACK---")) {
          try {
            const parts = feedbackStr.split("---FEEDBACK---");
            initialFeedback = parts[1] || "";
            const gradesPart = parts[0].replace("---GRADES---", "").trim();
            initialGrades = JSON.parse(gradesPart);
          } catch (e) {
            console.error("Failed to parse serialized grades", e);
            initialFeedback = feedbackStr;
          }
        } else {
          initialFeedback = feedbackStr;
        }
      }
      
      setQuestionGrades(initialGrades);
      setGradeFeedback(initialFeedback);
      setGradeScore(att.score !== null ? att.score : "");
    } else {
      setQuestionGrades({});
      setGradeFeedback("");
      setGradeScore("");
    }
  };

  const handleSetQuestionGrade = (qId: string, grade: "correct" | "incorrect") => {
    const nextGrades = { ...questionGrades, [qId]: grade };
    setQuestionGrades(nextGrades);
    
    // Calculate new overall score automatically
    if (selectedCandidate && selectedCandidate.attempt) {
      const totalCorrect = Object.values(nextGrades).filter(v => v === "correct").length;
      setGradeScore(totalCorrect);
    }
  };

  const getDoctorNameByEmail = (email: string) => {
    const doc = doctors.find(d => d.email === email);
    return doc ? doc.name : email;
  };

  const getDoctorRank = (email: string) => {
    const userRankId = userRanks[email];
    const rankObj = doctorRanks.find((r: any) => r.id === userRankId);
    return rankObj ? rankObj.name : "แพทย์ประจำการ";
  };

  const getDoctorAvatar = (email: string) => {
    const doc = doctors.find(d => d.email === email);
    return doc?.avatarUrl || null;
  };

  const getDoctorDiscord = (email: string) => {
    const doc = doctors.find(d => d.email === email);
    return doc ? `@${doc.discordUsername || doc.name}` : "";
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

  // Duration Formatter
  const getExamDurationStr = (att: Attempt) => {
    if (!att.submitted_at) return "—";
    const start = new Date(att.started_at).getTime();
    const end = new Date(att.submitted_at).getTime();
    const elapsedMs = end - start;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
    return `${elapsedMinutes} นาที ${elapsedSeconds} วินาที`;
  };

  // Build the unified candidates list
  const candidatesList = React.useMemo(() => {
    const list: CandidateItem[] = [];

    // Add attempts
    attempts.forEach(att => {
      const doc = doctors.find(d => d.email === att.user_email);
      list.push({
        email: att.user_email,
        name: doc ? doc.name : att.user_email,
        avatarUrl: doc?.avatarUrl,
        discordUsername: doc?.discordUsername,
        status: att.status as any,
        examType: att.exam_type,
        startedAt: att.started_at,
        attempt: att
      });
    });

    // Add pending assignments from user_inbox (exam invitation mail with no attempt started)
    assignments.forEach(assign => {
      const hasAttempt = attempts.some(att => att.id === assign.exam_attempt_id);
      if (!hasAttempt && !assign.exam_attempt_id) {
        const doc = doctors.find(d => d.email === assign.user_email);
        list.push({
          email: assign.user_email,
          name: doc ? doc.name : assign.user_email,
          avatarUrl: doc?.avatarUrl,
          discordUsername: doc?.discordUsername,
          status: "waiting",
          examType: assign.exam_type || "general_doctor",
          startedAt: assign.created_at || "",
          assignment: assign
        });
      }
    });

    // Filtering by Search Query
    let filtered = list;
    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q)
      );
    }

    // Filtering by Status
    if (candidateStatusFilter !== "all") {
      filtered = filtered.filter(c => c.status === candidateStatusFilter);
    }

    // Sorting: 'submitted' (รอตรวจ) -> 'in_progress' (กำลังสอบ) -> 'waiting' (รอสอบ) -> 'passed' (สอบผ่าน) / 'failed' (สอบไม่ผ่าน)
    const statusOrder = {
      submitted: 1,
      in_progress: 2,
      waiting: 3,
      passed: 4,
      failed: 5
    };

    return filtered.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [attempts, assignments, doctors, candidateSearchQuery, candidateStatusFilter]);

  // Statistics calculation
  const stats = React.useMemo(() => {
    const uniqueEmails = new Set([
      ...attempts.map(a => a.user_email),
      ...assignments.map(a => a.user_email)
    ]);
    
    const waiting = attempts.filter(a => a.status === "in_progress").length +
      assignments.filter(a => !a.exam_attempt_id).length;
      
    const passed = attempts.filter(a => a.status === "passed").length;
    const failed = attempts.filter(a => a.status === "failed").length;

    return {
      totalApplicants: uniqueEmails.size,
      waiting,
      passed,
      failed,
      totalQuestions: questions.length
    };
  }, [attempts, assignments, questions]);

  // Pagination calculation
  const totalPages = Math.ceil(candidatesList.length / candidatesPerPage);
  const paginatedCandidates = React.useMemo(() => {
    const startIndex = (candidatePage - 1) * candidatesPerPage;
    return candidatesList.slice(startIndex, startIndex + candidatesPerPage);
  }, [candidatesList, candidatePage]);

  // Graded attempts history
  const gradedAttempts = React.useMemo(() => {
    return attempts.filter(a => a.status === "passed" || a.status === "failed");
  }, [attempts]);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "60px", color: "#fff" }}>
      
      {/* 1. Header Section */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
              <ShieldAlert size={26} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: "bold", margin: 0, letterSpacing: "0.5px" }}>
                ระบบจัดการการสอบเลื่อนขั้นแพทย์ (HR Exam Desk)
              </h1>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                คลังข้อสอบรูปแบบสุ่มอัตนัย, การมอบหมายงานสอบรายหัว และระบบตรวจข้อสอบพร้อม Anti-cheat Telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            className="btn btn-ghost" 
            style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.015)" }}
            onClick={() => { setShowQuestionPool(true); setPoolSearchQuery(""); }}
          >
            <FileText size={15} /> คลังข้อสอบ
          </button>
          
          <button 
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => { setShowAssignExam(true); setSelectedDoctorEmail(""); }}
          >
            <Plus size={15} /> มอบหมายสิทธิ์สอบ
          </button>
        </div>
      </header>

      {/* 2. Global Alert Banners */}
      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "12px 16px", borderRadius: "8px", fontSize: "0.82rem" }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#4ade80", padding: "12px 16px", borderRadius: "8px", fontSize: "0.82rem" }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. Top Row Statistics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        
        {/* Total Applicants */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ผู้สมัครทั้งหมด</div>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
              {stats.totalApplicants} <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "var(--text-muted)" }}>คน</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>ทั้งหมดที่ลงทะเบียนสอบ</div>
          </div>
        </div>

        {/* Waiting */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px" }}>
          <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>รอสอบ / กำลังสอบ</div>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
              {stats.waiting} <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "var(--text-muted)" }}>คน</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>รอการเข้าสอบสะสม</div>
          </div>
        </div>

        {/* Passed */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px" }}>
          <div style={{ background: "rgba(34, 197, 94, 0.08)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>สอบผ่าน</div>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
              {stats.passed} <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "var(--text-muted)" }}>คน</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>ผ่านตามเกณฑ์ประเมิน</div>
          </div>
        </div>

        {/* Failed */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px" }}>
          <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>สอบไม่ผ่าน</div>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
              {stats.failed} <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "var(--text-muted)" }}>คน</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>ไม่ผ่านเกณฑ์การสอบ</div>
          </div>
        </div>

        {/* Question Pool */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px" }}>
          <div style={{ background: "rgba(168, 85, 247, 0.08)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ข้อสอบทั้งหมด</div>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
              {stats.totalQuestions} <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "var(--text-muted)" }}>ข้อ</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>ในคลังข้อสอบสุ่มทั้งหมด</div>
          </div>
        </div>

      </div>

      {/* 4. Three-Column Workspace Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        
        {/* ================= COLUMN 1: CANDIDATES LIST ================= */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "280px" }}>
          <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={16} style={{ color: "var(--accent)" }} /> รายชื่อผู้สมัครสอบ
            </h3>
          </div>

          {/* Search & Filter Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้สมัคร..."
                style={{ width: "100%", padding: "8px 12px 8px 36px", fontSize: "0.8rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none" }}
                value={candidateSearchQuery}
                onChange={(e) => { setCandidateSearchQuery(e.target.value); setCandidatePage(1); }}
              />
            </div>

            <select
              style={{ width: "100%", padding: "8px 12px", fontSize: "0.8rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", cursor: "pointer" }}
              value={candidateStatusFilter}
              onChange={(e) => { setCandidateStatusFilter(e.target.value); setCandidatePage(1); }}
            >
              <option value="all">ทั้งหมด ({candidatesList.length})</option>
              <option value="submitted">⏳ รอตรวจ (Submitted)</option>
              <option value="in_progress">🔵 กำลังสอบ (In Progress)</option>
              <option value="waiting">📬 รอสอบ (Waiting / Assigned)</option>
              <option value="passed">✅ สอบผ่าน (Passed)</option>
              <option value="failed">❌ สอบไม่ผ่าน (Failed)</option>
            </select>
          </div>

          {/* Candidate List Container */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minHeight: "360px" }}>
            {loadingData ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>กำลังดึงรายชื่อ...</div>
            ) : paginatedCandidates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 10px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                ไม่พบรายชื่อตามฟิลเตอร์
              </div>
            ) : (
              paginatedCandidates.map((c, idx) => {
                const isActive = selectedCandidate?.email === c.email && selectedCandidate?.startedAt === c.startedAt;
                const docRank = getDoctorRank(c.email);
                
                return (
                  <div
                    key={c.email + "-" + c.startedAt}
                    onClick={() => selectCandidate(c)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isActive ? "rgba(168, 85, 247, 0.08)" : "rgba(255,255,255,0.01)",
                      border: isActive ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--border)"; }}
                    onMouseOut={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0, flex: 1 }}>
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border-subtle)", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: "bold", color: "#fff", flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: "bold", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {docRank}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span 
                        className={
                          c.status === "passed" ? "exam-badge-green" :
                          c.status === "failed" ? "exam-badge-red" :
                          c.status === "submitted" ? "exam-badge-amber" :
                          c.status === "in_progress" ? "exam-badge-blue" : "exam-badge-amber"
                        }
                        style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: "bold" }}
                      >
                        {c.status === "passed" ? "สอบผ่าน" :
                         c.status === "failed" ? "สอบไม่ผ่าน" :
                         c.status === "submitted" ? "รอตรวจ" :
                         c.status === "in_progress" ? "กำลังสอบ" : "รอสอบ"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>
                แสดง {((candidatePage - 1) * candidatesPerPage) + 1} ถึง {Math.min(candidatePage * candidatesPerPage, candidatesList.length)} จาก {candidatesList.length} รายการ
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px" }}
                  disabled={candidatePage === 1}
                  onClick={() => setCandidatePage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ padding: "4px 8px", background: "var(--bg-secondary)", borderRadius: "4px", fontWeight: "bold" }}>
                  {candidatePage}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px" }}
                  disabled={candidatePage === totalPages}
                  onClick={() => setCandidatePage(prev => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ================= COLUMN 2: EXAM SHEET GRADER ================= */}
        <div className="card" style={{ flex: 2, display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px" }}>
          
          <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={16} style={{ color: "var(--accent)" }} /> ตรวจข้อสอบแพทย์
            </h3>
            {selectedCandidate?.attempt && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                ชุดข้อสอบ: {selectedCandidate.examType === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
              </span>
            )}
          </div>

          {!selectedCandidate ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>
              <CheckSquare size={48} style={{ opacity: 0.15, marginBottom: "16px" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>ยังไม่ได้เลือกผู้สมัครสอบ</p>
              <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>กรุณาเลือกรายชื่อผู้สมัครสอบในแถบทางซ้าย เพื่อเปิดหน้าบันทึกการตรวจข้อสอบเลื่อนขั้นค่ะ</p>
            </div>
          ) : selectedCandidate.status === "waiting" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>
              <Send size={48} style={{ opacity: 0.15, marginBottom: "16px" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>สถานะ: รอแพทย์เข้าสอบ (Waiting)</p>
              <p style={{ fontSize: "0.75rem", marginTop: "4px", maxWidth: "300px" }}>
                สิทธิ์สอบนี้ถูกส่งเข้ากล่องจดหมายของแพทย์แล้ว แต่แพทย์ยังไม่ได้กดยืนยันเริ่มทำข้อสอบเพื่อทำรายการสุ่มคำถามค่ะ
              </p>
            </div>
          ) : !selectedCandidate.attempt ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>
              <AlertTriangle size={48} style={{ opacity: 0.15, marginBottom: "16px" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>ไม่พบบันทึกสุ่มข้อสอบ</p>
            </div>
          ) : (
            // Active Attempt Review Panel
            (() => {
              const att = selectedCandidate.attempt;
              const currentQ = att.randomized_questions[activeQuestionIndex];
              const studentAnswer = att.student_answers[currentQ?.id] || "";
              const activeGrade = questionGrades[currentQ?.id];
              
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                  
                  {/* Current Question Selector Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "8px 12px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                      โจทย์คำถามข้อที่ {activeQuestionIndex + 1} / {att.randomized_questions.length}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px" }}
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px" }}
                        disabled={activeQuestionIndex === att.randomized_questions.length - 1}
                        onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Active Question Box */}
                  {currentQ && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "18px" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#fff", lineHeight: 1.5 }}>
                        ข้อ {activeQuestionIndex + 1}: {currentQ.question_text}
                      </div>
                      
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>คำตอบจากแพทย์ผู้เข้าสอบ:</div>
                      <div style={{ background: "#030712", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "14px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, userSelect: "text", minHeight: "120px", maxHeight: "250px", overflowY: "auto" }}>
                        {studentAnswer ? (
                          studentAnswer
                        ) : (
                          <em style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>แพทย์คนนี้ไม่ได้พิมพ์กรอกคำตอบใดๆ ในข้อนี้ค่ะ</em>
                        )}
                      </div>

                      {/* Grading Option for Active Question */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "12px", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "500" }}>ประเมินผลคำตอบข้อนี้:</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              fontSize: "0.75rem",
                              padding: "6px 12px",
                              background: activeGrade === "incorrect" ? "rgba(239, 68, 68, 0.2)" : "transparent",
                              color: activeGrade === "incorrect" ? "#f87171" : "var(--text-muted)",
                              border: `1px solid ${activeGrade === "incorrect" ? "#ef4444" : "var(--border-subtle)"}`,
                              fontWeight: "bold"
                            }}
                            onClick={() => handleSetQuestionGrade(currentQ.id, "incorrect")}
                          >
                            ❌ ผิด (Incorrect)
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              fontSize: "0.75rem",
                              padding: "6px 12px",
                              background: activeGrade === "correct" ? "rgba(34, 197, 94, 0.2)" : "transparent",
                              color: activeGrade === "correct" ? "#4ade80" : "var(--text-muted)",
                              border: `1px solid ${activeGrade === "correct" ? "#22c55e" : "var(--border-subtle)"}`,
                              fontWeight: "bold"
                            }}
                            onClick={() => handleSetQuestionGrade(currentQ.id, "correct")}
                          >
                            ✅ ถูกต้อง (Correct)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question Grid Map Navigation */}
                  <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: "bold" }}>ตารางแผนที่การตอบข้อสอบ (Question Map)</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        คะแนนสะสม: {Object.values(questionGrades).filter(v => v === "correct").length} / {att.randomized_questions.length} คะแนน
                      </span>
                    </div>

                    {/* Color Legend */}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "2px" }} />
                        <span>ตอบแล้ว/ถูกต้อง</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "2px" }} />
                        <span>ตอบผิด (Incorrect)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "8px", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", border: "1px solid var(--border-subtle)" }} />
                        <span>ยังไม่ได้ตอบ/รอประเมิน</span>
                      </div>
                    </div>

                    {/* Map Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "8px" }}>
                      {att.randomized_questions.map((q, idx) => {
                        const isCurrent = idx === activeQuestionIndex;
                        const isAnswered = !!att.student_answers[q.id]?.trim();
                        const grade = questionGrades[q.id];
                        
                        let bgColor = "rgba(255,255,255,0.03)";
                        let textColor = "var(--text-secondary)";
                        let borderColor = "var(--border-subtle)";
                        
                        if (grade === "correct") {
                          bgColor = "rgba(34, 197, 94, 0.25)";
                          textColor = "#4ade80";
                          borderColor = "rgba(34, 197, 94, 0.4)";
                        } else if (grade === "incorrect") {
                          bgColor = "rgba(239, 68, 68, 0.25)";
                          textColor = "#f87171";
                          borderColor = "rgba(239, 68, 68, 0.4)";
                        } else if (isAnswered) {
                          bgColor = "rgba(59, 130, 246, 0.15)";
                          textColor = "#60a5fa";
                          borderColor = "rgba(59, 130, 246, 0.25)";
                        }

                        if (isCurrent) {
                          borderColor = "var(--accent)";
                          bgColor = "rgba(168, 85, 247, 0.2)";
                          textColor = "#c084fc";
                        }

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuestionIndex(idx)}
                            style={{
                              aspectRatio: "1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: bgColor,
                              border: isCurrent ? "2px solid var(--accent)" : `1px solid ${borderColor}`,
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                              fontWeight: "bold",
                              color: textColor,
                              cursor: "pointer",
                              outline: "none",
                              boxShadow: isCurrent ? "0 0 8px rgba(168, 85, 247, 0.4)" : "none",
                              transition: "all 0.15s ease"
                            }}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()
          )}

        </div>

        {/* ================= COLUMN 3: CANDIDATE INFO & TELEMETRY ================= */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px" }}>
          
          <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={16} style={{ color: "var(--accent)" }} /> ข้อมูลผู้เข้าสอบ & ความปลอดภัย
            </h3>
          </div>

          {!selectedCandidate ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-muted)", padding: "20px", textAlign: "center" }}>
              <User size={48} style={{ opacity: 0.15, marginBottom: "16px" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>ไม่มีข้อมูลประวัติแสดง</p>
            </div>
          ) : (
            // Full Candidate Info Panel
            (() => {
              const email = selectedCandidate.email;
              const name = selectedCandidate.name;
              const avatar = getDoctorAvatar(email);
              const rank = getDoctorRank(email);
              const discord = getDoctorDiscord(email);
              const att = selectedCandidate.attempt;
              
              // Resolve speed
              let speedStr = "—";
              let timeStr = "—";
              if (att) {
                timeStr = att.submitted_at ? getExamDurationStr(att) : "กำลังสอบเลื่อนระดับ";
                
                // Calculate avg speed
                const start = new Date(att.started_at).getTime();
                const end = att.submitted_at ? new Date(att.submitted_at).getTime() : Date.now();
                const diffSec = Math.max(0, Math.floor((end - start) / 1000));
                const qCount = att.randomized_questions.length || 1;
                const avgSpeed = Math.round(diffSec / qCount);
                speedStr = `${avgSpeed} วินาที/ข้อ`;
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                  
                  {/* Doctor Profile card */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                    {avatar ? (
                      <img src={avatar} alt="" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "2px solid var(--accent)", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: "bold", border: "2px solid var(--accent)", flexShrink: 0 }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {rank}
                      </div>
                      {discord && (
                        <div style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: "600", marginTop: "2px" }}>
                          {discord}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.1)", borderRadius: "6px", padding: "10px 12px", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>อีเมลผู้สอบ:</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "500" }}>{email}</span>
                    </div>
                    {att && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>วันที่เริ่มสอบ:</span>
                          <span>{formatDate(att.started_at)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>เวลาที่ใช้ทำข้อสอบ:</span>
                          <span style={{ fontWeight: "bold" }}>{timeStr}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Anti-cheat Telemetry block */}
                  {att && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Anti-cheat Telemetry</span>
                        {att.screen_share_detected || att.focus_lost_count > 3 ? (
                          <span style={{ color: "#ef4444", fontSize: "0.68rem", fontWeight: "bold", background: "rgba(239, 68, 68, 0.1)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(239, 68, 68, 0.2)" }} className="animate-pulse">
                            ⚠️ เฝ้าระวังความเสี่ยง
                          </span>
                        ) : (
                          <span style={{ color: "#22c55e", fontSize: "0.68rem", fontWeight: "bold", background: "rgba(34, 197, 94, 0.1)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                            🔒 สถานะปกติ
                          </span>
                        )}
                      </div>

                      {/* Screen share alert */}
                      {att.screen_share_detected && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "8px 12px", color: "#fca5a5", fontSize: "0.75rem", fontWeight: "bold" }}>
                          <EyeOff size={15} style={{ flexShrink: 0 }} />
                          <span>ตรวจพบความพยายามสตรีม/บันทึกจอ!</span>
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--text-muted)" }}>เปิดหน้าต่างอื่น (Alt+Tab):</span>
                          <span style={{ fontWeight: "bold", color: att.focus_lost_count > 3 ? "#f59e0b" : "#fff" }}>
                            {att.focus_lost_count} ครั้ง
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--text-muted)" }}>ออกจากหน้าจอเดิม:</span>
                          <span style={{ fontWeight: "bold", color: att.screen_share_detected ? "#ef4444" : "#fff" }}>
                            {att.screen_share_detected ? "1" : "0"} ครั้ง
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--text-muted)" }}>คัดลอกคำถาม (Copy/Paste Lock):</span>
                          <span style={{ fontWeight: "bold" }}>0 ครั้ง</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "4px" }}>
                          <span style={{ color: "var(--text-muted)" }}>ความเร็วการตอบคำถาม:</span>
                          <span style={{ fontWeight: "bold" }}>{speedStr}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>การเชื่อมต่อเครือข่ายหลุด:</span>
                          <span style={{ fontWeight: "bold" }}>0 ครั้ง</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Outcomes Decision Box */}
                  {att && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                      
                      {/* Score Result Slider / Indicator */}
                      <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          <span>ผลการประเมินคะแนน:</span>
                          <span style={{ fontWeight: "bold", color: "#fff" }}>
                            {(Number(gradeScore) / (att.randomized_questions.length || 1) * 100).toFixed(0)}% ผ่านเกณฑ์
                          </span>
                        </div>
                        <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#22c55e", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span>{gradeScore} / {att.randomized_questions.length} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>คะแนน</span></span>
                          <span style={{ fontSize: "0.7rem", color: Number(gradeScore) >= (att.randomized_questions.length * 0.7) ? "#22c55e" : "#ef4444", background: Number(gradeScore) >= (att.randomized_questions.length * 0.7) ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                            {Number(gradeScore) >= (att.randomized_questions.length * 0.7) ? "สอบผ่านเกณฑ์" : "ตกเกณฑ์ขั้นต่ำ"}
                          </span>
                        </div>
                      </div>

                      {/* Feedback Comment Input */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: "600" }}>ข้อเสนอแนะเพิ่มเติมจากผู้ตรวจ:</label>
                        <textarea
                          placeholder="กรอกข้อเสนอแนะ คำแนะนำ หรือรายงานพฤติกรรมระหว่างสอบ..."
                          style={{ width: "100%", padding: "8px 12px", fontSize: "0.78rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", resize: "none", minHeight: "70px" }}
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                          disabled={gradingProgress}
                        />
                      </div>

                      {/* Grade Decision Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                        
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ flex: 1, fontSize: "0.75rem", padding: "8px", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "#fbbf24", fontWeight: "bold" }}
                            onClick={() => handleResetAttempt(att.id, email)}
                            disabled={gradingProgress}
                          >
                            🔄 ส่งสอบใหม่ (Reset)
                          </button>
                          
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ flex: 1, fontSize: "0.75rem", padding: "8px", fontWeight: "bold" }}
                            onClick={() => handleGradeAttempt("failed")}
                            disabled={gradingProgress}
                          >
                            ❌ ตัดสิทธิ์สอบ (Fail)
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: "100%", fontSize: "0.78rem", padding: "10px", fontWeight: "bold", background: "#22c55e", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                          onClick={() => handleGradeAttempt("passed")}
                          disabled={gradingProgress}
                        >
                          <ShieldCheck size={15} /> อนุมัติเลื่อนขั้น (Pass)
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              );
            })()
          )}

        </div>

      </div>

      {/* 5. Bottom Section: Recent Exam Graded History Table */}
      <section className="card" style={{ padding: "20px" }}>
        <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={16} style={{ color: "var(--accent)" }} /> ประวัติการสอบล่าสุด
          </h3>
        </div>

        {gradedAttempts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            ไม่พบประวัติผลการสอบที่ได้รับการประเมินในระบบ
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="spreadsheet-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="col-header" style={{ width: "200px" }}>ผู้สมัครสอบ</th>
                  <th className="col-header">ยศสอบเลื่อนขั้น</th>
                  <th className="col-header">วันที่เข้าสอบ</th>
                  <th className="col-header">คะแนนดิบ</th>
                  <th className="col-header" style={{ textAlign: "center" }}>ผลลัพธ์ประเมิน</th>
                  <th className="col-header">เวลาที่ใช้</th>
                  <th className="col-header">ผู้คุมสอบ/ตรวจ</th>
                  <th className="col-header" style={{ textAlign: "center", width: "80px" }}>เรียกดู</th>
                </tr>
              </thead>
              <tbody>
                {gradedAttempts.map((a) => {
                  const doc = doctors.find(d => d.email === a.user_email);
                  
                  return (
                    <tr key={a.id}>
                      <td className="cell">
                        <div style={{ fontWeight: "bold", color: "#fff" }}>{doc ? doc.name : a.user_email}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{a.user_email}</div>
                      </td>
                      <td className="cell">
                        <span 
                          className={a.exam_type === "general_doctor" ? "exam-badge-blue" : "exam-badge-purple"}
                          style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: "bold" }}
                        >
                          {a.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
                        </span>
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                        {formatDate(a.started_at)}
                      </td>
                      <td className="cell" style={{ fontSize: "0.82rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                        {a.score !== null ? `${a.score} ข้อ` : "—"}
                      </td>
                      <td className="cell text-center" style={{ textAlign: "center" }}>
                        <span 
                          className={a.status === "passed" ? "exam-badge-green" : "exam-badge-red"}
                          style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: "bold" }}
                        >
                          {a.status === "passed" ? "สอบผ่าน ✅" : "ตกเกณฑ์ ❌"}
                        </span>
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem" }}>
                        {getExamDurationStr(a)}
                      </td>
                      <td className="cell" style={{ fontSize: "0.78rem" }}>
                        {a.graded_by || "—"}
                      </td>
                      <td className="cell text-center" style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px" }}
                          onClick={() => {
                            const candidateItem: CandidateItem = {
                              email: a.user_email,
                              name: doc ? doc.name : a.user_email,
                              avatarUrl: doc?.avatarUrl,
                              discordUsername: doc?.discordUsername,
                              status: a.status as any,
                              examType: a.exam_type,
                              startedAt: a.started_at,
                              attempt: a
                            };
                            selectCandidate(candidateItem);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ======================= MODAL 1: QUESTION POOL MANAGER ======================= */}
      {/* ========================================================================= */}
      {showQuestionPool && (
        <div className="exam-popup-backdrop" onClick={() => setShowQuestionPool(false)}>
          <div className="exam-popup-card" style={{ maxWidth: "750px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ padding: "20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#fff", margin: 0 }}>
                  📂 คลังโจทย์ข้อสอบเลื่อนขั้นแพทย์
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  แก้ไข เพิ่ม ลบ และเปลี่ยนหมวดคำถามสอบแพทย์ในคลังระบบสุ่มเขียนตอบ
                </p>
              </div>
              <button className="inbox-close-btn" style={{ padding: "4px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setShowQuestionPool(false)}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Sub Bar: Search & Add Trigger */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", width: "250px" }}>
                <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="ค้นหาโจทย์ข้อเขียน..."
                  style={{ width: "100%", padding: "6px 12px 6px 30px", fontSize: "0.78rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none" }}
                  value={poolSearchQuery}
                  onChange={(e) => setPoolSearchQuery(e.target.value)}
                />
              </div>

              {!showQuestionForm && (
                <button 
                  className="btn btn-primary"
                  style={{ fontSize: "0.75rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={() => {
                    setQuestionId(null);
                    setQuestionText("");
                    setExamType("general_doctor");
                    setShowQuestionForm(true);
                  }}
                >
                  <Plus size={14} /> เพิ่มโจทย์ข้อสอบใหม่
                </button>
              )}
            </div>

            {/* Nested Inline Question CRUD Form */}
            {showQuestionForm && (
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid var(--border-subtle)" }}>
                <form onSubmit={handleSaveQuestion} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ fontSize: "0.82rem", fontWeight: "bold", margin: 0 }}>
                      {questionId ? "📝 แก้ไขโจทย์ข้อสอบแพทย์" : "➕ เพิ่มโจทย์ข้อสอบใหม่เข้าคลัง"}
                    </h4>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "2px 8px" }} onClick={() => setShowQuestionForm(false)}>
                      ปิดฟอร์ม
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>ระดับยศสอบเลื่อนขั้น:</label>
                      <select
                        style={{ width: "100%", padding: "8px 10px", fontSize: "0.78rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                      >
                        <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                        <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>รายละเอียดโจทย์คำถามเขียนตอบ:</label>
                      <input
                        type="text"
                        placeholder="เช่น จงอธิบายกระบวนการสลับเคสกรณีที่มีหมอ OP และหมอสตอรี่อยู่หน้าเวร..."
                        style={{ width: "100%", padding: "8px 10px", fontSize: "0.78rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none" }}
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "0.72rem", padding: "6px 12px" }}
                      onClick={() => setShowQuestionForm(false)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ fontSize: "0.72rem", padding: "6px 12px", fontWeight: "bold" }}
                    >
                      บันทึกข้อสอบ
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Scrollable Questions list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const filteredQuestions = questions.filter(q => 
                  q.question_text.toLowerCase().includes(poolSearchQuery.toLowerCase())
                );
                
                if (filteredQuestions.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      ไม่พบคำถามที่ต้องการค้นหา
                    </div>
                  );
                }

                return filteredQuestions.map((q) => (
                  <div key={q.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "14px 18px", background: "rgba(255,255,255,0.01)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span 
                          className={q.exam_type === "general_doctor" ? "exam-badge-blue" : "exam-badge-purple"}
                          style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "10px", fontSize: "0.62rem", fontWeight: "bold" }}
                        >
                          {q.exam_type === "general_doctor" ? "แพทย์ทั่วไป" : "แพทย์ชำนาญการ"}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          ID: {q.id.substring(0, 8)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "#fff", margin: 0, fontWeight: 500, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {q.question_text}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button 
                        className="btn btn-ghost"
                        style={{ padding: "6px", borderRadius: "6px" }}
                        onClick={() => handleEditClick(q)}
                        title="แก้ไขโจทย์"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ padding: "6px", borderRadius: "6px" }}
                        onClick={() => handleDeleteClick(q)}
                        title="ลบคำถาม"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 20px", background: "#090f1d", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" style={{ fontSize: "0.78rem" }} onClick={() => setShowQuestionPool(false)}>
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= MODAL 2: ASSIGN EXAM INVITE ======================= */}
      {/* ========================================================================= */}
      {showAssignExam && (
        <div className="exam-popup-backdrop" onClick={() => setShowAssignExam(false)}>
          <div className="exam-popup-card" style={{ maxWidth: "550px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", margin: 0 }}>
                ✉️ มอบหมายสิทธิ์สอบเลื่อนขั้นใหม่
              </h3>
              <button className="inbox-close-btn" style={{ padding: "4px", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setShowAssignExam(false)}>
                <XCircle size={18} />
              </button>
            </div>

            {/* Form content */}
            <form onSubmit={handleAssignExam} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>เลือกแพทย์ผู้รับสิทธิ์สอบ:</label>
                <select
                  className="exam-select"
                  style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", cursor: "pointer" }}
                  value={selectedDoctorEmail}
                  onChange={(e) => setSelectedDoctorEmail(e.target.value)}
                  required
                >
                  <option value="">-- ค้นหาและเลือกอีเมลแพทย์ประจำการ --</option>
                  {doctors.map((doc) => (
                    <option key={doc.email} value={doc.email}>
                      {doc.name} ({doc.email}) {doc.discordUsername ? `@\${doc.discordUsername}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>ระดับชั้นข้อสอบ:</label>
                  <select
                    style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", cursor: "pointer" }}
                    value={assignExamType}
                    onChange={(e) => setAssignExamType(e.target.value)}
                  >
                    <option value="general_doctor">แพทย์ทั่วไป (Doctor)</option>
                    <option value="specialist_doctor">แพทย์ชำนาญการ (Specialist)</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>จำนวนคำถามที่จะสุ่ม:</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", fontFamily: "var(--font-mono)" }}
                    value={assignQuestionCount}
                    onChange={(e) => setAssignQuestionCount(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>หัวข้อจดหมาย (มีค่าเริ่มต้นให้):</label>
                <input
                  type="text"
                  placeholder="เช่น ใบสิทธิ์สอบวัดผลเลื่อนยศแพทย์..."
                  style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none" }}
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)" }}>เนื้อหากติกา/คำชี้แจง (มีค่าเริ่มต้นให้):</label>
                <textarea
                  placeholder="รายละเอียดกติกาการสอบและข้อแนะนำความปลอดภัย..."
                  style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", resize: "none", minHeight: "80px" }}
                  value={assignContent}
                  onChange={(e) => setAssignContent(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: "0.8rem" }} onClick={() => setShowAssignExam(false)}>
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}
                  disabled={assigning || !selectedDoctorEmail}
                >
                  <Send size={14} /> {assigning ? "กำลังส่ง..." : "ส่งจดหมายเชิญสอบเข้า Inbox"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
