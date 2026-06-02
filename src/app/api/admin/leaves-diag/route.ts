import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const user = session?.user as Record<string, any>;

  const diagInfo: any = {
    hasSession: !!session,
    userEmail: user?.email || null,
    userRole: user?.role || null,
    userDiscordId: user?.discordId || null,
    userDiscordUsername: user?.discordUsername || null,
    supabaseEnvUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "present" : "missing",
    supabaseEnvKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing",
  };

  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("id")
      .limit(1);

    if (error) {
      diagInfo.dbError = error.message;
      diagInfo.dbErrorCode = error.code;
    } else {
      diagInfo.dbSuccess = true;
      diagInfo.dbRowsCount = data ? data.length : 0;
    }
  } catch (err: any) {
    diagInfo.dbError = err.message || err.toString();
  }

  return NextResponse.json(diagInfo);
}
