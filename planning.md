# 🗺️ Planificación — Primera ronda de implementaciones

> Basada en la investigación ([jrpg-trend.md](jrpg-trend.md)), las pruebas ([test-method.md](test-method.md)) y el catálogo
> de eventos ([docs/eventos.md](docs/eventos.md)). **Las decisiones de diseño ya están cerradas** (sección 1); nada de esto
> está implementado todavía.
>
> **Cómo leerlo:** decisiones cerradas → punto de partida → **PRINCIPALES** → **SECUNDARIOS** → entregas → riesgos.
> **Está todo atado:** no queda ninguna decisión abierta para empezar la entrega A.

**Esfuerzo relativo:** 🟢 pequeño (horas) · 🟡 medio (1-2 días) · 🔴 grande (varios días).
**Reglas del proyecto:** JavaScript vanilla, emojis y CSS, contenido como datos, motor puro y probado.

---

## 1. ✅ Decisiones cerradas

| Tema | Decisión |
|------|----------|
| **Tasa de victoria** | **20 %** para un jugador medio |
| **Orden de entregas** | A → B → C → D |
| **Sub-jefes** | **Opcionales** y menos frecuentes; siempre existe un camino sin ellos |
| **Meta-progresión** | **Sí, solo horizontal** (opciones y conocimiento, nunca poder fijo) |
| **Eventos de azar** | **Probabilidades visibles + pistas** |
| **Hoguera** | **Descansar** (cura el 30 %) **o elegir un objeto** |
| **Mejoras tras cada combate normal** | «Elige 1 de 3» **mejoras pasivas** |
| **Jefe final** | Único ahora (Dragón Ancestral con fases); 3 aleatorios más adelante |
| **Equipo** | **4 ranuras**: arma primaria, secundaria (arma/escudo/foco), armadura y accesorio |
| **Armadura** | **HP máx + un rasgo** (sin DEF, coherente con haberla eliminado) |
| **Dónde salen objetos** | **Solo en cofres, hogueras y sub-jefes** |
| **Rarezas** | **5**, estilo loot clásico |
| **Sin mochila** | Al recibir un objeto se decide en el momento: reemplazar o descartar |
| **Cómo se fabrican** | **Base fija + afijos al azar** (la rareza decide cuántos) |
| **Arma primaria** | **Define el tipo de daño** de tu ataque (los 6 tipos) |
| **Secundaria** | **Escudo** (mejora Defender), **arma secundaria** (golpe extra) o **foco** (potencia habilidades) |
| **Escalado** | El poder de un objeto **crece con el piso** donde lo encuentras |
| **Accesorio** | Un **rasgo pasivo**, casi sin números |
| **Rarezas de las mejoras** | Las **mismas 5** que el equipo (⚪🟢🔵🟣🟠) |
| **Descartar un objeto** | **Curas 3 HP** (escalable con la rareza del objeto) |
| **Hoguera, opción de objeto** | **1 de 3**, con rareza **mínima Poco común** |
| **Ofertas de objeto por ruta** | **4-6** |
| **Cofres** | **Solo dan objetos** (1 de 3); dejan de dar «+1 ATK / +5 HP» al llegar la entrega B1 |
| **Legendarios** | **Máximo 1 igual** equipado; sin límite total de legendarios |
| **Equipo inicial** | Solo una **espada básica** (🗡️ Filo, 0 afijos); las otras 3 ranuras, vacías |

---

## 🟢 Estado: la entrega A está hecha (1.0.1)

| # | Principal | Estado | Cómo quedó |
|:-:|-----------|:------:|-----------|
| **P1** | Intenciones visibles | ✅ | 15 monstruos, 3 sub-jefes y el jefe, cada uno con su patrón (ataca, golpe fuerte, carga, se protege, se cura, descansa). La intención mostrada es la que se ejecuta |
| **P2** | Hoguera | ✅ | Cura el 30 % o afila (+1 ATK). Una siempre antes del jefe, nunca junto a un evento ni a otra hoguera, y todo camino pasa por ≥ 2 |
| **P3** | Curva y banco de equilibrio | ✅ | `npm run balance` con 3 bots. **Sensato 18,8 %** (objetivo 20), experto 53,8 %, torpe 12,5 %. Detalle en [docs/equilibrio.md](docs/equilibrio.md) |
| **P4** | Guardado, fin y semilla | ✅ | Guardado automático (evento y combate a medias incluidos), pantalla final con «casi», semilla con código, repetir la ruta |

**Diferencias respecto al plan (decididas al implementar):**

| Plan | Realidad |
|------|----------|
| Bot torpe ~3 % | **12,5 %**: el juego perdona a quien solo ataca. Se anota en `docs/equilibrio.md` |
| Coste por combate 10-15 % | **6-17 %**, y un sub-jefe sano cuesta 23-42 % |
| «La misma semilla da el mismo botín» | **Mismo mapa siempre.** Los eventos y el azar se repiten **si tomas las mismas decisiones** (el generador es uno solo y se consume en orden) |
| Grupo fácil en los 3 primeros pisos | Lo dan los propios patrones (Slime, Rata, Goblin): sus estadísticas siguen la escala normal |
| Sub-jefe ×1,6 / +1 (hipótesis) | **×1,3 / +1**; el jefe pasa a **×1,5 / +2** para superar siempre a un sub-jefe |

**Nuevo en el equilibrio:** todos los números viven en `src/data/balance.js` y `npm run test:balance` vigila que un cambio no rompa el juego.
**Pendiente conocido:** pico de dificultad en el piso 14 (el Jabalí, justo antes de la hoguera final).

---

## 2. Punto de partida (lo que sabemos hoy)

| Hecho | Origen |
|-------|--------|
| Un combate normal cuesta **20-30 % de la vida máxima** y solo curamos **+4 HP** | 📐 medido |
| Desde el piso 5 el sub-jefe **mata al héroe aunque llegue sano** | 📐 medido |
| Con 16 pisos, casi **nadie llega al jefe** (0,2 %) y **nadie lo vence** | 📐 simulación |
| Slay the Spire: **12 % de descansos** (30 % de cura), uno **garantizado antes del jefe**, **8 %** de élites | ✅ investigación |
| **5 de 15 eventos** son azar de salida pura, sin información | ✅ cruce de investigaciones |
| Hoy morimos sin llevarnos nada: ni **meta-progresión** ni **aprendizaje** | ✅ investigación |

> **Por qué una hoguera sola no basta** (estimación mía): una ruta tiene unos 7 combates de ~25 % de vida (≈175 %) y 2-3
> hogueras curan ~30 % cada una (≈80 %). Faltan dos palancas: **bajar el coste de cada combate** (intenciones visibles,
> curva más suave) y **más ejes de poder** (equipo y mejoras). Por eso los principales van juntos.

---

# ⭐ PRINCIPALES

*Ideas que potencian directamente la jugabilidad, el sentido de recompensa y logro, y las horas de juego.*

## Resumen

| # | Principal | Qué aporta al jugador | Esfuerzo | Entrega |
|:-:|-----------|----------------------|:--------:|:-------:|
| **P1** ✅ | Intenciones visibles del enemigo | Combates que se **entienden** y se ganan con cabeza | 🟡 | A |
| **P2** ✅ | Hoguera 🔥 | Ritmo, respiro y una **decisión** en cada tramo | 🟡 | A |
| **P3** ✅ | Curva de dificultad y banco de equilibrio | Que **se pueda ganar** (objetivo 20 %), con datos | 🟡 | A |
| **P4** ✅ | Fin de partida, guardado y reintento | «Una partida más»: la derrota **enseña** | 🟡 | A |
| **P5** | 🛡️ **Equipo**: 4 ranuras y 5 rarezas | **Botín con emoción**; tu héroe se ve y se siente distinto | 🔴 | B |
| **P6** | Mejoras pasivas «elige 1 de 3» | Una **elección** tras cada combate | 🟡 | B |
| **P7** | Afinidad y clase emergente | **Identidad** y logro: «has despertado como…» | 🟡 | B |
| **P8** | Debilidades y Ruptura (Break) | El corazón táctico del combate JRPG | 🔴 | C |
| **P9** | Varios enemigos y orden de turnos | Encuentros con **vida**, jefes con esbirros | 🔴 | C |
| **P10** | Crónica y Legado (meta horizontal) | **Horas de juego**: siempre hay algo por descubrir | 🟡 | D |
| **P11** | Niveles de Riesgo | Rejugabilidad tras la primera victoria | 🟡 | D |

---

## P1 · 👁️ Intenciones visibles del enemigo

**Qué.** Antes de elegir, el jugador ve qué hará cada enemigo en su turno: `⚔️ 5` (ataque), `⚡ carga` (el siguiente golpe
es doble), `🛡️ se protege`, `💚 se cura`. La acción mostrada es **la que se ejecuta**, sin azar oculto.

**Por qué.** Es la mecánica de **mayor ROI** de las dos investigaciones y convierte «Defender» de apuesta ciega en decisión
(jrpg-trend §11.1). El fallo se siente como error propio: el «falso error cercano» que da ganas de repetir.

**Cómo.**
- Los monstruos pasan a `src/data/monsters.js` con `moves` y un `pattern` (ciclo o pesos): Slime (ataca / descansa),
  Rata (dos golpes flojos), Goblin (carga y golpe fuerte)…
- El motor calcula `monster.intent` al empezar cada ronda; `rpgCombatAction` resuelve **esa** intención.
- **Da identidad a cada enemigo** (ahora todos golpean igual).
- El Lector ya «lee tus movimientos»: su intención será visible y castigará la repetición de forma legible.

**Hecho cuando.** Cada ronda muestra la intención y coincide con lo que ocurre; tests de patrones; la simulación reproduce
exactamente lo anunciado.

## P2 · 🔥 Hoguera

**Qué.** Nodo nuevo con **dos decisiones** (regla de oro del proyecto):
**Descansar** (cura el 30 % de la vida máxima) o **Equiparte** (eliges 1 de 3 objetos, ver P5).

**Cómo.**
- Peso ~12 % entre los nodos intermedios; **nunca dos seguidos** ni junto a un evento.
- **Una garantizada antes del jefe**: el piso previo pasa de cofre a hoguera.
- **Todo camino** de inicio a jefe pasa por al menos 2 hogueras (misma técnica que los eventos).
- ⚠️ **En la entrega A** la segunda opción es **Afilar (+1 ATK)** de forma provisional, porque el equipo llega en la B.

**Hecho cuando.** Los tests del mapa garantizan la regla en miles de semillas y el banco de equilibrio (P3) mejora.

## P3 · ⚖️ Curva de dificultad y banco de equilibrio

**Qué.** Que el juego **se pueda ganar**, con un método reproducible, no a ojo.

**Cómo, en dos partes.**

1. **Banco de equilibrio** (`npm run balance`): 3 bots (**torpe, sensato, experto**) × 1500 partidas → tabla de «llega al jefe /
   vence / muere en el piso N / contra qué».
2. **Palancas, de una en una** (hipótesis de partida, no números definitivos):

| Palanca | Hoy | Propuesta |
|---------|:---:|:---------:|
| Frecuencia de sub-jefes | ~20 % | **8-10 %** y **evitables** (siempre hay camino sin ellos) |
| Primeros pisos | Escalan ya | Grupo **fácil** en los 3 primeros (como Slay the Spire) |
| Sub-jefe: HP / ATK | ×2,5 / +2 | ~×1,6 / +1 (vencible **con vida completa**) |
| Coste por combate normal | 20-30 % | Objetivo de trabajo: **10-15 %** *(hipótesis a validar)* |

**Hecho cuando.** Se cumple el **20 % de victoria** para el jugador medio. Propuesta de bots a confirmar:
**torpe ~3 %, sensato ~20 %, experto ~50 %**. Cada cambio queda con su antes/después en `docs/`.
**Se recalibra tras cada entrega**, porque el equipo y las mejoras añaden mucho poder.

## P4 · 🏁 Fin de partida, guardado y reintento

**Qué.**
- **Pantalla de fin** (victoria o derrota): piso alcanzado, quién te derrotó, **tu equipo y afinidad**, eventos vividos y una
  línea de **«casi»** («te faltó un 12 % del jefe»).
- **Guardado automático** en `localStorage` (versionado) tras cada nodo.
- **Semilla** visible y **«repetir con la misma semilla»**.

**Cómo.** Estado serializable; `Math.random` pasa a un generador con **semilla** en mapa, eventos, combates y **botín**; el
guardado incluye la versión para migrar; pantalla nueva `rpgEndView`.

**Hecho cuando.** Recargar la página en cualquier nodo, evento o combate **restaura exactamente** el estado (test en el
navegador); la misma semilla da el mismo mapa, los mismos eventos y el mismo botín.

---

## P5 · 🛡️ Equipo: 4 ranuras y 5 rarezas

**Qué.** El héroe lleva **4 objetos**. Es un sistema **muy minimalista**: sin mochila, sin gestión de inventario, con
decisiones rápidas y cargadas de sentido.

| Ranura | Qué da | Ejemplos de base |
|--------|--------|------------------|
| ⚔️ **Arma primaria** | **ATK** y el **tipo de daño** de tu ataque | 🗡️ Espada (Filo) · 🔨 Maza (Contundente) · 🏹 Arco (Perforante) · ☠️ Daga envenenada (Veneno) · 🔥 Bastón de fuego · ⚡ Vara de rayos |
| 🛡️ **Secundaria** | Escudo, arma secundaria o foco | Escudo (**mejora Defender**) · Daga (**golpe extra**) · Grimorio (**potencia habilidades**) |
| 🧥 **Armadura** | **HP máx** + un rasgo *(sin DEF)* | Cota (rasgo: «al Defender curas 2») · Capa (rasgo: «empiezas cada combate con un golpe listo») |
| 💍 **Accesorio** | Un **rasgo pasivo** (casi sin números) | Anillo (Filo hace +1 al escudo) · Amuleto (curas 2 al vencer) |

**Rarezas (5):**

| Rareza | Color | Afijos | Poder ×* | Prob. base* |
|--------|:-----:|:------:|:--------:|:-----------:|
| **Común** | ⚪ | 0 | ×1,00 | 50 % |
| **Poco común** | 🟢 | 1 | ×1,15 | 28 % |
| **Rara** | 🔵 | 2 | ×1,30 | 14 % |
| **Épica** | 🟣 | 3 | ×1,50 | 6 % |
| **Legendaria** | 🟠 | 3 + **rasgo único** | ×1,70 | 2 % |

\* *Hipótesis de partida: se calibran con el banco de equilibrio.* La rareza se lee de un vistazo por el **color del borde**.

**Cómo se fabrica un objeto (base fija + afijos al azar):**
1. Una **base** hecha a mano (`src/data/items.js`: ~22 bases, 4-6 por ranura).
2. La **rareza** decide cuántos **afijos** se sortean de un pool de ~24 (`src/data/affixes.js`).
3. Los afijos son de dos clases: **números** (`+2 ATK`, `+6 HP`) y **reglas** (`quema al golpear`, `el primer golpe hace ×2`,
   `curas 2 al Defender`). Las reglas usan los mismos **ganchos** del motor que las mejoras de P6.
4. **Escalado por piso:** `valor = base × (1 + 0,08 × piso) × multiplicador de rareza` *(hipótesis)*. Un objeto del piso 12
   es mejor que uno del piso 3 de la misma rareza.

**Dónde salen (solo aquí):**

| Fuente | Qué ofrece |
|--------|-----------|
| 🧰 **Cofre** | 1 de 3 objetos (rareza normal) |
| 🔥 **Hoguera** (alternativa a curar) | 1 de 3 objetos (**mínimo Poco común**) |
| 💀 **Sub-jefe** | 1 de 3 objetos (**mínimo Rara**) |

Por ruta salen unos **4-6 ofertas**: las 4 ranuras se llenan hacia la mitad y a partir de ahí **cada oferta obliga a decidir**.

**Empiezas** con una **espada básica** (🗡️ Filo, 0 afijos) y **3 ranuras vacías**: el primer objeto que encuentres se siente como una mejora.

**Sin mochila.** Al recibir un objeto se **compara con el equipado** (verde/rojo) y se elige **equipar** (el anterior se pierde) o
**descartar** (**curas 3 HP**, algo más con mayor rareza).

**Legendarios.** No se puede llevar el **mismo** legendario dos veces, pero sí **varios distintos**: permite builds rotos y
emocionantes (como en Slay the Spire) y hace que el banco de equilibrio deba vigilar los peores casos.

**Interfaz.** Las 4 ranuras en el panel del héroe, con el color de la rareza; la ventana de comparación con las diferencias.

**Hecho cuando.** Tests de fabricación (miles de objetos con semilla: valores en rango, afijos sin repetir, escalado monótono),
del guardado del equipo y de la comparación; **ningún objeto rompe las invariantes**; la simulación muestra que las **6
armas** son viables y ninguna base o afijo domina (tasa de elección y de victoria, como las métricas de Mega Crit).

> **Consecuencia:** el crecimiento automático «+1 ATK y +4 HP» por victoria y los cofres actuales se **reemplazan** por
> equipo (P5) y mejoras (P6). Hasta la entrega B se mantienen.

## P6 · 🎁 Mejoras pasivas «elige 1 de 3»

**Qué.** Tras **cada combate normal** se ofrecen **3 mejoras** y el jugador **elige 1**. Son **pasivas sin ranura**: cambian
**reglas**, no solo números (el «diseño ortogonal» de tu documento). Conviven con el equipo, pero **no compiten** por sus
ranuras.

**Por qué.** Es el motor de **agencia** del género (la elección de carta de Slay the Spire) y da el gancho «¿cuál me llevo?»
tras cada victoria.

**Cómo.**
- `src/data/upgrades.js`: ~30 mejoras con **familia** (⚔️ / 🗡️ / 🔥 / neutra).
- Cada mejora es un efecto sobre las reglas mediante **ganchos** del motor: `onCombatStart`, `onAttack`, `onDefend`, `onDamaged`…
- Ejemplos:

| Familia | Mejora | Efecto |
|---------|--------|--------|
| ⚔️ | **Piel de piedra** | Al Defender, devuelves 2 de daño |
| ⚔️ | **Segundo aliento** | Empiezas cada combate curando 3 HP |
| 🗡️ | **Golpe furtivo** | Tu primer ataque de cada combate hace ×2 |
| 🗡️ | **Filo envenenado** | Tus ataques envenenan (1 por ronda, se acumula) |
| 🔥 | **Brasas** | Golpe de Fuego quema al enemigo 3 rondas |
| 🔥 | **Reserva arcana** | Tus habilidades se enfrían 1 ronda antes |

- **Tienen las mismas 5 rarezas que el equipo** (⚪🟢🔵🟣🟠), con la misma tabla de probabilidades y color de borde. Un solo lenguaje
  visual para todo el botín. La rareza aquí sube la **potencia o la ambición del efecto** (una legendaria cambia cómo juegas).
- Se sortean con la **semilla**; nunca 3 de la misma familia; **animación de revelado** de las opciones.

**Hecho cuando.** Cada ruta ofrece ≥ 10 elecciones; ninguna mejora rompe invariantes (miles de builds al azar); **ninguna domina**.

## P7 · 🎭 Afinidad y clase emergente

**Qué.** Los **objetos y las mejoras** suman **afinidad** a su familia. Al llegar a los umbrales, el héroe **despierta**: una
pantalla celebra «Has despertado como **Elementalista**» y **desbloquea** una habilidad. Con dos familias altas, un **híbrido**.

**Por qué.** Es la promesa central del juego y da un **momento de logro** a mitad de ruta. **Ahora tiene mucha más fuerza**: el
arma y la secundaria empujan hacia una clase (espada y escudo → ⚔️; daga y veneno → 🗡️; bastón y grimorio → 🔥).

**Cómo.** Umbrales **3** (rasgo) y **6** (habilidad de clase); 3 clases puras + 3 híbridas con nombre propio; 2 habilidades por
clase con **enfriamiento** (el MP queda para la entrega C); barras de afinidad en el panel; la carta del héroe cambia al despertar.

**Hecho cuando.** Tests de umbrales y habilidades; captura del momento de despertar revisada; las **3 clases son viables**.

## P8 · 💥 Debilidades y Ruptura (Break)

**Qué.** Los 6 tipos de daño. Cada enemigo tiene un **escudo** y 1-2 **debilidades**, ocultas (`?`) hasta acertarlas. A escudo 0:
**Ruptura**.

**La idea clave (sale de cruzar las investigaciones):** la **Ruptura cancela la intención del enemigo** y da al héroe una **acción
extra inmediata** con daño ×1,5. Así la recompensa **no es «fugaz»** (la crítica a Octopath 2) y se combina con P1.

**Con el equipo, ahora es mucho más rica:** el **arma primaria marca tu tipo de daño**, así que **cambiar de arma cambia contra
qué debilidades juegas**. La ruta y el botín pasan a importar de verdad. Al pasar el cursor por un nodo del mapa se **revela una
debilidad** ya conocida del bestiario.

**Hecho cuando.** Tests de escudo, ruptura, cancelación y acción extra; el banco de equilibrio la incluye; las 6 armas tienen
enemigos débiles a su tipo.

## P9 · 👥 Varios enemigos y orden de turnos

**Qué.** Combates de **1 a 3 enemigos** con selección de objetivo, **SPD** y **línea de turnos visible**; el evento de la chica herida
pasa a **3 bandidos reales**; los sub-jefes traen **esbirros**.

**Cómo.** `combat.enemies[]` en lugar de `combat.monster`; cola de turnos por SPD. **Es el cambio más invasivo:** va en la entrega C,
cuando el resto ya está probado.

## P10 · 📖 Crónica y Legado (meta-progresión horizontal)

**Qué.** La derrota y la victoria dejan algo. **Sin poder numérico permanente**, solo **opciones y conocimiento**:
- **Bestiario** (enemigos vistos y derrotados, debilidades descubiertas) y **catálogo de eventos** («vistos 9/15»).
- **~20 logros** con premio: «Vence al Lector sin fallar», «Llega al piso 10»…
- **Desbloqueo horizontal:** las primeras partidas ofrecen un **conjunto reducido** de eventos, mejoras y **bases de objeto**;
  cada logro añade más.
- **El Legado:** al morir, tu **equipo** queda guardado; en una partida futura aparece el evento **«La tumba de un antecesor»**, donde
  puedes recuperar **uno de sus objetos**. Une la derrota con la siguiente partida. *(Con equipo es todavía más potente.)*
- **Colección de objetos vistos**, por rareza y base.

**Hecho cuando.** Todo persiste en `localStorage` con versión; los desbloqueos se prueban con partidas simuladas.

## P11 · 🎚️ Niveles de Riesgo

**Qué.** Tras la primera victoria, **niveles acumulativos** (estilo Ascensión): 1. élites +60 %, 2. empiezas con −10 % de vida,
3. curas menos en las hogueras, 4. **objetos con una rareza menos**, 5. eventos con peores resultados, 6. **sin hogueras**, 7+. jefe con
una fase extra. **Hecho cuando** el banco mide cada nivel y la dificultad **sube de forma monótona**.

---

# 🧩 SECUNDARIOS

*Contenido y mejoras que no son tan notorios por sí solos, pero suman.*

| # | Secundario | Qué aporta | Esfuerzo |
|:-:|------------|-----------|:--------:|
| **S1** | 🌲 **3 zonas** con estética y monstruos propios | Variedad según el piso (1-5 / 6-10 / 11-16) | 🟡 |
| **S2** | 🐺 **Bestiario ampliado**: de 9 a ~24 monstruos con patrones propios | Encuentros más variados (depende de P1) | 🟡 |
| **S3** | 🎲 **10 eventos más** (hasta 25), con **cadenas** y algunos que **dan objetos** | Densidad de decisiones y memoria de la partida | 🟡 |
| **S4** | 🐉 **Jefe final aleatorio entre 3**, con fases | Identidad del final y rejugabilidad | 🟡 |
| **S5** | 🛒 **Tienda** con oro (vender y comprar objetos, quitar una mejora) | Una economía sencilla | 🟡 |
| **S6** | 🧪 **Consumibles** (2 ranuras) | Recurso táctico de emergencia | 🟡 |
| **S7** | 🩸 **Estados**: quemar, envenenar, aturdir | Da vida a Fuego/Veneno, mejoras y afijos | 🟡 |
| **S8** | ⚖️ **Eventos justos**: probabilidades visibles y pistas *(decidido)* | 5 de 15 eventos son azar de salida pura | 🟢 |
| **S9** | 📅 **Ruta del día** (misma semilla para todos) + mejor marca local | Rutina de vuelta sin servidor | 🟢 |
| **S10** | 🔊 **Sonido sintetizado** (WebAudio, cero archivos), temblor y destellos | «Jugosidad»: golpes, Ruptura, botín, despertar | 🟡 |
| **S11** | 🎓 **Primera ruta guiada** con consejos breves | Entrada suave sin pantallas de tutorial | 🟢 |
| **S12** | ⌨️ **Teclado y accesibilidad** (atajos, `prefers-reduced-motion`, contraste, botones táctiles) | Comodidad | 🟢 |
| **S13** | 📲 **PWA**: instalable y jugable sin conexión | Jugar en el móvil como una app | 🟡 |
| **S14** | ⏩ **Velocidad de combate** ×2 y saltar animaciones | Menos fricción | 🟢 |
| **S15** | 📊 **Métricas locales** (opt-in) y panel de estadísticas | Datos reales para equilibrar | 🟡 |
| **S16** | 🧰 **Infraestructura**: GitHub Action con `npm test`; acelerar el test del navegador (88 s) | Confianza al publicar | 🟡 |
| **S17** | 🏷️ **Nombre definitivo, icono y metadatos para compartir** | Presencia al enlazar la página | 🟢 |
| **S18** | 🧩 **Conjuntos de objetos** (bonus por 2 y 4 piezas) | Sinergia y «cazar» piezas | 🟡 |
| **S19** | ☠️ **Objetos malditos** (gran poder con un coste) | Riesgo/recompensa en el botín | 🟡 |
| **S20** | 🔨 **Reforja en la hoguera** (cambiar un afijo) | Tercera opción de la hoguera | 🟡 |

**Los más rentables por su coste:** S8, S9, S11, S12 y S14 (todos 🟢).

---

# 📦 Orden propuesto: cuatro entregas

Cada entrega termina con **tests verdes, banco de equilibrio, capturas revisadas y publicación** en GitHub Pages.

| Entrega | Contenido | Resultado para el jugador |
|:-------:|-----------|---------------------------|
| **A · Jugable** ✅ | P1 intenciones · P2 hoguera · P3 curva y banco · P4 guardado y fin | **Se puede ganar**, se entiende lo que pasa y se puede retomar |
| **B · Con build** | **B1:** P5 equipo · **B2:** P6 mejoras + P7 afinidad | Cada cofre y cada combate **recompensan**; aparece la identidad |
| **C · Táctico** | P8 Ruptura · P9 varios enemigos y turnos | El combate JRPG de verdad |
| **D · Largo plazo** | P10 crónica y legado · P11 riesgo | Horas de juego y rejugabilidad |

**La primera ronda son las entregas A y B.** La **B es la más grande** (equipo + mejoras + afinidad) y se divide en dos:
**B1** el equipo, porque hoguera, cofres y sub-jefes lo necesitan; **B2** las mejoras y la afinidad, que reemplazan al
crecimiento fijo por victoria.

**¿Por qué este orden?** La estructura va **antes** que los números: si se afina el equilibrio y luego cambian hogueras, intenciones
o equipo, hay que equilibrar dos veces.

---

# 🚧 Fuera de la ronda (a propósito)

| No entra | Por qué |
|----------|---------|
| Cuadrícula 3×3 y empujar enemigos | Otro juego; en tu propio ranking de ROI queda en el puesto 7 |
| Grupo de aliados · Cartas y mazo · Boost Points | Ya decidido que no |
| Meta-progresión **vertical** | Arriesga el equilibrio; solo horizontal |
| **Mochila** de objetos | Decidido: se decide en el momento |
| Calendario e historia de Persona | Coste altísimo de guion |
| MP como recurso | Va en la entrega C, junto a más habilidades |

---

# ✅ Supuestos confirmados

Las ocho dudas que quedaban están resueltas:

| # | Tema | Resultado |
|:-:|------|-----------|
| 1 | **Accesorio** | Rasgo pasivo, casi sin números ✅ |
| 2 | **Rarezas de las mejoras** | ⚠️ **Las mismas 5 del equipo** (yo proponía una escala simple; el contenido crece, ver riesgos) |
| 3 | **Descartar** | Cura 3 HP ✅ |
| 4 | **Objetos en la hoguera** | 1 de 3, mínimo Poco común ✅ |
| 5 | **Ofertas por ruta** | 4-6 ✅ |
| 6 | **Cofres** | Solo objetos ✅ |
| 7 | **Legendarios** | Máximo 1 igual, sin límite total ✅ |
| 8 | **Equipo inicial** | Solo una espada básica ✅ |

---

# ⚠️ Riesgos

| Riesgo | Cómo lo mitigamos |
|--------|-------------------|
| **5 rarezas es mucho contenido y equilibrio** | Base fija + afijos: pocas bases (~22) y ~24 afijos; se calibran con el banco (poder ×, probabilidades) |
| **Mejoras con 5 rarezas + equipo con 5 rarezas = el doble de contenido** | **Una sola tabla** de rarezas (probabilidades, multiplicador y color) para todo; las mejoras y los afijos **comparten ganchos** del motor; se empieza con pocas (~20 mejoras) y se amplía |
| **Equipo + mejoras = dos fuentes de poder** | Se implementan por separado (B1, B2) y el banco se ejecuta tras cada una |
| **El poder crece más que los enemigos y el juego se vuelve fácil** | El 20 % de victoria es el objetivo: se **recalibra tras cada entrega** |
| **Cada cambio mueve el equilibrio** | Palancas **de una en una** y con antes/después documentados |
| **Los guardados se rompen entre versiones** | Guardado con **versión** y migración; si falla, se descarta con aviso |
| **El test del navegador ya tarda 88 s** | Se mantiene poco y se acelera (S16); lo demás vive en el motor |
| **La opinión de un bot no es la de un jugador** | 3 bots y, cuando haya jugadores, métricas locales (S15) |

---

# ✅ Definición de «hecho» (para cada entrega)

1. **Tests verdes:** motor, eventos y navegador.
2. **Banco de equilibrio** ejecutado, con el antes y el después documentados.
3. **Capturas revisadas** en escritorio y móvil.
4. **Documentación** actualizada (README, `docs/`).
5. **Publicado** en GitHub Pages y comprobado en la URL real.
