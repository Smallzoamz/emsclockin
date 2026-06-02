# Leave Request & Real-time Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time Leave Request (ลางาน) Ticket system that connects a Discord bot (`EMSBot`) with a Next.js clock-in system (`Clockin`), triggering audio/visual and desktop browser notifications for admins when a leave request is submitted.

**Architecture:** Doctors submit requests on Discord via a ticket channel; the bot writes requests to a Supabase table. The Next.js dashboard subscribes to Supabase Realtime on the client side, playing a Web Audio chime, showing a red bell badge, and triggering an HTML5 desktop notification for admins. An admin leaves-management page handles approval status updates.

**Tech Stack:** discord.js v14, Next.js 15, Supabase (PostgreSQL, Realtime, RLS), Web Audio API, HTML5 Web Notification API.

---

### Task 1: Supabase Database Setup

**Files:**
- Create: `f:\Clockin\sql\2026-06-02-create-leave-requests.sql`

- [ ] **Step 1: Write SQL migration script**
  Create the `leave_requests` table with fields for doctor details, leave metadata, proof URLs, status, RLS policies, and enable realtime.
  Write code to `f:\Clockin\sql\2026-06-02-create-leave-requests.sql`:
  ```sql
  -- Create leave_requests table
  CREATE TABLE IF NOT EXISTS public.leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discord_username TEXT NOT NULL,
      discord_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      leave_type TEXT NOT NULL CHECK (leave_type IN ('ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'อื่นๆ')),
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      proof_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

  -- Create policies
  CREATE POLICY "Allow select for doctors own leaves" 
      ON public.leave_requests FOR SELECT 
      TO authenticated 
      USING (discord_id = (auth.jwt()->>'sub') OR auth.jwt()->>'role' = 'admin');

  CREATE POLICY "Allow insert for all authenticated and bot service" 
      ON public.leave_requests FOR INSERT 
      TO authenticated, service_role 
      WITH CHECK (true);

  CREATE POLICY "Allow all actions for admin" 
      ON public.leave_requests ALL 
      TO authenticated 
      USING (auth.jwt()->>'role' = 'admin')
      WITH CHECK (auth.jwt()->>'role' = 'admin');

  -- Enable Realtime for the table
  alter publication supabase_realtime add table public.leave_requests;
  ```

- [ ] **Step 2: Run SQL script in Supabase**
  Execute the query. If database client tool is available, execute the query directly, or instruct the user to run it in the SQL Editor of the Supabase dashboard.
  Verify table is created successfully.

- [ ] **Step 3: Commit migration file**
  Run command in `f:\Clockin`:
  ```bash
  git add sql/2026-06-02-create-leave-requests.sql; git commit -m "db: create leave_requests table and policies"
  ```

---

### Task 2: Discord Bot (`EMSBot`) Leave Command and Ticket Flow

**Files:**
- Create: `f:\EMSBot\src\lib\supabase.ts`
- Create: `f:\EMSBot\src\handlers\leave.ts`
- Modify: `f:\EMSBot\src\index.ts`
- Create: `f:\EMSBot\tests\leave.test.ts`

- [ ] **Step 1: Write mock test for leave ticket creation**
  Write a test file `f:\EMSBot\tests\leave.test.ts` verifying modal inputs parse correctly and database helper maps inputs to Supabase columns correctly.
  ```typescript
  import { test } from "node:test";
  import assert from "node:assert";

  test("should parse date range from input correctly", () => {
    const parseDates = (dateStr: string) => {
      const parts = dateStr.split("-").map(p => p.trim());
      if (parts.length !== 2) throw new Error("Invalid format");
      return { start: parts[0], end: parts[1] };
    };
    const res = parseDates("02/06/2026 - 03/06/2026");
    assert.strictEqual(res.start, "02/06/2026");
    assert.strictEqual(res.end, "03/06/2026");
  });
  ```

- [ ] **Step 2: Run test to make sure it runs**
  Run command in `f:\EMSBot`:
  ```bash
  npm test
  ```
  Expected: PASS

- [ ] **Step 3: Implement Supabase Client in EMSBot**
  Write code to `f:\EMSBot\src\lib\supabase.ts`:
  ```typescript
  import { createClient } from "@supabase/supabase-js";
  import dotenv from "dotenv";
  dotenv.config();

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in EMSBot");
  }

  export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  ```

- [ ] **Step 4: Implement Leave Ticket interaction handlers**
  Create `f:\EMSBot\src\handlers\leave.ts` to handle:
  - Interaction "แบบฟอร์มลา" button click: Creates a private thread.
  - Sending "กรอกแบบฟอร์ม" button in that thread.
  - Opens a Modal for date ranges, leave type, and reason.
  - Listen to submission, inserts a row into `leave_requests` table.
  - Listens to photo attachments in that thread, uploads them (or stores direct link), and updates the row.
  - Listens to status updates in Supabase Realtime to update the thread (optional, done via standard DB fetch).

- [ ] **Step 5: Bind interaction handlers in entry point**
  Modify `f:\EMSBot\src\index.ts` to register the button click handlers and modal submission events.
  Verify typescript compile passes:
  ```bash
  npm run build
  ```
  Expected: Success

- [ ] **Step 6: Commit EMSBot changes**
  Run command in `f:\EMSBot`:
  ```bash
  git add .; git commit -m "feat: add leave ticket interaction flow and supabase client in EMSBot"
  ```

---

### Task 3: Next.js Layout User Prop & Real-Time Header Bell Alert

**Files:**
- Modify: `f:\Clockin\src\app\dashboard\layout.tsx`
- Modify: `f:\Clockin\src\components\TopHeader.tsx`

- [ ] **Step 1: Pass User object to TopHeader**
  Modify `f:\Clockin\src\app\dashboard\layout.tsx:129` to feed the `user` session prop to `<TopHeader />`:
  ```tsx
  <TopHeader user={userWithOp as any} />
  ```

- [ ] **Step 2: Add Real-time Bell features to TopHeader.tsx**
  Modify `f:\Clockin\src\components\TopHeader.tsx` to:
  - Accept `user` prop.
  - Query current pending leave requests in a `useEffect` hook:
    ```typescript
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    ```
  - Hook up Supabase Realtime subscription on `leave_requests` INSERT event if `user?.role === 'admin'`.
  - On notification trigger:
    1. Synthesize audio chime using Web Audio API.
    2. Check browser Notification permissions and fire a desktop browser notification.
    3. Push the new request to `pendingLeaves` state.
  - Render the bell icon with `pendingLeaves.length` count badge.
  - Clicking the bell toggles a floating dropdown showing the requests list with an "อนุมัติทันที" button.
  Write a Web Audio chime synthesizer helper inside `TopHeader.tsx`:
  ```typescript
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 100);
    } catch (e) {
      console.warn("AudioContext blocked or failed: ", e);
    }
  };
  ```

- [ ] **Step 3: Run typescript check to verify compiles**
  Run command in `f:\Clockin`:
  ```bash
  npm run build
  ```
  Expected: Passed with 0 errors.

- [ ] **Step 4: Commit Clockin Header changes**
  Run command in `f:\Clockin`:
  ```bash
  git add src/app/dashboard/layout.tsx src/components/TopHeader.tsx; git commit -m "feat: integrate realtime leave notifications, audio chime and browser desktop alerts in TopHeader"
  ```

---

### Task 4: Leave Management Dashboard & Sidebar Links

**Files:**
- Create: `f:\Clockin\src\app\dashboard\admin\leaves\page.tsx`
- Modify: `f:\Clockin\src\components\Sidebar.tsx`
- Modify: `f:\Clockin\src\components\MobileNav.tsx`

- [ ] **Step 1: Create Dedicated Leaves page**
  Create `f:\Clockin\src\app\dashboard\admin\leaves\page.tsx` displaying all leaves with tab filter (pending, approved, rejected) and actions (Approve, Reject, view certificate modal, details). Use confirm provider `useConfirm` hook to confirm actions.
  Use full medical styling (tokens, glass, glow borders, responsive grids).

- [ ] **Step 2: Add Link to Sidebar & MobileNav**
  Modify `f:\Clockin\src\components\Sidebar.tsx` and `f:\Clockin\src\components\MobileNav.tsx` to include leaves management link visible to admins under "สำหรับผู้ดูแล" section.

- [ ] **Step 3: Run Next.js production build check**
  Run command in `f:\Clockin`:
  ```bash
  npm run build
  ```
  Expected: Success compile with zero type errors.

- [ ] **Step 4: Commit Dashboard leaves page changes**
  Run command in `f:\Clockin`:
  ```bash
  git add .; git commit -m "feat: build leaves management page and sidebar navigation links"
  ```
