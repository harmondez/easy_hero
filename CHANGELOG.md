# 📜 Registro de cambios

Aquí se anota **qué trae cada versión** del juego, de la más reciente a la más antigua.
Cómo se numeran las versiones y cómo se publica una nueva: [docs/versiones.md](docs/versiones.md).

## [Sin publicar]

## [1.3.1] - 2026-09-22

### ✨ Novedades
- 🗺️ El mapa se dibuja al revés: los primeros monstruos aparecen **arriba** y el jefe final al fondo, abajo. Es
  puramente visual: el mapa en sí (qué piso es cada cosa) no cambia.
- 🌫️ **Niebla de guerra**: lo que queda a más de 3 pisos por delante de tu posición se ve cubierto (❓), sin
  revelar de qué se trata, hasta que te acerques; el jefe final se anuncia como «???» hasta entonces. Se despeja
  sola a medida que avanzas por la ruta.
- 👾 El icono de monstruo cambia de 👹 a 👾.

### 🛠️ Por dentro
- Todo el cambio vive en `renderRpgMap` (`src/ui.js`): se invierte el eje del piso en `pos()` y se añade
  `RPG_FOG_AHEAD` para decidir qué nodos se cubren. No toca el motor ni los datos del mapa.

## [1.3.0] - 2026-09-22

### ✨ Novedades
- 🧬 **Estadísticas primarias**: Fuerza, Destreza, Inteligencia y Vitalidad. Generan tu ATK, tu vida máxima, tu probabilidad de **crítico** y de **esquiva**, y tu **resistencia física** — sin cambiar nada de lo ya calibrado (con las 4 en su valor base, el héroe se comporta exactamente igual que antes de que existiera este sistema).
- ⚔️ **Físico y elemental, según el arma**: Filo/Contundente/Perforante los potencia la Fuerza; Veneno/Fuego/Rayo, la Inteligencia. Cambiar de arma cambia qué estadística importa.
- 🧬 **Nivel de personaje, PERMANENTE**: ganas experiencia al vencer combates, subes de nivel y repartes tú mismo los puntos entre las 4 primarias, desde la pantalla de Personaje. A diferencia del equipo (que se reinicia cada ruta), el nivel y los puntos invertidos **te acompañan para siempre**, en todas tus partidas futuras.

### ⚠️ Decisión de diseño
- Esto **reabre a propósito** la regla «meta-progresión solo horizontal, nunca poder fijo» fijada al principio del proyecto: ahora sí hay una fuente de poder permanente entre partidas. Decisión explícita del usuario, con conocimiento de la regla que cambia. Detalle en [historial.md](historial.md).

### 🛠️ Por dentro
- `src/stats.js` nuevo (fórmulas puras); `meta.charLevel/xp/statPoints/primary` en `src/meta.js`; `SAVE_VERSION` sube a 3 (las partidas de antes de este cambio se descartan con aviso).
- 39 comprobaciones nuevas en `tests/stats-sim.mjs`; 26 nuevas en `tests/browser.test.mjs`.

## [1.2.0] - 2026-09-22

### ✨ Novedades
- 🧍 **Pantalla de Personaje**, propia y accesible desde el mapa: tu héroe con sus 4 ranuras de equipo conectadas visualmente, un inventario de **10 ranuras** y el oro acumulado.
- 🎒 **Inventario**: los cofres, hogueras y botín de sub-jefe ya no obligan a decidir en el momento — ahora puedes **guardar** un objeto sin equiparlo (si hay hueco) y decidir más tarde. Al equipar algo, lo que llevabas puesto pasa al inventario en vez de perderse.
- 🪙 **Oro**: los monstruos dejan monedas al ser vencidos (más los sub-jefes, mucho más el jefe final). Se acumula para siempre, incluso si mueres. Todavía no hay dónde gastarlo.
- 🐉 **El trofeo del jefe**: al vencer al Dragón Ancestral te quedas con un objeto legendario que te acompaña en **todas las rutas futuras**, para siempre, sin ocupar una ranura del inventario normal. Si lo ganas más de una vez, eliges quedarte con el nuevo o conservar el que ya tenías.

### 🛠️ Por dentro
- `hero.inventory` (10 ranuras) y `hero.trophy` en `src/engine.js`/`src/items.js`; `meta.gold` y `meta.trophyItem` en `src/meta.js`, persistentes.
- 26 comprobaciones nuevas en `tests/items-sim.mjs` (148 en total) y 19 nuevas en `tests/browser.test.mjs` (142 en total).
- Bug corregido: `saveMeta(null, …)` devolvía `true` sin haber guardado nada.

## [1.1.0] - 2026-09-22

### ✨ Novedades
- 🏰 **Nueva dirección visual**: fantasía oscura de mazmorra (piedra y forja) en vez de la paleta índigo/Inter por defecto. Tipografía Cinzel para títulos, Work Sans para el resto.
- 📖 **Bestiario**: cada monstruo, sub-jefe, jefe y enemigo de evento (24 en total) se revela al cruzártelo, y se marca en verde al vencerlo. Persiste entre partidas.
- 🎒 **Colección**: las 122 bases de objeto se van descubriendo (con las rarezas en que las has visto) a medida que aparecen en cofres, hogueras y botín de sub-jefe.
- 🏆 **15 logros**, solo información y orgullo (nunca poder): desde «Primera sangre» hasta «Naturalista» (bestiario completo). Se anuncian en la pantalla de fin de ruta.
- 💾 **Importar / exportar** tu progreso (ruta en curso + bestiario + colección + logros) como un texto para copiar y guardar.
- ⚙️ Panel de **Opciones** con la semilla de la ruta actual y un «Sobre Easy Hero».
- 🧭 Menú fijo en la cabecera para abrir estos 4 paneles en cualquier momento, sin abandonar la ruta.

### 🛠️ Por dentro
- Progreso persistente en `src/meta.js` (independiente del guardado de la partida).
- 10 comprobaciones nuevas en `tests/browser.test.mjs` (123 en total).

## [1.0.2] - 2026-09-22

### ✨ Novedades
- 🎒 **Equipo: 4 ranuras y 5 rarezas.** Tu héroe lleva arma primaria (define el **tipo de daño**: Filo, Contundente, Perforante, Veneno, Fuego o Rayo), secundaria (escudo, daga o foco), armadura y accesorio. **122 objetos** de base, con **⚪ Común, 🟢 Poco común, 🔵 Rara, 🟣 Épica y 🟠 Legendaria** (cada una con más afijos y más poder, y las legendarias con un rasgo único).
- 🧰 **Los cofres ya solo dan objetos**: eliges 1 de 3, lo comparas con lo que llevas puesto y decides **equiparlo** (pierdes el anterior) o **descartarlo** (te cura). El piso 1 siempre es un cofre: tu primera decisión de equipo.
- 🔥 La hoguera ahora ofrece **Descansar** o **Equiparte** (1 de 3 objetos, mínimo 🟢). El botín de un **sub-jefe** es siempre 🔵 o mejor.
- 🎯 **24 afijos** con efecto real en combate: golpe furtivo, golpe extra, golpe de gracia, frenesí, venganza, espinas, robo de vida, última defensa, determinación, huir sin daño, resistir al Lector, curas al empezar/defender/vencer un combate, mejoras al Golpe de Fuego (más daño, menos enfriamiento, quemadura)…
- ☠️🔥 **Veneno y quemadura**: nuevos estados que se ven en la carta del enemigo y hacen daño ronda a ronda.
- 🗡️ La vista previa de Atacar ahora es exacta, incluidos los golpes extra y lo que reduce un enemigo que se protege.

### ⚖️ Equilibrio
- El poder ya no viene de vencer combates (eso ya no da +ATK ni +HP): viene del **equipo** que encuentras.
- Monstruos algo más duros (`atkPerFloor 0,4`, `hpPerFloor 3,6`) para compensar el poder del equipo: con 1000 partidas por bot, el jugador **sensato gana el 22 %** (objetivo ~20 %), el experto el 38 % y el torpe el 1 %.
- Detalle y método actualizados en [docs/equilibrio.md](docs/equilibrio.md).

### 🛠️ Por dentro
- El contenido de objetos (rarezas, bases y afijos) vive en `src/data/`; la fabricación, equipar/descartar y el botín en `src/items.js`.
- El guardado incluye el equipo del héroe y el botín pendiente (`SAVE_VERSION 2`): las partidas de la 1.0.1 se descartan con aviso.
- **122 comprobaciones nuevas** sobre la fabricación, el equipo y las reglas en combate (`tests/items-sim.mjs`).

## [1.0.1] - 2026-09-21

*Lo primero que se hizo tras la 1.0: que el juego se pueda ganar, se entienda lo que pasa y no se pierda la partida.*

### ✨ Novedades
- 👁️ **Ves lo que va a hacer el enemigo antes de elegir.** Sobre cada enemigo aparece su próximo movimiento (`⚔️ Ataca 5`, `💥 Golpe fuerte 9`, `⚡ Reúne fuerzas`, `🛡️ Se protege`, `💚 Se cura`, `💤 Descansa`) y es exactamente el que hará. Los botones te dicen cuánto recibirías si te defiendes.
- 👹 **15 monstruos distintos**, uno por piso, y **3 sub-jefes y un jefe**, cada uno con su forma de atacar: el Goblin carga y golpea fuerte, el Esqueleto se protege, el Murciélago se cura…
- 🔥 **Hogueras.** Descansa (cura el 30 % de tu vida máxima) o afila tu arma (+1 ATK). Hay una **siempre antes del jefe**, y todo camino pasa por al menos dos.
- 💀 **Los sub-jefes son opcionales.** Desde cualquier punto del mapa siempre puedes elegir un camino sin ellos.
- 💾 **Guardado automático.** Cierra la pestaña y sigue donde lo dejaste, incluso en mitad de un combate o de un evento. En el inicio aparece **CONTINUAR LA RUTA** con tu piso, tu vida y tu semilla.
- 🏁 **Pantalla final** al ganar o perder: quién te venció, hasta qué piso llegaste, tus datos, los eventos que viviste y una línea de **«casi»** (cuánta vida le quedaba al enemigo). Desde ahí: nueva ruta, **repetir con la misma semilla** o volver al inicio.
- 🌱 **Semilla.** Cada ruta tiene un código (`K3F9-2QA`). También puedes escribir el tuyo (cualquier texto sirve) en la pantalla de inicio: la misma semilla da el mismo mapa, y los mismos eventos si tomas las mismas decisiones.
- 🏷️ La cabecera muestra la **versión del juego**.

### ⚖️ Equilibrio
- El juego ya se puede ganar: un jugador medio gana **~1 de cada 5 partidas** (medido con miles de partidas simuladas).
- Un combate normal cuesta un **6-17 %** de la vida (antes, el 20-30 %).
- Un sub-jefe se puede vencer con la vida completa (cuesta el 23-42 %).
- El jefe final tiene más vida y más ataque que cualquier sub-jefe.
- Detalle y método en [docs/equilibrio.md](docs/equilibrio.md).

### 🐛 Correcciones
- Defender ya no queda «guardado» para la ronda siguiente: cubre solo el golpe de la ronda en curso.
- En la pantalla final los valores a cero se veían vacíos.
- Un texto con espacios o guiones como semilla daba un resultado distinto según cómo se escribiera.

### 🛠️ Por dentro
- Todo el azar de una partida sale de **un solo generador con semilla** (que se guarda y se retoma).
- Los números de equilibrio viven en un solo archivo (`src/data/balance.js`).
- **Banco de equilibrio** (`npm run balance`) con tres bots (torpe, sensato y experto) y un **vigilante** que avisa si un cambio deja el juego injugable.
- **380 comprobaciones automáticas** (motor, eventos, guardado, equilibrio y navegador).
- Sistema de versiones con comprobación automática.

## [1.0.0] - 2026-09-21

*La primera versión completa del juego.*

### ✨ Novedades
- 🗺️ **Mapa de 16 pisos** con 7 columnas y 6 caminos que se ramifican, distinto en cada partida.
- ⚔️ **Combate por turnos** con menú: Atacar, Defender, Habilidades (Golpe de Fuego) y Huir.
- 🎲 **15 eventos**, cada uno con una situación y **dos decisiones** que cuestan algo: la chica herida, el extraño encapuchado, el cofre susurrante, el campamento, el espejo oscuro, el caballero caído, el pozo de los deseos, el puente de cuerdas, la puerta sellada, el alquimista, el derrumbe, el juicio de las hermanas, el voto, el maestro errante y **El Lector**.
- 🧠 **El Lector**, un enemigo que lee tus movimientos: si repites la acción, su golpe hace el doble.
- 🤞 **Votos y lecciones** que cambian tu forma de jugar (renunciar a huir, renunciar a las habilidades, mejorar el Golpe de Fuego…) y **afinidades** ya registradas para el futuro.
- 💀 Nodos de cofre, sub-jefe y **jefe final**.
- 📱 Funciona en móvil y en ordenador, sin instalar nada. Publicado en GitHub Pages.

### ⚠️ Conocido
- El equilibrio era provisional: el jefe final era prácticamente inalcanzable (se corrigió en la 1.0.1).
