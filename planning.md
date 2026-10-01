# 🗺️ Planificación — qué queda por hacer

> Solo lo **pendiente o planeado**. Lo ya decidido, investigado o implementado está en **[historial.md](historial.md)**
> (entregas A y B1, decisiones cerradas, supuestos confirmados).
>
> Basada en [jrpg-trend.md](jrpg-trend.md), [test-method.md](test-method.md) y [docs/eventos.md](docs/eventos.md).

**Esfuerzo relativo:** 🟢 pequeño (horas) · 🟡 medio (1-2 días) · 🔴 grande (varios días).
**Reglas del proyecto:** JavaScript vanilla, emojis y CSS, contenido como datos, motor puro y probado.

---

## 📍 Estado actual

**Publicado hasta la 1.5.1:** entregas A y B1, decorado/onboarding, 4 paneles, Personaje/inventario, oro y
trofeo del jefe, primarias con nivel permanente, niebla de guerra, **el descenso sin fin** (tramos, La Forja,
expedición, 90 monstruos, 22 variantes), el equipo siempre visible, el botín de una sola gota, el harness de
fuzzing, el mapa en el centro como mazmorra visual y **la 1.5.0: combate de lado estilo DragonFable y el Modo
Aventura en Zafias** (primera misión, aldea con posada, tienda y cueva). Detalle en [historial.md](historial.md).

---

## 🏭 Octubre: producción con sesiones en la nube

Hay 100 $ de crédito para sesiones en la nube de Claude Code hasta el 4 de noviembre. El plan completo (papeles,
circuito issue → PR → pruebas → vista previa → fusión, oleadas y reparto) está en
**[docs/produccion-nube.md](docs/produccion-nube.md)**. Siguiente paso: la **fase 0** (preparar el terreno en local).

## 🎭 Ruta actual: Easy Hero estilo DragonFable

**Regla de esta ruta: primero que sea funcional y con contenido.** Los detalles van a **🧩 Perfilados** (abajo)
y se pulen en rondas posteriores. Prioridad web de escritorio; en móvil basta con que funcione.

### 🔥 Camino crítico (en este orden)
1. ✅ **C1 · Combates de verdad en la aventura** (hecho) — los enemigos del bosque abren la pantalla de combate de lado
   con el héroe de siempre. Victoria: el enemigo desaparece y da oro/XP. Derrota: despiertas en la posada con
   la vida llena y algo menos de oro. La aventura se guarda (escena, enemigos vencidos, zonas abiertas).
2. ✅ **C2 · La primera misión, al estilo DragonFable** (hecho) — Maela (la posadera) te pide limpiar el bosque de
   goblins → 3-5 combates en el bosque → el jefe goblin en el **campamento** (escena nueva) → recompensa →
   vuelta a la aldea y diálogo de cierre. Las zonas se abren por historia. Borrador de textos para corregir.
3. ✅ **C3 · La aldea funciona** (hecho) — **posada** (dormir: cura y repuebla el bosque), **tienda** (pociones; La
   Forja accesible desde la aldea) y la **cueva** que baja al descenso con el mismo héroe.
4. ✅ **C4 · Variedad mínima de enemigos** (hecho) — el goblin teñido por familia (filtro CSS) y más grande si es
   sub-jefe o jefe, hasta que llegue su arte.
5. ✅ **C5 · Publicar la 1.5.0** (hecho)

Después: más misiones y zonas de Zafias (santuario, castillo), retratos en los diálogos, más fondos de combate.

### ✅ Hecho (publicado en la 1.5.0)
- Prueba de concepto: Zafias por escenas (aldea y bosque), cámara, héroe caminando, 2 NPC con diálogo, goblin
  visible. 60 fps también con la CPU ×4 más lenta.
- Combate de lado: héroe a la izquierda, enemigo a la derecha, embestida + número de daño, fondo de bosque.
- Panel de pergamino (¡Atacar! grande + iconos), diario plegado, cartel de victoria/derrota sobre el escenario.
- Sin intenciones visibles (patrones ocultos); «de la Niebla» pasa a emboscada.
- Pociones (40 %, gastan turno, máx. 3, 40 de oro en La Forja, se conservan entre partidas).
- Telegrafiado de golpes fuertes: una frase sobre el escenario y el enemigo brilla en rojo, sin cifras.

### Decisiones cerradas (2026-09-30)
| Tema | Decisión |
|---|---|
| Héroe | **El mismo** que el descenso: nivel, equipo, oro y Forja compartidos |
| Relación | Zafias es la superficie; **las cuevas bajan al descenso** de siempre |
| Derrota en la aventura | **Vuelves a la posada** con la vida recuperada y pierdes un poco del oro que llevabas. Lo vencido sigue vencido |
| Movimiento | **Pulsar un punto de interés** (NPC, enemigo, salida): el héroe camina solo hasta él |
| Enemigos | **Visibles** en la escena; al vencerlos desaparecen y **reaparecen al dormir en la posada** |
| Desbloqueo de escenas | **Por historia** |
| Dificultad | **Fija por zona** (bosque bajo, campamento medio, castillo alto) |
| Interfaz de combate | La nueva, **en todos los combates**, también en el descenso |
| Arte de enemigo | El **goblin teñido por familia** hasta que llegue su imagen |
| Intenciones del enemigo | **No se muestran** (hacia DragonFable). Patrones ocultos; el diario y el telegrafiado los delatan |
| Pociones | **40 %**, gastan turno, máx. **3**, se conservan entre partidas, **40 de oro** fijo |
| Historia | **Borrador mío** como datos editables; el dueño del juego corrige |
| Mapa y fondos | `img/zones/zafias.webp` (sin cuadrícula) y `img/bg/forest.webp`; los PNG originales, ignorados en git |

**Técnica:** todo cabe en web estática con JavaScript vanilla y Web Animations API (revisado el 2026-09-30;
Godot y Flutter descartados). El riesgo real es el arte, no la técnica.

**Investigación** (`research/Investigación Desarrollo Easy Hero.md`): confirma el rumbo. De ella salen el
telegrafiado (hecho) y varias ideas que están abajo, en Perfilados. Tomada como orientación: algunas fórmulas se
perdieron y hay citas de otros juegos.

### 🧩 Perfilados (más adelante, cuando el bucle sea jugable)
- **Jefes:** furia bajo el 30 % de vida (tinte rojo + frase + cambio de patrón); patrones propios para los 5
  jefes profundos (hoy comparten el del jefe final).
- **Telegrafiado:** frases por tipo de enemigo; ¿avisar también de curarse o protegerse?; postura con arte propio.
- **Aventura:** editor `?editor=zafias` para colocar puntos con el ratón; caminos como grafo en vez de recodos;
  motor puro separado (`src/adventure.js`) si la lógica crece.
- **Móvil:** en el bosque a 390 px el héroe queda pegado al borde al llegar.
- **Aventura (de C3):** los marcadores de la aldea se ven pequeños entre tanto detalle del mapa.
- **Aventura (de C2):** el cofre pintado del campamento aún no hace nada; el objetivo de la misión va en la
  barra de arriba como texto (merecería su propio cartel); Maela no tiene retrato.
- **Aventura (de C1):** colocar mejor los 3 goblins (el vigía queda entre árboles); el equipo del descenso no viaja a la aventura (hoy vas con la espada básica y tu
  nivel/primarias/Forja).
- **Arte:** herramienta de preparación de sprites (recorte, línea de pies, escala de píxel, paleta única de ~32
  colores); nota en créditos sobre el arte hecho con IA; fondos de cueva y mazmorra.
- **Combate:** debilidades elementales ×0,5/×1,5 con los 6 tipos de daño; entrada del combate como momento.
- **Equilibrio:** los bots del banco siguen «viendo» la intención; el juego real será algo más difícil de lo
  que mide. Revisar la tasa de victoria.
- **Aparcado de la investigación:** fórmulas de acierto/fallo y «plink», alquimia de pociones, acumulación de
  estados, enfriamientos que solo bajan al atacar.

---

**Backlog abierto de B1 (no bloquea nada, se retoma cuando convenga):**
- Capturas de pantalla (`SHOT_DIR=…`) de la pantalla de botín y el panel de 4 ranuras, para revisar el aspecto.
- Script de viabilidad de las 6 armas y cada afijo (que ninguna base o afijo domine). Sin datos todavía.
- El experto (37,8 %) casi no dobla ya al sensato (22,3 %): revisar cuando lleguen las mejoras de B2.

**Backlog abierto del decorado (no bloquea nada):**
- La pantalla de inicio y el mapa ya tienen su pasada visual propia; combate, eventos, botín y fin de ruta solo
  heredan la paleta por la cascada de variables CSS.
- El catálogo de eventos «vistos X/15» no tiene panel propio (el dato ya se registra en `meta.eventsSeenEver`).

**Backlog abierto del inventario/oro/trofeo (no bloquea nada):**
- La pantalla de Personaje no muestra los **afijos completos** de cada objeto tan detallados como podría (usa
  `describeItem()`, que ya existe); revisar si conviene ampliarla cuando lleguen las mejoras de B2.
- Sin viabilidad medida de si 10 ranuras de inventario son demasiadas o pocas para una ruta de 16 pisos; se verá
  con el uso real.

**Backlog abierto del descenso y La Forja (la 1.4.0, no bloquea nada):**
- **Segunda moneda** para la capa profunda (tipo «esquirlas del jefe», solo de jefes): con una sola moneda, las
  mejoras caras y las baratas compiten por el mismo bolsillo. Pensarlo antes de añadir más mejoras.
- **Prestigio sobre La Forja**: reiniciar lo comprado a cambio de un multiplicador permanente. Es lo que sostiene
  cientos de horas en el género, pero no significa nada hasta que el bucle base esté rodado.
- **Sub-jefes y eventos propios por tramo**: hoy los 3 sub-jefes y los 15 eventos se reciclan en cada tramo.
- **Ocho variantes ya diseñadas y sin construir**: Acorazado, Menguante, de la Tormenta, de la Escarcha, del Eco,
  del Enjambre (y las que pidan mecánicas nuevas, como aturdir).
- **El banco de equilibrio no simula el descenso**: los bots juegan el tramo 0 y no compran mejoras, así que la
  curva de profundidad (¿en qué tramo muere un jugador con X mejoras?) está calculada a mano, no medida.
- **Ya no existe la decisión de «plantarse»**: como se baja con la vida completa, nunca hay razón para parar. Si
  el descenso se hace monótono, ahí está la palanca.

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

> **Parcialmente cubierto desde la 1.4.0**: el **descenso sin fin** ya da dificultad creciente e infinita (cada
> tramo ×1,5). Lo que sigue pendiente es que la dificultad extra cambie las **reglas**, no solo los números.

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
| **S5** | 🛒 **Tienda de objetos** con oro (comprar y vender equipo, quitar una mejora) — *el sumidero de oro ya existe desde la 1.4.0 con **La Forja**; lo que falta es comerciar con objetos* | Una economía sencilla | 🟡 |
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
