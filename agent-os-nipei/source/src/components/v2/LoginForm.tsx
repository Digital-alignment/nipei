"use client";

import { useState } from "react";
import { INITIAL_MEMBERS } from "@/lib/nipeiStore";

type P = { id: string; name: string; usuario: string };
type Labels = { usuario: string; senha: string; entrar: string; erroLogin: string; erroServidor: string };

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

export default function LoginForm({ pessoas, labels }: { pessoas: P[]; labels: Labels }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usuario.trim(), password: senha }),
    }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setErro(res?.status === 401 ? labels.erroLogin : labels.erroServidor);
      return;
    }
    // v1 pages read who is logged in from localStorage; store the real person, not a default.
    const p = pessoas.find((x) => x.usuario === usuario.trim());
    try {
      const profile = INITIAL_MEMBERS.find((m) => m.id === p?.id) ?? { id: p?.id ?? usuario, name: p?.name ?? usuario };
      localStorage.setItem("nipei_current_user", JSON.stringify(profile));
      localStorage.setItem("nipei_selected_member_id", profile.id);
    } catch {
      /* storage blocked: v1 falls back to its default profile */
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next?.startsWith("/") && !next.startsWith("//") && next !== "/" ? next : "/hoje";
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {pessoas.map((p) => (
          <button key={p.id} type="button" onClick={() => { setUsuario(p.usuario); setErro(""); }}
            className={`rounded-full border px-3 py-1 text-sm ${usuario === p.usuario ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
            {p.name.split(" ")[0]}
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-sm">{labels.usuario}
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" required className={field} />
      </label>
      <label className="grid gap-1 text-sm">{labels.senha}
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required className={field} />
      </label>
      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      <button disabled={busy} className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
        {labels.entrar}
      </button>
    </form>
  );
}
