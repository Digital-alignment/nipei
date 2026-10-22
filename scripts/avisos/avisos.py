#!/usr/bin/env python3
"""Nipei WhatsApp notices (VPS host).

  avisos.py fila     send queued notices (assignment, @mention) from /opt/nipei-vault/.jobs/avisos
  avisos.py fila --teste   print who would get what (sends nothing, keeps the queue)
  avisos.py diario   morning reminder: each person's tasks due today and overdue
  avisos.py diario --teste <pessoa_id>   build that person's reminder and print it (sends nothing)

Who may receive: member of a team whose Equipes note has `avisos: true`, with `whatsapp` in their
Miembros note and without `avisos_whatsapp: false`. From FIM_TRANSICAO on, the number must also be
verified in "Meu perfil" (`whatsapp_verificado: true`). The app (lib/tarefaNote.ts) only enqueues.
"""
import glob, json, os, re, sys, time, unicodedata, urllib.request
from datetime import datetime, timedelta, timezone

import yaml

VAULT = "/opt/nipei-vault"
FILA = f"{VAULT}/.jobs/avisos"
APP = "https://os.nipeihu.app"
LOG = "/var/log/nipei-avisos.log"
ESTADO = "/var/lib/nipei-avisos"
TZ = timezone(timedelta(hours=-3))  # America/Bahia, no DST
FIM_TRANSICAO = "2026-11-03"  # until then unverified numbers still get notices (2 weeks to verify)
MESES = {m: i for i, m in enumerate(["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"], 1)}
MESES.update({m: i for i, m in enumerate(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"], 1)})


def log(msg):
    with open(LOG, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}\n")


def env():
    out = {}
    for line in open("/opt/nipei-control/.env"):
        if "=" in line and not line.startswith("#"):
            k, v = line.rstrip("\n").split("=", 1)
            out[k.strip()] = v.strip().strip('"')
    return out


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def frontmatter(path):
    try:
        t = open(path, encoding="utf-8").read()
        m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", t)
        return (yaml.safe_load(m.group(1)) if m else None) or {}
    except Exception:
        return {}


def prazo_iso(v):
    """'2026-10-20' as is; '9 de junho de 2026' (old Notion import) → ISO; else ''."""
    v = str(v or "").strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", v):
        return v[:10]
    m = re.match(r"^(\d{1,2})\s+de\s+([a-zçã]+)(?:\s+de)?\s+(\d{4})", sem_acento(v))
    if m and m.group(2) in MESES:
        return f"{m.group(3)}-{MESES[m.group(2)]:02d}-{int(m.group(1)):02d}"
    return ""


def pessoas_que_recebem(hoje=None):
    """id → {nome, fone, verificado} for people allowed to get notices."""
    hoje = hoje or datetime.now(TZ).strftime("%Y-%m-%d")
    equipes_com_aviso = {str(fm.get("id")) for fm in map(frontmatter, glob.glob(f"{VAULT}/Equipes/*.md")) if fm.get("avisos") is True}
    out = {}
    for p in glob.glob(f"{VAULT}/Miembros/*.md"):
        fm = frontmatter(p)
        pid = str(fm.get("id") or os.path.basename(p)[:-3])
        fone = re.sub(r"\D", "", str(fm.get("whatsapp") or ""))
        verificado = fm.get("whatsapp_verificado") is True
        if not (verificado or hoje < FIM_TRANSICAO):
            continue
        if fm.get("acesso_suspenso") is True or str(fm.get("tipo_contato") or "") == "externo":
            continue  # suspended access / outside contact: never notified
        if fone and fm.get("avisos_whatsapp") is not False and set(map(str, fm.get("equipes") or [])) & equipes_com_aviso:
            out[pid] = {"nome": str(fm.get("apelido") or fm.get("name") or pid).split(" (")[0], "fone": fone, "verificado": verificado}
    return out


def todas_pessoas():
    """For @mentions: id and normalized first name → id (everyone, eligibility checked later)."""
    idx = {}
    for p in glob.glob(f"{VAULT}/Miembros/*.md"):
        fm = frontmatter(p)
        pid = str(fm.get("id") or os.path.basename(p)[:-3])
        idx[sem_acento(pid)] = pid
        primeiro = sem_acento(str(fm.get("name") or "").split(" ")[0])
        if primeiro:
            idx.setdefault(primeiro, pid)  # first come wins on a shared first name; the id always works
    return idx


def enviar(cfg, fone, texto):
    body = json.dumps({"number": fone, "text": texto}).encode()
    req = urllib.request.Request(
        f"{cfg['EVOLUTION_API_URL']}/message/sendText/{cfg['EVOLUTION_INSTANCE_NAME']}", data=body, method="POST",
        headers={"Content-Type": "application/json", "apikey": cfg["EVOLUTION_API_KEY"], "User-Agent": "nipei-avisos/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status < 300


def mesmo(nome_pessoa, autor):
    """True when the author is this person (no notice for assigning or mentioning yourself)."""
    return sem_acento(nome_pessoa).split(" ")[0] == sem_acento(autor).split(" ")[0]


def texto_atribuicoes(autor, itens):
    """One task → the usual notice; several from the same author (bulk action, meeting) → one list."""
    if len(itens) == 1:
        a = itens[0]
        prazo = prazo_iso(a.get("prazo"))
        return f"📌 {autor} atribuiu uma tarefa a você:\n*{a.get('titulo')}*" + (f"\n📅 Prazo: {prazo[8:10]}/{prazo[5:7]}" if prazo else "") + f"\n\n{APP}/tarefas/{a.get('tarefaId')}"
    linhas = []
    for a in itens[:10]:
        prazo = prazo_iso(a.get("prazo"))
        linhas.append(f"• {a.get('titulo')}" + (f" ({prazo[8:10]}/{prazo[5:7]})" if prazo else ""))
    if len(itens) > 10:
        linhas.append(f"…e mais {len(itens) - 10}")
    return f"📌 {autor} atribuiu {len(itens)} tarefas a você:\n" + "\n".join(linhas) + f"\n\n{APP}/hoje"


def fila(cfg, teste=False):
    if not teste:
        time.sleep(5)  # let a bulk action finish queueing, so it becomes one message per person
    recebem = pessoas_que_recebem()
    indice = todas_pessoas()
    atribuicoes = {}  # (pid, autor) -> [aviso]

    def mandar(pid, texto, rotulo, autor):
        p = recebem.get(pid)
        if not p or mesmo(p["nome"], autor):
            if teste:
                print(f"  (não envia para {pid}: {'não recebe avisos' if not p else 'é o autor'})")
            return
        if teste:
            print(f"→ {pid} ({p['nome']}, {p['fone'][:4]}…):\n{texto}\n")
            return
        try:
            ok = enviar(cfg, p["fone"], texto)
            log(f"{rotulo} → {pid}: {'ok' if ok else 'falhou'}")
        except Exception as e:
            log(f"{rotulo} → {pid}: ERRO {e}")

    for f in sorted(glob.glob(f"{FILA}/*.json")):
        a = json.load(open(f))
        link = f"{APP}/tarefas/{a.get('tarefaId')}"
        para, texto = [], ""
        if a.get("tipo") == "atribuicao":
            for pid in a.get("para") or []:
                atribuicoes.setdefault((pid, a.get("autor", "")), []).append(a)
        elif a.get("tipo") == "mencao":
            # "@Bruna." / "@bruna_retiros," → trailing punctuation is not part of the name
            tokens = (sem_acento(x).rstrip(".-") for x in re.findall(r"@([\wÀ-ÿ.-]+)", a.get("texto", "")))
            para = list(dict.fromkeys(indice[t] for t in tokens if t in indice))
            texto = f"💬 {a.get('autor')} mencionou você em *{a.get('titulo')}*:\n“{a.get('texto', '')[:500]}”\n\n{link}"
        for pid in para:
            mandar(pid, texto, f"{a['id']} {a.get('tipo')}", a.get("autor", ""))
        if not teste:
            os.remove(f)  # notices are best effort: never resend old ones after a failure
    for (pid, autor), itens in atribuicoes.items():
        mandar(pid, texto_atribuicoes(autor, itens), f"atribuicao x{len(itens)} ({itens[0]['id']})", autor)


def lembrete(nome, tarefas, hoje, verificado=True):
    atrasadas = sorted([t for t in tarefas if t["prazo"] < hoje], key=lambda t: t["prazo"])
    de_hoje = [t for t in tarefas if t["prazo"] == hoje]
    if not atrasadas and not de_hoje:
        return None
    def linhas(ts, com_data):
        out = [f"• {t['titulo']}" + (f" ({t['prazo'][8:10]}/{t['prazo'][5:7]})" if com_data else "") for t in ts[:8]]
        return out + ([f"…e mais {len(ts) - 8}"] if len(ts) > 8 else [])
    partes = [f"☀️ Bom dia, {nome}! Suas tarefas no Nipëi:"]
    if de_hoje:
        partes += ["", f"📅 *Para hoje* ({len(de_hoje)}):", *linhas(de_hoje, False)]
    if atrasadas:
        partes += ["", f"⚠️ *Atrasadas* ({len(atrasadas)}):", *linhas(atrasadas, True)]
    partes += ["", f"👉 {APP}/hoje"]
    if not verificado:
        partes += ["", f"🔐 Confirme seu WhatsApp no seu perfil até {FIM_TRANSICAO[8:10]}/{FIM_TRANSICAO[5:7]} para continuar recebendo estes avisos: {APP}/hoje"]
    partes += ["", "_Para não receber mais, desligue os avisos na sua ficha em Pessoas._"]
    return "\n".join(partes)


def diario(cfg, teste=None):
    hoje = datetime.now(TZ).strftime("%Y-%m-%d")
    marca = f"{ESTADO}/diario-{hoje}"
    if not teste and os.path.exists(marca):
        return log("diario: já enviado hoje")
    recebem = pessoas_que_recebem()
    if teste:
        fm = frontmatter(f"{VAULT}/Miembros/{teste}.md")
        recebem = {teste: {"nome": str(fm.get("apelido") or fm.get("name") or teste).split(" (")[0], "fone": "", "verificado": fm.get("whatsapp_verificado") is True}}
    por_pessoa = {pid: [] for pid in recebem}
    for p in glob.glob(f"{VAULT}/Productivity/Tarefas/*.md"):
        fm = frontmatter(p)
        if re.search(r"conclu|done|feito|arquiv", str(fm.get("status") or ""), re.I):
            continue
        prazo = prazo_iso(fm.get("prazo"))
        if not prazo or prazo > hoje:
            continue
        for pid in map(str, fm.get("responsaveis") or []):
            if pid in por_pessoa:
                por_pessoa[pid].append({"titulo": str(fm.get("title") or ""), "prazo": prazo})
    for pid, tarefas in por_pessoa.items():
        texto = lembrete(recebem[pid]["nome"], tarefas, hoje, recebem[pid]["verificado"])
        if teste:
            print(texto or f"(sem tarefas de hoje ou atrasadas para {pid}: nada seria enviado)")
            continue
        if texto:
            try:
                log(f"diario → {pid} ({len(tarefas)} tarefas): {'ok' if enviar(cfg, recebem[pid]['fone'], texto) else 'falhou'}")
            except Exception as e:
                log(f"diario → {pid}: ERRO {e}")
    if not teste:
        os.makedirs(ESTADO, exist_ok=True)
        open(marca, "w").write(hoje)


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "fila"
    cfg = env()
    if modo == "diario":
        diario(cfg, sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--teste" else None)
    else:
        os.makedirs(FILA, exist_ok=True)
        fila(cfg, teste="--teste" in sys.argv)
