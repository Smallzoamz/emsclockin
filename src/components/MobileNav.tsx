"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav({ user }: { user?: { role?: string; isOp?: boolean; discordId?: string } }) {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {user?.role === "admin" && (
        <Link href="/dashboard/admin" className={pathname === "/dashboard/admin" ? "active" : ""}>
          <span style={{ fontSize: "1.2rem" }}>👑</span>
          แอดมิน
        </Link>
      )}

      {user?.role === "admin" && !user?.discordId && (
        <Link href="/dashboard/admin/settings" className={pathname === "/dashboard/admin/settings" ? "active" : ""}>
          <span style={{ fontSize: "1.2rem" }}>⚙️</span>
          ตั้งค่า
        </Link>
      )}

      {(user?.role !== "admin" || !!user?.discordId) && (
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
          <span style={{ fontSize: "1.2rem" }}>⏰</span>
          เข้า-ออกเวร
        </Link>
      )}

      <Link href="/dashboard/op" className={pathname === "/dashboard/op" ? "active" : ""}>
        <span style={{ fontSize: "1.2rem" }}>🏥</span>
        {(user?.isOp || user?.role === "admin") ? "คิว OP" : "เวร OP"}
      </Link>
      <Link href="/dashboard/ranking" className={pathname === "/dashboard/ranking" ? "active" : ""}>
        <span style={{ fontSize: "1.2rem" }}>🏆</span>
        จัดอันดับ
      </Link>
      
      {(user?.role !== "admin" || !!user?.discordId) && (
        <>
          <Link href="/dashboard/history" className={pathname === "/dashboard/history" ? "active" : ""}>
            <span style={{ fontSize: "1.2rem" }}>📊</span>
            ประวัติ
          </Link>
          <Link href="/dashboard/my-bonus" className={pathname === "/dashboard/my-bonus" ? "active" : ""}>
            <span style={{ fontSize: "1.2rem" }}>💸</span>
            โบนัสฉัน
          </Link>
        </>
      )}

      {user?.role === "admin" && (
        <Link href="/dashboard/bonus" className={pathname === "/dashboard/bonus" ? "active" : ""}>
          <span style={{ fontSize: "1.2rem" }}>💰</span>
          โบนัส
        </Link>
      )}
    </nav>
  );
}
