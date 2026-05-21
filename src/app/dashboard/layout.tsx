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

  // Determine if the user is an OP for today and fetch theme settings
  const user = session.user as any;
  let isOp = user.role === "admin";
  const discordUsername = user.discordUsername;
  let logoUrl = "";

  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["op_schedule", "theme_logo_url"]);

    const settings = (settingsData || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    if (settings.theme_logo_url) {
      logoUrl = settings.theme_logo_url;
    }

    if (!isOp && discordUsername && settings.op_schedule) {
      // Calculate current day of the week in GMT+7
      const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = dayNames[thaiTime.getUTCDay()];

      const todayOPs = settings.op_schedule[currentDay] || [];
      isOp = todayOPs.includes(discordUsername);
    }
  } catch (err) {
    console.error("[DashboardLayout OP/Logo Check] Error:", err);
  }

  const userWithOp = {
    ...session.user,
    isOp,
  };

  return (
    <div className="app-layout">
      <Sidebar user={userWithOp as any} logoUrl={logoUrl} />
      <main className="main-content">{children}</main>
      <MobileNav user={userWithOp as any} />
    </div>
  );
}
