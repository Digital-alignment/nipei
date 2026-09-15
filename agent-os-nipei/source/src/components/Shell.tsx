import type { ReactNode } from "react";
import Sidebar, { MobileNav } from "./Sidebar";
import TopBar from "./TopBar";
import OwnerBanner from "./OwnerBanner";
import MobileFX from "./MobileFX";

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-10 py-5 md:py-8 pb-24 md:pb-8">
          <OwnerBanner />
          <TopBar />
          {children}
        </div>
      </main>
      <MobileNav />
      <MobileFX />
    </div>
  );
}
