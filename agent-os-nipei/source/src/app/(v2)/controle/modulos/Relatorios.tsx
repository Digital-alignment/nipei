import { Download } from "lucide-react";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 grid gap-3";
const campo = "rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-sm";
const RELATORIOS = [
  { r: "atividade", titulo: "Atividade", texto: "Cada ação de cada pessoa: tarefas, organização, assistente, WhatsApp, apps de IA e logins." },
  { r: "uso", titulo: "Tempo de uso", texto: "Minutos por dia, pessoa e seção da plataforma." },
  { r: "acessos", titulo: "Acessos", texto: "Quem entrou, quando, como e de que aparelho." },
  { r: "erros", titulo: "Erros do servidor", texto: "Cada erro com onde aconteceu." },
];

/** CSV downloads (open in Excel or Google Sheets). Each download is logged in the panel's Registro. */
export default function Relatorios(_: ModuloProps) {
  const mes = new Date().toISOString().slice(0, 7);
  return (
    <div className="grid gap-4 md:grid-cols-2 items-start">
      {RELATORIOS.map((x) => (
        <form key={x.r} action="/controle/exportar" method="get" className={CARTAO}>
          <p className="font-medium">{x.titulo}</p>
          <p className="text-sm text-neutral-500">{x.texto}</p>
          <input type="hidden" name="r" value={x.r} />
          <div className="flex items-center gap-2">
            <select name="dias" defaultValue="30" className={campo}>{[7, 30, 90, 365].map((d) => <option key={d} value={d}>últimos {d} dias</option>)}</select>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><Download size={14} />Baixar CSV</button>
          </div>
        </form>
      ))}
      <form action="/controle/exportar" method="get" className={CARTAO}>
        <p className="font-medium">Custos de IA</p>
        <p className="text-sm text-neutral-500">Cada chamada de IA do mês: pessoa, uso, modelo, tokens e custo.</p>
        <input type="hidden" name="r" value="custos" />
        <div className="flex items-center gap-2">
          <input type="month" name="mes" defaultValue={mes} className={campo} />
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><Download size={14} />Baixar CSV</button>
        </div>
      </form>
      <p className="md:col-span-2 text-xs text-neutral-500">Os arquivos têm dados pessoais da comunidade: guarde-os só onde a gestão tem acesso.</p>
    </div>
  );
}
