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
  type?: "resignation" | "dismissal";
}

export default function LeaveManagementPage() {
  const confirm = useConfirm();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Top level mode: leaves or resignations or contracts
  const [systemMode, setSystemMode] = useState<"leaves" | "resignations" | "contracts">("leaves");

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Resignations State
  const [resignations, setResignations] = useState<ResignationRequest[]>([]);
  const [resignationTab, setResignationTab] = useState<"pending" | "approved" | "rejected" | "acknowledged">("pending");
  const [selectedResignationForDoc, setSelectedResignationForDoc] = useState<ResignationRequest | null>(null);

  // Contracts State
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractForDoc, setSelectedContractForDoc] = useState<any | null>(null);

  // Dismiss Doctor Modal State
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [dismissEmail, setDismissEmail] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [dismissIsReset, setDismissIsReset] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  // Create Contract Modal State
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);
  const [newContractEmail, setNewContractEmail] = useState("");
  const [newContractTitle, setNewContractTitle] = useState("สัญญาปฏิบัติหน้าที่บุคลากรทางการแพทย์");
  const [newContractContent, setNewContractContent] = useState("");
  const [isSendingContract, setIsSendingContract] = useState(false);

  // Config settings for Resignation Canvas
  const [resignationCriteriaHours, setResignationCriteriaHours] = useState(40);
  const [resignationDocTemplate, setResignationDocTemplate] = useState("");
  const [resignationCooldownText, setResignationCooldownText] = useState("7 วัน");

  // Branding / Theme Settings
  const [themeAccentColor, setThemeAccentColor] = useState("#10b981");
  const [cityLogoUrl, setCityLogoUrl] = useState<string | null>(null);

  const [registeredDoctors, setRegisteredDoctors] = useState<any[]>([]);
  const [userRanks, setUserRanks] = useState<Record<string, string>>({});
  const [doctorRanks, setDoctorRanks] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const contractCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, resignationsRes, settingsRes, contractsRes] = await Promise.all([
        fetch("/api/admin/leaves"),
        fetch("/api/admin/resignations"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/contracts")
      ]);

      if (!leavesRes.ok) throw new Error("Failed to fetch leaves");
      if (!resignationsRes.ok) throw new Error("Failed to fetch resignations");
      if (!contractsRes.ok) throw new Error("Failed to fetch contracts");

      const leavesData = await leavesRes.json();
      const resignationsData = await resignationsRes.json();
      const settingsData = await settingsRes.json();
      const contractsData = await contractsRes.json();

      setLeaves(leavesData.leaves || []);
      setResignations(resignationsData.resignations || []);
      setContracts(contractsData.contracts || []);

      if (settingsData.settings) {
        setThemeAccentColor(settingsData.settings.theme_accent_color || "#10b981");
        setCityLogoUrl(settingsData.settings.theme_logo_url || null);
        setRegisteredDoctors(settingsData.settings.registered_doctors || []);
        setUserRanks(settingsData.settings.user_ranks || {});
        setDoctorRanks(settingsData.settings.doctor_ranks || []);
        if (settingsData.settings.resignation_criteria_hours !== undefined) {
          setResignationCriteriaHours(Number(settingsData.settings.resignation_criteria_hours));
        }
        if (settingsData.settings.resignation_doc_template) {
          setResignationDocTemplate(settingsData.settings.resignation_doc_template);
        }
        if (settingsData.settings.resignation_cooldown_text) {
          setResignationCooldownText(settingsData.settings.resignation_cooldown_text);
        }
        if (settingsData.settings.medical_contract_default_template) {
          setNewContractContent(settingsData.settings.medical_contract_default_template);
        } else {
          setNewContractContent(`เลขที่สัญญา : FCMU-EMS-[เลขสัญญา]\n\nข้าพเจ้า [ชื่อผู้ลงนาม]\nชื่อในเมือง (Character Name) : [ชื่อแพทย์]\n\nมีความประสงค์เข้าร่วมปฏิบัติหน้าที่เป็นบุคลากรทางการแพทย์ภายใต้หน่วยงาน Fox Community Medical Unit (FCMU) และตกลงตามเงื่อนไขดังต่อไปนี้\n\nข้อกำหนด\n1. ข้าพเจ้าตกลงปฏิบัติหน้าที่ในสังกัด FCMU เป็นระยะเวลาไม่น้อยกว่า 30 วัน นับจากวันที่ลงนามในสัญญา\n2. ตลอดระยะเวลาของสัญญา ข้าพเจ้าจะปฏิบัติตามกฎ ระเบียบ และคำสั่งของหน่วยงานอย่างเคร่งครัด\n3. หากข้าพเจ้าลาออก ย้ายหน่วยงาน หรือกระทำการใด ๆ ที่ส่งผลให้พ้นสภาพการเป็นบุคลากรทางการแพทย์ก่อนครบกำหนดสัญญา 30 วัน จะถือว่าเป็นการ ผิดสัญญา\n4. ผู้ที่ผิดสัญญาจะต้องเลือกดำเนินการอย่างใดอย่างหนึ่ง ดังต่อไปนี้\n   • ชำระค่าฉีกสัญญาเป็นจำนวน 5,000,000 บาท (5M)\n   • ยินยอมให้ดำเนินการ รีเซ็ตตัวละคร (Character Reset) ตามระเบียบของเซิร์ฟเวอร์\n5. ในกรณีที่พ้นสภาพจากตำแหน่งเนื่องจากการปลดออกโดยคำสั่งผู้บังคับบัญชา หรือมีเหตุอันสมควรที่ได้รับการอนุมัติจากผู้บริหารหน่วยงาน ให้ถือเป็นดุลยพินิจของผู้บริหารในการยกเว้นค่าฉีกสัญญา\n\nข้าพเจ้าได้อ่าน ทำความเข้าใจ และยอมรับเงื่อนไขทั้งหมดข้างต้นโดยไม่มีข้อโต้แย้งใด ๆ`);
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
        const titleText = selectedResignationForDoc.type === "dismissal" 
          ? "ใบประกาศปลดพ้นสภาพบุคลากรทางการแพทย์" 
          : "ใบประกาศพ้นสภาพบุคลากรทางการแพทย์";
        ctx.fillText(titleText, canvas.width / 2, 250);
        
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
        
        const resetStatusText = selectedResignationForDoc.is_reset ? "ถูกรีตัว (พ้นสภาพการปฏิบัติหน้าที่)" : "ผ่านเกณฑ์ไม่รีตัว";

        // Resolve body template
        let bodyText = "";
        if (selectedResignationForDoc.type === "dismissal") {
          bodyText = "ขอประกาศปลดพ้นสภาพของแพทย์ [ชื่อแพทย์] ([Discord]) จากหน่วยงานแพทย์กู้ภัย FiveM EMS Service โดยให้มีผลบังคับใช้ในทันที\\n\\nเหตุผลการปลดพ้นสภาพ: [เหตุผล]\\nชั่วโมงงานสะสมรวม: [ชั่วโมงสะสม] ชั่วโมง\\nสถานะการพ้นสภาพ: [สถานะรีตัว]\\n\\nขอประกาศให้ทราบโดยทั่วกัน\\nลงชื่อ ผอ. หน่วยงานแพทย์กู้ภัย";
        } else {
          bodyText = resignationDocTemplate || 
            "ขอประกาศพ้นสภาพของแพทย์ [ชื่อแพทย์] ([Discord]) จากหน่วยงานแพทย์กู้ภัย FiveM EMS Service เนื่องจากได้ทำการยื่นขอลาออก\\n\\nเหตุผลการลาออก: [เหตุผล]\\nชั่วโมงงานสะสมทั้งหมด: [ชั่วโมงสะสม] / [เกณฑ์ชั่วโมง] ชั่วโมง\\nสถานะการพ้นสภาพ: [สถานะรีตัว]\\n\\nขอขอบคุณในการร่วมงานและดูแลผู้ป่วยตลอดเวลาที่ผ่านมา\\nลงชื่อ ผอ. หน่วยงานแพทย์กู้ภัย";
        }

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

        paragraphs.forEach((p: string) => {
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
        const statusTextDisplay = selectedResignationForDoc.type === "dismissal"
          ? (selectedResignationForDoc.is_reset 
              ? `🚨 สถานะ: ถูกปลดพ้นสภาพ (มีผลบังคับใช้ทันที & รีตัว)` 
              : `🚨 สถานะ: ถูกปลดพ้นสภาพ (มีผลบังคับใช้ทันที)`)
          : (selectedResignationForDoc.is_reset 
              ? `🚨 สถานะ: ถูกรีตัว (ชั่วโมงงานสะสมไม่ครบเกณฑ์ ${selectedResignationForDoc.passing_hours} ชม.)`
              : `🟢 สถานะ: พ้นสภาพปกติ (ชั่วโมงสะสมครบเกณฑ์ ไม่ถูกรีตัว)`);
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
        
        const approverUsernameOrEmail = selectedResignationForDoc.approved_by || "Admin";
        
        const approverDoc = registeredDoctors.find(d => 
          (d.email && d.email.toLowerCase() === approverUsernameOrEmail.toLowerCase()) ||
          (d.discordUsername && d.discordUsername.toLowerCase() === approverUsernameOrEmail.toLowerCase()) ||
          (d.name && d.name.toLowerCase() === approverUsernameOrEmail.toLowerCase())
        );

        let approverName = approverDoc?.name || approverUsernameOrEmail;
        if (approverName.includes("@")) {
          approverName = approverName.split("@")[0];
        }

        let approverPosition = "ผู้ดูแลระบบ";
        
        if (approverDoc && approverDoc.email) {
          const rankId = userRanks[approverDoc.email];
          if (rankId) {
            const rankObj = doctorRanks.find(r => r.id === rankId);
            if (rankObj && rankObj.name) {
              const parts = rankObj.name.split("|");
              approverPosition = parts[parts.length - 1].trim();
            }
          }
        } else if (approverUsernameOrEmail.toLowerCase() === "lneeobee@gmail.com") {
          approverPosition = "ผู้ดูแลระบบหลัก";
        }
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px Arial, sans-serif";
        ctx.fillText(`( ${approverName} )`, canvas.width - 80, y + 45);

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText(approverPosition, canvas.width - 80, y + 70);
        
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
    const docNamePrefix = selectedResignationForDoc.type === "dismissal" ? "ประกาศปลดพ้นสภาพ_" : "ประกาศพ้นสภาพ_";
    link.download = `${docNamePrefix}${selectedResignationForDoc.doctor_name}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dismiss Doctor handler
  const handleDismissDoctor = async () => {
    if (!dismissEmail) {
      alert("กรุณาเลือกแพทย์ที่ต้องการปลดพ้นสภาพ");
      return;
    }
    if (!dismissReason.trim()) {
      alert("กรุณาระบุเหตุผลการปลดพ้นสภาพ");
      return;
    }

    const selectedDoc = registeredDoctors.find(d => d.email === dismissEmail);
    const targetName = selectedDoc?.name || selectedDoc?.discordUsername || dismissEmail;

    const isConfirmed = await confirm({
      title: "🚨 ยืนยันการปลดแพทย์พ้นสภาพ",
      message: `คุณกำลังจะทำการปลด "${targetName}" พ้นสภาพการเป็นบุคลากรทางการแพทย์โดยตรง โดยไม่มีเงื่อนไขและไม่สามารถกู้คืนได้ ต้องการดำเนินการต่อใช่หรือไม่?`,
      confirmText: "ยืนยันปลดทันที",
      cancelText: "ยกเลิก",
      variant: "danger"
    });

    if (!isConfirmed) return;

    setIsDismissing(true);
    try {
      const res = await fetch("/api/admin/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: dismissEmail,
          reason: dismissReason,
          isReset: dismissIsReset
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to dismiss doctor");
      }

      alert("ดำเนินการปลดแพทย์พ้นสภาพสำเร็จแล้วค่ะ");
      setIsDismissModalOpen(false);
      setDismissEmail("");
      setDismissReason("");
      
      // Reload data to reflect changes
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("ไม่สามารถทำรายการได้: " + err.message);
    } finally {
      setIsDismissing(false);
    }
  };

  // Send Contract handler
  const handleSendContract = async () => {
    if (!newContractEmail) {
      alert("กรุณาเลือกแพทย์ผู้รับสัญญา");
      return;
    }
    if (!newContractTitle.trim()) {
      alert("กรุณาระบุหัวข้อสัญญา");
      return;
    }
    if (!newContractContent.trim()) {
      alert("กรุณาระบุเนื้อหาข้อตกลงสัญญา");
      return;
    }

    setIsSendingContract(true);
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorEmail: newContractEmail,
          title: newContractTitle,
          content: newContractContent
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send contract");
      }

      alert("ส่งข้อตกลงสัญญาแพทย์เรียบร้อยแล้วค่ะ สัญญาจะไปปรากฏใน Inbox ของเป้าหมาย");
      setIsCreateContractModalOpen(false);
      setNewContractEmail("");
      
      // Reload contracts
      loadData();
    } catch (err: any) {
      console.error(err);
      alert("ไม่สามารถส่งสัญญาได้: " + err.message);
    } finally {
      setIsSendingContract(false);
    }
  };

  // Download Contract Document Canvas handler
  const handleDownloadContractDoc = () => {
    if (!contractCanvasRef.current || !selectedContractForDoc) return;
    const canvas = contractCanvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `สัญญาจ้างแพทย์_${selectedContractForDoc.doctor_name}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // useEffect to draw contract on canvas
  useEffect(() => {
    if (selectedContractForDoc && contractCanvasRef.current) {
      const canvas = contractCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#080c18");
      gradient.addColorStop(1, "#030408");
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
        ctx.font = "bold 26px Arial, sans-serif";
        ctx.fillText("FOX COMMUNITY MEDICAL UNIT", canvas.width / 2, 120);

        ctx.fillStyle = themeAccentColor || "#10b981";
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText("Fox Community Medical Unit (FCMU)", canvas.width / 2, 155);

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
        ctx.fillText(selectedContractForDoc.title, canvas.width / 2, 230);
        
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "11px Courier, monospace";
        ctx.fillText(`CONTRACT ID: ${selectedContractForDoc.id.toUpperCase()}`, canvas.width / 2, 260);

        // Date formatting
        const formattedDate = new Date(selectedContractForDoc.created_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Bangkok"
        });

        // Resolve contract text replacements
        let bodyText = selectedContractForDoc.content || "";
        bodyText = bodyText
          .replace(/\[ชื่อแพทย์\]/g, selectedContractForDoc.doctor_name)
          .replace(/\[Discord\]/g, `@${selectedContractForDoc.doctor_discord_username}`)
          .replace(/\[เลขสัญญา\]/g, selectedContractForDoc.id ? selectedContractForDoc.id.substring(0, 8).toUpperCase() : "XXXX")
          .replace(/\[ชื่อผู้ลงนาม\]/g, selectedContractForDoc.signature_name || "_________________________________")
          .replace(/\[วันที่\]/g, formattedDate);

        // Draw body texts
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
        ctx.fillText(`( ${selectedContractForDoc.created_by} )`, 80, y + 55);

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

        if (selectedContractForDoc.status === "accepted" && selectedContractForDoc.signature_name) {
          // Draw handwriting style signature
          ctx.save();
          ctx.textAlign = "center";
          ctx.font = "italic 32px 'Brush Script MT', 'Courier New', cursive";
          ctx.fillStyle = themeAccentColor || "#10b981";
          ctx.fillText(selectedContractForDoc.signature_name, canvas.width - 180, y + 25);
          ctx.restore();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px Arial, sans-serif";
          ctx.fillText(`( ${selectedContractForDoc.signature_name} )`, canvas.width - 80, y + 55);

          const signedDate = new Date(selectedContractForDoc.signed_at).toLocaleDateString("th-TH", {
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
        } else if (selectedContractForDoc.status === "rejected") {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 14px Arial, sans-serif";
          ctx.fillText("ปฏิเสธข้อตกลงสัญญา ❌", canvas.width - 180, y + 25);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.font = "italic 13px Arial, sans-serif";
          ctx.fillText("( รอแพทย์ลงนามสัญญา )", canvas.width - 180, y + 25);
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
      };

      if (cityLogoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = 0.03;
          ctx.drawImage(img, canvas.width / 2 - 160, canvas.height / 2 - 160, 320, 320);
          ctx.restore();
          
          ctx.save();
          ctx.drawImage(img, canvas.width / 2 - 25, 45, 50, 50);
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
  }, [selectedContractForDoc, themeAccentColor, cityLogoUrl]);

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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {systemMode === "resignations" && (
            <button
              onClick={() => setIsDismissModalOpen(true)}
              className="btn btn-danger"
              style={{ display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px", fontSize: "0.85rem", padding: "10px 16px" }}
            >
              <ShieldIcon size={14} />
              🚨 ปลดแพทย์พ้นสภาพ
            </button>
          )}
          <button 
            onClick={loadData} 
            disabled={loading}
            className="btn btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshIcon size={14} className={loading ? "spin" : ""} />
            รีเฟรชข้อมูล
          </button>
        </div>
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
        <button 
          onClick={() => setSystemMode("contracts")}
          style={{ 
            fontSize: "0.9rem", 
            padding: "10px 20px", 
            borderRadius: "10px", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            border: "1px solid var(--border-subtle)",
            background: systemMode === "contracts" ? "var(--accent)" : "rgba(255,255,255,0.015)",
            color: systemMode === "contracts" ? "#000" : "var(--text-secondary)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          <FileTextIcon size={16} style={{ color: systemMode === "contracts" ? "#000" : "inherit" }} />
          จัดการสัญญาแพทย์ ({contracts.length})
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
      ) : systemMode === "resignations" ? (
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
      ) : (
        <>
          {/* Contracts Grid/Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="loading-spinner"></div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "12px" }}>กำลังโหลดข้อมูลสัญญาแพทย์...</p>
            </div>
          ) : (
            <div className="card" style={{ padding: "20px", border: "1px solid var(--border-subtle)", borderRadius: "16px", background: "var(--bg-card)", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>📄 สัญญาจ้างแพทย์กู้ภัยทั้งหมด ({contracts.length})</h3>
                <button
                  onClick={() => setIsCreateContractModalOpen(true)}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px", fontSize: "0.85rem" }}
                >
                  <FileTextIcon size={14} style={{ color: "#000" }} />
                  ส่งสัญญาแพทย์ใหม่
                </button>
              </div>

              {contracts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                  ไม่มีประวัติการส่งสัญญาแพทย์ในระบบ
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "12px 16px" }}>แพทย์ผู้รับ</th>
                        <th style={{ padding: "12px 16px" }}>หัวข้อสัญญา</th>
                        <th style={{ padding: "12px 16px" }}>ผู้ทำสัญญา</th>
                        <th style={{ padding: "12px 16px" }}>วันที่ส่ง</th>
                        <th style={{ padding: "12px 16px" }}>สถานะ</th>
                        <th style={{ padding: "12px 16px" }}>ลายมือชื่อ</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", color: "var(--text-secondary)" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#fff" }}>{c.doctor_name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#818cf8" }}>@{c.doctor_discord_username}</div>
                          </td>
                          <td style={{ padding: "14px 16px", fontWeight: 500 }}>{c.title}</td>
                          <td style={{ padding: "14px 16px", fontSize: "0.8rem" }}>{c.created_by}</td>
                          <td style={{ padding: "14px 16px", fontSize: "0.8rem" }}>{new Date(c.created_at).toLocaleDateString("th-TH")}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "99px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                backgroundColor: c.status === "accepted" ? "rgba(16, 185, 129, 0.12)" : c.status === "rejected" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                                color: c.status === "accepted" ? "#4ade80" : c.status === "rejected" ? "#f87171" : "#fbbf24",
                                border: `1px solid ${c.status === "accepted" ? "rgba(16, 185, 129, 0.2)" : c.status === "rejected" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
                              }}
                            >
                              {c.status === "accepted" ? "ยินยอมแล้ว ✅" : c.status === "rejected" ? "ปฏิเสธสัญญา ❌" : "รอดำเนินการ ⏳"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontStyle: "italic", fontFamily: "cursive", fontSize: "0.95rem", color: "var(--accent-light)" }}>
                            {c.signature_name || "—"}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button
                              onClick={() => setSelectedContractForDoc(c)}
                              className="btn btn-ghost"
                              style={{
                                fontSize: "0.75rem",
                                padding: "6px 12px",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--accent-light)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px"
                              }}
                            >
                              <FileTextIcon size={12} />
                              ดูเอกสารสัญญา
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

      {/* Dismiss Doctor Modal */}
      {isDismissModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
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
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--danger)" }}>
                🚨 ปลดบุคลากรแพทย์พ้นสภาพ (ทันที)
              </h3>
              <button 
                onClick={() => {
                  setIsDismissModalOpen(false);
                  setDismissEmail("");
                  setDismissReason("");
                }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>เลือกแพทย์ที่จะปลด:</label>
                <select
                  value={dismissEmail}
                  onChange={e => setDismissEmail(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="">-- เลือกรายชื่อแพทย์ --</option>
                  {registeredDoctors.map(doc => (
                    <option key={doc.email} value={doc.email}>
                      {doc.name || doc.discordUsername} ({doc.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>ระบุเหตุผลการปลดพ้นสภาพ:</label>
                <textarea
                  placeholder="เช่น ทำผิดวินัยร้ายแรง หรือ ไม่สามารถปฏิบัติงานตามเงื่อนไขของหน่วยงาน"
                  value={dismissReason}
                  onChange={e => setDismissReason(e.target.value)}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    minHeight: "100px",
                    resize: "vertical",
                    lineHeight: 1.5
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="dismiss-reset"
                  checked={dismissIsReset}
                  onChange={e => setDismissIsReset(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--danger)" }}
                />
                <label htmlFor="dismiss-reset" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", userSelect: "none" }}>
                  รีเซ็ตชั่วโมงงานสะสมทั้งหมดและลบประวัติการทำงาน (Reset Hours)
                </label>
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "10px", borderRadius: "6px", lineHeight: 1.4 }}>
                ⚠️ <strong>คำเตือน:</strong> การปลดแพทย์จะดำเนินการลบสิทธิ์ ข้อมูลเวร คิว และชั่วโมงทำงานในระบบทั้งหมดทันที โดยไม่ต้องผ่านการรับการยินยอมจากตัวแพทย์ มีผลบังคับใช้ทันที
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => {
                  setIsDismissModalOpen(false);
                  setDismissEmail("");
                  setDismissReason("");
                }}
                disabled={isDismissing}
                className="btn btn-ghost"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDismissDoctor}
                disabled={isDismissing}
                className="btn btn-danger"
                style={{ padding: "10px 24px", borderRadius: "8px", fontWeight: 600 }}
              >
                {isDismissing ? "กำลังทำรายการ..." : "ยืนยันการปลดออก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Contract Modal */}
      {isCreateContractModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
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
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                📄 สร้างและส่งเอกสารสัญญาแพทย์รายบุคคล
              </h3>
              <button 
                onClick={() => setIsCreateContractModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>เลือกแพทย์ผู้รับสัญญา:</label>
                <select
                  value={newContractEmail}
                  onChange={e => setNewContractEmail(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="">-- เลือกรายชื่อแพทย์ --</option>
                  {registeredDoctors.map(doc => (
                    <option key={doc.email} value={doc.email}>
                      {doc.name || doc.discordUsername} ({doc.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>หัวข้อข้อตกลงสัญญา:</label>
                <input
                  type="text"
                  value={newContractTitle}
                  onChange={e => setNewContractTitle(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>รายละเอียดเนื้อหาข้อตกลงสัญญา:</label>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>รองรับคำทดแทน: [ชื่อแพทย์], [Discord], [วันที่]</span>
                </div>
                <textarea
                  value={newContractContent}
                  onChange={e => setNewContractContent(e.target.value)}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    fontSize: "0.9rem",
                    minHeight: "220px",
                    resize: "vertical",
                    lineHeight: 1.6,
                    fontFamily: "inherit"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setIsCreateContractModalOpen(false)}
                disabled={isSendingContract}
                className="btn btn-ghost"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSendContract}
                disabled={isSendingContract}
                className="btn btn-primary"
                style={{ padding: "10px 24px", borderRadius: "8px", fontWeight: 600 }}
              >
                {isSendingContract ? "กำลังส่ง..." : "ส่งสัญญาแพทย์"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Document Viewer Modal */}
      {selectedContractForDoc && (
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
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                📄 เอกสารสัญญาปฏิบัติงานแพทย์
              </h3>
              <button 
                onClick={() => setSelectedContractForDoc(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", overflow: "hidden" }}>
              <canvas 
                ref={contractCanvasRef} 
                width={800} 
                height={1100} 
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
                onClick={() => setSelectedContractForDoc(null)}
                className="btn btn-ghost"
                style={{ padding: "10px 20px", borderRadius: "8px" }}
              >
                ปิดหน้าต่าง
              </button>
              {selectedContractForDoc.status === "accepted" && (
                <button 
                  onClick={handleDownloadContractDoc}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", borderRadius: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <CameraIcon size={16} style={{ color: "#000" }} />
                  ดาวน์โหลดสัญญา (PNG)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
