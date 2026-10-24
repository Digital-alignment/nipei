import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Clock, HeartPulse, ListChecks, ScrollText } from "lucide-react";
import Acessos from "./Acessos";
import Saude from "./Saude";
import Registro from "./Registro";
import Atividade from "./Atividade";
import TempoUso from "./TempoUso";

// The admin panel's modules. To add one: create a component in this folder (it receives the URL's query in
// `q`) and add a line here. Order here = order of the tabs.
export type ModuloProps = { q: Record<string, string | undefined> };
export type Modulo = { id: string; titulo: string; descricao: string; icone: LucideIcon; Componente: ComponentType<ModuloProps> };

export const MODULOS: Modulo[] = [
  { id: "saude", titulo: "Saúde", descricao: "Estado de cada serviço: plataforma, servidor, IA, WhatsApp, contas e segurança.", icone: HeartPulse, Componente: Saude as ComponentType<ModuloProps> },
  { id: "atividade", titulo: "Atividade", descricao: "O que cada pessoa fez: tarefas, organização de pessoas, assistente, WhatsApp, apps de IA e logins.", icone: ListChecks, Componente: Atividade },
  { id: "uso", titulo: "Tempo de uso", descricao: "Minutos de uso por pessoa e por seção da plataforma.", icone: Clock, Componente: TempoUso },
  { id: "acessos", titulo: "Acessos", descricao: "Quem entrou, quando e como; último uso e conexões de cada pessoa.", icone: Activity, Componente: Acessos },
  { id: "registro", titulo: "Registro do painel", descricao: "Cada abertura do painel e cada ação feita aqui.", icone: ScrollText, Componente: Registro },
];
