# Nipëi vault sync (local side) — run by Windows Task Scheduler ("Nipei Vault Sync", every 2 min).
# Commits Obsidian edits in the local vault, pulls production edits (the VPS pushes every 5 min),
# and pushes back to GitHub (Digital-alignment/nipei-vault).
# On a conflict nothing is overwritten: the rebase is aborted, the commit stays local, and the
# problem is logged until someone resolves it by hand.
$ErrorActionPreference = "Continue"
$Vault = "C:\Users\ondig\Code\Nipei\nipei-vault"
$Log = Join-Path $env:LOCALAPPDATA "nipei-vault-sync.log"
function Log($msg) { Add-Content -Path $Log -Value "$(Get-Date -Format s) $msg" }

if (-not (Test-Path $Vault)) { Log "ERROR: $Vault missing"; exit 1 }
Set-Location $Vault

# Skip if a previous run (or a manual git operation) is still in progress
if ((Test-Path ".git\index.lock") -or (Test-Path ".git\rebase-merge") -or (Test-Path ".git\rebase-apply")) { Log "skipped: git busy"; exit 0 }

git add -A 2>$null
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -q -m "sync(local): $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mmZ'))" 2>$null
  Log "committed"
}

# --autostash: an Obsidian save between the commit and the pull is set aside and put back.
# Only a real content conflict is a CONFLICT; network drops are a RETRY (the next run picks them up).
$saida = (git pull -q --rebase --autostash origin main 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>$null
  if ($saida -match "(?i)conflict|could not apply") {
    Log "CONFLICT: the same note changed here and in GitHub; local commit kept, push skipped. Resolve in $Vault."
    exit 1
  }
  Log "RETRY: pull failed ($(($saida -split "`n")[0].Trim())); next run tries again."
  exit 0
}

if (git rev-list origin/main..HEAD) {
  git push -q origin main 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Log "pushed" } else { Log "RETRY: push failed; next run tries again." }
}
