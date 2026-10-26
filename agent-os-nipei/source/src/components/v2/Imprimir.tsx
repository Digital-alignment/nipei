"use client";


/** Opens the browser's print dialog (there: "Save as PDF"). */
export default function Imprimir({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4">
      <Icone nome="baixar"  tamanho={14} />{label}
    </button>
  );
}
import Icone from "@/components/ds/Icone";
