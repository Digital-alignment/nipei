"""Read-only audit of the Nipëi vault: teams <-> people, projects, objectives, tasks, privacy, knowledge.
Usage: npm run auditar [-- <vault>]   (default: VAULT_PATH, else the local vault)
Production: ssh ... root@85.31.61.100 "python3 - /opt/nipei-vault" < scripts/auditar.py
Exit 1 when a section in GRAVES has findings (broken links, privacy, duplicates); the rest is a list to review."""
import os, re, sys, json, collections, datetime
import yaml
V = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VAULT_PATH") or "C:/Users/ondig/Code/Nipei/nipei-vault"
os.chdir(V)
R = collections.defaultdict(list)          # section -> findings
def add(sec, msg): R[sec].append(msg)
def notes(d, recursive=False):
    out = []
    if not os.path.isdir(d): return out
    for f in sorted(os.listdir(d)):
        p = os.path.join(d, f)
        if not f.endswith(".md"): continue
        t = open(p, encoding="utf-8").read()
        m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", t)
        try:
            fm = (yaml.safe_load(m.group(1)) if m else None) or {}
            if not isinstance(fm, dict): raise ValueError("fm não é objeto")
        except Exception as e:
            add("YAML inválido", f"{p}: {str(e)[:80]}"); continue
        out.append((p, fm, t[m.end():] if m else t))
    return out
S = lambda v: "" if v is None else str(v).strip()
A = lambda v: [S(x) for x in v] if isinstance(v, list) else []
done = lambda s: bool(re.search(r"conclu|feito|done|arquiv", S(s), re.I))

EQ = {S(fm.get("id")): fm for _, fm, _ in notes("Equipes")}
PR = {S(fm.get("id")): (fm, b) for _, fm, b in notes("Projetos")}
OB = {S(fm.get("id")): (fm, b) for _, fm, b in notes("Objetivos")}
PE = {}
for p, fm, b in notes("Miembros"):
    if S(fm.get("type")).startswith("ai") or S(fm.get("id")).startswith("agente_"): continue
    PE[S(fm.get("id")) or os.path.basename(p)[:-3]] = fm
TA = {S(fm.get("id")) or os.path.basename(p)[:-3]: (p, fm) for p, fm, _ in notes("Productivity/Tarefas")}
FO = {S(fm.get("id")): fm for _, fm, _ in notes("Conhecimento/Fontes")}
FA = {S(fm.get("id")): (p, fm) for p, fm, _ in notes("Conhecimento/Fatos")}
AL = [fm for _, fm, _ in notes("Conhecimento/Alertas")]
PG = [fm for _, fm, _ in notes("Conhecimento/Perguntas")]
PP = [fm for _, fm, _ in notes("Conhecimento/Propostas")]
PROC = [fm for _, fm, _ in notes("Equipes/_procedimentos")]
contatos = {k for k, v in EQ.items() if v.get("contatos")}
print(f"contagem: equipes {len(EQ)} · projetos {len(PR)} · objetivos {len(OB)} · pessoas {len(PE)} · tarefas {len(TA)} · fontes {len(FO)} · fatos {len(FA)} · procedimentos {len(PROC)}")

# ---- equipes <-> pessoas
for e, fm in EQ.items():
    for m in A(fm.get("membros")):
        if m not in PE: add("Equipes", f"{e}: membro inexistente {m}")
        elif e not in A(PE[m].get("equipes")): add("Equipes", f"{e}: {m} está em membros, mas a ficha não tem a equipe")
    for c in A(fm.get("coordenadores")):
        if c not in PE: add("Equipes", f"{e}: coordenador inexistente {c}")
        elif e not in A(PE[c].get("coordena")): add("Equipes", f"{e}: {c} coordena na equipe, mas não na ficha")
for pid, fm in PE.items():
    for e in A(fm.get("equipes")):
        if e not in EQ: add("Pessoas", f"{pid}: equipe inexistente {e}")
        elif pid not in A(EQ[e].get("membros")): add("Pessoas", f"{pid}: ficha diz {e}, mas a equipe não lista")
    for e in A(fm.get("coordena")):
        if e in EQ and pid not in A(EQ[e].get("coordenadores")): add("Pessoas", f"{pid}: ficha coordena {e}, mas a equipe não lista")
    if S(fm.get("vinculo")) and S(fm.get("vinculo")) not in PE: add("Pessoas", f"{pid}: vínculo (Pontes) inexistente {fm.get('vinculo')}")

# ---- projetos / objetivos
for pid, (fm, b) in PR.items():
    if S(fm.get("lider")) and S(fm.get("lider")) not in PE: add("Projetos", f"{pid}: líder inexistente {fm.get('lider')}")
    if not S(fm.get("lider")): add("Projetos", f"{pid}: sem líder")
    for e in A(fm.get("equipes")):
        if e not in EQ: add("Projetos", f"{pid}: equipe inexistente {e}")
    if "## Objetivo" not in b: add("Projetos", f"{pid}: sem Sobre (Objetivo)")
for oid, (fm, b) in OB.items():
    st = S(fm.get("status"))
    if S(fm.get("projeto")) and S(fm.get("projeto")) not in PR: add("Objetivos", f"{oid}: projeto inexistente {fm.get('projeto')}")
    if S(fm.get("equipe")) not in EQ: add("Objetivos", f"{oid}: equipe inexistente {fm.get('equipe')}")
    if S(fm.get("responsavel")) and S(fm.get("responsavel")) not in PE: add("Objetivos", f"{oid}: responsável inexistente")
    if st not in ("fechado", "concluido"):
        if not S(fm.get("prazo")): add("Objetivos", f"{oid}: ativo sem prazo")
        if not S(fm.get("responsavel")): add("Objetivos", f"{oid}: ativo sem responsável")
        if fm.get("meta_alvo") in (None, "") and "## Marcos" not in b: add("Objetivos", f"{oid}: ativo sem meta nem marcos")

# ---- tarefas
abertas = {k: v for k, v in TA.items() if not done(v[1].get("status"))}
titulos = collections.defaultdict(list)
for tid, (p, fm) in abertas.items():
    e, pr, ob = S(fm.get("equipe")), S(fm.get("projeto")), S(fm.get("objetivo"))
    if e and e not in EQ: add("Tarefas", f"{tid}: equipe inexistente {e}")
    if not e: add("Tarefas (sem equipe)", f"{tid}: {S(fm.get('title'))[:60]}")
    if pr and pr not in PR: add("Tarefas", f"{tid}: projeto inexistente {pr}")
    if not pr: add("Tarefas", f"{tid}: aberta sem projeto")
    if ob and ob not in OB: add("Tarefas", f"{tid}: objetivo inexistente {ob}")
    if ob in OB and S(OB[ob][0].get("status")) == "fechado": add("Tarefas", f"{tid}: ligada a objetivo fechado {ob}")
    for r in A(fm.get("responsaveis")):
        if r not in PE: add("Tarefas", f"{tid}: responsável inexistente {r}")
        elif PE[r].get("equipes") and all(x in contatos for x in A(PE[r].get("equipes"))): add("Tarefas", f"{tid}: responsável é contato da Pontes ({r})")
    if fm.get("pedido") is True and S(fm.get("pedido_por")) not in PE: add("Tarefas", f"{tid}: pedido_por inexistente")
    if pr in PR and PR[pr][0].get("privado") and e and e not in A(PR[pr][0].get("equipes")):
        add("Privacidade", f"{tid} ('{S(fm.get('title'))[:40]}') é do projeto privado {pr} e está na {e}: quem é da {e} vê a tarefa")
    titulos[re.sub(r"[^a-z0-9]", "", S(fm.get("title")).lower())[:40]].append(tid)
for k, ids in titulos.items():
    if len(ids) > 1: add("Tarefas duplicadas (abertas, mesmo título)", f"{S(abertas[ids[0]][1].get('title'))[:60]} → {', '.join(ids)}")

# ---- procedimentos
for fm in PROC:
    if S(fm.get("equipe")) not in EQ: add("Procedimentos", f"{fm.get('id')}: equipe inexistente")
    if S(fm.get("responsavel")) and S(fm.get("responsavel")) not in PE: add("Procedimentos", f"{fm.get('id')}: responsável inexistente")

# ---- conhecimento (fase 2)
st = collections.Counter(S(fm.get("status")) for _, fm in FA.values())
print("fatos por status:", dict(st))
hoje = datetime.date.today()
for fid, (p, fm) in FA.items():
    s_ = S(fm.get("status"))
    if s_ not in ("confirmado", "proposto", "descartado", "substituido"): add("Fatos", f"{fid}: status desconhecido {s_}")
    if S(fm.get("fonte")) and S(fm.get("fonte")) not in FO: add("Fatos", f"{fid}: fonte inexistente {fm.get('fonte')}")
    if s_ in ("confirmado", "proposto"):
        if S(fm.get("equipe")) and S(fm.get("equipe")) not in EQ: add("Fatos", f"{fid}: equipe inexistente {fm.get('equipe')}")
        for x in A(fm.get("projetos")):
            if x not in PR: add("Fatos", f"{fid}: projeto inexistente {x}")
        for x in A(fm.get("pessoas")):
            if x not in PE: add("Fatos", f"{fid}: pessoa inexistente {x}")
        if not A(fm.get("projetos")): add("Fatos (sem projeto)", fid)
        if any(PR.get(x, ({}, ""))[0].get("privado") for x in A(fm.get("projetos"))): add("Privacidade", f"fato {fid} é do projeto privado {A(fm.get('projetos'))}: '{S(fm.get('texto'))[:60]}'")
    if s_ == "substituido" and S(fm.get("substituido_por")) not in FA: add("Fatos", f"{fid}: substituido_por inexistente")
    if S(fm.get("corrige")) and S(fm.get("corrige")) not in FA: add("Fatos", f"{fid}: corrige inexistente")
    if s_ == "confirmado":
        t = S(fm.get("texto"))
        if re.search(r"\bnota\b.*(subid|publicad|revisad|Notion|vault)|foi subida", t, re.I): add("Conhecimento: fatos 'meta' (sobre a nota, não sobre o Santuário)", f"{fid}: {t[:90]}")
        if re.search(r"ainda não|a definir|pendente de decisão|não estava levantad|não havia|não existia|não tinha", t, re.I): add("Conhecimento: fatos que podem estar superados (\"ainda não…\")", f"{fid}: {t[:100]}")
        if re.search(r"Guananshe", t) and not re.search(r"antig|inicial|obsolet|começou|histór|nome", t, re.I): add("Conhecimento: Guananshe como atual?", f"{fid}: {t[:90]}")
    if s_ == "proposto":
        c = S(fm.get("criado_em"))[:10]
        try:
            if (hoje - datetime.date.fromisoformat(c)).days > 7: add("Conhecimento: propostos há mais de 7 dias", fid)
        except Exception: pass
for fid, fm in FO.items():
    if S(fm.get("status")) in ("processando", "erro", "pendente"): add("Fontes", f"{fid}: status {fm.get('status')} — {S(fm.get('titulo'))[:50]}")
print("alertas abertas:", sum(1 for a in AL if S(a.get("status")) == "aberta"), "· perguntas abertas:", sum(1 for q in PG if S(q.get("status")) == "aberta"), "· propostas abertas:", sum(1 for q in PP if S(q.get("status")) == "aberta"))
try: print("notas antigas na IA:", json.load(open(".jobs/admin/config.json")).get("notasAntigas", False))
except Exception: print("notas antigas na IA: (config ausente = desligado)")
try:
    linhas = [json.loads(l) for l in open(".jobs/sem-resposta.jsonl") if l.strip()]
    print("perguntas sem resposta (total):", len(linhas), [l["pergunta"][:60] for l in linhas[-5:]])
except Exception: print("sem-resposta: nenhum registro")
for sec in sorted(R):
    v = R[sec]
    print(f"\n## {sec} ({len(v)})")
    for x in v[:40]: print("  -", x)
    if len(v) > 40: print(f"  … +{len(v) - 40}")
GRAVES = {"YAML inválido", "Equipes", "Pessoas", "Projetos", "Tarefas", "Tarefas duplicadas (abertas, mesmo título)", "Privacidade", "Fatos", "Procedimentos", "Conhecimento: fatos 'meta' (sobre a nota, não sobre o Santuário)"}
graves = sorted(x for x in R if x in GRAVES and R[x])
print("\nresultado:", "PROBLEMAS em " + ", ".join(graves) if graves else "ok (só listas para revisar)")
sys.exit(1 if graves else 0)
