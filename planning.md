# 🗺️ Planificación — qué queda por hacer

> Solo lo **pendiente o planeado**. Lo ya decidido, investigado o implementado está en **[historial.md](historial.md)**
> (entregas A y B1, decisiones cerradas, supuestos confirmados).
>
> Basada en [jrpg-trend.md](jrpg-trend.md), [test-method.md](test-method.md) y [docs/eventos.md](docs/eventos.md).

**Esfuerzo relativo:** 🟢 pequeño (horas) · 🟡 medio (1-2 días) · 🔴 grande (varios días).
**Reglas del proyecto:** JavaScript vanilla, emojis y CSS, contenido como datos, motor puro y probado.

---

## 📍 Estado actual

**Publicado: entregas A y B1, decorado/onboarding, 4 paneles (Bestiario, Colección, Logros, Opciones),
pantalla de Personaje, inventario de 10 ranuras, oro y el trofeo del jefe final — hasta la versión 1.2.0.**
Detalle en [historial.md](historial.md).

**🚧 Sin publicar, listo para revisar:** estadísticas primarias (STR/DEX/INT/VIT) y nivel de personaje
**permanente** con experiencia y reparto de puntos. Reabre a propósito «meta-progresión solo horizontal»
(decisión explícita del usuario). Con las primarias en su base, el juego se comporta igual que antes — no hace
falta recalibrar nada del equilibrio ya publicado. Además, el mapa se dibuja al revés (piso 0 arriba, jefe abajo)
y con niebla de guerra progresiva (`RPG_FOG_AHEAD = 3`); el icono de monstruo pasa de 👹 a 👾. 671 comprobaciones
en verde. Detalle en [historial.md](historial.md).

**Backlog abierto de B1 (no bloquea nada, se retoma cuando convenga):**
- Capturas de pantalla (`SHOT_DIR=…`) de la pantalla de botín y el panel de 4 ranuras, para revisar el aspecto.
- Script de viabilidad de las 6 armas y cada afijo (que ninguna base o afijo domine). Sin datos todavía.
- El experto (37,8 %) casi no dobla ya al sensato (22,3 %): revisar cuando lleguen las mejoras de B2.

**Backlog abierto del decorado (no bloquea nada):**
- Solo se rediseñó la pantalla de inicio a fondo; el resto de vistas (mapa, combate, eventos, botín, fin) solo
  heredan la paleta nueva por la cascada de variables CSS, sin una pasada propia todavía.
- El catálogo de eventos «vistos X/15» no tiene panel propio (el dato ya se registra en `meta.eventsSeenEver`).
- Los 15 logros son un primer borrador (el plan preveía ~20); fácil de ampliar en `src/meta.js`.

**Backlog abierto del inventario/oro/trofeo (no bloquea nada):**
- El oro no se gasta en nada todavía: no hay tienda. Es el candidato natural para el próximo secundario (ver S5).
- La pantalla de Personaje no muestra los **afijos completos** de cada objeto tan detallados como podría (usa
  `describeItem()`, que ya existe); revisar si conviene ampliarla cuando lleguen las mejoras de B2.
- Sin viabilidad medida de si 10 ranuras de inventario son demasiadas o pocas para una ruta de 16 pisos; se verá
  con el uso real.

**Backlog abierto de las primarias/nivel (aplazado a propósito, fuera de la fase 1):**
- **Velocidad de ataque** y **daño contra 8 tipos de criatura** (bestia/humanoide/no muerto/dragón/máquina/
  elemental/goblin/orco): necesitan, respectivamente, el orden de turnos (P9) y etiquetar los 24 del bestiario
  con un tipo que hoy no existe.
- **Daño por sangrado** (un tercer DOT, junto a veneno y quemadura) y **probabilidades** de aturdir/quemar/
  envenenar: hoy veneno y quemadura son garantizados al golpear (si tienes la regla), no una tirada. Aturdir no
  existe (saltaría el turno del enemigo: es mecánica nueva).
- **Maná (MP)**: sigue siendo de la entrega C, como ya estaba previsto; Golpe de Fuego sigue con enfriamiento.
- **Resistencia elemental**: se calcula y se ve en la pantalla de Personaje, pero no hace nada todavía — los
  monstruos no tienen un tipo de daño propio (solo las armas del héroe lo tienen). Falta dárselo.
- **Calibrar los números** (XP por victoria, curva de nivel, puntos por nivel, cuánto valen crítico/esquiva/
  resistencia) contra el banco de equilibrio: son de relleno, como lo fueron el oro y los primeros números del
  equipo, pendientes de una pasada real cuando el sistema esté más completo.
- Sin interfaz para **ver** las estadísticas secundarias derivadas en detalle (hoy se resumen como chips sueltos
  en la pantalla de Personaje: crítico, esquiva, resistencia, daño elemental).

**Siguiente paso: entrega B2** — P6 (mejoras) y P7 (afinidad), ver abajo.

---

# ⭐ PRINCIPALES pendientes

| # | Principal | Qué aporta al jugador | Esfuerzo | Entrega |
|:-:|-----------|----------------------|:--------:|:-------:|
| **P6** | Mejoras pasivas «elige 1 de 3» | Una **elección** tras cada combate | 🟡 | B2 |
| **P7** | Afinidad y clase emergente | **Identidad** y logro: «has despertado como…» | 🟡 | B2 |
| **P8** | Debilidades y Ruptura (Break) | El corazón táctico del combate JRPG | 🔴 | C |
| **P9** | Varios enemigos y orden de turnos | Encuentros con **vida**, jefes con esbirros | 🔴 | C |
| **P10** | Crónica y Legado (meta horizontal) | **Horas de juego**: siempre hay algo por descubrir | 🟡 | D |
| **P11** | Niveles de Riesgo | Rejugabilidad tras la primera victoria | 🟡 | D |

## P6 · 🎁 Mejoras pasivas «elige 1 de 3»

**Qué.** Tras **cada combate normal** se ofrecen **3 mejoras** y el jugador **elige 1**. Son **pasivas sin ranura**: cambian
**reglas**, no solo números. Conviven con el equipo, pero **no compiten** por sus ranuras.

**Por qué.** Es el motor de **agencia** del género (la elección de carta de Slay the Spire) y da el gancho «¿cuál me llevo?»
tras cada victoria.

**Cómo.**
- `src/data/upgrades.js`: ~30 mejoras con **familia** (⚔️ / 🗡️ / 🔥 / neutra).
- Cada mejora es un efecto sobre las reglas mediante los **ganchos** que ya usa el equipo (`onCombatStart`, `onAttack`,
  `onDefend`, `onDamaged`, `onVictory`, `global`; ver `src/items.js` y `rules` en `src/engine.js`).
- Ejemplos: «Piel de piedra» (al Defender, devuelves 2 de daño) · «Segundo aliento» (curas 3 al empezar) · «Golpe furtivo»
  (primer ataque ×2) · «Filo envenenado» (envenena al golpear) · «Brasas» (Golpe de Fuego quema 3 rondas) · «Reserva
  arcana» (las habilidades se enfrían 1 ronda antes).
- **Mismas 5 rarezas que el equipo** (⚪🟢🔵🟣🟠), mismo color de borde: un solo lenguaje visual para todo el botín. La
  rareza aquí sube la **potencia o la ambición del efecto**.
- Se sortean con la **semilla**; nunca 3 de la misma familia; animación de revelado de las opciones.

**Hecho cuando.** Cada ruta ofrece ≥ 10 elecciones; ninguna mejora rompe invariantes (miles de builds al azar); ninguna
domina (tasa de elección y de victoria).

## P7 · 🎭 Afinidad y clase emergente

**Qué.** Los **objetos y las mejoras** suman **afinidad** a su familia. Al llegar a los umbrales, el héroe **despierta**: una
pantalla celebra «Has despertado como **Elementalista**» y **desbloquea** una habilidad. Con dos familias altas, un **híbrido**.

**Por qué.** Es la promesa central del juego y da un **momento de logro** a mitad de ruta. El arma y la secundaria ya
empujan hacia una clase (`fam` en `src/data/items.js`: espada y escudo → guerrero; daga y veneno → pícaro; bastón y
grimorio → elementalista), así que la base ya está puesta.

**Cómo.** Umbrales **3** (rasgo) y **6** (habilidad de clase); 3 clases puras + 3 híbridas con nombre propio; 2 habilidades por
clase con **enfriamiento** (el MP queda para la entrega C); barras de afinidad en el panel; la carta del héroe cambia al despertar.
`hero.affinity` ya existe en el motor (`{ guerrero, picaro, elementalista }`) pero nada la alimenta todavía.

**Hecho cuando.** Tests de umbrales y habilidades; captura del momento de despertar revisada; las **3 clases son viables**.

> Al sumar P6 y P7 el poder subirá: **recalibrar** monstruos con el banco (`npm run balance`) al cerrar B2. Objetivo
> sigue siendo sensato ≈ 20 %.

## P8 · 💥 Debilidades y Ruptura (Break)

**Qué.** Los 6 tipos de daño. Cada enemigo tiene un **escudo** y 1-2 **debilidades**, ocultas (`?`) hasta acertarlas. A escudo 0:
**Ruptura**.

**La idea clave:** la **Ruptura cancela la intención del enemigo** y da al héroe una **acción extra inmediata** con daño ×1,5.
Así la recompensa no es «fugaz» y se combina con las intenciones visibles (P1, ya hecho).

**Con el equipo ya hecho, es más rica:** el **arma primaria marca tu tipo de daño** (`damaged` en el objeto), así que
**cambiar de arma cambia contra qué debilidades juegas**. Al pasar el cursor por un nodo del mapa se podría **revelar una
debilidad** ya conocida del bestiario.

**Hecho cuando.** Tests de escudo, ruptura, cancelación y acción extra; el banco de equilibrio la incluye; las 6 armas tienen
enemigos débiles a su tipo.

## P9 · 👥 Varios enemigos y orden de turnos

**Qué.** Combates de **1 a 3 enemigos** con selección de objetivo, **SPD** y **línea de turnos visible**; el evento de la chica
herida pasa a **3 bandidos reales**; los sub-jefes traen **esbirros**.

**Cómo.** `combat.enemies[]` en lugar de `combat.monster`; cola de turnos por SPD. **Es el cambio más invasivo:** va en la
entrega C, cuando el resto ya está probado.

## P10 · 📖 Crónica y Legado (meta-progresión horizontal)

> **Adelantado en parte** (publicado, 1.1.0-1.2.0): ya existe `src/meta.js` con progreso persistente independiente
> del guardado de la partida — Bestiario, Colección, Logros, oro y el trofeo del jefe. Detalle en
> [historial.md](historial.md). Lo de abajo es lo que **falta** de P10 sobre esa base.

**Qué queda.** La derrota y la victoria deben dejar algo más que información:
- **Debilidades descubiertas** en el bestiario: pendiente de P8 (Ruptura), que es quien las define.
- **Catálogo de eventos «vistos 9/15»**: falta mostrarlo en algún panel (el conteo ya se registra en `meta.eventsSeenEver`, solo falta la vista).
- **Ampliar los logros de 15 a ~20**, y ahora que hay oro, decidir si conviene una **tienda** (fuera del alcance original de P10, pero es el paso natural una vez existe una moneda que acumular).
- **Desbloqueo horizontal de verdad:** hoy los paneles solo *muestran* lo descubierto; no hay ninguna partida que
  empiece con menos contenido y lo vaya ampliando. Esa es la pieza central de P10 que sigue sin construir.
- **El Legado:** al morir, tu equipo (más allá del trofeo del jefe, que ya es permanente) queda guardado; en una
  partida futura aparece el evento **«La tumba de un antecesor»**, donde puedes recuperar uno de sus objetos.

**Hecho cuando.** Todo persiste en `localStorage` con versión (la base ya lo hace); los desbloqueos horizontales
se prueban con partidas simuladas; el Legado tiene su propio evento.

## P11 · 🎚️ Niveles de Riesgo

**Qué.** Tras la primera victoria, **niveles acumulativos** (estilo Ascensión): 1. élites +60 %, 2. empiezas con −10 % de vida,
3. curas menos en las hogueras, 4. **objetos con una rareza menos**, 5. eventos con peores resultados, 6. **sin hogueras**, 7+. jefe con
una fase extra.

**Hecho cuando.** El banco mide cada nivel y la dificultad **sube de forma monótona**.

---

# 🧩 SECUNDARIOS pendientes

*Contenido y mejoras que no son tan notorios por sí solos, pero suman.*

| # | Secundario | Qué aporta | Esfuerzo |
|:-:|------------|-----------|:--------:|
| **S1** | 🌲 **3 zonas** con estética y monstruos propios | Variedad según el piso (1-5 / 6-10 / 11-16) | 🟡 |
| **S2** | 🐺 **Bestiario ampliado**: de 15 a ~24 monstruos con patrones propios | Encuentros más variados | 🟡 |
| **S3** | 🎲 **10 eventos más** (hasta 25), con **cadenas** y algunos que **dan objetos** | Densidad de decisiones y memoria de la partida | 🟡 |
| **S4** | 🐉 **Jefe final aleatorio entre 3**, con fases | Identidad del final y rejugabilidad | 🟡 |
| **S5** | 🛒 **Tienda** con oro (vender y comprar objetos, quitar una mejora) | Una economía sencilla | 🟡 |
| **S6** | 🧪 **Consumibles** (2 ranuras) | Recurso táctico de emergencia | 🟡 |
| **S7** | 🩸 **Estados**: aturdir *(quemar y envenenar ya están, desde B1)* | Completa Ruptura/P8 | 🟢 |
| **S9** | 📅 **Ruta del día** (misma semilla para todos) + mejor marca local | Rutina de vuelta sin servidor | 🟢 |
| **S10** | 🔊 **Sonido sintetizado** (WebAudio, cero archivos), temblor y destellos | «Jugosidad»: golpes, Ruptura, botín, despertar | 🟡 |
| **S11** | 🎓 **Primera ruta guiada** con consejos breves | Entrada suave sin pantallas de tutorial | 🟢 |
| **S12** | ⌨️ **Teclado y accesibilidad** (atajos, `prefers-reduced-motion`, contraste, botones táctiles) | Comodidad | 🟢 |
| **S13** | 📲 **PWA**: instalable y jugable sin conexión | Jugar en el móvil como una app | 🟡 |
| **S14** | ⏩ **Velocidad de combate** ×2 y saltar animaciones | Menos fricción | 🟢 |
| **S15** | 📊 **Métricas locales** (opt-in) y panel de estadísticas | Datos reales para equilibrar (sustituye la opinión de los bots) | 🟡 |
| **S16** | 🧰 **Infraestructura**: GitHub Action con `npm test`; acelerar el test del navegador (~131 s) | Confianza al publicar | 🟡 |
| **S17** | 🏷️ **Nombre definitivo, icono y metadatos para compartir** | Presencia al enlazar la página | 🟢 |
| **S18** | 🧩 **Conjuntos de objetos** (bonus por 2 y 4 piezas) | Sinergia y «cazar» piezas | 🟡 |
| **S19** | ☠️ **Objetos malditos** (gran poder con un coste) | Riesgo/recompensa en el botín | 🟡 |
| **S20** | 🔨 **Reforja en la hoguera** (cambiar un afijo) | Tercera opción de la hoguera | 🟡 |

**Los más rentables por su coste:** S9, S11, S12, S14 y S7 (todos 🟢 o casi hechos).

---

# 📦 Entregas que quedan

Cada entrega termina con **tests verdes, banco de equilibrio, capturas revisadas y publicación** en GitHub Pages.

| Entrega | Contenido | Resultado para el jugador |
|:-------:|-----------|---------------------------|
| **B2** | P6 mejoras + P7 afinidad | Cada combate ofrece una elección; aparece la identidad de clase |
| **C · Táctico** | P8 Ruptura · P9 varios enemigos y turnos | El combate JRPG de verdad |
| **D · Largo plazo** | P10 crónica y legado · P11 riesgo | Horas de juego y rejugabilidad |

---

# ⚠️ Riesgos que siguen vivos

| Riesgo | Cómo lo mitigamos |
|--------|-------------------|
| **Mejoras (P6) con 5 rarezas + equipo con 5 rarezas = el doble de contenido** | Una sola tabla de rarezas para todo; las mejoras comparten ganchos con los afijos del equipo; empezar con pocas (~20) y ampliar |
| **Equipo + mejoras = dos fuentes de poder** | Se implementan por separado (ya B1, ahora B2) y el banco se ejecuta tras cada una |
| **El poder crece más que los enemigos y el juego se vuelve fácil** | El 20 % de victoria es el objetivo: se **recalibra tras cada entrega** |
| **Cada cambio mueve el equilibrio** | Palancas **de una en una** y con antes/después documentados en `docs/equilibrio.md` |
| **Los guardados se rompen entre versiones** | Guardado con **versión** y migración; si falla, se descarta con aviso (ya validado en B1 con `SAVE_VERSION`) |
| **La opinión de un bot no es la de un jugador** | 3 bots y, cuando haya jugadores, métricas locales (S15, pendiente) |

---

# ✅ Definición de «hecho» (para cada entrega)

1. **Tests verdes:** motor, eventos, equipo, guardado, equilibrio y navegador.
2. **Banco de equilibrio** ejecutado, con el antes y el después documentados en `docs/equilibrio.md`.
3. **Capturas revisadas** en escritorio y móvil.
4. **Documentación** actualizada (README, `CHANGELOG.md`, `docs/`).
5. **Publicado** en GitHub Pages y comprobado en la URL real.
