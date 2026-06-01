import type { Metadata } from "next";
import "./globals.css";
import { supabase } from "@/lib/supabase";
import { ConfirmProvider } from "@/components/ConfirmProvider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EMS Clock-in | FiveM Hospital",
  description: "ระบบบันทึกเวรสำหรับแพทย์ EMS ใน FiveM | เข้าเวร ออกเวร ติดตามชั่วโมง คำนวณโบนัส",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let accentColor = "#10b981"; // Default Emerald
  let logoUrl = "";
  let bgOpacity = 0.05;
  let bgStyle = "contain";

  try {
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["theme_accent_color", "theme_logo_url", "theme_bg_opacity", "theme_bg_style"]);

    if (settingsData) {
      settingsData.forEach((item) => {
        if (item.key === "theme_accent_color" && item.value) {
          accentColor = item.value;
        } else if (item.key === "theme_logo_url" && item.value) {
          logoUrl = item.value;
        } else if (item.key === "theme_bg_opacity" && item.value !== undefined) {
          bgOpacity = Number(item.value);
        } else if (item.key === "theme_bg_style" && item.value) {
          bgStyle = item.value;
        }
      });
    }
  } catch (error) {
    console.error("[RootLayout Theme Fetch] Error:", error);
  }

  // Generate dynamic styling override for primary theme tone without literal double hyphens
  const cssVars = {
    [`-${'-accent'}`]: accentColor,
    [`-${'-accent-light'}`]: `color-mix(in srgb, var(-${'-accent'}) 80%, white)`,
    [`-${'-accent-glow'}`]: `color-mix(in srgb, var(-${'-accent'}) 40%, transparent)`,
    [`-${'-border-glow'}`]: `color-mix(in srgb, var(-${'-accent'}) 30%, transparent)`,
    [`-${'-bg-glow-color'}`]: `color-mix(in srgb, var(-${'-accent'}) 6%, transparent)`,
    [`-${'-primary'}`]: `var(-${'-accent'})`,
    [`-${'-primary-light'}`]: `var(-${'-accent-light'})`,
    [`-${'-primary-glow'}`]: `var(-${'-accent-glow'})`,
  } as React.CSSProperties;

  return (
    <html lang="th" style={cssVars}>
      <head />
      <body>
        <ConfirmProvider>
          {logoUrl && (
            <div
              className="theme-bg-logo-container"
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 0,
                opacity: bgOpacity,
              }}
            >
              <img
                src={logoUrl}
                alt="City Background Logo"
                style={{
                  maxWidth: bgStyle === "cover" ? "100%" : "60vw",
                  maxHeight: bgStyle === "cover" ? "100%" : "60vh",
                  width: bgStyle === "cover" ? "100vw" : "auto",
                  height: bgStyle === "cover" ? "100vh" : "auto",
                  objectFit: bgStyle === "cover" ? "cover" : "contain",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </div>
          )}
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
