import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { supabase } from "@/lib/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Determine if the user is an OP for today
  const user = session.user as any;
  let isOp = user.role === "admin";
  const discordUsername = user.discordUsername;

  if (!isOp && discordUsername) {
    try {
      const { data: scheduleData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "op_schedule")
        .single();

      if (scheduleData?.value) {
        // Calculate current day of the week in GMT+7
        const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = dayNames[thaiTime.getUTCDay()];

        const todayOPs = scheduleData.value[currentDay] || [];
        isOp = todayOPs.includes(discordUsername);
      }
    } catch (err) {
      console.error("[DashboardLayout OP Check] Error:", err);
    }
  }

  const userWithOp = {
    ...session.user,
    isOp,
  };

  return (
    <div className="app-layout">
      <Sidebar user={userWithOp as any} />
      <main className="main-content">{children}</main>
      <MobileNav user={userWithOp as any} />
    </div>
  );
}
