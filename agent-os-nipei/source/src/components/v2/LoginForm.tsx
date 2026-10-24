"use client";

import { useState } from "react";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { INITIAL_MEMBERS } from "@/lib/nipeiStore";
const LANG_COOKIE = "nipei_lang"; // same as lib/v2/i18n.ts (server-only module)

type Labels = {
  usuario: string; usuarioPh: string; senha: string; entrar: string; erroLogin: string; erroServidor: string; google: string; ou: string;
  whats: string; whatsPh: string; whatsEnviar: string; whatsVoltar: string; esqueci: string; mostrar: string; ocultar: string;
};

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm";
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

  return (
    <div className="grid gap-4">
      {google && (
        <a href={`/google/entrar?next=${encodeURIComponent(typeof window === "undefined" ? "/hoje" : destino())}`}
          className="flex items-center justify-center gap-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
          {l.google}
        </a>
      )}
      <button type="button" onClick={() => { setModo(modo === "whats" ? "senha" : "whats"); setErro(""); setAviso(""); }}
        className={`flex items-center justify-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium ${modo === "whats" ? "border-green-600 text-green-700 dark:text-green-400" : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
        <MessageCircle size={17} className="text-green-600" />{l.whats}
      </button>

      <div className="flex items-center gap-3 text-xs text-neutral-500"><span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />{l.ou}<span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" /></div>

      {modo === "whats" ? (
        <form onSubmit={pedirLink} className="grid gap-3">
          <label className="grid gap-1 text-sm">{l.whatsPh}
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" required className={field} />
          </label>
          {aviso && <p className="text-sm text-green-700 dark:text-green-400">{aviso}</p>}
          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
          <button disabled={busy} className="rounded-lg bg-green-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{l.whatsEnviar}</button>
          <button type="button" onClick={() => setModo("senha")} className="text-xs text-neutral-500 underline justify-self-center">{l.whatsVoltar}</button>
        </form>
      ) : (
        <form onSubmit={entrar} className="grid gap-3">
          <label className="grid gap-1 text-sm">{l.usuario}
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={l.usuarioPh} required className={field} />
          </label>
          <label className="grid gap-1 text-sm">{l.senha}
            <span className="relative">
              <input type={ver ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required className={`${field} pr-10`} />
              <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? l.ocultar : l.mostrar} title={ver ? l.ocultar : l.mostrar}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500">{ver ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>
          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
          <button disabled={busy} className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50">{l.entrar}</button>
          <button type="button" onClick={() => { setModo("whats"); setErro(""); }} className="text-xs text-neutral-500 underline justify-self-center">{l.esqueci}</button>
        </form>
      )}

      <div className="flex justify-center gap-3 pt-2 text-xs text-neutral-500">
        {(["pt", "en"] as const).map((x) => (
          <button key={x} type="button" onClick={() => trocarLang(x)} className={lang === x ? "font-semibold text-neutral-900 dark:text-neutral-100" : "hover:underline"}>{x.toUpperCase()}</button>
        ))}
        <span>·</span><a href="/privacidade" className="hover:underline">Privacidade</a>
      </div>
    </div>
  );
}
