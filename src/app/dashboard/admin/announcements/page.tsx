"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAnnouncementsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the merged announcements page
    router.replace("/dashboard/announcements");
  }, [router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text-secondary)" }}>
      กำลังเปลี่ยนเส้นทาง...
    </div>
  );
}
