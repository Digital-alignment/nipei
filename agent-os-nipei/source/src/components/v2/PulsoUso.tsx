"use client";

import { useEffect } from "react";

/** Once a minute, while the page is visible and the person did something in the last 2 minutes, counts a minute of use. */
export default function PulsoUso() {
  useEffect(() => {
    let mexeu = Date.now();
    const marcar = () => { mexeu = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    evs.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - mexeu > 120_000) return;
      fetch("/api/uso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caminho: location.pathname }), keepalive: true }).catch(() => {});
    }, 60_000);
    return () => { window.clearInterval(id); evs.forEach((e) => window.removeEventListener(e, marcar)); };
  }, []);
  return null;
}
