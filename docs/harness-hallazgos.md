# 🧪 Harness de pruebas — hallazgos

Registro de las ejecuciones del harness de `tools/harness/`, un conjunto de pruebas de propiedades
(*property-based*) y fuzzing que se suma a la suite normal (`npm test`). Mientras `npm test` comprueba
comportamientos concretos con valores exactos, el harness lanza miles de combinaciones aleatorias contra
invariantes generales («las estadísticas nunca son NaN», «el combate siempre termina», «guardar y
restaurar no cambia nada») para encontrar rincones que nadie ha pensado en probar a mano todavía.

**Cómo se ejecuta:**
```bash
node tools/harness/run-all.mjs        # las 6 fases en escalera, para en la primera que falle
node tools/harness/04-descent-fuzz.mjs  # una fase suelta
```

## Las 6 fases (de la más barata a la más cara)

| # | Fase | Qué ataca | Coste |
|:-:|------|-----------|:-----:|
| 1 | Integridad de datos | Duplicados, referencias rotas, números sin sentido en `src/data/*.js` (estático, sin azar) | ~instantáneo |
| 2 | Motor puro | Mapas, monstruos y combate: miles de semillas × tramos × variantes | ~10 s |
| 3 | Objetos y botín | `createRpgItem`, `rollLootDrop`, secuencias de inventario | ~5 s |
| 4 | **Descenso multi-tramo** | Partidas completas que bajan de verdad tramo tras tramo (hasta morir o 12 tramos), con los 3 bots | ~30 s |
| 5 | Guardado/restauración | Cientos de partidas a medias (mapa, combate con variantes, evento, botín) guardadas y recargadas | ~5 s |
| 6 | Progreso persistente | La Forja, expedición, XP/nivel, logros — sobre todo casos límite | ~1 s |

La fase 4 es la que más vale la pena: es la única prueba de este proyecto (harness o suite normal) que baja
de verdad varios tramos seguidos con variantes activas. El propio `npm run balance` / `tests/balance-guard.mjs`
**solo simula el tramo 0** — es una limitación conocida, ya anotada en `planning.md` antes de este harness.

---

## Ejecución del 2026-09-30

**Resultado final: 103.054 comprobaciones, 0 bugs.** Se encontraron y corrigieron **2 bugs reales** durante
la primera pasada (documentados abajo); tras corregirlos, las 6 fases pasan limpias.

### 🐛 Bug 1 — `cloneCombat` en `tools/sim.mjs` no copiaba `heroStatus`

**Encontrado por:** fase 4 (descenso multi-tramo), bot `experto`, 48 de 150 partidas.

**Síntoma:** `Cannot read properties of undefined (reading 'poison')` / `'burn'` al enfrentarse a cualquier
monstruo con la variante **de la Plaga** o **de las Brasas**.

**Causa:** el bot `experto` mira dos rondas por delante clonando el combate (`cloneCombat`, en
`tools/sim.mjs`) antes de decidir. Esa función es de antes de que existieran las variantes de monstruo
(1.4.0) y no clonaba `combat.heroStatus` (el estado de veneno/quemadura *sobre el héroe*, que sí es nuevo).
Al simular un golpe de un monstruo con esa variante, el motor intentaba escribir en
`combat.heroStatus.poison` sobre un `undefined` y lanzaba.

**Alcance real:** el motor del juego en sí (`src/engine.js`) nunca falla — el combate real de un jugador no
clona nada. El bug vivía solo en la herramienta de simulación (`tools/sim.mjs`), y ahí sí era grave: **el
banco de equilibrio (`npm run balance`) y `tests/balance-guard.mjs` nunca han probado el bot experto contra
un monstruo con variante**, porque `playRun()`/`runBatch()` no pasan tramo ni variantes a
`createRpgMonster()` (siempre tramo 0 «limpio»). El día que alguien recalibre el descenso con variantes
activas en el banco, esto habría reventado en silencio.

**Corrección:** `tools/sim.mjs` — `cloneCombat` ahora también clona `heroStatus`.
```diff
- const { hero, monster, turn, defending, cooldowns, lastAction, over, result, state } = c;
- return { ...clone({ hero, monster, turn, defending, cooldowns, lastAction, over, result, state }), intro: [], rng: STUB_RNG };
+ const { hero, monster, turn, defending, cooldowns, lastAction, over, result, state, heroStatus } = c;
+ return { ...clone({ hero, monster, turn, defending, cooldowns, lastAction, over, result, state, heroStatus }), intro: [], rng: STUB_RNG };
```
**Verificado:** fase 4 vuelve a pasar limpia (0/450 partidas con error); `tests/balance-guard.mjs` sigue en
verde (no dependía de este camino, así que no cambia ningún número de equilibrio).

**Pendiente, no bloqueante:** el banco de equilibrio real (`tools/balance.mjs`, `tests/balance-guard.mjs`)
sigue sin simular variantes ni tramos > 0. Este bug solo se pudo encontrar porque el harness sí lo hace.
Extender el banco oficial a eso es trabajo aparte (ya apuntado en `planning.md`), no se ha tocado aquí.

---

### 🐛 Bug 2 — Tres logros lanzaban excepción con un contexto incompleto

**Encontrado por:** fase 6 (progreso persistente), casos límite de `checkAchievements`.

**Síntoma:** `Cannot read properties of undefined (reading 'equipped'/'equipment')` al llamar a
`checkAchievements(meta, ctx, cfg)` con un `ctx` que tiene `result` pero no `hero`/`stats`.

**Causa:** en `src/meta.js`, los logros `no_gear_win`, `flawless` y `full_gear` comprobaban `!!ctx` pero
luego leían `ctx.stats.equipped`, `ctx.stats.fled` o `ctx.hero.equipment` sin comprobar que esos subcampos
existieran.

**Alcance real:** **no alcanzable desde el juego tal y como está hoy.** Los 4 sitios donde `src/main.js`
llama a `checkAchievements` pasan siempre `null` o un objeto con `result`, `hero` y `stats` los tres a la
vez — nunca uno suelto. Es un hallazgo de robustez (código frágil ante un cambio futuro), no un bug en
producción.

**Corrección:** los tres `check` añaden la comprobación del subcampo que usan, con el mismo estilo
defensivo que ya usa el resto de `src/meta.js` (p. ej. `recordMonsterSeen`):
```diff
- check: (m, ctx) => !!ctx && ctx.result === 'victory' && ctx.stats.equipped === 0
+ check: (m, ctx) => !!ctx && !!ctx.stats && ctx.result === 'victory' && ctx.stats.equipped === 0
```
(y análogo para `flawless` con `ctx.stats.fled`, y `full_gear` con `ctx.hero`/`ctx.hero.equipment`).

**Verificado:** fase 6 pasa limpia; `tests/meta-sim.mjs` (62 comprobaciones, incluida la que fija estos tres
logros con un contexto real) sigue en verde sin cambios.

---

### Lo que se probó y NO encontró nada (para que quede constancia de qué está cubierto)

- **724** comprobaciones de integridad estática sobre los 6 archivos de datos nuevos de la 1.4.x
  (monstruos, variantes, mejoras de La Forja, balance): sin ids duplicados, sin referencias rotas, sin
  pesos o costes que no tengan sentido.
- **80.372** comprobaciones sobre el motor puro: generación de mapas (conectividad, un único jefe,
  determinismo) en 1.200 combinaciones semilla×tramo; estadísticas de monstruo finitas y positivas en
  **todas** las combinaciones tipo×tramo(0-8)×piso×variante (15×9 = 135 combinaciones de variante, algunas
  imposibles en el juego real pero probadas igual); 800 combates completos con acciones aleatorias, sin uno
  solo que no terminara en 300 rondas.
- **17.609** comprobaciones sobre objetos y botín: las 122 bases en las 5 rarezas a profundidades de hasta
  el tramo ~10; las 5 fuentes de botín respetando su rareza mínima; que un rasgo único ya equipado nunca se
  repita (500 tiradas); 300 secuencias de 40 pasos aleatorios de equipar/guardar/descartar sin que el
  inventario se desborde ni el ATK baje de 1.
- **900** comprobaciones de descensos completos (torpe/sensato/experto × 150 semillas cada uno, hasta 12
  tramos o la muerte): profundidad máxima alcanzada — torpe hasta el piso 45, sensato y experto hasta el
  piso 79 (el tope del harness, no del juego) — sin un solo bloqueo del bucle de nodos.
- **3.400** comprobaciones de guardar/restaurar 400 partidas a medias en mapa, combate (con variantes
  activas), evento y botín: el héroe, el tramo, la posición y el estado de veneno/quemadura sobreviven
  exactos, y el combate restaurado se puede seguir jugando.
- **49** comprobaciones de casos límite en La Forja/expedición/logros: comprar cada mejora hasta el tope sin
  que el oro quede negativo, oro/XP con cantidades negativas o del tamaño de `MAX_SAFE_INTEGER`, el reloj de
  la expedición yendo hacia atrás o saltando 1.000 horas de golpe, gastar puntos de nivel de más.

### Lo que este harness NO cubre (para no venderlo como más de lo que es)

- **Nada de interfaz ni de navegador** — eso ya lo hace `tests/browser.test.mjs` (174 comprobaciones), que
  no se ha tocado ni repetido aquí.
- **No mide equilibrio** (tasas de victoria, coste por combate) — para eso está `npm run balance` y
  `tests/balance-guard.mjs`. El harness busca *bugs* (cosas que rompen), no *desequilibrio* (cosas que
  funcionan pero están mal calibradas).
- El fuzzing de combate usa **acciones aleatorias**, no las políticas de bot reales de `tools/sim.mjs` — es
  a propósito: encuentra crashes en rincones que un bot «razonable» nunca visitaría (por ejemplo, usar
  Huir contra un jefe una y otra vez, o Habilidades con todo enfriándose).
