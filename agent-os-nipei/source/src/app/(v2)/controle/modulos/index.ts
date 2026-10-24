import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Bug, Clock, Coins, Eye, FileDown, HeartPulse, ListChecks, ScrollText, ToggleRight, Wrench } from "lucide-react";
import Acessos from "./Acessos";
import Saude from "./Saude";
import Registro from "./Registro";
import Atividade from "./Atividade";
import TempoUso from "./TempoUso";
import VerComo from "./VerComo";
import Operacao from "./Operacao";
import Custos from "./Custos";
import Erros from "./Erros";
import Funcoes from "./Funcoes";
import Relatorios from "./Relatorios";

// The admin panel's modules. To add one: create a component in this folder (it receives the URL's query in
// `q`) and add a line here. Order here = order of the tabs.
export type ModuloProps = { q: Record<string, string | undefined> };
export type Modulo = { id: string; titulo: string; descricao: string; icone: LucideIcon; Componente: ComponentType<ModuloProps> };

export const MODULOS: Modulo[] = [
  { id: "saude", titulo: "Saúde", descricao: "Estado de cada serviço: plataforma, servidor, IA, WhatsApp, contas e segurança.", icone: HeartPulse, Componente: Saude as ComponentType<ModuloProps> },
  { id: "atividade", titulo: "Atividade", descricao: "O que cada pessoa fez: tarefas, organização de pessoas, assistente, WhatsApp, apps de IA e logins.", icone: ListChecks, Componente: Atividade },
  { id: "uso", titulo: "Tempo de uso", descricao: "Minutos de uso por pessoa e por seção da plataforma.", icone: Clock, Componente: TempoUso },
  { id: "acessos", titulo: "Acessos", descricao: "Quem entrou, quando e como; último uso e conexões de cada pessoa.", icone: Activity, Componente: Acessos },
  { id: "vercomo", titulo: "Ver como", descricao: "Abra a plataforma como outra pessoa vê (somente leitura) e veja por que ela entra ou não.", icone: Eye, Componente: VerComo },
  { id: "operacao", titulo: "Operação", descricao: "Alertas no seu WhatsApp e ações rápidas de manutenção.", icone: Wrench, Componente: Operacao },
  { id: "erros", titulo: "Erros", descricao: "Erros do servidor que ninguém veria: páginas, botões, rotas e IA fora do ar.", icone: Bug, Componente: Erros },
  { id: "custos", titulo: "Custos de IA", descricao: "Chamadas, tokens e custo da IA por mês, pessoa, uso e modelo.", icone: Coins, Componente: Custos },
  { id: "funcoes", titulo: "Funções", descricao: "Ligar ou desligar funções para todos ou para uma pessoa.", icone: ToggleRight, Componente: Funcoes },
  { id: "relatorios", titulo: "Relatórios", descricao: "Baixar atividade, uso, acessos, custos e erros em CSV.", icone: FileDown, Componente: Relatorios },
  { id: "registro", titulo: "Registro do painel", descricao: "Cada abertura do painel e cada ação feita aqui.", icone: ScrollText, Componente: Registro },
];
