"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { MobileNav } from "./Sidebar";
import TopBar from "./TopBar";
import OwnerBanner from "./OwnerBanner";
import MobileFX from "./MobileFX";
import HermesFloatingAssistant from "./HermesFloatingAssistant";
import { INITIAL_MEMBERS } from "@/lib/nipeiStore";

const V2_PATHS = ["/hoje", "/agenda", "/equipes", "/projetos", "/objetivos", "/pessoas", "/tarefas", "/legacy", "/cadastro", "/financas", "/acervo", "/eventos", "/conhecimento", "/diagnosticos", "/pulso", "/oauth", "/privacidade", "/controle"]; // /oauth + /privacidade: standalone pages; /controle: admin panel (v2 chrome)

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The real access check is server-side (src/proxy.ts). This only seeds the v1 profile
  // for pages opened without going through /login (the login page sets the real one).
  useEffect(() => {
    if (pathname === "/login") return;
    try {
      if (!localStorage.getItem("nipei_current_user")) {
        const fallback = INITIAL_MEMBERS.find((m) => m.id === "ashuan_web") || INITIAL_MEMBERS[0];
        if (fallback) {
          localStorage.setItem("nipei_current_user", JSON.stringify(fallback));
          localStorage.setItem("nipei_selected_member_id", fallback.id);
        }
      }
    } catch {
      /* storage blocked */
    }
  }, [pathname]);

  // v2 pages and the login bring their own chrome (src/app/(v2)/layout.tsx)
  if (pathname === "/login" || V2_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"))) {
    return <>{children}</>;
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
