"use client";

import { useState } from "react";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import Aviso from "@/components/ds/Aviso";
import { INITIAL_MEMBERS } from "@/lib/nipeiStore";
const LANG_COOKIE = "nipei_lang"; // same as lib/v2/i18n.ts (server-only module)

type Labels = {
  usuario: string; usuarioPh: string; senha: string; entrar: string; erroLogin: string; erroServidor: string; google: string; ou: string;
  whats: string; whatsPh: string; whatsEnviar: string; whatsVoltar: string; esqueci: string; mostrar: string; ocultar: string;
};

const destino = () => {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") && next !== "/" ? next : "/hoje";
};

/** Login: Google, a link on WhatsApp, or username/e-mail + password. No list of who can log in. */
export default function LoginForm({ labels: l, google, lang }: { labels: Labels; google: boolean; lang: "pt" | "en" }) {
  const [modo, setModo] = useState<"senha" | "whats">("senha");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: usuario.trim(), password: senha }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    if (!res?.ok) { setBusy(false); setErro(res?.status === 401 ? l.erroLogin : res?.status === 429 ? j?.error ?? l.erroServidor : l.erroServidor); return; }
    // v1 pages read who is logged in from localStorage; store the real person, not a default.
    try {
      const p = j?.pessoa as { id: string; name: string } | undefined;
      const profile = INITIAL_MEMBERS.find((m) => m.id === p?.id) ?? { id: p?.id ?? usuario, name: p?.name ?? usuario };
      localStorage.setItem("nipei_current_user", JSON.stringify(profile));
      localStorage.setItem("nipei_selected_member_id", profile.id);
    } catch { /* storage blocked: v1 falls back to its default profile */ }
    window.location.href = destino();
  }

  async function pedirLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErro(""); setAviso("");
    const res = await fetch("/api/auth/link-whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ident: usuario.trim() }) }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) setAviso(j?.mensagem ?? ""); else setErro(l.erroServidor);
  }

  const trocarLang = (x: string) => { document.cookie = `${LANG_COOKIE}=${x}; path=/; max-age=31536000; samesite=lax`; window.location.reload(); };

  const erroP = erro && <p role="alert" className="meta inline-flex items-center gap-1.5 text-err"><Icone nome="erro" tamanho={16} />{erro}</p>;
  return (
    <div className="grid gap-3">
      {google && (
        <a href={`/google/entrar?next=${encodeURIComponent(typeof window === "undefined" ? "/hoje" : destino())}`}
          className="anel-foco flex h-14 items-center justify-center gap-2.5 rounded-pilula bg-s2 px-6 font-texto text-base font-semibold text-t1 transition-colors hover:bg-s3">
          {/* marca oficial do Google (exigida no botão de entrar): as únicas cores fora dos tokens, por regra da marca deles */}
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
          {l.google}
        </a>
      )}
      <Botao type="button" variante="tonal" icone="mensagem" largo className={modo === "whats" ? "shadow-[inset_0_0_0_1.5px_var(--ac)]" : undefined}
        onClick={() => { setModo(modo === "whats" ? "senha" : "whats"); setErro(""); setAviso(""); }}>{l.whats}</Botao>

      <div className="meta flex items-center gap-3 text-t3"><span className="h-px flex-1 bg-s3" />{l.ou}<span className="h-px flex-1 bg-s3" /></div>

      {modo === "whats" ? (
        <form onSubmit={pedirLink} className="grid gap-3">
          <Campo rotulo={l.whatsPh} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          {aviso && <Aviso estado="sucesso" titulo={aviso} />}
          {erroP}
          <Botao type="submit" icone="enviar" largo carregando={busy} textoCarregando="…">{l.whatsEnviar}</Botao>
          <Botao type="button" variante="fantasma" tamanho="P" icone="voltar" className="justify-self-center" onClick={() => setModo("senha")}>{l.whatsVoltar}</Botao>
        </form>
      ) : (
        <form onSubmit={entrar} className="grid gap-3">
          <Campo rotulo={l.usuario} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={l.usuarioPh} required />
          {/* TODO(ícones): ver / ocultar (pedidos em ICONES.md); provisório: informação / cadeado */}
          <Campo tipo={ver ? "texto" : "senha"} rotulo={l.senha} value={senha} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSenha(e.target.value)} autoComplete="current-password" required
            acaoDireita={<BotaoIcone icone={ver ? "cadeado" : "informacao"} aria-label={ver ? l.ocultar : l.mostrar} tamanho={40} variante="fantasma" onClick={() => setVer(!ver)} />} />
          {erroP}
          <Botao type="submit" icone="avancar" largo folha carregando={busy} textoCarregando="…">{l.entrar}</Botao>
          <Botao type="button" variante="fantasma" tamanho="P" icone="mensagem" className="justify-self-center" onClick={() => { setModo("whats"); setErro(""); }}>{l.esqueci}</Botao>
        </form>
      )}

      <div className="meta flex items-center justify-center gap-3 pt-2 text-t2">
        {(["pt", "en"] as const).map((x) => (
          <button key={x} type="button" onClick={() => trocarLang(x)} aria-pressed={lang === x} className={`anel-foco min-h-9 rounded-pilula px-3 ${lang === x ? "bg-s3 font-semibold text-t1" : "hover:bg-s2"}`}>{x.toUpperCase()}</button>
        ))}
        <span aria-hidden="true">·</span><a href="/privacidade" className="anel-foco rounded-interno hover:underline">Privacidade</a>
      </div>
    </div>
  );
}
