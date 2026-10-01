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

## Arquitectura del proyecto (resumen; no repetir aquí lo que ya cuentan los docs)

- Motor puro sin DOM en `src/engine.js`, `src/items.js`, `src/events.js`, `src/meta.js`; todo el
  azar se recibe por parámetro (`rng`). La capa de presentación vive solo en `src/ui.js`.
- Contenido como datos en `src/data/`. Nunca vanilla JS con dependencias de build: sin bundler,
  sin framework, sin npm en producción (solo Playwright como dev-dependency de test).
- `planning.md` es **solo lo pendiente**; lo ya decidido o implementado va a `historial.md` (log
  compacto). Actualiza el que corresponda al terminar un cambio de alcance.
- Antes de comitear: `npm test` (motor, eventos, equipo, guardado, equilibrio y navegador).

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
