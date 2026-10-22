"use client";

import { useFormStatus } from "react-dom";

/** Submit button that asks first (for actions that take something away: remove from a team, etc.). */
export default function ConfirmarBotao({ children, pergunta, className }: { children: React.ReactNode; pergunta: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} onClick={(e) => { if (!window.confirm(pergunta)) e.preventDefault(); }} className={`${className ?? ""} disabled:opacity-50`}>
      {pending ? "…" : children}
    </button>
  );
}
