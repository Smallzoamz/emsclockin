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
  FolderIcon,
  HospitalIcon
} from "@/components/Icons";
import { Bell, Mail, Eye, MoreVertical, Building2, Calendar, Users, ArrowLeft, ArrowRight, CheckCircle, Search, Filter } from "lucide-react";

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

  // ─── Stepper & UX States ───
  const [step, setStep] = useState(1);
  const [isUrgent, setIsUrgent] = useState(false);
  const [targetGroup, setTargetGroup] = useState("ทุกคน");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilterTab, setTableFilterTab] = useState("ทั้งหมด");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRankName, setUserRankName] = useState("แพทย์ประจำการ");
  const [currentPage, setCurrentPage] = useState(1);

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
  const [targetType, setTargetType] = useState("ประชาชน");
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
  const [publishCopyToClipboard, setPublishCopyToClipboard] = useState(true);
  const [publishSendToDiscord, setPublishSendToDiscord] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishResults, setPublishResults] = useState<{
    copySuccess: boolean;
    discordSuccess: boolean | null;
    discordError: string | null;
    dbSuccess: boolean;
  }>({
    copySuccess: false,
    discordSuccess: null,
    discordError: null,
    dbSuccess: false
  });
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Cooldown states
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
  const [fixedStartTime, setFixedStartTime] = useState<string | null>(null);
  const [fixedEndTime, setFixedEndTime] = useState<string | null>(null);

  // ─── Settings Mode States (Admin Only) ───
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"templates" | "categories" | "penalties" | "general">("templates");

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
      setCurrentUser(user);
      if (user && user.role === "admin") {
        setIsAdmin(true);
      }

      Promise.all([
        fetch("/api/announcements/settings").then(r => r.json()),
        fetch("/api/admin/settings").then(r => r.json()).catch(() => ({}))
      ])
        .then(([data, adminSettings]) => {
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

          // Resolve rank name
          if (user.email && adminSettings.settings?.user_ranks && adminSettings.settings?.doctor_ranks) {
            const userRankId = adminSettings.settings.user_ranks[user.email];
            const rankObj = adminSettings.settings.doctor_ranks.find((r: any) => r.id === userRankId);
            if (rankObj) {
              setUserRankName(rankObj.name);
            }
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

  // Reset frozen times and logged ID when form variables change
  useEffect(() => {
    setFixedStartTime(null);
    setFixedEndTime(null);
    setLoggedBlacklistId(null);
  }, [name, phone, gang, gangA, gangB, JSON.stringify(storyPairs), selectedPenaltyId, multiplier, cooldownMinutes, commandPrefix, selectedTplId, selectedCatId, targetType]);

  // Reset pagination when search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tableFilterTab]);

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
    text = text.replaceAll("[ประเภท]", targetType);

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
  const saveOrUpdateBlacklistRecord = async (): Promise<boolean> => {
    const categoryName = categories.find(c => c.id === selectedCatId)?.name.toLowerCase() || "";
    const isBlacklist = selectedCatId === "cat_blacklist" ||
      categoryName.includes("blacklist") ||
      categoryName.includes("แบล็คลิสต์") ||
      categoryName.includes("แบลคลิส") ||
      categoryName.includes("แบล็คลิส") ||
      (activeTemplate && activeTemplate.content.includes("[โทษ]"));

    const resolvedName = name.trim() || gang.trim();
    if (!isBlacklist || !resolvedName) return false;

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
          multiplier: multiplier,
          targetType: targetType
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record?.id) {
          setLoggedBlacklistId(data.record.id);
          fetchBlacklistHistory();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Failed to log blacklist record:", err);
      return false;
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
      setDiscordStatus({ message: "คัดลอกประกาศเรียบร้อยแล้วค่ะ! 📋", type: "success" });
      setTimeout(() => setDiscordStatus(null), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("ไม่สามารถคัดลอกข้อความได้โดยอัตโนมัติ กรุณาครอบดำข้อความในช่องพรีวิวแล้วคัดลอกด้วยตนเองค่ะ (ระบบจะยังคงบันทึกประวัติการติด Blacklist ให้ตามปกติค่ะ)");
    }
    await saveOrUpdateBlacklistRecord();
  };

  const handleConfirmPublish = async () => {
    // 1. Freeze time values if not already frozen
    let startStr = fixedStartTime;
    let endStr = fixedEndTime;
    const now = new Date();
    const bkkNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const bkkEnd = new Date(bkkNow.getTime() + cooldownMinutes * 60 * 1000);

    if (!startStr || !endStr) {
      const startH = bkkNow.getHours().toString().padStart(2, "0");
      const startM = bkkNow.getMinutes().toString().padStart(2, "0");
      startStr = `${startH}.${startM}`;
      const endH = bkkEnd.getHours().toString().padStart(2, "0");
      const endM = bkkEnd.getMinutes().toString().padStart(2, "0");
      endStr = `${endH}.${endM}`;
      setFixedStartTime(startStr);
      setFixedEndTime(endStr);
    }

    setIsSendingDiscord(true);
    let copyOk = false;
    let discordOk: boolean | null = null;
    let discordErrStr: string | null = null;
    let dbOk = false;

    // 2. Perform Database saving if it's a blacklist
    const categoryName = categories.find(c => c.id === selectedCatId)?.name.toLowerCase() || "";
    const isBlacklist = selectedCatId === "cat_blacklist" ||
      categoryName.includes("blacklist") ||
      categoryName.includes("แบล็คลิสต์") ||
      categoryName.includes("แบลคลิส") ||
      categoryName.includes("แบล็คลิส") ||
      (activeTemplate && activeTemplate.content.includes("[โทษ]"));
    
    if (isBlacklist) {
      dbOk = await saveOrUpdateBlacklistRecord();
    }

    // 3. Perform Copy to Clipboard
    if (publishCopyToClipboard) {
      const textToCopy = generateFormattedText(false, startStr, endStr);
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyOk = true;
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }

    // 4. Perform Discord Send
    if (publishSendToDiscord) {
      const discordText = generateFormattedText(true, startStr, endStr);
      if (discordText) {
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
            discordOk = true;
          } else {
            discordOk = false;
            discordErrStr = data.error || "เกิดข้อผิดพลาดในการส่งเข้า Discord";
          }
        } catch (err) {
          discordOk = false;
          discordErrStr = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อส่งข้อมูลได้";
        }
      }
    }

    setIsSendingDiscord(false);
    setPublishResults({
      copySuccess: copyOk,
      discordSuccess: discordOk,
      discordError: discordErrStr,
      dbSuccess: dbOk
    });
    setIsPublished(true);
  };

  const handleResetForm = () => {
    setName("");
    setPhone("");
    setGang("");
    setGangA("");
    setGangB("");
    setMultiplier(1);
    setCooldownMinutes(10);
    setStoryPairs([
      { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
      { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
      { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
      { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" },
      { gangA: "", tagA: "", scoreA: "", gangB: "", tagB: "", scoreB: "" }
    ]);
    setFixedStartTime(null);
    setFixedEndTime(null);
    setLoggedBlacklistId(null);
    setStep(1);
    setIsPublished(false);
    setPublishResults({
      copySuccess: false,
      discordSuccess: null,
      discordError: null,
      dbSuccess: false
    });
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
      text = text.replaceAll("[ประเภท]", record.target_type || "ประชาชน");

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

      {/* ═══════ Page Header with Switch & User Details ═══════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <MegaphoneIcon size={28} style={{ color: "var(--accent)" }} />
            {mode === "create" ? "ศูนย์จัดการข้อความประกาศ" : "ตั้งค่าระบบประกาศ & Blacklist"}
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "6px 0 0 0" }}>
            {mode === "create"
              ? "สร้าง จัดการ และเผยแพร่ประกาศไปยังบุคลากรทางการแพทย์ทั้งหมด"
              : "จัดการหมวดหมู่ รูปแบบเทมเพลตประกาศ และอัตราโทษปรับ Blacklist"}
          </p>
        </div>

        {/* Right side: Notifications + User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Notifications Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative", cursor: "pointer", padding: "6px", background: "var(--bg-secondary)", borderRadius: "50%", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={16} style={{ color: "var(--text-secondary)" }} />
              <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "var(--danger)", color: "white", fontSize: "0.6rem", fontWeight: "bold", borderRadius: "50%", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
            </div>
            <div style={{ position: "relative", cursor: "pointer", padding: "6px", background: "var(--bg-secondary)", borderRadius: "50%", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={16} style={{ color: "var(--text-secondary)" }} />
              <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "var(--info)", color: "white", fontSize: "0.6rem", fontWeight: "bold", borderRadius: "50%", width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>5</span>
            </div>
          </div>

          {/* User Profile Card */}
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "24px" }}>
              {currentUser.image ? (
                <img src={currentUser.image} alt={currentUser.name || "User"} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border-glow)", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-glow)", color: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem" }}>
                  {currentUser.name ? currentUser.name.charAt(0) : "D"}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{currentUser.name || "OHM"}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "500", marginTop: "-2px" }}>{userRankName || "Paramedic"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Tabs Navigation Bar ═══════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px", marginTop: "-8px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => setMode("create")} className={`announce-tab-btn ${mode === "create" ? "active" : ""}`}>
            จัดการประกาศ
          </button>
          {isAdmin && (
            <>
              <button onClick={() => { setMode("settings"); setActiveSettingsTab("templates"); }} className={`announce-tab-btn ${mode === "settings" && activeSettingsTab === "templates" ? "active" : ""}`}>
                เทมเพลตประกาศ
              </button>
              <button onClick={() => { setMode("settings"); setActiveSettingsTab("categories"); }} className={`announce-tab-btn ${mode === "settings" && activeSettingsTab === "categories" ? "active" : ""}`}>
                หมวดหมู่ประกาศ
              </button>
              <button onClick={() => { setMode("settings"); setActiveSettingsTab("penalties"); }} className={`announce-tab-btn ${mode === "settings" && activeSettingsTab === "penalties" ? "active" : ""}`}>
                ข้อหา & ค่าปรับ
              </button>
              <button onClick={() => { setMode("settings"); setActiveSettingsTab("general"); }} className={`announce-tab-btn ${mode === "settings" && activeSettingsTab === "general" ? "active" : ""}`}>
                ตั้งค่าการแจ้งเตือน
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => {
            handleResetForm();
            setMode("create");
          }}
          className="btn btn-primary"
          style={{ borderRadius: "8px", padding: "8px 16px", fontSize: "0.85rem", textDecoration: "none" }}
        >
          <PlusIcon size={14} /> สร้างประกาศใหม่
        </button>
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          background: statusMessage.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${statusMessage.type === "success" ? "var(--success)" : "var(--danger)"}`,
          color: statusMessage.type === "success" ? "var(--success)" : "var(--danger)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
        }}>
          {statusMessage.message}
        </div>
      )}

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║                   CREATE MODE                             ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      {mode === "create" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px", alignItems: "start" }}>

            {/* ─── Left Panel: Stepper + Form Wizard ─── */}
            <div className="card" style={{ padding: "24px" }}>
              <div className="announce-wizard-card">
                {/* Stepper Steps */}
                <div className="announce-stepper">
                  <div className={`announce-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>
                    <div className="announce-step-number">1</div>
                    <div className="announce-step-info">
                      <span className="announce-step-title">ตั้งค่าประกาศ</span>
                      <span className="announce-step-desc">กำหนดหมวดหมู่และรูปแบบ</span>
                    </div>
                  </div>
                  <div className={`announce-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>
                    <div className="announce-step-number">2</div>
                    <div className="announce-step-info">
                      <span className="announce-step-title">เนื้อหาประกาศ</span>
                      <span className="announce-step-desc">เขียนรายละเอียดข้อความ</span>
                    </div>
                  </div>
                  <div className={`announce-step ${isPublished ? "completed" : step === 3 ? "active" : ""}`}>
                    <div className="announce-step-number">3</div>
                    <div className="announce-step-info">
                      <span className="announce-step-title">การเผยแพร่</span>
                      <span className="announce-step-desc">เลือกเป้าหมายและส่ง</span>
                    </div>
                  </div>
                </div>

                {/* Wizard Forms */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  {isPublished ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", justifyContent: "center", padding: "30px 10px", textAlign: "center" }}>
                      {/* Large Styled Green Check */}
                      <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "2px solid var(--success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--success)",
                        marginBottom: "8px"
                      }}>
                        <CheckCircle size={36} />
                      </div>

                      <div>
                        <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", fontWeight: "bold", margin: 0 }}>เผยแพร่ประกาศสำเร็จ! 🎉</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>ทำรายการเผยแพร่และจัดเก็บประวัติเรียบร้อยแล้วค่ะ</p>
                      </div>

                      {/* Details Checklist */}
                      <div style={{
                        width: "100%",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        textAlign: "left"
                      }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "4px" }}>
                          สรุปการทำงาน (Action Summary)
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                          <span style={{ color: publishResults.copySuccess ? "var(--success)" : "var(--text-muted)" }}>
                            {publishResults.copySuccess ? "✅" : "❌"}
                          </span>
                          <span style={{ color: "var(--text-primary)" }}>คัดลอกคำสั่งลง Clipboard:</span>
                          <span style={{ color: publishResults.copySuccess ? "var(--success)" : "var(--danger)", fontWeight: "500", marginLeft: "auto" }}>
                            {publishResults.copySuccess ? "สำเร็จ" : "ไม่ได้ระบุ / ล้มเหลว"}
                          </span>
                        </div>

                        {publishResults.discordSuccess !== null && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                            <span style={{ color: publishResults.discordSuccess ? "var(--success)" : "var(--danger)" }}>
                              {publishResults.discordSuccess ? "✅" : "❌"}
                            </span>
                            <span style={{ color: "var(--text-primary)" }}>ส่งข้อมูลประกาศเข้า Discord:</span>
                            <span style={{ color: publishResults.discordSuccess ? "var(--success)" : "var(--danger)", fontWeight: "500", marginLeft: "auto" }}>
                              {publishResults.discordSuccess ? "สำเร็จ" : "ล้มเหลว"}
                            </span>
                          </div>
                        )}

                        {!publishResults.discordSuccess && publishResults.discordError && (
                          <div style={{ fontSize: "0.75rem", color: "var(--danger)", paddingLeft: "24px", marginTop: "-4px" }}>
                            * {publishResults.discordError}
                          </div>
                        )}

                        {(() => {
                          const categoryName = categories.find(c => c.id === selectedCatId)?.name.toLowerCase() || "";
                          const isBlacklist = selectedCatId === "cat_blacklist" ||
                            categoryName.includes("blacklist") ||
                            categoryName.includes("แบล็คลิสต์") ||
                            categoryName.includes("แบลคลิส") ||
                            categoryName.includes("แบล็คลิส") ||
                            (activeTemplate && activeTemplate.content.includes("[โทษ]"));
                          
                          if (isBlacklist) {
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                                <span style={{ color: publishResults.dbSuccess ? "var(--success)" : "var(--danger)" }}>
                                  {publishResults.dbSuccess ? "✅" : "❌"}
                                </span>
                                <span style={{ color: "var(--text-primary)" }}>บันทึกประวัติการติด Blacklist:</span>
                                <span style={{ color: publishResults.dbSuccess ? "var(--success)" : "var(--danger)", fontWeight: "500", marginLeft: "auto" }}>
                                  {publishResults.dbSuccess ? "สำเร็จ" : "ล้มเหลว"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Reset and scroll buttons */}
                      <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
                        <button onClick={handleResetForm} className="btn btn-primary" style={{ flex: 1, justifyContent: "center", borderRadius: "8px", fontWeight: "bold" }}>
                          สร้างประกาศใหม่
                        </button>
                        <button
                          onClick={() => {
                            const el = document.querySelector(".shift-table");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="btn btn-ghost"
                          style={{ flex: 1, justifyContent: "center", borderRadius: "8px" }}
                        >
                          ดูประวัติประกาศ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* STEP 1: Type Selection */}
                      {step === 1 && (
                        <>
                          <h3 style={{ fontSize: "1.05rem", color: "var(--accent-light)", margin: 0, fontWeight: "bold" }}>1. เลือกหมวดหมู่และเทมเพลตประกาศ</h3>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>ประเภทประกาศ (Category)</label>
                            <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} style={{ ...inputStyle, cursor: "pointer", width: "100%" }}>
                              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                            </select>
                            {categories.find(c => c.id === selectedCatId)?.description && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <InfoIcon size={12} />
                                {categories.find(c => c.id === selectedCatId)?.description}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>เลือกเทมเพลตประกาศ (Template)</label>
                              {activeTemplate && (
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  {activeTemplate.title.length}/100
                                </span>
                              )}
                            </div>
                            {filteredTemplates.length === 0 ? (
                              <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem", borderRadius: "8px", textAlign: "center" }}>
                                ไม่มีรูปแบบประกาศในหมวดหมู่นี้
                              </div>
                            ) : (
                              <select value={selectedTplId} onChange={(e) => setSelectedTplId(e.target.value)} style={{ ...inputStyle, cursor: "pointer", width: "100%" }}>
                                {filteredTemplates.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.title}</option>))}
                              </select>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px 16px" }}>
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>แสดงผลเป็นประกาศด่วน (Urgent Announcement)</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>เน้นความสำคัญและแสดงแถบสีแดงแจ้งเตือนเด่นชัด</div>
                            </div>
                            <label className="toggle-switch" style={{ position: "relative", display: "inline-block", width: "36px", height: "18px", margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                              />
                              <span className="toggle-slider" style={{
                                position: "absolute", cursor: "pointer", inset: 0,
                                background: isUrgent ? "var(--danger)" : "var(--bg-tertiary)",
                                borderRadius: "18px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                border: `1px solid ${isUrgent ? "var(--danger)" : "var(--border)"}`,
                              }}>
                                <span style={{
                                  position: "absolute", height: "14px", width: "14px",
                                  left: isUrgent ? "19px" : "2px", top: "1px",
                                  background: "white", borderRadius: "50%", transition: "all 0.3s"
                                }} />
                              </span>
                            </label>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                            <button disabled={filteredTemplates.length === 0} onClick={() => setStep(2)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              ถัดไป <ArrowRight size={14} />
                            </button>
                          </div>
                        </>
                      )}

                      {/* STEP 2: Content Variables */}
                      {step === 2 && (
                        <>
                          <h3 style={{ fontSize: "1.05rem", color: "var(--accent-light)", margin: 0, fontWeight: "bold" }}>2. กรอกรายละเอียดข้อความประกาศ</h3>

                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {hasPlaceholder("[ประเภท]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>🏷️ ประเภทเป้าหมาย (Target Type)</label>
                                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", background: "var(--bg-secondary)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                  {["ประชาชน", "แก๊ง", "แฟม", "MC"].map((type) => (
                                    <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                      <input
                                        type="radio"
                                        name="targetType"
                                        value={type}
                                        checked={targetType === type}
                                        onChange={(e) => setTargetType(e.target.value)}
                                        style={{ accentColor: "var(--accent)" }}
                                      />
                                      {type}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasPlaceholder("[ชื่อคน]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>👤 ชื่อ-นามสกุล คนไข้/บุคคล</label>
                                <input type="text" placeholder="ระบุชื่อจริง-นามสกุล หรือชื่อเรียก" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}

                            {hasPlaceholder("[เบอร์โทร]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>📞 เบอร์โทรศัพท์</label>
                                <input type="text" placeholder="เช่น 123-4567 หรือ 0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}

                            {hasPlaceholder("[ชื่อแก๊ง]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>🏴‍☠️ ชื่อกลุ่ม / แก๊ง / สังกัด</label>
                                <input type="text" placeholder="ระบุชื่อแก๊ง (ถ้าไม่มีให้ใส่ - หรือ ประชาชน)" value={gang} onChange={(e) => setGang(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}

                            {hasPlaceholder("[แก๊งA]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>💥 แก๊ง A / ฝั่ง A</label>
                                <input type="text" placeholder="ระบุชื่อแก๊ง A หรือฝั่งแรก" value={gangA} onChange={(e) => setGangA(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}

                            {hasPlaceholder("[แก๊งB]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>💥 แก๊ง B / ฝั่ง B</label>
                                <input type="text" placeholder="ระบุชื่อแก๊ง B หรือฝั่งตรงข้าม" value={gangB} onChange={(e) => setGangB(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}

                            {/* 5-Pairs Story Score Form */}
                            {hasPlaceholder("[คะแนนสตอรี่]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>📊 ตารางบันทึกคะแนนสตอรี่ (สูงสุด 5 คู่)</label>
                                {storyPairs.map((pair, index) => {
                                  const isRowActive = pair.gangA.trim() || pair.gangB.trim() || pair.scoreA || pair.scoreB;
                                  return (
                                    <div key={index} style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", background: isRowActive ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.005)", border: `1px solid ${isRowActive ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "8px", position: "relative" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: isRowActive ? "var(--accent-light)" : "var(--text-secondary)" }}>คู่ที่ {index + 1}</span>
                                        <button type="button" onClick={() => { const text = formatPair(pair.gangA, pair.tagA, pair.scoreA, pair.gangB, pair.tagB, pair.scoreB); const cmdText = commandPrefix.trim() ? `${commandPrefix.trim()} ${text}` : text; navigator.clipboard.writeText(cmdText); alert(`คัดลอกคะแนนคู่ที่ ${index + 1} เรียบร้อยแล้วค่ะ!`); }} disabled={!isRowActive} style={{ padding: "2px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "4px", fontSize: "0.7rem", cursor: isRowActive ? "pointer" : "not-allowed", opacity: isRowActive ? 1 : 0.5, color: "var(--text-secondary)" }}>คัดลอกคู่นี้</button>
                                      </div>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: "8px", alignItems: "center" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <input type="text" placeholder="ชื่อแก๊ง A" value={pair.gangA} onChange={(e) => updateStoryPair(index, "gangA", e.target.value)} style={{ width: "100%", padding: "5px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.75rem", outline: "none" }} />
                                          <input type="text" placeholder="Tag A (เช่น ABC)" value={pair.tagA} onChange={(e) => updateStoryPair(index, "tagA", e.target.value)} style={{ width: "100%", padding: "5px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.75rem", outline: "none" }} />
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                          <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: "bold" }}>SCORE</div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                            <input type="number" min="0" placeholder="0" value={pair.scoreA} onChange={(e) => updateStoryPair(index, "scoreA", e.target.value)} style={{ width: "32px", padding: "5px 2px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.8rem", textAlign: "center", outline: "none" }} />
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>-</span>
                                            <input type="number" min="0" placeholder="0" value={pair.scoreB} onChange={(e) => updateStoryPair(index, "scoreB", e.target.value)} style={{ width: "32px", padding: "5px 2px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.8rem", textAlign: "center", outline: "none" }} />
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <input type="text" placeholder="ชื่อแก๊ง B" value={pair.gangB} onChange={(e) => updateStoryPair(index, "gangB", e.target.value)} style={{ width: "100%", padding: "5px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.75rem", outline: "none" }} />
                                          <input type="text" placeholder="Tag B (เช่น XYZ)" value={pair.tagB} onChange={(e) => updateStoryPair(index, "tagB", e.target.value)} style={{ width: "100%", padding: "5px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "4px", fontSize: "0.75rem", outline: "none" }} />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Penalties Dropdown */}
                            {hasPlaceholder("[โทษ]") && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>⚖️ ข้อหา / โทษที่ทำความผิด</label>
                                {penalties.length === 0 ? (
                                  <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>ไม่มีข้อมูลโทษแบล็คลิสต์ในระบบ (ติดต่อแอดมิน)</span>
                                ) : (
                                  <select value={selectedPenaltyId} onChange={(e) => setSelectedPenaltyId(e.target.value)} style={{ ...inputStyle, cursor: "pointer", width: "100%" }}>
                                    {penalties.map((pen) => (<option key={pen.id} value={pen.id}>{pen.name}</option>))}
                                  </select>
                                )}
                              </div>
                            )}

                            {/* Fines */}
                            {hasPlaceholder("[ค่าปรับ]") && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>💵 ค่าปรับรวม</label>
                                  <div style={{ padding: "10px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--accent-light)", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "bold", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center" }}>
                                    {totalFine.toLocaleString()} IC
                                  </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold" }}>✖️ Blacklist ซ้ำ (ตัวคูณโทษ)</label>
                                  <input type="number" min="1" max="10" value={multiplier} onChange={(e) => setMultiplier(Math.max(1, Number(e.target.value)))} style={{ ...inputStyle, width: "100%", fontFamily: "var(--font-mono)" }} />
                                </div>
                              </div>
                            )}

                            {/* Cooldown duration */}
                            {(hasPlaceholder("[คูลดาวน์]") || hasPlaceholder("[เวลาเริ่ม]") || hasPlaceholder("[เวลาจบ]")) && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <ClockIcon size={14} /> เวลาคูลดาวน์ (นาที)
                                </label>
                                <input type="number" min="1" placeholder="ระยะเวลาคูลดาวน์ เช่น 10, 15, 30" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(Math.max(1, Number(e.target.value)))} style={{ ...inputStyle, width: "100%" }} />
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "12px" }}>
                            <button onClick={() => setStep(1)} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <ArrowLeft size={14} /> ย้อนกลับ
                            </button>
                            <button onClick={() => setStep(3)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              ถัดไป <ArrowRight size={14} />
                            </button>
                          </div>
                        </>
                      )}

                      {/* STEP 3: Targeting & Confirm */}
                      {step === 3 && (
                        <>
                          <h3 style={{ fontSize: "1.05rem", color: "var(--accent-light)", margin: 0, fontWeight: "bold" }}>3. ตั้งค่ากลุ่มเป้าหมายและเผยแพร่</h3>

                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>🎯 เลือกกลุ่มเป้าหมาย (Access Target)</label>
                              <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} style={{ ...inputStyle, cursor: "pointer", width: "100%" }}>
                                <option value="ทุกคน">ทุกคน (Everyone)</option>
                                <option value="แพทย์, พยาบาล, EMT">แพทย์, พยาบาล, EMT</option>
                                <option value="แพทย์">เฉพาะแพทย์ (Doctors)</option>
                                <option value="พยาบาล">เฉพาะพยาบาล (Nurses)</option>
                                <option value="EMT">เฉพาะ EMT</option>
                              </select>
                            </div>

                            {/* Action Selection Checklist */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(255, 255, 255, 0.015)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px" }}>
                              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>📢 การดำเนินการเผยแพร่ (Publish Actions)</label>
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                  <input
                                    type="checkbox"
                                    checked={publishCopyToClipboard}
                                    onChange={(e) => setPublishCopyToClipboard(e.target.checked)}
                                    style={{ accentColor: "var(--accent)", width: "16px", height: "16px", marginTop: "2px" }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: "600" }}>คัดลอกคำสั่งลง Clipboard</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>บันทึกคำสั่งเข้าคลิปบอร์ดสำหรับคัดลอกไปใช้ในเซิร์ฟเวอร์เกม</div>
                                  </div>
                                </label>

                                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                  <input
                                    type="checkbox"
                                    checked={publishSendToDiscord}
                                    onChange={(e) => setPublishSendToDiscord(e.target.checked)}
                                    style={{ accentColor: "var(--accent)", width: "16px", height: "16px", marginTop: "2px" }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: "600" }}>ส่งข่าวประกาศเข้า Discord</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ส่งเนื้อหาและข้อมูลแบล็คลิสต์ไปยังแชนแนล Discord ของหน่วยงาน</div>
                                  </div>
                                </label>
                              </div>
                            </div>

                            <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.015)", border: "1px solid var(--border-subtle)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                                <CheckCircle size={14} style={{ color: "var(--accent)" }} /> สรุปการประกาศ
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                <div>หมวดหมู่: <span style={{ color: "var(--text-primary)" }}>{categories.find(c => c.id === selectedCatId)?.name || "ทั่วไป"}</span></div>
                                <div>ผู้ส่ง: <span style={{ color: "var(--text-primary)" }}>{currentUser?.name || "ระบบ"}</span></div>
                                {cooldownMinutes > 0 && (
                                  <>
                                    <div>คูลดาวน์: <span style={{ color: "var(--text-primary)" }}>{cooldownMinutes} นาที</span></div>
                                    <div>เวลาคูลดาวน์: <span style={{ color: "var(--text-primary)" }}>{fixedStartTime || "--.--"} ถึง {fixedEndTime || "--.--"}</span></div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <InfoIcon size={14} /> ระบบจะดำเนินการตามหัวข้อที่เลือก และบันทึกประวัติการแบล็คลิสต์ลงในฐานข้อมูลให้ทันทีค่ะ
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "12px" }}>
                            <button onClick={() => setStep(2)} className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <ArrowLeft size={14} /> ย้อนกลับ
                            </button>
                            <button onClick={handleConfirmPublish} disabled={!publishCopyToClipboard && !publishSendToDiscord} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                              <CheckCircle size={14} /> ยืนยันเผยแพร่ประกาศ
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                </div>
              </div>
            </div>

            {/* ─── Right Panel: Live Preview Card ─── */}
            <div className="live-preview-container">
              <div className={`preview-system-card ${isUrgent ? "urgent" : ""}`} style={{ minHeight: "360px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    ตัวอย่างประกาศ (Live Preview)
                  </span>
                  <span className="preview-embed-badge" style={{ fontSize: "0.65rem", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-muted)", padding: "2px 8px" }}>
                    ตัวอย่างระบบ
                  </span>
                </div>

                <div className="preview-alert-box" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "start" }}>
                    <div className="preview-alert-icon-wrapper">
                      <MegaphoneIcon size={20} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <span className={`preview-embed-badge ${isUrgent ? "urgent" : ""}`} style={{ marginBottom: "6px" }}>
                        {isUrgent ? "ประกาศด่วน" : categories.find(c => c.id === selectedCatId)?.name || "ทั่วไป"}
                      </span>
                      <h4 className="preview-embed-title" style={{ margin: 0 }}>
                        {activeTemplate ? activeTemplate.title : "หัวข้อประกาศจะแสดงที่นี่"}
                      </h4>
                      <pre className="preview-embed-body" style={{ marginTop: "10px", margin: "10px 0 0 0" }}>
                        {formattedResultText || "ข้อความเนื้อหาของประกาศจะแสดงที่นี่"}
                      </pre>
                    </div>
                  </div>

                  <div className="preview-embed-meta" style={{ marginTop: "12px" }}>
                    <div className="preview-meta-item">
                      <HospitalIcon size={12} /> Pillbox Hill Medical Center
                    </div>
                    <div className="preview-meta-item">
                      <ClockIcon size={12} /> {fixedStartTime ? `เริ่ม ${fixedStartTime} - จบ ${fixedEndTime}` : formatThaiDate(new Date())}
                    </div>
                    <div className="preview-meta-item">
                      <Users size={12} /> {targetGroup}
                    </div>
                  </div>
                </div>

                {discordStatus && (
                  <div style={{ padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", background: discordStatus.type === "success" ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${discordStatus.type === "success" ? "var(--success)" : "var(--danger)"}`, color: discordStatus.type === "success" ? "var(--success)" : "var(--danger)", textAlign: "center" }}>
                    {discordStatus.message}
                  </div>
                )}

                <div className="preview-embed-buttons" style={{ marginTop: "auto" }}>
                  <button onClick={handleCopyText} disabled={!formattedResultText} className="btn btn-ghost" style={{ justifyContent: "center", borderRadius: "8px" }}>
                    <ClipboardIcon size={14} /> คัดลอกประกาศ
                  </button>
                  <button onClick={handleSendToDiscord} disabled={!formattedResultText || isSendingDiscord} className="btn btn-primary" style={{ justifyContent: "center", background: "#5865F2", color: "white", border: "none", borderRadius: "8px" }}>
                    <SendIcon size={14} /> {isSendingDiscord ? "กำลังส่ง..." : "ส่งเข้า Discord"}
                  </button>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center" }}>
                  * พรีวิวในระบบและดิสคอร์ด เมื่อส่งข้อมูลสำเร็จจะปรากฏในช่องทางต่างๆ
                </span>
              </div>
            </div>
          </div>

          {/* ─── Blacklist History Table Card ─── */}
          <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <h2 style={{ fontSize: "1.15rem", color: "var(--accent-light)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardIcon size={20} style={{ color: "var(--accent)" }} />
                ประวัติการติด Blacklist ในระบบ (Active Blacklists)
              </h2>

              {/* Table search filter bar */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Search box */}
                <div style={{ position: "relative", width: "240px" }}>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ หรือความผิด..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ ...inputStyle, width: "100%", paddingLeft: "32px", height: "36px" }}
                  />
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)" }} />
                </div>
              </div>
            </div>

            {/* Filter pills below title */}
            <div className="blacklist-filter-tabs">
              {[
                { label: "ทั้งหมด", value: "ทั้งหมด", count: blacklistHistory.length },
                { label: "ติดแบล็คลิสต์", value: "ติดแบล็คลิสต์", count: blacklistHistory.filter(r => r.status !== 'released').length },
                { label: "ปลดแบล็คลิสต์แล้ว", value: "ปลดแบล็คลิสต์แล้ว", count: blacklistHistory.filter(r => r.status === 'released').length }
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setTableFilterTab(tab.value)}
                  className={`blacklist-filter-tab ${tableFilterTab === tab.value ? "active" : ""}`}
                >
                  {tab.label}
                  <span className="blacklist-filter-badge">{tab.count}</span>
                </button>
              ))}
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
                <table className="shift-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left", marginTop: 0 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>หัวข้อประกาศ / รายละเอียด</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>ประเภท</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>ผู้สร้าง</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>เผยแพร่เมื่อ</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>สถานะ</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold" }}>การเข้าถึง</th>
                      <th style={{ padding: "12px 16px", fontWeight: "bold", textAlign: "right" }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredHistory = blacklistHistory.filter(record => {
                        const matchesSearch = searchQuery.trim() === "" ||
                          record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (record.phone && record.phone.includes(searchQuery)) ||
                          (record.gang && record.gang.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (record.penalty && record.penalty.toLowerCase().includes(searchQuery.toLowerCase()));

                        if (tableFilterTab === "ติดแบล็คลิสต์") {
                          return matchesSearch && record.status !== "released";
                        }
                        if (tableFilterTab === "ปลดแบล็คลิสต์แล้ว") {
                          return matchesSearch && record.status === "released";
                        }
                        return matchesSearch;
                      });

                      const itemsPerPage = 5;
                      const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
                      const safeCurrentPage = Math.min(currentPage, totalPages);
                      const paginatedHistory = filteredHistory.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

                      if (paginatedHistory.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                              {loadingHistory ? "กำลังโหลดข้อมูล..." : "ไม่มีประวัติการติด Blacklist ที่ต้องการแสดงค่ะ"}
                            </td>
                          </tr>
                        );
                      }

                      return paginatedHistory.map((record) => (
                        <tr key={record.id} style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                          {/* Title / Details */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                              {record.penalty || "ข้อหาแบล็คลิสต์"} : {record.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              เบอร์โทร: {record.phone || "-"} | สังกัด: {record.gang || "-"} {record.target_type && `(${record.target_type})`}
                            </div>
                          </td>

                          {/* Category badge */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{
                              padding: "2px 8px",
                              background: record.status === "released" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                              border: `1px solid ${record.status === "released" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                              color: record.status === "released" ? "var(--success)" : "var(--danger)",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: "bold"
                            }}>
                              {record.status === "released" ? "ปลดแบล็คลิสต์" : "แบล็คลิสต์"}
                            </span>
                          </td>

                          {/* Creator */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-secondary)" }}>
                                {record.created_by ? record.created_by.charAt(0).toUpperCase() : "M"}
                              </div>
                              <span style={{ fontSize: "0.8rem" }}>{record.created_by?.split("@")[0] || "แพทย์"}</span>
                            </div>
                          </td>

                          {/* Published At */}
                          <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {record.created_at ? formatThaiDate(new Date(record.created_at)) : "-"}
                          </td>

                          {/* Status indicator dot */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <span style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: record.status === "released" ? "var(--success)" : "var(--danger)",
                                display: "inline-block"
                              }} />
                              <span style={{ fontSize: "0.8rem", color: record.status === "released" ? "var(--success)" : "var(--danger)" }}>
                                {record.status === "released" ? "ปลดแบล็คลิสต์แล้ว" : "ติดแบล็คลิสต์"}
                              </span>
                            </div>
                          </td>

                          {/* Access */}
                          <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                            ทุกคน
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center" }}>
                              {record.status !== "released" && (
                                <button
                                  onClick={() => handleReleaseBlacklist(record)}
                                  disabled={releasingId === record.id}
                                  className="btn btn-primary"
                                  style={{ padding: "4px 10px", fontSize: "0.72rem", borderRadius: "6px" }}
                                >
                                  {releasingId === record.id ? "กำลังปลด..." : "🔓 ปลด"}
                                </button>
                              )}
                              <span style={{ color: "var(--text-muted)", cursor: "pointer", display: "inline-flex" }}>
                                <MoreVertical size={16} />
                              </span>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {(() => {
                  const filteredHistory = blacklistHistory.filter(record => {
                    const matchesSearch = searchQuery.trim() === "" ||
                      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (record.phone && record.phone.includes(searchQuery)) ||
                      (record.gang && record.gang.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      (record.penalty && record.penalty.toLowerCase().includes(searchQuery.toLowerCase()));

                    if (tableFilterTab === "ติดแบล็คลิสต์") {
                      return matchesSearch && record.status !== "released";
                    }
                    if (tableFilterTab === "ปลดแบล็คลิสต์แล้ว") {
                      return matchesSearch && record.status === "released";
                    }
                    return matchesSearch;
                  });

                  const itemsPerPage = 5;
                  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
                  const safeCurrentPage = Math.min(currentPage, totalPages);
                  const startIndex = filteredHistory.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
                  const endIndex = Math.min(safeCurrentPage * itemsPerPage, filteredHistory.length);

                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", flexWrap: "wrap", gap: "12px", borderTop: "1px solid var(--border-subtle)", marginTop: "12px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        แสดง {startIndex} ถึง {endIndex} จาก {filteredHistory.length} รายการ
                      </span>
                      
                      {totalPages > 1 && (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="btn btn-ghost"
                            style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.75rem", borderRadius: "6px" }}
                          >
                            &lt;
                          </button>
                          {Array.from({ length: totalPages }, (_, idx) => (
                            <button
                              key={idx + 1}
                              onClick={() => setCurrentPage(idx + 1)}
                              className={`btn ${safeCurrentPage === idx + 1 ? "btn-primary" : "btn-ghost"}`}
                              style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.75rem", borderRadius: "6px" }}
                            >
                              {idx + 1}
                            </button>
                          ))}
                          <button
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="btn btn-ghost"
                            style={{ padding: "4px 10px", minWidth: "32px", fontSize: "0.75rem", borderRadius: "6px" }}
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        </>
      )}

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║                   SETTINGS MODE (Admin Only)              ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      {mode === "settings" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* TAB: General & Webhooks Settings */}
          {activeSettingsTab === "general" && (
            <section className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "1.1rem", color: "var(--accent-light)", margin: 0, borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <SettingsIcon size={20} />
                ตั้งค่าทั่วไปสำหรับประกาศ (General Settings)
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>คำสั่งประกาศหน่วยงานเริ่มต้น</label>
                  <input type="text" placeholder="เช่น /ems, /gov" value={announcementCommandPrefix} onChange={(e) => setAnnouncementCommandPrefix(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>คำสั่งเริ่มต้นสำหรับข้อความประกาศ</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Discord Webhook สำหรับประกาศ</label>
                  <input type="url" placeholder="https://discord.com/api/webhooks/..." value={discordAnnouncementWebhookUrl} onChange={(e) => setDiscordAnnouncementWebhookUrl(e.target.value.trim())} style={{ ...inputStyle, width: "100%" }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ระบุเว็บบุ๊คส่งแชลเนล Discord ที่ต้องการแยกประกาศโดยเฉพาะ</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>รูปแบบประกาศปลด Blacklist (Release Template)</label>
                <textarea placeholder="พิมพ์โครงสร้างประกาศปลดแบล็คลิสต์..." value={blacklistReleaseTemplate} onChange={(e) => setBlacklistReleaseTemplate(e.target.value)} rows={4} style={{ ...inputStyle, width: "100%", fontFamily: "var(--font-mono)", resize: "vertical", lineHeight: "1.5" }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>โครงสร้างข้อความปลดแบล็คลิสต์ (รองรับ [ชื่อคน], [เบอร์โทร], [ชื่อแก๊ง], [โทษ], [ค่าปรับ], [ตัวคูณ], [ประเภท])</span>
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
                }} disabled={isSaving} className="btn btn-primary" style={{ padding: "10px 20px" }}>
                  <SaveIcon size={14} />
                  {isSaving ? "กำลังบันทึก..." : "บันทึกตั้งค่าการแจ้งเตือน"}
                </button>
              </div>
            </section>
          )}

          {/* TAB: Templates */}
          {activeSettingsTab === "templates" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
              <form onSubmit={handleSaveTemplate} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {editingTemplateId ? (<><EditIcon size={16} /> แก้ไขรูปแบบประกาศ</>) : (<><PlusIcon size={16} /> เพิ่มรูปแบบประกาศใหม่</>)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หัวข้อของประกาศ</label>
                  <input type="text" placeholder="เช่น ประกาศติด Blacklist บุคคล..." value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หมวดหมู่ประกาศ</label>
                  <select value={tempCatId} onChange={(e) => setTempCatId(e.target.value)} required style={{ ...inputStyle, cursor: "pointer", width: "100%" }}>
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>โครงสร้างข้อความประกาศ (Template Body)</label>
                  <textarea ref={textareaRef} placeholder="ใช้ตัวแปรเพื่อสร้างเทมเพลต เช่น [ชื่อคน], [เบอร์โทร], [โทษ]" value={tempContent} onChange={(e) => setTempContent(e.target.value)} required rows={8} style={{ ...inputStyle, width: "100%", fontFamily: "var(--font-mono)", resize: "vertical", lineHeight: "1.5" }} />
                </div>

                {/* Placeholder insertion buttons */}
                <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--accent-light)", marginBottom: "8px" }}>💡 คลิกเพื่อแทรกตัวแปรตรงตำแหน่งเคอร์เซอร์:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      { label: "👤 [ชื่อคน]", placeholder: "[ชื่อคน]" },
                      { label: "📞 [เบอร์โทร]", placeholder: "[เบอร์โทร]" },
                      { label: "🏴‍☠️ [ชื่อแก๊ง]", placeholder: "[ชื่อแก๊ง]" },
                      { label: "🏷️ [ประเภท]", placeholder: "[ประเภท]" },
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
                      <button key={item.placeholder} type="button" onClick={() => insertPlaceholder(item.placeholder)} style={{ padding: "4px 8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "4px", color: "var(--text-secondary)", fontSize: "0.72rem", cursor: "pointer" }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                  {editingTemplateId && (
                    <button type="button" onClick={handleCancelEdit} className="btn btn-ghost" style={{ padding: "8px 16px" }}>ยกเลิก</button>
                  )}
                  <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: "8px 20px" }}>
                    {isSaving ? "กำลังบันทึก..." : editingTemplateId ? "อัปเดตข้อมูล" : "เพิ่มเทมเพลต"}
                  </button>
                </div>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>รูปแบบประกาศปัจจุบัน ({templates.length})</h3>
                {templates.length === 0 ? (
                  <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีการเพิ่มเทมเพลตในระบบ</div>
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
                                <FolderIcon size={12} /> {cat?.name || "ทั่วไป"}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => handleEditClick(tpl)} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "4px" }}><EditIcon size={12} /> แก้ไข</button>
                            <button onClick={() => handleDeleteTemplate(tpl.id, tpl.title)} className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "4px" }}><TrashIcon size={12} /> ลบ</button>
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

          {/* TAB: Categories */}
          {activeSettingsTab === "categories" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
              <form onSubmit={handleAddCategory} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><PlusIcon size={18} /> เพิ่มหมวดหมู่ใหม่</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ชื่อหมวดหมู่</label>
                  <input type="text" placeholder="เช่น Blacklist, ทั่วไป..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>คำอธิบายย่อ</label>
                  <input type="text" placeholder="เช่น โพสต์สำหรับคนร้าย..." value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
                </div>
                <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
                  <PlusIcon size={14} /> บันทึกหมวดหมู่
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
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="btn btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }}><TrashIcon size={12} /> ลบ</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Penalties */}
          {activeSettingsTab === "penalties" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
              <form onSubmit={handleAddPenalty} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  {editingPenaltyId ? (<><EditIcon size={18} /> แก้ไขความผิด / โทษปรับสำเร็จรูป</>) : (<><PlusIcon size={18} /> เพิ่มความผิด / โทษปรับสำเร็จรูป</>)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ประเภทความผิด / โทษข้อหา</label>
                  <input type="text" placeholder="เช่น ทำร้ายร่างกายแพทย์..." value={newPenName} onChange={(e) => setNewPenName(e.target.value)} required style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>วงเงินค่าปรับตั้งต้น (IC)</label>
                  <input type="number" min="0" placeholder="เช่น 50000" value={newPenFine || ""} onChange={(e) => setNewPenFine(Number(e.target.value))} required style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
                  {editingPenaltyId && (
                    <button type="button" onClick={handleCancelEditPenalty} className="btn btn-ghost" style={{ padding: "8px 16px" }}>ยกเลิก</button>
                  )}
                  <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: "8px 20px" }}>
                    {editingPenaltyId ? "อัปเดตข้อหา" : "บันทึกอัตราโทษ"}
                  </button>
                </div>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>รายการอัตราโทษปรับสำเร็จรูป ({penalties.length})</h3>
                {penalties.length === 0 ? (
                  <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีรายการข้อหาตั้งค่าในระบบ</div>
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
                        <button onClick={() => handleEditPenaltyClick(pen)} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "0.8rem" }}><EditIcon size={12} /> แก้ไข</button>
                        <button onClick={() => handleDeletePenalty(pen.id, pen.name)} className="btn btn-danger" style={{ padding: "6px 12px", fontSize: "0.8rem" }}><TrashIcon size={12} /> ลบ</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
