# Deploy rápido de Nipëi OS (os.nipeihu.app)

Medido el 2026-10-28. Nada de esto está aplicado todavía: los archivos propuestos están en `docs/deploy-rapido/`.

## 1. Tiempos medidos hoy (antes)

| Etapa | Tiempo | Cómo se midió |
|---|---|---|
| Commit local | ~0 s | Sin hooks de git, sin husky ni lint-staged |
| `prebuild` (`verificar:ds` + `ds-contraste`) | 0,2 s | `time node scripts/...` |
| Push | ~1 s | Repo de 21 MB empaquetados, sin CI ni webhooks (no hay `.github/`) |
| `git pull` en el VPS | ~1 s | `time git fetch` |
| **`docker compose build app` (cambio de código)** | **2 min 32 s** | Copia del contexto en `/tmp` con un archivo cambiado, en el VPS |
| ↳ `next build`: compilación Turbopack | 85 s | log `--progress=plain` |
| ↳ `next build`: TypeScript | 49 s | ídem |
| ↳ páginas + exportar la imagen | ~11 s | ídem |
| `npm ci` extra cuando cambia `package-lock.json` | +28 s (+ exportar 739 MB) | `docker run node:22-alpine npm ci` |
| `docker compose up -d app` | unos segundos | no medido (no estaba autorizado reiniciar) |
| **Total de un deploy típico** | **~2 min 40 s bloqueando la sesión** | |

Durante el build el VPS (2 vCPU, 7,8 GB de RAM, **2,6 GB de swap ya en uso**, 17 contenedores) tuvo los 2 núcleos al ~70 % y mandó memoria a swap (pico `so` = 553 KB/s): el build le quita recursos a n8n, Evolution, Hermes, oca-yary y los demás.

## 2. Causas, por impacto

1. **Se compila Next.js en un VPS de 2 vCPU compartido.** Son 2 min 15 s de CPU pura (compilación + TypeScript). Ninguna caché de Docker evita esto: cualquier cambio en `src/` invalida la capa `COPY . .` y el `next build` corre entero. Probado: con el Dockerfile optimizado (abajo) el build en el VPS siguió en 2 min 44 s. **Optimizar el build en el VPS no lo hace más rápido.**
2. **El deploy es síncrono:** la sesión que hace el deploy espera por SSH a que termine el build.
3. **Imagen inflada:** 1,9 GB en disco (516 MB de contenido) porque lleva `node_modules` completo con devDependencies, el código fuente y la caché de `.next`. Con `output: "standalone"` queda en **130 MB**.
4. **No hay `.dockerignore`.** En el VPS no pesa (el checkout no tiene `node_modules` ni `.next`), pero si alguien compila desde la máquina local entrarían `.next` (2 GB), `node_modules` y `.env.local` (con secretos) a la imagen.
5. **Caché de build acumulada:** `docker builder du` = 12,9 GB recuperables en el VPS, y crece con cada deploy.

Commit y push no son el problema.

## 3. Alternativas evaluadas

| Opción | Tiempo que bloquea la sesión | Carga en el VPS | Costo / riesgo |
|---|---|---|---|
| **A. Build en GitHub Actions → GHCR, el VPS solo hace `pull` + `up`** | **~2 s** (el push; el resto corre solo) | ~15 s de red, cero CPU de compilación | Gratis (repo público: Actions y GHCR sin costo). Requiere un secreto SSH en GitHub |
| B. Compilar en local y enviar la imagen | ~1–1,5 min + subir ~45 MB | Igual que A | Docker no está instalado en esta PC; depende del upload de casa; cada persona/agente necesita Docker |
| C. Solo optimizar el build en el VPS (standalone, caché, `.dockerignore`) | ~2 min 45 s (sin cambios, medido) | Igual que hoy | Imagen 15× más chica, pero no gana tiempo |
| D. Script único de deploy con tiempos | No cambia nada por sí solo | — | Útil encima de A |

## 4. Recomendación: A + standalone + script

Push a `main` → GitHub compila (4 vCPU, 16 GB) y publica `ghcr.io/digital-alignment/nipei-os:latest` y `:<sha>` → GitHub entra por SSH al VPS con una clave que **solo puede ejecutar** `scripts/deploy-vps.sh` → el VPS baja la imagen y reinicia el contenedor.

### Cambios (archivos listos en `docs/deploy-rapido/`)

**`agent-os-nipei/source/next.config.ts`**
```diff
 const nextConfig: NextConfig = {
+  output: "standalone",
+  outputFileTracingRoot: path.resolve(__dirname),
   turbopack: {
```
(`outputFileTracingRoot` evita que Next use el `package-lock.json` de la raíz del repo como raíz del trazado.)

**`agent-os-nipei/source/Dockerfile`** → reemplazar por `docs/deploy-rapido/Dockerfile`:
```diff
-FROM node:22-alpine
-WORKDIR /app
-COPY package*.json ./
-RUN npm ci
-COPY . .
-ENV NODE_ENV=production
-ENV NEXT_TELEMETRY_DISABLED=1
-RUN npm run build
-EXPOSE 3333
-ENV PORT=3333
-ENV HOSTNAME="0.0.0.0"
-CMD ["npm", "run", "start"]
+# syntax=docker/dockerfile:1.7
+FROM node:22-alpine AS deps
+WORKDIR /app
+COPY package.json package-lock.json ./
+RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
+
+FROM node:22-alpine AS build
+WORKDIR /app
+ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
+COPY --from=deps /app/node_modules ./node_modules
+COPY . .
+RUN --mount=type=cache,target=/app/.next/cache npm run build
+
+FROM node:22-alpine
+WORKDIR /app
+ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3333 HOSTNAME=0.0.0.0
+COPY --from=build /app/.next/standalone ./
+COPY --from=build /app/.next/static ./.next/static
+COPY --from=build /app/public ./public
+COPY --from=build /app/scripts ./scripts
+COPY --from=build /app/src/data ./src/data
+COPY --from=build /app/VERSION /app/SEO-SETUP.md ./
+EXPOSE 3333
+CMD ["node", "server.js"]
```
`scripts/`, `src/data/`, `VERSION` y `SEO-SETUP.md` se copian porque el código los lee con `process.cwd()` y el trazado de Next no los incluye solo. `package.json` (lo lee `lib/v2/saude.ts`) ya viene en standalone.

**`agent-os-nipei/source/.dockerignore`** → nuevo, `docs/deploy-rapido/.dockerignore` (excluye `node_modules`, `.next`, `.env*`, docs, etc.).

**`.github/workflows/deploy.yml`** → nuevo, `docs/deploy-rapido/deploy.yml`. Solo corre si el push toca `agent-os-nipei/source/**`, `docker-compose.yml` o el workflow; `cancel-in-progress` hace que, con pushes seguidos, solo se despliegue el último. Usa la caché de capas de GitHub (`type=gha`), así que `npm ci` solo se repite cuando cambia el lockfile.

**`scripts/deploy-vps.sh`** → nuevo, `scripts/deploy-vps.sh`: `git pull` + `docker compose pull app` + `up -d app` e imprime cuánto tardó y qué imagen quedó.

**`scripts/deploy.ps1`** → nuevo, `docs/deploy-rapido/deploy.ps1`: push, espera el workflow con `gh run watch` y confirma que `/login` responde, con tiempos. Opcional: el push solo ya despliega.

**`docker-compose.yml`**
```diff
 services:
   app:
+    image: ghcr.io/digital-alignment/nipei-os:latest
     build:
       context: ./agent-os-nipei/source
```
Se mantiene `build:` como plan B: si GitHub falla, el comando de hoy (`docker compose build app && up -d app`) sigue funcionando.

### Pasos manuales (necesitan tu aprobación; tocan GitHub y el VPS)

1. Copiar los archivos de arriba a su lugar y hacer commit (la sesión principal o quien decidas).
2. Tras el primer run del workflow: hacer **público** el paquete `nipei-os` en GHCR (el código ya es público y la imagen no lleva secretos: las variables entran por el `.env` del VPS al arrancar). Alternativa: `docker login ghcr.io` en el VPS con un token `read:packages`.
3. Clave de deploy: `ssh-keygen -t ed25519 -f nipei_deploy_gha -N ""`. En el VPS, agregar a `/root/.ssh/authorized_keys`:
   `command="/opt/nipei-control/scripts/deploy-vps.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA… nipei-deploy-gha`
   y guardar la clave privada como secreto `VPS_SSH_KEY` del repo. Esa clave solo puede ejecutar el deploy; no da una shell. Sin el secreto, el workflow igual compila y publica, y el deploy se hace a mano con `ssh … /opt/nipei-control/scripts/deploy-vps.sh`.
4. `chmod +x scripts/deploy-vps.sh` (o `git update-index --chmod=+x`).
5. Una vez, para recuperar disco: `docker builder prune` en el VPS (12,9 GB de caché que ya no se va a usar).
6. Actualizar la sección 4 de `CLAUDE.md`: el deploy pasa a ser `git push origin main` (o `./scripts/deploy.ps1` para esperar el resultado).

### Ya verificado

- Build en el VPS con el Dockerfile y el `next.config` propuestos (copia en `/tmp`, etiqueta temporal, después borrada): compila; imagen de **130 MB** (antes 516 MB de contenido, 1,9 GB en disco).
- Contenedor de prueba en `127.0.0.1:3399` con un vault vacío: arranca al instante, `/login` 200, `/hoje` 307 (redirige al login), íconos de `public/` 200, RAM ~111 MB (igual que hoy).
- `nipei-os` no se tocó en ningún momento.

### No verificado

- El workflow de GitHub (requiere hacer push). Tiempo estimado en el runner de 4 vCPU: 1,5–2,5 min de principio a fin, sin bloquear a nadie.
- Las rutas antiguas que leen `scripts/*.py` (`/api/seo/*`, `/api/hermes/studio`): los archivos se copian, pero la imagen alpine no tiene Python, igual que hoy.

## 5. Después (estimado)

| | Antes | Después |
|---|---|---|
| Lo que espera la sesión | ~2 min 40 s | ~2 s (push) |
| De push a producción | ~2 min 40 s | ~2 min (en GitHub) + ~15 s en el VPS |
| CPU del VPS por deploy | ~2 min 15 s con 2 núcleos al ~70 % + swap | ~0 (bajar ~5–20 MB de capas cambiadas) |
| Imagen | 1,9 GB en disco | ~130 MB |
| Caché de build en el VPS | +GB por deploy | no se genera |
| Caída del sitio | segundos (recrear contenedor) | igual |
