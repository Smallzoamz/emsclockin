# Leave Request & Real-time Notification System Design

Implement a seamless, real-time Leave Request (ลางาน) Ticket system that integrates the Discord bot (`EMSBot`) with the Next.js web application (`Clockin`) via Supabase.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Realtime Replication:** Implementing this system requires enabling PostgreSQL replication for the new `leave_requests` table in the Supabase Dashboard. This cannot be done via SQL scripts alone on some serverless databases, so the owner will need to check the "Realtime" toggle on the table in the Supabase Studio.
> 
> **Audio Autoplay & Permissions:** Standard browsers block autoplay audio unless there has been a user interaction (click/tap) on the page. The system will load and queue the sound triggers, playing them immediately upon the first interaction, and seamlessly for subsequent notifications.
>
> **Desktop Notification Permissions:** Admins will be requested to grant "Desktop Notification" permissions upon loading the dashboard. They must select "Allow" to receive background OS alerts.

---

## Proposed Changes

We will introduce changes to both the Discord bot and the Next.js web application, sharing the same Supabase backend.

```
                  ┌──────────────┐
                  │  EMSBot (JS) │
                  └──────┬───────┘
                         │ 1. Submits leave request
                         ▼
             ┌───────────────────────┐
             │ Supabase (PostgreSQL) │
             │  - leave_requests     │
             └───────────┬───────────┘
                         │ 2. Broadcasts Insert event via Realtime
                         ▼
               ┌───────────────────┐
               │ Next.js Dashboard │
               │  - Admin Client   │
               └───────────────────┘
```

### 1. Database (Supabase)

#### [NEW] `leave_requests` Table
Create a new database table containing the following fields:
* `id` (`uuid`, primary key, defaults to `uuid_generate_v4()`)
* `discord_username` (`text`, required)
* `discord_id` (`text`, required)
* `doctor_name` (`text`, required)
* `leave_type` (`text`, required - `ลาป่วย` | `ลากิจ` | `ลาพักร้อน` | `อื่นๆ`)
* `start_date` (`timestamp with time zone`, required)
* `end_date` (`timestamp with time zone`, required)
* `reason` (`text`, required)
* `proof_image_url` (`text`, nullable)
* `status` (`text`, default `pending`)
* `approved_by` (`text`, nullable)
* `created_at` (`timestamp with time zone`, default `now()`)
* `updated_at` (`timestamp with time zone`, default `now()`)

#### RLS Policies:
* **SELECT:** Users can view their own leave requests (`auth.jwt().email` matching profile). Admins (`role === 'admin'`) can read all records.
* **INSERT:** Any authenticated user or service role (Discord bot) can insert.
* **UPDATE:** Only admins (`role === 'admin'`) can update `status` and `approved_by`.

---

### 2. Discord Bot (`f:\EMSBot`)

#### [NEW] Discord Slash Command `/leave` & "แบบฟอร์มลา" Button handler:
* **Private Thread Creation:** When triggered, the bot automatically creates a private thread or ticket channel named `leave-<username>` visible only to the requesting user and server administrators/moderators.
* **Modal Popup:** Inside the thread, the bot sends a card with a button "กรอกแบบฟอร์ม". Clicking it opens a Modal prompting the doctor for:
  - ประเภทการลา (Dropdown)
  - วันที่เริ่มต้น (e.g. DD/MM/YYYY)
  - วันที่สิ้นสุด (e.g. DD/MM/YYYY)
  - เหตุผล
* **Image Attachment Collector:** When the modal is submitted, the bot creates a pending row in Supabase. It then instructs the user to upload any proof images in the thread. The bot listens to message attachments in that thread, uploads the image (either to Supabase Storage `proofs` bucket or Discord CDN), and updates the database row.

---

### 3. Next.js Web Application (`f:\Clockin`)

#### [MODIFY] [layout.tsx](file:///f:/Clockin/src/app/dashboard/layout.tsx)
Pass the authenticated `user` object to the `<TopHeader />` component:
```diff
-        <TopHeader />
+        <TopHeader user={userWithOp as any} />
```

#### [MODIFY] [TopHeader.tsx](file:///f:/Clockin/src/components/TopHeader.tsx)
* Accept `user` props to determine if the logged-in user has admin privileges (`user?.role === 'admin'`).
* **Supabase Realtime Subscription:** If the user is an admin, subscribe to Supabase Realtime changes on `leave_requests` table (`INSERT` event).
* **Notification Handlers:**
  - **Audio Engine (Web Audio API):** Synthesize a dual-tone chime sound dynamically.
  - **HTML5 Desktop Notification:** Trigger native OS notification alerts with leave request descriptions if browser permission is granted.
  - **Bell Icon Badge:** Keep a reactive count of pending leave requests (`status === 'pending'`) and highlight the bell with a pulsing red badge.
  - **Interactive Dropdown:** Show a list of pending requests directly on bell click, allowing the admin to approve or reject them on the spot, or click to open the full management page.

#### [NEW] [leaves/page.tsx](file:///f:/Clockin/src/app/dashboard/admin/leaves/page.tsx)
* A dedicated dashboard page for admins to manage all leave requests.
* Visual spreadsheet/grid layout using the dark medical design tokens.
* Tab views for Pending, Approved, and Rejected requests.
* Action buttons for approving/rejecting, displaying details, and viewing uploaded certificate images.

#### [MODIFY] [Sidebar.tsx](file:///f:/Clockin/src/components/Sidebar.tsx) & [MobileNav.tsx](file:///f:/Clockin/src/components/MobileNav.tsx)
* Add a navigation link to "/dashboard/admin/leaves" with a calendar/file icon under the "สำหรับผู้ดูแล" (SYSTEM) section.

---

## Verification Plan

### Automated Tests
- Write test scripts in the bot to verify database insertion logic.
- Verify API response endpoints for fetching and updating leave requests.

### Manual Verification
- **Discord interaction:** Click "แบบฟอร์มลา" button, submit the modal, upload a proof image, and confirm that a row is successfully inserted in Supabase.
- **Web Admin Alert:** With the Next.js app open on an admin account, submit a leave request via Discord. Confirm that the bell icon displays a red badge count immediately, a chime sound plays, and a desktop notification pops up.
- **Admin Review:** Click the notification or navigate to the Leave Management page, inspect the uploaded proof image, click "อนุมัติ", and verify that the status changes to `approved` and the Discord bot alerts the doctor.
