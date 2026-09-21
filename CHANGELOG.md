# 📜 Registro de cambios

Aquí se anota **qué trae cada versión** del juego, de la más reciente a la más antigua.
Cómo se numeran las versiones y cómo se publica una nueva: [docs/versiones.md](docs/versiones.md).

## [Sin publicar]

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
