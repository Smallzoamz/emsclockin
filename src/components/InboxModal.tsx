"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Mail, MailOpen, X, ChevronRight, FileText, CheckCircle, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender_name: string;
  title: string;
  content: string;
  type: string;
  exam_type: string;
  exam_question_count: number;
  is_read: boolean;
  exam_attempt_id: string | null;
  created_at: string;
  exam_attempts?: {
    status: string;
    score: number | null;
    started_at: string;
    submitted_at: string | null;
  } | null;
}

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InboxModal({ isOpen, onClose }: InboxModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [startingExam, setStartingExam] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch inbox messages
  const fetchMessages = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setErrorMsg("Failed to load messages");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setSelectedMessage(null);
    }
  }, [isOpen]);

  // Mark message as read
  const markAsRead = async (msg: Message) => {
    if (msg.is_read) return;
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, isRead: true })
      });
      if (res.ok) {
        // Update local state
        setMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m)
        );
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  // Start exam session
  const handleStartExam = async (msg: Message) => {
    if (startingExam) return;
    setStartingExam(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxMessageId: msg.id })
      });
      const data = await res.json();
      if (res.ok && data.success && data.attempt) {
        onClose();
        // Redirect to exam screen
        router.push(`/dashboard/exam/${data.attempt.id}`);
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการเริ่มทำข้อสอบ");
      }
    } catch (err) {
      console.error("Error starting exam:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อระบบสอบ");
    } finally {
      setStartingExam(false);
    }
  };

  const handleSelectMessage = (msg: Message) => {
    setSelectedMessage(msg);
    markAsRead(msg);
  };

  // Format date
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " น.";
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="inbox-drawer-backdrop" onClick={onClose}>
      <div className="inbox-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="inbox-drawer-header">
          <div className="flex items-center gap-2">
            <Mail className="text-[var(--accent)]" size={20} />
            <h2 className="text-lg font-bold text-white">กล่องจดหมาย (Inbox)</h2>
          </div>
          <button className="inbox-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="inbox-drawer-body">
          {errorMsg && (
            <div className="inbox-error-banner">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {selectedMessage ? (
            /* Detailed View */
            <div className="inbox-detail-view">
              <button 
                className="inbox-back-btn" 
                onClick={() => setSelectedMessage(null)}
              >
                ← ย้อนกลับกล่องจดหมาย
              </button>

              <div className="inbox-detail-card">
                <div className="inbox-detail-meta">
                  <span className="inbox-detail-sender">
                    👤 ผู้ส่ง: {selectedMessage.sender_name}
                  </span>
                  <span className="inbox-detail-date">
                    📅 {formatDate(selectedMessage.created_at)}
                  </span>
                </div>
                <h3 className="inbox-detail-title">{selectedMessage.title}</h3>
                
                <div className="inbox-detail-content">
                  {selectedMessage.content.split("\n").map((line, idx) => (
                    <p key={idx} className="mb-2 text-[var(--text-secondary)]">{line}</p>
                  ))}
                </div>

                {/* If type is Exam, show Exam control card */}
                {selectedMessage.type === "exam" && (
                  <div className="inbox-exam-action-card">
                    <div className="flex items-center gap-2 mb-3 text-[var(--accent)]">
                      <FileText size={18} />
                      <span className="font-semibold text-sm">ข้อมูลการทดสอบวัดผล</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-[var(--text-secondary)]">
                      <div className="bg-[rgba(255,255,255,0.02)] p-2 rounded">
                        ประเภท: <strong className="text-white">
                          {selectedMessage.exam_type === "general_doctor" ? "แพทย์ทั่วไป (Doctor)" : "แพทย์ชำนาญการ (Specialist)"}
                        </strong>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.02)] p-2 rounded">
                        จำนวนข้อสอบ: <strong className="text-white">{selectedMessage.exam_question_count || 5} ข้อ (เขียนตอบ)</strong>
                      </div>
                    </div>

                    {selectedMessage.exam_attempts ? (
                      /* If already attempted */
                      <div className="inbox-exam-status">
                        {selectedMessage.exam_attempts.status === "in_progress" ? (
                          <button
                            className="inbox-btn-exam btn-primary"
                            onClick={() => handleStartExam(selectedMessage)}
                            disabled={startingExam}
                          >
                            <Play size={14} /> {startingExam ? "กำลังเข้าสู่ห้องสอบ..." : "ทำข้อสอบต่อที่ค้างไว้"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-green-400 p-2 bg-[rgba(34,197,94,0.05)] rounded border border-[rgba(34,197,94,0.15)] text-sm">
                            <CheckCircle size={16} />
                            <span>
                              ส่งข้อสอบเรียบร้อยแล้ว ({selectedMessage.exam_attempts.status === "passed" ? "สอบผ่าน ✅" : 
                               selectedMessage.exam_attempts.status === "failed" ? "สอบไม่ผ่าน ❌" : "รอแอดมินตรวจคะแนน ⏳"})
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* If new attempt */
                      <div className="inbox-exam-rules-confirm">
                        <div className="text-xs text-[var(--text-secondary)] bg-[rgba(245,158,11,0.03)] border border-[rgba(245,158,11,0.15)] p-3 rounded mb-4">
                          <h4 className="font-semibold text-[var(--warning)] mb-1 flex items-center gap-1">
                            ⚠️ กฎระเบียบและข้อควรระวังขณะสอบ:
                          </h4>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>การสอบจะจับเวลาถอยหลัง หากหมดเวลาจะส่งคำตอบอัตโนมัติ</li>
                            <li><strong>ห้ามสลับหน้าจอนอกหน้าต่างสอบ (Alt-Tab) เด็ดขาด</strong> ระบบจะตรวจจับและรายงานแอดมินทันทีหากมีการหลุดโฟกัส</li>
                            <li><strong>ระบบบล็อกการคัดลอก คัดลอกข้อความ หรือคลิกขวา</strong></li>
                            <li>ตรวจพบการแชร์หน้าจอ/สตรีมหน้าจอผ่านเว็บเบราว์เซอร์ใดๆ หน้าจอข้อสอบจะถูกปิดบังทันที</li>
                          </ul>
                        </div>

                        <button
                          className="inbox-btn-exam btn-primary w-full"
                          onClick={() => handleStartExam(selectedMessage)}
                          disabled={startingExam}
                        >
                          <Play size={14} /> {startingExam ? "กำลังสุ่มคลังข้อสอบ..." : "ยอมรับกฎระเบียบ & เริ่มทำข้อสอบ"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Inbox List View */
            <div className="inbox-list-view">
              {loading ? (
                <div className="inbox-loading">
                  <div className="inbox-spinner"></div>
                  <span>กำลังดึงข้อมูลจดหมาย...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="inbox-empty-state">
                  <div className="inbox-empty-icon-wrapper">
                    <MailOpen size={48} className="text-[var(--text-secondary)] opacity-30" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">กล่องจดหมายของคุณว่างเปล่า</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    เมื่อได้รับการอนุมัติสิทธิ์สอบเลื่อนขั้นหรือแจ้งผลสอบ จดหมายจะปรากฏที่นี่ค่ะ
                  </p>
                </div>
              ) : (
                <div className="inbox-message-list">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`inbox-message-item ${msg.is_read ? "read" : "unread"} ${msg.type === "exam" ? "exam-type" : ""}`}
                      onClick={() => handleSelectMessage(msg)}
                    >
                      <div className="inbox-message-item-icon">
                        {msg.type === "exam" ? (
                          <FileText size={18} className="text-[var(--accent)]" />
                        ) : msg.is_read ? (
                          <MailOpen size={18} className="text-[var(--text-secondary)]" />
                        ) : (
                          <Mail size={18} className="text-[var(--accent)]" />
                        )}
                      </div>
                      
                      <div className="inbox-message-item-content">
                        <div className="inbox-message-item-header">
                          <span className="inbox-message-sender">{msg.sender_name}</span>
                          <span className="inbox-message-time">{formatDate(msg.created_at)}</span>
                        </div>
                        <h4 className="inbox-message-title">{msg.title}</h4>
                        <p className="inbox-message-snippet">
                          {msg.content.substring(0, 75)}{msg.content.length > 75 ? "..." : ""}
                        </p>

                        {msg.type === "exam" && (
                          <div className="inbox-exam-badge">
                            {msg.exam_attempts?.status === "passed" ? "สอบผ่าน ✅" :
                             msg.exam_attempts?.status === "failed" ? "สอบไม่ผ่าน ❌" :
                             msg.exam_attempts?.status === "submitted" ? "รอตรวจคะแนน ⏳" :
                             msg.exam_attempts?.status === "in_progress" ? "กำลังทำค้างไว้ ⏳" : "ยังไม่ได้ทำ ✍️"}
                          </div>
                        )}
                      </div>

                      <div className="inbox-message-chevron">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
