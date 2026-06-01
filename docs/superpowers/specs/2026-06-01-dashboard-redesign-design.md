# Design Spec: Global Dashboard & Layout Redesign

Goal: Redesign the layout shell (`src/app/dashboard/layout.tsx`), the desktop sidebar navigation (`src/components/Sidebar.tsx`), and the main clock-in page (`src/app/dashboard/page.tsx`) to match the premium dark-slate medical dashboard mockup styling. Omit non-existent database properties (such as level/XP or fix schedules) and substitute them with actual active weekly hours and bonus metrics.

---

## 🎨 Global Design & Theme System

We will implement a premium human-designed developer platform style using a dark-slate color palette:
- **Backgrounds:** `#030712` (page viewport) and `#090f1d` (cards/panels).
- **Accents:** Dynamic CSS variable-based accents with glowing border effects (`color-mix` with `--accent`).
- **Typography:** Outfit font pairing with JetBrains Mono for times and metrics.
- **Glassmorphism:** Subtly layered glass panels (`backdrop-filter: blur(12px)`) with fine `1px` borders.

---

## 🏗️ Layout & Sidebar Shell Architecture

### 1. Sidebar Navigation (`src/components/Sidebar.tsx`)
- **Header:** Branded title "MEDICAL SERVICE FIVEM" with the medical cross shield logo.
- **Menu Sections:**
  - Group links under **MAIN MENU** (หน้าหลัก, ข่าวสาร & ประกาศ, ระบบ OP, ตรวจสอบ Blacklist, เข้า-ออกเวร, รายชื่อแพทย์, กฎระเบียบ) and **SYSTEM** (แดชบอร์ดผู้ดูแล, ตั้งค่าระบบ) using outline Lucide icons.
- **User Profile Footer:**
  - Masked circular avatar.
  - Username and active rank badge.
  - **Weekly Hours Progress Bar:** Displays `ชั่วโมงสะสมสัปดาห์นี้: X / 20 ชม.` (representing progress toward the weekly bonus threshold) with an active accent-colored progress bar, replacing the mockup Level/XP bar.
  - Standard Logout button.

### 2. Top Header Bar (`src/app/dashboard/layout.tsx`)
- Add a sticky header panel across the top of the viewport.
- Render:
  - Page title breadcrumb indicator.
  - Notification icon (with red badge).
  - Mail/Message icon (with badge).
  - Live clock and calendar widget (Bangkok timezone).
  - Light/Dark mode toggle (cosmetic moon icon).

---

## 📊 Clock-In Dashboard Redesign (`src/app/dashboard/page.tsx`)

The dashboard content area is structured into a grid format matching the mockup:

### 1. Row 1: Active Clock-in Card (2/3 width) & Weekly Bonus Card (1/3 width)
- **Clock-In Card:**
  - Displays current active status (`● กำลังปฏิบัติหน้าที่` in green or `● ยังไม่ได้เข้าเวร` in gray).
  - Split layout with side-by-side action buttons:
    - **เข้าเวร (Clock In):** Pulsing green button with hover scaling.
    - **ออกเวร (Clock Out):** Grayed out or styled active when clocked in.
  - Informative banner on the bottom: `ℹ️ กรุณาอยู่ในโรงพยาบาลและพร้อมปฏิบัติงานก่อนกดเข้าเวร`.
  - Location subtitle on bottom-right: `ตำแหน่งปัจจุบัน: Pillbox Hill Medical Center`.
  - Pending-proof screenshot upload form is seamlessly integrated inside this glass panel.
- **Weekly Bonus Card:**
  - Displays real-time estimated weekly payouts, e.g.:
    - อัตราค่าจ้าง: `X IC / ชม.` (based on rank).
    - ยอดเงินโบนัสสะสม: `Y IC` (calculated from clocked hours).
    - วันเข้าเวรครบเกณฑ์: `Z วัน` (days meeting the 3-hour minimum).
  - Includes a shortcut button to view the full bonus spreadsheet.

### 2. Row 2: Stats Metric Badges (5-Column flex list)
- Displays compact card badges showing:
  - เวลาเข้างานล่าสุด (Latest clock-in date & time).
  - เวลาออกงานล่าสุด (Latest clock-out date & time).
  - รวมเวลาปฏิบัติงานวันนี้ (Today's active hours).
  - รวมเวลาปฏิบัติงานสัปดาห์นี้ (Weekly hours).
  - เป้าหมายขั้นต่ำ (Bonus hours remaining or threshold banner).

### 3. Row 3: Shifts Table (2/3 width) & Roster + Shortcuts (1/3 width)
- **Shifts Table:**
  - High-fidelity logs table listing: วันที่, เข้าเวร, ออกเวร, รวมเวลา, สถานะ.
  - Includes a dropdown selector to filter logs by month.
  - Bottom pagination controls (`แสดง 1 ถึง 5 จาก X รายการ`).
- **เพื่อนร่วมเวร (On-Duty Roster):**
  - Renders list of online doctors currently clocked in.
  - Shows names, ranks, and green pulsing ONLINE status dots.
- **เมนูลัด (Quick Shortcuts):**
  - A grid of 6 icon buttons linking to existing systems:
    - ตารางเวร OP (`/dashboard/op`)
    - โบนัสของฉัน (`/dashboard/my-bonus`)
    - ประวัติสะสม (`/dashboard/history`)
    - ข้อความประกาศ (`/dashboard/announcements`)
    - กฎระเบียบแพทย์ (`/dashboard/rules`)
    - อันดับสัปดาห์นี้ (`/dashboard/ranking`)

---

## 🔬 Verification Plan
- Run `npm run build` to confirm compilation is 100% successful with zero linting/Typescript errors.
- Manually inspect desktop viewport to verify layout ratios, alignment, and responsiveness.
