# Uso (desde la raíz del repo): ./scripts/deploy.ps1
# Push a main -> espera el workflow "deploy" (build en GitHub + deploy en el VPS) -> confirma que el sitio responde.
$ErrorActionPreference = "Stop"
$t = [Diagnostics.Stopwatch]::StartNew()
$sha = git rev-parse HEAD
git push origin main
if ($LASTEXITCODE) { exit 1 }
Write-Host "push: $($t.Elapsed.TotalSeconds.ToString('0'))s"

$run = $null
for ($i = 0; $i -lt 20 -and -not $run; $i++) {
  Start-Sleep 3
  $run = gh run list -w deploy -c $sha -L 1 --json databaseId -q '.[0].databaseId'
}
if (-not $run) { Write-Host "No hubo workflow (¿el commit no toca agent-os-nipei/source?)"; exit 0 }
gh run watch $run --exit-status --interval 10
if ($LASTEXITCODE) { Write-Host "Falló: gh run view $run --log-failed"; exit 1 }

# El paso "Deploy en el VPS" del workflow ya imprime la imagen en uso; aquí solo confirmamos que responde.
$code = (Invoke-WebRequest https://os.nipeihu.app/login -TimeoutSec 20 -UseBasicParsing).StatusCode
Write-Host "os.nipeihu.app/login -> $code · total $($t.Elapsed.TotalSeconds.ToString('0'))s"
