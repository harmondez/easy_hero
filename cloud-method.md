# ☁️ Método de trabajo con sesiones en la nube de Claude Code

Cómo montamos (octubre de 2026) una cadena de producción en la que **sesiones de Claude Code en la nube** hacen
encargos en paralelo y **cada cambio se prueba, se previsualiza y se publica solo**. Este documento es el manual:
qué se instaló, dónde se configura cada cosa, cómo se trabaja a diario y qué falló por el camino.

El plan del mes (oleadas, reparto del crédito) está en [docs/produccion-nube.md](docs/produccion-nube.md).

---

## 1. La idea en una tabla

| Papel | Quién | Dónde | Qué hace |
|---|---|---|---|
| 🎨 Director | El dueño del juego | GitHub, Cloudflare, claude.ai/code | Arte, historia, lanza las sesiones, juega las vistas previas |
| 🧭 Arquitecto e integrador | Claude en local (VS Code) | Este equipo | Diseña, escribe los encargos, revisa cada PR, fusiona y publica. **No gasta el crédito de la nube** |
| 🔨 Obreros | Sesiones en la nube | claude.ai/code → «Code» | Un encargo cada una: su rama y su pull request. **Gastan el crédito** |

**Circuito de cada encargo:**

```
Issue (encargo) → sesión en la nube → rama nube/N-tema → pull request
   → GitHub Actions: npm test (≈4 min)        → rojo: no se fusiona
   → Cloudflare: vista previa jugable del PR  → el director la prueba
   → revisión del integrador → fusión en main → GitHub Pages publica solo
```

---

## 2. Lo que se instaló (una sola vez)

### 2.1 GitHub Actions: control de calidad y publicación
- **Archivo:** `.github/workflows/ci.yml`.
- **En cada pull request y en `main`:** `npm ci`, instala Chromium de Playwright y pasa `npm test` (~768 pruebas, unos 4 minutos). Guarda las capturas de las pruebas como artefacto 7 días.
- **Solo en `main` y solo si las pruebas pasan:** monta la web con `npm run build:site` y la publica en GitHub Pages.
- **GitHub Pages se cambió de «legacy» (rama) a «GitHub Actions».** Se hace en Settings → Pages → Source, o con `gh api -X PUT repos/harmondez/easy_hero/pages -f build_type=workflow`.
- **Coste:** los minutos de Actions son gratis e ilimitados porque el repo es público.

### 2.2 Montaje único de la web
- `tools/build-site.mjs` (`npm run build:site`) copia a `_site/` **solo lo que el juego necesita**: `index.html`, `style.css`, `src/` e `img/`. Deja fuera los PNG originales de `img/`, `img/entrantes/` y `img/map-divided/`.
- Lo usan **GitHub Pages y Cloudflare**, así que las dos webs son idénticas (~1,5 MB y 28 archivos al montarlo).

### 2.3 Cloudflare: vista previa de cada pull request
Es un proyecto de **Workers con archivos estáticos** (el flujo nuevo de Cloudflare, no el Pages clásico).

**En el repo**, `wrangler.jsonc`:
```jsonc
{
  "name": "easy-hero",
  "compatibility_date": "2026-10-01",
  "previews": {},                       // obligatorio para `wrangler preview`, aunque vaya vacío
  "assets": { "directory": "./_site" }  // la web estática que monta build:site
}
```

**En el panel de Cloudflare** (Workers & Pages → easy-hero → Settings → Build):

| Campo | Valor |
|---|---|
| Git repository | `harmondez/easy_hero` (conectado; el aviso azul «disconnected» no debe aparecer) |
| Build command | `npm run build:site` |
| Deploy command (Production) | `npx wrangler deploy` |
| Preview command (Previews) | `npx wrangler preview` |
| Root directory | `/` |
| Branch control (rama de producción) | `main` |
| Builds for Preview branches | **activado** |
| Preview URLs | **activadas** («Enable Preview URLs») |
| API token | uno válido (no «Configured API token unavailable»), en Production y en Previews |
| Workers Observability | no hace falta (la web es estática) |

**Direcciones:**
- Web oficial (GitHub Pages): https://harmondez.github.io/easy_hero/
- Vista previa de una rama: `https://<rama-con-guiones>-easy-hero.hernan96.workers.dev`. Por ejemplo, `nube/3-taller-sprites` → `nube-3-taller-sprites-easy-hero.hernan96.workers.dev`. Cloudflare la deja comentada en el propio PR.
- Copia de `main` en Cloudflare: https://easy-hero.hernan96.workers.dev

### 2.4 Claude Code en la nube
1. **Reclamar el crédito promocional:** 100 $ en el plan Pro (250 $ en Max). Se reclamaba antes del 7 de octubre y caduca el **5 de noviembre de 2026, a las 8:59 CET**. Se ve en la configuración de claude.ai: «Créditos de sesión en la nube».
2. **Conectar GitHub:** en la app de Claude aparece «Probar Claude Code para GitHub» → **continuar con la sincronización con GitHub** → instalar la app de Claude en GitHub con acceso a `easy_hero`.
3. **Usar el modo «Code», no el chat.** La app tiene dos modos: *chat / cowork*, donde solo se conversa, y **Code** (claude.ai/code), que es el que clona el repo, ejecuta y abre PR.
4. **Entorno «Default»**, con red **Trusted** (registros de paquetes, GitHub, etc.).
5. **Setup script del entorno** (engranaje junto a «Default»). Se ejecuta una vez y la nube guarda una «foto» de la máquina durante unos 7 días, así que las sesiones siguientes arrancan con Chromium ya instalado:
   ```bash
   npx -y playwright@1.60 install --with-deps chromium
   ```

### 2.5 En el repo, para que cada sesión arranque sola
- **`.claude/settings.json`:** un hook `SessionStart` que lanza `scripts/cloud-setup.sh`.
- **`scripts/cloud-setup.sh`:**
  - solo actúa en la nube (`CLAUDE_CODE_REMOTE=true`);
  - hace `npm ci` e intenta instalar Chromium;
  - si no puede, avisa de usar `npm run test:core`.
- **`npm run test:core`:** todas las pruebas menos las de navegador, para sesiones sin Chromium. Las de navegador las pasa siempre GitHub Actions.
- **`.gitattributes`:** los `.sh` y `.yml` siempre con saltos de línea LF. Con los de Windows (CRLF) el script fallaría en Linux.
- **`CLAUDE.md` → «Trabajo autónomo»:** las reglas que cada sesión lee al empezar:
  - una rama por encargo, y nunca trabajar sobre `main` ni publicar;
  - solo lo que pide el encargo, respetando su «No tocar»;
  - pruebas antes del PR;
  - dejar constancia en el historial y el CHANGELOG;
  - ante una duda, elegir lo conservador y explicarlo en el PR.

### 2.6 El tablero
- **Plantillas:**
  - `.github/ISSUE_TEMPLATE/encargo.md`: objetivo, contexto, qué hacer, **no tocar**, terminado cuando, modelo.
  - `.github/pull_request_template.md`: qué hace, cómo probarlo, decisiones tomadas, pruebas, para después.
- **Etiquetas:** `nube`, `oleada-1…4`, `sonnet`, `opus` y `calibración`.

---

## 3. El día a día

### Lanzar un encargo
1. Entra en **claude.ai/code**, o en la pestaña **Code** de la app.
2. Comprueba que arriba ponga **Default** (entorno) · **easy_hero** (repo) · **main** (rama), y elige el modelo: **Sonnet** para encargos cerrados, **Opus** para diseño o algo delicado.
3. Pega en el cuadro de la tarea, cambiando N y el tema:
   > Resuelve el issue #N de harmondez/easy_hero siguiendo CLAUDE.md (sección «Trabajo autónomo»): rama nube/N-tema-corto, pruebas, y abre un pull request que cierre el issue cuando termines.
4. **Una sesión nueva por encargo, como mucho 2 a la vez**, con encargos que no toquen los mismos archivos (lo dice su «No tocar»).

### Cuándo NO abrir sesión nueva
- **Para corregir un PR, se escribe en la misma sesión que lo hizo:** ya lo tiene todo en la cabeza.
- **Lo demás, siempre en sesión nueva.** Reutilizar una sesión para otro encargo arrastra toda su conversación anterior y cada mensaje cuesta más. **Instalar paquetes no gasta crédito** (son comandos de la máquina, no del modelo); lo que gasta es el modelo leyendo y escribiendo.

### Revisar y fusionar (lo hace el integrador)
1. **`npm test` en verde** en GitHub Actions.
2. **Vista previa de Cloudflare** construida y jugable. El director la prueba si el cambio se ve.
3. **Código revisado** contra el encargo: hace lo pedido, no toca lo que no debía, trae pruebas nuevas.
4. **Fusión en `main`**, y GitHub Pages publica solo. Subir versión y escribir las Novedades del README lo hace el integrador, nunca la nube.

### Qué va a la nube y qué no
| A la nube | Aquí, en local |
|---|---|
| Herramientas grandes y bien definidas (editor, taller de sprites) | Diseño y decisiones con el director |
| Contenido con molde ya hecho (una misión nueva con su ficha) | Ajustes visuales de ir probando («que parpadee un poco») |
| Lotes repetitivos (pruebas, pasar datos, equilibrio) | Arreglos pequeños (menos de 10 minutos) |

---

## 4. Problemas que tuvimos y su arreglo

| Síntoma | Causa | Arreglo |
|---|---|---|
| Cloudflare intentaba «autoconfigurar» el proyecto | No había `wrangler.jsonc` | Añadir `wrangler.jsonc` con `assets.directory: ./_site` y Build command `npm run build:site` |
| Las ramas no se construían en Cloudflare | Aviso «This project is disconnected from your Git account» | Settings → Build → **Manage** → dar acceso a `easy_hero` a la app de Cloudflare en GitHub |
| Se construía pero sin dirección de vista previa | «Preview URLs are disabled» | **Enable Preview URLs** |
| La publicación podía fallar | «Configured API token unavailable» | Elegir o crear un token en Production y en Previews |
| `wrangler preview` → «missing a `previews` block» | Lo exige el comando, aunque vaya vacío | `"previews": {}` en `wrangler.jsonc` |
| `claude --cloud` desde la terminal → «requires an interactive terminal» | El CLI no lanza sesiones en la nube sin una terminal de verdad | Lanzarlas desde claude.ai/code (pestaña Code) |
| El crédito seguía en 100 $ tras «lanzar» | GitHub aún no estaba conectado a Claude | «Continuar con la sincronización con GitHub» e instalar la app de Claude |
| Pegar la tarea en el chat no hacía nada | El chat normal no ejecuta código | Usar el modo **Code** |
| GitHub avisa de «Node.js 20 is deprecated» en algunas acciones | Acciones oficiales aún en Node 20 (GitHub las fuerza a Node 24) | Funcionan; subirlas de versión cuando salga la nueva |
