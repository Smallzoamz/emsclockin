"use client";

import { useEffect, useState, useRef } from "react";
import { formatThaiDate } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmProvider";
import { 
  FileTextIcon, 
  CameraIcon, 
  CheckIcon, 
  CrossIcon, 
  ShieldIcon, 
  RefreshIcon 
} from "@/components/Icons";
import { supabaseClient } from "@/lib/supabase-client";

interface LeaveRequest {
  id: string;
  discord_username: string;
  discord_id: string;
  doctor_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_image_url: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ResignationRequest {
  id: string;
  discord_username: string;
  discord_id: string;
  doctor_name: string;
  reason: string;
  total_hours: number;
  passing_hours: number;
  is_reset: boolean;
  status: "pending" | "approved" | "rejected" | "acknowledged";
  approved_by: string | null;
  discord_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function LeaveManagementPage() {
  const confirm = useConfirm();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Top level mode: leaves or resignations
  const [systemMode, setSystemMode] = useState<"leaves" | "resignations">("leaves");

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Resignations State
  const [resignations, setResignations] = useState<ResignationRequest[]>([]);
  const [resignationTab, setResignationTab] = useState<"pending" | "approved" | "rejected" | "acknowledged">("pending");
  const [selectedResignationForDoc, setSelectedResignationForDoc] = useState<ResignationRequest | null>(null);

  // Config settings for Resignation Canvas
  const [resignationCriteriaHours, setResignationCriteriaHours] = useState(40);
  const [resignationDocTemplate, setResignationDocTemplate] = useState("");
  const [resignationCooldownText, setResignationCooldownText] = useState("7 วัน");

  // Branding / Theme Settings
  const [themeAccentColor, setThemeAccentColor] = useState("#10b981");
  const [cityLogoUrl, setCityLogoUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, resignationsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/leaves"),
        fetch("/api/admin/resignations"),
        fetch("/api/admin/settings")
      ]);

      if (!leavesRes.ok) throw new Error("Failed to fetch leaves");
      if (!resignationsRes.ok) throw new Error("Failed to fetch resignations");

      const leavesData = await leavesRes.json();
      const resignationsData = await resignationsRes.json();
      const settingsData = await settingsRes.json();

      setLeaves(leavesData.leaves || []);
      setResignations(resignationsData.resignations || []);

      if (settingsData.settings) {
        setThemeAccentColor(settingsData.settings.theme_accent_color || "#10b981");
        setCityLogoUrl(settingsData.settings.theme_logo_url || null);
        if (settingsData.settings.resignation_criteria_hours !== undefined) {
          setResignationCriteriaHours(Number(settingsData.settings.resignation_criteria_hours));
        }
        if (settingsData.settings.resignation_doc_template) {
          setResignationDocTemplate(settingsData.settings.resignation_doc_template);
        }
        if (settingsData.settings.resignation_cooldown_text) {
          setResignationCooldownText(settingsData.settings.resignation_cooldown_text);
        }
      }
    } catch (err: any) {
      console.error("[Data Fetch Error] Failed to load leave/resignation requests:", err);
      alert("ไม่สามารถโหลดข้อมูลระบบได้: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "จัดการใบลาและใบลาออก | EMS Clock-in";
    loadData();
  }, []);

  // Filtered lists
  const filteredLeaves = leaves.filter(leave => leave.status === activeTab);
  const filteredResignations = resignations.filter(resign => resign.status === resignationTab);

  // Update status handler for leaves
  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected", name: string) => {
    const actionLabel = newStatus === "approved" ? "อนุมัติการลา" : "ปฏิเสธการลา";
    const confirmVariant = newStatus === "approved" ? "success" : "danger";
    
    const isConfirmed = await confirm({
      title: `${newStatus === "approved" ? "🟢" : "🔴"} ยืนยัน${actionLabel}`,
      message: `ต้องการดำเนินการ${actionLabel}ของแพทย์ "${name}" ใช่หรือไม่?`,
      confirmText: newStatus === "approved" ? "อนุมัติ" : "ปฏิเสธ",
      cancelText: "ยกเลิก",
      variant: confirmVariant
    });

    if (!isConfirmed) return;

    try {
      const adminName = "Admin";
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      setLeaves(prev => prev.map(leave => 
        leave.id === id ? { ...leave, status: newStatus, approved_by: adminName } : leave
      ));

      alert(`${actionLabel}สำเร็จแล้วค่ะ`);
    } catch (err: any) {
      console.error(`[Leaves Update Error] Failed to update status:`, err);
      alert(`ดำเนินการล้มเหลว: ` + err.message);
    }
  };

  // Reset status back to pending for leaves
  const handleResetToPending = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "🔄 เปลี่ยนสถานะกลับเป็นรอดำเนินการ",
      message: `ต้องการยกเลิกผลการดำเนินการของแพทย์ "${name}" และเปลี่ยนกลับเป็นรอดำเนินการหรือไม่?`,
      confirmText: "ยืนยันกลับสถานะ",
      cancelText: "ยกเลิก",
      variant: "warning"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status: "pending" })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reset status");
      }

      setLeaves(prev => prev.map(leave => 
        leave.id === id ? { ...leave, status: "pending", approved_by: null } : leave
      ));

      alert("เปลี่ยนสถานะกลับเป็นรอดำเนินการสำเร็จ");
    } catch (err: any) {
      console.error(err);
      alert("ดำเนินการล้มเหลว: " + err.message);
    }
  };

  // Update status handler for resignations
  const handleUpdateResignationStatus = async (id: string, newStatus: "approved" | "rejected", name: string) => {
    const actionLabel = newStatus === "approved" ? "อนุมัติการลาออก" : "ปฏิเสธการลาออก";
    const confirmVariant = newStatus === "approved" ? "success" : "danger";
    
    const isConfirmed = await confirm({
      title: `${newStatus === "approved" ? "🟢" : "🔴"} ยืนยัน${actionLabel}`,
      message: `ต้องการดำเนินการ${actionLabel}ของแพทย์ "${name}" ใช่หรือไม่?`,
      confirmText: newStatus === "approved" ? "อนุมัติ" : "ปฏิเสธ",
      cancelText: "ยกเลิก",
      variant: confirmVariant
    });

    if (!isConfirmed) return;

    try {
      const adminName = "Admin";
      const res = await fetch("/api/admin/resignations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update resignation status");
      }

      setResignations(prev => prev.map(resign => 
        resign.id === id ? { ...resign, status: newStatus, approved_by: adminName } : resign
      ));

      alert(`${actionLabel}สำเร็จแล้วค่ะ`);
    } catch (err: any) {
      console.error(`[Resignations Update Error] Failed to update status:`, err);
      alert(`ดำเนินการล้มเหลว: ` + err.message);
    }
  };

  // Reset status back to pending for resignations
  const handleResetResignationToPending = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "🔄 เปลี่ยนสถานะกลับเป็นรอดำเนินการ",
      message: `ต้องการยกเลิกผลการดำเนินการของแพทย์ "${name}" และเปลี่ยนกลับเป็นรอดำเนินการหรือไม่?`,
      confirmText: "ยืนยันกลับสถานะ",
      cancelText: "ยกเลิก",
      variant: "warning"
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/admin/resignations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status: "pending" })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reset status");
      }

      setResignations(prev => prev.map(resign => 
        resign.id === id ? { ...resign, status: "pending", approved_by: null } : resign
      ));

      alert("เปลี่ยนสถานะกลับเป็นรอดำเนินการสำเร็จ");
    } catch (err: any) {
      console.error(err);
      alert("ดำเนินการล้มเหลว: " + err.message);
    }
  };

  // Draw the discharge certificate on canvas
  useEffect(() => {
    if (selectedResignationForDoc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#080c18"); // Very dark slate
      gradient.addColorStop(1, "#030408"); // Deep black
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borders
      ctx.strokeStyle = themeAccentColor || "#10b981";
      ctx.lineWidth = 6;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
      
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

      // Corner decorations
      const drawCorner = (x: number, y: number, w: number, h: number) => {
        ctx.strokeStyle = themeAccentColor || "#10b981";
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

      const drawTextContent = () => {
        // Title Header
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial, sans-serif";
        ctx.fillText("FIVEM EMS SERVICE", canvas.width / 2, 140);

        ctx.fillStyle = themeAccentColor || "#10b981";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText("ศูนย์ปฏิบัติการแพทย์กู้ภัยและรักษาพยาบาลฉุกเฉิน", canvas.width / 2, 175);

        // Divider
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 205);
        ctx.lineTo(canvas.width - 100, 205);
        ctx.stroke();

        // Document Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.fillText("ใบประกาศพ้นสภาพบุคลากรทางการแพทย์", canvas.width / 2, 250);
        
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "11px Courier, monospace";
        ctx.fillText(`REF ID: ${selectedResignationForDoc.id.toUpperCase()}`, canvas.width / 2, 280);

        // Format dates
        const formattedDate = new Date(selectedResignationForDoc.created_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Bangkok"
        });
        
        const resetStatusText = selectedResignationForDoc.is_reset ? "ถูกรีตัว (ไม่ผ่านเกณฑ์ชั่วโมงสะสม)" : "ผ่านเกณฑ์ไม่รีตัว";

        // Resolve body template
        let bodyText = resignationDocTemplate || 
          "ขอประกาศพ้นสภาพของแพทย์ [ชื่อแพทย์] ([Discord]) จากหน่วยงานแพทย์กู้ภัย FiveM EMS Service เนื่องจากได้ทำการยื่นขอลาออก\\n\\nเหตุผลการลาออก: [เหตุผล]\\nชั่วโมงงานสะสมทั้งหมด: [ชั่วโมงสะสม] / [เกณฑ์ชั่วโมง] ชั่วโมง\\nสถานะการพ้นสภาพ: [สถานะรีตัว]\\n\\nขอขอบคุณในการร่วมงานและดูแลผู้ป่วยตลอดเวลาที่ผ่านมา\\nลงชื่อ ผอ. หน่วยงานแพทย์กู้ภัย";

        bodyText = bodyText
          .replace(/\[ชื่อแพทย์\]/g, selectedResignationForDoc.doctor_name)
          .replace(/\[Discord\]/g, `@${selectedResignationForDoc.discord_username}`)
          .replace(/\[เหตุผล\]/g, selectedResignationForDoc.reason)
          .replace(/\[ชั่วโมงสะสม\]/g, Number(selectedResignationForDoc.total_hours).toFixed(1))
          .replace(/\[เกณฑ์ชั่วโมง\]/g, String(selectedResignationForDoc.passing_hours))
          .replace(/\[สถานะรีตัว\]/g, resetStatusText)
          .replace(/\[วันที่\]/g, formattedDate);

        // Draw body texts
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "17px Arial, sans-serif";
        
        const paragraphs = bodyText.split("\n");
        let y = 330;
        const maxWidth = canvas.width - 160;
        const lineHeight = 30;

        function wrapText(text: string, x: number, startY: number, maxW: number, lineH: number) {
          const words = text.split(" ");
          let line = "";
          let currentY = startY;

          for (let n = 0; n < words.length; n++) {
            // Thai text wrapping helper (character split wrap if no spaces)
            if (text.length > 30 && !text.includes(" ")) {
              let i = 0;
              while (i < text.length) {
                const chunk = text.substring(i, i + 48);
                ctx!.fillText(chunk, x, currentY);
                currentY += lineH;
                i += 48;
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

        paragraphs.forEach((p) => {
          if (p.trim() === "") {
            y += 15;
          } else {
            y = wrapText(p, 80, y, maxWidth, lineHeight);
          }
        });

        // Draw Status box
        y = Math.max(y + 30, 620);
        ctx.textAlign = "center";
        
        ctx.fillStyle = selectedResignationForDoc.is_reset ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)";
        ctx.strokeStyle = selectedResignationForDoc.is_reset ? "rgba(239, 68, 68, 0.6)" : "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = 1;
        ctx.fillRect(80, y, canvas.width - 160, 64);
        ctx.strokeRect(80, y, canvas.width - 160, 64);

        ctx.fillStyle = selectedResignationForDoc.is_reset ? "#fca5a5" : "#a7f3d0";
        ctx.font = "bold 18px Arial, sans-serif";
        const statusTextDisplay = selectedResignationForDoc.is_reset 
          ? `🚨 สถานะ: ถูกรีตัว (ชั่วโมงงานสะสมไม่ครบเกณฑ์ ${selectedResignationForDoc.passing_hours} ชม.)`
          : `🟢 สถานะ: พ้นสภาพปกติ (ชั่วโมงสะสมครบเกณฑ์ ไม่ถูกรีตัว)`;
        ctx.fillText(statusTextDisplay, canvas.width / 2, y + 38);

        y += 110;

        // Cooldown warning
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "italic 13px Arial, sans-serif";
        ctx.fillText(`* ระยะเวลาคูลดาวน์ในการเข้าแก๊ง ครอบครัว หรือหน่วยงานอื่น: ${resignationCooldownText} *`, canvas.width / 2, y);

        y += 90;

        // Signatures
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "14px Arial, sans-serif";
        ctx.fillText("ลงชื่ออนุมัติพ้นสภาพแพทย์", canvas.width - 80, y);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px Arial, sans-serif";
        ctx.fillText("ผอ. ฝ่ายพัฒนาบุคลากรแพทย์", canvas.width - 80, y + 45);
        
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(canvas.width - 240, y + 25);
        ctx.lineTo(canvas.width - 80, y + 25);
        ctx.stroke();

        // Seal of EMS
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.font = "bold 10px Arial, sans-serif";
        ctx.fillText("OFFICIAL SEAL", 80, y + 25);
        
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(120, y + 10, 42, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.font = "bold 8px Arial, sans-serif";
        ctx.fillText("FIVE M EMS", 97, y + 13);
      };

      if (cityLogoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Watermark logo
          ctx.save();
          ctx.globalAlpha = 0.04;
          ctx.drawImage(img, canvas.width / 2 - 170, canvas.height / 2 - 170, 340, 340);
          ctx.restore();
          
          // Small logo header
          ctx.save();
          ctx.drawImage(img, canvas.width / 2 - 30, 45, 60, 60);
          ctx.restore();
          
          drawTextContent();
        };
        img.onerror = () => {
          drawTextContent();
        };
        img.src = cityLogoUrl;
      } else {
        drawTextContent();
      }
    }
  }, [selectedResignationForDoc, themeAccentColor, cityLogoUrl, resignationDocTemplate, resignationCooldownText]);

  // Download Canvas as Image handler
  const handleDownloadDoc = () => {
    if (!canvasRef.current || !selectedResignationForDoc) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ประกาศพ้นสภาพ_${selectedResignationForDoc.doctor_name}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rest of the component follows...

  return (
    <div className="page-container" style={{ padding: "0 16px 32px 16px", color: "var(--text-primary)" }}>
      {/* Page Header */}
      <header className="page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
            <FileTextIcon size={28} />
            จัดการใบลาพักงาน และใบลาออก
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            จัดการ ตรวจสอบ และอนุมัติใบลาพักงาน/ใบลาออกของแพทย์กู้ภัยแบบ Real-Time
          </p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="btn btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshIcon size={14} className={loading ? "spin" : ""} />
          รีเฟรชข้อมูล
        </button>
      </header>

      {/* System Mode Selection Tab */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <button 
          onClick={() => setSystemMode("leaves")}
          style={{ 
            fontSize: "0.9rem", 
            padding: "10px 20px", 
            borderRadius: "10px", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            border: "1px solid var(--border-subtle)",
            background: systemMode === "leaves" ? "var(--accent)" : "rgba(255,255,255,0.015)",
            color: systemMode === "leaves" ? "#000" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <FileTextIcon size={16} style={{ color: systemMode === "leaves" ? "#000" : "inherit" }} />
          จัดการใบลาพักงาน ({leaves.length})
        </button>
        <button 
          onClick={() => setSystemMode("resignations")}
          style={{ 
            fontSize: "0.9rem", 
            padding: "10px 20px", 
            borderRadius: "10px", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            border: "1px solid var(--border-subtle)",
            background: systemMode === "resignations" ? "var(--accent)" : "rgba(255,255,255,0.015)",
            color: systemMode === "resignations" ? "#000" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <ShieldIcon size={16} style={{ color: systemMode === "resignations" ? "#000" : "inherit" }} />
          จัดการใบลาออก ({resignations.length})
        </button>
      </div>

      {systemMode === "leaves" ? (
        <>
          {/* Leaves Tabs Menu */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px", marginBottom: "24px" }}>
            <button 
              onClick={() => setActiveTab("pending")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: activeTab === "pending" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: activeTab === "pending" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🟡 รอดำเนินการ ({leaves.filter(l => l.status === "pending").length})
            </button>
            <button 
              onClick={() => setActiveTab("approved")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: activeTab === "approved" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: activeTab === "approved" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🟢 อนุมัติแล้ว ({leaves.filter(l => l.status === "approved").length})
            </button>
            <button 
              onClick={() => setActiveTab("rejected")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: activeTab === "rejected" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: activeTab === "rejected" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🔴 ปฏิเสธแล้ว ({leaves.filter(l => l.status === "rejected").length})
            </button>
          </div>

          {/* Leaves Grid Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="loading-spinner"></div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>กำลังโหลดรายการใบลา...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="card" style={{ padding: "80px 32px", textAlign: "center" }}>
              <ShieldIcon size={48} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: "16px", display: "inline-block" }} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>ไม่มีรายการใบลาในหมวดหมู่นี้</h3>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {filteredLeaves.map((leave) => (
                <div 
                  key={leave.id} 
                  className="card" 
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "var(--bg-card)",
                    backdropFilter: "blur(12px)"
                  }}
                >
                  {/* Card Title Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--accent-light)", fontWeight: 600 }}>{leave.doctor_name}</h3>
                      <span style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 600 }}>@{leave.discord_username}</span>
                    </div>
                    <span 
                      style={{
                        backgroundColor: leave.leave_type === "ลาป่วย" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: leave.leave_type === "ลาป่วย" ? "#fca5a5" : "#fcd34d",
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}
                    >
                      {leave.leave_type}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>ช่วงเวลาหยุดงาน:</span>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        📅 {new Date(leave.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        <span style={{ margin: "0 8px", color: "var(--text-muted)" }}>ถึง</span>
                        {new Date(leave.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>เหตุผลการขอลา:</span>
                      <div 
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          background: "rgba(255,255,255,0.015)",
                          border: "1px solid var(--border-subtle)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          lineHeight: 1.5,
                          fontStyle: "italic"
                        }}
                      >
                        "{leave.reason}"
                      </div>
                    </div>

                    {/* Proof Image Upload */}
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>เอกสาร/รูปภาพหลักฐาน:</span>
                      {leave.proof_image_url ? (
                        <div 
                          onClick={() => setFullscreenImage(leave.proof_image_url)}
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "140px",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "10px",
                            overflow: "hidden",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <img 
                            src={leave.proof_image_url} 
                            alt="Certificate Proof" 
                            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85, transition: "0.2s" }}
                            onMouseOver={e => e.currentTarget.style.opacity = "1"}
                            onMouseOut={e => e.currentTarget.style.opacity = "0.85"}
                          />
                          <div style={{ position: "absolute", bottom: "8px", right: "8px", backgroundColor: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#fff" }}>
                            <CameraIcon size={12} />
                            คลิกเพื่อขยาย
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "16px", border: "1px dashed var(--border-subtle)", borderRadius: "10px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          ไม่มีการแนบรูปภาพหรือหลักฐานประกอบ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div 
                    style={{
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.01)",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                      alignItems: "center"
                    }}
                  >
                    {leave.status === "pending" ? (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(leave.id, "rejected", leave.doctor_name)}
                          className="btn btn-danger"
                          style={{ fontSize: "0.8rem", padding: "8px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <CrossIcon size={14} />
                          ปฏิเสธ
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(leave.id, "approved", leave.doctor_name)}
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "8px 18px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <CheckIcon size={14} style={{ color: "#060a13" }} />
                          อนุมัติการลา
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          ผู้ทำรายการ: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{leave.approved_by}</span>
                          <br />
                          ทำรายการเมื่อ: {formatThaiDate(new Date(leave.updated_at))}
                        </div>
                        <button 
                          onClick={() => handleResetToPending(leave.id, leave.doctor_name)}
                          className="btn btn-ghost"
                          style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: "6px" }}
                        >
                          เปลี่ยนกลับ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Resignations Tabs Menu */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px", marginBottom: "24px" }}>
            <button 
              onClick={() => setResignationTab("pending")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: resignationTab === "pending" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: resignationTab === "pending" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🟡 รอดำเนินการ ({resignations.filter(r => r.status === "pending").length})
            </button>
            <button 
              onClick={() => setResignationTab("approved")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: resignationTab === "approved" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: resignationTab === "approved" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🟢 อนุมัติแล้ว ({resignations.filter(r => r.status === "approved").length})
            </button>
            <button 
              onClick={() => setResignationTab("rejected")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: resignationTab === "rejected" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: resignationTab === "rejected" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🔴 ปฏิเสธแล้ว ({resignations.filter(r => r.status === "rejected").length})
            </button>
            <button 
              onClick={() => setResignationTab("acknowledged")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                color: resignationTab === "acknowledged" ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: resignationTab === "acknowledged" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              🔵 รับทราบแล้ว ({resignations.filter(r => r.status === "acknowledged").length})
            </button>
          </div>

          {/* Resignations Grid Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="loading-spinner"></div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>กำลังโหลดรายการใบลาออก...</p>
            </div>
          ) : filteredResignations.length === 0 ? (
            <div className="card" style={{ padding: "80px 32px", textAlign: "center" }}>
              <ShieldIcon size={48} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: "16px", display: "inline-block" }} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-secondary)" }}>ไม่มีรายการใบลาออกในหมวดหมู่นี้</h3>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {filteredResignations.map((resign) => (
                <div 
                  key={resign.id} 
                  className="card" 
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "var(--bg-card)",
                    backdropFilter: "blur(12px)"
                  }}
                >
                  {/* Card Title Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--accent-light)", fontWeight: 600 }}>{resign.doctor_name}</h3>
                      <span style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 600 }}>@{resign.discord_username}</span>
                    </div>
                    <span 
                      style={{
                        backgroundColor: resign.is_reset ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: resign.is_reset ? "#fca5a5" : "#a7f3d0",
                        padding: "3px 10px",
                        borderRadius: "99px",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}
                    >
                      {resign.is_reset ? "🚨 ถูกรีตัว" : "🟢 ไม่รีตัว"}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>ชั่วโมงทำงานสะสมทั้งหมด:</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        ⏱️ {Number(resign.total_hours).toFixed(1)} <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-muted)" }}>/ {resign.passing_hours} ชั่วโมงเกณฑ์</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>สาเหตุการลาออก:</span>
                      <div 
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          background: "rgba(255,255,255,0.015)",
                          border: "1px solid var(--border-subtle)",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          lineHeight: 1.5,
                          fontStyle: "italic"
                        }}
                      >
                        "{resign.reason}"
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div 
                    style={{
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.01)",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                      alignItems: "center"
                    }}
                  >
                    {resign.status === "pending" ? (
                      <>
                        <button 
                          onClick={() => handleUpdateResignationStatus(resign.id, "rejected", resign.doctor_name)}
                          className="btn btn-danger"
                          style={{ fontSize: "0.8rem", padding: "8px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <CrossIcon size={14} />
                          ปฏิเสธ
                        </button>
                        <button 
                          onClick={() => handleUpdateResignationStatus(resign.id, "approved", resign.doctor_name)}
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "8px 18px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <CheckIcon size={14} style={{ color: "#060a13" }} />
                          อนุมัติการลาออก
                        </button>
                      </>
                    ) : (
                      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", flex: 1 }}>
                          ผู้ทำรายการ: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{resign.approved_by || "Admin"}</span>
                          <br />
                          ทำรายการเมื่อ: {formatThaiDate(new Date(resign.updated_at))}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {(resign.status === "approved" || resign.status === "acknowledged") && (
                            <button 
                              onClick={() => setSelectedResignationForDoc(resign)}
                              className="btn btn-ghost"
                              style={{ 
                                fontSize: "0.75rem", 
                                padding: "6px 12px", 
                                borderRadius: "6px", 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "6px", 
                                border: "1px solid var(--border-subtle)",
                                color: "var(--accent-light)",
                                cursor: "pointer"
                              }}
                            >
                              <FileTextIcon size={12} />
                              เอกสารพ้นสภาพ
                            </button>
                          )}
                          {resign.status !== "acknowledged" && (
                            <button 
                              onClick={() => handleResetResignationToPending(resign.id, resign.doctor_name)}
                              className="btn btn-ghost"
                              style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: "6px" }}
                            >
                              เปลี่ยนกลับ
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px"
          }}
        >
          <button 
            onClick={() => setFullscreenImage(null)}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "transparent",
              border: "none",
              color: "white",
              fontSize: "2rem",
              cursor: "pointer",
              zIndex: 2001
            }}
          >
            &times;
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen Proof" 
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 0 40px rgba(0,0,0,0.8)" }}
          />
        </div>
      )}

      {/* Resignation Document Preview & Download Modal */}
      {selectedResignationForDoc && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px"
          }}
        >
          <div 
            className="card"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxHeight: "95vh",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>📄 ใบประกาศพ้นสภาพแพทย์</h3>
              <button 
                onClick={() => setSelectedResignationForDoc(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", overflow: "hidden" }}>
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={1000} 
                style={{ 
                  width: "100%", 
                  maxWidth: "400px", 
                  height: "auto", 
                  border: "1px solid rgba(255,255,255,0.08)", 
                  borderRadius: "6px",
                  background: "#080c18"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSelectedResignationForDoc(null)}
                className="btn btn-ghost"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                ปิดหน้าต่าง
              </button>
              <button 
                onClick={handleDownloadDoc}
                className="btn btn-primary"
                style={{ padding: "10px 24px", borderRadius: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}
              >
                <CameraIcon size={16} style={{ color: "#000" }} />
                ดาวน์โหลดประกาศ (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
