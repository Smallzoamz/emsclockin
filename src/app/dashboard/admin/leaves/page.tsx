"use client";

import { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";

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

export default function LeaveManagementPage() {
  const confirm = useConfirm();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Fetch leave requests from Supabase
  const loadLeaves = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (err: any) {
      console.error("[Leaves Fetch Error] Failed to load leave requests:", err);
      alert("ไม่สามารถโหลดข้อมูลการลาได้: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "จัดการใบลาแพทย์ | EMS Clock-in";
    loadLeaves();
  }, []);

  // Filtered leaves based on active tab
  const filteredLeaves = leaves.filter(leave => leave.status === activeTab);

  // Update status handler (approve/reject)
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
      // Get current logged-in user email or display name from next-auth/react?
      // Since it's client-side, we can fetch active session details if needed, but we can default to "Admin"
      // or check the local session.
      const { data: { session } } = await supabase.auth.getSession();
      const adminName = session?.user?.email || "Admin";

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: newStatus,
          approved_by: adminName,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Update state local
      setLeaves(prev => prev.map(leave => 
        leave.id === id ? { ...leave, status: newStatus, approved_by: adminName } : leave
      ));

      alert(`${actionLabel}สำเร็จแล้วค่ะ`);
    } catch (err: any) {
      console.error(`[Leaves Update Error] Failed to update status:`, err);
      alert(`ดำเนินการล้มเหลว: ` + err.message);
    }
  };

  // Reset status back to pending
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
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "pending",
          approved_by: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      setLeaves(prev => prev.map(leave => 
        leave.id === id ? { ...leave, status: "pending", approved_by: null } : leave
      ));

      alert("เปลี่ยนสถานะกลับเป็นรอดำเนินการสำเร็จ");
    } catch (err: any) {
      console.error(err);
      alert("ดำเนินการล้มเหลว: " + err.message);
    }
  };

  return (
    <div className="page-container" style={{ padding: "0 16px 32px 16px", color: "var(--text-primary)" }}>
      {/* Page Header */}
      <header className="page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
            <FileTextIcon size={28} />
            ระบบจัดการและอนุมัติใบลาพักงาน
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            จัดการ ตรวจสอบ และอนุมัติใบลาสะสมของแพทย์ทุกคนแบบ Real-Time
          </p>
        </div>
        <button 
          onClick={loadLeaves} 
          disabled={loading}
          className="btn btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshIcon size={14} className={loading ? "spin" : ""} />
          รีเฟรชข้อมูล
        </button>
      </header>

      {/* Tabs Menu */}
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

      {/* Main Grid Content */}
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
    </div>
  );
}
