"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession } from "next-auth/react";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  FileTextIcon,
  HospitalIcon,
  StethoscopeIcon,
  FlagIcon,
  ShieldIcon,
  CoinsIcon,
  EditIcon,
  SaveIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  CrossIcon,
  InfoIcon
} from "@/components/Icons";

interface Rule {
  id: string;
  content: string;
}

interface Category {
  id: string;
  name: string;
  rules: Rule[];
}

interface RulesData {
  title: string;
  categories: Category[];
}

export default function RulesPage() {
  const confirm = useConfirm();
  const [rules, setRules] = useState<RulesData | null>(null);
  const [editedRules, setEditedRules] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hospital_area");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
    getSession().then((session) => {
      const user = session?.user as any;
      if (user?.role === "admin") {
        setIsAdmin(true);
      }
      fetchRules();
    });
  }, []);

  const handleToggleEdit = () => {
    if (isEditMode) {
      // Discard changes
      setEditedRules(null);
      setIsEditMode(false);
    } else {
      // Enter edit mode: clone rules
      setEditedRules(JSON.parse(JSON.stringify(rules)));
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

  if (loading && !rules) {
    return <div className="loading-spinner" />;
  }

  const currentRules = isEditMode ? editedRules : rules;
  if (!currentRules) return null;

  const activeCategoryData = currentRules.categories.find(
    (cat) => cat.id === activeCategory
  ) || currentRules.categories[0];

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileTextIcon size={28} />
            {isEditMode ? "ระบบจัดการกฏระเบียบ" : "กฏระเบียบแพทย์"}
          </h1>
          <p className="page-desc">
            {isEditMode ? "โหมดแก้ไขข้อกำหนดและรายละเอียดกฏโรงพยาบาล" : "อ่านและทำความเข้าใจข้อตกลงและกฏระเบียบการกู้ชีพอย่างเคร่งครัด"}
          </p>
        </div>

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

      {/* Major Title Segment */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px 24px", background: "linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(12, 18, 32, 0.8) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: 700 }}>
            หัวข้อใหญ่:
          </span>
          {isEditMode ? (
            <input
              type="text"
              value={currentRules.title}
              onChange={(e) => handleMajorTitleChange(e.target.value)}
              className="rules-textarea"
              style={{ minHeight: "auto", padding: "8px 12px", width: "100%", maxWidth: "400px" }}
              placeholder="หัวข้อใหญ่ประจำหน้ากฏ"
            />
          ) : (
            <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", background: "linear-gradient(135deg, var(--text-primary), var(--accent-light))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {currentRules.title}
            </span>
          )}
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="rules-layout">
        {/* Left Column Tabs */}
        <aside className="rules-sidebar">
          <div className="rules-tab-list">
            {currentRules.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rules-tab ${activeCategory === cat.id ? "active" : ""}`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.name}</span>
                <span className="rules-tab-count">
                  {cat.rules.length} ข้อ
                </span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: "16px", background: "rgba(15, 23, 42, 0.3)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <InfoIcon size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              <strong>คำแนะนำ:</strong> กฏระเบียบถูกแบ่งตามหมวดหมู่ปฏิบัติหน้าที่เพื่อให้ค้นหาได้รวดเร็ว กรุณาปฏิบัติงานในเวรให้ตรงตามหลักเกณฑ์
            </div>
          </div>
        </aside>

        {/* Right Column Content */}
        <main className="card" style={{ padding: "28px" }}>
          {/* Header of Active Subcategory */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {getCategoryIcon(activeCategoryData.id, 24)}
              {isEditMode ? (
                <input
                  type="text"
                  value={activeCategoryData.name}
                  onChange={(e) => handleCategoryNameChange(activeCategoryData.id, e.target.value)}
                  className="rules-textarea"
                  style={{ minHeight: "auto", padding: "6px 12px", width: "260px" }}
                  placeholder="ชื่อหมวดหมู่ย่อย"
                />
              ) : (
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {activeCategoryData.name}
                </h2>
              )}
            </div>
            <span className="status-badge on-duty" style={{ fontSize: "0.7rem", padding: "4px 10px" }}>
              {activeCategoryData.rules.length} กฏระเบียบ
            </span>
          </div>

          {/* Rules List */}
          <div className="rules-list">
            {activeCategoryData.rules.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                ไม่มีข้อมูลกฏระเบียบในหมวดหมู่นี้
              </div>
            ) : (
              activeCategoryData.rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className={isEditMode ? "rule-edit-card" : "rule-item-card"}
                >
                  {isEditMode ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
                        <div className="rule-num-badge">#{idx + 1}</div>
                        
                        {/* Action controllers for reordering and deleting */}
                        <div className="rule-edit-actions">
                          <button
                            type="button"
                            onClick={() => handleMoveRule(activeCategoryData.id, rule.id, "up")}
                            disabled={idx === 0}
                            className="rule-btn-icon"
                            title="เลื่อนขึ้น"
                            style={{ opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? "not-allowed" : "pointer" }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRule(activeCategoryData.id, rule.id, "down")}
                            disabled={idx === activeCategoryData.rules.length - 1}
                            className="rule-btn-icon"
                            title="เลื่อนลง"
                            style={{ opacity: idx === activeCategoryData.rules.length - 1 ? 0.3 : 1, cursor: idx === activeCategoryData.rules.length - 1 ? "not-allowed" : "pointer" }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(activeCategoryData.id, rule.id)}
                            className="rule-btn-icon danger"
                            title="ลบออก"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <textarea
                        value={rule.content}
                        onChange={(e) => handleRuleContentChange(activeCategoryData.id, rule.id, e.target.value)}
                        className="rules-textarea"
                        placeholder="ระบุกฏระเบียบข้อบังคับ..."
                      />
                    </>
                  ) : (
                    <>
                      <div className="rule-num-badge">#{idx + 1}</div>
                      <div className="rule-text-content">{rule.content}</div>
                    </>
                  )}
                </div>
              ))
            )}

            {isEditMode && (
              <button
                type="button"
                onClick={() => handleAddRule(activeCategoryData.id)}
                className="btn-add-rule"
                style={{ marginTop: "8px" }}
              >
                <PlusIcon size={16} />
                เพิ่มข้อปฏิบัติใหม่
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </>
  );
}
