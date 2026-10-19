#!/usr/bin/env python3
"""Nipei "Fazer por mim" worker (VPS host). Runs once per trigger (systemd path unit).

Takes jobs the app queued in /opt/nipei-vault/.jobs/pendentes, runs Hermes in its Docker container with
web search ONLY (no terminal, files or code execution — task text comes from users and must not be able
to run anything on the server), and posts the result to the app (/api/tarefas/entregavel), which saves
it in the vault through the single task writer and notifies whoever asked.
"""
import json, os, shutil, subprocess, time, urllib.request

JOBS = "/opt/nipei-vault/.jobs"
APP = os.environ.get("NIPEI_APP_URL", "https://os.nipeihu.app")
CONTAINER = os.environ.get("HERMES_CONTAINER", "hermes-agent-upmh-hermes-agent-1")
MODEL = os.environ.get("HERMES_MODEL", "anthropic/claude-sonnet-5.5")
TIMEOUT = int(os.environ.get("HERMES_TIMEOUT", "1200"))  # 20 min per job
STALE = 40 * 60  # a job "rodando" longer than this was interrupted (crash/reboot)
LOG = "/var/log/nipei-hermes-worker.log"


def log(msg):
    with open(LOG, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}\n")


def token():
    for line in open("/opt/nipei-control/.env"):
        if line.startswith("NIPEI_API_TOKEN="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("NIPEI_API_TOKEN missing")


def entregar(job_id, ok, resultado):
    req = urllib.request.Request(
        f"{APP}/api/tarefas/entregavel", method="POST",
        data=json.dumps({"job": job_id, "ok": ok, "resultado": resultado}).encode(),
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            log(f"{job_id} entregue: {r.read()[:200]!r}")
    except Exception as e:  # keep the job in rodando/ so the stale check retries the report later
        log(f"{job_id} ERRO ao entregar: {e}")


def main():
    for d in ("pendentes", "rodando", "feitos"):
        os.makedirs(f"{JOBS}/{d}", exist_ok=True)
    # Jobs left "rodando" by a crash: report them as failed so the task doesn't wait forever.
    for f in os.listdir(f"{JOBS}/rodando"):
        p = f"{JOBS}/rodando/{f}"
        if f.endswith(".json") and time.time() - os.path.getmtime(p) > STALE:
            entregar(f[:-5], False, "O trabalho foi interrompido (servidor reiniciado ou tempo esgotado). Peça de novo.")
    for f in sorted(os.listdir(f"{JOBS}/pendentes")):
        if not f.endswith(".json"):
            continue
        src, dst = f"{JOBS}/pendentes/{f}", f"{JOBS}/rodando/{f}"
        shutil.move(src, dst)
        job = json.load(open(dst))
        log(f"{job['id']} começou ({job['taskId']}, pedido por {job['pedidoPor']})")
        cmd = ["docker", "exec", CONTAINER, "hermes", "chat", "-Q", "-t", "web", "--provider", "openrouter",
               "-m", MODEL, "--max-turns", "25", "-q", job["prompt"]]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT)
            out = (r.stdout or "").strip()
            ok = r.returncode == 0 and "#" in out
            entregar(job["id"], ok, out if ok else (out or r.stderr)[-2000:])
        except subprocess.TimeoutExpired:
            entregar(job["id"], False, f"O Hermes passou de {TIMEOUT // 60} minutos e foi interrompido.")


if __name__ == "__main__":
    main()
