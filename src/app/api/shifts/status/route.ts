import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { runNicknameSync } from "@/app/api/op/sync-nicknames/route";

export const dynamic = "force-dynamic";

let isAutoSyncing = false;

interface RegisteredDoctor {
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  rank?: string;
}

interface ShiftItem {
  id: string | number;
  user_email: string;
  user_name?: string | null;
  clock_in: string;
  clock_out?: string | null;
}

interface BlacklistRecord {
  id: string | number;
  name?: string | null;
  phone?: string | null;
  gang?: string | null;
  penalty?: string | null;
  fine?: number | null;
  multiplier?: number | null;
  created_at: string;
  created_by?: string | null;
}

interface ActivityLog {
  id: string;
  text: string;
  timestamp: string;
  type: "in" | "out" | "blacklist";
}

export async function GET() {
  const session = await auth();
  const userEmail = session?.user?.email;

  try {
    // 1. Fetch all active shifts (public data)
    const { data: activeShifts } = await supabase
      .from("shifts")
      .select("id, user_email, clock_in, user_name")
      .eq("status", "active")
      .order("clock_in", { ascending: true });

    // 2. Fetch registered doctors, recruitment quota, nickname mode, and last sync timestamp
    const { data: settingsRows } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["registered_doctors", "recruitment_quota", "op_nickname_mode", "last_nickname_sync_time", "user_ranks", "doctor_ranks"]);

    const registeredDoctors = settingsRows?.find(r => r.key === "registered_doctors")?.value || [];
    const recruitmentQuota = settingsRows?.find(r => r.key === "recruitment_quota")?.value || {
      target: 30,
      current: 22,
      batch: 15,
      end_date: "2026-06-15T23:59:59+07:00"
    };
    const opNicknameMode = settingsRows?.find(r => r.key === "op_nickname_mode")?.value || "manual";
    const lastNicknameSyncTime = settingsRows?.find(r => r.key === "last_nickname_sync_time")?.value || "0";
    const userRanks = settingsRows?.find(r => r.key === "user_ranks")?.value || {};
    const doctorRanks = settingsRows?.find(r => r.key === "doctor_ranks")?.value || [];

    // Passive background auto-sync check (Throttled to 5 minutes)
    const now = Date.now();
    const lastSyncTimeNum = Number(lastNicknameSyncTime) || 0;
    if (opNicknameMode === "discord" && !isAutoSyncing && (now - lastSyncTimeNum > 5 * 60 * 1000)) {
      isAutoSyncing = true;
      (async () => {
        try {
          // Immediately upsert to prevent concurrent executions from other requests/containers
          await supabase
            .from("system_settings")
            .upsert({ key: "last_nickname_sync_time", value: String(now), updated_at: new Date().toISOString() });

          console.log("[Auto-Sync] Starting background nickname sync...");
          const res = await runNicknameSync();
          console.log("[Auto-Sync] Background nickname sync completed:", res.message);
        } catch (err) {
          console.error("[Auto-Sync] Background nickname sync failed:", err);
        } finally {
          isAutoSyncing = false;
        }
      })();
    }


    // Map to public output
    const activeDoctors = ((activeShifts as unknown as ShiftItem[]) || []).map((shift: ShiftItem) => {
      const doctor = (registeredDoctors as RegisteredDoctor[]).find((d: RegisteredDoctor) => d.email === shift.user_email);
      // Resolve rank from user_ranks + doctor_ranks
      const userRankId = (userRanks as Record<string, string>)[shift.user_email];
      const rankObj = (doctorRanks as Array<{id: string; name: string}>).find(r => r.id === userRankId);
      const resolvedRank = rankObj?.name || doctor?.rank || "นร.แพทย์";
      return {
        name: doctor?.name || shift.user_name || "แพทย์ประจำการ",
        avatarUrl: doctor?.avatarUrl || null,
        rank: resolvedRank,
        clockIn: shift.clock_in
      };
    });

    // 3. Fetch completed shifts for recent CAD logs
    const { data: recentCompleted } = await supabase
      .from("shifts")
      .select("id, user_email, user_name, clock_in, clock_out")
      .eq("status", "completed")
      .order("clock_out", { ascending: false })
      .limit(5);

    // 4. Fetch recent blacklist logs
    const { data: recentBlacklists } = await supabase
      .from("blacklist_records")
      .select("id, name, phone, gang, penalty, fine, multiplier, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(5);

    // 5. Calculate start of current week (Monday at 00:00:00 BKK) to query weekly total shifts count
    const nowBkk = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const day = nowBkk.getDay(); // 0 Sunday, 1 Monday, ...
    const diff = nowBkk.getDate() - day + (day === 0 ? -6 : 1);
    const mondayBkk = new Date(nowBkk.setDate(diff));
    mondayBkk.setHours(0, 0, 0, 0);
    const startOfWeekISO = mondayBkk.toISOString();

    const { count: weeklyShiftsCount } = await supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .gte("clock_in", startOfWeekISO);

    // 6. Compile real-time CAD activity feed logs
    const activityList: ActivityLog[] = [];

    ((activeShifts as unknown as ShiftItem[]) || []).forEach((shift: ShiftItem) => {
      const doctor = (registeredDoctors as RegisteredDoctor[]).find((d: RegisteredDoctor) => d.email === shift.user_email);
      const name = doctor?.name || shift.user_name || "แพทย์ประจำการ";
      activityList.push({
        id: `in_${shift.id || shift.clock_in}`,
        text: `🚑 แพทย์ ${name} ขึ้นเวรกู้ชีพฉุกเฉิน (Clock-in)`,
        timestamp: shift.clock_in,
        type: "in"
      });
    });

    ((recentCompleted as unknown as ShiftItem[]) || []).forEach((shift: ShiftItem) => {
      const doctor = (registeredDoctors as RegisteredDoctor[]).find((d: RegisteredDoctor) => d.email === shift.user_email);
      const name = doctor?.name || shift.user_name || "แพทย์ประจำการ";
      activityList.push({
        id: `out_${shift.id || shift.clock_out}`,
        text: `🔴 แพทย์ ${name} ลงเวรปฏิบัติหน้าที่ (Clock-out)`,
        timestamp: shift.clock_out || "",
        type: "out"
      });
    });

    ((recentBlacklists as unknown as BlacklistRecord[]) || []).forEach((bl: BlacklistRecord) => {
      const targetName = bl.name || bl.gang || "บุคคลนิรนาม";
      activityList.push({
        id: `bl_${bl.id || bl.created_at}`,
        text: `🚫 ติดแบล็กลิสต์: ${targetName} ข้อหา ${bl.penalty}`,
        timestamp: bl.created_at,
        type: "blacklist"
      });
    });

    // Sort by timestamp descending
    activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivity = activityList.slice(0, 6);

    const stats = {
      totalDoctors: registeredDoctors.length,
      weeklyShifts: weeklyShiftsCount || 0
    };

    // Construct the recent shifts log (active + completed) for landing page log table
    const completedDoctors = ((recentCompleted as unknown as ShiftItem[]) || []).map((shift: ShiftItem) => {
      const doctor = (registeredDoctors as RegisteredDoctor[]).find((d: RegisteredDoctor) => d.email === shift.user_email);
      // Resolve rank from user_ranks + doctor_ranks
      const userRankId = (userRanks as Record<string, string>)[shift.user_email];
      const rankObj = (doctorRanks as Array<{id: string; name: string}>).find(r => r.id === userRankId);
      const resolvedRank = rankObj?.name || doctor?.rank || "นร.แพทย์";
      return {
        id: shift.id,
        name: doctor?.name || shift.user_name || "แพทย์ประจำการ",
        avatarUrl: doctor?.avatarUrl || null,
        rank: resolvedRank,
        clockIn: shift.clock_in,
        clockOut: shift.clock_out || null,
        status: "completed"
      };
    });

    const activeDoctorsList = ((activeShifts as unknown as ShiftItem[]) || []).map((shift: ShiftItem) => {
      const doctor = (registeredDoctors as RegisteredDoctor[]).find((d: RegisteredDoctor) => d.email === shift.user_email);
      // Resolve rank from user_ranks + doctor_ranks
      const userRankId = (userRanks as Record<string, string>)[shift.user_email];
      const rankObj = (doctorRanks as Array<{id: string; name: string}>).find(r => r.id === userRankId);
      const resolvedRank = rankObj?.name || doctor?.rank || "นร.แพทย์";
      return {
        id: shift.id,
        name: doctor?.name || shift.user_name || "แพทย์ประจำการ",
        avatarUrl: doctor?.avatarUrl || null,
        rank: resolvedRank,
        clockIn: shift.clock_in,
        clockOut: null,
        status: "active"
      };
    });

    const recentShiftsList = [...activeDoctorsList, ...completedDoctors];

    const sanitizedDoctors = (registeredDoctors as RegisteredDoctor[]).map((d: RegisteredDoctor) => {
      const userRankId = (userRanks as Record<string, string>)[d.email || ""];
      const rankObj = (doctorRanks as Array<{id: string; name: string}>).find(r => r.id === userRankId);
      return {
        name: d.name || "แพทย์ประจำการ",
        avatarUrl: d.avatarUrl || null,
        rank: rankObj?.name || d.rank || "นร.แพทย์"
      };
    });

    // 7. If authenticated, fetch their personal active/pending shifts
    if (userEmail) {
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .eq("status", "active")
        .maybeSingle();

      const { data: pendingShift } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_email", userEmail)
        .eq("status", "pending_proof")
        .maybeSingle();

      return NextResponse.json({
        isOnDuty: !!activeShift,
        activeShift: activeShift || null,
        pendingProofShift: pendingShift || null,
        activeCount: activeDoctors.length,
        activeDoctors,
        recentActivity,
        recentShifts: recentShiftsList,
        stats,
        recruitmentQuota,
        userRanks,
        doctorRanks,
        registeredDoctors: sanitizedDoctors
      });
    }

    // 8. If not authenticated, return public counts, roster, CAD operations and stats
    return NextResponse.json({
      isOnDuty: false,
      activeShift: null,
      pendingProofShift: null,
      activeCount: activeDoctors.length,
      activeDoctors,
      recentActivity,
      recentShifts: recentShiftsList,
      stats,
      recruitmentQuota,
      userRanks,
      doctorRanks,
      registeredDoctors: sanitizedDoctors
    });
  } catch (error) {
    console.error("[Shift Status GET] Error:", error);
    return NextResponse.json({
      isOnDuty: false,
      activeShift: null,
      pendingProofShift: null,
      activeCount: 0,
      activeDoctors: [],
      recentActivity: [],
      stats: { totalDoctors: 0, weeklyShifts: 0 },
      recruitmentQuota: { target: 30, current: 22, batch: 15, end_date: "2026-06-15T23:59:59+07:00" },
      registeredDoctors: []
    });
  }
}
