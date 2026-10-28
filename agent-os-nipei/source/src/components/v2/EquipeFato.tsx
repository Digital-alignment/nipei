"use client";

import { useTransition } from "react";
import Chip from "@/components/ds/Chip";
import { chaveEquipe } from "@/components/ds/equipes";
import { equipeFatoAction } from "@/app/(v2)/actions";

/** Gestão: which team a fact belongs to (manual). One tap saves; the page refreshes from the server action. */
export default function EquipeFato({ id, atual, equipes, rotuloSem }: { id: string; atual: string; equipes: { id: string; nome: string }[]; rotuloSem: string }) {
  const [pending, start] = useTransition();
  const escolher = (equipe: string) => start(async () => {
    const f = new FormData();
    f.set("id", id); f.set("equipe", equipe);
    await equipeFatoAction(f);
  });
  return (
    <div className={`-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0 ${pending ? "opacity-60" : ""}`} aria-busy={pending || undefined}>
      {equipes.map((e) => (
        <Chip key={e.id} tipo={chaveEquipe(e.id) ? "equipe" : "filtro"} equipe={e.id} ativo={atual === e.id} onClick={() => atual !== e.id && escolher(e.id)}>{e.nome}</Chip>
      ))}
      <Chip ativo={!atual} onClick={() => atual && escolher("")}>{rotuloSem}</Chip>
    </div>
  );
}
