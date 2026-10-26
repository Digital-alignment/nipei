"use client";

import type { ReactNode } from "react";
import { ProvedorToast } from "./Toast";
import { ProvedorConfirmar } from "./Dialogo";

/** Toast + diálogo de confirmação para toda a v2 (app/(v2)/layout.tsx): useToast() e useConfirmar() em qualquer tela. */
export default function ProvedorAvisos({ children }: { children: ReactNode }) {
  return <ProvedorToast><ProvedorConfirmar>{children}</ProvedorConfirmar></ProvedorToast>;
}
