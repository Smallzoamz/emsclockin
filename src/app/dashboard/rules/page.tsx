"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
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

const defaultZones = {
  "ในเมือง": "24,94 28,82 58,82 64,94 64,114 55,126 33,126 24,114",
  "นอกเมือง": "18,58 35,52 65,52 82,58 82,80 64,82 58,82 28,82 18,80",
  "เมืองบน": "30,5 50,2 70,10 78,30 82,52 65,52 35,52 18,52 22,30"
};

const defaultPins = {
  "ในเมือง": { x: 43, y: 102 },
  "นอกเมือง": { x: 57, y: 67 },
  "เมืองบน": { x: 50, y: 33 }
};

const colorMap: Record<string, { hex: string; name: string; rgb: string }> = {
  red: { hex: "#ef4444", name: "แดง", rgb: "239, 68, 68" },
  yellow: { hex: "#eab308", name: "เหลือง", rgb: "234, 179, 8" },
  green: { hex: "#10b981", name: "เขียว", rgb: "16, 185, 129" },
  blue: { hex: "#3b82f6", name: "น้ำเงิน", rgb: "59, 130, 246" },
  purple: { hex: "#a855f7", name: "ม่วง", rgb: "168, 85, 247" },
  pink: { hex: "#ec4899", name: "ชมพู", rgb: "236, 72, 153" },
  orange: { hex: "#f97316", name: "ส้ม", rgb: "249, 115, 22" },
  cyan: { hex: "#06b6d4", name: "ฟ้า", rgb: "6, 182, 212" }
};


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
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedDrawZone, setSelectedDrawZone] = useState<string>("ในเมือง");
  const [drawMode, setDrawMode] = useState<"polygon" | "pin">("polygon");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("blue");
  const [zoomScale, setZoomScale] = useState(1);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const [clickedCoord, setClickedCoord] = useState<{ x: number; y: number; label: string } | null>(null);
  
  const mapScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  const setMapScrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (mapScrollContainerRef.current && wheelHandlerRef.current) {
      try {
        mapScrollContainerRef.current.removeEventListener("wheel", wheelHandlerRef.current);
      } catch (err) {
        console.error("Error removing wheel listener", err);
      }
    }
    mapScrollContainerRef.current = node;
    if (node) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomStep = 0.25;
        const direction = e.deltaY < 0 ? 1 : -1;
        setZoomScale(prev => {
          const next = prev + direction * zoomStep;
          return Math.min(Math.max(next, 1), 8); // Max zoom 8x (800% zoom!)
        });
      };
      wheelHandlerRef.current = handleWheel;
      node.addEventListener("wheel", handleWheel, { passive: false });
    } else {
      wheelHandlerRef.current = null;
    }
  }, []);

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

  const getZoneKey = (desc: string): string | null => {
    if (!desc) return null;
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    const zones = medCat?.zones || defaultZones;
    const zoneNames = Object.keys(zones);
    for (const name of zoneNames) {
      if (desc.includes(name)) {
        return name;
      }
    }
    return null;
  };

  const getMapTransform = () => {
    if (isDrawingMode) {
      return {
        transform: `scale(${zoomScale})`,
        transformOrigin: "top left",
        width: "100%"
      };
    }
    // Read-only dynamic hover panning
    if (hoveredZone === "ในเมือง") {
      return {
        transform: "scale(1.9)",
        transformOrigin: "43% 102%"
      };
    }
    if (hoveredZone === "นอกเมือง") {
      return {
        transform: "scale(1.7)",
        transformOrigin: "50% 67%"
      };
    }
    if (hoveredZone === "เมืองบน") {
      return {
        transform: "scale(1.9)",
        transformOrigin: "50% 33%"
      };
    }
    // Hover custom zone dynamic panning
    if (hoveredZone) {
      const pin = getPinCoords(hoveredZone);
      return {
        transform: "scale(1.8)",
        transformOrigin: `${pin.x}% ${pin.y}%`
      };
    }
    return {
      transform: "scale(1)",
      transformOrigin: "center center"
    };
  };

  const getZonePoints = (zoneName: string): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zones?.[zoneName] !== undefined) {
      return medCat.zones[zoneName];
    }
    return (defaultZones as any)[zoneName] || "";
  };

  const getPinCoords = (zoneName: string): { x: number; y: number } => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.pins?.[zoneName] !== undefined) {
      return medCat.pins[zoneName];
    }
    return (defaultPins as any)[zoneName] || { x: 50, y: 50 };
  };

  const getZoneColor = (zoneName: string): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zone_colors?.[zoneName] !== undefined) {
      return medCat.zone_colors[zoneName];
    }
    if (zoneName === "ในเมือง") return "red";
    if (zoneName === "นอกเมือง") return "yellow";
    if (zoneName === "เมืองบน") return "green";
    return "blue";
  };

  const updateZonePoints = (zoneName: string, pointsStr: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      const zones = { ...(cat as any).zones || {}, [zoneName]: pointsStr };
      return { ...cat, zones };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const updatePinCoords = (zoneName: string, coords: { x: number; y: number }) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      const pins = { ...(cat as any).pins || {}, [zoneName]: coords };
      return { ...cat, pins };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  const isPointInPolygon = (x: number, y: number, polygonPointsStr: string): boolean => {
    if (!polygonPointsStr) return false;
    const points = polygonPointsStr.split(" ").filter(Boolean).map(pt => {
      const [px, py] = pt.split(",").map(Number);
      return { x: px, y: py };
    });
    if (points.length < 3) return false;

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isEditMode) return;
    
    // If we clicked directly on a vertex, don't add a new point
    if ((e.target as HTMLElement).tagName === "circle" && (e.target as HTMLElement).classList.contains("editor-vertex-point")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x = Math.round((clickX / rect.width) * 100 * 10) / 10;
    const y = Math.round((clickY / rect.height) * 133.3 * 10) / 10;

    if (drawMode === "polygon") {
      const currentPointsStr = getZonePoints(selectedDrawZone);
      const points = currentPointsStr ? currentPointsStr.split(" ").filter(Boolean) : [];
      points.push(`${x},${y}`);
      updateZonePoints(selectedDrawZone, points.join(" "));
      setSelectedVertexIndex(points.length - 1);
    } else if (drawMode === "pin") {
      updatePinCoords(selectedDrawZone, { x, y });
    }
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || draggedVertexIndex === null || !isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x = Math.min(Math.max(Math.round((clickX / rect.width) * 100 * 10) / 10, 0), 100);
    const y = Math.min(Math.max(Math.round((clickY / rect.height) * 133.3 * 10) / 10, 0), 133.3);

    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr) return;
    const points = currentPointsStr.split(" ").filter(Boolean);
    
    if (draggedVertexIndex >= 0 && draggedVertexIndex < points.length) {
      points[draggedVertexIndex] = `${x},${y}`;
      updateZonePoints(selectedDrawZone, points.join(" "));
    }
  };

  const handleDeleteVertex = (idx: number) => {
    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr) return;
    const points = currentPointsStr.split(" ").filter(Boolean);
    if (idx >= 0 && idx < points.length) {
      points.splice(idx, 1);
      updateZonePoints(selectedDrawZone, points.join(" "));
      setSelectedVertexIndex(null);
      setDraggedVertexIndex(null);
    }
  };

  const handleUndoPoint = () => {
    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr) return;
    const points = currentPointsStr.split(" ").filter(Boolean);
    if (points.length === 0) return;
    points.pop();
    updateZonePoints(selectedDrawZone, points.join(" "));
  };

  const handleClearPoints = async () => {
    const confirmed = await confirm({
      title: "ล้างจุดทั้งหมด",
      message: `คุณต้องการล้างจุดพิกัดทั้งหมดของโซน "${selectedDrawZone}" ใช่หรือไม่?`,
      variant: "danger"
    });
    if (confirmed) {
      updateZonePoints(selectedDrawZone, "");
    }
  };

  const handleResetToDefault = async () => {
    const confirmed = await confirm({
      title: "ใช้ค่าเริ่มต้น",
      message: `คุณต้องการคืนค่าเส้นขอบและจุดปักหมุดของโซน "${selectedDrawZone}" กลับเป็นค่าเริ่มต้นของระบบใช่หรือไม่?`,
      variant: "warning"
    });
    if (confirmed) {
      updateZonePoints(selectedDrawZone, (defaultZones as any)[selectedDrawZone] || "");
      updatePinCoords(selectedDrawZone, (defaultPins as any)[selectedDrawZone] || { x: 50, y: 50 });
    }
  };

  const handleAddZone = () => {
    if (!newZoneName.trim() || !editedRules) return;
    const name = newZoneName.trim();
    
    // Check if zone already exists
    const medCat = editedRules.categories.find(c => c.id === "medical_fees") as any;
    const zones = medCat?.zones || defaultZones;
    if (zones[name] !== undefined) {
      showToast("พื้นที่นี้มีอยู่แล้วค่ะ", "error");
      return;
    }

    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      const updatedZones = { ...((cat as any).zones || defaultZones), [name]: "" };
      const updatedPins = { ...((cat as any).pins || defaultPins), [name]: { x: 50, y: 50 } };
      const zone_colors = { ...((cat as any).zone_colors || {}), [name]: newZoneColor };
      return { ...cat, zones: updatedZones, pins: updatedPins, zone_colors };
    });

    setEditedRules({ ...editedRules, categories: updatedCategories });
    setSelectedDrawZone(name);
    setNewZoneName("");
    showToast(`เพิ่มพื้นที่ "${name}" สำเร็จแล้วค่ะ`, "success");
  };

  const handleDeleteZone = async (zoneName: string) => {
    const confirmed = await confirm({
      title: "ยืนยันการลบพื้นที่",
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบพื้นที่ "${zoneName}" และพิกัดทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบพื้นที่",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed || !editedRules) return;

    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      
      const zones = { ...((cat as any).zones || defaultZones) };
      const pins = { ...((cat as any).pins || defaultPins) };
      const zone_colors = { ...((cat as any).zone_colors || {}) };
      
      delete zones[zoneName];
      delete pins[zoneName];
      delete zone_colors[zoneName];

      let fallback_zone = (cat as any).fallback_zone || "";
      if (fallback_zone === zoneName) {
        fallback_zone = "";
      }

      return { ...cat, zones, pins, zone_colors, fallback_zone };
    });

    setEditedRules({ ...editedRules, categories: updatedCategories });
    
    // Reset selection to another remaining zone
    const medCat = updatedCategories.find(c => c.id === "medical_fees") as any;
    const remainingZones = Object.keys(medCat.zones);
    setSelectedDrawZone(remainingZones[0] || "");
    showToast(`ลบพื้นที่ "${zoneName}" เรียบร้อยแล้วค่ะ`, "success");
  };

  const getFallbackZone = (): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    return medCat?.fallback_zone || "";
  };

  const handleUpdateFallbackZone = (val: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      return { ...cat, fallback_zone: val };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
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

  // Global mouseup listener to release vertex dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDraggedVertexIndex(null);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Keyboard listener to delete selected vertex node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingMode || selectedVertexIndex === null || isEditMode === false) return;
      
      // Skip if user is currently typing in an input or textarea
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteVertex(selectedVertexIndex);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingMode, selectedVertexIndex, selectedDrawZone, editedRules, isEditMode]);

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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          🗺️
                          <span>แผนที่แบ่งพื้นที่การรักษา</span>
                        </div>
                        {isDrawingMode && (
                          <div style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "12px" }}>
                            <button 
                              type="button" 
                              onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
                              className="btn" 
                              style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                              title="ซูมเข้า"
                            >
                              ➕ ซูมเข้า
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 1))}
                              className="btn" 
                              style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                              title="ซูมออก"
                            >
                              ➖ ซูมออก
                            </button>
                            {zoomScale > 1 && (
                              <button 
                                type="button" 
                                onClick={() => setZoomScale(1)}
                                className="btn" 
                                style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                              >
                                รีเซ็ต ({zoomScale * 100}%)
                              </button>
                            )}
                          </div>
                        )}
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
                      <div className="map-container" style={{ position: "relative", overflow: "auto", maxHeight: "400px", width: "100%" }}>
                        <div 
                          className="map-zoom-wrapper"
                          style={getMapTransform()}
                        >
                          <div 
                            style={{ position: "relative", display: "inline-block", maxWidth: "100%", cursor: isDrawingMode ? "crosshair" : "zoom-in" }}
                            onClick={(e) => {
                              if (isDrawingMode) {
                                handleMapClick(e);
                              } else {
                                if (isEditMode) return;
                                
                                // Read-only click identification logic
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const clickY = e.clientY - rect.top;
                                const x = Math.round((clickX / rect.width) * 100 * 10) / 10;
                                const y = Math.round((clickY / rect.height) * 133.3 * 10) / 10;

                                // Find which zone is clicked
                                const medCat = rules?.categories.find(c => c.id === "medical_fees") as any;
                                const zones = medCat?.zones || defaultZones;
                                let matchedZone: string | null = null;
                                
                                for (const zoneName of Object.keys(zones)) {
                                  const pointsStr = zones[zoneName];
                                  if (isPointInPolygon(x, y, pointsStr)) {
                                    matchedZone = zoneName;
                                    break;
                                  }
                                }

                                if (!matchedZone) {
                                  matchedZone = medCat?.fallback_zone || null;
                                }

                                if (matchedZone) {
                                  setHoveredZone(matchedZone);
                                  setClickedCoord({ x, y, label: matchedZone });
                                  // Clear click pin after 5 seconds
                                  setTimeout(() => setClickedCoord(null), 5000);
                                } else {
                                  setClickedCoord({ x, y, label: "นอกพื้นที่เขตบริการ" });
                                  setTimeout(() => setClickedCoord(null), 3000);
                                }
                              }
                            }}
                            onMouseMove={handleMapMouseMove}
                          >
                            <img
                              src={(activeCategory as any).mapUrl}
                              alt="Treatment Area Map"
                              className={`map-image ${hoveredZone ? "dimmed" : ""}`}
                              style={{ maxHeight: "320px", display: "block" }}
                            />
                            
                            {/* SVG Interactive Overlay */}
                            {(!isEditMode || isDrawingMode) && (() => {
                              const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                              const zones = medCat?.zones || defaultZones;
                              const zoneNames = Object.keys(zones);
                              return (
                                <svg
                                  viewBox="0 0 100 133.3"
                                  preserveAspectRatio="none"
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
                                  {/* Dynamic Zones Polygons */}
                                  {zoneNames.map(zoneName => {
                                    const pointsStr = getZonePoints(zoneName);
                                    if (!pointsStr) return null;
                                    const colorKey = getZoneColor(zoneName);
                                    const colorObj = colorMap[colorKey] || colorMap.blue;
                                    
                                    const isSelected = selectedDrawZone === zoneName;
                                    const isActive = hoveredZone === zoneName || (isDrawingMode && isSelected);
                                    
                                    return (
                                      <polygon
                                        key={`poly-${zoneName}`}
                                        points={pointsStr}
                                        className={`map-zone-path ${isActive ? "active" : ""}`}
                                        style={{
                                          fill: isActive ? `rgba(${colorObj.rgb}, 0.25)` : `rgba(${colorObj.rgb}, 0.05)`,
                                          stroke: isActive ? colorObj.hex : `rgba(${colorObj.rgb}, 0.35)`,
                                          strokeWidth: isActive ? 2.2 : 0.8,
                                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                          cursor: "pointer"
                                        } as React.CSSProperties}
                                        pointerEvents="auto"
                                        onMouseEnter={() => !isDrawingMode && setHoveredZone(zoneName)}
                                        onMouseLeave={() => !isDrawingMode && setHoveredZone(null)}
                                      />
                                    );
                                  })}

                                  {/* Dynamic Pins */}
                                  {zoneNames.map(zoneName => {
                                    const pin = getPinCoords(zoneName);
                                    const colorKey = getZoneColor(zoneName);
                                    const colorObj = colorMap[colorKey] || colorMap.blue;
                                    return (
                                      <g
                                        key={`pin-${zoneName}`}
                                        className={`map-pin-group ${hoveredZone === zoneName ? "active" : ""}`}
                                        style={{
                                          opacity: (!hoveredZone || hoveredZone === zoneName) ? 1 : 0.25,
                                          pointerEvents: (!hoveredZone || hoveredZone === zoneName) ? "auto" : "none",
                                          transition: "opacity 0.3s ease"
                                        }}
                                        onMouseEnter={() => !isDrawingMode && setHoveredZone(zoneName)}
                                        onMouseLeave={() => !isDrawingMode && setHoveredZone(null)}
                                      >
                                        <circle cx={pin.x} cy={pin.y} r="2.0" fill="none" stroke={colorObj.hex} strokeWidth="0.6" className="map-pin-pulse" />
                                        <circle cx={pin.x} cy={pin.y} r="1.0" fill={colorObj.hex} stroke="#fff" strokeWidth="0.3" className="map-pin-circle" />
                                        <rect x={pin.x - (zoneName.length * 2.2 + 2.5)} y={pin.y + 3} width={zoneName.length * 4.4 + 5} height="5.0" rx="2.5" fill={colorObj.hex} stroke="#fff" strokeWidth="0.4" opacity="0.95" />
                                        <text x={pin.x} y={pin.y + 5.5} className="map-pin-label" dominantBaseline="middle" style={{ fontSize: "3.2px", fill: "#fff", textAnchor: "middle", fontWeight: "bold" }}>{zoneName}</text>
                                      </g>
                                    );
                                  })}

                                  {/* Click Target Pin Indicator */}
                                  {clickedCoord && (
                                    <g>
                                      <circle
                                        cx={clickedCoord.x}
                                        cy={clickedCoord.y}
                                        r="4.0"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="1.0"
                                        style={{
                                          animation: "mapPinPulseKeyframe 1.5s infinite ease-out",
                                          transformOrigin: `${clickedCoord.x}px ${clickedCoord.y}px`
                                        }}
                                      />
                                      <circle
                                        cx={clickedCoord.x}
                                        cy={clickedCoord.y}
                                        r="1.2"
                                        fill="#3b82f6"
                                        stroke="#ffffff"
                                        strokeWidth="0.3"
                                      />
                                      <g style={{ pointerEvents: "none" }}>
                                        <rect
                                          x={clickedCoord.x - (clickedCoord.label.length * 2.1 + 2.5)}
                                          y={clickedCoord.y - 8}
                                          width={clickedCoord.label.length * 4.2 + 5}
                                          height="5.5"
                                          rx="1.5"
                                          fill="rgba(15, 23, 42, 0.95)"
                                          stroke="#3b82f6"
                                          strokeWidth="0.4"
                                        />
                                        <text
                                          x={clickedCoord.x}
                                          y={clickedCoord.y - 5.25}
                                          fill="#ffffff"
                                          fontSize="3.0px"
                                          fontWeight="bold"
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          {clickedCoord.label}
                                        </text>
                                      </g>
                                    </g>
                                  )}

                                  {/* Draw Helper Vertices when Drawing Mode is active */}
                                  {isDrawingMode && (() => {
                                    const pointsStr = getZonePoints(selectedDrawZone);
                                    if (!pointsStr) return null;
                                    const points = pointsStr.split(" ").filter(Boolean).map((pt: string) => {
                                      const [x, y] = pt.split(",").map(Number);
                                      return { x, y };
                                    });
                                    const colorKey = getZoneColor(selectedDrawZone);
                                    const colorHex = colorMap[colorKey]?.hex || "#3b82f6";

                                    return (
                                      <g>
                                        {/* Connecting Dashed Lines */}
                                        {points.map((pt, idx) => {
                                          if (idx === 0) return null;
                                          const prev = points[idx - 1];
                                          return (
                                            <line
                                              key={`line-${idx}`}
                                              x1={prev.x}
                                              y1={prev.y}
                                              x2={pt.x}
                                              y2={pt.y}
                                              stroke={colorHex}
                                              strokeWidth="1.2"
                                              className="editor-edge-line"
                                            />
                                          );
                                        })}
                                        {points.length > 2 && (
                                          <line
                                            x1={points[points.length - 1].x}
                                            y1={points[points.length - 1].y}
                                            x2={points[0].x}
                                            y2={points[0].y}
                                            stroke={colorHex}
                                            strokeWidth="1.2"
                                            className="editor-edge-line"
                                          />
                                        )}

                                        {/* Interactive Vertices */}
                                        {points.map((pt, idx) => (
                                          <circle
                                            key={`vertex-${idx}`}
                                            cx={pt.x}
                                            cy={pt.y}
                                            r={selectedVertexIndex === idx ? "3.2" : "2"}
                                            className="editor-vertex-point"
                                            style={{
                                              fill: selectedVertexIndex === idx ? "#3b82f6" : "#ffffff",
                                              stroke: selectedVertexIndex === idx ? "#ffffff" : colorHex,
                                              strokeWidth: selectedVertexIndex === idx ? 1.5 : 1.2,
                                              cursor: "move",
                                              pointerEvents: "auto"
                                            }}
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              setSelectedVertexIndex(idx);
                                              setDraggedVertexIndex(idx);
                                            }}
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteVertex(idx);
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                            }}
                                          >
                                            <title>{`จุดที่ ${idx + 1} (${pt.x}, ${pt.y}) - ลากเพื่อย้าย, ดับเบิ้ลคลิกเพื่อลบ`}</title>
                                          </circle>
                                        ))}
                                      </g>
                                    );
                                  })()}
                                </svg>
                              );
                            })()}
                          </div>
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

                    {/* Zone Editor Controls (Only visible to admin in edit mode) */}
                    {isEditMode && (
                      <div className="zone-editor-panel">
                        <div className="zone-editor-title">
                          🛠️ เครื่องมือจัดการพิกัดบริการ
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDrawingMode(true);
                              setDrawMode("polygon");
                              setZoomScale(1);
                              setSelectedVertexIndex(null);
                            }}
                            className="btn btn-primary"
                            style={{ 
                              width: "100%", 
                              padding: "8px 12px", 
                              fontSize: "0.78rem", 
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px"
                            }}
                          >
                            ✏️ เปิดเครื่องมือวาดโซนและปักหมุด (เต็มจอ)
                          </button>
                          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                            ระบบจะเปิดหน้าจอควบคุมการลากวาดแผนที่แบบเต็มหน้าต่างเพื่อให้จัดวางพิกัดได้ง่ายและละเอียดสูงสุด
                          </p>
                        </div>
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
                                      const zoneColorKey = zoneKey ? getZoneColor(zoneKey) : null;
                                       const highlightBorderColor = zoneColorKey ? (colorMap[zoneColorKey]?.hex || "transparent") : "transparent";

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

      {/* Fullscreen Drawing Portal */}
      {isDrawingMode && mounted && createPortal(
        <div 
          className="drawing-fullscreen-backdrop" 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(8, 10, 19, 0.96)",
            backdropFilter: "blur(18px)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui), system-ui, -apple-system, sans-serif",
            padding: "16px 24px",
            boxSizing: "border-box"
          }}
        >
          {/* Fullscreen Header */}
          <div 
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "12px",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.2rem" }}>✏️</span>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--accent)" }}>
                  เครื่องมือจัดการพิกัดโซนบริการและปักหมุดแผนที่ (โหมดเต็มจอ)
                </h2>
                <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  แก้ไขพิกัดเส้นขอบ (Polygon) และพิกัดหมุดระบุตำแหน่ง (Pin) ได้อย่างอิสระและแม่นยำ
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Zoom Controls inside Fullscreen Header */}
              <div style={{ display: "flex", gap: "4px", alignItems: "center", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", padding: "4px 8px", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginRight: "4px" }}>ขนาดแผนที่:</span>
                <button 
                  type="button" 
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 4))}
                  className="btn" 
                  style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                  title="ซูมเข้า"
                >
                  ➕ ซูมเข้า
                </button>
                <button 
                  type="button" 
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 1))}
                  className="btn" 
                  style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                  title="ซูมออก"
                >
                  ➖ ซูมออก
                </button>
                {zoomScale > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setZoomScale(1)}
                    className="btn" 
                    style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                  >
                    รีเซ็ต ({zoomScale * 100}%)
                  </button>
                )}
              </div>

              {/* Save and Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsDrawingMode(false);
                  setSelectedVertexIndex(null);
                  setDraggedVertexIndex(null);
                  showToast("บันทึกการแก้ไขพิกัดโซนและปักหมุดสำเร็จ", "success");
                }}
                className="btn btn-primary"
                style={{
                  padding: "8px 16px",
                  fontSize: "0.78rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 0 15px rgba(var(--accent-rgb), 0.3)"
                }}
              >
                💾 บันทึกและปิดเต็มจอ
              </button>
            </div>
          </div>

          {/* Fullscreen Body Workspace */}
          <div 
            style={{
              display: "flex",
              flex: 1,
              gap: "20px",
              height: "calc(100% - 70px)",
              overflow: "hidden"
            }}
          >
            {/* Left Workspace Panel: Zoomable Map Viewport (Takes up 72%) */}
            <div 
              ref={setMapScrollContainerRef}
              style={{
                flex: "1 1 72%",
                background: "rgba(6, 10, 19, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                position: "relative",
                overflow: "auto",
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-start",
                padding: "16px",
                maxHeight: "100%",
                boxSizing: "border-box"
              }}
            >
              <div 
                className="map-zoom-wrapper"
                style={{
                  transform: "scale(" + zoomScale + ")",
                  transformOrigin: "top left",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  position: "relative",
                  display: "inline-block"
                }}
              >
                <div 
                  style={{ position: "relative", display: "inline-block", cursor: "crosshair" }}
                  onClick={handleMapClick}
                  onMouseMove={handleMapMouseMove}
                >
                  <img
                    src={(activeCategory as any).mapUrl}
                    alt="Treatment Area Map"
                    className="map-image"
                    style={{ 
                      maxHeight: "80vh", 
                      width: "auto", 
                      display: "block",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}
                  />
                  
                  {/* SVG Interactive Drawing Overlay */}
                  {(() => {
                    const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                    const zones = medCat?.zones || defaultZones;
                    const zoneNames = Object.keys(zones);
                    return (
                      <svg
                        viewBox="0 0 100 133.3"
                        preserveAspectRatio="none"
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
                        {/* Dynamic Zones Polygons */}
                        {zoneNames.map(zoneName => {
                          const pointsStr = getZonePoints(zoneName);
                          if (!pointsStr) return null;
                          const colorKey = getZoneColor(zoneName);
                          const colorObj = colorMap[colorKey] || colorMap.blue;
                          
                          const isSelected = selectedDrawZone === zoneName;
                          const isActive = hoveredZone === zoneName || isSelected;
                          
                          return (
                            <polygon
                              key={"poly-" + zoneName}
                              points={pointsStr}
                              className={"map-zone-path " + (isActive ? "active" : "")}
                              style={{
                                fill: isActive ? "rgba(" + colorObj.rgb + ", 0.28)" : "rgba(" + colorObj.rgb + ", 0.06)",
                                stroke: isActive ? colorObj.hex : "rgba(" + colorObj.rgb + ", 0.4)",
                                strokeWidth: (isActive ? 2.5 : 1) / zoomScale,
                                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                cursor: "pointer"
                              } as React.CSSProperties}
                              pointerEvents="auto"
                              onMouseEnter={() => setHoveredZone(zoneName)}
                              onMouseLeave={() => setHoveredZone(null)}
                            />
                          );
                        })}

                        {/* Dynamic Pins */}
                        {zoneNames.map(zoneName => {
                          const pin = getPinCoords(zoneName);
                          const colorKey = getZoneColor(zoneName);
                          const colorObj = colorMap[colorKey] || colorMap.blue;
                          return (
                            <g
                              key={"pin-" + zoneName}
                              className={"map-pin-group " + (hoveredZone === zoneName ? "active" : "")}
                              style={{
                                opacity: (!hoveredZone || hoveredZone === zoneName) ? 1 : 0.3,
                                pointerEvents: (!hoveredZone || hoveredZone === zoneName) ? "auto" : "none",
                                transition: "opacity 0.3s ease"
                              }}
                              onMouseEnter={() => setHoveredZone(zoneName)}
                              onMouseLeave={() => setHoveredZone(null)}
                            >
                              <circle cx={pin.x} cy={pin.y} r={2.0 / zoomScale} fill="none" stroke={colorObj.hex} strokeWidth={0.6 / zoomScale} className="map-pin-pulse" />
                              <circle cx={pin.x} cy={pin.y} r={1.0 / zoomScale} fill={colorObj.hex} stroke="#fff" strokeWidth={0.3 / zoomScale} className="map-pin-circle" />
                              <rect x={pin.x - (zoneName.length * 2.2 + 2.5) / zoomScale} y={pin.y + 3 / zoomScale} width={(zoneName.length * 4.4 + 5) / zoomScale} height={5.0 / zoomScale} rx={2.5 / zoomScale} fill={colorObj.hex} stroke="#fff" strokeWidth={0.4 / zoomScale} opacity="0.95" />
                              <text x={pin.x} y={pin.y + 5.5 / zoomScale} className="map-pin-label" dominantBaseline="middle" style={{ fontSize: (3.2 / zoomScale) + "px", fill: "#fff", textAnchor: "middle", fontWeight: "bold" }}>{zoneName}</text>
                            </g>
                          );
                        })}

                        {/* Draw Helper Vertices when Drawing Mode is active */}
                        {(() => {
                          const pointsStr = getZonePoints(selectedDrawZone);
                          if (!pointsStr) return null;
                          const points = pointsStr.split(" ").filter(Boolean).map((pt) => {
                            const parts = pt.split(",");
                            return { x: Number(parts[0]), y: Number(parts[1]) };
                          });
                          const colorKey = getZoneColor(selectedDrawZone);
                          const colorHex = colorMap[colorKey]?.hex || "#3b82f6";

                          return (
                            <g>
                              {/* Connecting Dashed Lines */}
                              {points.map((pt, idx) => {
                                if (idx === 0) return null;
                                const prev = points[idx - 1];
                                return (
                                  <line
                                    key={"line-" + idx}
                                    x1={prev.x}
                                    y1={prev.y}
                                    x2={pt.x}
                                    y2={pt.y}
                                    stroke={colorHex}
                                    strokeWidth={0.8 / zoomScale}
                                    className="editor-edge-line"
                                  />
                                );
                              })}
                              {points.length > 2 && (
                                <line
                                  x1={points[points.length - 1].x}
                                  y1={points[points.length - 1].y}
                                  x2={points[0].x}
                                  y2={points[0].y}
                                  stroke={colorHex}
                                  strokeWidth={0.8 / zoomScale}
                                  className="editor-edge-line"
                                />
                              )}

                              {/* Interactive Vertices */}
                              {points.map((pt, idx) => (
                                <circle
                                  key={"vertex-" + idx}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={(selectedVertexIndex === idx ? 1.6 : 1.0) / zoomScale}
                                  className="editor-vertex-point"
                                  style={{
                                    fill: selectedVertexIndex === idx ? "#3b82f6" : "#ffffff",
                                    stroke: selectedVertexIndex === idx ? "#ffffff" : colorHex,
                                    strokeWidth: (selectedVertexIndex === idx ? 1.0 : 0.6) / zoomScale,
                                    cursor: "move",
                                    pointerEvents: "auto"
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setSelectedVertexIndex(idx);
                                    setDraggedVertexIndex(idx);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVertex(idx);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <title>{"จุดที่ " + (idx + 1) + " (" + pt.x + ", " + pt.y + ") - ลากเพื่อย้าย, ดับเบิ้ลคลิกเพื่อลบ"}</title>
                                </circle>
                              ))}
                            </g>
                          );
                        })()}
                      </svg>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Settings Panel (Takes up 28%) */}
            <div 
              style={{
                flex: "1 1 28%",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflowY: "auto",
                height: "100%",
                boxSizing: "border-box"
              }}
            >
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px", textAlign: "left" }}>
                <h3 style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  🛠️ เมนูเครื่องมือแก้ไข
                </h3>
              </div>

              {(() => {
                const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                const zones = medCat?.zones || defaultZones;
                const zoneNames = Object.keys(zones);
                return (
                  <>
                    {/* Selected Zone Selector */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>เลือกโซนที่ต้องการแก้ไข:</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {zoneNames.map(zone => {
                          const isDefault = zone === "ในเมือง" || zone === "นอกเมือง" || zone === "เมืองบน";
                          const colorKey = getZoneColor(zone);
                          const colorObj = colorMap[colorKey] || colorMap.blue;
                          return (
                            <div 
                              key={zone} 
                              style={{ display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDrawZone(zone);
                                  setSelectedVertexIndex(null);
                                }}
                                className={"editor-btn editor-btn-outline " + (selectedDrawZone === zone ? "active" : "")}
                                style={{ 
                                  flex: 1, 
                                  justifyContent: "flex-start", 
                                  gap: "8px",
                                  borderLeft: "3px solid " + colorObj.hex
                                }}
                              >
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorObj.hex }} />
                                {zone}
                              </button>
                              {!isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteZone(zone)}
                                  className="btn btn-danger"
                                  style={{ padding: "6px 10px", fontSize: "0.72rem" }}
                                  title={"ลบพื้นที่ " + zone}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Area Form */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>➕ เพิ่มพื้นที่ใหม่:</label>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <input
                          type="text"
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          placeholder="ชื่อพื้นที่ เช่น ด่านตรวจ"
                          className="search-input"
                          style={{ flex: "1 1 140px", minWidth: "140px", padding: "6px 8px", fontSize: "0.72rem", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                        />
                        <div 
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            background: colorMap[newZoneColor]?.hex || "#3b82f6",
                            border: "1px solid rgba(255,255,255,0.15)",
                            boxShadow: "0 0 6px " + (colorMap[newZoneColor]?.hex || "#3b82f6"),
                            flexShrink: 0
                          }} 
                        />
                        <select
                          value={newZoneColor}
                          onChange={(e) => setNewZoneColor(e.target.value)}
                          className="search-input"
                          style={{ padding: "4px 6px", fontSize: "0.72rem", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
                        >
                          {Object.keys(colorMap).map(c => (
                            <option key={c} value={c} style={{ background: "#0f172a", color: "#fff" }}>
                              {"สี" + colorMap[c].name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddZone}
                          className="btn btn-primary"
                          style={{ padding: "4px 12px", fontSize: "0.72rem" }}
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>

                    {/* Fallback Zone Selector */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>🌐 พื้นที่เริ่มต้นหากอยู่นอกเหนือเขตที่วาด (Fallback):</label>
                      <select
                        value={getFallbackZone()}
                        onChange={(e) => handleUpdateFallbackZone(e.target.value)}
                        className="search-input"
                        style={{ padding: "6px 10px", fontSize: "0.75rem", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", width: "100%" }}
                      >
                        <option value="">ไม่มี (ถือว่านอกขอบเขตบริการ)</option>
                        {zoneNames.map(name => (
                          <option key={name} value={name} style={{ background: "#0f172a", color: "#fff" }}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode Selector */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>เลือกโหมดการปรับแต่งพิกัด:</label>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawMode("polygon");
                            setSelectedVertexIndex(null);
                          }}
                          className={"editor-btn editor-btn-outline " + (drawMode === "polygon" ? "active" : "")}
                          style={{ flex: 1, justifyContent: "center", fontSize: "0.68rem" }}
                        >
                          🔴 ลากเส้นขอบ (Polygon)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawMode("pin");
                            setSelectedVertexIndex(null);
                          }}
                          className={"editor-btn editor-btn-outline " + (drawMode === "pin" ? "active" : "")}
                          style={{ flex: 1, justifyContent: "center", fontSize: "0.68rem" }}
                        >
                          📍 ปักหมุด/ป้าย (Pin)
                        </button>
                      </div>
                    </div>

                    {/* Selected Vertex Card */}
                    {drawMode === "polygon" && selectedVertexIndex !== null && (() => {
                      const pointsStr = getZonePoints(selectedDrawZone);
                      const points = pointsStr ? pointsStr.split(" ").filter(Boolean) : [];
                      const ptStr = points[selectedVertexIndex];
                      if (!ptStr) return null;
                      const parts = ptStr.split(",");
                      return (
                        <div 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between", 
                            background: "rgba(59, 130, 246, 0.15)", 
                            border: "1px solid rgba(59, 130, 246, 0.35)", 
                            borderRadius: "var(--radius-sm)", 
                            padding: "8px 12px", 
                            fontSize: "0.72rem",
                            color: "var(--text-primary)"
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            📍 <strong>จุดที่ " + (selectedVertexIndex + 1) + ":</strong> (" + parts[0] + ", " + parts[1] + ")
                          </span>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteVertex(selectedVertexIndex)}
                              className="btn btn-danger"
                              style={{ padding: "4px 8px", fontSize: "0.68rem" }}
                            >
                              ลบจุดนี้
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedVertexIndex(null)}
                              className="btn"
                              style={{ padding: "4px 8px", fontSize: "0.68rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {drawMode === "polygon" && (
                        <button
                          type="button"
                          onClick={handleUndoPoint}
                          className="editor-btn editor-btn-outline"
                          style={{ flex: "1 0 calc(50% - 4px)", justifyContent: "center" }}
                          title="ลบจุดล่าสุดที่คลิก"
                        >
                          ↩️ ย้อนกลับ 1 จุด
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearPoints}
                        className="editor-btn editor-btn-outline"
                        style={{ flex: "1 0 calc(50% - 4px)", justifyContent: "center", color: "#fca5a5" }}
                      >
                        🗑️ ล้างจุดทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="editor-btn editor-btn-outline"
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        ⚙️ ใช้ค่าเริ่มต้น
                      </button>
                    </div>
                    
                    <div 
                      style={{ 
                        fontSize: "0.68rem", 
                        color: "var(--text-muted)", 
                        lineHeight: 1.4, 
                        background: "rgba(255,255,255,0.015)", 
                        border: "1px solid var(--border-subtle)", 
                        padding: "10px", 
                        borderRadius: "var(--radius-sm)",
                        marginTop: "auto",
                        textAlign: "left"
                      }}
                    >
                      {drawMode === "polygon" ? (
                        <span>
                          💡 <strong>คู่มือลากเส้นขอบ (Polygon):</strong>
                          <ul style={{ margin: "4px 0 0 0", paddingLeft: "14px" }}>
                            <li>คลิกแผนที่เพื่อเพิ่มจุดพิกัดเชื่อมเส้นขอบ</li>
                            <li><strong>คลิกลากที่จุดพิกัด</strong> เพื่อย้ายตำแหน่งพิกัดได้</li>
                            <li><strong>ดับเบิ้ลคลิก</strong> ที่จุดพิกัด หรือกดปุ่ม <code>Backspace</code>/<code>Delete</code> บนคีย์บอร์ดเพื่อลบจุด</li>
                          </ul>
                        </span>
                      ) : (
                        <span>
                          💡 <strong>คู่มือปักหมุด (Pin):</strong>
                          <ul style={{ margin: "4px 0 0 0", paddingLeft: "14px" }}>
                            <li>คลิกแผนที่ 1 ครั้ง เพื่อปักหมุดข้อความแสดงโซน ณ ตำแหน่งนั้น</li>
                            <li>พิกัดของหมุดจะบันทึกอัตโนมัติ</li>
                          </ul>
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
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
