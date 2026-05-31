import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { HospitalIcon } from "@/components/Icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  let logoUrl = "";
  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("key", "theme_logo_url")
      .single();

    if (settingsData?.value) {
      logoUrl = settingsData.value;
    }
  } catch (err) {
    console.error("[DashboardLayout Logo Check] Error:", err);
  }

  if (!session?.user) {
    if (pathname === "/dashboard/rules") {
      return (
        <div className="public-layout" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
          <header style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                width: "32px", 
                height: "32px", 
                padding: logoUrl ? "4px" : "0", 
                background: logoUrl ? "var(--bg-glass)" : undefined,
                border: logoUrl ? "1px solid var(--border-subtle)" : undefined,
                borderRadius: logoUrl ? "4px" : undefined
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="City Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <HospitalIcon size={20} style={{ color: "var(--accent)" }} />
                )}
              </div>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", display: "block" }}>EMS Hospital</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>กฏระเบียบและการกู้ชีพ</span>
              </div>
            </div>
            <a 
              href="/" 
              className="btn btn-primary" 
              style={{ fontSize: "0.75rem", padding: "6px 16px", borderRadius: "8px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              เข้าสู่ระบบ / Login
            </a>
          </header>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <main className="main-content" style={{ margin: "0 auto", width: "100%", maxWidth: "1200px", padding: "24px 16px" }}>
              {children}
            </main>
          </div>
        </div>
      );
    }
    redirect("/");
  }

  // Determine if the user is an OP for today and fetch theme settings
  const user = session.user as any;
  let isOp = user.role === "admin";
  const discordUsername = user.discordUsername;

  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .eq("key", "op_schedule")
      .single();

    if (settingsData?.value) {
      const op_schedule = settingsData.value;
      if (!isOp && discordUsername && op_schedule) {
        // Calculate current day of the week in GMT+7
        const thaiTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = dayNames[thaiTime.getUTCDay()];

        const todayOPs = op_schedule[currentDay] || [];
        isOp = todayOPs.includes(discordUsername);
      }
    }
  } catch (err) {
    console.error("[DashboardLayout OP Check] Error:", err);
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
