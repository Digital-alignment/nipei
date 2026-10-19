"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Paperclip } from "lucide-react";

type Labels = { arquivo: string; foto: string; enviando: string; maximo: string };

const MAX = 10 * 1024 * 1024;
const LADO = 1600;

/** Phone photos are 3–8 MB: shrink to ≤1600 px JPEG before upload (keeps the vault light and works on weak signal). */
async function reduzir(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, LADO / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // e.g. HEIC the browser can't decode: send as is
  }
}

export default function Upload({ id, action, accept, labels }: {
  id: string; action: (f: FormData) => Promise<{ error?: string }>; accept: string; labels: Labels;
}) {
  const arquivo = useRef<HTMLInputElement>(null), foto = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  async function enviar(input: HTMLInputElement | null) {
    const original = input?.files?.[0];
    if (!input || !original) return;
    setErro("");
    const file = await reduzir(original);
    input.value = "";
    if (file.size > MAX) return setErro(labels.maximo);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("arquivo", file);
    start(async () => {
      const r = await action(fd).catch(() => ({ error: "Falha no envio" }));
      if (r.error) setErro(r.error);
    });
  }

  const btn = "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={arquivo} type="file" accept={accept} className="hidden" onChange={() => enviar(arquivo.current)} />
      <input ref={foto} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => enviar(foto.current)} />
      <button type="button" disabled={pending} onClick={() => arquivo.current?.click()} className={btn}><Paperclip size={14} />{labels.arquivo}</button>
      <button type="button" disabled={pending} onClick={() => foto.current?.click()} className={btn}><Camera size={14} />{labels.foto}</button>
      {pending && <span className="text-xs text-neutral-500">{labels.enviando}</span>}
      {erro && <span className="text-xs text-red-600 dark:text-red-400">{erro}</span>}
    </div>
  );
}
