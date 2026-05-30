"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClockIcon,
  HospitalIcon,
  MegaphoneIcon,
  TrophyIcon,
  ChartBarIcon,
  MoneyIcon,
  CrownIcon,
  CoinsIcon,
  SpeakerIcon,
  SettingsIcon,
  FileTextIcon
} from "./Icons";

export function MobileNav({ user }: { user?: { role?: string; isOp?: boolean; discordId?: string } }) {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {user?.role === "admin" && (
        <Link href="/dashboard/admin" className={pathname === "/dashboard/admin" ? "active" : ""}>
          <CrownIcon size={20} />
          แอดมิน
        </Link>
      )}

      {user?.role === "admin" && !user?.discordId && (
        <Link href="/dashboard/admin/settings" className={pathname === "/dashboard/admin/settings" ? "active" : ""}>
          <SettingsIcon size={20} />
          ตั้งค่า
        </Link>
      )}

      {(user?.role !== "admin" || !!user?.discordId) && (
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
          <ClockIcon size={20} />
          เข้า-ออกเวร
        </Link>
      )}

      <Link href="/dashboard/op" className={pathname === "/dashboard/op" ? "active" : ""}>
        <HospitalIcon size={20} />
        {(user?.isOp || user?.role === "admin") ? "คิว OP" : "เวร OP"}
      </Link>
      <Link href="/dashboard/ranking" className={pathname === "/dashboard/ranking" ? "active" : ""}>
        <TrophyIcon size={20} />
        จัดอันดับ
      </Link>
      <Link href="/dashboard/announcements" className={pathname === "/dashboard/announcements" ? "active" : ""}>
        <MegaphoneIcon size={20} />
        ประกาศ
      </Link>
      <Link href="/dashboard/rules" className={pathname === "/dashboard/rules" ? "active" : ""}>
        <FileTextIcon size={20} />
        กฏแพทย์
      </Link>
      {user?.role === "admin" && (
        <Link href="/dashboard/admin/announcements" className={pathname === "/dashboard/admin/announcements" ? "active" : ""}>
          <SpeakerIcon size={20} />
          คุมประกาศ
        </Link>
      )}
      
      {(user?.role !== "admin" || !!user?.discordId) && (
        <>
          <Link href="/dashboard/history" className={pathname === "/dashboard/history" ? "active" : ""}>
            <ChartBarIcon size={20} />
            ประวัติ
          </Link>
          <Link href="/dashboard/my-bonus" className={pathname === "/dashboard/my-bonus" ? "active" : ""}>
            <MoneyIcon size={20} />
            โบนัสฉัน
          </Link>
        </>
      )}

      {user?.role === "admin" && (
        <Link href="/dashboard/bonus" className={pathname === "/dashboard/bonus" ? "active" : ""}>
          <CoinsIcon size={20} />
          โบนัส
        </Link>
      )}
    </nav>
  );
}
