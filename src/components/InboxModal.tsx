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
  contract_id?: string | null;
  medical_contracts?: {
    id: string;
    doctor_email: string;
    doctor_name: string;
    doctor_discord_id: string;
    doctor_discord_username: string;
    title: string;
    content: string;
    status: string;
    signature_name: string | null;
    signed_at: string | null;
    created_by: string;
    created_at: string;
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
  const [typedSignature, setTypedSignature] = useState("");
  const [respondingContract, setRespondingContract] = useState(false);

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
    setTypedSignature(""); // reset signature on selection
  };

  const handleRespondContract = async (msg: Message, action: "accepted" | "rejected") => {
    if (!msg.medical_contracts) return;
    
    if (action === "accepted" && (!typedSignature || typedSignature.trim() === "")) {
      alert("กรุณาพิมพ์ชื่อจริง-นามสกุลของคุณเพื่อใช้ในการลงนามยินยอมค่ะ");
      return;
    }

    const confirmMsg = action === "accepted"
      ? `คุณแน่ใจใช่หรือไม่ที่จะกดยินยอมข้อตกลงสัญญา "${msg.medical_contracts.title}"? ระบบจะทำการประทับตราชื่อลายเซ็นอิเล็กทรอนิกส์ของคุณลงในเอกสารโดยทันที`
      : `คุณแน่ใจใช่หรือไม่ที่จะปฏิเสธข้อตกลงสัญญานี้?`;

    if (!window.confirm(confirmMsg)) return;

    setRespondingContract(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/contracts/${msg.medical_contracts.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          signatureName: typedSignature
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(action === "accepted" ? "ลงนามสัญญาเรียบร้อยแล้วค่ะ!" : "ปฏิเสธสัญญาเรียบร้อยแล้วค่ะ");
        
        // Update local state in messages array
        setMessages(prev =>
          prev.map(m => {
            if (m.id === msg.id && m.medical_contracts) {
              return {
                ...m,
                is_read: true,
                medical_contracts: {
                  ...m.medical_contracts,
                  status: action,
                  signature_name: action === "accepted" ? typedSignature : null,
                  signed_at: new Date().toISOString()
                }
              };
            }
            return m;
          })
        );

        // Update selectedMessage state
        setSelectedMessage(prev => {
          if (prev && prev.id === msg.id && prev.medical_contracts) {
            return {
              ...prev,
              is_read: true,
              medical_contracts: {
                ...prev.medical_contracts,
                status: action,
                signature_name: action === "accepted" ? typedSignature : null,
                signed_at: new Date().toISOString()
              }
            };
          }
          return prev;
        });
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการตอบกลับสัญญา");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setRespondingContract(false);
    }
  };

  const handleDownloadDoctorContract = (contract: any) => {
    if (!contract) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#080c18");
    gradient.addColorStop(1, "#030408");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw borders
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

    // Corner decorations
    const drawCorner = (x: number, y: number, w: number, h: number) => {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
    };
    drawCorner(10, 10, 50, 50);
    drawCorner(canvas.width - 10, 10, -50, 50);
    drawCorner(10, canvas.height - 10, 50, -50);
    drawCorner(canvas.width - 10, canvas.height - 10, -50, -50);

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText("FOX COMMUNITY MEDICAL UNIT", canvas.width / 2, 120);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillText("Fox Community Medical Unit (FCMD)", canvas.width / 2, 155);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 185);
    ctx.lineTo(canvas.width - 100, 185);
    ctx.stroke();

    // Document Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText(contract.title, canvas.width / 2, 230);
    
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px Courier, monospace";
    ctx.fillText(`CONTRACT ID: ${contract.id.toUpperCase()}`, canvas.width / 2, 260);

    // Date formatting
    const formattedDate = new Date(contract.created_at).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Bangkok"
    });

    // Body content replacement
    let bodyText = contract.content || "";
    bodyText = bodyText
      .replace(/\[ชื่อแพทย์\]/g, contract.doctor_name)
      .replace(/\[Discord\]/g, `@${contract.doctor_discord_username}`)
      .replace(/\[เลขสัญญา\]/g, contract.id ? contract.id.substring(0, 8).toUpperCase() : "XXXX")
      .replace(/\[ชื่อผู้ลงนาม\]/g, contract.signature_name || "_________________________________")
      .replace(/\[วันที่\]/g, formattedDate);

    // Wrap and draw text
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "15px Arial, sans-serif";
    
    const paragraphs = bodyText.split("\n");
    let y = 310;
    const maxWidth = canvas.width - 160;
    const lineHeight = 26;

    function wrapText(text: string, x: number, startY: number, maxW: number, lineH: number) {
      const words = text.split(" ");
      let line = "";
      let currentY = startY;

      for (let n = 0; n < words.length; n++) {
        if (text.length > 30 && !text.includes(" ")) {
          let i = 0;
          while (i < text.length) {
            const chunk = text.substring(i, i + 55);
            ctx!.fillText(chunk, x, currentY);
            currentY += lineH;
            i += 55;
          }
          return currentY;
        }

        const testLine = line + words[n] + " ";
        const metrics = ctx!.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxW && n > 0) {
          ctx!.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineH;
        } else {
          line = testLine;
        }
      }
      ctx!.fillText(line, x, currentY);
      return currentY + lineH;
    }

    paragraphs.forEach((p: string) => {
      if (p.trim() === "") {
        y += 12;
      } else {
        y = wrapText(p, 80, y, maxWidth, lineHeight);
      }
    });

    y = Math.max(y + 40, 800);

    // Divider before signatures
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(canvas.width - 80, y);
    ctx.stroke();

    y += 40;

    // Management Signature (Left Side)
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText("ผู้ลงนามฝ่ายบริหาร / ผู้ว่าจ้าง", 80, y);

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, y + 35);
    ctx.lineTo(280, y + 35);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(`( ${contract.created_by} )`, 80, y + 55);

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("ฝ่ายบริหารงานบุคคล", 80, y + 75);

    // Doctor Signature (Right Side)
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText("ผู้ยินยอมลงนาม / แพทย์กู้ภัย", canvas.width - 80, y);

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 280, y + 35);
    ctx.lineTo(canvas.width - 80, y + 35);
    ctx.stroke();

    if (contract.status === "accepted" && contract.signature_name) {
      // Draw handwriting style signature
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "italic 32px 'Brush Script MT', 'Courier New', cursive";
      ctx.fillStyle = "#10b981";
      ctx.fillText(contract.signature_name, canvas.width - 180, y + 25);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Arial, sans-serif";
      ctx.fillText(`( ${contract.signature_name} )`, canvas.width - 80, y + 55);

      const signedDate = new Date(contract.signed_at).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok"
      }) + " น.";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(`ลงนามเมื่อ: ${signedDate}`, canvas.width - 80, y + 75);
    }

    // Seal of EMS
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.font = "bold 8px Arial, sans-serif";
    ctx.fillText("OFFICIAL SEAL", canvas.width / 2, y + 35);
    
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, y + 20, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Trigger download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `สัญญาจ้างแพทย์_${contract.doctor_name}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <div className="exam-flex-row-center" style={{ gap: "8px" }}>
            <Mail className="text-[var(--accent)]" size={20} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#fff", margin: 0 }}>กล่องจดหมาย (Inbox)</h2>
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
                  <span style={{ fontWeight: "bold", color: "var(--text-secondary)" }}>
                    👤 ผู้ส่ง: {selectedMessage.sender_name}
                  </span>
                  <span className="inbox-detail-date">
                    📅 {formatDate(selectedMessage.created_at)}
                  </span>
                </div>
                <h3 className="inbox-detail-title">{selectedMessage.title}</h3>
                
                <div className="inbox-detail-content">
                  {selectedMessage.content.split("\n").map((line, idx) => (
                    <p key={idx} style={{ marginBottom: "8px", color: "var(--text-secondary)" }}>{line}</p>
                  ))}
                </div>

                {/* If type is Contract, show Contract control card */}
                {selectedMessage.type === "contract" && selectedMessage.medical_contracts && (
                  <div className="inbox-exam-action-card" style={{ border: "1px solid var(--border-subtle)", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.015)", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className="exam-flex-row-center" style={{ color: "var(--accent-light)", fontWeight: 600, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={18} />
                      <span>รายละเอียดสัญญาปฏิบัติหน้าที่</span>
                    </div>

                    <div style={{ maxHeight: "250px", overflowY: "auto", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, border: "1px solid rgba(255,255,255,0.04)" }}>
                      {selectedMessage.medical_contracts.content.split("\n").map((line, idx) => (
                        <p key={idx} style={{ marginBottom: "8px" }}>{line}</p>
                      ))}
                    </div>

                    {selectedMessage.medical_contracts.status === "pending" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>พิมพ์ชื่อ-นามสกุลจริงเพื่อยอมรับและลงนามสัญญา:</label>
                          <input
                            type="text"
                            placeholder="พิมพ์ชื่อ-นามสกุลจริงของคุณที่นี่"
                            value={typedSignature}
                            onChange={e => setTypedSignature(e.target.value)}
                            style={{
                              padding: "10px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-subtle)",
                              background: "rgba(0,0,0,0.3)",
                              color: "#fff",
                              fontSize: "0.88rem"
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => handleRespondContract(selectedMessage, "rejected")}
                            disabled={respondingContract}
                            className="btn btn-danger"
                            style={{ flex: 1, padding: "10px", fontSize: "0.85rem" }}
                          >
                            ปฏิเสธสัญญา
                          </button>
                          <button
                            onClick={() => handleRespondContract(selectedMessage, "accepted")}
                            disabled={respondingContract}
                            className="btn btn-primary"
                            style={{ flex: 2, padding: "10px", fontSize: "0.85rem", fontWeight: 600 }}
                          >
                            {respondingContract ? "กำลังประทับลงนาม..." : "ยินยอม & ลงนามสัญญา ✅"}
                          </button>
                        </div>
                      </div>
                    ) : selectedMessage.medical_contracts.status === "accepted" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", padding: "10px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "8px", fontSize: "0.85rem" }}>
                          <CheckCircle size={16} />
                          <div>
                            <strong>ลงนามสัญญาเรียบร้อยแล้วค่ะ</strong>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              ลงชื่อ: {selectedMessage.medical_contracts.signature_name} | วันที่: {new Date(selectedMessage.medical_contracts.signed_at || "").toLocaleDateString("th-TH")}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadDoctorContract(selectedMessage.medical_contracts)}
                          className="btn btn-primary"
                          style={{ width: "100%", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 600 }}
                        >
                          <FileText size={16} style={{ color: "#000" }} />
                          ดาวน์โหลดเอกสารสัญญา (PNG)
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger)", padding: "10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", fontSize: "0.85rem", marginTop: "4px" }}>
                        <AlertTriangle size={16} />
                        <span>คุณได้ทำการปฏิเสธสัญญาฉบับนี้แล้วค่ะ</span>
                      </div>
                    )}
                  </div>
                )}

                {/* If type is Exam, show Exam control card */}
                {selectedMessage.type === "exam" && (
                  <div className="inbox-exam-action-card">
                    <div className="exam-flex-row-center" style={{ color: "var(--accent)", marginBottom: "12px", gap: "8px" }}>
                      <FileText size={18} />
                      <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>ข้อมูลการทดสอบวัดผล</span>
                    </div>

                    <div className="exam-grid-2-col" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "16px", gap: "12px" }}>
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "4px" }}>
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
                            style={{ width: "100%" }}
                            onClick={() => handleStartExam(selectedMessage)}
                            disabled={startingExam}
                          >
                            <Play size={14} /> {startingExam ? "กำลังเข้าสู่ห้องสอบ..." : "ทำข้อสอบต่อที่ค้างไว้"}
                          </button>
                        ) : (
                          <div className="exam-flex-row-center" style={{ color: "#4ade80", padding: "8px", background: "rgba(34,197,94,0.05)", borderRadius: "4px", border: "1px solid rgba(34,197,94,0.15)", fontSize: "0.88rem", gap: "8px" }}>
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
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245, 158, 11, 0.15)", padding: "12px", borderRadius: "6px", marginBottom: "16px" }}>
                          <h4 className="exam-flex-row-center" style={{ fontWeight: 600, color: "var(--warning)", marginBottom: "4px", gap: "4px" }}>
                            ⚠️ กฎระเบียบและข้อควรระวังขณะสอบ:
                          </h4>
                          <ul style={{ listStyleType: "disc", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <li>การสอบจะจับเวลาถอยหลัง หากหมดเวลาจะส่งคำตอบอัตโนมัติ</li>
                            <li><strong>ห้ามสลับหน้าจอนอกหน้าต่างสอบ (Alt-Tab) เด็ดขาด</strong> ระบบจะตรวจจับและรายงานแอดมินทันทีหากมีการหลุดโฟกัส</li>
                            <li><strong>ระบบบล็อกการคัดลอก คัดลอกข้อความ หรือคลิกขวา</strong></li>
                            <li>ตรวจพบการแชร์หน้าจอ/สตรีมหน้าจอผ่านเว็บเบราว์เซอร์ใดๆ หน้าจอข้อสอบจะถูกปิดบังทันที</li>
                          </ul>
                        </div>

                        <button
                          className="inbox-btn-exam btn-primary"
                          style={{ width: "100%" }}
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
                  <h3 style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>กล่องจดหมายของคุณว่างเปล่า</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
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
                        ) : msg.type === "contract" ? (
                          <FileText size={18} className="text-[#818cf8]" />
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

                        {msg.type === "contract" && msg.medical_contracts && (
                          <div className="inbox-exam-badge" style={{ backgroundColor: msg.medical_contracts.status === "accepted" ? "rgba(16,185,129,0.12)" : msg.medical_contracts.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: msg.medical_contracts.status === "accepted" ? "#4ade80" : msg.medical_contracts.status === "rejected" ? "#f87171" : "#fbbf24" }}>
                            {msg.medical_contracts.status === "accepted" ? "เซ็นสัญญาแล้ว ✅" :
                             msg.medical_contracts.status === "rejected" ? "ปฏิเสธสัญญา ❌" : "รอเซ็นสัญญา ⏳"}
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
