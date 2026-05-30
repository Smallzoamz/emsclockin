"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

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

  // Helper to highlight matching text
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

  // Filter Categories on the main page
  const filteredCategories = currentRules.categories.filter((cat) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    // Matches category name
    const matchesName = cat.name.toLowerCase().includes(query);
    // Matches any rule inside this category
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
        if (!query || isEditMode) return true; // Show all rules when editing
        return rule.content.toLowerCase().includes(query);
      })
    : [];

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileTextIcon size={28} />
            {isEditMode ? "จัดการกฏระเบียบโฟลเดอร์" : "สารบัญกฏระเบียบแพทย์"}
          </h1>
          <p className="page-desc">
            {isEditMode ? "โหมดแก้ไขหัวข้อและกฏแยกตามแฟ้มเอกสาร" : "คลิกเลือกแฟ้มโฟลเดอร์เพื่อเปิดอ่านกฏระเบียบการกู้ชีพอย่างเป็นทางการ"}
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

      {/* Major Title Banner */}
      <div className="card" style={{ marginBottom: "24px", padding: "16px 24px", background: "linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(12, 18, 32, 0.8) 100%)" }}>
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

      {/* Main Page Search Container */}
      {!isEditMode && (
        <div className="search-container" style={{ marginBottom: "28px" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            placeholder="ค้นหาตามหมวดหมู่ หรือคำสำคัญภายในกฏ..."
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
      )}

      {/* Folders Grid */}
      <div className="folder-grid">
        {filteredCategories.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
            ไม่พบแฟ้มข้อมูลที่ตรงกับคำค้นหาของคุณ
          </div>
        ) : (
          filteredCategories.map((cat) => {
            // Count search query matches inside this category
            const matchingRulesCount = searchQuery.trim()
              ? cat.rules.filter((r) => r.content.toLowerCase().includes(searchQuery.trim().toLowerCase())).length
              : 0;

            return (
              <div
                key={cat.id}
                className="folder-card"
                onClick={() => {
                  if (!isEditMode) {
                    setActiveCategoryId(cat.id);
                  }
                }}
              >
                {/* Folder Top Tab Shape */}
                <div className="folder-tab"></div>
                
                {/* Folder Main Body Card */}
                <div className="folder-body">
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
                        onClick={(e) => e.stopPropagation()} // Prevent trigger focus
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

                  {/* Search query hit tag indicator */}
                  {matchingRulesCount > 0 && (
                    <div style={{ display: "flex", alignSelf: "flex-start", marginTop: "auto" }}>
                      <span className="status-badge on-duty" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                        พบในกฏ {matchingRulesCount} ข้อ
                      </span>
                    </div>
                  )}
                  
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategoryId(cat.id); // Open modal to edit rules inside
                      }}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.72rem", padding: "4px 8px", alignSelf: "flex-end", marginTop: "auto" }}
                    >
                      แก้ไขกฏข้อปฏิบัติ
                    </button>
                  )}
                </div>
              </div>
            );
          })
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
            
            {/* Modal Header */}
            <header className="rules-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {getCategoryIcon(activeCategory.id, 24)}
                <FolderIcon size={24} style={{ color: "var(--warning)", opacity: 0.8 }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {activeCategory.name}
                </h3>
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
                style={{ borderRadius: "50%" }}
                title="ปิด"
              >
                <CrossIcon size={16} />
              </button>
            </header>

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

            {/* Modal Body (Rules List) */}
            <div className="rules-modal-body">
              {filteredRules.length === 0 ? (
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
              )}

              {isEditMode && (
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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </>
  );
}
