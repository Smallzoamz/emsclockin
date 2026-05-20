import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS Clock-in | FiveM Hospital",
  description: "ระบบบันทึกเวรสำหรับแพทย์ EMS ใน FiveM — เข้าเวร ออกเวร ติดตามชั่วโมง คำนวณโบนัส",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
