"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import { createTarefaAction } from "@/app/(v2)/actions";

type Labels = { falar: string; ouvindo: string; vozIndisponivel: string; criar: string; cancelar: string };

// Minimal typing for the Web Speech API (not in lib.dom for every browser yet).
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};

/**
 * Mic → the browser's own speech recognition (Chrome/Android, Safari/iOS) → editable title → create.
 * The text is shown before saving, so a misheard word is fixed instead of written to the vault.
 */
export default function VoiceTask({ lang, equipe, me, labels }: { lang: "pt" | "en"; equipe: string; me: string; labels: Labels }) {
  const [state, setState] = useState<"idle" | "listening" | "review" | "unsupported">("idle");
  const [text, setText] = useState("");
  const rec = useRef<Recognition | null>(null);

  function listen() {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return setState("unsupported");
    const r = new SR();
    r.lang = lang === "en" ? "en-US" : "pt-BR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const said = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim();
      setText(said.charAt(0).toUpperCase() + said.slice(1));
      setState("review");
    };
    r.onend = () => setState((s) => (s === "listening" ? "idle" : s));
    r.onerror = () => setState("idle");
    rec.current = r;
    setState("listening");
    r.start();
  }

  if (state === "review") {
    return (
      <form action={createTarefaAction} className="mb-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 grid gap-2">
        <input type="hidden" name="equipe" value={equipe} />
        <input type="hidden" name="responsaveis" value={me} />
        <input type="hidden" name="back" value="/hoje" />
        <input name="title" value={text} onChange={(e) => setText(e.target.value)} required maxLength={200} autoFocus
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-1.5 text-sm font-medium">{labels.criar}</button>
          <button type="button" onClick={() => { setText(""); setState("idle"); }} className="rounded-lg px-4 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700">{labels.cancelar}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="mb-6">
      <button type="button" onClick={state === "listening" ? () => rec.current?.stop() : listen}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${state === "listening" ? "border-red-500 text-red-600 dark:text-red-400 animate-pulse" : "border-neutral-300 dark:border-neutral-700"}`}>
        <Mic size={16} /> {state === "listening" ? labels.ouvindo : labels.falar}
      </button>
      {state === "unsupported" && <p className="text-xs text-neutral-500 mt-2">{labels.vozIndisponivel}</p>}
    </div>
  );
}
