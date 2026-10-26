"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icone from "@/components/ds/Icone";
import { prazoRapidoAction, setStatusAction } from "@/app/(v2)/actions";
import { aoMudarFila, enviarFila, pendentes } from "@/lib/v2/filaOffline";

/**
 * Registers the service worker, shows "no signal — data from HH:MM" and sends the changes queued
 * offline as soon as the connection is back.
 */
export default function Offline({ gerado, labels }: { gerado: string; labels: { semConexao: string; dadosDe: string; aEnviar: string } }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [fila, setFila] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    const sync = async () => {
      setOnline(navigator.onLine);
      setFila(pendentes().length);
      if (navigator.onLine && pendentes().length) {
        const n = await enviarFila({ status: setStatusAction, prazo: prazoRapidoAction });
        setFila(pendentes().length);
        if (n) router.refresh();
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const off = aoMudarFila(() => setFila(pendentes().length));
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); off(); };
  }, [router]);

  if (online && !fila) return null;
  return (
    <div className="print:hidden mb-3 flex items-center gap-2 rounded-interno bg-s2 px-3 py-1.5 text-xs text-t2">
      {/* TODO(ícones): sem conexão (pedido em ICONES.md); provisório: atenção */}<Icone nome="atencao" tamanho={16} />
      {!online && <span>{labels.semConexao} · {labels.dadosDe} {gerado}</span>}
      {fila > 0 && <span className="ml-auto">{labels.aEnviar}: {fila}</span>}
    </div>
  );
}
