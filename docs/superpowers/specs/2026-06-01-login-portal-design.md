# Design Spec: EMS Central Hospital Portal

A design specification for overhauling the FiveM EMS Clock-in login page into an Official Portal and Staff Gateway. This page acts as a public-facing portal for citizens to view rules, treatment rates, recruitment updates, and blacklist checks, while providing a direct entry point for medical staff.

## 1. Overview
This redesign replaces the simple login box with a premium, split-grid layout:
- **Left Column:** An auto-playing news and recruitment carousel.
- **Right Column:** Operations panel containing live doctor count stats, public resource buttons (rules, fees, blacklist search), and the staff secure login card.

The aesthetic follows **"The Sterile Glass Grid"** design system: a dark slate canvas (`#060a13`) featuring semi-transparent glassmorphic panels, and neon-pulse indicators tied to the active city accent color (`#10b981`).

---

## 2. Layout & Responsive Architecture
- **Desktop (min-width: 1024px):** A two-column grid. The Left Column (slider) takes 55% width, and the Right Column (operations/login) takes 45% width.
- **Tablet (min-width: 768px):** Left and right columns stack vertically.
- **Mobile (width < 768px):** Compact card stacking with responsive padding and downscaled display headings.

---

## 3. Component Details

### A. System Header & Branding
- **Branding logo:** Renders the dynamic city logo loaded from `system_settings` (`theme_logo_url`).
- **Pulse LED:** A small circular tag with `box-shadow` pulse animation representing server connectivity.
- **Hospital Title:** "EMS CENTRAL HOSPITAL" set in bold `Outfit` typography.

### B. Left Column: Announcements & Recruitment Carousel
An interactive carousel that transitions every 5 seconds. Contains 3 slides:
1. **Slide 1: Recruitment Banner (ประกาศรับสมัครแพทย์)**
   - Displays EMS recruitment status (e.g., "เปิดรับสมัครเวรร่วมรุ่นที่ 15" or "ปิดรับสมัครชั่วคราว").
   - Action buttons: "ส่งใบสมัครแพทย์" (external link customizable via settings) and "คุณสมบัติ/คู่มือสมัคร".
2. **Slide 2: Weekly Story Scores (ประกาศคะแนนสตอรี่)**
   - Highlights the latest story match scoreboard (e.g., "EMS vs GANG A | 5 - 3").
3. **Slide 3: General Bulletins (ประกาศสำคัญ)**
   - General alerts or updates from hospital executives.

### C. Right Column: Operations Panel
1. **Live On-Duty Counter:**
   - Displays a dynamic count of doctors currently on shift (fetched from the active shifts database status endpoint `/api/shifts/status`).
   - Styled with a green neon pulse ring when counts > 0.
2. **Public Actions Grid:**
   - **กฎระเบียบแพทย์ (Rules):** Triggers the public rules modal overlay.
   - **อัตราค่ารักษา (Treatment Fees):** Triggers the medical fees map and rates table modal overlay.
   - **ตรวจสอบ Blacklist (Blacklist Lookup):** Triggers a quick search box to lookup blacklisted players.
3. **Staff Gateway Card:**
   - Premium glassmorphic container containing the "Login with Discord" button.
   - An accordion/dropdown for "🔒 Admin Login" for credentials-based admin accounts.

---

## 4. Data Flow & Integration
- **Live On-Duty Counter:** Fetches active shifts on mount via client-side fetch from `/api/shifts/status`.
- **System Settings:** The page loads configurations (branding colors, logo URL, recruitment URLs) dynamically via server-side database select.
- **Public Modals:** Integrates existing rules and fees data from the `/api/rules` database endpoint, rendered in unauthenticated layout views.

---

## 5. Do's and Don'ts

### Do:
- Use Outfit as the sole font family for UI labels and titles.
- Limit animation duration to 200ms on all state transitions (hovers, focus, clicks).
- Use `text-wrap: balance` on headers.

### Don't:
- Do not use text gradients on the portal title or section headers.
- Do not use em-dashes in any portal descriptions or warning tags.
- Do not use border-left colors as accents on widget card containers.
