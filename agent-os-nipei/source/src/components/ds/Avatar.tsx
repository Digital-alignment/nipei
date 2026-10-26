import Link from "next/link";
import Selo from "./Selo";
import { EQUIPES_DS, chaveEquipe } from "./equipes";

// Avatar, grupo e linha de pessoa (DESIGN-SYSTEM.md seção 9.8).

export type TamanhoAvatar = 24 | 32 | 40 | 56 | 80;
export const TAMANHOS_AVATAR: TamanhoAvatar[] = [24, 32, 40, 56, 80];

export function iniciais(nome: string) {
  return nome.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Foto ou iniciais (Outfit 600) sobre a cor da equipe (sem equipe: superfície 3).
 * `online` = ponto de acento; `selo` = selo da equipe no canto (só de 56 px para cima).
 * `equipe` aceita a chave (escritorio…), o id do vault (equipe_1…) ou a cor antiga.
 */
export default function Avatar({ nome, foto, equipe, tamanho = 40, online, selo, className }: {
  nome: string; foto?: string; equipe?: string; tamanho?: TamanhoAvatar; online?: boolean; selo?: boolean; className?: string;
}) {
  const eq = chaveEquipe(equipe);
  const fonte = Math.max(12, Math.round(tamanho * 0.34));
  return (
    <span className={`relative inline-grid shrink-0 place-items-center rounded-pilula ${eq ? "text-eq-ink" : "bg-s3 text-t1"} ${className ?? ""}`}
      style={{ width: tamanho, height: tamanho, background: eq ? EQUIPES_DS[eq].cor : undefined }}>
      {foto
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={foto} alt={nome} width={tamanho} height={tamanho} className="size-full rounded-pilula object-cover" />
        : <span className="font-display font-semibold leading-none" style={{ fontSize: fonte }} aria-label={nome} role="img">{iniciais(nome)}</span>}
      {online && <span className="absolute bottom-0 right-0 rounded-pilula bg-ac ring-[2.5px] ring-bg" style={{ width: Math.max(8, tamanho * 0.2), height: Math.max(8, tamanho * 0.2) }}><span className="sr-only">online</span></span>}
      {selo && eq && tamanho >= 56 && (
        <span className="absolute -bottom-1 -right-1 grid size-[30px] place-items-center rounded-pilula bg-s1 ring-[3px] ring-bg" style={{ color: EQUIPES_DS[eq].cor }}>
          <Selo nome={EQUIPES_DS[eq].selo} tamanho={20} aria-label={EQUIPES_DS[eq].nome} />
        </span>
      )}
    </span>
  );
}

/** Avatares sobrepostos (−6 px) com "+N"; o anel tem a cor da superfície onde o grupo está. */
export function GrupoAvatares({ pessoas, max = 3, tamanho = 32, anel = "s1" }: {
  pessoas: { nome: string; foto?: string; equipe?: string }[]; max?: number; tamanho?: TamanhoAvatar; anel?: "bg" | "s1" | "s2";
}) {
  const ring = anel === "bg" ? "ring-bg" : anel === "s2" ? "ring-s2" : "ring-s1";
  const vis = pessoas.slice(0, max), resto = pessoas.length - vis.length;
  return (
    <span className="inline-flex items-center" aria-label={pessoas.map((p) => p.nome).join(", ")}>
      {vis.map((p, i) => <Avatar key={i} {...p} tamanho={tamanho} className={`ring-[2.5px] ${ring} ${i ? "-ml-1.5" : ""}`} />)}
      {resto > 0 && (
        <span className={`-ml-1.5 inline-grid shrink-0 place-items-center rounded-pilula bg-s3 font-display font-semibold text-t1 ring-[2.5px] ${ring}`}
          style={{ width: tamanho, height: tamanho, fontSize: Math.max(12, Math.round(tamanho * 0.34)) }}>+{resto}</span>
      )}
    </span>
  );
}

/** Linha pessoa: avatar + nome (600) + "equipe · função". Com `href`, a linha toda é link. */
export function LinhaPessoa({ nome, foto, equipe, equipeNome, funcao, tamanho = 40, href, online }: {
  nome: string; foto?: string; equipe?: string; equipeNome?: string; funcao?: string; tamanho?: TamanhoAvatar; href?: string; online?: boolean;
}) {
  const eq = chaveEquipe(equipe);
  const sub = [equipeNome ?? (eq ? EQUIPES_DS[eq].nome : undefined), funcao].filter(Boolean).join(" · ");
  const dentro = (
    <>
      <Avatar nome={nome} foto={foto} equipe={equipe} tamanho={tamanho} online={online} />
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold text-t1">{nome}</span>
        {sub && <span className="meta block truncate text-t3">{sub}</span>}
      </span>
    </>
  );
  const cls = "inline-flex min-w-0 items-center gap-2.5";
  return href ? <Link href={href} className={`anel-foco ${cls} rounded-pilula pr-2`}>{dentro}</Link> : <span className={cls}>{dentro}</span>;
}
