"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, Sun, Target, Users, UsersRound } from "lucide-react";

const ITEMS = [
  { href: "/hoje", key: "hoje", Icon: Sun },
  { href: "/agenda", key: "agenda", Icon: CalendarDays },
  { href: "/equipes", key: "equipes", Icon: UsersRound },
  { href: "/projetos", key: "projetos", Icon: FolderKanban },
] as const;
// Sub-pages that live inside a main section (own URL, no slot in the bar; the section stays lit).
const SUB: Record<string, { href: string; key: "objetivos" | "pessoas"; Icon: typeof Target }[]> = {
  "/equipes": [{ href: "/pessoas", key: "pessoas", Icon: Users }],
  "/projetos": [{ href: "/objetivos", key: "objetivos", Icon: Target }],
};

type Labels = Record<(typeof ITEMS)[number]["key"] | "objetivos" | "pessoas", string>;

/** Desktop: left rail (sub-items indented under their section). Phone: bottom bar with the 4 sections. */
export default function Nav({ labels }: { labels: Labels }) {
  const path = usePathname() ?? "";
  const em = (href: string) => path === href || path.startsWith(href + "/");
  const active = (href: string) => em(href) || (SUB[href] ?? []).some((s) => em(s.href));
  return (
    <>
      <nav className="print:hidden hidden md:flex flex-col gap-1 w-52 shrink-0 p-4 border-r border-neutral-200 dark:border-neutral-800">
        {ITEMS.map(({ href, key, Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(href) ? "bg-neutral-100 dark:bg-neutral-800 font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}>
            <Icon size={18} /> {labels[key]}
          </Link>
        )).flatMap((link, i) => [link, ...(SUB[ITEMS[i].href] ?? []).map((s) => (
          <Link key={s.href} href={s.href}
            className={`flex items-center gap-2.5 rounded-lg ml-6 px-3 py-1.5 text-[13px] ${em(s.href) ? "bg-neutral-100 dark:bg-neutral-800 font-semibold" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}>
            <s.Icon size={15} /> {labels[s.key]}
          </Link>
        ))])}
      </nav>
      <nav className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, key, Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-neutral-900 dark:text-white font-semibold" : "text-neutral-500"}`}>
            <Icon size={20} /> {labels[key]}
          </Link>
        ))}
      </nav>
    </>
  );
}
