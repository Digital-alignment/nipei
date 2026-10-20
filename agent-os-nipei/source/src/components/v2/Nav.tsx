"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, Sun, Target, Users, UsersRound } from "lucide-react";

const ITEMS = [
  { href: "/hoje", key: "hoje", Icon: Sun },
  { href: "/agenda", key: "agenda", Icon: CalendarDays },
  { href: "/equipes", key: "equipes", Icon: UsersRound },
  { href: "/projetos", key: "projetos", Icon: FolderKanban },
  { href: "/objetivos", key: "objetivos", Icon: Target },
  { href: "/pessoas", key: "pessoas", Icon: Users },
] as const;

type Labels = Record<(typeof ITEMS)[number]["key"], string>;

/** Desktop: left rail with all 6. Phone: bottom bar with 5 (Pessoas lives behind the avatar). */
export default function Nav({ labels }: { labels: Labels }) {
  const path = usePathname() ?? "";
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      <nav className="print:hidden hidden md:flex flex-col gap-1 w-52 shrink-0 p-4 border-r border-neutral-200 dark:border-neutral-800">
        {ITEMS.map(({ href, key, Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(href) ? "bg-neutral-100 dark:bg-neutral-800 font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}>
            <Icon size={18} /> {labels[key]}
          </Link>
        ))}
      </nav>
      <nav className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-5 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {ITEMS.slice(0, 5).map(({ href, key, Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-neutral-900 dark:text-white font-semibold" : "text-neutral-500"}`}>
            <Icon size={20} /> {labels[key]}
          </Link>
        ))}
      </nav>
    </>
  );
}
