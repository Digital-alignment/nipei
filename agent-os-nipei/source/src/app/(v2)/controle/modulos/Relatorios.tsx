import type { ModuloProps } from "./index";
import Cartao from "@/components/ds/Cartao";
import Botao from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";

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
    <div className="grid items-start gap-3 md:grid-cols-2">
      {RELATORIOS.map((x) => (
        <Cartao key={x.r}>
          <form action="/controle/exportar" method="get" className="grid gap-3">
            <h2 className="titulo-cartao">{x.titulo}</h2>
            <p className="corpo text-t2">{x.texto}</p>
            <input type="hidden" name="r" value={x.r} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Campo tipo="selecao" name="dias" rotulo="Período" defaultValue="30">{[7, 30, 90, 365].map((d) => <option key={d} value={d}>últimos {d} dias</option>)}</Campo>
              <Botao type="submit" variante="tonal" tamanho="M" icone="baixar">Baixar CSV</Botao>
            </div>
          </form>
        </Cartao>
      ))}
      <Cartao>
        <form action="/controle/exportar" method="get" className="grid gap-3">
          <h2 className="titulo-cartao">Custos de IA</h2>
          <p className="corpo text-t2">Cada chamada de IA do mês: pessoa, uso, modelo, tokens e custo.</p>
          <input type="hidden" name="r" value="custos" />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <Campo rotulo="Mês" type="month" name="mes" defaultValue={mes} />
            <Botao type="submit" variante="tonal" tamanho="M" icone="baixar">Baixar CSV</Botao>
          </div>
        </form>
      </Cartao>
      <p className="meta text-t2 md:col-span-2">Os arquivos têm dados pessoais da comunidade: guarde-os só onde a gestão tem acesso.</p>
    </div>
  );
}
