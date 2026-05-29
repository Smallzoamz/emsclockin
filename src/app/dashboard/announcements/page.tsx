"use client";

import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { formatThaiDate } from "@/lib/utils";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  MegaphoneIcon,
  SettingsIcon,
  UserIcon,
  PhoneIcon,
  FlagIcon,
  WarningIcon,
  ClipboardIcon,
  SendIcon,
  LockIcon,
  InfoIcon,
  ClockIcon
} from "@/components/Icons";

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
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);

  // Data States
  const [blacklistHistory, setBlacklistHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dbWarning, setDbWarning] = useState(false);
  const [loggedBlacklistId, setLoggedBlacklistId] = useState<string | null>(null);
  const [blacklistReleaseTemplate, setBlacklistReleaseTemplate] = useState("");
  const [releasingId, setReleasingId] = useState<string | null>(null);

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
  const [gangA, setGangA] = useState("");
  const [gangB, setGangB] = useState("");
  const [selectedPenaltyId, setSelectedPenaltyId] = useState("");
  const [multiplier, setMultiplier] = useState(1);
  const [commandPrefix, setCommandPrefix] = useState("/ems");

  // 5 Story Pairs State
  const [storyPairs, setStoryPairs] = useState<Array<{
    gangA: string;
    tagA: string;
    scoreA: string;
    gangB: string;
    tagB: string;
    scoreB: string;
  }>>([
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" }
  ]);

  const updateStoryPair = (index: number, field: "gangA" | "tagA" | "scoreA" | "gangB" | "tagB" | "scoreB", value: string) => {
    setStoryPairs(prev => prev.map((pair, idx) => {
      if (idx === index) {
        return { ...pair, [field]: value };
      }
      return pair;
    }));
  };

  const formatPair = (gangAName: string, tagAVal: string, scoreAVal: string, gangBName: string, tagBVal: string, scoreBVal: string) => {
    const gA = gangAName.trim() || "ชื่อแก๊ง A";
    const tA = tagAVal.trim() ? `[${tagAVal.trim()}]` : "";
    const sA = scoreAVal.trim() !== "" ? scoreAVal.trim() : "0";

    const gB = gangBName.trim() || "ชื่อแก๊ง B";
    const tB = tagBVal.trim() ? `[${tagBVal.trim()}]` : "";
    const sB = scoreBVal.trim() !== "" ? scoreBVal.trim() : "0";

    return `[${sA}] ${gA}${tA} vs ${gB}${tB} [${sB}]`;
  };

  // Actions states
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Cooldown states
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [fixedStartTime, setFixedStartTime] = useState<string | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState<string | null>(null);

  const fetchBlacklistHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/announcements/blacklist");
      if (res.ok) {
        const data = await res.json();
        setBlacklistHistory(data.records || []);
        setDbWarning(!!data.dbWarning);
      }
    } catch (err) {
      console.error("Failed to fetch blacklist history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

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
          }
          if (data.blacklistReleaseTemplate) {
            setBlacklistReleaseTemplate(data.blacklistReleaseTemplate);
          }
          fetchBlacklistHistory();
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

  // Reset frozen times and logged ID when any of the form variables change
  useEffect(() => {
    setFixedStartTime(null);
    setFixedEndTime(null);
    setLoggedBlacklistId(null);
  }, [name, phone, gang, gangA, gangB, JSON.stringify(storyPairs), selectedPenaltyId, multiplier, cooldownMinutes, commandPrefix, selectedTplId, selectedCatId]);

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
    text = text.replaceAll("[แก๊งA]", gangA.trim() || "________________");
    text = text.replaceAll("[แก๊งB]", gangB.trim() || "________________");
    text = text.replaceAll("[โทษ]", penaltyText || "________________");
    text = text.replaceAll("[ค่าปรับ]", activePenalty ? `${formattedFine} IC` : "________________");
    text = text.replaceAll("[ตัวคูณ]", multiplier > 1 ? `${multiplier}` : "1");

    // Format all active story pairs
    const formattedPairs = storyPairs
      .filter(p => p.gangA.trim() || p.gangB.trim() || p.scoreA || p.scoreB)
      .map(p => {
        const gA = p.gangA.trim() || "ชื่อแก๊ง A";
        const tA = p.tagA.trim() ? `[${p.tagA.trim()}]` : "";
        const sA = p.scoreA.trim() !== "" ? p.scoreA.trim() : "0";

        const gB = p.gangB.trim() || "ชื่อแก๊ง B";
        const tB = p.tagB.trim() ? `[${p.tagB.trim()}]` : "";
        const sB = p.scoreB.trim() !== "" ? p.scoreB.trim() : "0";

        return `[${sA}] ${gA}${tA} vs ${gB}${tB} [${sB}]`;
      });

    const storyScoreText = formattedPairs.length > 0 
      ? formattedPairs.join("\n") 
      : "[ยังไม่มีข้อมูลคู่สตอรี่]";

    text = text.replaceAll("[คะแนนสตอรี่]", storyScoreText);

    // Cooldown Substitutions
    text = text.replaceAll("[คูลดาวน์]", `${cooldownMinutes}`);
    text = text.replaceAll("[เวลาเริ่ม]", startStr);
    text = text.replaceAll("[เวลาจบ]", endStr);

    // Prepend command prefix if present and not for Discord
    if (!isDiscord && commandPrefix.trim()) {
      text = `${commandPrefix.trim()} ${text}`;
    }

    return text;
  };

  const formattedResultText = generateFormattedText(false);

  const saveOrUpdateBlacklistRecord = async () => {
    const categoryName = categories.find(c => c.id === selectedCatId)?.name.toLowerCase() || "";
    const isBlacklist = selectedCatId === "cat_blacklist" || 
      categoryName.includes("blacklist") ||
      categoryName.includes("แบล็คลิสต์") ||
      categoryName.includes("แบลคลิส") ||
      categoryName.includes("แบล็คลิส") ||
      (activeTemplate && activeTemplate.content.includes("[โทษ]"));

    const resolvedName = name.trim() || gang.trim();

    if (!isBlacklist || !resolvedName) return;

    try {
      const activePenalty = penalties.find((p) => p.id === selectedPenaltyId);
      const res = await fetch("/api/announcements/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loggedBlacklistId || undefined,
          name: resolvedName,
          phone: phone.trim(),
          gang: gang.trim(),
          penalty: activePenalty ? activePenalty.name : "",
          fine: totalFine,
          multiplier: multiplier
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record?.id) {
          setLoggedBlacklistId(data.record.id);
          // Reload the blacklist history
          fetchBlacklistHistory();
        }
      }
    } catch (err) {
      console.error("Failed to log blacklist record:", err);
    }
  };

  // Copy to Clipboard Action
  const handleCopyText = async () => {
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

    // 1. Try to copy to clipboard
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("ไม่สามารถคัดลอกข้อความได้โดยอัตโนมัติ กรุณาครอบดำข้อความในช่องพรีวิวแล้วคัดลอกด้วยตนเองค่ะ (ระบบจะยังคงบันทึกประวัติการติด Blacklist ให้ตามปกติค่ะ)");
    }

    // 2. Log/upsert blacklist record in database (Independent of clipboard success!)
    await saveOrUpdateBlacklistRecord();
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
        
        // Log/upsert blacklist record in database
        await saveOrUpdateBlacklistRecord();
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

  const handleReleaseBlacklist = async (record: any) => {
    if (!await confirm({
      title: "🕊️ ปลดสิทธิ์แบล็คลิสต์",
      message: `ยืนยันการปลด Blacklist ของ "${record.name}" หรือไม่?`,
      confirmText: "ปลดแบล็คลิสต์",
      cancelText: "ยกเลิก",
      variant: "warning"
    })) return;

    setReleasingId(record.id);
    try {
      // Substitute placeholders in template
      let text = blacklistReleaseTemplate || "**[ปลด Blacklist บุคคล]**\nชื่อ-นามสกุล: [ชื่อคน]\nเบอร์โทรศัพท์: [เบอร์โทร]\nชื่อกลุ่ม/แก๊ง: [ชื่อแก๊ง]\nสถานะ: ปลดแบล็คลิสต์ เรียบร้อยแล้วค่ะ";
      text = text.replaceAll("[ชื่อคน]", record.name || "");
      text = text.replaceAll("[เบอร์โทร]", record.phone || "-");
      text = text.replaceAll("[ชื่อแก๊ง]", record.gang || "-");
      text = text.replaceAll("[โทษ]", record.penalty || "");
      text = text.replaceAll("[ค่าปรับ]", record.fine ? `${Number(record.fine).toLocaleString()} IC` : "0 IC");
      text = text.replaceAll("[ตัวคูณ]", record.multiplier ? `${record.multiplier}` : "1");

      // Prepend command prefix if configured
      const clipboardText = commandPrefix.trim() 
        ? `${commandPrefix.trim()} ${text}`
        : text;

      // Write to clipboard
      await navigator.clipboard.writeText(clipboardText);

      // Send stripped version to Discord
      const discordRes = await fetch("/api/announcements/send-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "แจ้งปลด Blacklist บุคคล",
          content: text // prefix-stripped
        })
      });

      if (!discordRes.ok) {
        console.warn("Failed to send release announcement to Discord");
      }

      // Update DB status to released
      const dbRes = await fetch("/api/announcements/blacklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id })
      });

      if (dbRes.ok) {
        setDiscordStatus({
          message: `ปลดแบล็คลิสต์ "${record.name}" สำเร็จและคัดลอกประกาศเรียบร้อยแล้วค่ะ! 🔓`,
          type: "success"
        });
        setTimeout(() => setDiscordStatus(null), 5000);
        await fetchBlacklistHistory();
      } else {
        const errData = await dbRes.json();
        alert(errData.error || "เกิดข้อผิดพลาดในการปลดแบล็คลิสต์");
      }
    } catch (err: any) {
      console.error("Error releasing blacklist:", err);
      alert("เกิดข้อผิดพลาด: " + (err.message || err));
    } finally {
      setReleasingId(null);
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
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <MegaphoneIcon size={24} style={{ color: "var(--accent)" }} />
          ศูนย์จัดการข้อความประกาศ
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>สร้างข้อความประกาศ ติด Blacklist หรือ ค้นเคสไม่เจอ พร้อมจัดโครงสร้างและคำนวณโทษปรับโดยอัตโนมัติ</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* Left Side: Form Controls */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-light)", margin: 0, borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <SettingsIcon size={20} />
            เลือกประเภทและกรอกข้อมูล
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
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                <InfoIcon size={12} />
                {categories.find(c => c.id === selectedCatId)?.description}
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

          {/* Dynamic Form Fields based on Template Content */}
          {activeTemplate && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px", padding: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>✍️ ข้อมูลเสริมในประกาศ</div>
              
              {/* Name Field */}
              {hasPlaceholder("[ชื่อคน]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <UserIcon size={14} />
                    ชื่อ-นามสกุล คนไข้/บุคคล
                  </label>
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
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <PhoneIcon size={14} />
                    เบอร์โทรศัพท์
                  </label>
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
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FlagIcon size={14} />
                    ชื่อกลุ่ม / แก๊ง / สังกัด
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อแก๊ง (ถ้าไม่มีให้ใส่ - หรือ ประชาชน)"
                    value={gang}
                    onChange={(e) => setGang(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* Gang A Field */}
              {hasPlaceholder("[แก๊งA]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FlagIcon size={14} style={{ color: "var(--accent)" }} />
                    แก๊ง A / ฝั่ง A
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อแก๊ง A หรือฝั่งแรก"
                    value={gangA}
                    onChange={(e) => setGangA(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* Gang B Field */}
              {hasPlaceholder("[แก๊งB]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FlagIcon size={14} style={{ color: "var(--accent)" }} />
                    แก๊ง B / ฝั่ง B
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อแก๊ง B หรือฝั่งตรงข้าม"
                    value={gangB}
                    onChange={(e) => setGangB(e.target.value)}
                    style={{ padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>
              )}

              {/* 5-Pairs Story Score Form */}
              {hasPlaceholder("[คะแนนสตอรี่]") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--accent-light)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>📊 ตารางบันทึกคะแนนสตอรี่ (สูงสุด 5 คู่)</div>
                  
                  {storyPairs.map((pair, index) => {
                    const isRowActive = pair.gangA.trim() || pair.gangB.trim() || pair.scoreA || pair.scoreB;
                    
                    return (
                      <div key={index} style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "16px",
                        background: isRowActive ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.005)",
                        border: `1px solid ${isRowActive ? "var(--accent)" : "var(--border-subtle)"}`,
                        borderRadius: "10px",
                        position: "relative",
                        transition: "all 0.2s"
                      }}>
                        
                        {/* Header of Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: isRowActive ? "var(--accent-light)" : "var(--text-secondary)" }}>
                            ⚔️ คู่ที่ {index + 1}
                          </span>
                          
                          {/* Row Copy Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const text = formatPair(pair.gangA, pair.tagA, pair.scoreA, pair.gangB, pair.tagB, pair.scoreB);
                              navigator.clipboard.writeText(text);
                              alert(`คัดลอกคะแนนคู่ที่ ${index + 1} เรียบร้อยแล้วค่ะ!`);
                            }}
                            title="คัดลอกคู่นี้"
                            style={{
                              padding: "4px 8px",
                              background: isRowActive ? "var(--primary)" : "var(--bg-secondary)",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              cursor: isRowActive ? "pointer" : "not-allowed",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              opacity: isRowActive ? 1 : 0.5,
                              pointerEvents: isRowActive ? "auto" : "none",
                              transition: "all 0.2s"
                            }}
                          >
                            <ClipboardIcon size={12} />
                            คัดลอกคู่นี้
                          </button>
                        </div>

                        {/* Grid for Gang inputs */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "center" }}>
                          
                          {/* Gang A Inputs */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder="ชื่อแก๊ง A"
                              value={pair.gangA}
                              onChange={(e) => updateStoryPair(index, "gangA", e.target.value)}
                              style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                              <input
                                type="text"
                                placeholder="Tag A"
                                value={pair.tagA}
                                onChange={(e) => updateStoryPair(index, "tagA", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="สกอร์ A"
                                value={pair.scoreA}
                                onChange={(e) => updateStoryPair(index, "scoreA", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                          </div>

                          {/* VS text separator */}
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold" }}>
                            VS
                          </div>

                          {/* Gang B Inputs */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder="ชื่อแก๊ง B"
                              value={pair.gangB}
                              onChange={(e) => updateStoryPair(index, "gangB", e.target.value)}
                              style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                              <input
                                type="text"
                                placeholder="Tag B"
                                value={pair.tagB}
                                onChange={(e) => updateStoryPair(index, "tagB", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }}
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="สกอร์ B"
                                value={pair.scoreB}
                                onChange={(e) => updateStoryPair(index, "scoreB", e.target.value)}
                                style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none", fontFamily: "var(--font-mono)" }}
                              />
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })}
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
                      {totalFine.toLocaleString()} IC
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
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ClockIcon size={14} />
                    เวลาคูลดาวน์ (นาที)
                  </label>
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
              <h2 style={{ fontSize: "1.2rem", color: "var(--accent-light)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                ตัวอย่างประกาศเรียลไทม์ (Live Preview)
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
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ClipboardIcon size={16} />
                    {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "คัดลอกข้อความประกาศ"}
                  </span>
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
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <SendIcon size={16} />
                    {isSendingDiscord ? "กำลังส่ง..." : "ส่งเข้า Discord"}
                  </span>
                </button>

              </div>
              
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                * สามารถคัดลอกไปวางในดิสคอร์ดหรือพิมพ์ประกาศในแชทเกม FiveM ได้เลยค่ะ
              </span>

            </div>
          </div>

        </div>

      </div>

      {/* Blacklist History Table Card */}
      <div className="card" style={{ padding: "24px", marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--accent-light)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <ClipboardIcon size={20} style={{ color: "var(--accent)" }} />
            ประวัติการติด Blacklist ในระบบ (Active Blacklists)
          </h2>
          {loadingHistory && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>กำลังโหลดข้อมูล...</span>}
        </div>

        {dbWarning && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "var(--warning)",
            borderRadius: "8px",
            fontSize: "0.85rem"
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <WarningIcon size={16} />
              ตารางฐานข้อมูลประวัติยังไม่ถูกติดตั้ง กรุณาแจ้งผู้ดูแลระบบให้รันไฟล์สคริปต์ <code>sql/create_blacklist_records.sql</code> บน Database ก่อนค่ะ
            </span>
          </div>
        )}

        {!dbWarning && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>ชื่อ-นามสกุล</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>เบอร์โทร</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>แก๊ง/สังกัด</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>ข้อหา/ความผิด</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>ค่าปรับ</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>ผู้ลงบันทึก</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold" }}>วันที่บันทึก</th>
                  <th style={{ padding: "12px 8px", fontWeight: "bold", textAlign: "right" }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {blacklistHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                      {loadingHistory ? "กำลังโหลดข้อมูล..." : "ไม่มีประวัติการติด Blacklist ที่มีผลใช้งานในขณะนี้"}
                    </td>
                  </tr>
                ) : (
                  blacklistHistory.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                      <td style={{ padding: "12px 8px", fontWeight: "bold" }}>{record.name}</td>
                      <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>{record.phone || "-"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        {record.gang ? (
                          <span style={{
                            padding: "2px 6px",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "4px",
                            fontSize: "0.75rem"
                          }}>
                            {record.gang}
                          </span>
                        ) : "-"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{
                          padding: "2px 6px",
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "var(--danger)",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "bold"
                        }}>
                          {record.penalty || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>
                        <span style={{ color: "var(--accent-light)", fontWeight: "bold" }}>
                          {(record.fine || 0).toLocaleString()} IC
                        </span>
                        {record.multiplier > 1 && (
                          <span style={{
                            marginLeft: "4px",
                            padding: "1px 4px",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            color: "var(--warning)",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: "bold"
                          }}>
                            x{record.multiplier}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{record.created_by?.split("@")[0]}</td>
                      <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>
                        {record.created_at ? formatThaiDate(new Date(record.created_at)) : "-"}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <button
                          onClick={() => handleReleaseBlacklist(record)}
                          disabled={releasingId === record.id}
                          style={{
                            padding: "6px 12px",
                            background: "var(--primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            cursor: releasingId === record.id ? "not-allowed" : "pointer",
                            opacity: releasingId === record.id ? 0.6 : 1,
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            if (releasingId !== record.id) {
                              e.currentTarget.style.boxShadow = "0 0 8px var(--accent-glow)";
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {releasingId === record.id ? "กำลังปลด..." : "🔓 ปลด"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
