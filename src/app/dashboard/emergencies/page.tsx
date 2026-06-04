"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import { Phone, Check, ExternalLink, Siren } from "lucide-react";

export default function EmergenciesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [emergencyCalls, setEmergencyCalls] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Update current time every minute to refresh card timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Synthesize alarm sound for emergency notifications
  const playEmergencyChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Node 1 (High alarm tone)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(880.00, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      
      // Node 2 (Siren osc)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(1100.00, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.45);
      }, 150);
    } catch (e) {
      console.warn("AudioContext blocked or failed to play chime:", e);
    }
  }, []);

  // Fetch pending emergency notifications
  const fetchEmergencyCalls = useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from("emergency_calls")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }); // Newest first
      
      if (!error && data) {
        setEmergencyCalls(data);
      }
    } catch (err) {
      console.error("Failed to fetch emergency calls:", err);
    }
  }, []);

  const handleResolveEmergency = async (id: string) => {
    try {
      const res = await fetch(`/api/emergency-calls/${id}/resolve`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        showToast("ช่วยเหลือสำเร็จแล้ว", "success");
        setEmergencyCalls(prev => prev.filter(c => c.id !== id));
      } else {
        showToast(data.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const [commandPrefix, setCommandPrefix] = useState("/ems");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.settings && data.settings.announcement_command_prefix) {
          setCommandPrefix(data.settings.announcement_command_prefix);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    if (!loading) {
      loadSettings();
    }
  }, [loading]);

  const handleCopyAnnouncement = (phone: string, type: "not_found" | "inaccessible") => {
    const cleanPhone = phone.replace(/\D/g, "");
    let text = "";
    if (type === "not_found") {
      text = `${commandPrefix} คนไข้เบอร์ ${cleanPhone} แพทย์ไม่พบผู้สลบ รบกวนแจ้งในห้องขอความช่วยเหลือแพทย์ในนิตยสารประเทศ ขอบคุณครับ/ค่ะ`;
    } else {
      text = `${commandPrefix} คนไข้เบอร์ ${cleanPhone} เนื่องจากแพทย์ไม่สามารถเข้าถึงพื้นที่เพื่อทำการรักษาได้ รบกวนเปิด Ticket แจ้ง Admin เพื่อรับการช่วยเหลือ ขอบคุณครับ/ค่ะ`;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        showToast("คัดลอกประกาศไปยังคลิปบอร์ดแล้ว", "success");
      })
      .catch(() => {
        showToast("ไม่สามารถคัดลอกข้อความได้", "error");
      });
  };

  // Auth Guard & fetch initial data
  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        router.replace("/");
      } else {
        setLoading(false);
        fetchEmergencyCalls();
      }
    });
  }, [router, fetchEmergencyCalls]);

  // Setup Supabase Realtime subscription for emergency calls
  useEffect(() => {
    if (loading) return;

    const channel = supabaseClient
      .channel("realtime-emergencies-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_calls",
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newCall = payload.new;
            if (newCall && newCall.status === "pending") {
              setEmergencyCalls(prev => [newCall, ...prev]);
              playEmergencyChime();
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedCall = payload.new;
            if (updatedCall) {
              if (updatedCall.status !== "pending") {
                setEmergencyCalls(prev => prev.filter(c => c.id !== updatedCall.id));
              } else {
                setEmergencyCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deletedCall = payload.old;
            if (deletedCall) {
              setEmergencyCalls(prev => prev.filter(c => c.id !== deletedCall.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [loading, fetchEmergencyCalls, playEmergencyChime]);

  useEffect(() => {
    document.title = "บอร์ดรับแจ้งเหตุฉุกเฉิน | EMS Clock-in";
  }, []);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Board Header */}
      <div 
        className="weekly-bonus-summary-card" 
        style={{ 
          border: emergencyCalls.length > 0 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid var(--border-subtle)", 
          boxShadow: emergencyCalls.length > 0 ? "0 0 16px rgba(239, 68, 68, 0.15)" : undefined,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: emergencyCalls.length > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.02)",
            border: emergencyCalls.length > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Siren 
              size={24} 
              style={{ 
                color: emergencyCalls.length > 0 ? "#ef4444" : "var(--text-secondary)", 
                animation: emergencyCalls.length > 0 ? "pulse 1.5s infinite" : undefined 
              }} 
            />
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", marginBottom: "2px" }}>
              ศูนย์รับแจ้งเหตุฉุกเฉิน (Emergency Dispatch Board)
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              แสดงเหตุผู้ป่วยสลบและต้องการความช่วยเหลือแบบ Real-time
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span 
            className={`portal-status-badge ${emergencyCalls.length > 0 ? "pending_proof" : "completed"}`}
            style={{ fontSize: "0.85rem", padding: "6px 14px", fontWeight: "bold" }}
          >
            {emergencyCalls.length > 0 ? (
              <>มีเหตุสลบ {emergencyCalls.length} เคส</>
            ) : (
              <>🟢 สถานะปกติไม่มีเหตุ</>
            )}
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      {emergencyCalls.length > 0 ? (
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
            gap: "24px" 
          }}
        >
          {emergencyCalls.map((call) => {
            const minutesElapsed = Math.max(0, Math.floor((currentTime - new Date(call.created_at).getTime()) / 60000));
            const timeText = minutesElapsed === 0 ? "เมื่อครู่นี้" : `แจ้งเมื่อ ${minutesElapsed} นาทีที่แล้ว`;

            return (
              <div 
                key={call.id} 
                className="weekly-bonus-summary-card" 
                style={{ 
                  background: "rgba(239, 68, 68, 0.02)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)", 
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.05)",
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "16px",
                  borderRadius: "12px",
                  padding: "18px",
                  transition: "transform 0.2s, border-color 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Phone size={16} style={{ color: "var(--accent-light)" }} />
                    <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#fff" }}>{call.phone}</span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>{timeText}</span>
                </div>

                {/* Spot Image */}
                <a 
                  href={call.image_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    width: "100%", 
                    height: "180px", 
                    borderRadius: "8px", 
                    overflow: "hidden", 
                    border: "1px solid rgba(255,255,255,0.06)",
                    position: "relative",
                    display: "block"
                  }}
                >
                  <img 
                    src={call.image_url} 
                    alt="Emergency Spot" 
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  />
                  <div 
                    style={{ 
                      position: "absolute", 
                      bottom: "8px", 
                      right: "8px", 
                      background: "rgba(0,0,0,0.75)", 
                      padding: "4px 8px", 
                      borderRadius: "6px", 
                      fontSize: "0.68rem", 
                      color: "#fff", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px" 
                    }}
                  >
                    <ExternalLink size={12} /> คลิกเพื่อดูจุดเกิดเหตุขนาดใหญ่
                  </div>
                </a>

                {/* Copy Shortcuts */}
                <div style={{ display: "flex", gap: "10px", marginTop: "-4px" }}>
                  <button 
                    onClick={() => handleCopyAnnouncement(call.phone, "not_found")}
                    className="btn btn-ghost"
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(255, 255, 255, 0.01)",
                      borderRadius: "8px",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.75)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.01)";
                    }}
                  >
                    🔍 ไม่พบศพ
                  </button>
                  <button 
                    onClick={() => handleCopyAnnouncement(call.phone, "inaccessible")}
                    className="btn btn-ghost"
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(255, 255, 255, 0.01)",
                      borderRadius: "8px",
                      fontSize: "0.74rem",
                      color: "rgba(255, 255, 255, 0.75)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.01)";
                    }}
                  >
                    🚧 เข้าถึงไม่ได้
                  </button>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleResolveEmergency(call.id)}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    background: "var(--accent)",
                    color: "#060a13",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "background 0.2s, transform 0.1s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--accent-light)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                >
                  <Check size={16} strokeWidth={3} /> ช่วยเหลือสำเร็จแล้ว
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Empty State */
        <div 
          className="weekly-bonus-summary-card" 
          style={{ 
            padding: "48px 24px", 
            textAlign: "center", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "16px",
            background: "rgba(255, 255, 255, 0.005)",
            border: "1px dashed var(--border-subtle)"
          }}
        >
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <span style={{ fontSize: "1.5rem" }}>🟢</span>
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
              สถานการณ์ปกติ
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "360px" }}>
              ไม่มีรายงานผู้ป่วยสลบเข้ามาในระบบในขณะนี้ ทุกคนปลอดภัยดี
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
