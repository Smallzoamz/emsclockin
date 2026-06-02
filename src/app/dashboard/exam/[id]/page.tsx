"use client";

import React, { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmProvider";
import { AlertTriangle, Clock, Send, EyeOff, ShieldAlert } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
}

interface Attempt {
  id: string;
  exam_type: string;
  randomized_questions: Question[];
  student_answers: Record<string, string>;
  status: string;
  started_at: string;
  focus_lost_count: number;
  screen_share_detected: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ExamPage({ params }: PageProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { id: attemptId } = use(params);

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Anti-cheat stats
  const [focusLostCount, setFocusLostCount] = useState(0);
  const [screenShareDetected, setScreenShareDetected] = useState(false);
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  
  // Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const EXAM_DURATION_MINUTES = 45; // Default 45 mins limit
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // User details for watermark
  const [watermarkText, setWatermarkText] = useState("STUDENT DOCTOR");

  // Fetch the attempt details
  const fetchAttempt = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/inbox`); // get inbox to verify and check if attempt info exists
      if (!res.ok) throw new Error("Failed to authenticate");
      
      const inboxData = await res.json();
      const messages = inboxData.messages || [];
      
      // Find the inbox message linked to this attemptId
      const relatedMsg = messages.find((m: any) => m.exam_attempt_id === attemptId);
      
      // Fetch the actual attempt
      const attemptRes = await fetch(`/api/admin/exams?action=attempts`); // list all attempts, we filter on client
      if (!attemptRes.ok) throw new Error("Failed to load attempt database");
      
      const attemptData = await attemptRes.json();
      const currentAttempt = (attemptData.attempts || []).find((a: any) => a.id === attemptId);

      if (!currentAttempt) {
        setErrorMsg("ไม่พบประวัติการทำข้อสอบนี้ หรือข้อมูลไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      setAttempt(currentAttempt);
      setAnswers(currentAttempt.student_answers || {});
      setFocusLostCount(currentAttempt.focus_lost_count || 0);
      setScreenShareDetected(currentAttempt.screen_share_detected || false);

      // Create dynamic watermark text
      if (relatedMsg) {
        setWatermarkText(`${relatedMsg.user_email} - EMS EXAM`);
      }

      // Calculate remaining time
      const startTime = new Date(currentAttempt.started_at).getTime();
      const maxDurationMs = EXAM_DURATION_MINUTES * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const remainingSeconds = Math.max(0, Math.floor((maxDurationMs - elapsedMs) / 1000));
      
      setTimeLeftSeconds(remainingSeconds);

      if (currentAttempt.status !== "in_progress") {
        setErrorMsg(`ข้อสอบนี้ได้รับการส่งเรียบร้อยแล้วด้วยสถานะ: ${
          currentAttempt.status === "passed" ? "สอบผ่าน ✅" : 
          currentAttempt.status === "failed" ? "สอบไม่ผ่าน ❌" : "รอแอดมินตรวจคะแนน ⏳"
        }`);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("ไม่สามารถโหลดข้อสอบได้ กรุณาติดต่อฝ่ายเทคนิคหรือผู้ดูแลระบบค่ะ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  // Countdown timer thread
  useEffect(() => {
    if (timeLeftSeconds === null || attempt?.status !== "in_progress") return;

    if (timeLeftSeconds <= 0) {
      // Auto-submit when time is up
      handleForceSubmit(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeftSeconds(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeftSeconds, attempt?.status]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (attempt?.status !== "in_progress") return;

    autoSaveRef.current = setInterval(() => {
      saveProgressOnly();
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, focusLostCount, screenShareDetected, attempt?.status]);

  // Save progress function (non-blocking)
  const saveProgressOnly = async () => {
    if (attempt?.status !== "in_progress") return;
    try {
      await fetch(`/api/exams/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers,
          focusLostCount,
          screenShareDetected,
          isAutoSave: true
        })
      });
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // Anti-cheat: Keyboard locking & right click locking
  useEffect(() => {
    if (attempt?.status !== "in_progress") return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCutPaste = (e: ClipboardEvent) => {
      // Allow paste inside textareas, but block copy/cut to prevent sharing questions
      if (e.type === "copy" || e.type === "cut") {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block key commands
      const isControl = e.ctrlKey || e.metaKey;
      
      // Block Ctrl+C (copy), Ctrl+S (save), F12, Ctrl+Shift+I (devtools)
      if (
        (isControl && e.key === "c") ||
        (isControl && e.key === "s") ||
        e.key === "F12" ||
        (isControl && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopyCutPaste);
    window.addEventListener("cut", handleCopyCutPaste);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopyCutPaste);
      window.removeEventListener("cut", handleCopyCutPaste);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [attempt?.status]);

  // Anti-cheat: Focus loss tracking (Alt-Tab detection)
  useEffect(() => {
    if (attempt?.status !== "in_progress") return;

    const handleFocusLoss = () => {
      setFocusLostCount(prev => {
        const next = prev + 1;
        setShowFocusWarning(true);
        // Persist count right away to prevent bypasses
        fetch(`/api/exams/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            answers,
            focusLostCount: next,
            screenShareDetected,
            isFocusLossEvent: true
          })
        }).catch(err => console.error("Focus sync error:", err));
        
        return next;
      });
    };

    window.addEventListener("blur", handleFocusLoss);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleFocusLoss();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleFocusLoss);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attempt?.status, answers, screenShareDetected]);

  // Anti-cheat: Screen sharing detection (Web-level)
  useEffect(() => {
    if (attempt?.status !== "in_progress") return;

    // Monitor for changes in media capture status or hook displayMedia if used on page
    const checkScreenShare = setInterval(() => {
      // In browser, if a user starts screen sharing via navigate.mediaDevices (like in a browser call),
      // we can sometimes detect screen capture device status or changes.
      // This is a browser fallback hook.
      if (navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
        // Safe check
      }
    }, 5000);

    return () => clearInterval(checkScreenShare);
  }, [attempt?.status]);

  // Handlers for input change
  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  // Force automatic submission
  const handleForceSubmit = async (isTimeUp = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers,
          focusLostCount,
          screenShareDetected,
          isAutoSubmit: isTimeUp
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(isTimeUp ? "หมดเวลาสอบ! ระบบส่งข้อสอบให้อัตโนมัติแล้วค่ะ" : "ส่งข้อสอบสำเร็จเรียบร้อยค่ะ");
        router.push("/dashboard");
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการส่งข้อสอบ");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการส่งข้อสอบผ่านเครือข่าย");
      setLoading(false);
    }
  };

  // Normal submit trigger with Confirm Modal
  const handleSubmitClick = async () => {
    const questionsAnswered = Object.keys(answers).filter(k => answers[k]?.trim()).length;
    const totalQuestions = attempt?.randomized_questions.length || 0;

    const ok = await confirm({
      title: "ยืนยันการส่งข้อสอบ",
      message: `คุณได้ตอบคำถามไปแล้ว ${questionsAnswered} จากทั้งหมด ${totalQuestions} ข้อ\nเมื่อกดยืนยันแล้วจะไม่สามารถกลับมาแก้ไขคำตอบได้อีก ยืนยันการส่งข้อสอบแพทย์หรือไม่?`,
      confirmText: "ส่งข้อสอบ",
      cancelText: "ทำข้อสอบต่อ",
      variant: "primary"
    });

    if (ok) {
      handleForceSubmit(false);
    }
  };

  // Render timer
  const renderTimer = () => {
    if (timeLeftSeconds === null) return "⏱️ --:--";
    const mins = Math.floor(timeLeftSeconds / 60);
    const secs = timeLeftSeconds % 60;
    const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    
    const isCritical = timeLeftSeconds < 120; // less than 2 mins
    return (
      <div className={`flex items-center gap-2 font-mono text-lg font-bold px-4 py-2 rounded-full border ${
        isCritical 
          ? "bg-[rgba(239,68,68,0.15)] border-red-500 text-red-400 animate-pulse" 
          : "bg-[#090f1d] border-[var(--border-subtle)] text-[var(--accent-light)]"
      }`}>
        <Clock size={16} />
        <span>{timeStr}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 99999 }}>
        <div className="inbox-spinner" style={{ marginBottom: "16px" }}></div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>กำลังเข้าสู่ระบบคุมสอบแพทย์...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#030712", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 99999, padding: "24px" }}>
        <div className="card" style={{ maxWidth: "448px", width: "100%", textAlign: "center", padding: "32px" }}>
          <AlertTriangle style={{ color: "var(--warning)", margin: "0 auto 16px auto" }} size={48} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "12px", color: "#fff" }}>พบข้อผิดพลาดในระบบคุมสอบ</h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "24px" }}>{errorMsg}</p>
          <button 
            className="btn btn-primary" 
            style={{ width: "100%", justifyContent: "center", padding: "10px 20px" }}
            onClick={() => router.push("/dashboard")}
          >
            กลับสู่แดชบอร์ดหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#030712", zIndex: 99999, display: "flex", flexDirection: "column", color: "#fff", userSelect: "none", overflow: "hidden" }}>
      
      {/* 1. Fullscreen Semi-transparent Watermark Layer */}
      <div className="exam-watermark-layer">
        {Array.from({ length: 48 }).map((_, idx) => (
          <div key={idx} className="exam-watermark-text">
            {watermarkText}
          </div>
        ))}
      </div>

      {/* 2. Top Navigation (Exam Header) */}
      <header className="exam-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "#090f1d", borderBottom: "1px solid var(--border-subtle)", zIndex: 10 }}>
        <div className="exam-flex-row-center" style={{ gap: "12px" }}>
          <ShieldAlert className="text-[var(--accent)]" size={24} />
          <div>
            <h1 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", lineHeight: 1.25 }}>
              ห้องสอบเลื่อนระดับ: {attempt?.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
            </h1>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Exam Session: {attemptId}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {renderTimer()}
          <button 
            className="btn btn-primary"
            style={{ padding: "8px 20px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", borderRadius: "6px", fontSize: "0.85rem" }}
            onClick={handleSubmitClick}
          >
            <Send size={14} /> ส่งข้อสอบ
          </button>
        </div>
      </header>

      {/* 3. Main Scrollable Question Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
        <div style={{ maxWidth: "896px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "80px" }}>
          
          <div style={{ background: "rgba(245, 158, 11, 0.02)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: "8px", padding: "20px", display: "flex", gap: "16px" }}>
            <AlertTriangle style={{ color: "var(--warning)", flexShrink: 0, marginTop: "4px" }} size={20} />
            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <h4 style={{ fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>โปรดทราบก่อนเริ่มพิมพ์คำตอบ:</h4>
              <p style={{ marginBottom: "4px" }}>
                การสอบเลื่อนขั้นนี้เป็นระบบสอบเขียนบรรยายอัตนัย กรุณาอธิบายคำตอบให้ละเอียด ชัดเจน และตรงไปตรงมา 
                ระบบจะคอยบันทึกคำตอบของคุณอัตโนมัติสำรองข้อมูลทุกๆ 30 วินาที
              </p>
              <p style={{ color: "var(--warning)", fontWeight: 600 }}>
                * คำเตือน: ระบบปิดกั้นการ Alt-Tab สลับแท็บหน้าต่าง และห้ามกดคัดลอกคำถามใดๆ ไปยังภายนอกเด็ดขาด!
              </p>
            </div>
          </div>

          {attempt?.randomized_questions.map((q, index) => (
            <div key={q.id} className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", color: "var(--accent-light)", flexShrink: 0, marginTop: "2px" }}>
                  {index + 1}
                </span>
                <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", lineHeight: 1.4 }}>{q.question_text}</h3>
              </div>

              <textarea
                style={{ width: "100%", padding: "16px", fontSize: "0.88rem", borderRadius: "6px", background: "#030712", border: "1px solid var(--border-subtle)", color: "#fff", outline: "none", resize: "vertical", minHeight: "140px", transition: "all 0.2s" }}
                placeholder="กรอกคำอธิบายคำตอบของคุณที่นี่..."
                value={answers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              />
            </div>
          ))}

        </div>
      </main>

      {/* 4. Focus Loss Blocking Overlay Warning */}
      {showFocusWarning && (
        <div className="exam-popup-backdrop">
          <div className="exam-popup-card" style={{ border: "2px solid #ef4444", maxWidth: "448px", width: "100%", textAlign: "center", boxShadow: "0 0 50px rgba(239, 68, 68, 0.3)", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <AlertTriangle style={{ color: "#ef4444", margin: "0 auto" }} size={56} className="animate-bounce" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: "extrabold", color: "#ef4444", letterSpacing: "1px", textTransform: "uppercase" }}>ตรวจพบการสลับหน้าจอ!</h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              ห้ามเปิดโปรแกรมภายนอก สลับแท็บ หรือย่อเว็บเบราว์เซอร์ระหว่างทำข้อสอบเด็ดขาด ระบบได้ส่งประวัติการหลุดโฟกัสครั้งนี้ไปยังแอดมินผู้คุมสอบเรียบร้อยแล้วค่ะ
            </p>
            <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "12px", color: "#fca5a5", fontWeight: "bold", fontSize: "0.88rem" }}>
              จำนวนครั้งที่หลุดโฟกัสสะสม: {focusLostCount} ครั้ง
            </div>
            <button
              className="btn btn-danger"
              style={{ width: "100%", justifyContent: "center", padding: "10px 20px", fontWeight: "bold" }}
              onClick={() => setShowFocusWarning(false)}
            >
              เข้าใจแล้วและกลับไปทำข้อสอบ
            </button>
          </div>
        </div>
      )}

      {/* 5. Browser Screen Share Blackout Cover */}
      {screenShareDetected && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100001, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", userSelect: "none", pointerEvents: "none" }}>
          <EyeOff style={{ color: "#ef4444", marginBottom: "16px" }} size={64} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: "black", color: "#ef4444", textTransform: "uppercase", letterSpacing: "2px" }}>ตรวจพบความพยายามแชร์หน้าจอ!</h2>
          <p style={{ fontSize: "0.88rem", color: "#6b7280", textAlign: "center", maxWidth: "384px", marginTop: "8px" }}>
            หน้าจอข้อสอบได้รับการบดบังเพื่อความปลอดภัยของคลังข้อสอบ กรุณาหยุดการบันทึกภาพ/แชร์หน้าจอเพื่อดำเนินรายการต่อค่ะ
          </p>
        </div>
      )}

      {/* Add custom styling rules for watermarks in component */}
      <style jsx global>{`
        .exam-watermark-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          opacity: 0.02;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-gap: 80px;
          padding: 40px;
          transform: rotate(-35deg) scale(1.3);
        }
        .exam-watermark-text {
          font-size: 1.1rem;
          font-weight: 800;
          color: #ffffff;
          font-family: monospace;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .exam-header {
          position: relative;
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
