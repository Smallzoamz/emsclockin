# PROJECT_LOG.md — FiveM Doctor Clock-in System

## [2026-05-17 08:45] | File: (multiple) | Keyword: Initial Setup | Status: ✅ Complete | Change: Created full Next.js project with App Router, NextAuth.js (Google + Discord OAuth), Supabase integration, Discord webhook logging, and premium dark medical UI theme.

### Files Created:
- `src/auth.ts` — NextAuth v5 config (Google + Discord providers)
- `src/app/api/auth/[...nextauth]/route.ts` — Auth route handler
- `src/lib/supabase.ts` — Lazy-initialized Supabase client
- `src/lib/discord-webhook.ts` — Discord webhook embed sender
- `src/lib/utils.ts` — Date formatting, duration calc, bonus logic
- `src/app/api/shifts/clock-in/route.ts` — Clock-in API
- `src/app/api/shifts/clock-out/route.ts` — Clock-out API
- `src/app/api/shifts/history/route.ts` — Shift history API
- `src/app/api/shifts/weekly-summary/route.ts` — Weekly aggregation API
- `src/app/api/shifts/status/route.ts` — Active shift status API
- `src/app/globals.css` — Full design system (dark medical premium)
- `src/app/layout.tsx` — Root layout with Thai lang
- `src/app/page.tsx` — Login page (Google + Discord OAuth)
- `src/app/dashboard/layout.tsx` — Dashboard layout with auth guard
- `src/app/dashboard/page.tsx` — Main clock-in/out dashboard
- `src/app/dashboard/history/page.tsx` — Weekly history + chart
- `src/components/Sidebar.tsx` — Navigation sidebar
- `src/components/MobileNav.tsx` — Mobile bottom nav
- `src/components/ClockButton.tsx` — Large clock-in/out button
- `src/components/LiveTimer.tsx` — Real-time elapsed timer
- `src/components/WeeklyChart.tsx` — Weekly hours bar chart
- `src/components/ShiftHistory.tsx` — Shift log table
- `.env.example` — Environment vars template
- `.env.local` — Local env (empty, fill later)

### Build Status: ✅ Passed (Next.js 16.2.6 Turbopack)

## [2026-05-17 09:45] | File: .env.local | Keyword: Fix Supabase URL | Status: ✅ Complete | Change: Changed NEXT_PUBLIC_SUPABASE_URL from postgresql connection string to REST API URL to fix 500 error during clock-in.

## [2026-05-17 10:03] | File: (multiple) | Keyword: Admin & Ranking | Status: ✅ Complete | Change: Removed Google Auth, added Admin Credentials login. Added Weekly Ranking page showing Discord names. Added Admin Dashboard page for overview of all shifts.

## [2026-05-17 10:09] | File: src/app/dashboard/admin/page.tsx | Keyword: Bonus Calculator | Status: ✅ Complete | Change: Added a weekly bonus calculation section to the Admin Dashboard with an editable hourly rate.

## [2026-05-17 10:11] | File: src/app/dashboard/bonus/page.tsx | Keyword: Standalone Bonus Panel | Status: ✅ Complete | Change: Separated the Bonus Calculator into its own dedicated page with a Google Sheets / Excel style grid layout. Updated Sidebar and MobileNav to include the link.

## [2026-05-17 10:16] | File: src/app/dashboard/bonus/page.tsx | Keyword: Bonus History | Status: ✅ Complete | Change: Added date range display for current week. Added 'Save Snapshot' feature to persist the weekly bonus table into Supabase `bonus_history`. Added dropdown to switch between Live Data and historical snapshots.

## [2026-05-17 10:19] | File: src/app/dashboard/bonus/page.tsx | Keyword: Hospital Fund | Status: ✅ Complete | Change: Added Central/Hospital Fund calculation to the Bonus Spreadsheet. Added new input for hospital fund and summary boxes showing deduction and remaining funds. Updated API and DB schema requirements.

## [2026-05-17 10:22] | File: multiple | Keyword: Time Formatting | Status: ✅ Complete | Change: Created `formatHoursToHHMMSS` utility and applied it across all dashboard pages (Bonus, Ranking, Admin, History, Main) to display decimal hours in `HH:MM:SS` format.

## [2026-05-17 10:27] | File: multiple | Keyword: Personal Bonus & Settings | Status: ✅ Complete | Change: Added dynamic bonus threshold setting to Admin Dashboard. Created a 'Share/Publish' workflow to announce bonuses. Built a personalized '/dashboard/my-bonus' page for doctors to securely view their own payout.

## [2026-05-17 10:35] | File: multiple | Keyword: Proof Image Upload | Status: ✅ Complete | Change: Required doctors to upload a screenshot of their shift before clocking out. Uploaded image via API to Supabase `proofs` bucket and saved `proof_image_url` to `shifts` table. Added a Gallery Modal to Admin Dashboard to review these images and verify shifts.

## [2026-05-17 10:41] | File: src/app/dashboard/bonus/page.tsx | Line: 1-560 | Keyword: Custom Ranks & Editable Names | Status: ✅ Complete | Change: Expanded `system_settings` to store `doctor_ranks`, `user_ranks`, and `user_names`. Added a 'Manage Ranks' modal. Updated the Bonus Table to include editable Custom Names and a Rank dropdown per row. Modified bonus calculation to use individual rank rates. Overhauled snapshot system to embed rank info to prevent historical data skew.

## [2026-05-19 04:35] | File: bonus/page.tsx, my-bonus/route.ts | Keyword: Floor Bonus Hours | Status: ✅ Complete | Change: Applied `Math.floor()` to totalHours when calculating bonus amounts. Hours like 27h40m now count as 27h for bonus calculation (fractional minutes are discarded). Affected 5 calculation points: handleSaveSnapshot grandTotal, live totalBonusAll, historical totalBonusAll, per-row baseBonus display, and my-bonus API. Display of actual hours (HH:MM:SS) remains unchanged.

## [2026-05-20 17:43] | File: multiple | Keyword: OP Queue System | Status: ✅ Complete | Change: Implemented a robust doctor queue system (OP Queue Manager) featuring weekly OP schedules with Native HTML5 drag-and-drop organization, automatic doctor registration on login, Discord bot guild nickname synchronizer, editable custom display names, notice board, and rich embedded Discord webhooks. Added new API routes for OP status, queue updates, Discord messaging, and bot syncing, as well as layout authorization guards. Added `DISCORD_OP_WEBHOOK_URL` to separate OP queue reports from standard clock-in/out logs.

## [2026-05-20 17:48] | File: src/app/dashboard/op/page.tsx | Line: 1-125 | Keyword: SessionProvider Runtime Error | Status: ✅ Complete | Change: Replaced client-side `useSession` hook with NextAuth asynchronous `getSession()` inside `useEffect` in the OP Queue page. This fixes the runtime context error "[next-auth]: useSession must be wrapped in a <SessionProvider />" and maintains correct client-side authentication checks.

## [2026-05-20 17:50] | File: src/app/dashboard/op/page.tsx | Line: 60-110 | Keyword: React Key Warning | Status: ✅ Complete | Change: Added strict filtering using `Set` to check for missing and duplicate emails in active and recent shifts list building. This ensures unique key properties for child elements when rendering doctor card arrays, fixing React warning console logs.

## [2026-05-20 17:54] | File: multiple | Line: 1 | Keyword: Single Discord Message Edit Sync | Status: ✅ Complete | Change: Added real-time OP queue synchronization to edit a single, active Discord Webhook message. Implemented a "เปิดเวร OP" / "ปิดเวร OP" toggle button to manage shift state and tag active OPs. Updated doctor clock-in, doctor clock-out, and OP queue updates to automatically PATCH the same Discord message rather than sending spam posts.

## [2026-05-20 17:56] | File: multiple | Line: 1 | Keyword: OP Clock-In Active Guard | Status: ✅ Complete | Change: Implemented a verification check on both client-side and server-side to prevent non-admin OP doctors from opening the OP queue system unless they have an active clocked-in shift.

## [2026-05-20 17:57] | File: src/app/api/shifts/clock-out/route.ts | Line: 39-66 | Keyword: OP Clock-Out Guard | Status: ✅ Complete | Change: Added a validation check in the clock-out API route to prevent scheduled OP doctors from clocking out while the OP queue system is active. They must close the OP first.

## [2026-05-20 18:00] | File: src/app/dashboard/op/page.tsx | Line: 284-360 | Keyword: OP Schedule Read-Only View | Status: ✅ Complete | Change: Replaced the access-denied error screen with a read-only weekly OP schedule table. Normal users can now see which doctor is on OP duty on which day, with today's row highlighted in blue and OP names shown as badges.

## [2026-05-20 18:04] | File: multiple | Line: 1 | Keyword: Absolute Single Discord Message Sync | Status: ✅ Complete | Change: Modified toggle-active API and op-discord-sync module to guarantee that the same Discord message is reused and updated forever. Removed op_discord_message_id deletion on active toggle. Implemented persistent status headers showing active OP tags on every PATCH, and added an automatic fallback mechanism to POST a new message if the existing message was deleted (returning 404/400).

## [2026-05-20 18:18] | File: multiple | Line: 1 | Keyword: OP Assign Case & Re-Case | Status: ✅ Complete | Change: Implemented special queue states (Assign Case and Re-Case) inside the OP doctor queue dashboard. Added green 'รับเคส' and orange 'Re-Case' pulsing animation badges on the UI. Integrated text suffix tags `**(รับเคส)**` and `**(Re-Case)**` to sync automatically with the persistent Discord webhook message. Verified build compatibility and successfully compiled next.js with 0 type errors.

## [2026-05-20 18:25] | File: multiple | Line: 1 | Keyword: OP Teardown & Vacant Update | Status: ✅ Complete | Change: Added forceUpdate flag to syncOpQueueToDiscord. Configured active OP message to display OP name as 'ว่าง' when closed. Implemented teardownOpQueue function which deletes the active Discord queue message, sends a daily summary report of clocked-in and clocked-out doctors, resets op_queue_state to {}, and clears op_discord_message_id. Integrated this teardown process in the clock-out API endpoint when the today's OP doctor clocks out.

## [2026-05-20 18:32] | File: Sidebar.tsx, MobileNav.tsx | Line: 51-59, 25-30 | Keyword: OP Schedule Visible to All Users | Status: ✅ Complete | Change: Removed the isOp guard from the OP navigation link in both Sidebar and MobileNav components. All users can now see and access the OP page — normal users see a read-only weekly schedule table, while OP/Admin users see the full queue management dashboard. Labels dynamically switch between 'ตารางเวร OP' and 'ระบบจัดการคิว OP' based on user role.

## [2026-05-20 18:42] | File: op/page.tsx | Line: 337-357, 654-674 | Keyword: Display Name in OP Schedule | Status: ✅ Complete | Change: Added registeredDoctors state to op/page.tsx. Set registeredDoctors before early authorization check returns to ensure it is available for all users. Looked up doctors' registered names from their Discord usernames to show display names instead of Discord usernames in both weekly schedule tables.

## [2026-05-20 18:55] | File: op/page.tsx | Line: 706-858 | Keyword: Compact DoctorCard layout | Status: ✅ Complete | Change: Replaced the tall column-based DoctorCard layout with a compact row-based flexbox design. Positioned 4 small emoji-based circular button triggers (🟢, 🔄, 🟡, 🔵) next to the doctor's name, reducing card height by 60% and vastly improving screen utilization when many doctors are clocked in.

## [2026-05-21 02:36] | File: multiple | Line: 1 | Keyword: Skipped Timer & Remove Receiving/Story | Status: ✅ Complete | Change: Removed 'รับเคส' (receiving) button and 'สตอรี่' (story) button+column from the OP queue system. Added a live elapsed timer (⏱ MM:SS) that starts counting when a doctor is moved into the 'ข้ามเคส / เหม่อ' (skipped) column. Timer timestamp is stored in opQueueState as 'skipped:epoch' format. Updated Discord sync (op-discord-sync.ts) and send-discord API route to remove story field and receiving suffix. Legacy 'receiving'/'story' values in database are gracefully handled as fallback to 'active'. DoctorCard buttons reduced from 4 (🟢🔄🟡🔵) to 2 (🔄🟡). Build verified: 0 type errors.

## [2026-05-21 02:55] | File: multiple | Line: 1 | Keyword: Restore Story List and Receiving Suffix | Status: ✅ Complete | Change: Restored 'Story List' (🔵) and 'Receiving' (🟢) functionality to the Discord webhook sync and send-discord API route. Instead of discarding these states, the Discord sync library now correctly groups them and posts the '🔵 รายชื่อหมอสตอรี่' embed field and tags the active list with '**(รับเคส)**'. The hide-button logic remains in place: 'รับเคส' (🟢) and 'หมอสตอรี่' (🔵) buttons are hidden exclusively when the doctor is in the 'ข้ามเคส / เหม่อ' (skipped) column to prevent actions, but the lists themselves are fully maintained across the web and Discord interfaces. Verified the build successfully with zero compiler errors.

## [2026-05-21 03:02] | File: op/page.tsx | Line: 925-1020 | Keyword: Remove Skipped and Story Button Shortcuts | Status: ✅ Complete | Change: Removed the 'เหม่อ' (🟡) and 'สตอรี่' (🔵) button shortcuts from the DoctorCard component for all doctors who are not already in those respective queue categories. Since these transitions can be achieved cleanly via drag-and-drop, removing the static shortcut buttons improves visual simplicity and declutters DoctorCards across all lists. DoctorCards in the 'เหม่อ' and 'สตอรี่' lists still retain their respective green return-to-active (🟢) buttons to quickly move them back to the active queue. Verified Next.js build: passed with zero errors.

## [2026-05-21 04:00] | File: op/page.tsx | Line: 829-923 | Keyword: Hide Receiving and Re-Case from Story/Skipped Cards | Status: ✅ Complete | Change: Hidden the 'รับเคส' (🟢) and 'Re-Case' (🔄) buttons from DoctorCards when the doctor is in the 'เหม่อ' (skipped) or 'สตอรี่' (story) queue categories. Doctors in these special categories now only see a single green 'คืนคิวปกติ' (🟢) button to return them to the active queue. This prevents accidental status changes and keeps the card layout clean. Final button layout per column: Active → 🟢🔄, Receiving → ↩️🔄, Re-Case → 🟢↩️, Skipped → 🟢, Story → 🟢. Build verified: 0 type errors.

## [2026-05-21 04:55] | File: multiple | Line: 1 | Keyword: OP Close Teardown & Discord Summary Simplify | Status: ✅ Complete | Change: Modified OP close behavior in three files: (1) `toggle-active/route.ts` — ปิด OP now calls `teardownOpQueue()` instead of `syncOpQueueToDiscord(false, true)`, which deletes the active Discord queue message, sends a summary report, and clears `op_queue_state` + `op_discord_message_id`. (2) `op-discord-sync.ts` — Simplified `teardownOpQueue()` Discord summary to show only doctor names without clock-in/out times or duration details (already available in shift logs). Removed unused `formatDuration` import. (3) `op/page.tsx` — After closing OP, immediately clears all doctor lists (`setDoctors([])`, `setOpQueueState({})`) and calls `fetchOpData()` to refresh UI, ensuring inactive/clocked-out names are also cleared from the dashboard. Build verified: 0 type errors.

## [2026-05-21 05:05] | File: multiple | Line: 1 | Keyword: OP Queue Clock-In Order | Status: ✅ Complete | Change: Added `.order("clock_in", { ascending: true })` to all 3 active shift queries across the codebase: (1) `op/status/route.ts` — API returns activeShifts sorted by clock_in. (2) `op-discord-sync.ts` `syncOpQueueToDiscord()` — Discord queue list follows clock_in order. (3) `op-discord-sync.ts` `teardownOpQueue()` — Summary report follows clock_in order. Frontend `op/page.tsx` preserves this order via `forEach` and `filter` which maintain array ordering. Moving doctors to skipped/story and back to active retains original clock_in position since `moveDoctorCategory` only changes `queueCategory` without reordering the array. Doctors who clock out and re-clock-in get a new clock_in timestamp and appear at the end. Build verified: 0 type errors.

## [2026-05-21 05:30] | File: op/page.tsx | Line: 158-164, 523-640 | Keyword: OP Closed Summary Layout and Grayscale Cards | Status: ✅ Complete | Change: Modified OP closed display behavior on client side: (1) Stopped clearing doctors data locally inside `handleToggleOpActive` to keep data for summary rendering. (2) Replaced workspace 4-column grid with a conditional layout: When `opActive` is true, display the drag-and-drop queue columns. When `opActive` is false, hide the columns completely and render a dedicated summary section. (3) Active doctors in summary are displayed in full green accent border, while clocked-out (completed) doctors are styled with `grayscale(100%)` filter, 55% opacity, and grayscale backgrounds/borders. Build verified: 0 type errors.
