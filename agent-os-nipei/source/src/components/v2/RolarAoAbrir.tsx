"use client";
import { useEffect } from "react";

/** Scrolls to its parent when the URL hash names `id`: the browser's own jump runs before client tabs mount. */
export default function RolarAoAbrir({ id }: { id: string }) {
  useEffect(() => {
    if (location.hash === `#${id}`) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [id]);
  return null;
}
