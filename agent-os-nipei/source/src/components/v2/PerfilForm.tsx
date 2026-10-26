"use client";

import { useState, useTransition } from "react";
import Icone from "@/components/ds/Icone";
import { useRouter } from "next/navigation";
import Upload from "@/components/v2/Upload";
import type { Dict } from "@/lib/v2/i18n";
import type { DadosPerfil } from "@/lib/v2/perfil";
import { PAISES, normalizarFone } from "@/lib/v2/whatsapp";
import { enviarCodigoAction, salvarPerfilAction, uploadFotoAction, verificarCodigoAction } from "@/app/perfil-actions";

type Inicial = DadosPerfil & { id: string; nipeiId: string; whatsappVerificado: boolean; temFoto: boolean };

const field = "w-full rounded-[16px] bg-s2 px-4 py-2.5 font-texto text-[15px] text-t1 outline-none placeholder:text-t3 focus:shadow-foco";
const btn = "rounded-interno bg-s2 px-3 py-2 text-sm disabled:opacity-50";
const primario = "rounded-interno bg-ac text-ac-ink px-5 py-2.5 text-sm font-medium disabled:opacity-50";
const IDIOMA_NOME: Record<string, string> = { pt: "Português", en: "English", es: "Español" };

/** "+5573999606170" → { cc: "55", local: "73999606170" } (longest matching country code). */
function separar(fone: string) {
  const d = fone.replace(/\D/g, "");
  const p = [...PAISES].sort((a, b) => b.cc.length - a.cc.length).find((x) => fone.startsWith("+") && d.startsWith(x.cc));
  // unknown country code: keep "+…" so normalizarFone ignores the selected country
  return p ? { cc: p.cc, local: d.slice(p.cc.length) } : { cc: "55", local: fone.startsWith("+") ? `+${d}` : d };
}

/**
 * "Meu perfil" in two steps: fill in (with WhatsApp verification by code) → "Confira seus dados" + consent → save.
 * Used logged in (/pessoas/[id]/editar) and by the public cadastro link (`cadastro` = its token).
 */
export default function PerfilForm({ inicial, t, cadastro = "", voltar = "" }: { inicial: Inicial; t: Dict; cadastro?: string; voltar?: string }) {
  const router = useRouter();
  const [d, setD] = useState<DadosPerfil>(inicial);
  const [fone, setFone] = useState(() => separar(inicial.whatsapp));
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [erro, setErro] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [pedido, setPedido] = useState<{ numero: string; token: string } | null>(null);
  const [prova, setProva] = useState<{ numero: string; token: string } | null>(null);
  const [foto, setFoto] = useState(inicial.temFoto ? Date.now() : 0);
  const [pending, start] = useTransition();

  const numero = normalizarFone(fone.local, fone.cc);
  const emergencia = d.emergencia_whatsapp ? normalizarFone(d.emergencia_whatsapp, fone.cc) || d.emergencia_whatsapp : "";
  const jaVerificado = inicial.whatsappVerificado ? normalizarFone(inicial.whatsapp) : "";
  const verificado = !!numero && (numero === jaVerificado || prova?.numero === numero);
  const set = (k: keyof DadosPerfil) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  const run = (fn: () => Promise<void>) => { setErro(""); start(fn); };
  const enviarCodigo = () => run(async () => {
    const r = await enviarCodigoAction(inicial.id, numero, cadastro);
    if (r.error) return setErro(r.error);
    setPedido({ numero: r.numero!, token: r.token! });
    setCodigo("");
  });
  const verificar = () => run(async () => {
    const r = await verificarCodigoAction(inicial.id, pedido!.token, codigo, cadastro);
    if (r.error) return setErro(r.error);
    setProva({ numero: pedido!.numero, token: r.prova! });
    setPedido(null);
  });
  const salvar = () => run(async () => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ ...d, whatsapp: numero || fone.local, emergencia_whatsapp: emergencia })) f.set(k, v);
    f.set("pessoa", inicial.id);
    f.set("cadastro", cadastro);
    if (prova?.numero === numero) f.set("prova", prova.token);
    if (lgpd) f.set("lgpd", "on");
    const r = await salvarPerfilAction(f);
    if (r.error) return setErro(r.error);
    if (voltar) { router.push(voltar); router.refresh(); } else setPasso(3);
  });
  const fotoAction = async (f: FormData) => {
    const r = await uploadFotoAction(f);
    if (!r.error) setFoto(Date.now());
    return r;
  };

  if (passo === 3) return <h1 className="text-2xl font-semibold">{t.obrigado}</h1>;

  if (passo === 2) {
    const linhas: [string, string, boolean?][] = [
      [t.nome, d.name], [t.apelido, d.apelido], [t.nomeNativo, d.native_name],
      [t.dataNascimento, d.data_nascimento.split("-").reverse().join("/"), true], [t.nacionalidade, d.nacionalidade, true],
      ["WhatsApp", numero ? `${numero} · ${verificado ? t.verificado : t.naoVerificado}` : fone.local], [t.email, d.email, true],
      [t.cidade, [d.cidade, d.pais].filter(Boolean).join(", ")], [t.idiomaPref, IDIOMA_NOME[d.idioma] ?? d.idioma],
      [t.area, d.area], [t.funcao, d.funcao], [t.disponibilidade, d.disponibilidade],
      [t.emergencia, [d.emergencia_nome, emergencia].filter(Boolean).join(" · "), true],
    ];
    return (
      <div className="grid gap-5">
        <div>
          <h2 className="text-xl font-semibold">{t.confiraDados}</h2>
          <p className="text-sm text-t2 mt-1">{t.confiraIntro}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {linhas.map(([k, v, priv]) => (
            <div key={k} className="contents">
              <dt className="text-t2">{k}</dt>
              <dd className="break-words">{v || t.vazio}{priv && v ? <span className="block text-xs text-t3">{t.privado}</span> : null}</dd>
            </div>
          ))}
        </dl>
        {numero && !verificado && <p className="text-xs text-warn">{t.semVerificarAviso}</p>}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} className="mt-1" />
          <span>{t.lgpd}</span>
        </label>
        {erro && <p className="text-sm text-err">{erro}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPasso(1)} className={btn}>{t.corrigir}</button>
          <button type="button" disabled={!lgpd || pending} onClick={salvar} className={primario}>{pending ? t.salvando : t.confirmarSalvar}</button>
        </div>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setErro(""); setPasso(2); window.scrollTo(0, 0); }}>
      <div className="flex items-center gap-4">
        {foto && !cadastro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/pessoas/${inicial.id}/foto?v=${foto}`} alt={d.name} className="size-14 rounded-pilula object-cover shrink-0" />
        ) : <span className="size-14 rounded-pilula bg-s3 shrink-0" />}
        <div className="grid gap-1">
          <Upload id={inicial.id} action={fotoAction} accept="image/*" soFoto extra={cadastro ? { cadastro } : {}}
            labels={{ arquivo: t.trocarFoto, foto: t.foto, enviando: t.salvando, maximo: "Máx. 3 MB" }} />
          {foto > 0 && cadastro && <span className="text-xs text-ok">✓ {t.foto}</span>}
        </div>
      </div>

      <label className="grid gap-1 text-sm">{t.nome}<input value={d.name} onChange={set("name")} required maxLength={120} className={field} /></label>
      <label className="grid gap-1 text-sm">{t.apelido}<input value={d.apelido} onChange={set("apelido")} maxLength={60} className={field} /></label>
      <label className="grid gap-1 text-sm">{t.nomeNativo}<input value={d.native_name} onChange={set("native_name")} maxLength={120} className={field} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">{t.dataNascimento}<input type="date" value={d.data_nascimento} onChange={set("data_nascimento")} className={field} /></label>
        <label className="grid gap-1 text-sm">{t.nacionalidade}<input value={d.nacionalidade} onChange={set("nacionalidade")} maxLength={60} className={field} /></label>
      </div>

      <fieldset className="grid gap-2 rounded-interno p-3">
        <legend className="px-1 text-sm">WhatsApp</legend>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <select aria-label={t.codigoPais} value={fone.cc} onChange={(e) => setFone({ ...fone, cc: e.target.value })} className={field}>
            {PAISES.map((p) => <option key={p.cc + p.nome} value={p.cc}>{p.nome} +{p.cc}</option>)}
          </select>
          <input aria-label={t.numero} type="tel" inputMode="tel" value={fone.local} onChange={(e) => setFone({ ...fone, local: e.target.value })}
            placeholder={fone.cc === "55" ? "73 99999 9999" : ""} maxLength={20} className={field} />
        </div>
        {verificado ? (
          <p className="inline-flex items-center gap-1 text-sm text-ok"><Icone nome="sucesso"  tamanho={16} />{t.verificado}</p>
        ) : numero ? (
          <div className="grid gap-2">
            <p className="inline-flex items-center gap-1 text-xs text-warn"><Icone nome="atencao"  tamanho={14} />{t.naoVerificado}</p>
            {pedido?.numero === numero ? (
              <>
                <p className="text-xs text-t2">{t.codigoEnviado} {numero}</p>
                <div className="flex gap-2">
                  <input aria-label={t.codigoRecebido} placeholder={t.codigoRecebido} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                    value={codigo} onChange={(e) => setCodigo(e.target.value)} className={field} />
                  <button type="button" disabled={pending || codigo.replace(/\D/g, "").length !== 6} onClick={verificar} className={btn}>{t.verificar}</button>
                </div>
                <button type="button" disabled={pending} onClick={enviarCodigo} className="justify-self-start text-xs underline text-t2">{t.reenviarCodigo}</button>
              </>
            ) : (
              <button type="button" disabled={pending} onClick={enviarCodigo} className={`${btn} justify-self-start`}>{t.enviarCodigo}</button>
            )}
          </div>
        ) : null}
      </fieldset>

      <label className="grid gap-1 text-sm">{t.email}<input type="email" value={d.email} onChange={set("email")} maxLength={120} className={field} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">{t.cidade}<input value={d.cidade} onChange={set("cidade")} maxLength={80} className={field} /></label>
        <label className="grid gap-1 text-sm">{t.pais}<input value={d.pais} onChange={set("pais")} maxLength={60} className={field} /></label>
      </div>
      <label className="grid gap-1 text-sm">{t.idiomaPref}
        <select value={d.idioma || "pt"} onChange={set("idioma")} className={field}>
          {Object.entries(IDIOMA_NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t.area}<input value={d.area} onChange={set("area")} maxLength={200} className={field} /></label>
      <label className="grid gap-1 text-sm">{t.funcao}<textarea value={d.funcao} onChange={set("funcao")} rows={3} maxLength={300} className={field} /></label>
      <label className="grid gap-1 text-sm">{t.disponibilidade}<input value={d.disponibilidade} onChange={set("disponibilidade")} maxLength={200} className={field} /></label>

      <fieldset className="grid gap-2 rounded-interno p-3">
        <legend className="px-1 text-sm">{t.emergencia} <span className="text-xs text-t3">({t.privado})</span></legend>
        <input aria-label={t.emergenciaNome} placeholder={t.emergenciaNome} value={d.emergencia_nome} onChange={set("emergencia_nome")} maxLength={120} className={field} />
        <input aria-label={t.emergenciaWhats} placeholder={`${t.emergenciaWhats} (+55 73 9…)`} type="tel" inputMode="tel" value={d.emergencia_whatsapp} onChange={set("emergencia_whatsapp")} maxLength={30} className={field} />
      </fieldset>

      {erro && <p className="text-sm text-err">{erro}</p>}
      <button className={primario}>{t.continuar}</button>
    </form>
  );
}
