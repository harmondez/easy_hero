# 🔎 Cómo funcionan de verdad los roguelikes y los JRPG por turnos

> Investigación de Claude (21-sep-2026). **Parte I (secciones 1-10):** mi búsqueda. **Parte II (sección 11):** el cruce con
> tu documento [«Diseño de Sistemas RPG Minimalista»](Diseño%20de%20Sistemas%20RPG%20Minimalista.md), con una síntesis
> propuesta y las decisiones que necesito de ti (sección 11.9). Salta directo a la **sección 11.8** si tienes prisa.

**Nivel de confianza de cada dato:**

| Marca | Significa |
|:-----:|-----------|
| ✅ | Lo leí en la fuente (wiki, artículo) y el enlace está al final |
| 🟡 | Viene de un resumen de búsqueda, un foro o una sola fuente sin contrastar |
| 🧠 | Conocimiento mío, **no verificado en esta búsqueda** |
| 📐 | Medición propia sobre nuestro juego (script reproducible) |

---

## 1. La conclusión más importante (léela primero)

**Nuestro problema de equilibrio no es de «números afinados». Es estructural, y los juegos de referencia lo resuelven de una manera muy concreta.**

📐 Medí cuánta vida cuesta cada combate de nuestro juego con el héroe **sano** al empezar:

| Piso | Héroe (ATK / HP) | Monstruo normal | Vida que cuesta | Sub-jefe del piso | Vida que cuesta |
|:----:|:----------------:|:---------------:|:---------------:|:-----------------:|:---------------:|
| 1 | 1 / 25 | 1 / 6 | 4 % | 3 / 15 | 72 % |
| 3 | 3 / 33 | 2 / 12 | 18 % | 4 / 30 | 91 % |
| 5 | 5 / 41 | 3 / 18 | 22 % | 5 / 45 | **muere** |
| 9 | 9 / 57 | 5 / 30 | 26 % | 7 / 75 | **muere** |
| 15 | 15 / 81 | 8 / 48 | 30 % | 10 / 120 | **muere** |

Tres hechos que salen de la tabla:

1. **Cada combate normal cuesta ~20-30 % de la vida máxima, y solo curamos +4 HP por victoria (~5-10 %).** En 8 combates
   por ruta el héroe no puede sobrevivir por desgaste.
2. **A partir del piso 5 el sub-jefe mata al héroe aunque llegue con la vida completa.** No es desgaste: es que sus
   estadísticas (HP ×2,5, +2 ATK) crecen más deprisa que el poder del héroe (+1 ATK y +4 HP por combate).
3. **Por eso curar más no basta.** En mis simulaciones, curar el 50 % tras cada victoria solo sube de 0,2 % a 17 % los que
   llegan al jefe, y **0 % lo vencen**. Faltan palancas de otro tipo (ver sección 8).

Los juegos de referencia evitan este problema con **tres cosas que nosotros no tenemos**: curación estructural (salas de
descanso ✅), una frecuencia de élites baja ✅ y un poder del jugador que crece por **varios ejes**, no solo en línea recta
(esta última es **inferencia mía** 🧠, no algo que haya verificado).

---

## 2. Slay the Spire: la referencia directa

Nuestro diseño ya se parece mucho al suyo. Vale la pena comparar número a número.

### 2.1 Estructura del mapa

| | Slay the Spire | Easy Hero (ahora) |
|--|----------------|-------------------|
| Tamaño | 15 salas de alto × 7 columnas, 6 caminos ✅🟡 | 16 pisos × 7 columnas, 6 caminos |
| Monstruos normales | **53 %** ✅ | ~45 % |
| Élites | **8 %** ✅ | **~20 %** (sub-jefes) |
| Salas de descanso | **12 %** + una **siempre** antes del jefe ✅ | **0** |
| Tienda | 5 % ✅ | 0 |
| Eventos («?») | 22 % ✅ | ~22 % |
| Cofres | Piso 9 (mitad del acto) siempre ✅ | ~13 % |
| Primeros combates | Los 3 primeros salen de un grupo **fácil** ✅ | Todos escalan con el piso |
| Élites al principio | No antes del piso 6 ✅🟡 | Desde el piso 5 |
| Élites seguidos | Nunca dos seguidos ✅ | Igual |
| Dificultad extra | Ascensión 1: élites **+60 %** ✅ | — |

**Lo que llama la atención:**
- Tienen **2,5 veces menos élites** que nosotros (8 % frente a ~20 %).
- Tienen **una sala de descanso garantizada justo antes del jefe**, pase lo que pase. Nosotros no tenemos ninguna.
- Los élites son **opcionales y arriesgados**, y siempre dan una reliquia ✅. En nuestro caso los sub-jefes bloquean la ruta.
- El mapa fija salas concretas (cofre a mitad, descanso antes del jefe), así que **todo camino tiene el mismo ritmo**.

Discrepancia entre fuentes: el wiki habla de «hasta seis localizaciones por piso» y otras hablan de una rejilla 7×15 con
6 caminos. Da igual para nuestro caso; lo importante es que **nuestra estructura 16×7×6 es casi idéntica** a la suya. 🟡

### 2.2 Cifras de enemigos (Acto 1)

| Enemigo | HP | Daño por ataque | Notas |
|---------|:--:|:---------------:|-------|
| **Jaw Worm** (combate normal) | 40-44 ✅ | 11 ✅ | 3 combates «fáciles» al inicio |
| **Gremlin Nob** (élite) | 82-86 ✅ | 6 y 14 ✅ | Gana fuerza cada vez que juegas una habilidad |
| **Slime Boss** (jefe) | 140 ✅ | 35 (Slam) ✅ | Se divide al llegar al 50 % de vida |
| **Héroe (Ironclad)** | **80** ✅ | — | 5 Strike, 4 Defend, 1 Bash |

El daño de un golpe frente a los 80 HP del jugador: **Jaw Worm 14 %**, **Nob 17 %**, **jefe 44 %** 📐 (mi cálculo).
Nuestro golpe normal ronda el 7-8 % de la vida, pero cada combate dura ~4 rondas y **el coste total es del 20-30 %** 📐. No encontré un dato verificado del coste por combate en Slay the Spire, así que esta comparación queda **pendiente de contrastar**.

### 2.3 Curación

| Fuente de curación | Cantidad |
|--------------------|----------|
| **Sala de descanso** | **30 % de la vida máxima** ✅ (o mejorar una carta) |
| **Burning Blood** (reliquia inicial del Ironclad) | **+6 HP al final de cada combate** ✅ |
| Sala de descanso **antes de cada jefe** | Siempre ✅ |
| Ironclad, en un Acto 1 completo | ~50 HP curados 🟡 (el 62 % de su vida) |

Nuestra curación: **+4 HP por victoria** (~10 % de nuestra vida) **y ninguna sala de descanso**. La reliquia inicial de
Slay the Spire cura casi lo mismo por combate, pero además **tienen descansos del 30 %**, que es lo que a nosotros nos falta.

### 2.4 Cómo equilibraron ellos el juego (charla de GDC 2019)

De la charla de Anthony Giovannetti (Mega Crit), «Metrics Driven Design and Balance» ✅🟡:

- **Servidor de métricas pasivo:** recogían datos de las partidas reales para decidir con objetividad, no con opiniones.
  Cartas que nadie elegía eran demasiado débiles; cartas presentes en muchas victorias eran demasiado fuertes.
- **Cuidado con los datos:** «las métricas pueden engañar» y existe el **sesgo del super-playtester** (los expertos
  distorsionan lo que ves).
- **Es un juego para un solo jugador:** pueden permitir **combos rotos y raros** sin arruinar la experiencia de nadie.
- **Niveles de Ascensión** en vez de una única dificultad, para dar reto a cada tipo de jugador. Las Ascensiones suben
  élites, daño y reducen la curación, y se añaden maldiciones ✅🟡. El juego base se equilibra alrededor de la Ascensión 4 🟡.
- **Actualizaciones semanales** en acceso anticipado con feedback de Discord y de streamers: **no buscaron el equilibrio
  perfecto antes de lanzar.**

### 2.5 Dificultad real

- **Tasa de victoria global: ~9 %** (1,6 millones de victorias en 18 millones de partidas, datos de 2020) ✅.
  Es un juego **muy difícil por diseño**, y aun así triunfó. Lo que importa es que el reto sea **justo y legible**.
- Los **jefes finales y los élites son los que más matan**; The Heart tiene un 47-52 % de mortalidad ✅.
- Los Masked Bandits (un enemigo de apariencia inofensiva) matan a más del 10 % de las partidas de Defect y Watcher ✅.
- Las partidas ganadoras duran **~1 hora** de media ✅ (Ironclad, la más rápida: 58 min). Nuestra meta es 25-40 min.

---

## 3. El desgaste (attrition) como diseño

### 3.1 La idea
En los roguelikes y los JRPG de mazmorra, **la vida y los recursos son un presupuesto que dura varios combates** ✅🟡:

- Los combates están hechos para **ir consumiendo** vida, MP y objetos hasta que el jugador muere o vuelve a un refugio.
- «Si caes en una trampa en la sala 1, entras herido al combate de la sala 2»: los combates **se contagian entre sí** ✅
  (Rampant Games). El buen diseño obliga a gastar **primero los recursos a corto plazo** antes de los de largo plazo.
- Con **poco desgaste**, «no tiene sentido que haya combates débiles» y toda la dificultad se aplana ✅. Con **mucho
  desgaste** sin cura, el jugador acaba **escondiéndose y esperando**, algo que no se debe fomentar ✅.

### 3.2 Tres maneras de dar curación ✅🟡

| Estilo | Ejemplo | Ventaja | Riesgo |
|--------|---------|---------|--------|
| **Estructural** (salas fijas) | Slay the Spire: 12 % de salas de descanso | Predecible; el jugador planifica la ruta | Puede volverse obligatorio pasar por ellas |
| **Escasa** (curación rara) | Roguelikes clásicos con pociones débiles | Tensión constante | Frustra si la mala suerte encadena daños |
| **Garantizada por piso** | Al menos una oportunidad de curar por piso | Justo | Reduce la presión |

### 3.3 Hades: el «sin curación» es un modo difícil, no el modo por defecto ✅
- Hades ofrece **varias vías de curación**: hasta 7 **fuentes** en cámaras especiales (tras derrotar a cada jefe), corazones
  de centauro como recompensa de cámara y mejoras del espejo (+1 de vida por cámara, hasta 3) ✅.
- **Death Defiance** te devuelve el **40 %** de vida si mueres, con un número limitado de usos ✅.
- Hay un pacto opcional, **«Lasting Consequences» al 100 %**, que **elimina toda la curación**. Y se considera mucho más
  duro: **4 puntos de Heat con ese pacto pueden ser más difíciles que 10 de otros pactos** (la fuente dice «potencialmente») ✅🟡.

> 💡 **Lo que esto significa para nosotros:** ahora mismo nuestro juego **es** el «modo sin curación» de Hades, y nadie
> lo ha elegido. Debería ser un modificador de dificultad opcional, no la base.

### 3.4 Darkest Dungeon: el desgaste con una válvula de escape ✅🟡
- El estrés sube por **muchas fuentes** a la vez (ataques, curiosidades, poca luz, incluso retroceder) hasta 200, y a
  ese punto se sufre un infarto letal ✅.
- Lo esencial es la **retirada**: el jugador puede **abandonar la expedición** con lo ganado, en vez de arriesgarlo todo.
  Es la tensión entre «seguir por la recompensa» y «volver a salvo» ✅.
- Hay que gestionar el **inventario limitado** (antorchas o comida) ✅.

> 💡 En nuestra ruta ya existe una versión de eso: **huir** (solo de monstruos normales). Podría ser una decisión más
> interesante si tuviera un coste real y no fuera un simple botón.

### 3.5 FTL: una ruta con riesgo y recompensa ✅🟡
- Es un juego de **sistemas y recursos**: cada nodo del mapa es una decisión de riesgo/recompensa, tanto en las compras
  como en la **planificación de la ruta** ✅. Es el mismo espíritu que nuestro mapa.
- Cada sector sube la dificultad, y **conviene quedarse en un sector todo lo posible para mejorar la nave** ✅. La
  tensión de fondo (una flota enemiga que te persigue si tardas) es de mi conocimiento, no de esta búsqueda 🧠.

---

## 4. JRPG por turnos: lo que hace que funcione el combate

### 4.1 Octopath Traveler: escudo, debilidades y Boost
- Cada enemigo tiene un **escudo con un número**; golpear sus **debilidades** lo reduce, y a 0 se **rompe (Break)** ✅.
- Romper aturde **un turno** y baja las defensas; el daño contra un enemigo roto **se duplica** ✅🟡.
- Las debilidades **empiezan ocultas (`?`)** y se revelan al acertarlas ✅. Un personaje puede tener un talento para
  revelar una vulnerabilidad al inicio ✅.
- **Boost Points (BP):** ganas 1 por turno (si no usaste Boost), y gastas de 1 a 3 para **potenciar** una acción hasta
  4 veces ✅. Genera tensión: ¿gastar BP para romper ya, o guardarlos para un golpe enorme al jefe? ✅

**⚠️ La crítica que conviene tener presente:** en Octopath 2 el Break «es satisfactorio, pero la recompensa es fugaz» y,
con enemigos duros, **llegar a romper puede sentirse como una tarea pesada** ✅ (TechRadar).

### 4.2 Persona: la debilidad como turno extra
- Si golpeas una **debilidad elemental o un crítico**, el enemigo cae y **tú actúas de nuevo de inmediato** («One More»)
  ✅. La recompensa llega **al instante de pulsar el botón**, sin esperas ✅.
- Si tumbas a todos los enemigos, puedes hacer un **ataque conjunto** ✅.

> 💡 **Para nuestro Break (M1):** que la ruptura dé **una acción extra inmediata** (Persona) o un golpe enorme asegurado
> (Octopath) es lo que evita la crítica de «recompensa fugaz». Un simple «pierde el turno» puede quedarse corto.
> Ojo: en un juego de un solo héroe contra 1-3 enemigos, esto pesa aún más.

### 4.3 Clair Obscur: Expedition 33 (2025): el JRPG por turnos que triunfó ✅🟡
- Metacritic **92** y **Game of the Year** en The Game Awards ✅.
- **Combate «reactivo por turnos»:** en el turno enemigo **puedes esquivar o hacer parry con el tiempo**; un parry niega el
  daño y da un contraataque y Puntos de Habilidad ✅.
- El titular de GamesRadar lo resume: «puedo ganar cualquier combate solo con habilidad, así que **estar por debajo del nivel
  es solo un estado mental**» ✅.

> 💡 **Relevancia enorme para nuestro problema:** cuando el jugador tiene **una forma de mitigar daño con su habilidad**,
> las estadísticas dejan de ser una pared. En nuestro juego el equivalente sería **dar decisiones significativas en el turno
> enemigo** (por ejemplo, poder reaccionar a lo que el enemigo anuncia), no solo elegir «Defender» a ciegas.

### 4.4 Diseño de encuentros de JRPG clásicos ✅🟡
- Los combates de mazmorra buscan el **desgaste** hasta obligar a volver al pueblo ✅.
- **Jefes con esbirros** (Chrono Trigger, Final Fantasy IV): el jefe principal más dos pequeños, para compensar que el
  grupo tiene más acciones ✅. En Final Fantasy IV, **matar a los esbirros desencadena un ataque enorme**: una trampa ✅.

> 💡 Aplicable cuando tengamos **varios enemigos por combate (M1)**: los sub-jefes con esbirros dan tensión táctica sin
> subir solo el número de HP.

---

## 5. Roguelike + JRPG: lecciones de híbridos

- **Dungeon Encounters** (Square Enix): una mazmorra como **tablero de casillas numeradas** con caminos que se ramifican,
  y cada casilla es un evento o un combate. Es el híbrido **minimalista** más cercano a nuestro estilo ✅.
- **Wildfrost:** cada carta jugada avanza un turno y las unidades **cuentan atrás hasta su siguiente ataque** ✅🟡. Es un
  ejemplo de **turnos legibles**: se ve cuándo actuará cada uno.
- **Monster Train:** tres combates a la vez en pisos distintos ✅🟡. Muestra que el espacio se puede usar para dar
  profundidad sin más números.
- **Escalar como un roguelike dentro de un JRPG** (foro de RPG Maker) 🟡:
  - Apilar **muchas habilidades de un mismo tipo** reduce la variedad táctica (el problema de las etiquetas).
  - Se sugieren **pocas ranuras** (unas 4 de ataque, más soporte y pasivas) y **mejoras ramificadas** en lugar de solo
    subir números.
  - Otra idea es dar **turnos extra condicionales** (estilo CTB/ATB) en lugar de acumular bonificaciones.
  - Aviso: sobreescalar un solo elemento acaba en una progresión de **gacha**, con puertas de contenido.
- **Roguelikes que aprenden de los JRPG** (Beige Moth) ✅:
  - **Mostrar el orden de turnos** para decidir con información.
  - **Separar el combate de la exploración**, con «reglas acotadas» y solo la información relevante en cada momento.
  - Transparencia sobre las capacidades del jugador, pero **incertidumbre sobre el azar enemigo**.
- **Error frecuente:** balancear demasiado pronto y recortar daño antes de explorar todo el abanico 🟡. Por eso interesa
  fijar antes la **estructura** (descansos, frecuencia de élites, ritmo) y afinar los números al final.

---

## 6. Lo que hacen todos estos juegos y nosotros no

| Práctica común | Slay the Spire | Hades | Octopath / Persona | Easy Hero hoy |
|----------------|:--------------:|:-----:|:------------------:|:-------------:|
| Curación estructural | ✅ descansos 30 % | ✅ fuentes | ✅ posadas 🧠 | ❌ |
| El jugador crece por **varios ejes** | ✅ | ✅ | ✅ | ❌ (solo +ATK y +HP) |
| Mitigación que depende de **decisiones** | ✅ bloqueo | ✅ esquivar | ✅ debilidades / parry | 🟡 solo «Defender» |
| El enemigo **anuncia** lo que hará | ✅ intenciones | ✅ telegrafía | 🟡 | ❌ |
| Élites **opcionales** y con premio claro | ✅ | ✅ | ✅ | ❌ (bloquean la ruta) |
| Primeros combates **más fáciles** | ✅ grupo «fácil» | ✅ | ✅ | 🟡 escalan lineal |
| Dificultad **ajustable** | ✅ Ascensión | ✅ Heat / pactos | ✅ | ❌ |
| Métricas para equilibrar | ✅ servidor | ✅ 🧠 | 🧠 | ✅ simulador propio |

---

## 7. Ideas concretas, ordenadas por cuánto atacan nuestro problema

Cada una tiene un **coste** y una **decisión tuya** detrás. Es una lista de opciones, no un plan.

| # | Idea | Qué resuelve | Coste / riesgo |
|:-:|------|--------------|----------------|
| 1 | **Sala de descanso 🔥 (30 % de la vida)** y una **garantizada antes del jefe** | La curación estructural: es lo que más separa nuestro juego de los demás | Un nodo nuevo. Estaba en M3, se adelantaría |
| 2 | **Bajar la frecuencia de sub-jefes** (de ~20 % a ~8-10 %) y hacerlos **opcionales** | Que no bloqueen la ruta y que el riesgo sea una elección | Menos «puertas» de progreso |
| 3 | **Suavizar el multiplicador del sub-jefe** (HP ×2,5 → ×1,5-1,8) o **ralentizar la escala de los monstruos** | Que el sub-jefe sea vencible con vida completa | Cambio de números puro |
| 4 | **Primeros pisos con un grupo «fácil»** (como los 3 primeros de StS) | Curva más suave | Mínimo |
| 5 | **Intenciones visibles del enemigo** («va a atacar fuerte») | Convierte «Defender» en una decisión y no en una apuesta ciega | Cambia el combate; encaja con M1 |
| 6 | **Que el Break dé un turno extra** (Persona) | Recompensa inmediata; evita el «pesado» de Octopath 2 | Diseño de M1 |
| 7 | **Más ejes de crecimiento** (defensa, curación por golpe, crítico, escudos) | Que el poder no sea lineal; base de los builds | Ya se descartó DEF; habría que replantearlo |
| 8 | **Curación por victoria mayor** (25-50 %) | Ayuda, pero **no basta sola** 📐 | Fácil, pero engañoso |
| 9 | **Niveles de dificultad** (tipo Ascensión) con «sin descansos» como modo difícil | Que el reto extremo sea opcional | Hay que tener un modo base equilibrado antes |
| 10 | **Instrumentar métricas reales** en la página (opt-in) | Equilibrar con datos como Mega Crit | Privacidad y trabajo; útil cuando haya jugadores |

**Objetivo de victoria:** Slay the Spire tiene un **9 %** global, pensado para un público muy dedicado. Un juego minimalista
de 25-40 minutos probablemente quiera algo bastante más alto para el jugador medio. **Es una decisión tuya**
(¿10 %? ¿30 %? ¿50 %?) y conviene fijarla **antes** de tocar los números.

---

## 8. Cómo lo mediría (para cuando decidamos)

Ya tenemos el simulador. Para comparar variantes de forma rápida y barata:

1. Fijar el **objetivo** (por ejemplo, «un jugador medio gana el 25 %»).
2. Cambiar **una palanca a la vez** y volver a simular 1500 partidas.
3. Mirar dónde muere el bot: **en qué piso** y **contra qué**. Si mueren en los élites, el problema son los élites, no la vida.
4. Recordar el **sesgo del bot**: un bot sensato no es un jugador. Por eso conviene un **bot torpe** y un **bot experto**
   para tener un rango, como el «sesgo del super-playtester» que advierte Mega Crit.

---

## 9. Lo que no pude verificar

- **Los enemigos y los descansos de Octopath:** solo verifiqué la mecánica de Break y Boost, no cuántas posadas tiene.
- **Las cifras de curación de los JRPG clásicos** (Dragon Quest, Pokémon): las conozco, pero no las contrasté aquí 🧠.
- **La charla de GDC completa:** el PDF de las diapositivas no se pudo leer con la herramienta que usé; me quedé con los
  resúmenes de terceros. Merece la pena verla entera: https://www.youtube.com/watch?v=7rqfbvnO_H0
- **Qué tasa de victoria conviene** a un juego de 30 minutos: no encontré una fuente clara, y es una decisión de diseño.
- **La regla de élites «no antes del piso 6»** y la de «élite / tienda / descanso no consecutivos» vienen de un resumen 🟡.

---

## 10. Para cruzar con tu investigación

Cuando tengas tus hallazgos, esto es lo que me gustaría comparar:

1. ¿Qué **tasa de victoria** objetivo has visto en juegos parecidos de sesión corta?
2. ¿Has encontrado **datos de curación** de otros juegos (Pokémon, Dragon Quest, FTL, Into the Breach) que contrasten con los de Slay the Spire?
3. ¿Qué juegos de **una sola persona / minimalistas** has visto que resuelvan esto con menos sistemas?
4. ¿Algún ejemplo de **enemigos con intenciones visibles** en un JRPG (no en deckbuilders)?
5. ¿Cuál de las 10 ideas de la sección 7 te encaja, y cuál descartarías desde ya?

---

# 🤝 PARTE II — Cruce con tu investigación («Diseño de Sistemas RPG Minimalista»)

## 11. Cómo se complementan las dos investigaciones

| | Tu documento | El mío (Parte I) |
|--|--------------|------------------|
| **Enfoque** | Catálogo de **sistemas** y **psicología de retención** en 14 juegos | **Números y equilibrio**, con medición sobre nuestro juego |
| **Fortaleza** | Ordena las mecánicas por **ROI** para un indie; distingue el RNG de entrada del de salida; bucles de 30 s a horas | Datos concretos de Slay the Spire, el diagnóstico del desgaste y una tabla de nuestro coste por combate |
| **Debilidad** | Casi no tiene cifras de equilibrio; muchas fuentes son débiles (ver 11.5) | Solo mira 5-6 juegos y no habla de retención ni de meta-progresión |

**Dicho en corto:** tu documento responde a *«qué sistemas merece la pena construir»* y el mío a *«por qué el nuestro no cuadra
ahora»*. Se necesitan los dos.

## 11.1 Coincidencias: lo que salió en las dos búsquedas, sin haberlo pactado

Cuando dos búsquedas independientes llegan a lo mismo, la señal es fuerte.

| Idea | Tu documento | Mi documento |
|------|:------------:|:------------:|
| **Telegrafiar las intenciones del enemigo** | ROI **#1** («Muy bajo coste, crítico») | Idea #5 |
| **Debilidad → recompensa inmediata de turno** (Press Turn, Baton Pass, Persona) | ROI **#3** | Idea #6 |
| **Dificultad modular y opcional** (Ascensión, Boss Cells, pactos de Hades) | Sección 4 | Idea #9 |
| **Quitar la curación como *modo difícil*, no como base** | Dead Cells: Boss Cells | Hades: «Lasting Consequences» |
| **Escalar solo números da combates tediosos** | Sección 9 («inflacionario») | Diagnóstico 📐: el sub-jefe mata sano |
| **Riesgo/retirada como decisión** | ROI **#2** (Loop Hero, Darkest Dungeon) | Sección 3.4 |

La fila 4 es la más útil: **dos juegos distintos** (Hades y Dead Cells) usan «sin curación» como **opción difícil**. Nosotros lo
tenemos como base.

## 11.2 Lo que aporta tu investigación y yo no tenía

1. **La distinción entre RNG de entrada y de salida.** El de entrada (antes de decidir) da agencia; el de salida (después)
   da tensión, pero **«el de salida puro en un momento crítico produce injusticia»** (tu sección 9). Ver 11.6: nos afecta.
2. **Los 4 bucles de tiempo** (30 s, 5 min, sesión, meta). Sirve de checklist para saber qué capa nos falta:
   nosotros tenemos micro y meso, un macro flojo (nadie llega al jefe) y **ningún meta-bucle**.
3. **El ROI ordenado.** Coste de desarrollo frente a impacto en retención, pensado para un indie. Es la forma de
   priorizar sin gastar en lo que menos rinde.
4. **«Permadeath sin meta-progresión ni aprendizaje = pérdida de tiempo»** (sección 9). Hoy morimos en el piso 5 sin nada
   que llevarnos. Es exactamente el error que describes.
5. **Progresión horizontal barata** (Slay the Spire, ROI #5): desbloquear **opciones**, no números. Con 15 eventos y pocas
   habilidades, encaja perfecto.
6. **El «falso error cercano»:** si la derrota se ve siempre como fallo propio, dan ganas de repetir. Es el argumento
   psicológico detrás de las intenciones visibles.
7. **Sinergias ortogonales** con pocos estados (Fuerza, Vulnerable, Debilidad, Armadura): añadir una regla cambia decenas de
   interacciones. **Los +1 ATK y +5 HP de nuestras recompensas son justo el «diseño no ortogonal» que critica.**

## 11.3 Lo que aporta el mío y falta en el tuyo

1. **Un dato de dificultad real:** cada combate cuesta 20-30 % de la vida y el sub-jefe mata al héroe sano desde el piso 5 📐.
2. **Las cifras de Slay the Spire** (8 % de élites, 12 % de descansos con 30 % de cura, descanso garantizado, 9 % de victorias).
3. **El aviso sobre Octopath 2:** un Break de recompensa «fugaz» se siente como una tarea ✅.
4. **Clair Obscur:** mitigación por habilidad en el turno enemigo, que hace que subir de nivel deje de ser una pared ✅.

## 11.4 Cifras de tu documento que verifiqué

Comprobé varias con **fuentes independientes** (no abrí tus enlaces; busqué cada dato por separado):

| Dato de tu documento | ¿Correcto? | Fuente de la comprobación |
|----------------------|:----------:|---------------------------|
| Loop Hero: **100 %** en el campamento, **60 %** retirándote en otra casilla, **30 %** al morir | ✅ | Wiki de Loop Hero, Twinfinite, PCGamesN |
| Dead Cells: las Boss Cells **quitan curaciones** y fuentes | ✅ | Wiki oficial de Dead Cells |
| Ascensiones de Slay the Spire: enemigos más duros, tiendas +10 %, menos pociones, **jefe doble en la A20** | ✅ | Wiki de Slay the Spire, Pocket Gamer |
| Press Turn: el debilitamiento cuesta **medio icono** y da acción extra; los iconos = miembros activos | ✅ | Game8, Twinfinite, Megami Tensei Wiki |
| Persona 5 Baton Pass, Bravely Default 2, Radiant Historia, Persona 3 Reload | 🧠 sin verificar | Conozco los sistemas, pero no los contrasté |

**Detalle que aparece al leer la lista de Ascensiones:** la **A5 hace curar solo el 75 % de la vida perdida tras un jefe**. Es decir,
en el juego base **se cura el 100 % tras cada jefe de acto** ✅. Nosotros no curamos nada tras un jefe.
Otro: la **A6 empieza cada partida con un 10 % menos de vida** ✅ (un modificador barato de copiar).

## 11.5 Calidad de las fuentes de tu documento

Te lo digo con franqueza, porque afecta a cuánto podemos fiarnos de los datos que no verifiqué:

- **Fuentes débiles:** varias son Reddit (3, 5, 12, 29, 37), un Scribd (13), un canal de Telegram (40) y páginas índice generales
  de GDC Vault (8, 9) que **no respaldan** las afirmaciones concretas que se les atribuyen.
- **Fuentes sospechosas:** las guías de Persona 5 (18-21) están en dominios que parecen no tener relación con el juego
  (`ftp.mat-travel.com`, `freelancer.imedicina.com.br`), probablemente PDFs copiados. No las abrí.
- **La cita 12** respalda las cifras de Loop Hero con un post de Reddit de un desarrollador de Android que habla de **su propio
  juego**. Las cifras resultaron correctas, pero **por casualidad de fuente**, no por la cita.
- Hay erratas: «*Moñado*» (Mojado), «*teografiadas*» (telegrafiadas), «*Casta*». Menores, pero conviene corregirlas si se va a
  publicar.

**Conclusión práctica:** los datos de mecánicas de tu documento son **buenos y conocidos**; **no lo usaría como fuente de
cifras** sin contrastarlas.

## 11.6 Aplicación directa: el RNG de nuestros 15 eventos

Clasificando nuestros eventos con tu marco (entrada frente a salida):

| Tipo | Eventos | Comentario |
|------|---------|------------|
| **Salida pura** (eliges y luego tira el dado, sin información) | 2 (extraño), 3 (cofre), 4 (campamento), 8 (puente), 10 (alquimista) | **5 de 15.** Justo lo que la sección 9 llama «sensación de injusticia» |
| **Entrada** (se sortea antes y hay pistas) | 12 (juicio), 15 (Lector) | Es lo que tu documento recomienda |
| **Determinista** (sin azar) | 1, 5, 6, 7, 9, 11, 13, 14 | Sin problema |

**Propuestas baratas, basadas en tu marco:** *mostrar las probabilidades* («2 de 3 te ayuda»), o **dar una pista** antes de
decidir (por ejemplo, «el extraño no te mira a los ojos»). Convierte el dado en información y mantiene la tensión.
Es una decisión de diseño tuya.

## 11.7 Choques con lo que ya decidimos

Tu propuesta *Chronos Tactics: Minimal Grid* es un juego distinto al nuestro. **No es un error de tu investigación**, pero
conviene decidir qué se adopta:

| Tema | *Chronos Tactics* (tu propuesta) | *Easy Hero* (decidido) |
|------|----------------------------------|------------------------|
| Combate | Grid 3×3, 2 unidades, empujar enemigos | **Menú JRPG**, héroe solo |
| Sesión | 5-20 minutos | **25-40 minutos** |
| Meta-progresión | Asentamiento, Cristales de Tiempo, árbol de talentos | **Ninguna** (planeada para v2.0) |
| Tecnología | React / Vue + Canvas | **Vanilla JS**, emojis y CSS |
| Tu propio ranking de ROI | La manipulación en cuadrícula queda en el **puesto 7** y la meta-progresión vertical en el **10** | — |

Coherente con tu propio ranking, **lo mejor de tu propuesta para nosotros no es el grid**, sino sus piezas de bajo coste:
intenciones telegrafiadas, Break con premio, extracción de riesgo y nodos de descanso.

## 11.8 Síntesis propuesta: lo mejor de las dos

Ordenada por **ROI (tuyo) × cuánto ataca nuestro problema (mío)**. Es una **propuesta**, no una decisión.

| Prioridad | Qué | Por qué (tu ROI / mi dato) | Coste |
|:---------:|-----|----------------------------|:-----:|
| **1** | **Intenciones telegrafiadas** del enemigo | ROI #1 y necesario para que «Defender» sea una decisión y no una apuesta | Bajo |
| **2** | **Sala de descanso** (30 %) y **una garantizada antes del jefe** | Es lo que nos falta de Slay the Spire; sin ella no hay curación estructural | Bajo-medio |
| **3** | **Sub-jefes opcionales y menos frecuentes** (~8-10 %), **primeros pisos fáciles** | Mi tabla: hoy el sub-jefe mata al héroe sano | Bajo |
| **4** | **Break con premio inmediato** (turno extra) | Tu ROI #3 + mi aviso de Octopath 2. Va en M1 | Bajo |
| **5** | **Probabilidades visibles o pistas** en los eventos de azar | Tu marco de RNG + 5 eventos de salida pura | Bajo |
| **6** | **Sinergias ortogonales**: recompensas que cambien reglas, no solo +ATK | Tu ROI #4 + el escalado inflacionario | Medio |
| **7** | **Desbloqueo horizontal** (por ejemplo, la mitad de los eventos de inicio, el resto al morir) | Tu ROI #5 + el error de «permadeath sin progreso» | Bajo |
| **8** | **Dificultad modular** (Ascensión: A5, A6, «sin descansos») | Tu sección 4 + Hades y Dead Cells | Medio |
| **9** | **Extracción / retirada** con botín parcial | Tu ROI #2, **pero requiere meta-progresión**, así que va después | Medio |

**Orden lógico:** primero la **estructura** (1-4, que hacen el juego jugable), luego la **profundidad** (5-6) y por último lo
**meta** (7-9). Tiene sentido fijar la estructura **antes** de afinar los números, para no equilibrar dos veces.

## 11.9 Decisiones que necesito de ti

1. **Tasa de victoria objetivo** para un jugador medio (Slay the Spire: 9 %; ¿10, 30, 50 %?).
2. ¿Adoptamos la **prioridad 1-4** tal cual o cambias el orden?
3. ¿Los eventos de azar pasan a **probabilidades visibles**, a **pistas**, o los dejamos como están?
4. ¿Queremos **meta-progresión** aunque sea mínima (desbloqueo horizontal)? Condiciona la extracción y el ROI #5.
5. ¿Qué tomamos de *Chronos Tactics*? Mi lectura: **solo las piezas baratas**, no el grid ni el asentamiento.

---

## Fuentes

**Slay the Spire**
- [GDC 2019 — Metrics Driven Design and Balance (vídeo)](https://www.youtube.com/watch?v=7rqfbvnO_H0) · [diapositivas (PDF)](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf) · [resumen en Game Developer](https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019)
- [Map Generation (wiki)](https://slaythespire.wiki.gg/wiki/Map_Generation) · [Map Locations (wiki)](https://slaythespire.wiki.gg/wiki/Map_Locations) · [Rest Sites (wiki)](https://slaythespire.wiki.gg/wiki/Rest_Sites) · [Health (wiki)](https://slaythespire.wiki.gg/wiki/Health)
- [Ironclad](https://slaythespire.wiki.gg/wiki/Ironclad) · [Jaw Worm](https://slaythespire.wiki.gg/wiki/Jaw_Worm) · [Gremlin Nob](https://slaythespire.wiki.gg/wiki/Gremlin_Nob) · [Slime Boss](https://slaythespire.wiki.gg/wiki/Slime_Boss) · [Act 1](https://slaythespire.wiki.gg/wiki/Act_1)
- [Análisis estadístico (Fox Row, 2020)](https://foxrow.com/slay-the-spire-statistical-analysis)
- [Analysis of Uncertainty in Procedural Maps in Slay the Spire (arXiv)](https://arxiv.org/html/2504.03918v1) *(encontrado, no leído)*

**Diseño de desgaste y curación**
- [Attrition and Resource Management in RPGs (Rampant Games)](http://rampantgames.com/blog/?p=2738)
- [Hades — Health (wiki)](https://hades.fandom.com/wiki/Health) · [Hades Game Design](https://polydin.com/hades-game-design/)
- [A Mechanical Critique of Darkest Dungeon](https://thegemsbok.com/art-reviews-and-articles/darkest-dungeon-red-hook-critique-mechanics-design/) · [The Dynamics of Stress in Darkest Dungeon](https://nicolaluigidau.wordpress.com/2024/02/06/the-dynamics-of-stress-in-darkest-dungeon/)
- [FTL — Designer Review](https://gamedesignstrategies.wordpress.com/2012/09/29/ftl-faster-than-light-designer-review/) · [FTL — Design Oriented](https://www.designoriented.net/blog/tag/ftl-faster-than-light/)

**JRPG por turnos**
- [Octopath 2 — Break y Boost (Game8)](https://game8.co/games/Octopath-Traveler-2/archives/404228) · [Twinfinite](https://twinfinite.net/guides/break-and-boost-system-octopath-traveler-2-explained/) · [TechRadar (crítica)](https://www.techradar.com/reviews/octopath-traveller-2-review-less-than-the-sum-of-its-parts)
- [Persona's Combat System Is Brilliant](https://thehans255.com/blog/2024/10/persona-combat-system/) · [JRPGs With Unique Enemy Weakness Systems (GameRant)](https://gamerant.com/jrpgs-unique-enemy-weakness-systems/)
- [Clair Obscur: Expedition 33 (GamesRadar)](https://www.gamesradar.com/games/rpg/clair-obscur-expedition-33s-brilliant-parry-system-solves-a-classic-jrpg-problem-i-can-win-any-match-up-on-skill-alone-so-being-under-leveled-is-just-a-state-of-mind/) · [The Ringer](https://www.theringer.com/2025/12/29/video-games/clair-obscur-expedition-33-reviews-game-of-the-year-impact)
- [JRPG-Inspired Encounter Design](https://www.kjd-imc.org/blog/jrpg-inspired-encounter-design/) · [What makes a good RPG dungeon?](https://felipepepe.medium.com/what-makes-a-good-rpg-dungeon-505180c69d00)

**Verificaciones de la Parte II**
- [Loop Hero — Campfire (wiki)](https://loophero.fandom.com/wiki/Campfire_(tile)) · [Loop Hero: How to Return to Camp (Twinfinite)](https://twinfinite.net/guides/loop-hero-return-to-camp-how/) · [When to Retreat (Slyther Games)](https://www.slythergames.com/2021/03/12/loop-hero-when-to-retreat-guide/)
- [Boss Stem Cells (Dead Cells wiki oficial)](https://deadcells.wiki.gg/wiki/Boss_Stem_Cells)
- [Ascension (Slay the Spire wiki)](https://slaythespire.wiki.gg/wiki/Ascension) · [Ascension guide (Pocket Gamer)](https://www.pocketgamer.com/slay-the-spire/ascension-guide/)
- [Press Turn System (Game8)](https://game8.co/games/Shin-Megami-Tensei-V/archives/348265) · [Twinfinite](https://twinfinite.net/guides/shin-megami-tensei-v-press-turn-combat-system-explained/) · [Megami Tensei Wiki](https://megatenwiki.com/wiki/Press_Turn_System)

**Híbridos roguelike + JRPG**
- [Towards a Better Roguelike: Breaking Down the JRPG (Beige Moth)](https://beigemoth.blog/2019/03/26/towards-a-better-roguelike-breaking-down-the-jrpg/)
- [Cramming Steep Roguelike Power Scaling Into a Turn-Based JRPG (RPG Maker Forums)](https://forums.rpgmakerweb.com/threads/cramming-steep-roguelike-power-scaling-into-a-turn-based-jrpg.176159/)
- [Dungeon Encounters (Wikipedia)](https://en.wikipedia.org/wiki/Dungeon_Encounters)
