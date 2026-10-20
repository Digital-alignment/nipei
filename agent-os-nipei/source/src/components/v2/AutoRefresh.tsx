"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page every few seconds while something is still being processed on the server. */
export default function AutoRefresh({ ativo, ms = 5000 }: { ativo: boolean; ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [ativo, ms, router]);
  return null;
}
