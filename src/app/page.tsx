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

  let logoUrl = "";
  try {
    const { data: logoSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "theme_logo_url")
      .single();
    if (logoSetting?.value) {
      logoUrl = logoSetting.value;
    }
  } catch (err) {
    console.error("[LoginPage Logo Fetch] Error:", err);
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
    />
  );
}
