"use client";

import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Template {
  id: string;
  categoryId: string;
  title: string;
  content: string;
}

interface Penalty {
  id: string;
  name: string;
  fine: number;
}

export default function UserAnnouncementsPage() {
  const [loading, setLoading] = useState(true);

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);

  // Selection States
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTplId, setSelectedTplId] = useState("");

  // Form Input States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gang, setGang] = useState("");
  const [selectedPenaltyId, setSelectedPenaltyId] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [commandPrefix, setCommandPrefix] = useState("/ems");
  const [useCommandPrefix, setUseCommandPrefix] = useState("/ems");

  // Actions states
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Cooldown states
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [fixedStartTime, setFixedStartTime] = useState<string | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and fetch settings
    getSession().then((session) => {
      if (!session) {
        window.location.href = "/";
        return;
      }

      fetch("/api/announcements/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.categories) {
            setCategories(data.categories);
            if (data.categories.length > 0) {
              setSelectedCatId(data.categories[0].id);
            }
          }
          if (data.templates) setTemplates(data.templates);
          if (data.penalties) {
            setPenalties(data.penalties);
            if (data.penalties.length > 0) {
              setSelectedPenaltyId(data.penalties[0].id);
            }
          }
          if (data.commandPrefix) {
            setCommandPrefix(data.commandPrefix);
            setUseCommandPrefix(data.commandPrefix);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load settings:", err);
          setLoading(false);
        });
    });
  }, []);

  // Filter templates based on selected category
  const filteredTemplates = templates.filter((t) => t.categoryId === selectedCatId);

  // Auto-select first template when category changes
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      setSelectedTplId(filteredTemplates[0].id);
    } else {
      setSelectedTplId("");
    }
  }, [selectedCatId, templates]);

  // Reset frozen times when any of the form variables change
  useEffect(() => {
    setFixedStartTime(null);
    setFixedEndTime(null);
  }, [name, phone, gang, selectedPenaltyId, multiplier, cooldownMinutes, useCommandPrefix, selectedTplId]);

  const activeTemplate = templates.find((t) => t.id === selectedTplId);

  // Detect which placeholders are present in active template
  const hasPlaceholder = (placeholder: string) => {
    if (!activeTemplate) return false;
    return activeTemplate.content.includes(placeholder);
  };

  // Calculate final fine
  const activePenalty = penalties.find((p) => p.id === selectedPenaltyId);
  const baseFine = activePenalty ? activePenalty.fine : 0;
  const totalFine = baseFine * multiplier;

  // Render text content
  const generateFormattedText = (isDiscord = false, startStrOverride?: string, endStrOverride?: string) => {
    if (!activeTemplate) return "";
    let text = activeTemplate.content;

    const penaltyText = activePenalty ? activePenalty.name : "";
    const formattedFine = activePenalty ? `${totalFine.toLocaleString()}` : "";

    let startStr = startStrOverride || fixedStartTime;
    let endStr = endStrOverride || fixedEndTime;

    if (!startStr || !endStr) {
      // Live preview time calculation in Asia/Bangkok
      const now = new Date();
      const bkkNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const bkkEnd = new Date(bkkNow.getTime() + cooldownMinutes * 60 * 1000);
      
      const startH = bkkNow.getHours().toString().padStart(2, "0");
      const startM = bkkNow.getMinutes().toString().padStart(2, "0");
      startStr = `${startH}.${startM}`;

      const endH = bkkEnd.getHours().toString().padStart(2, "0");
      const endM = bkkEnd.getMinutes().toString().padStart(2, "0");
      endStr = `${endH}.${endM}`;
    }

    // Substitutions
    text = text.replaceAll("[ชื่อคน]", name.trim() || "________________");
    text = text.replaceAll("[เบอร์โทร]", phone.trim() || "________________");
    text = text.replaceAll("[ชื่อแก๊ง]", gang.trim() || "________________");
    text = text.replaceAll("[โทษ]", penaltyText || "________________");
    text = text.replaceAll("[ค่าปรับ]", activePenalty ? `$${formattedFine}` : "________________");
    text = text.replaceAll("[ตัวคูณ]", multiplier > 1 ? `${multiplier}` : "1");

    // Cooldown Substitutions
    text = text.replaceAll("[คูลดาวน์]", `${cooldownMinutes}`);
    text = text.replaceAll("[เวลาเริ่ม]", startStr);
    text = text.replaceAll("[เวลาจบ]", endStr);

    // Prepend command prefix if present and not for Discord
    if (!isDiscord && useCommandPrefix.trim()) {
      text = `${useCommandPrefix.trim()} ${text}`;
    }

    return text;
  };

  const formattedResultText = generateFormattedText(false);

  // Copy to Clipboard Action
  const handleCopyText = async () => {
    try {
      const now = new Date();
      const bkkNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const bkkEnd = new Date(bkkNow.getTime() + cooldownMinutes * 60 * 1000);
      
      const startH = bkkNow.getHours().toString().padStart(2, "0");
      const startM = bkkNow.getMinutes().toString().padStart(2, "0");
      const startStr = `${startH}.${startM}`;

      const endH = bkkEnd.getHours().toString().padStart(2, "0");
      const endM = bkkEnd.getMinutes().toString().padStart(2, "0");
      const endStr = `${endH}.${endM}`;

      setFixedStartTime(startStr);
      setFixedEndTime(endStr);

      const textToCopy = generateFormattedText(false, startStr, endStr);

      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      alert("ไม่สามารถคัดลอกข้อความได้โดยอัตโนมัติ กรุณาครอบดำข้อความแล้วคัดลอกเองค่ะ");
    }
  };

  // Discord Send Action
  const handleSendToDiscord = async () => {
    let startStr = fixedStartTime;
    let endStr = fixedEndTime;

    if (!startStr || !endStr) {
      const now = new Date();
      const bkkNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const bkkEnd = new Date(bkkNow.getTime() + cooldownMinutes * 60 * 1000);
      
      const startH = bkkNow.getHours().toString().padStart(2, "0");
      const startM = bkkNow.getMinutes().toString().padStart(2, "0");
      startStr = `${startH}.${startM}`;

      const endH = bkkEnd.getHours().toString().padStart(2, "0");
      const endM = bkkEnd.getMinutes().toString().padStart(2, "0");
      endStr = `${endH}.${endM}`;

      setFixedStartTime(startStr);
      setFixedEndTime(endStr);
    }

    const discordText = generateFormattedText(true, startStr, endStr);
    if (!discordText) return;
    setIsSendingDiscord(true);
    setDiscordStatus(null);

    try {
      const res = await fetch("/api/announcements/send-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeTemplate ? activeTemplate.title : "ประกาศด่วน",
          content: discordText
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDiscordStatus({ message: "ส่งประกาศเข้าสู่ระบบ Discord เรียบร้อยแล้วค่ะ! 🚀", type: "success" });
      } else {
        setDiscordStatus({ message: data.error || "เกิดข้อผิดพลาดในการส่ง", type: "error" });
      }
    } catch (err) {
      setDiscordStatus({ message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อส่งข้อมูลได้", type: "error" });
    } finally {
      setIsSendingDiscord(false);
      setTimeout(() => setDiscordStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text-secondary)" }}>
        กำลังเตรียมข้อมูลประกาศและค่าปรับ...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>📣 ศูนย์จัดการข้อความประกาศ</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>สร้างข้อความประกาศ ติด Blacklist หรือ ค้นเคสไม่เจอ พร้อมจัดโครงสร้างและคำนวณโทษปรับโดยอัตโนมัติ</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* Left Side: Form Controls */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-light)", margin: 0, borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            ⚙️ เลือกประเภทและกรอกข้อมูล
          </h2>

          {/* 1. Category Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>1. เลือกหมวดหมู่ประกาศ</label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              style={{ padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", cursor: "pointer" }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {categories.find(c => c.id === selectedCatId)?.description && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                ℹ️ {categories.find(c => c.id === selectedCatId)?.description}
              </span>
            )}
          </div>

          {/* 2. Template Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>2. เลือกรูปแบบข้อความ</label>
            {filteredTemplates.length === 0 ? (
              <div style={{ padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", borderRadius: "8px", textAlign: "center" }}>
                ไม่มีรูปแบบประกาศในหมวดหมู่นี้
              </div>
            ) : (
              <select
                value={selectedTplId}
                onChange={(e) => setSelectedTplId(e.target.value)}
                style={{ padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", cursor: "pointer" }}
              >
                {filteredTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Command Prefix Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>3. คำสั่งประกาศหน่วยงาน (Tag / Command Prefix)</label>
            <input
              type="text"
              placeholder="เช่น /ems, /gov หรือเว้นว่างไว้"
              value={useCommandPrefix}
              onChange={(e) => setUseCommandPrefix(e.target.value)}
              style={{ padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              ระบบจะนำตัวย่อนี้ไปเติมหน้าข้อความเมื่อคัดลอก (สำหรับพิมพ์ในแชทเกม FiveM)
            </span>
          </div>

          {/* Dynamic Form Fields based on Template Content */}
          {activeTemplate && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px", padding: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>✍️ ข้อมูลเสริมในประกาศ</div>
              
              {/* Name Field */}
              {hasPlaceholder("[ชื่อคน]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>👤 ชื่อ-นามสกุล คนไข้/บุคคล</label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อจริง-นามสกุล หรือชื่อเรียก"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* Phone Field */}
              {hasPlaceholder("[เบอร์โทร]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>📞 เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="เช่น 123-4567 หรือ 0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* Gang/Family Field */}
              {hasPlaceholder("[ชื่อแก๊ง]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>🏴‍☠️ ชื่อกลุ่ม / แก๊ง / สังกัด</label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อแก๊ง (ถ้าไม่มีให้ใส่ - หรือ ประชาชน)"
                    value={gang}
                    onChange={(e) => setGang(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* Blacklist Penalties Dropdown */}
              {hasPlaceholder("[โทษ]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>⚖️ ข้อหา / โทษที่ทำความผิด</label>
                  {penalties.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>ไม่มีข้อมูลโทษแบล็คลิสต์ในระบบ (ติดต่อแอดมิน)</span>
                  ) : (
                    <select
                      value={selectedPenaltyId}
                      onChange={(e) => setSelectedPenaltyId(e.target.value)}
                      style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      {penalties.map((pen) => (
                        <option key={pen.id} value={pen.id}>{pen.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Penalty Multiplier (if Repeated Blacklist) */}
              {hasPlaceholder("[ค่าปรับ]") && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  
                  {/* Fine Display */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>💵 ค่าปรับรวม</label>
                    <div style={{
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--accent-light)",
                      borderRadius: "6px",
                      fontSize: "0.95rem",
                      fontWeight: "bold",
                      fontFamily: "var(--font-mono)",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      ${totalFine.toLocaleString()}
                    </div>
                  </div>

                  {/* Multiplier Input */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>✖️ Blacklist ซ้ำ (ตัวคูณโทษ)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={multiplier}
                      onChange={(e) => setMultiplier(Math.max(1, Number(e.target.value)))}
                      style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                    />
                  </div>

                </div>
              )}

              {/* Cooldown Duration Input */}
              {(hasPlaceholder("[คูลดาวน์]") || hasPlaceholder("[เวลาเริ่ม]") || hasPlaceholder("[เวลาจบ]")) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>⏱️ เวลาคูลดาวน์ (นาที)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="ระบุระยะเวลาคูลดาวน์ เช่น 10, 15, 30"
                    value={cooldownMinutes}
                    onChange={(e) => setCooldownMinutes(Math.max(1, Number(e.target.value)))}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Side: Live Preview & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Live Preview Panel */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "360px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.2rem", color: "var(--accent-light)", margin: 0 }}>
                👁️ ตัวอย่างประกาศเรียลไทม์ (Live Preview)
              </h2>
              {activeTemplate && (
                <span style={{ fontSize: "0.75rem", background: "var(--bg-secondary)", padding: "4px 10px", borderRadius: "10px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                  {activeTemplate.title}
                </span>
              )}
            </div>

            {/* Formatted Text Box */}
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
              <textarea
                readOnly
                value={formattedResultText}
                style={{
                  width: "100%",
                  flex: 1,
                  minHeight: "220px",
                  padding: "16px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-mono)",
                  lineHeight: "1.6",
                  outline: "none",
                  resize: "none",
                  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)"
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              {/* Status Alert */}
              {discordStatus && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: discordStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${discordStatus.type === "success" ? "var(--success)" : "var(--danger)"}`,
                  color: discordStatus.type === "success" ? "var(--success)" : "var(--danger)",
                  textAlign: "center"
                }}>
                  {discordStatus.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                
                {/* Copy Button */}
                <button
                  onClick={handleCopyText}
                  disabled={!formattedResultText}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: copySuccess ? "var(--success)" : "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    cursor: formattedResultText ? "pointer" : "not-allowed",
                    opacity: formattedResultText ? 1 : 0.6,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: copySuccess ? "0 0 10px var(--accent-glow)" : "none"
                  }}
                >
                  {copySuccess ? "📋 คัดลอกสำเร็จแล้ว!" : "📋 คัดลอกข้อความประกาศ"}
                </button>

                {/* Discord Webhook Button */}
                <button
                  onClick={handleSendToDiscord}
                  disabled={!formattedResultText || isSendingDiscord}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#5865F2", // Discord Blurple Color
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    cursor: (formattedResultText && !isSendingDiscord) ? "pointer" : "not-allowed",
                    opacity: (formattedResultText && !isSendingDiscord) ? 1 : 0.6,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  {isSendingDiscord ? "กำลังส่ง..." : "💬 ส่งเข้า Discord"}
                </button>

              </div>
              
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                * สามารถคัดลอกไปวางในดิสคอร์ดหรือพิมพ์ประกาศในแชทเกม FiveM ได้เลยค่ะ
              </span>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
