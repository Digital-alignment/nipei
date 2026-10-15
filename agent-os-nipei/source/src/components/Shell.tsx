"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { MobileNav } from "./Sidebar";
import TopBar from "./TopBar";
import OwnerBanner from "./OwnerBanner";
import MobileFX from "./MobileFX";
import HermesFloatingAssistant from "./HermesFloatingAssistant";
import { INITIAL_MEMBERS } from "@/lib/nipeiStore";

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Enforce Online MVP Access Guard (Super-Users & Squad 1 Liderança)
  useEffect(() => {
    if (pathname === "/login") return;

    try {
      const raw = localStorage.getItem("nipei_current_user");
      if (!raw) {
        // Default to ashuan_web (Dev Master) if first-time load
        const defaultMember =
          INITIAL_MEMBERS.find((m) => m.id === "ashuan_web") || INITIAL_MEMBERS[0];
        if (defaultMember) {
          localStorage.setItem("nipei_current_user", JSON.stringify(defaultMember));
          localStorage.setItem("nipei_selected_member_id", defaultMember.id);
        }
        return;
      }

      const user = JSON.parse(raw);
      const isSuperUser =
        user.globalRole === "SUPER_USER" || user.globalRole === "VETO_APPROVER";
      const isInSquad1 = user.squadAssignments?.some(
        (s: { squadId: string }) => s.squadId === "squad_1_ceo"
      );

      if (!isSuperUser && !isInSquad1) {
        router.push("/login");
      }
    } catch {
      /* fallback */
    }
  }, [pathname, router]);

  // If visiting /login, render clean view without assistant or chrome
  if (pathname === "/login") {
    return (
      <div className="min-h-screen w-full bg-[#050608] text-white overflow-y-auto">
        {children}
      </div>
    );
  }

  // If visiting /mi-portal, render full-width view with Hermes floating assistant
  if (pathname === "/mi-portal" || pathname?.startsWith("/mi-portal")) {
    return (
      <div className="min-h-screen w-full bg-[#050608] text-white overflow-y-auto relative">
        {children}
        <HermesFloatingAssistant />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#050608] text-white relative">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#050608]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-10 py-5 md:py-8 pb-24 md:pb-8">
          <OwnerBanner />
          <TopBar />
          {children}
        </div>
      </main>
      <HermesFloatingAssistant />
      <MobileNav />
      <MobileFX />
    </div>
  );
}
