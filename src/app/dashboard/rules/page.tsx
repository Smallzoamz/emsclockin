"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { getSession } from "next-auth/react";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  FileTextIcon,
  FolderIcon,
  HospitalIcon,
  StethoscopeIcon,
  FlagIcon,
  ShieldIcon,
  CoinsIcon,
  EditIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  CrossIcon,
  InfoIcon,
  UploadIcon
} from "@/components/Icons";

interface Rule {
  id: string;
  content: string;
}

interface Category {
  id: string;
  name: string;
  coverUrl?: string;
  rules: Rule[];
}

interface RulesData {
  title: string;
  coverUrl?: string;
  categories: Category[];
}

const feeHeaders = ["เคสทั่วไป", "เคสสตอรี่", "เคสกิจกรรม", "ฉีดยา"];
const feeColors = [
  { border: "rgba(16, 185, 129, 0.3)", borderHover: "rgba(16, 185, 129, 0.6)", bg: "rgba(16, 185, 129, 0.05)", text: "var(--accent-light)", icon: "🟢", glow: "rgba(16, 185, 129, 0.15)" },
  { border: "rgba(59, 130, 246, 0.3)", borderHover: "rgba(59, 130, 246, 0.6)", bg: "rgba(59, 130, 246, 0.05)", text: "#93c5fd", icon: "🔵", glow: "rgba(59, 130, 246, 0.15)" },
  { border: "rgba(245, 158, 11, 0.3)", borderHover: "rgba(245, 158, 11, 0.6)", bg: "rgba(245, 158, 11, 0.05)", text: "#fde047", icon: "🟡", glow: "rgba(245, 158, 11, 0.15)" },
  { border: "rgba(168, 85, 247, 0.3)", borderHover: "rgba(168, 85, 247, 0.6)", bg: "rgba(168, 85, 247, 0.05)", text: "#f472b6", icon: "💉", glow: "rgba(168, 85, 247, 0.15)" }
];

export default function RulesPage() {
  const confirm = useConfirm();
  const [rules, setRules] = useState<RulesData | null>(null);
  const [editedRules, setEditedRules] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirm({
      title: "อัปโหลดรูปแผนที่",
      message: "ต้องการอัปโหลดไฟล์ภาพนี้เป็นรูปแผนที่แบ่งพื้นที่การรักษาหรือไม่?",
      confirmText: "อัปโหลด",
      cancelText: "ยกเลิก",
      variant: "info"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("cover", file);
    formData.append("catId", "medical_fees");
    formData.append("isMap", "true");

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updateMapUrl = (prev: RulesData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id !== "medical_fees") return c;
              return { ...c, mapUrl: data.coverUrl };
            })
          };
        };
        setRules(updateMapUrl(rules));
        if (editedRules) {
          setEditedRules(updateMapUrl(editedRules));
        }
        showToast("อัปโหลดรูปแผนที่เรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
      }
    } catch (error) {
      console.error("Map upload error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMapDelete = async () => {
    const confirmed = await confirm({
      title: "ลบรูปแผนที่",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรูปแผนที่แบ่งพื้นที่การรักษานี้?",
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("deleteCover", "true");
    formData.append("catId", "medical_fees");
    formData.append("isMap", "true");

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updateMapUrl = (prev: RulesData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id !== "medical_fees") return c;
              return { ...c, mapUrl: "" };
            })
          };
        };
        setRules(updateMapUrl(rules));
        if (editedRules) {
          setEditedRules(updateMapUrl(editedRules));
        }
        showToast("ลบรูปแผนที่เรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการลบรูปแผนที่", "error");
      }
    } catch (error) {
      console.error("Map delete error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyFeeToClipboard = (ruleId: string, text: string) => {
    const cleanNumbers = text.replace(/[^0-9]/g, "");
    const textToCopy = cleanNumbers || text;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedRuleId(ruleId);
      setTimeout(() => setCopiedRuleId(null), 2000);
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
    });
  };

  const parseMedicalFeeContent = (content: string) => {
    if (content.includes("@@@FEE@@@")) {
      const parts = content.split("@@@FEE@@@");
      return {
        description: parts[0] || "",
        fee: parts[1] || ""
      };
    }
    
    // Backward compatibility with newlines
    if (content.includes("\n")) {
      const parts = content.split("\n");
      const fee = parts[parts.length - 1] || "";
      const description = parts.slice(0, parts.length - 1).join("\n") || "";
      return { description, fee };
    }
    
    // Backward compatibility with colon
    if (content.includes(":")) {
      const colonIndex = content.indexOf(":");
      return {
        description: content.substring(0, colonIndex).trim(),
        fee: content.substring(colonIndex + 1).trim()
      };
    }
    
    return {
      description: content || "",
      fee: ""
    };
  };

  const groupFeeRules = (rulesList: Rule[]) => {
    const groups: Record<string, Rule[]> = {
      mf_general: [],
      mf_story: [],
      mf_event: [],
      mf_injection: []
    };

    rulesList.forEach(rule => {
      if (rule.id.startsWith("mf_general") || rule.id === "mf_1") {
        groups.mf_general.push(rule);
      } else if (rule.id.startsWith("mf_story") || rule.id === "mf_2") {
        groups.mf_story.push(rule);
      } else if (rule.id.startsWith("mf_event") || rule.id === "mf_3") {
        groups.mf_event.push(rule);
      } else if (rule.id.startsWith("mf_injection") || rule.id === "mf_4") {
        groups.mf_injection.push(rule);
      } else {
        groups.mf_general.push(rule);
      }
    });

    return groups;
  };

  const getZoneKey = (desc: string) => {
    if (!desc) return null;
    if (desc.includes("ในเมือง")) return "ในเมือง";
    if (desc.includes("นอกเมือง")) return "นอกเมือง";
    if (desc.includes("เมืองบน")) return "เมืองบน";
    return null;
  };

  const handleAddFeeRule = (groupId: string) => {
    if (!editedRules) return;
    const newId = `${groupId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      return {
        ...cat,
        rules: [...cat.rules, { id: newId, content: "@@@FEE@@@" }]
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleDeleteFeeRule = async (ruleId: string) => {
    const confirmed = await confirm({
      title: "ยืนยันการลบรายการ",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบอัตราค่ารักษาพยาบาลรายการนี้?",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      return {
        ...cat,
        rules: cat.rules.filter(r => r.id !== ruleId)
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleMedicalFeeFieldChange = (ruleId: string, fieldIndex: number, value: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      return {
        ...cat,
        rules: cat.rules.map((rule) => {
          if (rule.id !== ruleId) return rule;
          const { description, fee } = parseMedicalFeeContent(rule.content);
          const newDesc = fieldIndex === 0 ? value : description;
          const newFee = fieldIndex === 1 ? value : fee;
          return { ...rule, content: `${newDesc}@@@FEE@@@${newFee}` };
        })
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleBlacklistFieldChange = (catId: string, ruleId: string, fieldIndex: number, value: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        rules: cat.rules.map((rule) => {
          if (rule.id !== ruleId) return rule;
          const parts = rule.content.split("\n");
          while (parts.length < 3) parts.push("");
          parts[fieldIndex] = value;
          return { ...rule, content: parts.join("\n") };
        })
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
      }
    } catch (error) {
      console.error("Failed to fetch rules:", error);
      showToast("ไม่สามารถดึงข้อมูลกฏระเบียบได้", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "กฎระเบียบแพทย์ | EMS Clock-in";
    setMounted(true);
    getSession().then((session) => {
      const user = session?.user as any;
      if (user?.role === "admin") {
        setIsAdmin(true);
      }
      fetchRules();
    });
    return () => setMounted(false);
  }, []);

  const handleToggleEdit = () => {
    if (isEditMode) {
      setEditedRules(null);
      setIsEditMode(false);
    } else {
      const cloned = JSON.parse(JSON.stringify(rules));
      const medCat = cloned.categories.find((c: any) => c.id === "medical_fees");
      if (medCat) {
        if (!medCat.rules) medCat.rules = [];
        
        medCat.rules = medCat.rules.map((rule: any) => {
          const { description, fee } = parseMedicalFeeContent(rule.content);
          return { ...rule, content: `${description}@@@FEE@@@${fee}` };
        });

        const groups = groupFeeRules(medCat.rules);
        const groupIds = ["mf_general", "mf_story", "mf_event", "mf_injection"];
        groupIds.forEach(groupId => {
          if (groups[groupId].length === 0) {
            const initId = `${groupId}_init_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            medCat.rules.push({ id: initId, content: "@@@FEE@@@" });
          }
        });
      }
      setEditedRules(cloned);
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = async () => {
    const confirmed = await confirm({
      title: "ยกเลิกการแก้ไข",
      message: "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการแก้ไข? ข้อมูลที่แก้ไขทั้งหมดจะหายไป",
      confirmText: "ยกเลิกการแก้ไข",
      cancelText: "เขียนต่อ",
      variant: "warning"
    });
    if (confirmed) {
      setEditedRules(null);
      setIsEditMode(false);
    }
  };

  const handleRuleContentChange = (catId: string, ruleId: string, value: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        rules: cat.rules.map((rule) => {
          if (rule.id !== ruleId) return rule;
          return { ...rule, content: value };
        })
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleAddRule = (catId: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const newId = `${catId.substring(0, 2)}_${Date.now()}`;
      return {
        ...cat,
        rules: [...cat.rules, { id: newId, content: "" }]
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleDeleteRule = async (catId: string, ruleId: string) => {
    const confirmed = await confirm({
      title: "ยืนยันการลบกฎ",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบกฎระเบียบข้อนี้? การลบจะมีผลเมื่อกดบันทึกข้อมูล",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        rules: cat.rules.filter((rule) => rule.id !== ruleId)
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleMoveRule = (catId: string, ruleId: string, direction: "up" | "down") => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const index = cat.rules.findIndex((r) => r.id === ruleId);
      if (index === -1) return cat;
      if (direction === "up" && index === 0) return cat;
      if (direction === "down" && index === cat.rules.length - 1) return cat;

      const newRules = [...cat.rules];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = newRules[index];
      newRules[index] = newRules[targetIndex];
      newRules[targetIndex] = temp;

      return { ...cat, rules: newRules };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleCategoryNameChange = (catId: string, value: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return { ...cat, name: value };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const handleMajorTitleChange = (value: string) => {
    if (!editedRules) return;
    setEditedRules({ ...editedRules, title: value });
  };

  const handleSaveChanges = async () => {
    if (!editedRules) return;

    const confirmed = await confirm({
      title: "บันทึกการเปลี่ยนแปลง",
      message: "คุณต้องการบันทึกกฏระเบียบชุดใหม่ลงในฐานข้อมูลระบบหรือไม่?",
      confirmText: "บันทึก",
      cancelText: "ยกเลิก",
      variant: "success"
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: editedRules })
      });
      const data = await res.json();
      if (data.success) {
        setRules(editedRules);
        setIsEditMode(false);
        showToast(data.message || "บันทึกข้อมูลเรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (error) {
      console.error("Save rules error:", error);
      showToast("ไม่สามารถบันทึกข้อมูลได้เนื่องจากข้อผิดพลาดของเครือข่าย", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirm({
      title: "อัปโหลดรูปภาพปก",
      message: "ต้องการอัปโหลดไฟล์ภาพนี้เป็นรูปภาพปกใหม่หรือไม่?",
      confirmText: "อัปโหลด",
      cancelText: "ยกเลิก",
      variant: "info"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("cover", file);

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updatedRules = { ...rules, coverUrl: data.coverUrl } as RulesData;
        setRules(updatedRules);
        if (editedRules) {
          setEditedRules({ ...editedRules, coverUrl: data.coverUrl });
        }
        showToast(data.message || "อัปโหลดรูปปกเรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
      }
    } catch (error) {
      console.error("Cover upload error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCover = async () => {
    const confirmed = await confirm({
      title: "ลบรูปภาพปก",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพปกนี้?",
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("deleteCover", "true");

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updatedRules = { ...rules, coverUrl: "" } as RulesData;
        setRules(updatedRules);
        if (editedRules) {
          setEditedRules({ ...editedRules, coverUrl: "" });
        }
        showToast(data.message || "ลบรูปปกเรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการลบรูปปก", "error");
      }
    } catch (error) {
      console.error("Cover delete error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryCoverUpload = async (catId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = await confirm({
      title: "อัปโหลดรูปภาพปกหมวดหมู่",
      message: "ต้องการอัปโหลดไฟล์ภาพนี้เป็นรูปภาพปกสำหรับหมวดหมู่นี้หรือไม่?",
      confirmText: "อัปโหลด",
      cancelText: "ยกเลิก",
      variant: "info"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("cover", file);
    formData.append("catId", catId);

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updateCategoriesCover = (prev: RulesData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id !== catId) return c;
              return { ...c, coverUrl: data.coverUrl };
            })
          };
        };
        setRules(updateCategoriesCover(rules));
        if (editedRules) {
          setEditedRules(updateCategoriesCover(editedRules));
        }
        showToast(data.message || "อัปโหลดรูปปกหมวดหมู่เรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
      }
    } catch (error) {
      console.error("Category cover upload error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryCoverDelete = async (catId: string) => {
    const confirmed = await confirm({
      title: "ลบรูปภาพปกหมวดหมู่",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพปกของหมวดหมู่นี้?",
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("deleteCover", "true");
    formData.append("catId", catId);

    try {
      const res = await fetch("/api/rules/upload-cover", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const updateCategoriesCover = (prev: RulesData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id !== catId) return c;
              return { ...c, coverUrl: "" };
            })
          };
        };
        setRules(updateCategoriesCover(rules));
        if (editedRules) {
          setEditedRules(updateCategoriesCover(editedRules));
        }
        showToast(data.message || "ลบรูปปกหมวดหมู่เรียบร้อยแล้วค่ะ", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการลบรูปปกหมวดหมู่", "error");
      }
    } catch (error) {
      console.error("Category cover delete error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (id: string, size = 20) => {
    switch (id) {
      case "hospital_area":
        return <HospitalIcon size={size} />;
      case "doctor_duty":
        return <StethoscopeIcon size={size} />;
      case "case_story":
        return <FlagIcon size={size} />;
      case "blacklist":
        return <ShieldIcon size={size} />;
      case "medical_fees":
        return <CoinsIcon size={size} />;
      default:
        return <FileTextIcon size={size} />;
    }
  };

  const getCategoryGradient = (id: string) => {
    switch (id) {
      case "hospital_area":
        return "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 10, 19, 0.8) 100%)";
      case "doctor_duty":
        return "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(6, 10, 19, 0.8) 100%)";
      case "case_story":
        return "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(6, 10, 19, 0.8) 100%)";
      case "blacklist":
        return "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(6, 10, 19, 0.8) 100%)";
      case "medical_fees":
        return "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)";
      default:
        return "linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(6, 10, 19, 0.8) 100%)";
    }
  };

  const getHighlightedText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearch})`, "gi");
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="highlight-text">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Modal keyboard listeners (Escape key closes modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCategoryId && !isEditMode) {
        setActiveCategoryId(null);
        setModalSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCategoryId, isEditMode]);

  if (loading && !rules) {
    return <div className="loading-spinner" />;
  }

  const currentRules = isEditMode ? editedRules : rules;
  if (!currentRules) return null;

  const query = searchQuery.trim().toLowerCase();
  const allHidden =
    query !== "" &&
    !currentRules.categories.some((cat) => {
      const matchesName = cat.name.toLowerCase().includes(query);
      const matchesRules = cat.rules.some((rule) =>
        rule.content.toLowerCase().includes(query)
      );
      return matchesName || matchesRules;
    });

  // Active category inside modal
  const activeCategory = currentRules.categories.find(
    (cat) => cat.id === activeCategoryId
  );

  // Filtered rules inside modal popup
  const filteredRules = activeCategory
    ? activeCategory.rules.filter((rule) => {
        const query = modalSearchQuery.trim().toLowerCase();
        if (!query || isEditMode) return true;
        return rule.content.toLowerCase().includes(query);
      })
    : [];

  return (
    <>
      {/* Cover Image Banner */}
      <div className="rules-cover-banner">
        {currentRules.coverUrl ? (
          <img src={currentRules.coverUrl} alt="Cover Banner" className="rules-cover-img" />
        ) : (
          <div className="rules-cover-img" style={{ background: "linear-gradient(135deg, var(--bg-secondary) 0%, rgba(16, 185, 129, 0.08) 50%, rgba(59, 130, 246, 0.04) 100%)" }} />
        )}
        <div className="rules-cover-overlay" />
        
        <div className="rules-cover-content">
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "2.5px", color: "var(--accent-light)", fontWeight: 800 }}>
            {currentRules.title || "กฏของโรงพยาบาล"}
          </span>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)", margin: "4px 0" }}>
            {isEditMode ? (
              <input
                type="text"
                value={currentRules.title}
                onChange={(e) => handleMajorTitleChange(e.target.value)}
                className="rules-textarea"
                style={{ minHeight: "auto", padding: "6px 12px", width: "100%", maxWidth: "420px", background: "rgba(0,0,0,0.4)" }}
                placeholder="หัวข้อใหญ่ประจำหน้ากฏ"
              />
            ) : (
              "กฏระเบียบปฏิบัติหน้าที่"
            )}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "550px", margin: 0 }}>
            {isEditMode ? "แก้ไขหัวข้อและรูปภาพหน้าปกประจำบอร์ดกักตัวและข้อตกลงแพทย์" : "อ่านและทำความเข้าใจข้อตกลงและกฏระเบียบการกู้ชีพอย่างเป็นทางการ"}
          </p>
        </div>

        {isAdmin && (
          <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "8px", zIndex: 10 }}>
            <label className="rules-cover-upload-btn">
              <UploadIcon size={14} />
              อัปโหลดรูปปก
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                style={{ display: "none" }}
              />
            </label>
            {currentRules.coverUrl && (
              <button
                onClick={handleDeleteCover}
                className="rules-cover-upload-btn"
                style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.3)" }}
              >
                <TrashIcon size={14} />
                ลบรูปปก
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        {/* Search Input Filter */}
        {!isEditMode ? (
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              placeholder="ค้นหาหมวดหมู่ หรือคีย์เวิร์ดในกฏ..."
            />
            <svg
              className="search-icon-svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {isAdmin && (
          <div style={{ display: "flex", gap: "8px" }}>
            {isEditMode ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-ghost"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <CrossIcon size={16} />
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <SaveIcon size={16} />
                  บันทึกข้อมูล
                </button>
              </>
            ) : (
              <button
                onClick={handleToggleEdit}
                className="btn btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: "6px", borderColor: "var(--border-glow)", color: "var(--accent-light)" }}
              >
                <EditIcon size={16} style={{ color: "var(--accent)" }} />
                แก้ไขกฏระเบียบ
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info Notice Card */}
      <div className="card" style={{ padding: "16px", marginBottom: "28px", background: "rgba(15, 23, 42, 0.3)", display: "flex", gap: "10px", alignItems: "center" }}>
        <InfoIcon size={20} style={{ flexShrink: 0, color: "var(--info)" }} />
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong>ข้อควรปฏิบัติ:</strong> กฏระเบียบแบ่งออกเป็น 5 หมวดหมู่ย่อย เพื่อความสะดวกในการเปิดอ่าน ค้นหาข้อมูล และการแก้ไขรายละเอียดของเจ้าหน้าที่บอร์ดกักตัว
        </div>
      </div>

      {/* Folder Flex Directory Container (With Smooth Rearrangement Animation) */}
      <div className="folder-flex-container">
        {currentRules.categories.map((cat) => {
          // Filtering check
          const matchesName = cat.name.toLowerCase().includes(query);
          const matchesRules = cat.rules.some((rule) =>
            rule.content.toLowerCase().includes(query)
          );
          const isHidden = query !== "" && !matchesName && !matchesRules;

          const matchingRulesCount = query
            ? cat.rules.filter((r) => r.content.toLowerCase().includes(query)).length
            : 0;

          return (
            <div
              key={cat.id}
              className={`folder-card-wrapper ${isHidden ? "hidden" : ""}`}
            >
              <div
                className="folder-card"
                onClick={() => {
                  if (!isEditMode) {
                    setActiveCategoryId(cat.id);
                  }
                }}
              >
                <div className="folder-tab"></div>
                <div className="folder-body">
                  {/* Category Cover Thumbnail */}
                  <div className="folder-cover-thumbnail">
                    {cat.coverUrl ? (
                      <img src={cat.coverUrl} alt={cat.name} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: getCategoryGradient(cat.id) }} />
                    )}
                    {isEditMode && (
                      <label className="category-cover-upload-trigger" onClick={(e) => e.stopPropagation()}>
                        <UploadIcon size={14} />
                        เปลี่ยนปกย่อย
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCategoryCoverUpload(cat.id, e)}
                          style={{ display: "none" }}
                        />
                      </label>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getCategoryIcon(cat.id, 20)}
                      <FolderIcon size={20} style={{ opacity: 0.6 }} />
                    </div>
                    <span className="rules-card-badge" style={{ fontSize: "0.68rem" }}>
                      {cat.rules.length} ข้อ
                    </span>
                  </div>

                  <div style={{ flexGrow: 1 }}>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={cat.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                        className="rules-textarea"
                        style={{ minHeight: "auto", padding: "6px 10px", fontSize: "0.88rem", width: "100%" }}
                        placeholder="ชื่อหมวดหมู่"
                      />
                    ) : (
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {getHighlightedText(cat.name, searchQuery)}
                      </h3>
                    )}
                  </div>

                  {matchingRulesCount > 0 && (
                    <div style={{ display: "flex", alignSelf: "flex-start", marginTop: "auto" }}>
                      <span className="status-badge on-duty" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                        พบในกฏ {matchingRulesCount} ข้อ
                      </span>
                    </div>
                  )}
                  
                  {isEditMode && (
                    <div style={{ display: "flex", gap: "6px", width: "100%", justifyContent: "flex-end", marginTop: "auto", zIndex: 12 }}>
                      {cat.coverUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryCoverDelete(cat.id);
                          }}
                          className="btn btn-danger"
                          style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategoryId(cat.id);
                        }}
                        className="btn btn-ghost"
                        style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                      >
                        แก้ไขกฏข้อปฏิบัติ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* None Matched Indicator */}
        {allHidden && (
          <div className="card" style={{ width: "100%", textAlign: "center", padding: "48px", color: "var(--text-secondary)", animation: "fadeIn 0.3s" }}>
            ไม่พบแฟ้มข้อมูลที่ตรงกับคำค้นหาของคุณ
          </div>
        )}
      </div>

      {/* Rules Modal Popup (Mounted via React Portal) */}
      {activeCategoryId && activeCategory && mounted && createPortal(
        <div className="rules-modal-backdrop" onClick={() => {
          if (!isEditMode) {
            setActiveCategoryId(null);
            setModalSearchQuery("");
          }
        }}>
          <div className="rules-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Cover Banner Header */}
            <div className="rules-modal-cover-banner">
              {activeCategory.coverUrl ? (
                <img src={activeCategory.coverUrl} alt={activeCategory.name} className="rules-modal-cover-img" />
              ) : (
                <div className="rules-modal-cover-img" style={{ background: getCategoryGradient(activeCategory.id) }} />
              )}
              <div className="rules-modal-cover-overlay" />
              
              <div className="rules-modal-cover-content">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                  {getCategoryIcon(activeCategory.id, 24)}
                  <FolderIcon size={24} style={{ color: "var(--warning)", opacity: 0.8 }} />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                    {activeCategory.name}
                  </h3>
                  
                  {/* Category Cover Upload Actions inside Modal when in Edit Mode */}
                  {isEditMode && (
                    <div style={{ marginLeft: "auto", display: "flex", gap: "6px", zIndex: 12 }}>
                      <label className="rules-modal-cover-upload-btn">
                        <UploadIcon size={12} />
                        เปลี่ยนรูปปก
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCategoryCoverUpload(activeCategory.id, e)}
                          style={{ display: "none" }}
                        />
                      </label>
                      {activeCategory.coverUrl && (
                        <button
                          onClick={() => handleCategoryCoverDelete(activeCategory.id)}
                          className="rules-modal-cover-upload-btn"
                          style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.3)" }}
                        >
                          <TrashIcon size={12} />
                          ลบรูปปก
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (!isEditMode) {
                      setActiveCategoryId(null);
                      setModalSearchQuery("");
                    } else {
                      showToast("กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนปิดหน้าต่างค่ะ", "error");
                    }
                  }}
                  className="rule-btn-icon"
                  style={{ position: "absolute", top: "16px", right: "16px", borderRadius: "50%", background: "rgba(15,23,42,0.6)", color: "#fff", borderColor: "rgba(255,255,255,0.15)", zIndex: 10 }}
                  title="ปิด"
                >
                  <CrossIcon size={16} />
                </button>
              </div>
            </div>

            {/* Local Search Input inside Modal */}
            {!isEditMode && (
              <div style={{ padding: "16px 24px 0 24px" }}>
                <div className="search-container" style={{ maxWidth: "100%" }}>
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="search-input"
                    placeholder="พิมพ์เพื่อค้นหาคีย์เวิร์ดในหมวดหมู่นี้..."
                    style={{ padding: "10px 14px 10px 38px", fontSize: "0.85rem" }}
                  />
                  <svg
                    className="search-icon-svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ left: 12 }}
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>
            )}

            {/* Modal Body */}
            <div className="rules-modal-body">
              {activeCategory.id === "medical_fees" ? (
                <div className="medical-fees-layout">
                  {/* Left Column: Map */}
                  <div className="medical-fees-left">
                    <div className="map-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        🗺️
                        <span>แผนที่แบ่งพื้นที่การรักษา</span>
                      </div>
                      {isEditMode && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <label className="map-upload-trigger-btn" style={{ padding: "6px 12px", fontSize: "0.72rem" }}>
                            <UploadIcon size={12} />
                            อัปโหลด
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleMapUpload}
                              style={{ display: "none" }}
                            />
                          </label>
                          {(activeCategory as any).mapUrl && (
                            <button
                              type="button"
                              onClick={handleMapDelete}
                              className="btn btn-danger"
                              style={{ padding: "6px 12px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <TrashIcon size={12} />
                              ลบ
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {(activeCategory as any).mapUrl ? (
                      <div className="map-container" style={{ position: "relative" }}>
                        <div 
                          style={{ position: "relative", display: "inline-block", maxWidth: "100%", cursor: "zoom-in" }}
                          onClick={() => !isEditMode && setLightboxUrl((activeCategory as any).mapUrl)}
                        >
                          <img
                            src={(activeCategory as any).mapUrl}
                            alt="Treatment Area Map"
                            className={`map-image ${hoveredZone ? "dimmed" : ""}`}
                            style={{ maxHeight: "320px", display: "block" }}
                          />
                          
                          {/* SVG Interactive Overlay */}
                          {!isEditMode && (
                            <svg
                              viewBox="0 0 100 133.3"
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                pointerEvents: "none",
                                zIndex: 10
                              }}
                            >
                              {/* เมืองบน (Green) */}
                              <polygon
                                points="30,5 45,3 52,3 68,15 75,30 75,45 85,58 72,56 50,54 30,56 18,58 20,40 25,30"
                                className={`map-zone-path zone-green ${hoveredZone === "เมืองบน" ? "active" : ""}`}
                                pointerEvents="auto"
                                onMouseEnter={() => setHoveredZone("เมืองบน")}
                                onMouseLeave={() => setHoveredZone(null)}
                              />
                              
                              {/* นอกเมือง (Yellow) */}
                              <polygon
                                points="18,58 13,74 12,85 18,92 22,92 28,88 38,83 50,83 61,90 65,96 66,110 78,105 88,92 90,78 90,65 85,58 72,56 50,54 30,56"
                                className={`map-zone-path zone-yellow ${hoveredZone === "นอกเมือง" ? "active" : ""}`}
                                pointerEvents="auto"
                                onMouseEnter={() => setHoveredZone("นอกเมือง")}
                                onMouseLeave={() => setHoveredZone(null)}
                              />
                              
                              {/* ในเมือง (Red) */}
                              <polygon
                                points="22,92 20,108 24,124 29,129 42,129 44,124 48,129 60,129 65,122 66,110 65,96 61,90 50,83 38,83 28,88"
                                className={`map-zone-path zone-red ${hoveredZone === "ในเมือง" ? "active" : ""}`}
                                pointerEvents="auto"
                                onMouseEnter={() => setHoveredZone("ในเมือง")}
                                onMouseLeave={() => setHoveredZone(null)}
                              />

                              {/* Glowing Interactive Pins */}
                              {/* Pin 1: เมืองบน */}
                              <g 
                                className={`map-pin-group ${hoveredZone === "เมืองบน" ? "active" : ""}`}
                                onMouseEnter={() => setHoveredZone("เมืองบน")}
                                onMouseLeave={() => setHoveredZone(null)}
                              >
                                <circle cx="50" cy="33" r="3.5" fill="none" stroke="#10b981" strokeWidth="1" className="map-pin-pulse" />
                                <circle cx="50" cy="33" r="1.8" fill="#10b981" stroke="#fff" strokeWidth="0.5" className="map-pin-circle" />
                                <rect x="36" y="38" width="28" height="7.5" rx="3" fill="#10b981" stroke="#fff" strokeWidth="0.6" opacity="0.95" />
                                <text x="50" y="43.5" className="map-pin-label">เมืองบน</text>
                              </g>

                              {/* Pin 2: นอกเมือง */}
                              <g 
                                className={`map-pin-group ${hoveredZone === "นอกเมือง" ? "active" : ""}`}
                                onMouseEnter={() => setHoveredZone("นอกเมือง")}
                                onMouseLeave={() => setHoveredZone(null)}
                              >
                                <circle cx="57" cy="67" r="3.5" fill="none" stroke="#eab308" strokeWidth="1" className="map-pin-pulse" />
                                <circle cx="57" cy="67" r="1.8" fill="#eab308" stroke="#fff" strokeWidth="0.5" className="map-pin-circle" />
                                <rect x="43" y="72" width="28" height="7.5" rx="3" fill="#eab308" stroke="#fff" strokeWidth="0.6" opacity="0.95" />
                                <text x="57" y="77.5" className="map-pin-label">นอกเมือง</text>
                              </g>

                              {/* Pin 3: ในเมือง */}
                              <g 
                                className={`map-pin-group ${hoveredZone === "ในเมือง" ? "active" : ""}`}
                                onMouseEnter={() => setHoveredZone("ในเมือง")}
                                onMouseLeave={() => setHoveredZone(null)}
                              >
                                <circle cx="43" cy="102" r="3.5" fill="none" stroke="#ef4444" strokeWidth="1" className="map-pin-pulse" />
                                <circle cx="43" cy="102" r="1.8" fill="#ef4444" stroke="#fff" strokeWidth="0.5" className="map-pin-circle" />
                                <rect x="29" y="107" width="28" height="7.5" rx="3" fill="#ef4444" stroke="#fff" strokeWidth="0.6" opacity="0.95" />
                                <text x="43" y="112.5" className="map-pin-label">ในเมือง</text>
                              </g>
                            </svg>
                          )}
                        </div>
                        
                        {!isEditMode && (
                          <div style={{
                            position: "absolute",
                            bottom: "8px",
                            right: "8px",
                            background: "rgba(15,23,42,0.85)",
                            padding: "4px 8px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.65rem",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-subtle)",
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            zIndex: 15
                          }}>
                            🔎 คลิกดูรูปเต็ม
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="card" style={{ padding: "32px 16px", textAlign: "center", borderStyle: "dashed", borderColor: "var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.82rem", background: "rgba(15,23,42,0.1)", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "180px" }}>
                        ยังไม่มีการอัปโหลดแผนที่
                      </div>
                    )}
                  </div>

                  {/* Right Column: Dashed Table */}
                  <div className="medical-fees-right">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      🪙
                      <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>ตารางอัตราค่ารักษาพยาบาล</span>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table className="fee-dashed-table">
                        <thead>
                          <tr>
                            <th style={{ width: "40px" }}>#</th>
                            <th>รายละเอียดการรักษา</th>
                            <th style={{ width: "160px", textAlign: "right" }}>ค่ารักษา</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const feeGroups = groupFeeRules(activeCategory.rules);
                            const categoryKeys = ["mf_general", "mf_story", "mf_event", "mf_injection"];
                            const categoryNames = ["เคสทั่วไป", "เคสสตอรี่", "เคสกิจกรรม", "ฉีดยา"];
                            const categoryColors = feeColors;

                            return categoryKeys.map((catKey, catIdx) => {
                              const groupRules = feeGroups[catKey] || [];
                              const catName = categoryNames[catIdx];
                              const color = categoryColors[catIdx];

                              return (
                                <Fragment key={catKey}>
                                  {/* Category Header Row */}
                                  <tr className="fee-table-category-row">
                                    <td colSpan={3} className="fee-table-category-header">
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: color.text, fontWeight: 800 }}>
                                        <span>{color.icon}</span>
                                        <span>{catName}</span>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Sub-items */}
                                  {groupRules.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", padding: "12px" }}>
                                        ไม่มีรายการในหมวดหมู่นี้
                                      </td>
                                    </tr>
                                  ) : (
                                    groupRules.map((rule, idx) => {
                                      const { description, fee: feeText } = parseMedicalFeeContent(rule.content);
                                      const zoneKey = getZoneKey(description);
                                      const isHighlighted = hoveredZone && zoneKey === hoveredZone;
                                      const highlightBorderColor = 
                                        zoneKey === "ในเมือง" ? "#ef4444" : 
                                        zoneKey === "นอกเมือง" ? "#eab308" : 
                                        zoneKey === "เมืองบน" ? "#10b981" : "transparent";

                                      return (
                                        <tr 
                                          key={rule.id} 
                                          className={`fee-table-item-row ${isHighlighted ? "row-highlight" : ""}`}
                                          style={{
                                            "--row-highlight-border-color": highlightBorderColor
                                          } as React.CSSProperties}
                                          onMouseEnter={() => {
                                            if (!isEditMode && zoneKey) {
                                              setHoveredZone(zoneKey);
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            if (!isEditMode) {
                                              setHoveredZone(null);
                                            }
                                          }}
                                        >
                                          <td style={{ width: "36px", paddingRight: "0", verticalAlign: "middle" }}>
                                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                              #{idx + 1}
                                            </span>
                                          </td>
                                          <td>
                                            {isEditMode ? (
                                              <textarea
                                                value={description}
                                                onChange={(e) => handleMedicalFeeFieldChange(rule.id, 0, e.target.value)}
                                                className="rules-textarea"
                                                placeholder="ระบุรายละเอียดการรักษา..."
                                                style={{ minHeight: "50px", fontSize: "0.8rem", padding: "6px 10px" }}
                                              />
                                            ) : (
                                              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                                                {description || "—"}
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                              {isEditMode ? (
                                                <>
                                                  <input
                                                    type="text"
                                                    value={feeText}
                                                    onChange={(e) => handleMedicalFeeFieldChange(rule.id, 1, e.target.value)}
                                                    className="search-input"
                                                    placeholder="3,000 IC"
                                                    style={{ padding: "6px 10px", fontSize: "0.8rem", width: "90px", textAlign: "right" }}
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteFeeRule(rule.id)}
                                                    className="rule-btn-icon danger"
                                                    title="ลบรายการนี้"
                                                    style={{ width: "26px", height: "26px", padding: "0" }}
                                                  >
                                                    <TrashIcon size={12} />
                                                  </button>
                                                </>
                                              ) : (
                                                feeText ? (
                                                  <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                                    <button
                                                      onClick={() => copyFeeToClipboard(rule.id, feeText)}
                                                      className="clickable-fee-badge"
                                                      title="คลิกเพื่อคัดลอกตัวเลข"
                                                    >
                                                      <span className="font-mono" style={{ fontWeight: 700 }}>{feeText}</span>
                                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                      </svg>
                                                    </button>
                                                    {copiedRuleId === rule.id && (
                                                      <span className="copy-success-pill">
                                                        คัดลอกแล้ว!
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>—</span>
                                                )
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}

                                  {/* Add item row in edit mode */}
                                  {isEditMode && (
                                    <tr className="fee-table-add-row">
                                      <td colSpan={3} style={{ padding: "6px 12px 14px 12px", borderBottom: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                                        <button
                                          type="button"
                                          onClick={() => handleAddFeeRule(catKey)}
                                          className="map-upload-trigger-btn"
                                          style={{ width: "100%", padding: "6px 12px", fontSize: "0.72rem", justifyContent: "center" }}
                                        >
                                          + เพิ่มรายการใน {catName}
                                        </button>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : activeCategory.id === "blacklist" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
                  {filteredRules.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                      ไม่มีข้อมูลบัญชีดำที่สอดคล้องกับคำค้นหา
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {filteredRules.map((rule, idx) => {
                        const parts = rule.content.split("\n");
                        const description = parts[0] || "";
                        const fine = parts[1] || "";
                        const consequence = parts[2] || "";

                        return (
                          <div key={rule.id} className="blacklist-card">
                            {isEditMode ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                                  <span className="rules-card-badge" style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
                                    แบล็คลิสต์ข้อที่ {idx + 1}
                                  </span>
                                  
                                  <div className="rule-edit-actions">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveRule(activeCategory.id, rule.id, "up")}
                                      disabled={idx === 0}
                                      className="rule-btn-icon"
                                      title="เลื่อนขึ้น"
                                      style={{ opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? "not-allowed" : "pointer" }}
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveRule(activeCategory.id, rule.id, "down")}
                                      disabled={idx === activeCategory.rules.length - 1}
                                      className="rule-btn-icon"
                                      title="เลื่อนลง"
                                      style={{ opacity: idx === activeCategory.rules.length - 1 ? 0.3 : 1, cursor: idx === activeCategory.rules.length - 1 ? "not-allowed" : "pointer" }}
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRule(activeCategory.id, rule.id)}
                                      className="rule-btn-icon danger"
                                      title="ลบออก"
                                    >
                                      <TrashIcon size={12} />
                                    </button>
                                  </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>1. รายละเอียด / เนื้อหาแบล็คลิสต์</label>
                                    <textarea
                                      value={description}
                                      onChange={(e) => handleBlacklistFieldChange(activeCategory.id, rule.id, 0, e.target.value)}
                                      className="rules-textarea"
                                      placeholder="ระบุพฤติกรรมความผิด หรือลักษณะแบล็คลิสต์..."
                                      style={{ minHeight: "60px" }}
                                    />
                                  </div>
                                  
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>2. จำนวนเงินที่ต้องจ่ายชำระค่าปรับ (IC)</label>
                                      <input
                                        type="text"
                                        value={fine}
                                        onChange={(e) => handleBlacklistFieldChange(activeCategory.id, rule.id, 1, e.target.value)}
                                        className="search-input"
                                        placeholder="ตัวอย่าง: 100,000 IC"
                                        style={{ padding: "8px 12px", fontSize: "0.82rem", width: "100%" }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                      <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>3. สิ่งที่จะเกิดขึ้น หากไม่ชำระค่าปรับ</label>
                                      <input
                                        type="text"
                                        value={consequence}
                                        onChange={(e) => handleBlacklistFieldChange(activeCategory.id, rule.id, 2, e.target.value)}
                                        className="search-input"
                                        placeholder="ตัวอย่าง: ติดแบล็คลิสต์ 7 วัน / แจ้งความ"
                                        style={{ padding: "8px 12px", fontSize: "0.82rem", width: "100%" }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div className="blacklist-card-title">
                                  <span style={{ color: "#ef4444" }}>🚫</span>
                                  {getHighlightedText(description, modalSearchQuery)}
                                </div>
                                <div className="blacklist-card-meta">
                                  <div className="blacklist-meta-row">
                                    <span className="blacklist-meta-label">จำนวนเงินที่ Blacklist :</span>
                                    <span className="blacklist-meta-value font-mono" style={{ color: "#ef4444" }}>{fine || "—"}</span>
                                  </div>
                                  <div className="blacklist-meta-row">
                                    <span className="blacklist-meta-label">หากไม่ชำระค่าปรับ :</span>
                                    <span className="blacklist-meta-value" style={{ color: "#fca5a5" }}>{consequence || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                filteredRules.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    ไม่มีข้อมูลกฏระเบียบที่สอดคล้องกับคำค้นหา
                  </div>
                ) : (
                  filteredRules.map((rule, idx) => (
                    <div key={rule.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {isEditMode ? (
                        <div className="rule-edit-card">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <span className="rules-card-badge" style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
                              ข้อที่ {idx + 1}
                            </span>
                            
                            <div className="rule-edit-actions">
                              <button
                                type="button"
                                onClick={() => handleMoveRule(activeCategory.id, rule.id, "up")}
                                disabled={idx === 0}
                                className="rule-btn-icon"
                                title="เลื่อนขึ้น"
                                style={{ opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? "not-allowed" : "pointer" }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveRule(activeCategory.id, rule.id, "down")}
                                disabled={idx === activeCategory.rules.length - 1}
                                className="rule-btn-icon"
                                title="เลื่อนลง"
                                style={{ opacity: idx === activeCategory.rules.length - 1 ? 0.3 : 1, cursor: idx === activeCategory.rules.length - 1 ? "not-allowed" : "pointer" }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(activeCategory.id, rule.id)}
                                className="rule-btn-icon danger"
                                title="ลบออก"
                              >
                                <TrashIcon size={12} />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={rule.content}
                            onChange={(e) => handleRuleContentChange(activeCategory.id, rule.id, e.target.value)}
                            className="rules-textarea"
                            placeholder="ระบุกฏระเบียบข้อบังคับ..."
                          />
                        </div>
                      ) : (
                        <div className="rules-modal-item">
                          <div className="rules-modal-item-num">{idx + 1}</div>
                          <div className="rules-modal-item-text">
                            {getHighlightedText(rule.content, modalSearchQuery)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )
              )}

              {isEditMode && activeCategory.id !== "medical_fees" && (
                <button
                  type="button"
                  onClick={() => handleAddRule(activeCategory.id)}
                  className="btn-add-rule"
                  style={{ marginTop: "6px" }}
                >
                  <PlusIcon size={14} />
                  เพิ่มข้อปฏิบัติใหม่
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <footer className="rules-modal-footer">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="btn btn-ghost"
                    style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                  >
                    ยกเลิกการแก้
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="btn btn-primary"
                    style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                  >
                    <SaveIcon size={14} />
                    บันทึกข้อมูล
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setActiveCategoryId(null);
                    setModalSearchQuery("");
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem", padding: "8px 20px" }}
                >
                  ปิดหน้าต่าง
                </button>
              )}
            </footer>

          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Fullscreen Map Viewer */}
      {lightboxUrl && mounted && createPortal(
        <div className="lightbox-backdrop" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="lightbox-close"
              title="ปิด"
            >
              <CrossIcon size={18} />
            </button>
            <img src={lightboxUrl} alt="Fullscreen Map" className="lightbox-image" />
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </>
  );
}
