import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PortalClient } from "@/components/PortalClient";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const resolvedSearchParams = await searchParams;
  const error = typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : undefined;

  let logoUrl = "/images/logo.png";
  let landingPageData = null;
  
  try {
    // Fetch theme logo and landing page data concurrently
    const [logoRes, landingRes] = await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "theme_logo_url").single(),
      supabase.from("system_settings").select("value").eq("key", "landing_page_data").single()
    ]);

    if (logoRes.data?.value) {
      logoUrl = logoRes.data.value;
    }
    if (landingRes.data?.value) {
      landingPageData = typeof landingRes.data.value === "string"
        ? JSON.parse(landingRes.data.value)
        : landingRes.data.value;
    }
  } catch (err) {
    console.error("[LoginPage Settings Fetch] Error:", err);
  }

  async function handleAdminLogin(formData: FormData) {
    "use server";
    await signIn("admin-login", { 
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard" 
    });
  }

  async function handleDiscordLogin() {
    "use server";
    await signIn("discord", { redirectTo: "/dashboard" });
  }

  return (
    <PortalClient 
      logoUrl={logoUrl} 
      error={error} 
      onAdminLogin={handleAdminLogin} 
      onDiscordLogin={handleDiscordLogin} 
      landingPageData={landingPageData}
    />
  );
}
