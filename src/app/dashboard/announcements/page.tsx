"use client";

import { useState, useEffect, useRef } from "react";
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
  ClockIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  FolderIcon
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

export default function AnnouncementsPage() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ─── Mode Switch: "create" (default) | "settings" (admin only) ───
  const [mode, setMode] = useState<"create" | "settings">("create");

  // ─── Data States ───
  const [blacklistHistory, setBlacklistHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dbWarning, setDbWarning] = useState(false);
  const [loggedBlacklistId, setLoggedBlacklistId] = useState<string | null>(null);
  const [blacklistReleaseTemplate, setBlacklistReleaseTemplate] = useState("");
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);

  // ─── Selection States ───
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTplId, setSelectedTplId] = useState("");

  // ─── Form Input States (Create Mode) ───
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
    gangA: string; tagA: string; scoreA: string;
    gangB: string; tagB: string; scoreB: string;
  }>>([
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
    { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" }
  ]);

  const updateStoryPair = (index: number, field: "gangA" | "tagA" | "scoreA" | "gangB" | "tagB" | "scoreB", value: string) => {
    setStoryPairs(prev => prev.map((pair, idx) => idx === index ? { ...pair, [field]: value } : pair));
  };

  const formatPair = (gangAName: string, tagAVal: string, scoreAVal: string, gangBName: string, tagBVal: string, scoreBVal: string) => {
    const gA = gangAName.trim() || "ชื่อแก๊ง A";
    const tA = tagAVal.trim() ? `[${tagAVal.trim()}]` : "";
    const sA = scoreAVal.trim() !== "" ? scoreAVal.trim() : "0";
    const gB = gangBName.trim() || "ชื่อแก๊ง B";
    const tB = tagBVal.trim() ? `[${tagBVal.trim()}]` : "";
    const sB = scoreBVal.trim() !== "" ? scoreBVal.trim() : "0";
    return `สกอร์สตอรี่คู่ : [${sA}] ${gA}${tA} vs ${gB}${tB} [${sB}]`;
  };

  // Actions states
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Cooldown states
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [fixedStartTime, setFixedStartTime] = useState<string | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState<string | null>(null);

  // ─── Settings Mode States (Admin Only) ───
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"templates" | "categories" | "penalties">("templates");

  // Settings Form States - Category
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Settings Form States - Template
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [tempCatId, setTempCatId] = useState("");
  const [tempContent, setTempContent] = useState("");

  // Settings Form States - Penalty
  const [newPenName, setNewPenName] = useState("");
  const [newPenFine, setNewPenFine] = useState<number>(0);
  const [editingPenaltyId, setEditingPenaltyId] = useState<string | null>(null);

  // Settings - General
  const [announcementCommandPrefix, setAnnouncementCommandPrefix] = useState("/ems");
  const [discordAnnouncementWebhookUrl, setDiscordAnnouncementWebhookUrl] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Helpers ───
  const showMessage = (msg: string, type: "success" | "error") => {
    setStatusMessage({ message: msg, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTempContent((prev) => prev + placeholder);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newContent = before + placeholder + after;
    setTempContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const saveSetting = async (key: string, value: any, successMsg: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/announcements/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        showMessage(successMsg, "success");
      } else {
        const d = await res.json();
        showMessage(d.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err) {
      showMessage("การเชื่อมต่อล้มเหลว", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Data Fetching ───
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
    document.title = "ข้อความประกาศ | EMS Clock-in";
    getSession().then((session) => {
      if (!session) {
        window.location.href = "/";
        return;
      }
      const user = session.user as any;
      if (user && user.role === "admin") {
        setIsAdmin(true);
      }

      fetch("/api/announcements/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.categories) {
            setCategories(data.categories);
            if (data.categories.length > 0) setSelectedCatId(data.categories[0].id);
          }
          if (data.templates) setTemplates(data.templates);
          if (data.penalties) {
            setPenalties(data.penalties);
            if (data.penalties.length > 0) setSelectedPenaltyId(data.penalties[0].id);
          }
          if (data.commandPrefix) {
            setCommandPrefix(data.commandPrefix);
            setAnnouncementCommandPrefix(data.commandPrefix);
          }
          if (data.announcementWebhookUrl) setDiscordAnnouncementWebhookUrl(data.announcementWebhookUrl);
          if (data.blacklistReleaseTemplate) setBlacklistReleaseTemplate(data.blacklistReleaseTemplate);
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

  // Reset frozen times and logged ID when form variables change
  useEffect(() => {
    setFixedStartTime(null);
    setFixedEndTime(null);
    setLoggedBlacklistId(null);
  }, [name, phone, gang, gangA, gangB, JSON.stringify(storyPairs), selectedPenaltyId, multiplier, cooldownMinutes, commandPrefix, selectedTplId, selectedCatId]);

  const activeTemplate = templates.find((t) => t.id === selectedTplId);

  const hasPlaceholder = (placeholder: string) => {
    if (!activeTemplate) return false;
    return activeTemplate.content.includes(placeholder);
  };

  const activePenalty = penalties.find((p) => p.id === selectedPenaltyId);
  const baseFine = activePenalty ? activePenalty.fine : 0;
  const totalFine = baseFine * multiplier;

  // ─── Generate formatted text ───
  const generateFormattedText = (isDiscord = false, startStrOverride?: string, endStrOverride?: string) => {
    if (!activeTemplate) return "";
    let text = activeTemplate.content;

    const penaltyText = activePenalty ? activePenalty.name : "";
    const formattedFine = activePenalty ? `${totalFine.toLocaleString()}` : "";

    let startStr = startStrOverride || fixedStartTime;
    let endStr = endStrOverride || fixedEndTime;

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
    }

    text = text.replaceAll("[ชื่อคน]", name.trim() || "________________");
    text = text.replaceAll("[เบอร์โทร]", phone.trim() || "________________");
    text = text.replaceAll("[ชื่อแก๊ง]", gang.trim() || "________________");
    text = text.replaceAll("[แก๊งA]", gangA.trim() || "________________");
    text = text.replaceAll("[แก๊งB]", gangB.trim() || "________________");
    text = text.replaceAll("[โทษ]", penaltyText || "________________");
    text = text.replaceAll("[ค่าปรับ]", activePenalty ? `${formattedFine} IC` : "________________");
    text = text.replaceAll("[ตัวคูณ]", multiplier > 1 ? `${multiplier}` : "1");

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

    const storyScoreText = formattedPairs.length > 0 ? formattedPairs.join("\n") : "[ยังไม่มีข้อมูลคู่สตอรี่]";
    text = text.replaceAll("[คะแนนสตอรี่]", storyScoreText);

    text = text.replaceAll("[คูลดาวน์]", `${cooldownMinutes}`);
    text = text.replaceAll("[เวลาเริ่ม]", startStr);
    text = text.replaceAll("[เวลาจบ]", endStr);

    if (!isDiscord && commandPrefix.trim()) {
      text = `${commandPrefix.trim()} ${text}`;
    }
    return text;
  };

  const formattedResultText = generateFormattedText(false);

  // ─── Blacklist record actions ───
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
          fetchBlacklistHistory();
        }
      }
    } catch (err) {
      console.error("Failed to log blacklist record:", err);
    }
  };

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
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("ไม่สามารถคัดลอกข้อความได้โดยอัตโนมัติ กรุณาครอบดำข้อความในช่องพรีวิวแล้วคัดลอกด้วยตนเองค่ะ (ระบบจะยังคงบันทึกประวัติการติด Blacklist ให้ตามปกติค่ะ)");
    }
    await saveOrUpdateBlacklistRecord();
  };

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
      let text = blacklistReleaseTemplate || "**[ปลด Blacklist บุคคล]**\nชื่อ-นามสกุล: [ชื่อคน]\nเบอร์โทรศัพท์: [เบอร์โทร]\nชื่อกลุ่ม/แก๊ง: [ชื่อแก๊ง]\nสถานะ: ปลดแบล็คลิสต์ เรียบร้อยแล้วค่ะ";
      text = text.replaceAll("[ชื่อคน]", record.name || "");
      text = text.replaceAll("[เบอร์โทร]", record.phone || "-");
      text = text.replaceAll("[ชื่อแก๊ง]", record.gang || "-");
      text = text.replaceAll("[โทษ]", record.penalty || "");
      text = text.replaceAll("[ค่าปรับ]", record.fine ? `${Number(record.fine).toLocaleString()} IC` : "0 IC");
      text = text.replaceAll("[ตัวคูณ]", record.multiplier ? `${record.multiplier}` : "1");

      const clipboardText = commandPrefix.trim() ? `${commandPrefix.trim()} ${text}` : text;
      await navigator.clipboard.writeText(clipboardText);

      const discordRes = await fetch("/api/announcements/send-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "แจ้งปลด Blacklist บุคคล", content: text })
      });
      if (!discordRes.ok) console.warn("Failed to send release announcement to Discord");

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

  // ─── Settings Mode Handlers (Admin Only) ───
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const newId = "cat_" + Date.now();
    const newCategory: Category = { id: newId, name: newCatName, description: newCatDesc };
    const updated = [...categories, newCategory];
    setCategories(updated);
    setNewCatName("");
    setNewCatDesc("");
    await saveSetting("announcement_categories", updated, "เพิ่มหมวดหมู่เรียบร้อยแล้ว");
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!await confirm({
      title: "🗑️ ยืนยันการลบหมวดหมู่",
      message: `ยืนยันการลบหมวดหมู่ "${name}"? การลบหมวดหมู่อาจทำให้เทมเพลตภายใต้หมวดหมู่นี้ไม่แสดงผล`,
      confirmText: "ลบหมวดหมู่",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await saveSetting("announcement_categories", updated, "ลบหมวดหมู่เรียบร้อยแล้ว");
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempTitle || !tempCatId || !tempContent) {
      alert("กรุณากรอกข้อมูลเทมเพลตให้ครบถ้วน");
      return;
    }
    let updated: Template[];
    if (editingTemplateId) {
      updated = templates.map((t) =>
        t.id === editingTemplateId ? { ...t, categoryId: tempCatId, title: tempTitle, content: tempContent } : t
      );
      showMessage("ปรับปรุงเทมเพลตสำเร็จ", "success");
    } else {
      const newTemplate: Template = { id: "tpl_" + Date.now(), categoryId: tempCatId, title: tempTitle, content: tempContent };
      updated = [...templates, newTemplate];
    }
    setTemplates(updated);
    setEditingTemplateId(null);
    setTempTitle("");
    setTempContent("");
    await saveSetting("announcement_templates", updated, "บันทึกเทมเพลตประกาศเรียบร้อยแล้ว");
  };

  const handleEditClick = (tpl: Template) => {
    setEditingTemplateId(tpl.id);
    setTempTitle(tpl.title);
    setTempCatId(tpl.categoryId);
    setTempContent(tpl.content);
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTempTitle("");
    setTempContent("");
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (!await confirm({
      title: "🗑️ ยืนยันการลบเทมเพลต",
      message: `ยืนยันต้องการลบเทมเพลต "${title}" หรือไม่?`,
      confirmText: "ลบเทมเพลต",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    if (editingTemplateId === id) handleCancelEdit();
    await saveSetting("announcement_templates", updated, "ลบเทมเพลตประกาศเรียบร้อยแล้ว");
  };

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPenName || newPenFine < 0) return;
    let updated: Penalty[];
    if (editingPenaltyId) {
      updated = penalties.map((p) => p.id === editingPenaltyId ? { ...p, name: newPenName, fine: Number(newPenFine) } : p);
    } else {
      const newPenalty: Penalty = { id: "pen_" + Date.now(), name: newPenName, fine: Number(newPenFine) };
      updated = [...penalties, newPenalty];
    }
    setPenalties(updated);
    setNewPenName("");
    setNewPenFine(0);
    setEditingPenaltyId(null);
    await saveSetting("blacklist_penalties", updated, editingPenaltyId ? "แก้ไขโทษสำเร็จรูปเรียบร้อยแล้ว" : "เพิ่มโทษสำเร็จรูปเรียบร้อยแล้ว");
  };

  const handleEditPenaltyClick = (pen: Penalty) => {
    setEditingPenaltyId(pen.id);
    setNewPenName(pen.name);
    setNewPenFine(pen.fine);
  };

  const handleCancelEditPenalty = () => {
    setEditingPenaltyId(null);
    setNewPenName("");
    setNewPenFine(0);
  };

  const handleDeletePenalty = async (id: string, name: string) => {
    if (!await confirm({
      title: "🗑️ ยืนยันการลบโทษแบล็คลิสต์",
      message: `ยืนยันลบโทษแบล็คลิสต์ "${name}" หรือไม่?`,
      confirmText: "ลบข้อมูล",
      cancelText: "ยกเลิก",
      variant: "danger"
    })) return;
    const updated = penalties.filter((p) => p.id !== id);
    setPenalties(updated);
    if (editingPenaltyId === id) handleCancelEditPenalty();
    await saveSetting("blacklist_penalties", updated, "ลบโทษสำเร็จรูปเรียบร้อยแล้ว");
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text-secondary)" }}>
        กำลังเตรียมข้อมูลประกาศและค่าปรับ...
      </div>
    );
  }

  // ─── Shared Input Style ───
  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: "8px",
    outline: "none",
    fontSize: "0.85rem",
    transition: "border-color 0.2s"
  };

  // ─── RENDER ───
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ═══════ Page Header with Switch ═══════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <MegaphoneIcon size={26} style={{ color: "var(--accent)" }} />
            {mode === "create" ? "ศูนย์จัดการข้อความประกาศ" : "ตั้งค่าระบบประกาศ & Blacklist"}
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "6px 0 0 0" }}>
            {mode === "create"
              ? "สร้างข้อความประกาศ ติด Blacklist หรือ ค้นเคสไม่เจอ พร้อมจัดโครงสร้างและคำนวณโทษปรับโดยอัตโนมัติ"
              : "จัดการหมวดหมู่ รูปแบบเทมเพลตประกาศ และอัตราโทษปรับ Blacklist"}
          </p>
        </div>

        {/* ─── Admin Switch Toggle ─── */}
        {isAdmin && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 14px",
            background: "var(--bg-glass)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            backdropFilter: "blur(8px)"
          }}>
            <span style={{
              fontSize: "0.8rem",
              fontWeight: mode === "create" ? 700 : 500,
              color: mode === "create" ? "var(--accent-light)" : "var(--text-muted)",
              transition: "all 0.3s"
            }}>
              <MegaphoneIcon size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              สร้างประกาศ
            </span>

            <label className="toggle-switch" style={{ position: "relative", display: "inline-block", width: "36px", height: "18px", margin: 0 }}>
              <input
                type="checkbox"
                checked={mode === "settings"}
                onChange={() => setMode(prev => prev === "create" ? "settings" : "create")}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className="toggle-slider" style={{
                position: "absolute",
                cursor: "pointer",
                inset: 0,
                background: mode === "settings" ? "var(--accent)" : "var(--bg-tertiary)",
                borderRadius: "18px",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                border: `1px solid ${mode === "settings" ? "var(--accent)" : "var(--border)"}`,
              }}>
                <span style={{
                  content: "''",
                  position: "absolute",
                  height: "14px",
                  width: "14px",
                  left: mode === "settings" ? "19px" : "2px",
                  top: "1px",
                  background: "white",
                  borderRadius: "50%",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                }} />
              </span>
            </label>

            <span style={{
              fontSize: "0.8rem",
              fontWeight: mode === "settings" ? 700 : 500,
              color: mode === "settings" ? "var(--accent-light)" : "var(--text-muted)",
              transition: "all 0.3s"
            }}>
              <SettingsIcon size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              ตั้งค่าประกาศ
            </span>
          </div>
        )}
      </div>

      {/* ═══════ Status Bar ═══════ */}
      {statusMessage && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          background: statusMessage.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${statusMessage.type === "success" ? "var(--success)" : "var(--danger)"}`,
          color: statusMessage.type === "success" ? "var(--success)" : "var(--danger)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          transition: "all 0.3s"
        }}>
          {statusMessage.message}
        </div>
      )}

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║                   CREATE MODE                             ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      {mode === "create" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>

            {/* ─── Left Side: Form Controls ─── */}
            <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "1.15rem", color: "var(--accent-light)", margin: 0, borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <SettingsIcon size={20} />
                เลือกประเภทและกรอกข้อมูล
              </h2>

              {/* Category Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>1. เลือกหมวดหมู่ประกาศ</label>
                <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
                {categories.find(c => c.id === selectedCatId)?.description && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <InfoIcon size={12} />
                    {categories.find(c => c.id === selectedCatId)?.description}
                  </span>
                )}
              </div>

              {/* Template Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>2. เลือกรูปแบบข้อความ</label>
                {filteredTemplates.length === 0 ? (
                  <div style={{ padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", borderRadius: "8px", textAlign: "center" }}>
                    ไม่มีรูปแบบประกาศในหมวดหมู่นี้
                  </div>
                ) : (
                  <select value={selectedTplId} onChange={(e) => setSelectedTplId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {filteredTemplates.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.title}</option>))}
                  </select>
                )}
              </div>

              {/* Dynamic Form Fields */}
              {activeTemplate && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px", padding: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>✍️ ข้อมูลเสริมในประกาศ</div>

                  {hasPlaceholder("[ชื่อคน]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><UserIcon size={14} /> ชื่อ-นามสกุล คนไข้/บุคคล</label>
                      <input type="text" placeholder="ระบุชื่อจริง-นามสกุล หรือชื่อเรียก" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                    </div>
                  )}

                  {hasPlaceholder("[เบอร์โทร]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><PhoneIcon size={14} /> เบอร์โทรศัพท์</label>
                      <input type="text" placeholder="เช่น 123-4567 หรือ 0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                    </div>
                  )}

                  {hasPlaceholder("[ชื่อแก๊ง]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><FlagIcon size={14} /> ชื่อกลุ่ม / แก๊ง / สังกัด</label>
                      <input type="text" placeholder="ระบุชื่อแก๊ง (ถ้าไม่มีให้ใส่ - หรือ ประชาชน)" value={gang} onChange={(e) => setGang(e.target.value)} style={inputStyle} />
                    </div>
                  )}

                  {hasPlaceholder("[แก๊งA]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><FlagIcon size={14} style={{ color: "var(--accent)" }} /> แก๊ง A / ฝั่ง A</label>
                      <input type="text" placeholder="ระบุชื่อแก๊ง A หรือฝั่งแรก" value={gangA} onChange={(e) => setGangA(e.target.value)} style={inputStyle} />
                    </div>
                  )}

                  {hasPlaceholder("[แก๊งB]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><FlagIcon size={14} style={{ color: "var(--accent)" }} /> แก๊ง B / ฝั่ง B</label>
                      <input type="text" placeholder="ระบุชื่อแก๊ง B หรือฝั่งตรงข้าม" value={gangB} onChange={(e) => setGangB(e.target.value)} style={inputStyle} />
                    </div>
                  )}

                  {/* 5-Pairs Story Score Form */}
                  {hasPlaceholder("[คะแนนสตอรี่]") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--accent-light)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>📊 ตารางบันทึกคะแนนสตอรี่ (สูงสุด 5 คู่)</div>
                      {storyPairs.map((pair, index) => {
                        const isRowActive = pair.gangA.trim() || pair.gangB.trim() || pair.scoreA || pair.scoreB;
                        return (
                          <div key={index} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", background: isRowActive ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.005)", border: `1px solid ${isRowActive ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "10px", position: "relative", transition: "all 0.2s" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: isRowActive ? "var(--accent-light)" : "var(--text-secondary)" }}>⚔️ คู่ที่ {index + 1}</span>
                              <button type="button" onClick={() => { const text = formatPair(pair.gangA, pair.tagA, pair.scoreA, pair.gangB, pair.tagB, pair.scoreB); const cmdText = commandPrefix.trim() ? `${commandPrefix.trim()} ${text}` : text; navigator.clipboard.writeText(cmdText); alert(`คัดลอกคะแนนคู่ที่ ${index + 1} พร้อมคำสั่งเรียบร้อยแล้วค่ะ!`); }} title="คัดลอกคู่นี้" style={{ padding: "4px 8px", background: isRowActive ? "var(--primary)" : "var(--bg-secondary)", color: "white", border: "none", borderRadius: "4px", fontSize: "0.75rem", cursor: isRowActive ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "4px", opacity: isRowActive ? 1 : 0.5, pointerEvents: isRowActive ? "auto" : "none", transition: "all 0.2s" }}>
                                <ClipboardIcon size={12} /> คัดลอกคู่นี้
                              </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", gap: "12px", alignItems: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <input type="text" placeholder="ชื่อแก๊ง A" value={pair.gangA} onChange={(e) => updateStoryPair(index, "gangA", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }} />
                                <input type="text" placeholder="Tag A (เช่น ABC)" value={pair.tagA} onChange={(e) => updateStoryPair(index, "tagA", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "bold" }}>SCORE</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input type="number" min="0" placeholder="0" value={pair.scoreA} onChange={(e) => updateStoryPair(index, "scoreA", e.target.value)} style={{ width: "38px", padding: "6px 4px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.85rem", textAlign: "center", outline: "none", fontFamily: "var(--font-mono)" }} />
                                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "bold" }}>-</span>
                                  <input type="number" min="0" placeholder="0" value={pair.scoreB} onChange={(e) => updateStoryPair(index, "scoreB", e.target.value)} style={{ width: "38px", padding: "6px 4px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.85rem", textAlign: "center", outline: "none", fontFamily: "var(--font-mono)" }} />
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <input type="text" placeholder="ชื่อแก๊ง B" value={pair.gangB} onChange={(e) => updateStoryPair(index, "gangB", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }} />
                                <input type="text" placeholder="Tag B (เช่น XYZ)" value={pair.tagB} onChange={(e) => updateStoryPair(index, "tagB", e.target.value)} style={{ width: "100%", padding: "6px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "6px", fontSize: "0.8rem", outline: "none" }} />
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
                        <select value={selectedPenaltyId} onChange={(e) => setSelectedPenaltyId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                          {penalties.map((pen) => (<option key={pen.id} value={pen.id}>{pen.name}</option>))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Penalty Fine + Multiplier */}
                  {hasPlaceholder("[ค่าปรับ]") && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>💵 ค่าปรับรวม</label>
                        <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", color: "var(--accent-light)", borderRadius: "6px", fontSize: "0.95rem", fontWeight: "bold", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center" }}>
                          {totalFine.toLocaleString()} IC
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>✖️ Blacklist ซ้ำ (ตัวคูณโทษ)</label>
                        <input type="number" min="1" max="10" value={multiplier} onChange={(e) => setMultiplier(Math.max(1, Number(e.target.value)))} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
                      </div>
                    </div>
                  )}

                  {/* Cooldown Duration Input */}
                  {(hasPlaceholder("[คูลดาวน์]") || hasPlaceholder("[เวลาเริ่ม]") || hasPlaceholder("[เวลาจบ]")) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                        <ClockIcon size={14} /> เวลาคูลดาวน์ (นาที)
                      </label>
                      <input type="number" min="1" placeholder="ระบุระยะเวลาคูลดาวน์ เช่น 10, 15, 30" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(Math.max(1, Number(e.target.value)))} style={inputStyle} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Right Side: Live Preview & Actions ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "360px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
                  <h2 style={{ fontSize: "1.15rem", color: "var(--accent-light)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    ตัวอย่างประกาศเรียลไทม์ (Live Preview)
                  </h2>
                  {activeTemplate && (
                    <span style={{ fontSize: "0.75rem", background: "var(--bg-secondary)", padding: "4px 10px", borderRadius: "10px", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                      {activeTemplate.title}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
                  <textarea readOnly value={formattedResultText} style={{ width: "100%", flex: 1, minHeight: "220px", padding: "16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", fontSize: "0.9rem", fontFamily: "var(--font-mono)", lineHeight: "1.6", outline: "none", resize: "none", boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {discordStatus && (
                    <div style={{ padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", background: discordStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${discordStatus.type === "success" ? "var(--success)" : "var(--danger)"}`, color: discordStatus.type === "success" ? "var(--success)" : "var(--danger)", textAlign: "center" }}>
                      {discordStatus.message}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button onClick={handleCopyText} disabled={!formattedResultText} style={{ flex: 1, padding: "12px", background: copySuccess ? "var(--success)" : "var(--primary)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.9rem", cursor: formattedResultText ? "pointer" : "not-allowed", opacity: formattedResultText ? 1 : 0.6, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: copySuccess ? "0 0 10px var(--accent-glow)" : "none" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <ClipboardIcon size={16} />
                        {copySuccess ? "คัดลอกสำเร็จแล้ว!" : "คัดลอกข้อความประกาศ"}
                      </span>
                    </button>
                    <button onClick={handleSendToDiscord} disabled={!formattedResultText || isSendingDiscord} style={{ flex: 1, padding: "12px", background: "#5865F2", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.9rem", cursor: (formattedResultText && !isSendingDiscord) ? "pointer" : "not-allowed", opacity: (formattedResultText && !isSendingDiscord) ? 1 : 0.6, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
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

          {/* ─── Blacklist History Table Card ─── */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.15rem", color: "var(--accent-light)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardIcon size={20} style={{ color: "var(--accent)" }} />
                ประวัติการติด Blacklist ในระบบ (Active Blacklists)
              </h2>
              {loadingHistory && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>กำลังโหลดข้อมูล...</span>}
            </div>

            {dbWarning && (
              <div style={{ padding: "12px 16px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "var(--warning)", borderRadius: "8px", fontSize: "0.85rem" }}>
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
                      <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>{loadingHistory ? "กำลังโหลดข้อมูล..." : "ไม่มีประวัติการติด Blacklist ที่มีผลใช้งานในขณะนี้"}</td></tr>
                    ) : (
                      blacklistHistory.map((record) => (
                        <tr key={record.id} style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: "bold" }}>{record.name}</td>
                          <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>{record.phone || "-"}</td>
                          <td style={{ padding: "12px 8px" }}>
                            {record.gang ? (
                              <span style={{ padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)", borderRadius: "4px", fontSize: "0.75rem" }}>{record.gang}</span>
                            ) : "-"}
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            <span style={{ padding: "2px 6px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>{record.penalty || "-"}</span>
                          </td>
                          <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>
                            <span style={{ color: "var(--accent-light)", fontWeight: "bold" }}>{(record.fine || 0).toLocaleString()} IC</span>
                            {record.multiplier > 1 && (
                              <span style={{ marginLeft: "4px", padding: "1px 4px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "var(--warning)", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold" }}>x{record.multiplier}</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{record.created_by?.split("@")[0]}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{record.created_at ? formatThaiDate(new Date(record.created_at)) : "-"}</td>
                          <td style={{ padding: "12px 8px", textAlign: "right" }}>
                            <button onClick={() => handleReleaseBlacklist(record)} disabled={releasingId === record.id} style={{ padding: "6px 12px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.75rem", cursor: releasingId === record.id ? "not-allowed" : "pointer", opacity: releasingId === record.id ? 0.6 : 1, transition: "all 0.2s" }}
                              onMouseOver={(e) => { if (releasingId !== record.id) e.currentTarget.style.boxShadow = "0 0 8px var(--accent-glow)"; }}
                              onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; }}
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
        </>
      )}

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║                   SETTINGS MODE (Admin Only)              ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      {mode === "settings" && isAdmin && (
        <>
          {/* General Settings Card */}
          <section className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "var(--accent-light)", margin: 0, borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <SettingsIcon size={20} />
              ตั้งค่าทั่วไปสำหรับประกาศ (General Settings)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>คำสั่งประกาศหน่วยงานเริ่มต้น</label>
                <input type="text" placeholder="เช่น /ems, /gov" value={announcementCommandPrefix} onChange={(e) => setAnnouncementCommandPrefix(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>คำสั่งที่ระบบจะนำไปเติมข้างหน้าข้อความประกาศในหน้าแพทย์</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Discord Webhook สำหรับส่งข้อความประกาศ</label>
                <input type="url" placeholder="https://discord.com/api/webhooks/..." value={discordAnnouncementWebhookUrl} onChange={(e) => setDiscordAnnouncementWebhookUrl(e.target.value.trim())} style={inputStyle} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ใช้ส่งประกาศแบล็คลิสต์/แจ้งเคสแยกห้องต่างหาก (หากเว้นว่างจะใช้ Webhook ทั่วไป)</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>รูปแบบข้อความประกาศปลด Blacklist (Release Template)</label>
              <textarea placeholder="พิมพ์โครงสร้างประกาศปลดแบล็คลิสต์..." value={blacklistReleaseTemplate} onChange={(e) => setBlacklistReleaseTemplate(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: "var(--font-mono)", resize: "vertical", lineHeight: "1.5" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>โครงสร้างข้อความเมื่อแพทย์คลิกปลดแบล็คลิสต์ในระบบ (รองรับตัวแปร [ชื่อคน], [เบอร์โทร], [ชื่อแก๊ง], [โทษ], [ค่าปรับ], [ตัวคูณ])</span>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
              <button onClick={async () => {
                setIsSaving(true);
                try {
                  await Promise.all([
                    fetch("/api/announcements/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "announcement_command_prefix", value: announcementCommandPrefix }) }),
                    fetch("/api/announcements/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "discord_announcement_webhook_url", value: discordAnnouncementWebhookUrl }) }),
                    fetch("/api/announcements/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "blacklist_release_template", value: blacklistReleaseTemplate }) })
                  ]);
                  showMessage("บันทึกการตั้งค่าทั่วไปเรียบร้อยแล้วค่ะ", "success");
                  setCommandPrefix(announcementCommandPrefix);
                } catch (err) { showMessage("บันทึกไม่สำเร็จ", "error"); } finally { setIsSaving(false); }
              }} disabled={isSaving} style={{ padding: "10px 20px", background: "var(--primary)", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <SaveIcon size={14} />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั่วไป"}
                </span>
              </button>
            </div>
          </section>

          {/* ─── Sub-Tabs: Templates / Categories / Penalties ─── */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "4px", paddingBottom: "1px" }}>
            {(["templates", "categories", "penalties"] as const).map((tab) => {
              const labels = { templates: "รูปแบบเทมเพลตประกาศ", categories: "หมวดหมู่ประกาศ", penalties: "โทษปรับ Blacklist สำเร็จรูป" };
              const isActive = activeSettingsTab === tab;
              return (
                <button key={tab} onClick={() => setActiveSettingsTab(tab)} style={{
                  padding: "10px 20px", background: isActive ? "var(--bg-secondary)" : "transparent",
                  color: isActive ? "var(--accent-light)" : "var(--text-secondary)",
                  border: "1px solid transparent",
                  borderBottomColor: isActive ? "var(--bg-secondary)" : "transparent",
                  borderTopLeftRadius: "6px", borderTopRightRadius: "6px",
                  cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", marginBottom: "-1px",
                  borderStyle: isActive ? "solid solid none solid" : "none",
                  borderColor: isActive ? "var(--border)" : "transparent"
                }}>
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div style={{ minHeight: "500px" }}>

            {/* ─── TAB: Templates ─── */}
            {activeSettingsTab === "templates" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
                <form onSubmit={handleSaveTemplate} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    {editingTemplateId ? (<><EditIcon size={16} /> แก้ไขรูปแบบประกาศ</>) : (<><PlusIcon size={16} /> เพิ่มรูปแบบประกาศใหม่</>)}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หัวข้อของประกาศ</label>
                    <input type="text" placeholder="เช่น ประกาศติด Blacklist บุคคล, หาประวัติไม่เจอ..." value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} required style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หมวดหมู่ประกาศ</label>
                    <select value={tempCatId} onChange={(e) => setTempCatId(e.target.value)} required style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>โครงสร้างข้อความประกาศ (Template Body)</label>
                    <textarea ref={textareaRef} placeholder={`พิมพ์โครงสร้างข้อความประกาศที่ต้องการโดยใช้ตัวแปรเพื่อเว้นช่องให้แพทย์กรอก เช่น:\n\n**[แบล็คลิสต์]**\nชื่อ: [ชื่อคน]\nเบอร์โทร: [เบอร์โทร]\nสังกัด: [ชื่อแก๊ง]\nความผิด: [โทษ]\nค่าปรับ: [ค่าปรับ] ดับเบิ้ลปรับ x[ตัวคูณ]`} value={tempContent} onChange={(e) => setTempContent(e.target.value)} required rows={8} style={{ ...inputStyle, fontFamily: "var(--font-mono)", resize: "vertical", lineHeight: "1.5" }} />
                  </div>

                  {/* Placeholder Buttons */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "12px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--accent-light)", marginBottom: "8px" }}>💡 คลิกที่ปุ่มด้านล่างเพื่อแทรกตัวแปรตรงตำแหน่งเคอร์เซอร์:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {[
                        { label: "👤 [ชื่อคน]", placeholder: "[ชื่อคน]" },
                        { label: "📞 [เบอร์โทร]", placeholder: "[เบอร์โทร]" },
                        { label: "🏴‍☠️ [ชื่อแก๊ง]", placeholder: "[ชื่อแก๊ง]" },
                        { label: "💥 [แก๊งA]", placeholder: "[แก๊งA]" },
                        { label: "💥 [แก๊งB]", placeholder: "[แก๊งB]" },
                        { label: "📊 [คะแนนสตอรี่]", placeholder: "[คะแนนสตอรี่]" },
                        { label: "⚖️ [โทษ]", placeholder: "[โทษ]" },
                        { label: "💵 [ค่าปรับ]", placeholder: "[ค่าปรับ]" },
                        { label: "✖️ [ตัวคูณ]", placeholder: "[ตัวคูณ]" },
                        { label: "⏱️ [คูลดาวน์]", placeholder: "[คูลดาวน์]" },
                        { label: "🕒 [เวลาเริ่ม]", placeholder: "[เวลาเริ่ม]" },
                        { label: "🕒 [เวลาจบ]", placeholder: "[เวลาจบ]" }
                      ].map((item) => (
                        <button key={item.placeholder} type="button" onClick={() => insertPlaceholder(item.placeholder)} style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", transition: "all 0.2s", fontWeight: "500" }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent-light)"; e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 8%, transparent)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}
                        >{item.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                    {editingTemplateId && (
                      <button type="button" onClick={handleCancelEdit} style={{ padding: "10px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>ยกเลิก</button>
                    )}
                    <button type="submit" disabled={isSaving} style={{ padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSaving ? "กำลังบันทึก..." : editingTemplateId ? (<><SaveIcon size={14} /> อัปเดตข้อมูล</>) : (<><PlusIcon size={14} /> เพิ่มเทมเพลต</>)}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Right Side: List of Templates */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>รูปแบบประกาศปัจจุบัน ({templates.length})</h3>
                  {templates.length === 0 ? (
                    <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีเทมเพลต ถูกตั้งค่าไว้</div>
                  ) : (
                    templates.map((tpl) => {
                      const cat = categories.find((c) => c.id === tpl.categoryId);
                      return (
                        <div key={tpl.id} className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", border: editingTemplateId === tpl.id ? "1px solid var(--accent)" : undefined }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "bold" }}>{tpl.title}</h4>
                                <span style={{ fontSize: "0.7rem", background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-light)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <FolderIcon size={12} /> {cat?.name || "ไม่ระบุหมวดหมู่"}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => handleEditClick(tpl)} style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}><EditIcon size={12} /> แก้ไข</button>
                              <button onClick={() => handleDeleteTemplate(tpl.id, tpl.title)} style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}><TrashIcon size={12} /> ลบ</button>
                            </div>
                          </div>
                          <pre style={{ margin: 0, padding: "10px", background: "var(--bg-secondary)", borderRadius: "6px", fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all", border: "1px solid var(--border-subtle)" }}>{tpl.content}</pre>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: Categories ─── */}
            {activeSettingsTab === "categories" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
                <form onSubmit={handleAddCategory} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><PlusIcon size={18} /> เพิ่มหมวดหมู่ใหม่</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ชื่อหมวดหมู่</label>
                    <input type="text" placeholder="เช่น Blacklist, หาเคสไม่เจอ, ทั่วไป..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>คำอธิบายย่อ</label>
                    <input type="text" placeholder="เช่น ประกาศคนร้ายที่ไม่ชุบ, แจ้งเคสติดต่อไม่ได้..." value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} style={inputStyle} />
                  </div>
                  <button type="submit" disabled={isSaving} style={{ alignSelf: "flex-end", padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><PlusIcon size={14} /> {isSaving ? "กำลังบันทึก..." : "บันทึกหมวดหมู่"}</span>
                  </button>
                </form>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><FolderIcon size={18} /> รายการหมวดหมู่ทั้งหมด ({categories.length})</h3>
                  {categories.length === 0 ? (
                    <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีหมวดหมู่</div>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat.id} className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "bold" }}>📁 {cat.name}</h4>
                          {cat.description && (<p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{cat.description}</p>)}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ID: {cat.id}</span>
                        </div>
                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}><TrashIcon size={12} /> ลบ</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: Penalties ─── */}
            {activeSettingsTab === "penalties" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
                <form onSubmit={handleAddPenalty} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    {editingPenaltyId ? (<><EditIcon size={18} /> แก้ไขความผิด / โทษปรับสำเร็จรูป</>) : (<><PlusIcon size={18} /> เพิ่มความผิด / โทษปรับสำเร็จรูป</>)}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ประเภทความผิด / โทษข้อหา</label>
                    <input type="text" placeholder="เช่น ทำร้ายร่างกายแพทย์, ขโมยรถพยาบาล..." value={newPenName} onChange={(e) => setNewPenName(e.target.value)} required style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>วงเงินค่าปรับตั้งต้น (IC)</label>
                    <input type="number" min="0" placeholder="เช่น 50000" value={newPenFine || ""} onChange={(e) => setNewPenFine(Number(e.target.value))} required style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
                    {editingPenaltyId && (
                      <button type="button" onClick={handleCancelEditPenalty} style={{ padding: "10px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>ยกเลิก</button>
                    )}
                    <button type="submit" disabled={isSaving} style={{ padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSaving ? "กำลังบันทึก..." : editingPenaltyId ? (<><SaveIcon size={14} /> อัปเดตข้อหา</>) : (<><PlusIcon size={14} /> บันทึกอัตราโทษ</>)}
                      </span>
                    </button>
                  </div>
                </form>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>รายการอัตราโทษปรับสำเร็จรูป ({penalties.length})</h3>
                  {penalties.length === 0 ? (
                    <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีรายการตั้งค่าไว้</div>
                  ) : (
                    penalties.map((pen) => (
                      <div key={pen.id} className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "bold" }}>{pen.name}</h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ค่าปรับเริ่มต้น:</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "var(--accent-light)", fontFamily: "var(--font-mono)" }}>{pen.fine.toLocaleString()} IC</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleEditPenaltyClick(pen)} style={{ padding: "6px 12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}><EditIcon size={12} /> แก้ไข</button>
                          <button onClick={() => handleDeletePenalty(pen.id, pen.name)} style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "4px" }}><TrashIcon size={12} /> ลบ</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
