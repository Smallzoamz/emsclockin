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
import polygonClipping from "polygon-clipping";

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
  version?: number;
  latestChangelog?: {
    version: number;
    timestamp: string;
    changes: Array<{
      type: "added" | "modified" | "deleted";
      categoryName: string;
      oldText?: string;
      newText?: string;
    }>;
  };
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

const defaultMarkers = [
  { id: "marker_red", name: "หมุดสีแดง (ในเมือง)", url: "/images/rules/marker_red.png" },
  { id: "marker_yellow", name: "หมุดสีเหลือง (นอกเมือง)", url: "/images/rules/marker_yellow.png" },
  { id: "marker_green", name: "หมุดสีเขียว (เมืองบน)", url: "/images/rules/marker_green.png" },
  { id: "marker_orange", name: "หมุดสีส้ม (หัวกะโหลกไฟ)", url: "/images/rules/marker_orange.png" }
];



function formatRuleDisplay(text: string) {
  if (!text) return "";
  if (text.includes("@@@FEE@@@")) {
    const parts = text.split("@@@FEE@@@");
    return `${parts[0] || ""} : ${parts[1] || ""}`;
  }
  if (text.includes("\n")) {
    const parts = text.split("\n");
    const desc = parts[0] || "";
    const fine = parts[1] || "";
    const consequence = parts[2] || "";
    let meta = [];
    if (fine) meta.push(`ค่าปรับ: ${fine}`);
    if (consequence) meta.push(`โทษ: ${consequence}`);
    return meta.length > 0 ? `${desc} (${meta.join(" / ")})` : desc;
  }
  return text;
}

function generateRulesChangelog(oldRules: RulesData, newRules: RulesData) {
  if (!oldRules || !oldRules.categories || !newRules || !newRules.categories) return [];
  const changes: Array<{
    type: "added" | "modified" | "deleted";
    categoryName: string;
    oldText?: string;
    newText?: string;
  }> = [];

  newRules.categories.forEach((newCat) => {
    const oldCat = oldRules.categories.find((c) => c.id === newCat.id);
    if (!oldCat) {
      newCat.rules.forEach((r) => {
        if (!r.content.startsWith("[HEADER]")) {
          changes.push({
            type: "added",
            categoryName: newCat.name,
            newText: r.content
          });
        }
      });
      return;
    }

    // Process added or modified rules in new ruleset
    newCat.rules.forEach((newRule) => {
      if (newRule.content.startsWith("[HEADER]")) return;

      const oldRule = oldCat.rules.find((r) => r.id === newRule.id);
      if (!oldRule) {
        changes.push({
          type: "added",
          categoryName: newCat.name,
          newText: newRule.content
        });
      } else if (oldRule.content !== newRule.content) {
        changes.push({
          type: "modified",
          categoryName: newCat.name,
          oldText: oldRule.content,
          newText: newRule.content
        });
      }
    });

    // Process deleted rules in old ruleset
    oldCat.rules.forEach((oldRule) => {
      if (oldRule.content.startsWith("[HEADER]")) return;

      const newRule = newCat.rules.find((r) => r.id === oldRule.id);
      if (!newRule) {
        changes.push({
          type: "deleted",
          categoryName: newCat.name,
          oldText: oldRule.content
        });
      }
    });
  });

  return changes;
}

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
  const [hoveredPinLabel, setHoveredPinLabel] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedDrawZone, setSelectedDrawZone] = useState<string>("ในเมือง");
  const [drawMode, setDrawMode] = useState<"polygon" | "pencil" | "pin">("polygon");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("blue");
  const [zoomScale, setZoomScale] = useState(1);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const [clickedCoord, setClickedCoord] = useState<{ x: number; y: number; label: string } | null>(null);

  // Accordion states
  const [expandedGroupTitles, setExpandedGroupTitles] = useState<Record<string, boolean>>({});
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const toggleGroup = (title: string, index: number) => {
    setExpandedGroupTitles(prev => {
      const isExpanded = index === 0 ? prev[title] !== false : prev[title] === true;
      return {
        ...prev,
        [title]: !isExpanded
      };
    });
  };

  const groupRulesByHeader = (rulesList: Rule[]) => {
    const groups: { header: string; headerRuleId?: string; rules: Rule[] }[] = [];
    let currentGroup: { header: string; headerRuleId?: string; rules: Rule[] } | null = null;

    rulesList.forEach((rule) => {
      if (rule.content.startsWith("[HEADER]")) {
        currentGroup = {
          header: rule.content.replace("[HEADER]", "").trim(),
          headerRuleId: rule.id,
          rules: []
        };
        groups.push(currentGroup);
      } else {
        if (!currentGroup) {
          currentGroup = {
            header: "ข้อปฏิบัติทั่วไป",
            rules: []
          };
          groups.push(currentGroup);
        }
        currentGroup.rules.push(rule);
      }
    });

    return groups;
  };

  const handleAddHeaderRule = (catId: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const newId = `${catId.substring(0, 2)}_h_${Date.now()}`;
      return {
        ...cat,
        rules: [...cat.rules, { id: newId, content: "[HEADER] หัวข้อกลุ่มใหม่" }]
      };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };

  // States for freehand pencil drawing
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const pencilStrokeBaseRef = useRef<number>(0);
  const activePencilPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Helpers for coordinates parsing and Douglas-Peucker simplification
  const parsePoints = (pointsStr: string): [number, number][] => {
    return pointsStr
      .split(" ")
      .filter(Boolean)
      .map(p => {
        const [x, y] = p.split(",").map(Number);
        return [x, y] as [number, number];
      });
  };

  const parseClosedPoly = (pointsStr: string): [number, number][] => {
    const pts = parsePoints(pointsStr);
    if (pts.length > 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        pts.push([first[0], first[1]]);
      }
    }
    return pts;
  };

  const serializeOpenPoly = (pts: [number, number][]): string => {
    const openPts = [...pts];
    if (openPts.length > 1) {
      const first = openPts[0];
      const last = openPts[openPts.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        openPts.pop();
      }
    }
    const rounded = openPts.map(p => [
      Math.round(p[0] * 100) / 100,
      Math.round(p[1] * 100) / 100
    ]);
    return rounded.map(p => `${p[0]},${p[1]}`).join(" ");
  };

  // Douglas-Peucker line simplification algorithm
  const getSqSegDist = (p: [number, number], p1: [number, number], p2: [number, number]): number => {
    let x = p1[0];
    let y = p1[1];
    let dx = p2[0] - x;
    let dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const simplifyDPStep = (points: [number, number][], first: number, last: number, sqTolerance: number, simplified: [number, number][]) => {
    let maxSqDist = sqTolerance;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }
    if (maxSqDist > sqTolerance && index !== -1) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  };

  const simplifyDouglasPeucker = (points: [number, number][], tolerance = 0.4): [number, number][] => {
    if (points.length <= 2) return points;
    const sqTolerance = tolerance * tolerance;
    const last = points.length - 1;
    const simplified: [number, number][] = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);
    return simplified;
  };

  // Overlap auto subtraction clipping handler
  const handleAutoClipOverlaps = async () => {
    const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
    if (!medCat) return;
    const zones = medCat.zones || defaultZones;
    const zoneNames = Object.keys(zones);

    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr || currentPointsStr.split(" ").filter(Boolean).length < 3) {
      showToast("พื้นที่ปัจจุบันต้องมีจุดพิกัดอย่างน้อย 3 จุดเพื่อใช้คำนวณตัดส่วนทับซ้อน", "error");
      return;
    }

    const confirmed = await confirm({
      title: "ตัดพื้นที่ทับซ้อนอัตโนมัติ",
      message: `ระบบจะคำนวณและตัดพื้นที่ในเขต "${selectedDrawZone}" ที่ซ้อนทับกับโซนอื่นออกอัตโนมัติ ยืนยันการทำงานหรือไม่?`,
      variant: "warning",
      confirmText: "ตัดพื้นที่ทับซ้อน",
      cancelText: "ยกเลิก"
    });
    if (!confirmed) return;

    let currentPoly = [parseClosedPoly(currentPointsStr)];
    let clippedCount = 0;

    for (const otherZoneName of zoneNames) {
      if (otherZoneName === selectedDrawZone) continue;
      const otherPointsStr = getZonePoints(otherZoneName);
      if (!otherPointsStr || otherPointsStr.split(" ").filter(Boolean).length < 3) continue;

      const otherPoly = [parseClosedPoly(otherPointsStr)];
      try {
        const diffResult = polygonClipping.difference(currentPoly as any, otherPoly as any);
        if (diffResult && diffResult.length > 0 && diffResult[0].length > 0) {
          currentPoly = diffResult[0] as any;
          clippedCount++;
        }
      } catch (err) {
        console.error("Clipping difference error with zone: " + otherZoneName, err);
      }
    }

    if (clippedCount > 0) {
      const newPointsStr = serializeOpenPoly(currentPoly[0]);
      updateZonePoints(selectedDrawZone, newPointsStr);
      showToast(`ลบส่วนซ้อนทับสำเร็จ (คำนวณขอบร่วม ${clippedCount} เขต)`, "success");
    } else {
      showToast("ไม่พบพิกัดส่วนใดซ้อนทับกับเขตอื่น ๆ", "success");
    }
  };
  
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
        
        const rect = node.getBoundingClientRect();
        const xMouse = e.clientX - rect.left;
        const yMouse = e.clientY - rect.top;
        
        const scrollLeftVal = node.scrollLeft;
        const scrollTopVal = node.scrollTop;

        setZoomScale(prev => {
          const next = Math.min(Math.max(prev + direction * zoomStep, 1), 20); // Max zoom 20x (2000% zoom!)
          
          if (next !== prev) {
            const ratio = next / prev;
            const newScrollLeft = ratio * scrollLeftVal + (ratio - 1) * xMouse;
            const newScrollTop = ratio * scrollTopVal + (ratio - 1) * yMouse;
            
            requestAnimationFrame(() => {
              node.scrollLeft = newScrollLeft;
              node.scrollTop = newScrollTop;
            });
          }
          
          return next;
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

  const handleHospitalMapUpload = async (mapType: "central" | "desert", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mapName = mapType === "central" ? "โรงพยาบาลกลาง" : "โรงพยาบาลทะเลทราย";
    const confirmed = await confirm({
      title: `อัปโหลดรูปแผนที่ขอบเขต`,
      message: `ต้องการอัปโหลดไฟล์ภาพนี้เป็นรูปขอบเขตพิกัด${mapName}หรือไม่?`,
      confirmText: "อัปโหลด",
      cancelText: "ยกเลิก",
      variant: "info"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("cover", file);
    formData.append("catId", "hospital_area");
    formData.append("isMap", "true");
    formData.append("mapType", mapType);

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
              if (c.id !== "hospital_area") return c;
              if (mapType === "central") {
                return { ...c, mapCentralUrl: data.coverUrl };
              } else {
                return { ...c, mapDesertUrl: data.coverUrl };
              }
            })
          };
        };
        setRules(updateMapUrl(rules));
        if (editedRules) {
          setEditedRules(updateMapUrl(editedRules));
        }
        showToast(`อัปโหลดรูปแผนที่${mapName}เรียบร้อยแล้วค่ะ`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
      }
    } catch (error) {
      console.error("Hospital map upload error:", error);
      showToast("เชื่อมต่อระบบล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalMapDelete = async (mapType: "central" | "desert") => {
    const mapName = mapType === "central" ? "โรงพยาบาลกลาง" : "โรงพยาบาลทะเลทราย";
    const confirmed = await confirm({
      title: `ลบรูปแผนที่ขอบเขต`,
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรูปแผนที่ขอบเขตพิกัด${mapName}นี้?`,
      confirmText: "ลบออก",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("deleteCover", "true");
    formData.append("catId", "hospital_area");
    formData.append("isMap", "true");
    formData.append("mapType", mapType);

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
              if (c.id !== "hospital_area") return c;
              if (mapType === "central") {
                return { ...c, mapCentralUrl: "" };
              } else {
                return { ...c, mapDesertUrl: "" };
              }
            })
          };
        };
        setRules(updateMapUrl(rules));
        if (editedRules) {
          setEditedRules(updateMapUrl(editedRules));
        }
        showToast(`ลบรูปแผนที่${mapName}เรียบร้อยแล้วค่ะ`, "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการลบรูปภาพ", "error");
      }
    } catch (error) {
      console.error("Hospital map delete error:", error);
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

  const getHoveredPinLabel = (desc: string): string | null => {
    if (!desc) return null;
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    const zones = medCat?.zones || defaultZones;
    const zoneNames = Object.keys(zones);
    for (const zoneName of zoneNames) {
      const pinsList = getZonePinsList(zoneName);
      for (const pin of pinsList) {
        if (pin.label && desc.includes(pin.label)) {
          return pin.label;
        }
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
    // Read-only dynamic hover panning - disabled zoom for all locations as requested
    if (hoveredZone) {
      return {
        transform: "scale(1)",
        transformOrigin: "center center"
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

  const getZonePinsList = (zoneName: string): { x: number; y: number; label?: string }[] => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    const val = medCat?.pins?.[zoneName];
    if (Array.isArray(val)) {
      return val;
    }
    if (val && typeof val === "object" && typeof val.x === "number" && typeof val.y === "number") {
      return [val];
    }
    const defPin = (defaultPins as any)[zoneName];
    if (defPin) {
      return [defPin];
    }
    return [];
  };

  const getPinCoords = (zoneName: string): { x: number; y: number } => {
    const list = getZonePinsList(zoneName);
    return list[0] || { x: 50, y: 50 };
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

  const getAvailableMarkers = () => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    const customMarkers = medCat?.custom_markers || [];
    return [...defaultMarkers, ...customMarkers];
  };

  const getZoneMarker = (zoneName: string): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zone_markers?.[zoneName] !== undefined) {
      return medCat.zone_markers[zoneName];
    }
    if (zoneName === "ในเมือง") return "marker_red";
    if (zoneName === "นอกเมือง") return "marker_yellow";
    if (zoneName === "เมืองบน") return "marker_green";
    return "marker_orange";
  };

  const getZoneMarkerUrl = (zoneName: string): string => {
    const markerId = getZoneMarker(zoneName);
    const available = getAvailableMarkers();
    const found = available.find(m => m.id === markerId);
    return found ? found.url : "/images/rules/marker_orange.png";
  };

  const updateZoneMarker = (zoneName: string, markerKey: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      const zone_markers = { ...(cat as any).zone_markers || {}, [zoneName]: markerKey };
      return { ...cat, zone_markers };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
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

  const updatePinCoords = (zoneName: string, coords: { x: number; y: number; label?: string } | { x: number; y: number; label?: string }[]) => {
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

  const [snappedVertex, setSnappedVertex] = useState<{ x: number; y: number } | null>(null);

  const getSnappedCoords = (x: number, y: number, isModifierPressed = false): { x: number; y: number; isSnapped: boolean } => {
    if (!snapEnabled && !isModifierPressed) {
      return { x, y, isSnapped: false };
    }

    const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
    if (!medCat) return { x, y, isSnapped: false };
    const zones = medCat.zones || defaultZones;
    
    let closestPt = { x, y };
    let minDistance = Infinity;
    
    for (const zoneName of Object.keys(zones)) {
      if (zoneName === selectedDrawZone) continue;
      const pointsStr = zones[zoneName] as string;
      if (!pointsStr) continue;
      
      const pts = pointsStr.split(" ").filter(Boolean).map((p: string) => {
        const [px, py] = p.split(",").map(Number);
        return { x: px, y: py };
      });
      
      for (const pt of pts) {
        const dist = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
        if (dist < minDistance) {
          minDistance = dist;
          closestPt = pt;
        }
      }
    }
    
    const snapThreshold = 1.2 / zoomScale;
    if (minDistance < snapThreshold) {
      return { x: closestPt.x, y: closestPt.y, isSnapped: true };
    }
    
    return { x, y, isSnapped: false };
  };

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isEditMode || drawMode !== "pencil") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let x = Math.round((clickX / rect.width) * 100 * 100) / 100;
    let y = Math.round((clickY / rect.height) * 100 * 100) / 100;
    
    const snapped = getSnappedCoords(x, y, e.shiftKey || e.ctrlKey);
    if (snapped.isSnapped) {
      x = snapped.x;
      y = snapped.y;
      setSnappedVertex({ x, y });
    } else {
      setSnappedVertex(null);
    }
    
    const currentPointsStr = getZonePoints(selectedDrawZone);
    const existingPoints = currentPointsStr 
      ? currentPointsStr.split(" ").filter(Boolean).map(p => {
          const [px, py] = p.split(",").map(Number);
          return { x: px, y: py };
        })
      : [];

    pencilStrokeBaseRef.current = existingPoints.length;
    activePencilPointsRef.current = [...existingPoints, { x, y }];
    
    setIsDrawingFreehand(true);
    setFreehandPoints([...activePencilPointsRef.current]);
  };

  const handleMapMouseUp = () => {
    if (!isDrawingFreehand) return;
    setIsDrawingFreehand(false);
    setSnappedVertex(null);
    
    const baseLength = pencilStrokeBaseRef.current;
    const pointsList = activePencilPointsRef.current;
    
    if (pointsList.length > baseLength) {
      const newPts = pointsList.slice(baseLength);
      if (newPts.length > 2) {
        const ptsArray = newPts.map(p => [p.x, p.y] as [number, number]);
        const tolerance = Math.max(0.01, 0.04 / zoomScale);
        const simplifiedNew = simplifyDouglasPeucker(ptsArray, tolerance);
        
        const existingPts = pointsList.slice(0, baseLength);
        const combined = [...existingPts, ...simplifiedNew.map(pt => ({ x: pt[0], y: pt[1] }))];
        
        // Loop back check (connect back to starting point):
        if (combined.length > 2) {
          const first = combined[0];
          const last = combined[combined.length - 1];
          const distToStart = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
          if (distToStart < 1.5 / zoomScale) {
            combined[combined.length - 1] = { x: first.x, y: first.y };
          }
        }
        
        const serialized = serializeOpenPoly(combined.map(p => [p.x, p.y]));
        updateZonePoints(selectedDrawZone, serialized);
      }
    }
    setFreehandPoints([]);
    activePencilPointsRef.current = [];
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isEditMode || drawMode === "pencil") return;
    
    // If we clicked directly on a vertex, don't add a new point
    if ((e.target as HTMLElement).tagName === "circle" && (e.target as HTMLElement).classList.contains("editor-vertex-point")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let x = Math.round((clickX / rect.width) * 100 * 100) / 100;
    let y = Math.round((clickY / rect.height) * 100 * 100) / 100;

    const snapped = getSnappedCoords(x, y, e.shiftKey || e.ctrlKey);
    if (snapped.isSnapped) {
      x = snapped.x;
      y = snapped.y;
    }

    if (drawMode === "polygon") {
      const currentPointsStr = getZonePoints(selectedDrawZone);
      const points = currentPointsStr ? currentPointsStr.split(" ").filter(Boolean) : [];
      points.push(`${x},${y}`);
      updateZonePoints(selectedDrawZone, points.join(" "));
      setSelectedVertexIndex(points.length - 1);
    } else if (drawMode === "pin") {
      const currentPins = getZonePinsList(selectedDrawZone);
      const closeIndex = currentPins.findIndex(p => {
        const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        return dist < 2.5;
      });

      let updatedPinsList = [...currentPins];
      if (closeIndex > -1) {
        updatedPinsList.splice(closeIndex, 1);
        showToast("ลบจุดปักหมุดเรียบร้อยแล้วค่ะ", "success");
      } else {
        updatedPinsList.push({ x, y });
        showToast("เพิ่มจุดปักหมุดเรียบร้อยแล้วค่ะ", "success");
      }
      
      updatePinCoords(selectedDrawZone, updatedPinsList);
    }
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isEditMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let x = Math.min(Math.max(Math.round((clickX / rect.width) * 100 * 100) / 100, 0), 100);
    let y = Math.min(Math.max(Math.round((clickY / rect.height) * 100 * 100) / 100, 0), 100);

    const snapped = getSnappedCoords(x, y, e.shiftKey || e.ctrlKey);
    if (snapped.isSnapped) {
      x = snapped.x;
      y = snapped.y;
      setSnappedVertex({ x, y });
    } else {
      setSnappedVertex(null);
    }

    if (isDrawingFreehand && drawMode === "pencil") {
      const pointsList = activePencilPointsRef.current;
      const lastPt = pointsList[pointsList.length - 1];
      if (!lastPt || Math.abs(lastPt.x - x) > 0.02 || Math.abs(lastPt.y - y) > 0.02) {
        activePencilPointsRef.current.push({ x, y });
        setFreehandPoints([...activePencilPointsRef.current]);
      }
      return;
    }

    if (draggedVertexIndex !== null) {
      const currentPointsStr = getZonePoints(selectedDrawZone);
      if (!currentPointsStr) return;
      const points = currentPointsStr.split(" ").filter(Boolean);
      
      if (draggedVertexIndex >= 0 && draggedVertexIndex < points.length) {
        points[draggedVertexIndex] = `${x},${y}`;
        updateZonePoints(selectedDrawZone, points.join(" "));
      }
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
      const zone_markers = { ...((cat as any).zone_markers || {}), [name]: "marker_orange" };
      return { ...cat, zones: updatedZones, pins: updatedPins, zone_colors, zone_markers };
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
      const zone_markers = { ...((cat as any).zone_markers || {}) };
      
      delete zones[zoneName];
      delete pins[zoneName];
      delete zone_colors[zoneName];
      delete zone_markers[zoneName];

      let fallback_zone = (cat as any).fallback_zone || "";
      if (fallback_zone === zoneName) {
        fallback_zone = "";
      }

      return { ...cat, zones, pins, zone_colors, zone_markers, fallback_zone };
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

  const handleAcknowledgeChangelog = () => {
    if (rules && rules.version) {
      localStorage.setItem("acknowledged_rules_version", rules.version.toString());
    }
    setShowChangelogModal(false);
  };

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        
        // Version check to show update modal popups
        if (data.rules.version && data.rules.latestChangelog?.changes?.length > 0) {
          const ackVersion = localStorage.getItem("acknowledged_rules_version");
          if (!ackVersion || parseInt(ackVersion, 10) < data.rules.version) {
            setShowChangelogModal(true);
          }
        }
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
      const changes = rules ? generateRulesChangelog(rules, editedRules) : [];
      const newVersion = Date.now();
      const rulesToSave: RulesData = {
        ...editedRules,
        version: changes.length > 0 ? newVersion : (rules?.version || newVersion),
        latestChangelog: changes.length > 0 ? {
          version: newVersion,
          timestamp: new Date().toISOString(),
          changes
        } : (rules?.latestChangelog || undefined)
      };

      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: rulesToSave })
      });
      const data = await res.json();
      if (data.success) {
        setRules(rulesToSave);
        // Acknowledge own changes for the admin
        if (rulesToSave.version) {
          localStorage.setItem("acknowledged_rules_version", rulesToSave.version.toString());
        }
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
          <div className="rules-modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
            
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
                      <div className="map-container" style={{ position: "relative", overflow: "auto", width: "100%" }}>
                        <div 
                          className="map-zoom-wrapper"
                          style={getMapTransform()}
                        >
                          <div 
                            style={{ position: "relative", display: "inline-block", maxWidth: "100%", cursor: isDrawingMode ? "crosshair" : "default" }}
                            onClick={(e) => {
                              if (isDrawingMode) {
                                handleMapClick(e);
                              } else {
                                if (isEditMode) return;
                                
                                // Read-only click identification logic
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const clickY = e.clientY - rect.top;
                                const x = Math.round((clickX / rect.width) * 100 * 100) / 100;
                                const y = Math.round((clickY / rect.height) * 100 * 100) / 100;

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
                              style={{ width: "100%", display: "block" }}
                            />
                            
                            {/* SVG Interactive Overlay */}
                            {(!isEditMode || isDrawingMode) && (() => {
                              const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                              const zones = medCat?.zones || defaultZones;
                              const zoneNames = Object.keys(zones);
                              const activeZonePoints = hoveredZone ? getZonePoints(hoveredZone) : null;

                              return (
                                <svg
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="xMidYMid meet"
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
                                  <defs>
                                    {activeZonePoints && (
                                      <clipPath id="hovered-zone-clip-readonly">
                                        <polygon points={activeZonePoints} />
                                      </clipPath>
                                    )}
                                  </defs>

                                  {hoveredZone && activeZonePoints && (
                                    <image
                                      href={(activeCategory as any).mapUrl}
                                      x="0"
                                      y="0"
                                      width="100"
                                      height="100"
                                      preserveAspectRatio="xMidYMid meet"
                                      clipPath="url(#hovered-zone-clip-readonly)"
                                      style={{
                                        filter: "brightness(1.15) contrast(1.05)",
                                        pointerEvents: "none"
                                      }}
                                    />
                                  )}

                                  {/* Dynamic Zones Polygons - visual only, no map hover events */}
                                  {zoneNames.map(zoneName => {
                                    const pointsStr = getZonePoints(zoneName);
                                    if (!pointsStr) return null;
                                    const colorKey = getZoneColor(zoneName);
                                    const colorObj = colorMap[colorKey] || colorMap.blue;
                                    
                                    const isSelected = selectedDrawZone === zoneName;
                                    const isActive = hoveredZone === zoneName || (isDrawingMode && isSelected);
                                    const isAnyFocused = hoveredZone !== null || (isDrawingMode && selectedDrawZone !== null);
                                    
                                    let strokeColor = `rgba(${colorObj.rgb}, 0.35)`;
                                    let strokeWidth = 0.5;

                                    if (isAnyFocused) {
                                      if (isActive) {
                                        strokeColor = colorObj.hex;
                                        strokeWidth = 0.5;
                                      } else {
                                        strokeColor = `rgba(${colorObj.rgb}, 0.08)`;
                                        strokeWidth = 0.3;
                                      }
                                    }
                                    
                                    return (
                                      <polygon
                                        key={`poly-${zoneName}`}
                                        points={pointsStr}
                                        className={`map-zone-path ${isActive ? "active" : ""}`}
                                        style={{
                                          fill: "none",
                                          stroke: strokeColor,
                                          strokeWidth: strokeWidth,
                                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                          cursor: isDrawingMode ? "crosshair" : "default"
                                        } as React.CSSProperties}
                                        pointerEvents={isDrawingMode ? "auto" : "none"}
                                      />
                                    );
                                  })}

                                  {/* Dynamic Pins - no map hover, but responds to table hover */}
                                  {zoneNames.map(zoneName => {
                                    const pinsList = getZonePinsList(zoneName);
                                    const colorKey = getZoneColor(zoneName);
                                    const colorObj = colorMap[colorKey] || colorMap.blue;
                                    const markerUrl = getZoneMarkerUrl(zoneName);
                                    const isMainLocation = zoneName === "ในเมือง" || zoneName === "นอกเมือง" || zoneName === "เมืองบน";
                                    const w = isMainLocation ? 18.75 : 11.25;
                                    const h = isMainLocation ? 28.0 : 16.8;
                                    const isActive = hoveredZone === zoneName;
                                    
                                    return pinsList.map((pin, pinIdx) => {
                                      const isWiggling = hoveredPinLabel ? (pin.label === hoveredPinLabel) : false;
                                      return (
                                        <g
                                          key={`pin-${zoneName}-${pinIdx}`}
                                          className={`map-pin-group ${isMainLocation ? "map-pin-main" : "map-pin-second"} ${isActive ? "active" : ""} ${isWiggling ? "active-wiggle" : ""}`}
                                          style={{
                                            opacity: (!hoveredZone || isActive) ? 1 : 0.2,
                                            pointerEvents: "auto",
                                            transition: "opacity 0.3s ease"
                                          }}
                                          onMouseEnter={() => {
                                            if (!isEditMode) {
                                              setHoveredZone(zoneName);
                                              if (pin.label) {
                                                setHoveredPinLabel(pin.label);
                                              }
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            if (!isEditMode) {
                                              setHoveredZone(null);
                                              setHoveredPinLabel(null);
                                            }
                                          }}
                                        >
                                          <circle 
                                            cx={pin.x} 
                                            cy={pin.y} 
                                            r="1.2" 
                                            fill="none" 
                                            stroke={colorObj.hex} 
                                            strokeWidth="0.3" 
                                            className="map-pin-pulse" 
                                          />
                                          <circle 
                                            cx={pin.x} 
                                            cy={pin.y} 
                                            r="0.4" 
                                            fill={colorObj.hex} 
                                            stroke="#fff" 
                                            strokeWidth="0.15" 
                                          />
                                          
                                          <image
                                            href={markerUrl}
                                            x={pin.x - w / 2}
                                            y={pin.y - h / 2}
                                            width={w}
                                            height={h}
                                            preserveAspectRatio="xMidYMid meet"
                                          />

                                          {/* Always-visible compact label */}
                                          <g style={{ pointerEvents: "none" }}>
                                            <text 
                                              x={pin.x} 
                                              y={pin.y + h / 2 - (isMainLocation ? 3.0 : 2.0)} 
                                              className="map-pin-label" 
                                              dominantBaseline="middle" 
                                              style={{ fontSize: "1.6px", fill: "#fff", textAnchor: "middle", fontWeight: "700", paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: "0.3px" }}
                                            >
                                              {pin.label || zoneName}
                                            </text>
                                          </g>
                                        </g>
                                      );
                                    });
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

                  {/* Right Column: Dashed Table wrapped in Accordions */}
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
                                              const subLabel = getHoveredPinLabel(description);
                                              setHoveredPinLabel(subLabel);
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            if (!isEditMode) {
                                              setHoveredZone(null);
                                              setHoveredPinLabel(null);
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
                <div className="rules-split-layout">
                  {/* Left Column: Details & Local Search */}
                  <div className="rules-split-left">
                    <div className="rules-sidebar-card" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        {getCategoryIcon(activeCategory.id, 32)}
                        <div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{activeCategory.name}</h4>
                          <span style={{ fontSize: "0.72rem", color: "#fca5a5" }}>
                            {activeCategory.rules.length} รายการแบล็คลิสต์
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                        รายชื่อบุคคลและกลุ่มแก๊งที่มีประวัติการกระทำผิด หรือค้างชำระค่าปรับ/ค่ารักษาพยาบาลสะสมภายในศูนย์การแพทย์
                      </p>
                    </div>

                    {!isEditMode && (
                      <div className="rules-sidebar-search-box">
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "bold" }}>
                          ค้นหารายชื่อแบล็คลิสต์
                        </div>
                        <div className="search-container" style={{ maxWidth: "100%" }}>
                          <input
                            type="text"
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            className="search-input"
                            placeholder="พิมพ์ชื่อหรือกลุ่ม..."
                            style={{ padding: "8px 12px 8px 34px", fontSize: "0.8rem" }}
                          />
                          <svg
                            className="search-icon-svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ left: 10 }}
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                        </div>
                      </div>
                    )}

                    <div className="rules-sidebar-tip-card">
                      <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                        <InfoIcon size={14} style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {isEditMode ? (
                            <div>
                              <strong style={{ color: "var(--text-primary)" }}>ข้อความระวังการแก้ไข:</strong>
                              <ul style={{ margin: "4px 0 0 12px", padding: 0, listStyleType: "disc" }}>
                                <li>ระบุพฤติกรรม ค่าปรับ และโทษให้ชัดเจน</li>
                                <li>ระบบจะแบ่งข้อมูลทั้ง 3 ส่วนด้วยการขึ้นบรรทัดใหม่</li>
                              </ul>
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: "var(--text-primary)" }}>ระเบียบการปลดแบล็คลิสต์:</strong>
                              <p style={{ margin: "4px 0 0 0" }}>ต้องชำระค่าปรับเต็มจำนวน ณ เคาน์เตอร์โรงพยาบาล หรือผ่านระบบโอนเงิน จึงจะได้รับการทำเรื่องปลดตามขั้นตอน</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Blacklist Content Card List */}
                  <div className="rules-split-right">
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
                              <div key={rule.id} className="blacklist-card" style={{ margin: 0 }}>
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
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleAddRule(activeCategory.id)}
                          className="btn-add-rule"
                          style={{ marginTop: "6px" }}
                        >
                          <PlusIcon size={14} />
                          เพิ่มรายการบัญชีดำใหม่
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rules-split-layout">
                  {/* Left Column: Side info & search */}
                  <div className="rules-split-left">
                    <div className="rules-sidebar-card">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        {getCategoryIcon(activeCategory.id, 32)}
                        <div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{activeCategory.name}</h4>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {activeCategory.rules.filter(r => !r.content.startsWith("[HEADER]")).length} ข้อปฏิบัติ
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
                        {activeCategory.id === "hospital_area" && "ระเบียบข้อบังคับความปลอดภัยและการจัดระเบียบเรียบร้อยภายในพื้นที่ดูแลของโรงพยาบาล"}
                        {activeCategory.id === "doctor_duty" && "หลักการจรรยาบรรณแพทย์ เครื่องแบบ และแนวทางการปฏิบัติหน้าที่ในการดูแลรักษาคนไข้"}
                        {activeCategory.id === "case_story" && "กฏเกณฑ์การจัดเวร OP การรับเคสปะทะ สตอรี่สนาม และการดูแลคะแนนสตอรี่"}
                      </p>
                    </div>

                    {/* Hospital Maps Section */}
                    {activeCategory.id === "hospital_area" && (
                      <div className="hospital-maps-section" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "bold", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                          📍 ขอบเขตพิกัดโรงพยาบาล
                        </div>

                        {/* Central Hospital Map */}
                        <div className="hospital-map-card" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--text-primary)" }}>🏥 โรงพยาบาลกลาง (Central)</span>
                            {isEditMode && (
                              <div style={{ display: "flex", gap: "4px" }}>
                                <label className="map-upload-trigger-btn" style={{ padding: "4px 8px", fontSize: "0.65rem", margin: 0, height: "auto", display: "inline-flex", alignItems: "center", gap: "2px", width: "auto" }}>
                                  <UploadIcon size={10} />
                                  อัปโหลด
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleHospitalMapUpload("central", e)}
                                    style={{ display: "none" }}
                                  />
                                </label>
                                {(activeCategory as any).mapCentralUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleHospitalMapDelete("central")}
                                    className="btn btn-danger"
                                    style={{ padding: "4px 8px", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "2px", height: "auto" }}
                                  >
                                    <TrashIcon size={10} />
                                    ลบ
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {(activeCategory as any).mapCentralUrl ? (
                            <div 
                              onClick={() => !isEditMode && setLightboxUrl((activeCategory as any).mapCentralUrl)}
                              style={{ position: "relative", cursor: isEditMode ? "default" : "zoom-in", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                              <img src={(activeCategory as any).mapCentralUrl} alt="Central Hospital Map" style={{ width: "100%", maxHeight: "110px", objectFit: "cover", display: "block" }} />
                              {!isEditMode && (
                                <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "rgba(0,0,0,0.7)", padding: "2px 4px", borderRadius: "2px", fontSize: "0.58rem", color: "#fff" }}>
                                  🔎 คลิกขยาย
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: "16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                              ยังไม่มีการอัปโหลดแผนที่
                            </div>
                          )}
                        </div>

                        {/* Desert Hospital Map */}
                        <div className="hospital-map-card" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--text-primary)" }}>🌵 โรงพยาบาลทะเลทราย (Sandy)</span>
                            {isEditMode && (
                              <div style={{ display: "flex", gap: "4px" }}>
                                <label className="map-upload-trigger-btn" style={{ padding: "4px 8px", fontSize: "0.65rem", margin: 0, height: "auto", display: "inline-flex", alignItems: "center", gap: "2px", width: "auto" }}>
                                  <UploadIcon size={10} />
                                  อัปโหลด
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleHospitalMapUpload("desert", e)}
                                    style={{ display: "none" }}
                                  />
                                </label>
                                {(activeCategory as any).mapDesertUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleHospitalMapDelete("desert")}
                                    className="btn btn-danger"
                                    style={{ padding: "4px 8px", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "2px", height: "auto" }}
                                  >
                                    <TrashIcon size={10} />
                                    ลบ
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {(activeCategory as any).mapDesertUrl ? (
                            <div 
                              onClick={() => !isEditMode && setLightboxUrl((activeCategory as any).mapDesertUrl)}
                              style={{ position: "relative", cursor: isEditMode ? "default" : "zoom-in", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}
                            >
                              <img src={(activeCategory as any).mapDesertUrl} alt="Desert Hospital Map" style={{ width: "100%", maxHeight: "110px", objectFit: "cover", display: "block" }} />
                              {!isEditMode && (
                                <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "rgba(0,0,0,0.7)", padding: "2px 4px", borderRadius: "2px", fontSize: "0.58rem", color: "#fff" }}>
                                  🔎 คลิกขยาย
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: "16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                              ยังไม่มีการอัปโหลดแผนที่
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isEditMode && (
                      <div className="rules-sidebar-search-box">
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "bold" }}>
                          ค้นหาภายในหมวดหมู่นี้
                        </div>
                        <div className="search-container" style={{ maxWidth: "100%" }}>
                          <input
                            type="text"
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            className="search-input"
                            placeholder="พิมพ์คำค้นหา..."
                            style={{ padding: "8px 12px 8px 34px", fontSize: "0.8rem" }}
                          />
                          <svg
                            className="search-icon-svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ left: 10 }}
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                        </div>
                      </div>
                    )}

                    <div className="rules-sidebar-tip-card">
                      <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                        <InfoIcon size={14} style={{ color: "var(--accent-light)", marginTop: "2px", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {isEditMode ? (
                            <div>
                              <strong style={{ color: "var(--text-primary)" }}>โหมดผู้ดูแลระบบ:</strong>
                              <ul style={{ margin: "4px 0 0 12px", padding: 0, listStyleType: "disc" }}>
                                <li>หัวข้อกลุ่มสีฟ้าจะแยกประเภทข้อมูลในหน้าการอ่าน</li>
                                <li>คุณสามารถลากสลับตำแหน่งการจัดลำดับได้</li>
                                <li>อย่าลืมกดปุ่ม "บันทึกข้อมูล" หลังจากแก้ไขเสร็จ</li>
                              </ul>
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: "var(--text-primary)" }}>คำแนะนำการใช้งาน:</strong>
                              <p style={{ margin: "4px 0 0 0" }}>คลิกที่แถบหัวข้อกลุ่มเพื่อย่อหรือขยายเนื้อหากฎระเบียบ การสืบค้นจะทำการเปิดหัวข้อที่พบคำค้นหาให้โดยอัตโนมัติ</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Grouped Accordions or Flat edit cards */}
                  <div className="rules-split-right">
                    {isEditMode ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                        {activeCategory.rules.map((rule, idx) => {
                          const isHeader = rule.content.startsWith("[HEADER]");
                          const displayContent = isHeader
                            ? rule.content.replace("[HEADER]", "").trim()
                            : rule.content;

                          return (
                            <div key={rule.id} className={`rule-edit-card ${isHeader ? "rule-edit-header-card" : ""}`} style={{ margin: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <span className="rules-card-badge" style={{ 
                                  padding: "2px 8px", 
                                  fontSize: "0.68rem",
                                  background: isHeader ? "rgba(59, 130, 246, 0.18)" : "rgba(255, 255, 255, 0.05)",
                                  color: isHeader ? "#93c5fd" : "var(--text-secondary)",
                                  borderColor: isHeader ? "rgba(59, 130, 246, 0.3)" : "transparent",
                                  borderWidth: "1px",
                                  borderStyle: "solid"
                                }}>
                                  {isHeader ? "📂 หัวข้อกลุ่ม (Accordion Header)" : `ข้อที่ ${idx + 1}`}
                                </span>
                                
                                <div className="rule-edit-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newContent = isHeader
                                        ? displayContent
                                        : "[HEADER] " + displayContent;
                                      handleRuleContentChange(activeCategory.id, rule.id, newContent);
                                    }}
                                    className="rule-btn-icon"
                                    title={isHeader ? "แปลงเป็นข้อปฏิบัติทั่วไป" : "แปลงเป็นหัวข้อกลุ่ม (Accordion)"}
                                    style={{ fontSize: "0.7rem", padding: "0 8px", width: "auto", height: "24px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.04)" }}
                                  >
                                    {isHeader ? "📄 แปลงเป็นข้อธรรมดา" : "📂 แปลงเป็นหัวข้อ"}
                                  </button>
                                  
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
                                value={displayContent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleRuleContentChange(activeCategory.id, rule.id, isHeader ? "[HEADER] " + val : val);
                                }}
                                className="rules-textarea"
                                placeholder={isHeader ? "ระบุชื่อหัวข้อกลุ่มข้อปฏิบัติ..." : "ระบุกฏระเบียบข้อบังคับ..."}
                                style={{ minHeight: isHeader ? "40px" : "80px" }}
                              />
                            </div>
                          );
                        })}

                        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleAddRule(activeCategory.id)}
                            className="btn-add-rule"
                            style={{ flex: 1, margin: 0, justifyContent: "center" }}
                          >
                            <PlusIcon size={14} />
                            เพิ่มข้อปฏิบัติใหม่
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddHeaderRule(activeCategory.id)}
                            className="btn-add-rule"
                            style={{ flex: 1, margin: 0, justifyContent: "center", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "#93c5fd" }}
                          >
                            <FolderIcon size={14} />
                            เพิ่มหัวข้อกลุ่มใหม่
                          </button>
                        </div>
                      </div>
                    ) : (() => {
                      // Filter first but KEEP ALL HEADERS
                      const filteredGeneralRules = activeCategory.rules.filter((rule) => {
                        if (rule.content.startsWith("[HEADER]")) {
                          return true;
                        }
                        return rule.content.toLowerCase().includes(modalSearchQuery.toLowerCase());
                      });

                      const groups = groupRulesByHeader(filteredGeneralRules);
                      const visibleGroups = groups.filter(g => g.rules.length > 0 || g.headerRuleId);

                      if (visibleGroups.length === 0 || (visibleGroups.every(g => g.rules.length === 0) && modalSearchQuery)) {
                        return (
                          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                            ไม่พบข้อมูลกฏระเบียบที่สอดคล้องกับคำค้นหา
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                          {visibleGroups.map((group, gIdx) => {
                            if (modalSearchQuery && group.rules.length === 0) return null;

                            const isExpanded = modalSearchQuery.trim() !== ""
                              ? true
                              : (gIdx === 0
                                  ? expandedGroupTitles[group.header] !== false
                                  : expandedGroupTitles[group.header] === true);

                            return (
                              <div key={group.headerRuleId || `g_${gIdx}`} className={`rules-accordion-item ${isExpanded ? "expanded" : ""}`}>
                                <div 
                                  className="rules-accordion-header" 
                                  onClick={() => toggleGroup(group.header, gIdx)}
                                  style={{ background: "rgba(15, 23, 42, 0.3)" }}
                                >
                                  <div className="rules-accordion-title">
                                    <span>📁</span>
                                    <span>{group.header}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="rules-card-badge" style={{ fontSize: "0.68rem" }}>
                                      {group.rules.length} ข้อปฏิบัติ
                                    </span>
                                    <span className="rules-accordion-chevron" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="rules-accordion-content" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px 20px" }}>
                                    {group.rules.map((rule, rIdx) => (
                                      <div key={rule.id} className="rules-modal-item" style={{ border: "none", background: "rgba(15, 23, 42, 0.15)", margin: 0 }}>
                                        <div className="rules-modal-item-num">{rIdx + 1}</div>
                                        <div className="rules-modal-item-text">
                                          {getHighlightedText(rule.content, modalSearchQuery)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Warning Banner at the bottom of the card always */}
              <div className="rules-warning-card" style={{
                marginTop: "16px",
                background: "rgba(239, 68, 68, 0.03)",
                border: "1px solid rgba(239, 68, 68, 0.18)",
                borderRadius: "var(--radius-md)",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 4px 20px rgba(239, 68, 68, 0.03)"
              }}>
                <span style={{ fontSize: "1.2rem", filter: "drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))" }}>⚠️</span>
                <p style={{ fontSize: "0.76rem", color: "#fca5a5", lineHeight: 1.5, margin: 0 }}>
                  หากมีการละเมิดกฏข้อใด อาจส่งผลให้ผู้ละเมิด <strong style={{ color: "#ef4444", textShadow: "0 0 6px rgba(239, 68, 68, 0.3)" }}>ถูก Blacklist จากแพทย์</strong> โดยไม่มีการตักเตือนก่อนทันที และอาจส่งผลร้ายแรงถึงขั้นถูกบทลงโทษจากทางประเทศ <span style={{ letterSpacing: "2px", marginLeft: "2px" }}>🟨🟧🟥</span> <strong style={{ color: "#fff" }}>กรุณาอ่านกฏทุกข้ออย่างมีสติ</strong>
                </p>
              </div>
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
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 20))}
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
                  position: "relative",
                  display: "inline-block"
                }}
              >
                <div 
                  style={{ position: "relative", display: "inline-block", cursor: "crosshair", userSelect: "none" }}
                  onMouseDown={handleMapMouseDown}
                  onMouseUp={handleMapMouseUp}
                  onMouseLeave={handleMapMouseUp}
                  onClick={handleMapClick}
                  onMouseMove={handleMapMouseMove}
                  onDragStart={(e) => e.preventDefault()}
                >
                  <img
                    src={(activeCategory as any).mapUrl}
                    alt="Treatment Area Map"
                    className={"map-image " + (hoveredZone ? "dimmed" : "")}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    style={{ 
                      maxHeight: "80vh", 
                      width: "auto", 
                      display: "block",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      userSelect: "none"
                    }}
                  />
                  
                  {/* SVG Interactive Drawing Overlay */}
                  {(() => {
                    const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                    const zones = medCat?.zones || defaultZones;
                    const zoneNames = Object.keys(zones);
                    
                    const activeClipZone = hoveredZone || selectedDrawZone;
                    const activeZonePoints = activeClipZone ? getZonePoints(activeClipZone) : null;
                    const selectedColorKey = getZoneColor(selectedDrawZone);
                    const selectedColorHex = colorMap[selectedColorKey]?.hex || "#3b82f6";

                    return (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="xMidYMid meet"
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
                        <defs>
                          {activeZonePoints && (
                            <clipPath id="hovered-zone-clip-portal">
                              <polygon points={activeZonePoints} />
                            </clipPath>
                          )}
                        </defs>

                        {activeClipZone && activeZonePoints && (
                          <image
                            href={(activeCategory as any).mapUrl}
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            preserveAspectRatio="xMidYMid meet"
                            clipPath="url(#hovered-zone-clip-portal)"
                            style={{
                              filter: "brightness(1.15) contrast(1.05)",
                              pointerEvents: "none"
                            }}
                          />
                        )}

                        {/* Freehand Pencil Drawing Preview Path */}
                        {drawMode === "pencil" && freehandPoints.length > 1 && (
                          <polyline
                            points={freehandPoints.map(p => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke={selectedColorHex}
                            strokeWidth={1.2 / zoomScale}
                            strokeDasharray={`${2.0 / zoomScale},${1.5 / zoomScale}`}
                          />
                        )}

                        {/* Snap Target Glow Helper */}
                        {snappedVertex && (
                          <circle
                            cx={snappedVertex.x}
                            cy={snappedVertex.y}
                            r={3.0 / zoomScale}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={1.0 / zoomScale}
                            style={{
                              filter: "drop-shadow(0 0 4px #10b981)",
                              opacity: 0.95,
                              pointerEvents: "none"
                            }}
                          />
                        )}

                        {/* Dynamic Zones Polygons */}
                        {zoneNames.map(zoneName => {
                          const pointsStr = getZonePoints(zoneName);
                          if (!pointsStr) return null;
                          const colorKey = getZoneColor(zoneName);
                          const colorObj = colorMap[colorKey] || colorMap.blue;
                          
                          const isSelected = selectedDrawZone === zoneName;
                          const isActive = hoveredZone === zoneName || isSelected;
                          const isAnyFocused = hoveredZone !== null || selectedDrawZone !== null;
                          
                          let strokeColor = "rgba(" + colorObj.rgb + ", 0.4)";
                          let strokeWidthVal = 0.5;

                          if (isAnyFocused) {
                            if (isActive) {
                              strokeColor = colorObj.hex;
                              strokeWidthVal = 0.5;
                            } else {
                              strokeColor = "rgba(" + colorObj.rgb + ", 0.08)";
                              strokeWidthVal = 0.3;
                            }
                          }
                          
                          return (
                            <polygon
                              key={"poly-" + zoneName}
                              points={pointsStr}
                              className={"map-zone-path " + (isActive ? "active" : "")}
                              style={{
                                fill: "none",
                                stroke: strokeColor,
                                strokeWidth: strokeWidthVal / zoomScale,
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
                          const pinsList = getZonePinsList(zoneName);
                          const colorKey = getZoneColor(zoneName);
                          const colorObj = colorMap[colorKey] || colorMap.blue;
                          const markerUrl = getZoneMarkerUrl(zoneName);
                          const isMainLocation = zoneName === "ในเมือง" || zoneName === "นอกเมือง" || zoneName === "เมืองบน";
                          const baseW = isMainLocation ? 18.75 : 11.25;
                          const baseH = isMainLocation ? 28.0 : 16.8;
                          const w = baseW / zoomScale;
                          const h = baseH / zoomScale;
                          const isActive = hoveredZone === zoneName;
                          
                          return pinsList.map((pin, pinIdx) => {
                            const isWiggling = hoveredPinLabel ? (pin.label === hoveredPinLabel) : false;
                            const labelText = pin.label || zoneName;
                            return (
                              <g
                                key={"pin-" + zoneName + "-" + pinIdx}
                                className={"map-pin-group " + (isMainLocation ? "map-pin-main" : "map-pin-second") + " " + (isActive ? "active" : "") + " " + (isWiggling ? "active-wiggle" : "")}
                                style={{
                                  opacity: (!hoveredZone || isActive) ? 1 : 0.25,
                                  pointerEvents: (!hoveredZone || isActive) ? "auto" : "none",
                                  transition: "opacity 0.3s ease"
                                }}
                                onMouseEnter={() => {
                                  setHoveredZone(zoneName);
                                  if (pin.label) {
                                    setHoveredPinLabel(pin.label);
                                  }
                                }}
                                onMouseLeave={() => {
                                  setHoveredZone(null);
                                  setHoveredPinLabel(null);
                                }}
                              >
                                <circle 
                                  cx={pin.x} 
                                  cy={pin.y} 
                                  r={1.8 / zoomScale} 
                                  fill="none" 
                                  stroke={colorObj.hex} 
                                  strokeWidth={0.5 / zoomScale} 
                                  className="map-pin-pulse" 
                                />
                                <circle 
                                  cx={pin.x} 
                                  cy={pin.y} 
                                  r={0.5 / zoomScale} 
                                  fill={colorObj.hex} 
                                  stroke="#fff" 
                                  strokeWidth={0.2 / zoomScale} 
                                />
                                
                                <image
                                  href={markerUrl}
                                  x={pin.x - w / 2}
                                  y={pin.y - h / 2}
                                  width={w}
                                  height={h}
                                  preserveAspectRatio="xMidYMidMeet"
                                  style={{ cursor: "pointer" }}
                                />

                                {isActive && (
                                  <g style={{ pointerEvents: "none" }}>
                                    <rect 
                                      x={pin.x - (labelText.length * 1.8 + 2) / zoomScale} 
                                      y={pin.y + (baseH / 2 + 1.0) / zoomScale} 
                                      width={(labelText.length * 3.6 + 4) / zoomScale} 
                                      height={3.2 / zoomScale} 
                                      rx={1.6 / zoomScale} 
                                      fill="rgba(15, 23, 42, 0.95)" 
                                      stroke="rgba(255, 255, 255, 0.15)" 
                                      strokeWidth={0.3 / zoomScale} 
                                    />
                                    <text 
                                      x={pin.x} 
                                      y={pin.y + (baseH / 2 + 2.6) / zoomScale} 
                                      className="map-pin-label" 
                                      dominantBaseline="middle" 
                                      style={{ fontSize: (2.0 / zoomScale) + "px", fill: "#fff", textAnchor: "middle", fontWeight: "bold" }}
                                    >
                                      {labelText}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          });
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

                    {/* Marker Selector for Selected Zone */}
                    {selectedDrawZone && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          📌 สัญลักษณ์มาร์คเกอร์สำหรับ "{selectedDrawZone}":
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <img
                            src={getZoneMarkerUrl(selectedDrawZone)}
                            alt="Preview"
                            style={{
                              width: "24px",
                              height: "32px",
                              objectFit: "contain",
                              borderRadius: "4px",
                              background: "rgba(255,255,255,0.05)",
                              padding: "2px",
                              flexShrink: 0
                            }}
                          />
                          <select
                            value={getZoneMarker(selectedDrawZone)}
                            onChange={(e) => updateZoneMarker(selectedDrawZone, e.target.value)}
                            className="search-input"
                            style={{ padding: "6px 10px", fontSize: "0.75rem", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", flex: 1 }}
                          >
                            {getAvailableMarkers().map(marker => (
                              <option key={marker.id} value={marker.id} style={{ background: "#0f172a", color: "#fff" }}>
                                {marker.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Custom Marker Manager and Upload */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                        📁 อัปโหลดสัญลักษณ์มาร์คเกอร์ใหม่:
                      </label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          type="text"
                          id="new-marker-name-input"
                          placeholder="ชื่อจุดมาร์คเกอร์ เช่น จุดสตอรี่..."
                          className="search-input"
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            background: "rgba(15,23,42,0.6)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            width: "100%"
                          }}
                        />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="file"
                            id="new-marker-file-input"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              const nameInput = document.getElementById("new-marker-name-input") as HTMLInputElement;
                              const name = nameInput?.value?.trim() || "";
                              
                              if (!file) return;
                              if (!name) {
                                showToast("กรุณากรอกชื่อสัญลักษณ์มาร์คเกอร์ก่อนค่ะ", "error");
                                e.target.value = "";
                                return;
                              }

                              try {
                                const formData = new FormData();
                                formData.append("cover", file);
                                formData.append("isMarker", "true");
                                formData.append("markerName", name);

                                const res = await fetch("/api/rules/upload-cover", {
                                  method: "POST",
                                  body: formData
                                });
                                const data = await res.json();
                                if (data.success) {
                                  showToast("อัปโหลดมาร์คเกอร์สำเร็จแล้วค่ะ", "success");
                                  if (data.rules) {
                                    setEditedRules(data.rules);
                                    setRules(data.rules);
                                  }
                                  nameInput.value = "";
                                  e.target.value = "";
                                } else {
                                  showToast(data.error || "เกิดข้อผิดพลาดในการอัปโหลด", "error");
                                }
                              } catch (err) {
                                console.error(err);
                                showToast("อัปโหลดไม่สำเร็จค่ะ", "error");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById("new-marker-file-input")?.click()}
                            className="editor-btn editor-btn-outline"
                            style={{ flex: 1, fontSize: "0.72rem", padding: "6px 8px", justifyContent: "center" }}
                          >
                            📤 เลือกไฟล์ภาพ
                          </button>
                        </div>
                      </div>

                      {/* List of Custom Markers */}
                      {(() => {
                        const medCat = (isEditMode ? editedRules : rules)?.categories.find(c => c.id === "medical_fees") as any;
                        const customMarkers = medCat?.custom_markers || [];
                        if (customMarkers.length === 0) return null;
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", padding: "6px", maxHeight: "120px", overflowY: "auto", marginTop: "4px" }}>
                            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 600 }}>รายการมาร์คเกอร์ที่อัปโหลด:</span>
                            {customMarkers.map((marker: any) => (
                              <div key={marker.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", padding: "3px 4px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <img src={marker.url} alt="Marker" style={{ width: "16px", height: "24px", objectFit: "contain" }} />
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-primary)" }}>{marker.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: "ยืนยันการลบมาร์คเกอร์",
                                      message: `คุณแน่ใจหรือไม่ว่าต้องการลบมาร์คเกอร์ "${marker.name}"? โซนที่ผูกกับมาร์คเกอร์นี้จะเปลี่ยนไปใช้มาร์คเกอร์หลัก`,
                                      confirmText: "ลบ",
                                      cancelText: "ยกเลิก",
                                      variant: "danger"
                                    });
                                    if (!confirmed) return;

                                    try {
                                      const formData = new FormData();
                                      formData.append("isMarker", "true");
                                      formData.append("deleteMarker", "true");
                                      formData.append("markerId", marker.id);

                                      const res = await fetch("/api/rules/upload-cover", {
                                        method: "POST",
                                        body: formData
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        showToast("ลบมาร์คเกอร์เรียบร้อยแล้วค่ะ", "success");
                                        if (data.rules) {
                                          setEditedRules(data.rules);
                                          setRules(data.rules);
                                        }
                                      } else {
                                        showToast(data.error || "เกิดข้อผิดพลาด", "error");
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      showToast("ลบไม่สำเร็จค่ะ", "error");
                                    }
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    fontSize: "0.72rem",
                                    padding: "2px 4px"
                                  }}
                                  title="ลบสัญลักษณ์นี้"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                            🔴 คลิกจุด (Click)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDrawMode("pencil");
                              setSelectedVertexIndex(null);
                            }}
                            className={"editor-btn editor-btn-outline " + (drawMode === "pencil" ? "active" : "")}
                            style={{ flex: 1, justifyContent: "center", fontSize: "0.68rem" }}
                          >
                            ✏️ ดินสอขีดอิสระ (Pencil)
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawMode("pin");
                            setSelectedVertexIndex(null);
                          }}
                          className={"editor-btn editor-btn-outline " + (drawMode === "pin" ? "active" : "")}
                          style={{ width: "100%", justifyContent: "center", fontSize: "0.68rem" }}
                        >
                          📍 ปักหมุด/ป้ายชื่อโซน (Pin)
                        </button>
                      </div>
                    </div>

                    {/* Pin Labels Manager */}
                    {drawMode === "pin" && selectedDrawZone && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", textAlign: "left" }}>
                        <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>🏷️ ป้ายชื่อหมุดย่อย ({selectedDrawZone}):</label>
                        {(() => {
                          const pins = getZonePinsList(selectedDrawZone);
                          if (pins.length === 0) {
                            return <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>ยังไม่มีการปักหมุดในโซนนี้</p>;
                          }
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                              {pins.map((pin, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", flexShrink: 0, width: "70px" }}>หมุดที่ {idx + 1} ({pin.x.toFixed(0)},{pin.y.toFixed(0)})</span>
                                  <input
                                    type="text"
                                    value={pin.label || ""}
                                    onChange={(e) => {
                                      const updatedPins = pins.map((p, i) => i === idx ? { ...p, label: e.target.value } : p);
                                      updatePinCoords(selectedDrawZone, updatedPins);
                                    }}
                                    placeholder="ป้ายชื่อ เช่น ภูเขาสูง"
                                    className="search-input"
                                    style={{ flex: 1, padding: "4px 8px", fontSize: "0.72rem", background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", color: "#fff" }}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Snapping Control */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", marginTop: "4px" }}>
                      <input
                        type="checkbox"
                        id="snap-enabled"
                        checked={snapEnabled}
                        onChange={(e) => setSnapEnabled(e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                      <label 
                        htmlFor="snap-enabled" 
                        style={{ fontSize: "0.68rem", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}
                      >
                        🧲 เปิดใช้งาน Magnet Snap (หรือกดปุ่ม Shift ค้างไว้ขณะลาก/ปักจุด)
                      </label>
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
                      {(drawMode === "polygon" || drawMode === "pencil") && (
                        <button
                          type="button"
                          onClick={handleUndoPoint}
                          className="editor-btn editor-btn-outline"
                          style={{ flex: drawMode === "polygon" ? "1 0 calc(50% - 4px)" : "1 0 100%", justifyContent: "center" }}
                          title="ลบจุดล่าสุดที่วาด"
                        >
                          ↩️ ย้อนกลับ 1 จุด
                        </button>
                      )}
                      {(drawMode === "polygon" || drawMode === "pencil") && (
                        <button
                          type="button"
                          onClick={handleAutoClipOverlaps}
                          className="editor-btn editor-btn-outline"
                          style={{ 
                            flex: drawMode === "polygon" ? "1 0 calc(50% - 4px)" : "1 0 100%", 
                            justifyContent: "center", 
                            color: "var(--accent)",
                            borderColor: "rgba(var(--accent-rgb), 0.35)",
                            boxShadow: "0 0 8px rgba(var(--accent-rgb), 0.15)"
                          }}
                          title="คำนวณลบเขตที่ทับซ้อนกับโซนอื่นออกอัตโนมัติ"
                        >
                          ✂️ ตัดพื้นที่ทับซ้อนอัตโนมัติ
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
                          💡 <strong>คู่มือคลิกจุดพิกัด (Polygon Click):</strong>
                          <ul style={{ margin: "4px 0 0 0", paddingLeft: "14px" }}>
                            <li>คลิกแผนที่เพื่อเพิ่มจุดพิกัดเชื่อมเส้นขอบ</li>
                            <li><strong>จุดจะดูดติด (Snap)</strong> พิกัดโซนอื่นเมื่อเปิด Magnet Snap หรือกด <code>Shift</code>/<code>Ctrl</code> ค้างไว้</li>
                            <li>คลิกลากที่จุดพิกัดเพื่อย้ายตำแหน่งพิกัด (รองรับการดูดติดแม่เหล็กเช่นกัน)</li>
                            <li>ดับเบิ้ลคลิกเพื่อลบจุด</li>
                          </ul>
                        </span>
                      ) : drawMode === "pencil" ? (
                        <span>
                          💡 <strong>คู่มือลากเขียนอิสระ (Pencil):</strong>
                          <ul style={{ margin: "4px 0 0 0", paddingLeft: "14px" }}>
                            <li>กดเมาส์ค้างไว้แล้ว **ลากวาดเขียนไปตามขอบแผนที่** ได้อิสระ</li>
                            <li>เมื่อปล่อยเมาส์ ระบบจะแปลงแนวเส้นเป็นพิกัดโซนและลดจุดส่วนเกินออกให้พอดี</li>
                            <li>จุดจะดูดติดพิกัดรอยต่อโซนอื่นเมื่อเปิด Magnet Snap หรือกด <code>Shift</code>/<code>Ctrl</code> ค้างไว้</li>
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

      {/* Changelog Update Modal Notification */}
      {showChangelogModal && rules?.latestChangelog?.changes && mounted && createPortal(
        <div className="rules-modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="rules-modal-container" style={{ maxWidth: "620px", width: "90vw", border: "1px solid var(--border-glow)", boxShadow: "0 0 30px var(--accent-glow)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, var(--accent) 0%, rgba(15,23,42,0.95) 100%)",
              padding: "24px",
              borderBottom: "1px solid var(--border-subtle)",
              position: "relative"
            }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                📢 อัปเดตกฎระเบียบแพทย์ล่าสุด!
              </h3>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>
                อัปเดตเมื่อ: {new Date(rules.latestChangelog.timestamp).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })} น.
              </p>
            </div>

            {/* Content Body */}
            <div style={{
              padding: "24px",
              maxHeight: "60vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "rgba(15,23,42,0.6)"
            }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                โปรดอ่านและทำความเข้าใจการเปลี่ยนแปลงข้อตกลงกฎระเบียบแพทย์ด้านล่างนี้ เพื่อประโยชน์ในการปฏิบัติหน้าที่อย่างถูกต้องและป้องกันการละเมิดกฎ:
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Group changes by categoryName */}
                {Object.entries(
                  rules.latestChangelog.changes.reduce<Record<string, typeof rules.latestChangelog.changes>>((acc, change) => {
                    const cat = change.categoryName || "ทั่วไป";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(change);
                    return acc;
                  }, {})
                ).map(([categoryName, catChanges]) => (
                  <div key={categoryName} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: "bold", color: "var(--accent-light)", display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                      📁 หมวดหมู่: {categoryName}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {catChanges.map((change, idx) => {
                        const isAdded = change.type === "added";
                        const isDeleted = change.type === "deleted";
                        const isModified = change.type === "modified";

                        let badgeColor = "rgba(16, 185, 129, 0.18)";
                        let badgeBorder = "rgba(16, 185, 129, 0.3)";
                        let badgeText = "#10b981";
                        let labelText = "🟢 เพิ่มเติม";
                        let cardBg = "rgba(16, 185, 129, 0.02)";

                        if (isDeleted) {
                          badgeColor = "rgba(239, 68, 68, 0.18)";
                          badgeBorder = "rgba(239, 68, 68, 0.3)";
                          badgeText = "#ef4444";
                          labelText = "🔴 ยกเลิก/ลบออก";
                          cardBg = "rgba(239, 68, 68, 0.02)";
                        } else if (isModified) {
                          badgeColor = "rgba(59, 130, 246, 0.18)";
                          badgeBorder = "rgba(59, 130, 246, 0.3)";
                          badgeText = "#3b82f6";
                          labelText = "🔵 แก้ไขกฎ";
                          cardBg = "rgba(59, 130, 246, 0.02)";
                        }

                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              background: cardBg,
                              border: `1px solid ${badgeBorder}`,
                              borderRadius: "var(--radius-md)",
                              padding: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}
                          >
                            <div>
                              <span style={{ 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                fontSize: "0.62rem", 
                                fontWeight: "bold",
                                background: badgeColor,
                                border: `1px solid ${badgeBorder}`,
                                color: badgeText
                              }}>
                                {labelText}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
                              {isModified ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <div style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                                    เดิม: {formatRuleDisplay(change.oldText || "")}
                                  </div>
                                  <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                                    ใหม่: {formatRuleDisplay(change.newText || "")}
                                  </div>
                                </div>
                              ) : isDeleted ? (
                                <div style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>
                                  {formatRuleDisplay(change.oldText || "")}
                                </div>
                              ) : (
                                <div style={{ color: "var(--text-primary)" }}>
                                  {formatRuleDisplay(change.newText || "")}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="rules-modal-footer" style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 24px", display: "flex", justifyContent: "center", background: "rgba(15,23,42,0.95)" }}>
              <button 
                onClick={handleAcknowledgeChangelog}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 0", fontSize: "0.88rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
              >
                🤝 รับทราบและเข้าใจกฎระเบียบแพทย์
              </button>
            </div>

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
