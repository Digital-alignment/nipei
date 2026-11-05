import { notFound } from "next/navigation";
import Avatar from "@/components/ds/Avatar";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import SemanaPresenca from "@/components/v2/SemanaPresenca";
import { can, currentUser, getEquipes, getPessoas, today, type Pessoa } from "@/lib/v2/data";
import { diaSemana, getPresenca, segunda } from "@/lib/v2/rotinas";
import { fmtDate, getT } from "@/lib/v2/i18n";

// "Marcar a semana" (DS 10.18): a coordenação marca onde cada membro está — inclusive quem não entra na plataforma.
export default async function SemanaEquipe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const e = getEquipes().find((x) => x.id === id);
  if (!e || e.contatos || !can.gerirEquipe(me, id)) notFound();
  const hoje = today(), seg = segunda(hoje), pres = getPresenca(seg);
  const pessoas = getPessoas();
  const membros = [...new Set([...e.coordenadores, ...e.membros])].map((pid) => pessoas.find((p) => p.id === pid)).filter((p): p is Pessoa => !!p && !p.contato);
  const k = chaveEquipe(e.id);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="-ml-3 mb-2"><Botao href={`/equipes/${id}?aba=pessoas`} variante="fantasma" tamanho="P" icone="voltar">{e.nome}</Botao></div>
      <CabecalhoPagina selo={k ? EQUIPES_DS[k].selo : "broto"} rotulo={`${e.nome} · ${t.rot.estaSemana} (${fmtDate(seg, lang)})`} titulo={t.rot.marcarSemana} subtitulo={t.rot.tocarParaMudar} />
      <ul className="grid gap-3">
        {membros.map((p) => (
          <li key={p.id}>
            <Cartao>
              <p className="flex items-center gap-2 font-texto text-[15px] font-medium"><Avatar nome={p.name} tamanho={24} />{p.name}</p>
              <SemanaPresenca pessoa={p.id} dias={pres[p.id] ?? Array(7).fill("")} hojeIdx={diaSemana(hoje) - 1} t={t} editar />
            </Cartao>
          </li>
        ))}
      </ul>
    </div>
  );
}
