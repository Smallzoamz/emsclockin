# Custom Confirm Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native browser `confirm()` calls with a beautifully styled, custom Centered Glassmorphic Modal Dialog utilizing React Context and React Portal.

**Architecture:** Create a React Context-based `ConfirmProvider` Client Component that exposes a `useConfirm` hook returning a promise. The overlay is rendered using `createPortal` to `document.body` for stacking context isolation.

**Tech Stack:** React, Next.js (App Router), TypeScript, Tailwind/Vanilla CSS

---

### Task 1: Append Global Styles for Custom Confirm Dialog

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append CSS class overrides for the dialog styling**  
  Add the dialog layout, theme variants, buttons, and animations at the end of the file.

  ```css
  /* ===== Custom Confirm Dialog ===== */
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 7, 15, 0.75);
    backdrop-filter: blur(12px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    padding: 20px;
    animation: fadeIn 0.2s ease-out;
  }

  .confirm-modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 440px;
    padding: 24px;
    box-shadow: var(--shadow-elevated);
    animation: confirmModalShow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }

  .confirm-modal.variant-primary {
    border-color: var(--border-glow);
    box-shadow: var(--shadow-glow);
  }
  .confirm-modal.variant-danger {
    border-color: rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.15);
  }
  .confirm-modal.variant-warning {
    border-color: rgba(245, 158, 11, 0.4);
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.15);
  }
  .confirm-modal.variant-success {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.15);
  }
  .confirm-modal.variant-info {
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.15);
  }

  .confirm-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .confirm-icon {
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .confirm-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .confirm-message {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 24px;
    white-space: pre-wrap;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .confirm-actions .btn {
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .confirm-btn-cancel {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }
  .confirm-btn-cancel:hover {
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--border-glow);
  }

  .confirm-btn-submit.variant-primary {
    background: var(--accent);
    color: white;
  }
  .confirm-btn-submit.variant-primary:hover {
    background: var(--accent-light);
    box-shadow: var(--shadow-glow);
  }

  .confirm-btn-submit.variant-danger {
    background: var(--danger);
    color: white;
  }
  .confirm-btn-submit.variant-danger:hover {
    background: #f87171;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
  }

  .confirm-btn-submit.variant-warning {
    background: var(--warning);
    color: black;
  }
  .confirm-btn-submit.variant-warning:hover {
    background: #fbbf24;
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
  }

  .confirm-btn-submit.variant-success {
    background: var(--accent);
    color: white;
  }
  .confirm-btn-submit.variant-success:hover {
    background: var(--accent-light);
    box-shadow: var(--shadow-glow);
  }

  .confirm-btn-submit.variant-info {
    background: var(--info);
    color: white;
  }
  .confirm-btn-submit.variant-info:hover {
    background: #60a5fa;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
  }

  @keyframes confirmModalShow {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  ```

- [ ] **Step 2: Save and verify no syntax errors in CSS**

---

### Task 2: Create ConfirmProvider Component

**Files:**
- Create: `src/components/ConfirmProvider.tsx`

- [ ] **Step 1: Write the React Context implementation with React Portal**  
  Implement client-side confirm dialog context, options parsing, key listener support (optional close on escape/backdrop click), and variants configuration.

  ```tsx
  "use client";

  import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
  import { createPortal } from "react-dom";

  type ConfirmOptions = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success';
  };

  type ConfirmContextType = (options: string | ConfirmOptions) => Promise<boolean>;

  const ConfirmContext = createContext<ConfirmContextType | null>(null);

  export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
      throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
  }

  interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'primary' | 'danger' | 'warning' | 'info' | 'success';
    resolve: (value: boolean) => void;
  }

  const defaultState: ConfirmState = {
    isOpen: false,
    title: "ยืนยันการทำรายการ",
    message: "",
    confirmText: "ตกลง",
    cancelText: "ยกเลิก",
    variant: "primary",
    resolve: () => {}
  };

  export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ConfirmState>(defaultState);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    const confirm = useCallback((options: string | ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        if (typeof options === "string") {
          setState({
            isOpen: true,
            title: "ยืนยันการทำรายการ",
            message: options,
            confirmText: "ยืนยัน",
            cancelText: "ยกเลิก",
            variant: "primary",
            resolve
          });
        } else {
          setState({
            isOpen: true,
            title: options.title || "ยืนยันการทำรายการ",
            message: options.message,
            confirmText: options.confirmText || "ยืนยัน",
            cancelText: options.cancelText || "ยกเลิก",
            variant: options.variant || "primary",
            resolve
          });
        }
      });
    }, []);

    const handleClose = (value: boolean) => {
      state.resolve(value);
      setState(defaultState);
    };

    const getIcon = (variant: string) => {
      switch (variant) {
        case "danger": return "⚠️";
        case "warning": return "📙";
        case "success": return "✅";
        case "info": return "ℹ️";
        default: return "❓";
      }
    };

    // Close on Escape key press
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && state.isOpen) {
          handleClose(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [state.isOpen, state.resolve]);

    return (
      <ConfirmContext.Provider value={confirm}>
        {children}
        {state.isOpen && mounted && createPortal(
          <div className="confirm-backdrop" onClick={() => handleClose(false)}>
            <div className={`confirm-modal variant-${state.variant}`} onClick={(e) => e.stopPropagation()}>
              <div className="confirm-header">
                <span className="confirm-icon">{getIcon(state.variant)}</span>
                <h3 className="confirm-title">{state.title}</h3>
              </div>
              <div className="confirm-message">{state.message}</div>
              <div className="confirm-actions">
                <button className="confirm-btn-cancel btn" onClick={() => handleClose(false)}>
                  {state.cancelText}
                </button>
                <button className={`confirm-btn-submit btn variant-${state.variant}`} onClick={() => handleClose(true)}>
                  {state.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </ConfirmContext.Provider>
    );
  }
  ```

---

### Task 3: Register ConfirmProvider in Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wrap RootLayout contents in ConfirmProvider**  
  Import `ConfirmProvider` from `@/components/ConfirmProvider` and wrap the body's contents.

  ```tsx
  // ... imports
  import { ConfirmProvider } from "@/components/ConfirmProvider";

  // Inside RootLayout children return statement:
  return (
    <html lang="th">
      <head>
        <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      </head>
      <body>
        <ConfirmProvider>
          {logoUrl && (
            // ... logo structure
          )}
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
  ```

---

### Task 4: Replace Confirm Calls in Admin Announcements Page

**Files:**
- Modify: `src/app/dashboard/admin/announcements/page.tsx`

- [ ] **Step 1: Import useConfirm and inject inside component**  
  Add `import { useConfirm } from "@/components/ConfirmProvider";` and call `const confirm = useConfirm();` inside the Page component.
- [ ] **Step 2: Replace confirm in handleDeleteCategory**  
  Update line 168:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันการลบหมวดหมู่ "${name}"? การลบหมวดหมู่อาจทำให้เทมเพลตภายใต้หมวดหมู่นี้ไม่แสดงผล`)) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ยืนยันการลบหมวดหมู่",
    message: `ยืนยันการลบหมวดหมู่ "${name}"? การลบหมวดหมู่อาจทำให้เทมเพลตภายใต้หมวดหมู่นี้ไม่แสดงผล`,
    confirmText: "ลบหมวดหมู่",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```
- [ ] **Step 3: Replace confirm in handleDeleteTemplate**  
  Update line 227:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันต้องการลบเทมเพลต "${title}" หรือไม่?`)) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ยืนยันการลบเทมเพลต",
    message: `ยืนยันต้องการลบเทมเพลต "${title}" หรือไม่?`,
    confirmText: "ลบเทมเพลต",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```
- [ ] **Step 4: Replace confirm in handleDeletePenalty**  
  Update line 283:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันลบโทษแบล็คลิสต์ "${name}" หรือไม่?`)) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ยืนยันการลบโทษแบล็คลิสต์",
    message: `ยืนยันลบโทษแบล็คลิสต์ "${name}" หรือไม่?`,
    confirmText: "ลบข้อมูล",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```

---

### Task 5: Replace Confirm Calls in Admin Page

**Files:**
- Modify: `src/app/dashboard/admin/page.tsx`

- [ ] **Step 1: Import useConfirm and inject inside component**  
  Add import and call hook inside `AdminDashboard`.
- [ ] **Step 2: Replace confirm in handleSyncNicknames**  
  Update line 167:
  ```typescript
  // OLD
  if (!confirm("ยืนยันซิงค์ชื่อเล่นแพทย์ทุกคนผ่านบอท Discord?")) return;

  // NEW
  if (!await confirm({
    title: "🔄 ซิงค์ชื่อเล่นแพทย์",
    message: "ยืนยันซิงค์ชื่อเล่นแพทย์ทุกคนผ่านบอท Discord?",
    confirmText: "ซิงค์ข้อมูล",
    cancelText: "ยกเลิก",
    variant: "warning"
  })) return;
  ```
- [ ] **Step 3: Replace confirm in handleDeleteDoctor**  
  Update line 191:
  ```typescript
  // OLD
  if (!confirm("ต้องการลบแพทย์คนนี้ออกจากรายชื่อลงทะเบียนในระบบหรือไม่? (หากแพทย์ล็อกอินเข้ามาใหม่จะถูกเพิ่มเข้ามาอีกครั้ง)")) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ลบรายชื่อแพทย์",
    message: "ต้องการลบแพทย์คนนี้ออกจากรายชื่อลงทะเบียนในระบบหรือไม่? (หากแพทย์ล็อกอินเข้ามาใหม่จะถูกเพิ่มเข้ามาอีกครั้ง)",
    confirmText: "ยืนยันลบ",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```
- [ ] **Step 4: Replace confirm in handleToggleDuty**  
  Update line 277:
  ```typescript
  // OLD
  if (!confirm(`ยืนยัน${action}?`)) return;

  // NEW
  if (!await confirm({
    title: "💼 ปรับสถานะเวลาเวร",
    message: `ยืนยันต้องการสั่ง${action === "checkin" ? "เข้าเวร" : "ออกเวร"}ให้แพทย์ท่านนี้ใช่หรือไม่?`,
    confirmText: action === "checkin" ? "เข้าเวร" : "ออกเวร",
    cancelText: "ยกเลิก",
    variant: action === "checkin" ? "success" : "danger"
  })) return;
  ```

---

### Task 6: Replace Confirm Calls in Admin Settings Page

**Files:**
- Modify: `src/app/dashboard/admin/settings/page.tsx`

- [ ] **Step 1: Import useConfirm and inject inside AdminSettings**
- [ ] **Step 2: Replace confirm in handleDeleteAccount**  
  Update line 230:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันต้องการลบแอดมิน "${username}" หรือไม่?`)) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ลบบัญชีผู้ดูแล",
    message: `ยืนยันต้องการลบบัญชีผู้ดูแล "${username}" หรือไม่?`,
    confirmText: "ลบบัญชี",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```
- [ ] **Step 3: Replace confirm in handleDeleteDiscordAdmin**  
  Update line 251:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันต้องการลบสิทธิ์แอดมินของ "${displayName}" หรือไม่?`)) return;

  // NEW
  if (!await confirm({
    title: "🗑️ ถอนสิทธิ์ผู้ดูแล Discord",
    message: `ยืนยันต้องการถอนสิทธิ์แอดมินของ "${displayName}" หรือไม่?`,
    confirmText: "ถอนสิทธิ์",
    cancelText: "ยกเลิก",
    variant: "danger"
  })) return;
  ```
- [ ] **Step 4: Replace confirm in handleRemoveLogo**  
  Update line 351:
  ```typescript
  // OLD
  if (!confirm("ยืนยันว่าต้องการลบโลโก้เมืองและกลับไปใช้โลโก้เริ่มต้นของระบบหรือไม่?")) return;

  // NEW
  if (!await confirm({
    title: "🖼️ ลบโลโก้เมือง",
    message: "ยืนยันว่าต้องการลบโลโก้เมืองและกลับไปใช้โลโก้เริ่มต้นของระบบหรือไม่?",
    confirmText: "ลบโลโก้",
    cancelText: "ยกเลิก",
    variant: "warning"
  })) return;
  ```

---

### Task 7: Replace Confirm Call in Announcements Page

**Files:**
- Modify: `src/app/dashboard/announcements/page.tsx`

- [ ] **Step 1: Import useConfirm and inject inside User Announcements Page**
- [ ] **Step 2: Replace confirm in handleRelease (blacklist release)**  
  Update line 331:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันการปลด Blacklist ของ "${record.name}" หรือไม่?`)) return;

  // NEW
  if (!await confirm({
    title: "🕊️ ปลดสิทธิ์แบล็คลิสต์",
    message: `ยืนยันการปลด Blacklist ของ "${record.name}" หรือไม่?`,
    confirmText: "ปลดแบล็คลิสต์",
    cancelText: "ยกเลิก",
    variant: "warning"
  })) return;
  ```

---

### Task 8: Replace Confirm Calls in Weekly Bonus Spreadsheet Page

**Files:**
- Modify: `src/app/dashboard/bonus/page.tsx`

- [ ] **Step 1: Import useConfirm and inject inside BonusPage**
- [ ] **Step 2: Replace confirm in handlePublishBonus**  
  Update line 187:
  ```typescript
  // OLD
  if (!confirm("คุณต้องการประกาศโบนัสสัปดาห์นี้ให้แพทย์ทุกคนทราบใช่หรือไม่?\n(ระบบจะส่งข้อความแจ้งเตือนไปที่ Discord)")) return;

  // NEW
  if (!await confirm({
    title: "📢 ประกาศโบนัสประจำสัปดาห์",
    message: "คุณต้องการประกาศโบนัสสัปดาห์นี้ให้แพทย์ทุกคนทราบใช่หรือไม่?\n(ระบบจะส่งข้อความแจ้งเตือนไปที่ Discord)",
    confirmText: "ยืนยันส่งประกาศ",
    cancelText: "ยกเลิก",
    variant: "success"
  })) return;
  ```
- [ ] **Step 3: Replace confirm in handlePayBonus**  
  Update line 259:
  ```typescript
  // OLD
  if (!confirm(`ยืนยันสั่งจ่ายโบนัส $${bonusAmount.toLocaleString()} ให้ ${customName} ?`)) return;

  // NEW
  if (!await confirm({
    title: "💸 สั่งจ่ายเงินโบนัสแพทย์",
    message: `ยืนยันสั่งจ่ายโบนัส ${bonusAmount.toLocaleString()} IC ให้ ${customName} ใช่หรือไม่?`,
    confirmText: "ยืนยันสั่งจ่าย",
    cancelText: "ยกเลิก",
    variant: "success"
  })) return;
  ```

---

### Verification and Test Step

- [ ] **Step 1: Compile next.js build to check for compilation/typescript errors**  
  Run: `npm run build`  
  Expected output: Compilation success with no TypeScript errors.
