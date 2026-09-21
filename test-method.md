# 🧪 Método de pruebas

Cómo se prueba este juego para que las pruebas sean **rápidas, funcionales, viables y esclarecedoras**.
La idea en una frase: **casi todo se prueba sobre el motor puro, con miles de casos por segundo; el navegador solo se usa para lo que el motor no puede demostrar.**

## 1. Resumen

| Capa | Archivo | Qué prueba | Tests | Tiempo |
|------|---------|-----------|:-----:|:------:|
| **Motor** | `tests/rpg-sim.mjs` | Héroe, combate e **intenciones**, bestiario, semilla, 300 mapas (hogueras, sub-jefes evitables…) | 104 | **1,8 s** |
| **Eventos** | `tests/events-sim.mjs` | Los 15 eventos, la hoguera, votos, IA, 1500 rutas con un héroe invencible | 118 | **7,8 s** |
| **Guardado** | `tests/save-sim.mjs` | Guardar y retomar (combate y evento a medias), versiones, datos dañados | 36 | **0,4 s** |
| **Equilibrio** | `tests/balance-guard.mjs` | Que el juego siga siendo ganable, sin ser trivial (1500 partidas de 3 bots) | 12 | **9,9 s** |
| **Versiones** | `tests/version-check.mjs` | La versión coincide en todos los sitios; el script de publicación (en simulacro) | 27 | **0,2 s** |
| **Navegador** | `tests/browser.test.mjs` | El juego real en Chromium: escritorio, móvil, recargas de página | 111 | **131 s** |

Una regla útil: **si algo se puede comprobar en el motor, no se comprueba en el navegador.** Por eso las cuatro capas de arriba
suman 297 tests en unos 20 s y la de abajo, con 111, tarda 8 veces más.

```bash
npm run test:engine     # 1,8 s   ← se ejecuta tras cada cambio
npm run test:events     # 7,8 s   ← se ejecuta tras cada cambio
npm run test:save       # 0,4 s
npm run test:balance    # 9,9 s   ← tras tocar números de equilibrio
npm run test:browser    # 131 s   ← antes de subir, o al tocar la interfaz
npm run test:version    # 0,2 s   ← comprueba que la versión está sincronizada
npm test                # los seis (408 comprobaciones)
npm run balance         # NO es un test: la tabla de equilibrio (ver docs/equilibrio.md)
```

## 2. Los principios

### 2.1 Motor puro, sin DOM, con el azar inyectado
`engine.js` y `events.js` no tocan el navegador y reciben el generador aleatorio por parámetro
(`generateRpgMap(rng)`, `startRpgEvent(id, rng)`). Eso da dos cosas:

- **Velocidad:** no hay navegador ni renderizado. Miles de partidas por segundo.
- **Determinismo:** con la misma semilla, el mismo resultado. Un fallo se puede repetir exactamente.

```js
const fixed = v => () => v;                  // siempre el mismo número: fuerza una rama
play('extrano_encapuchado', [0], { rng: fixed(0.1) });   // sale la suerte
play('extrano_encapuchado', [0], { rng: fixed(0.9) });   // sale el ladrón
```

`fixed(0.1)` y `fixed(0.9)` sirven para **forzar cada rama de un evento con azar** sin repetir hasta que salga. Para
casos variados se usa `mulberry32(semilla)`, un generador con semilla que da siempre la misma secuencia.

### 2.2 Propiedades sobre muchas semillas, no casos sueltos
En vez de «este mapa es correcto», se comprueba **una regla contra cientos o miles de mapas**:

- Ninguna arista se cruza. Todo nodo llega al jefe. No hay dos eventos seguidos.
- Todo camino de inicio a jefe cruza al menos 3 eventos.
- El HP del héroe nunca sale de `[1, maxHp]` y el ATK nunca baja de 1.

Un caso suelto solo prueba un caso. Una propiedad sobre 5000 semillas encuentra lo que nadie pensó: así aparecieron
30 mapas de cada 300 con caminos pobres en eventos, que un test con un solo mapa no habría visto.

### 2.3 Un oráculo independiente
Para comprobar «todo camino cruza ≥ 3 eventos», el test **recalcula el mínimo con su propio código** (una
programación dinámica de abajo arriba) y no reutiliza la del generador. Si el test copiara al generador, los dos
compartirían el mismo error y el test pasaría siempre.

### 2.4 El catálogo de datos se recorre solo
Como el contenido son datos (`src/data/events.js`), los tests **recorren la lista entera** en lugar de nombrar cada
evento a mano:

- Los 15 tienen icono, título y situación, y **exactamente 2 decisiones**.
- Cada decisión de cada evento se juega con 300 semillas, y todo monstruo que citan existe.

Al añadir el evento 16, estos tests lo cubren solos y avisan si rompe la regla de las 2 decisiones.

### 2.5 Un simulador compartido, con tres bots y un modo invencible

Toda la simulación vive en `tools/sim.mjs`, que usan los tests **y** el banco de equilibrio (`npm run balance`). Así, lo que se mide es lo que se
prueba. Tiene **tres bots** (torpe, sensato, experto) y un **modo invencible** (`{ god: true }`).

### 2.6 Dos tipos de simulación, con dos objetivos distintos

| | Héroe invencible | Héroe realista |
|--|------------------|----------------|
| **Para qué** | Probar el **flujo**: que toda ruta llega al jefe, sin callejones sin salida ni errores | Medir el **equilibrio** |
| **Aserciones** | Sí: 100 % llega al jefe, ≥ 3 eventos por ruta, sin excepciones | **No**, solo informa |
| **Por qué** | Sin depender de que la partida se gane, valida toda la lógica | Los números son provisionales; asegurar «se gana» daría fallos falsos |

Mezclar las dos fue el primer error: al exigir que el bot ganara, los tests fallaban por **equilibrio**, no por
**bugs**. Separarlas hizo que un test rojo signifique siempre «algo está roto» y no «el juego es difícil».

### 2.7 El equilibrio se vigila, no se fija

`tests/balance-guard.mjs` **no** exige números exactos: solo bandas anchas (por ejemplo, «el sensato gana entre el 10 % y el 30 %») y
propiedades («un sub-jefe se vence con la vida completa»). Así un cambio pequeño no lo rompe, pero uno que deja el juego injugable, sí.
Los números se ajustan con `npm run balance` y se explican en [docs/equilibrio.md](docs/equilibrio.md).

### 2.8 El navegador, solo para lo que solo el navegador demuestra
Se prueba en Chromium lo que el motor no puede saber:

- Que la vista se muestra, se oculta y cambia bien; que los botones están o no habilitados.
- Que no hay errores de JavaScript en la página (`pageerror`).
- Que el texto hostil no inyecta HTML.
- Que **recargar la página** en un combate, un evento o el mapa **retoma exactamente** donde estabas (recargas reales, con `localStorage`).
- Que un guardado viejo, dañado o un navegador con el almacenamiento bloqueado **no rompen** el juego.
- Que en el móvil no hay scroll horizontal ni nodos solapados.

Para llegar rápido a lo que se quiere ver, se **manipula el estado** en vez de jugar hasta allí:

```js
await openEvent('lector');   // camina hasta un nodo 🎲 y fuerza qué evento sale (usedEvents)
window.gameState.rpg.rng = () => 0.1;   // fuerza la rama «el puente aguanta» (el azar sale del generador de la partida)
hero.atq = 999; hero.hp = 999;    // héroe casi invencible para cruzar combates sin esfuerzo
```

## 3. Que la salida sea barata y clara

- **Cada test es una frase en español** que dice qué se espera: `12. creer a la sincera: +2 ATK y +5 HP máx`.
  Cuando falla, ya dice qué regla se rompió.
- **Se lee solo lo necesario:** `node tests/x.mjs | grep -E "RESULTS|❌"` muestra el total y los fallos, sin los ✅.
- **Sin red ni servicios:** el test del navegador levanta su propio servidor en un puerto libre.
  No necesita Python ni nada en marcha, y nunca toca GitHub Pages.
- **Las capturas son opcionales:** `SHOT_DIR=<carpeta> npm run test:browser` las guarda. Se usan solo para revisar
  el aspecto, porque ocupar imágenes es lo más caro de leer.
- **Las líneas `ℹ️` informan sin fallar:** eventos por ruta, muertes por piso, % que llega al jefe.

## 4. Cuando un test falla

Antes de tocar el código hay que decidir **de quién es el fallo**:

| Síntoma | Causa real | Qué se hizo |
|---------|-----------|-------------|
| 30 de 300 mapas con una ruta de < 3 eventos | **Bug del juego**: el generador no lo garantizaba | Se cambió el algoritmo y se comprobó con 5000 mapas |
| El héroe invencible moría contra el reflejo | **Mala prueba**: el reflejo copia el ATK, y el bot abría con una habilidad débil | Se ajustó el bot |
| `codeToSeed('k3f9-2qa')` ≠ `codeToSeed(' K3F92QA ')` | **Bug del juego**: los espacios y guiones cambiaban la semilla | Se normalizó el texto antes de convertirlo |
| Las variantes del banco de equilibrio daban todas lo mismo | **Bug del montaje**: el navegador carga los módulos con y sin `?v=` y JavaScript los trata como copias distintas | Los números de equilibrio son ahora un único objeto compartido |
| El puente ya no se podía forzar con `Math.random` | **Cambio del juego**: ahora el azar sale de la semilla de la partida | El test sustituye el generador de la partida |
| El jefe tenía menos vida que un sub-jefe | **Diseño**: el banco lo dejaba así, pero se ve mal | Se retocó con el banco hasta cumplir también esa regla |
| «Más de 50 nodos» fallaba a veces | **Mala prueba**: el umbral no salía de ningún dato | Se midieron 20 000 mapas (mín. 46) y se bajó a 40 |
| Nodos «pequeños» en el móvil | **Mala prueba**: medía durante la animación de entrada | Se espera a que termine |
| Nadie llega al jefe | **Diseño**: el equilibrio, no un bug | Se documentó, sin aserción |

El método para investigar: un **script pequeño y descartable** (fuera del repositorio) que reproduce el caso y
imprime lo mínimo. Se mide antes de opinar; los umbrales salen de la **distribución real**, no de una corazonada.

## 5. Añadir pruebas nuevas

**Un evento nuevo**
1. Añadirlo a `RPG_EVENTS`. El catálogo ya comprobará 2 decisiones, texto y monstruos.
2. Añadir sus casos en `events-sim.mjs` con `fixed(...)` para cada rama.
3. Si los números del test de conteo cambian (por ejemplo, «15 eventos»), actualizarlos.

**Una regla del mapa nueva**
1. Escribirla como una propiedad dentro del bucle de semillas de `rpg-sim.mjs`.
2. Calcularla con código **propio del test**, no reutilizando el del generador.

**Una pantalla o botón nuevo**
1. Un test de navegador que la abra con un atajo (`openEvent`, estado forzado), no jugando hasta ella.
2. Comprobar el estado visible y que `pageErrors` sigue vacío.

## 6. Qué no se prueba (todavía)

- **Equilibrio:** solo se mide. Las aserciones llegarán cuando los números sean definitivos (M4).
- **Guardado de partida:** aún no existe.
- **Otros navegadores:** solo Chromium. Firefox y Safari no se han probado.
- **Accesibilidad y rendimiento en móviles reales:** solo se emula un móvil de 390 × 844.
- **El test del navegador es lento (131 s)** por las esperas fijas (`sleep`), las recargas y por recorrer rutas completas. Se puede
  acelerar sustituyendo las esperas por esperas a condiciones, si empieza a estorbar.
