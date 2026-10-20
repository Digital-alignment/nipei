"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself and shows `enviando` while its form's action runs. */
export default function BotaoEnviar({ children, enviando, className, name, value }: {
  children: React.ReactNode; enviando: string; className?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return <button name={name} value={value} disabled={pending} className={`${className ?? ""} disabled:opacity-60`}>{pending ? enviando : children}</button>;
}
