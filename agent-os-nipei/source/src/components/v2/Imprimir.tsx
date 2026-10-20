"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print dialog (there: "Save as PDF"). */
export default function Imprimir({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">
      <Printer size={14} />{label}
    </button>
  );
}
