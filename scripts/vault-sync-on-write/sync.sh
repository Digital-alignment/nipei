#!/bin/sh
# Nipëi vault sync (VPS side) — installed at /opt/nipei-vault-sync/sync.sh; run by cron every 5 minutes
# and by nipei-vault-sync.service on every app write.
# Commits edits made by the production app, pulls edits pushed from the local Obsidian vault, and pushes
# back to GitHub (Digital-alignment/nipei-vault, deploy key nipei_vault_deploy).
# --autostash: the app may write again between our commit and the pull; those edits are set aside and
# put back instead of failing the run. Only a real content conflict is logged as CONFLICT (nothing is
# overwritten: the rebase is aborted and the commit stays local); network hiccups are logged as RETRY
# and the next run picks them up.
set -u
VAULT=/opt/nipei-vault
LOG=/var/log/nipei-vault-sync.log
log() { echo "$(date -Is) $*" >> "$LOG"; }

exec 9>/tmp/nipei-vault-sync.lock
flock -n 9 || exit 0
cd "$VAULT" || { log "ERROR: $VAULT missing"; exit 1; }

git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "sync(vps): $(date -u +%Y-%m-%dT%H:%MZ)" && log "committed $(git diff --stat HEAD~1 --shortstat)"
fi

SAIDA=$(git pull -q --rebase --autostash origin main 2>&1)
if [ $? -ne 0 ]; then
  git rebase --abort > /dev/null 2>&1
  if echo "$SAIDA" | grep -qiE "conflict|could not apply"; then
    log "CONFLICT: the same note changed here and in GitHub; local commit kept, push skipped. Resolve in $VAULT."
    log "  $(echo "$SAIDA" | grep -iE 'conflict' | head -3 | tr '\n' ' ')"
    exit 1
  fi
  log "RETRY: pull failed ($(echo "$SAIDA" | head -1 | cut -c1-160)); next run tries again."
  exit 0
fi

if [ -n "$(git rev-list origin/main..HEAD)" ]; then
  git push -q origin main >> "$LOG" 2>&1 && log "pushed" || log "RETRY: push failed; next run tries again."
fi
