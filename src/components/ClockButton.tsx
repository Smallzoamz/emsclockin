"use client";

import { useState } from "react";
import { PowerIcon, CameraIcon, FolderIcon } from "./Icons";

interface ClockButtonProps {
  isOnDuty: boolean;
  onClockIn: () => Promise<void>;
  onClockOut: (file: File) => Promise<void>;
}

export function ClockButton({ isOnDuty, onClockIn, onClockOut }: ClockButtonProps) {
  const [pressing, setPressing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleClick = async () => {
    if (pressing) return;
    
    if (isOnDuty) {
      setShowModal(true);
      return;
    }

    setPressing(true);
    try {
      await onClockIn();
    } finally {
      setPressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleConfirmClockOut = async () => {
    if (!proofFile) return;
    setPressing(true);
    try {
      await onClockOut(proofFile);
      setShowModal(false);
      setProofFile(null);
      setPreviewUrl(null);
    } finally {
      setPressing(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setProofFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="clock-btn-wrapper">
      <button
        className={`clock-btn ${isOnDuty ? "on-duty" : ""}`}
        onClick={handleClick}
        disabled={pressing}
        id="clock-btn"
        aria-label={isOnDuty ? "ออกเวร" : "เข้าเวร"}
      >
        <span className="btn-icon">
          <PowerIcon size={24} style={{ color: isOnDuty ? "var(--danger)" : "var(--accent-light)", display: "block" }} />
        </span>
        <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>
          {pressing ? "กำลังดำเนินการ..." : isOnDuty ? "ออกเวร" : "เข้าเวร"}
        </span>
        <span className="btn-label">
          {isOnDuty ? "กดเพื่อสิ้นสุดเวร" : "กดเพื่อเริ่มเวร"}
        </span>
      </button>

      {/* Upload Proof Modal */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "24px" }}>
            <h3 style={{ marginBottom: "8px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CameraIcon size={20} style={{ color: "var(--accent)" }} />
              ยืนยันการออกเวร
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
              กรุณาอัปโหลดรูปภาพแคปหน้าจอเพื่อเป็นหลักฐานยืนยันการออกเวรของคุณ
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label 
                htmlFor="proof-upload" 
                style={{ 
                  display: "block", 
                  padding: previewUrl ? "8px" : "32px", 
                  border: "2px dashed var(--border-subtle)", 
                  borderRadius: "12px", 
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--bg-secondary)",
                  transition: "0.2s"
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", objectFit: "contain" }} />
                ) : (
                  <div style={{ color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <FolderIcon size={32} style={{ marginBottom: "8px", color: "var(--text-muted)" }} />
                    คลิกเพื่อเลือกรูปภาพ<br/>
                    <small>(.jpg, .png)</small>
                  </div>
                )}
              </label>
              <input 
                id="proof-upload" 
                type="file" 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handleFileChange}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button 
                onClick={handleCancel}
                disabled={pressing}
                style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", borderRadius: "8px", fontWeight: "bold", cursor: pressing ? "not-allowed" : "pointer" }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleConfirmClockOut}
                disabled={!proofFile || pressing}
                style={{ flex: 1, padding: "12px", background: "var(--danger)", border: "none", color: "white", borderRadius: "8px", fontWeight: "bold", opacity: (!proofFile || pressing) ? 0.5 : 1, cursor: (!proofFile || pressing) ? "not-allowed" : "pointer" }}
              >
                {pressing ? "กำลังออกเวร..." : "ยืนยันออกเวร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
