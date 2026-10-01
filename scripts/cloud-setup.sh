#!/bin/bash
# =============================================
# ☁️ Prepara una sesión en la nube de Claude Code (en local no hace nada)
# Lo lanza el hook SessionStart de .claude/settings.json al empezar o retomar una sesión.
# Instala las dependencias y, si la red lo permite, el Chromium de Playwright para las pruebas de navegador.
# Si Chromium no se puede descargar, la sesión usa `npm run test:core` y las pruebas de navegador las pasa
# GitHub Actions en el pull request.
# =============================================
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if [ ! -d node_modules/playwright ]; then
  npm ci --no-audit --no-fund >/tmp/npm-ci.log 2>&1 || echo "⚠️ npm ci falló: mira /tmp/npm-ci.log"
fi

if npx playwright install --with-deps chromium >/tmp/pw-install.log 2>&1 \
  || npx playwright install chromium >>/tmp/pw-install.log 2>&1; then
  echo "✅ Entorno listo: npm test completo (incluye el navegador)."
else
  echo "⚠️ No se pudo descargar Chromium (red de la nube). Usa 'npm run test:core'; el navegador lo comprueba GitHub Actions en el PR."
fi
exit 0
