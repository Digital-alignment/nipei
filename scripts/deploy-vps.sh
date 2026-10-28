#!/bin/sh
# Baja la imagen ya compilada en GitHub y reinicia solo el contenedor de la app. Sin compilar nada aquí.
set -eu
cd /opt/nipei-control
inicio=$(date +%s)
git pull --ff-only -q origin main
docker compose pull -q app
docker compose up -d app
echo "deploy ok en $(( $(date +%s) - inicio ))s · $(docker inspect -f '{{.Config.Image}} {{.Image}}' nipei-os)"
