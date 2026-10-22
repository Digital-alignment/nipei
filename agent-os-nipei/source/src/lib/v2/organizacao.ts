import { getEquipes, getPessoas } from "./data";

// How organised the teams are: who still has no team, teams without coordination, members without a
// role. Outside contacts (tipo_contato: externo) are not people to organise.
export function organizacao() {
  const pessoas = getPessoas().filter((p) => !p.externo).sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const comEquipe = pessoas.filter((p) => p.equipes.length);
  const semFuncao = comEquipe.filter((p) => !p.funcao || p.funcao === "Outro");
  return {
    total: pessoas.length,
    comEquipe: comEquipe.length,
    pct: pessoas.length ? Math.round((comEquipe.length / pessoas.length) * 100) : 100,
    semEquipe: pessoas.filter((p) => !p.equipes.length),
    semCoordenacao: getEquipes().filter((e) => !e.coordenadores.length),
    semFuncao,
    externos: getPessoas().filter((p) => p.externo).sort((a, b) => a.name.localeCompare(b.name, "pt")),
  };
}
