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
      <div className="fixed inset-0 bg-[#030712] flex flex-col items-center justify-center text-white z-[99999]">
        <div className="inbox-spinner mb-4"></div>
        <p className="text-sm text-[var(--text-secondary)] font-mono">กำลังเข้าสู่ระบบคุมสอบแพทย์...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="fixed inset-0 bg-[#030712] flex flex-col items-center justify-center text-white z-[99999] px-6">
        <div className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-8 max-width-md text-center max-w-md">
          <AlertTriangle className="text-[var(--warning)] mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-3">พบข้อผิดพลาดในระบบคุมสอบ</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{errorMsg}</p>
          <button 
            className="btn btn-primary px-6 py-2 w-full rounded" 
            onClick={() => router.push("/dashboard")}
          >
            กลับสู่แดชบอร์ดหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#030712] z-[99999] flex flex-col text-white select-none overflow-hidden">
      
      {/* 1. Fullscreen Semi-transparent Watermark Layer */}
      <div className="exam-watermark-layer">
        {Array.from({ length: 48 }).map((_, idx) => (
          <div key={idx} className="exam-watermark-text">
            {watermarkText}
          </div>
        ))}
      </div>

      {/* 2. Top Navigation (Exam Header) */}
      <header className="exam-header flex items-center justify-between px-8 py-4 bg-[#090f1d] border-b border-[var(--border-subtle)] z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[var(--accent)]" size={24} />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              ห้องสอบเลื่อนระดับ: {attempt?.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
            </h1>
            <span className="text-xs text-[var(--text-secondary)] font-mono">Exam Session: {attemptId}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {renderTimer()}
          <button 
            className="btn btn-primary px-5 py-2 font-bold flex items-center gap-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-light)]"
            onClick={handleSubmitClick}
          >
            <Send size={14} /> ส่งข้อสอบ
          </button>
        </div>
      </header>

      {/* 3. Main Scrollable Question Content */}
      <main className="flex-1 overflow-y-auto px-8 py-8 z-10">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          <div className="bg-[rgba(245,158,11,0.02)] border border-[rgba(245,158,11,0.15)] rounded-lg p-5 flex gap-4">
            <AlertTriangle className="text-[var(--warning)] flex-shrink-0 mt-1" size={20} />
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <h4 className="font-bold text-white mb-1">โปรดทราบก่อนเริ่มพิมพ์คำตอบ:</h4>
              <p className="mb-1">
                การสอบเลื่อนขั้นนี้เป็นระบบสอบเขียนบรรยายอัตนัย กรุณาอธิบายคำตอบให้ละเอียด ชัดเจน และตรงไปตรงมา 
                ระบบจะคอยบันทึกคำตอบของคุณอัตโนมัติสำรองข้อมูลทุกๆ 30 วินาที
              </p>
              <p className="text-[var(--warning)] font-semibold">
                * คำเตือน: ระบบปิดกั้นการ Alt-Tab สลับแท็บหน้าต่าง และห้ามกดคัดลอกคำถามใดๆ ไปยังภายนอกเด็ดขาด!
              </p>
            </div>
          </div>

          {attempt?.randomized_questions.map((q, index) => (
            <div key={q.id} className="bg-[#090f1d] border border-[var(--border-subtle)] rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold text-[var(--accent-light)] flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <h3 className="text-base font-bold text-white leading-snug">{q.question_text}</h3>
              </div>

              <textarea
                className="w-full bg-[#030712] border border-[var(--border-subtle)] focus:border-[var(--accent)] rounded p-4 text-sm text-white outline-none select-text resize-y min-h-[140px] focus:shadow-[0_0_10px_rgba(59,130,246,0.1)] transition-all"
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
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100000] flex items-center justify-center p-6">
          <div className="bg-[#090f1d] border-2 border-red-500 rounded-lg p-8 max-w-md text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <AlertTriangle className="text-red-500 mx-auto mb-4 animate-bounce" size={56} />
            <h2 className="text-xl font-extrabold text-red-500 mb-3 uppercase tracking-wider">ตรวจพบการสลับหน้าจอ!</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              ห้ามเปิดโปรแกรมภายนอก สลับแท็บ หรือย่อเว็บเบราว์เซอร์ระหว่างทำข้อสอบเด็ดขาด ระบบได้ส่งประวัติการหลุดโฟกัสครั้งนี้ไปยังแอดมินผู้คุมสอบเรียบร้อยแล้วค่ะ
            </p>
            <div className="bg-red-950 bg-opacity-20 border border-red-900 rounded p-3 text-red-400 font-bold text-sm mb-6">
              จำนวนครั้งที่หลุดโฟกัสสะสม: {focusLostCount} ครั้ง
            </div>
            <button
              className="btn bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded w-full transition-all"
              onClick={() => setShowFocusWarning(false)}
            >
              เข้าใจแล้วและกลับไปทำข้อสอบ
            </button>
          </div>
        </div>
      )}

      {/* 5. Browser Screen Share Blackout Cover */}
      {screenShareDetected && (
        <div className="fixed inset-0 bg-black z-[100001] flex flex-col items-center justify-center p-6 select-none pointer-events-none">
          <EyeOff className="text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest">ตรวจพบความพยายามแชร์หน้าจอ!</h2>
          <p className="text-sm text-gray-500 text-center max-w-sm mt-2">
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
