import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon" style={{ background: logoUrl ? "transparent" : undefined, boxShadow: logoUrl ? "none" : undefined }}>
          {logoUrl ? (
            <img src={logoUrl} alt="City Logo" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
          ) : (
            "🏥"
          )}
        </div>
        <h1 className="login-title">EMS Hospital</h1>
        <p className="login-subtitle">
          ระบบบันทึกเวรสำหรับแพทย์ FiveM<br />
          เข้าเวร · ออกเวร · ติดตามชั่วโมง
        </p>

        {error && (
          <div className="error-banner" style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "0.85rem",
            color: "#fca5a5",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <strong style={{ display: "block", color: "#fca5a5" }}>เข้าสู่ระบบไม่สำเร็จ</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                {error === "AccessDenied" 
                  ? "บัญชี Discord ของคุณไม่ได้อยู่ใน Discord Server แพทย์ที่กำหนด" 
                  : "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"}
              </p>
            </div>
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("admin-login", { 
              username: formData.get("username") as string,
              password: formData.get("password") as string,
              redirectTo: "/dashboard" 
            });
          }}
          style={{ marginBottom: "16px", width: "100%" }}
        >
          <details style={{ width: "100%" }}>
            <summary 
              className="login-btn" 
              style={{ 
                background: "transparent", 
                color: "var(--text-muted)", 
                border: "1px dashed var(--border)", 
                cursor: "pointer",
                listStyle: "none",
                display: "flex",
                justifyContent: "center"
              }}
            >
              🔒 เข้าสู่ระบบสำหรับ Admin
            </summary>
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input 
                type="text" 
                name="username" 
                placeholder="ชื่อผู้ใช้ Admin (เช่น admin)"
                defaultValue="admin"
                required
                style={{ 
                  width: "100%",
                  padding: "10px 14px", 
                  borderRadius: "var(--radius)", 
                  border: "1px solid var(--border)", 
                  background: "var(--bg-dark)",
                  color: "white",
                  outline: "none"
                }} 
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="รหัสผ่าน Admin"
                  required
                  style={{ 
                    flex: 1, 
                    padding: "10px 14px", 
                    borderRadius: "var(--radius)", 
                    border: "1px solid var(--border)", 
                    background: "var(--bg-dark)",
                    color: "white",
                    outline: "none"
                  }} 
                />
                <button 
                  type="submit" 
                  className="login-btn" 
                  style={{ width: "auto", padding: "0 20px", margin: 0 }}
                >
                  เข้าสู่ระบบ
                </button>
              </div>
            </div>
          </details>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="login-btn discord" id="discord-login-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
            </svg>
            เข้าสู่ระบบด้วย Discord
          </button>
        </form>

        <p style={{ marginTop: "24px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
          เชื่อมต่อ Discord เพื่อระบุตัวตนใน log เวร
        </p>
      </div>
    </div>
  );
}
