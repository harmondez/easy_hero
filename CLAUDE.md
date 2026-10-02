# Easy Hero — guía para trabajar en este repo

## Dirección visual: fantasía oscura de mazmorra

<always_use_dungeon_fantasy_theme>
Easy Hero usa siempre esta dirección estética. No volver al azul-índigo/Inter por defecto.
- **Paleta**: piedra y forja. Fondos casi negros y cálidos (`--bg-main #15100c`, nunca azulados),
  ámbar de forja como acento principal (`--primary #d9662c`), oro de leyenda para lo especial
  (`--gold #f0b03c`). Toda la paleta vive en `:root` de `style.css`: cambiar ahí, nunca poner un
  hex suelto en un componente salvo que sea un color funcional (rareza de objeto, tipo de nodo).
- **Tipografía**: `Cinzel` (grabado en piedra) SOLO para títulos y momentos de impacto — nombre
  del juego, nombres de combatientes, títulos de evento/fin/combate. `Work Sans` para todo lo
  demás (cuerpo, botones, listas): a tamaños pequeños Cinzel no se lee bien. Los números de
  estadísticas (ATK/HP/semilla) van en monoespaciada, como un cómputo.
- **Motivo**: piedra, antorcha, pergamino, forja. Nunca gradientes SaaS genéricos, glassmorphism
  ni tarjetas redondeadas idénticas con la misma sombra gris — cada superficie usa el `--accent`
  de su propio contexto (rareza, tipo de daño, resultado).
- **Movimiento**: un momento orquestado por transición, no efectos sueltos en cada tarjeta. Las
  vistas (`.rpg-view`) entran deslizando una vez; nada de fade-in escalonado por elemento.
- **Antes de añadir una pantalla nueva**: usa el skill `frontend-design` (ya instalado, scope de
  proyecto) para revisar la propuesta contra esta dirección antes de escribir CSS.
</always_use_dungeon_fantasy_theme>

## Qué es y cómo está hecho

RPG por turnos para navegador, estilo DragonFable: el juego es el **Modo Aventura** (Zafias: escenas sobre un mapa
pintado, NPC con diálogos de novela visual, misiones, combates con efectos de estado, maná y habilidades, armas y
tienda). El **descenso** de mazmorra sin fin de las primeras versiones está aparcado: su código sigue (y sus pruebas,
entrando con `?inicio`), pero el juego no lleva a él. Vocabulario: **PH** (Poder de Habilidad) para lo «mágico» y
**ATK** (Poder de Ataque) para el golpe básico. JavaScript vanilla con módulos ES, sin bundler ni framework; se
publica como web estática.

| Pieza | Dónde |
|---|---|
| Motor puro (sin DOM; el azar llega por parámetro `rng`) | `src/engine.js` (combate, mapa), `src/effects.js` (efectos de estado), `src/items.js`, `src/events.js`, `src/meta.js` (progreso permanente), `src/save.js` |
| Presentación | `src/ui.js` (pantallas, combate de lado), `src/adventure-view.js` (visor de Zafias), `src/intro.js` (la introducción; guion en `src/data/intro.js`), `style.css`, `index.html`. Se entra directo a la aventura (`?inicio` abre la pantalla de la mazmorra) |
| Controladores | `src/main.js` (descenso y arranque), `src/adventure.js` (Modo Aventura) |
| Contenido como datos | `src/data/` (monstruos, variantes, eventos, equilibrio, criaturas con nombre `creatures.js`, misiones `quests.js`, equipo de la aventura `gear.js`, efectos de estado y elixires `effects.js`, retratos de los diálogos `characters.js`, introducción `intro.js`, zonas en `src/data/zones/`, registro de arte `art.js`) |
| Arte | `img/sprites` (`enemigo_*`, `heroe_*`), `img/bg` (fondos), `img/zones` (mapas); en WebP. Iconos en `img/ui` (`ART.icons`). Los PNG originales y `img/entrantes/`, `img/map-divided/`, `img/map-divided-upscaled/`, `img/weapons/`, `img/items/`, `img/icons/`, `img/characters/`, `taller/` NO se suben |
| Herramientas | `tools/sprites.mjs` (`npm run sprites`: PNG → juego; también `arma_<id>`), `tools/icons.mjs` (`npm run icons`: iconos y objetos de `img/items` e `img/icons`, piezas de equipo de `img/weapons` y marcos de `img/icons/buttons-ui` → `img/ui`; retratos de `img/characters` → `img/portraits`), `tools/image-generator/` (`npm run generate`: Asset Factory con Gemini; tipo `portrait` para retratos), `tools/vn.mjs` (`npm run vn`: novela visual rápida, NPC con retrato y diálogo; receta en `docs/novela-visual.md`), `tools/build-site.mjs` (web publicable), `tools/version.mjs` (versiones), `tools/split-map.mjs` (parte el mapa en piezas) y `tools/assemble-map.mjs` (lo recompone con las piezas HD), `tools/zone-overlay.mjs` (cuadrícula para colocar paradas) y `tools/trace-paths.mjs` (traza solos los caminos a trazos). Receta de una zona nueva: `docs/zonas.md` |
| Pruebas | `npm test` = `test:core` (motor, eventos, equipo, guardado, equilibrio, sprites, zonas, criaturas) + navegador (Playwright) + recorrido de la aventura. Banco de equilibrio de la aventura: `npm run sim:aventura` |
| Publicación | GitHub Actions: pruebas en cada PR y publicación en GitHub Pages al fusionar en `main`; vistas previas por PR en Cloudflare. Ver `cloud-method.md` |

- Dev-dependencies solo para herramientas y pruebas (Playwright, sharp, @google/genai); el juego no carga nada de npm.
- La clave de Google va en `.env` (`GOOGLE_API_KEY`, ignorado por git); plantilla en `.env.example`.
- `planning.md` es **solo lo pendiente**; lo hecho y cómo se resolvió va a `historial.md` (la bitácora). Los demás
  documentos describen el proyecto tal como es.
- Antes de comitear: `npm test`.

## Trabajo autónomo (sesiones en la nube y encargos)

Si trabajas en una sesión en la nube (`CLAUDE_CODE_REMOTE=true`) o sobre un **issue con la etiqueta `nube`**,
eres un «obrero» de la cadena descrita en `docs/produccion-nube.md`. Reglas:

- **Un encargo = una rama = un pull request.** La rama se llama `nube/<n.º-de-issue>-<tema-corto>`. El PR enlaza
  el issue con `Closes #N`. Nunca trabajes sobre `main` ni hagas `git push` a `main`.
- **Nunca publiques ni subas versión**: nada de `tools/version.mjs`, etiquetas `v*`, ni tocar `README.md`
  "Novedades". Eso lo hace el integrador al fusionar.
- **Haz solo lo que pide el encargo.** Respeta su lista de «No tocar». Si ves algo más que mejorar, anótalo en
  la descripción del PR (sección «Para después»), no lo hagas.
- **Pruebas antes de abrir el PR**: `npm test` si hay Chromium; si no, `npm run test:core` y dilo en el PR (el
  navegador lo pasará GitHub Actions). Añade pruebas para lo nuevo, pocas y que se entiendan.
- **Contenido como datos**: zonas, misiones, diálogos y monstruos van en `src/data/`, no en código.
- **No toques los documentos compartidos** (`CHANGELOG.md`, `historial.md`, `planning.md`, `README.md`): los
  actualiza el integrador al fusionar, para que dos encargos a la vez no choquen. Lo que haya que anotar, ponlo
  en la descripción del PR.
- **Pruebas nuevas en su propio archivo** (`tests/<tema>.test.mjs` o `tests/<tema>-sim.mjs`, añadido a `npm test`),
  no al final de `tests/browser.test.mjs`: es otro punto donde dos encargos chocan.
- **Ante una duda de diseño, no inventes**: elige la opción más conservadora, sigue, y explícala en el PR
  («Decisiones que tomé»). Si la duda bloquea, para y pregúntalo en el PR.
- **Respeta la dirección visual** de este archivo y escribe todo en español, como el resto del proyecto.
- **Commits** en español, explicando el porqué, terminados en la línea de coautoría de Claude.
