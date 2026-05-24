"use client";

import { useState, useEffect } from "react";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);

  // UI/Loading States
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Active Tab/Selection
  const [activeTab, setActiveTab] = useState<"templates" | "categories" | "penalties">("templates");

  // Form States - Category
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Form States - Template
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [tempCatId, setTempCatId] = useState("");
  const [tempContent, setTempContent] = useState("");

  // Form States - Penalty
  const [newPenName, setNewPenName] = useState("");
  const [newPenFine, setNewPenFine] = useState<number>(0);

  useEffect(() => {
    // Auth Guard check
    getSession().then((session) => {
      const user = session?.user as any;
      if (user && user.role === "admin") {
        setIsAdmin(true);
        setLoadingAuth(false);
      } else {
        router.replace("/dashboard");
      }
    });

    // Fetch Announcement Settings
    fetch("/api/announcements/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.templates) setTemplates(data.templates);
        if (data.penalties) setPenalties(data.penalties);
        setLoadingData(false);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        setLoadingData(false);
      });
  }, [router]);

  // Helper: show transient message
  const showMessage = (msg: string, type: "success" | "error") => {
    setStatusMessage({ message: msg, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Helper: Persist key-value to server
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

  // Category Actions
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    const newId = "cat_" + Date.now();
    const newCategory: Category = {
      id: newId,
      name: newCatName,
      description: newCatDesc
    };

    const updated = [...categories, newCategory];
    setCategories(updated);
    setNewCatName("");
    setNewCatDesc("");

    await saveSetting("announcement_categories", updated, "เพิ่มหมวดหมู่เรียบร้อยแล้ว");
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบหมวดหมู่ "${name}"? การลบหมวดหมู่อาจทำให้เทมเพลตภายใต้หมวดหมู่นี้ไม่แสดงผล`)) return;

    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);

    await saveSetting("announcement_categories", updated, "ลบหมวดหมู่เรียบร้อยแล้ว");
  };

  // Template Actions
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempTitle || !tempCatId || !tempContent) {
      alert("กรุณากรอกข้อมูลเทมเพลตให้ครบถ้วน");
      return;
    }

    let updated: Template[];
    if (editingTemplateId) {
      // Edit
      updated = templates.map((t) =>
        t.id === editingTemplateId
          ? { ...t, categoryId: tempCatId, title: tempTitle, content: tempContent }
          : t
      );
      showMessage("ปรับปรุงเทมเพลตสำเร็จ (อย่าลืมคลิกบันทึกหลักหากระบบไม่ได้ออโต้เซฟ)", "success");
    } else {
      // Add
      const newTemplate: Template = {
        id: "tpl_" + Date.now(),
        categoryId: tempCatId,
        title: tempTitle,
        content: tempContent
      };
      updated = [...templates, newTemplate];
    }

    setTemplates(updated);
    // Clear forms
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
    if (!confirm(`ยืนยันต้องการลบเทมเพลต "${title}" หรือไม่?`)) return;

    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);

    if (editingTemplateId === id) {
      handleCancelEdit();
    }

    await saveSetting("announcement_templates", updated, "ลบเทมเพลตประกาศเรียบร้อยแล้ว");
  };

  // Penalty Actions
  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPenName || newPenFine < 0) return;

    const newPenalty: Penalty = {
      id: "pen_" + Date.now(),
      name: newPenName,
      fine: Number(newPenFine)
    };

    const updated = [...penalties, newPenalty];
    setPenalties(updated);
    setNewPenName("");
    setNewPenFine(0);

    await saveSetting("blacklist_penalties", updated, "เพิ่มโทษสำเร็จรูปเรียบร้อยแล้ว");
  };

  const handleDeletePenalty = async (id: string, name: string) => {
    if (!confirm(`ยืนยันลบโทษแบล็คลิสต์ "${name}" หรือไม่?`)) return;

    const updated = penalties.filter((p) => p.id !== id);
    setPenalties(updated);

    await saveSetting("blacklist_penalties", updated, "ลบโทษสำเร็จรูปเรียบร้อยแล้ว");
  };

  if (loadingAuth) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text-secondary)" }}>
        กำลังยืนยันสิทธิ์แอดมิน...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>📢 ตั้งค่าระบบประกาศ & Blacklist</h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>จัดการหมวดหมู่ รูปแบบเทมเพลตประกาศ และอัตราโทษปรับ Blacklist</p>
        </div>
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
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          transition: "all 0.3s"
        }}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: "4px", paddingBottom: "1px" }}>
        <button
          onClick={() => setActiveTab("templates")}
          style={{
            padding: "10px 20px",
            background: activeTab === "templates" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "templates" ? "var(--accent-light)" : "var(--text-secondary)",
            border: "1px solid transparent",
            borderBottomColor: activeTab === "templates" ? "var(--bg-secondary)" : "transparent",
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.9rem",
            marginBottom: "-1px",
            borderStyle: activeTab === "templates" ? "solid solid none solid" : "none",
            borderColor: activeTab === "templates" ? "var(--border)" : "transparent"
          }}
        >
          📝 รูปแบบเทมเพลตประกาศ
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          style={{
            padding: "10px 20px",
            background: activeTab === "categories" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "categories" ? "var(--accent-light)" : "var(--text-secondary)",
            border: "1px solid transparent",
            borderBottomColor: activeTab === "categories" ? "var(--bg-secondary)" : "transparent",
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.9rem",
            marginBottom: "-1px",
            borderStyle: activeTab === "categories" ? "solid solid none solid" : "none",
            borderColor: activeTab === "categories" ? "var(--border)" : "transparent"
          }}
        >
          📂 หมวดหมู่ประกาศ
        </button>
        <button
          onClick={() => setActiveTab("penalties")}
          style={{
            padding: "10px 20px",
            background: activeTab === "penalties" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "penalties" ? "var(--accent-light)" : "var(--text-secondary)",
            border: "1px solid transparent",
            borderBottomColor: activeTab === "penalties" ? "var(--bg-secondary)" : "transparent",
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.9rem",
            marginBottom: "-1px",
            borderStyle: activeTab === "penalties" ? "solid solid none solid" : "none",
            borderColor: activeTab === "penalties" ? "var(--border)" : "transparent"
          }}
        >
          ⚖️ โทษปรับ Blacklist สำเร็จรูป
        </button>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>กำลังโหลดข้อมูลระบบประกาศ...</div>
      ) : (
        <div style={{ minHeight: "500px" }}>
          
          {/* TAB 1: TEMPLATES CONFIG */}
          {activeTab === "templates" && (
            <div style={{ display: "flex", gap: "24px", flexDirection: "column" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
                
                {/* Left Side: Create / Edit Template Form */}
                <form onSubmit={handleSaveTemplate} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                    {editingTemplateId ? "✏️ แก้ไขรูปแบบประกาศ" : "✨ เพิ่มรูปแบบประกาศใหม่"}
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หัวข้อของประกาศ</label>
                    <input
                      type="text"
                      placeholder="เช่น ประกาศติด Blacklist บุคคล, หาประวัติไม่เจอ..."
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      required
                      style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>หมวดหมู่ประกาศ</label>
                    <select
                      value={tempCatId}
                      onChange={(e) => setTempCatId(e.target.value)}
                      required
                      style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>โครงสร้างข้อความประกาศ (Template Body)</label>
                    </div>
                    <textarea
                      placeholder={`พิมพ์โครงสร้างข้อความประกาศที่ต้องการโดยใช้ตัวแปรเพื่อเว้นช่องให้แพทย์กรอก เช่น:\n\n**[แบล็คลิสต์]**\nชื่อ: [ชื่อคน]\nเบอร์โทร: [เบอร์โทร]\nสังกัด: [ชื่อแก๊ง]\nความผิด: [โทษ]\nค่าปรับ: [ค่าปรับ] ดับเบิ้ลปรับ x[ตัวคูณ]`}
                      value={tempContent}
                      onChange={(e) => setTempContent(e.target.value)}
                      required
                      rows={8}
                      style={{ padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem", fontFamily: "var(--font-mono)", resize: "vertical", lineHeight: "1.5" }}
                    />
                  </div>

                  {/* Placeholder Cheat Sheet */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "12px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--accent-light)", marginBottom: "6px" }}>💡 โทเค็นตัวแปรที่ระบบรองรับและจะสร้างช่องกรอกอัตโนมัติ:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      <div><code>[ชื่อคน]</code> = ช่องกรอกชื่อคนไข้</div>
                      <div><code>[เบอร์โทร]</code> = ช่องกรอกเบอร์มือถือ</div>
                      <div><code>[ชื่อแก๊ง]</code> = ช่องกรอกชื่อกลุ่ม/แก๊ง</div>
                      <div><code>[โทษ]</code> = Dropdown เลือกโทษสำเร็จรูป</div>
                      <div><code>[ค่าปรับ]</code> = แสดงค่าปรับ (คำนวณตามโทษ & ตัวคูณ)</div>
                      <div><code>[ตัวคูณ]</code> = ช่องระบุจำนวนการทำซ้ำ (ตัวคูณโทษ)</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                    {editingTemplateId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{ padding: "10px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving}
                      style={{ padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                    >
                      {isSaving ? "กำลังบันทึก..." : editingTemplateId ? "💾 อัปเดตข้อมูล" : "➕ เพิ่มเทมเพลต"}
                    </button>
                  </div>
                </form>

                {/* Right Side: List of Templates */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>📋 รูปแบบประกาศปัจจุบัน ({templates.length})</h3>
                  
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
                                <span style={{ fontSize: "0.7rem", background: "rgba(16,185,129,0.15)", color: "var(--accent-light)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                                  {cat?.name || "ไม่ระบุหมวดหมู่"}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleEditClick(tpl)}
                                style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                              >
                                แก้ไข ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                                style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                              >
                                ลบ 🗑️
                              </button>
                            </div>
                          </div>
                          
                          <pre style={{
                            margin: 0,
                            padding: "10px",
                            background: "var(--bg-secondary)",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            border: "1px solid var(--border-subtle)"
                          }}>
                            {tpl.content}
                          </pre>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES CONFIG */}
          {activeTab === "categories" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
              {/* Left Column: Create Form */}
              <form onSubmit={handleAddCategory} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>➕ เพิ่มหมวดหมู่ใหม่</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    placeholder="เช่น Blacklist, หาเคสไม่เจอ, ทั่วไป..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                    style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>คำอธิบายย่อ</label>
                  <input
                    type="text"
                    placeholder="เช่น ประกาศคนร้ายที่ไม่ชุบ, แจ้งเคสติดต่อไม่ได้..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ alignSelf: "flex-end", padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                >
                  {isSaving ? "กำลังบันทึก..." : "➕ บันทึกหมวดหมู่"}
                </button>
              </form>

              {/* Right Column: List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>📁 รายการหมวดหมู่ทั้งหมด ({categories.length})</h3>
                
                {categories.length === 0 ? (
                  <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีหมวดหมู่</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "bold" }}>📁 {cat.name}</h4>
                        {cat.description && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{cat.description}</p>
                        )}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>ID: {cat.id}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
                      >
                        ลบ 🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PENALTIES CONFIG */}
          {activeTab === "penalties" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
              {/* Left Column: Create Form */}
              <form onSubmit={handleAddPenalty} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>➕ เพิ่มความผิด / โทษปรับสำเร็จรูป</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>ประเภทความผิด / โทษข้อหา</label>
                  <input
                    type="text"
                    placeholder="เช่น ทำร้ายร่างกายแพทย์, ขโมยรถพยาบาล..."
                    value={newPenName}
                    onChange={(e) => setNewPenName(e.target.value)}
                    required
                    style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>วงเงินค่าปรับตั้งต้น ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 50000"
                    value={newPenFine || ""}
                    onChange={(e) => setNewPenFine(Number(e.target.value))}
                    required
                    style={{ padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "8px", outline: "none", fontSize: "0.85rem" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ alignSelf: "flex-end", padding: "10px 20px", background: "var(--primary)", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                >
                  {isSaving ? "กำลังบันทึก..." : "➕ บันทึกอัตราโทษ"}
                </button>
              </form>

              {/* Right Column: List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>⚖️ รายการอัตราโทษปรับสำเร็จรูป ({penalties.length})</h3>
                
                {penalties.length === 0 ? (
                  <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>ยังไม่มีรายการตั้งค่าไว้</div>
                ) : (
                  penalties.map((pen) => (
                    <div key={pen.id} className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "bold" }}>⚖️ {pen.name}</h4>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ค่าปรับเริ่มต้น:</span>
                          <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "var(--accent-light)", fontFamily: "var(--font-mono)" }}>
                            ${pen.fine.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePenalty(pen.id, pen.name)}
                        style={{ padding: "6px 12px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
                      >
                        ลบ 🗑️
                      </button>
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
