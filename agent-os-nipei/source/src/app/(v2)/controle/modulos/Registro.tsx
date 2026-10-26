import LinhaDoTempo from "@/components/ds/padroes/LinhaDoTempo";
import { EstadoVazio } from "@/components/ds/Estados";
import { registroAdmin } from "@/lib/v2/admin";
import type { ModuloProps } from "./index";

const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Bahia" });

/** The panel's own log: every opening (and how), failed confirmations and actions. */
export default function Registro(_: ModuloProps) {
  const r = registroAdmin(100);
  return (
    <LinhaDoTempo vazio={<EstadoVazio compacto selo="olho" titulo="Nada registrado ainda." />} itens={r.map((x) => ({
      dia: dia(x.em), hora: hora(x.em), quem: "", tipo: /FALHOU/.test(x.oque) ? "estado" as const : "outro" as const,
      texto: <span className={/FALHOU/.test(x.oque) ? "text-err" : undefined}>{x.oque}</span>,
    }))} />
  );
}
