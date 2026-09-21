> ⚠️ **Documento histórico del prototipo v0.** Describe el mapa antiguo (10 pisos × 5 columnas). El juego actual tiene
> 16 pisos × 7 columnas, nodos de evento y sin DEF; ver el [README](../README.md) y el [catálogo de eventos](eventos.md).

# RPG-pack — semilla de un juego roguelike de ruta

> Título provisional: **Easy Hit RPG**. Este paquete es el modo RPG de Easy Hit extraído como un proyecto
> **autónomo**: no importa nada del resto del repositorio y se puede copiar a otra carpeta y seguir desde ahí.

## 1. Qué se pretende

Un **juego entero** cuya versión 1.0 es la idea RPG que ya funciona aquí, y que irá creciendo hasta parecerse
a *Slay the Spire* y a otros roguelikes de ruta: un mapa con caminos que se ramifican, decisiones que
importan, combates por turnos y un jefe final al fondo de la ruta.

Las ideas que definen el juego:

1. **Todos empiezan con el mismo héroe y las mismas estadísticas.** No hay pantalla de elegir personaje.
   El héroe inicial es siempre el mismo: **ATK 1 · HP 25**.
2. **El héroe se hace más fuerte con el tiempo, y cómo lo hace depende del jugador.** Según los caminos que
   tome (monstruos, cofres, sub-jefes) y las decisiones que vaya tomando, el héroe evoluciona. En lugar de
   elegir una clase al principio, **la clase emerge de las decisiones**: puede acabar siendo
   **guerrero**, **pícaro** o **elementalista**.
3. **Solo atributos básicos.** ATK y HP, con su **propia escala** (números pequeños). Nada de las
   habilidades, pasivas, Fervor, ultimates ni cartas del Easy Hit normal: este juego se define por sí mismo.
   Las habilidades que existan aquí (hoy solo *Golpe de Fuego*) son del RPG.
4. **Los monstruos empiezan débiles y escalan** a medida que el héroe avanza (y se hace más fuerte).
5. **La ruta se elige, no se sufre.** Tres tipos de camino: monstruos, cofres y sub-jefes; el jefe final
   espera al final.

## 2. Estado actual (v1.0-alpha)

| Pieza | Estado |
|-------|--------|
| Héroe único (ATK 1 / HP 25) con nivel | ✅ |
| Mapa de ruta: 10 pisos × 5 columnas, 4 caminos que no se cruzan, jefe final arriba | ✅ |
| Nodos: monstruo 👹, cofre 🧰, sub-jefe 💀, jefe final 🐉 | ✅ |
| Combate por turnos con cartas de héroe (izquierda) y monstruo (derecha) | ✅ |
| Acciones: Atacar · Defender · Habilidades (Golpe de Fuego) · Huir | ✅ |
| Escalado de monstruos por piso, sub-jefes y jefe final | ✅ (números provisionales) |
| Crecimiento del héroe (victorias y cofres) | 🟡 provisional, sin decisiones reales todavía |
| Clases emergentes (guerrero / pícaro / elementalista) | ⬜ por diseñar — es el corazón de la v1.0 |
| Curación entre combates, hogueras, tiendas, eventos | ⬜ |
| Guardar partida | ⬜ (el estado vive solo en memoria) |
| Arte, sonido | ⬜ (todo son emojis y CSS) |

### Reglas que ya están en el código

- **Daño** = el `ATK` del atacante (no hay DEF).
- **Atacar**: un golpe. **Defender**: el próximo golpe recibido se reduce a la mitad (redondeo hacia arriba;
  dura un golpe). **Golpe de Fuego**: 5 de daño fijo, enfriamiento de 3 rondas.
  **Huir**: solo de monstruos normales; te golpean al salir y vuelves al mapa **sin avanzar** (puedes elegir
  otro camino); no se puede huir de sub-jefes ni del jefe final.
- **Monstruos** (piso `f`, empezando en 0): `ATK = 1 + ⌊f/2⌋`, `HP = 6 + 3f`.
  Sub-jefe: `ATK +2`, `HP ×2,5`. Jefe final: `ATK +5`, `HP ×3,5`.
- **Recompensas provisionales**: victoria sobre monstruo `+1 ATK, +4 HP`; sobre sub-jefe `+2 ATK, +8 HP`;
  cofre: una mejora al azar (`+1 ATK` o `+5 HP`). El HP se conserva entre combates.
- **Mapa**: el piso 0 son monstruos, el piso previo al jefe son cofres, los sub-jefes aparecen desde el piso 4,
  nunca hay dos cofres ni dos sub-jefes seguidos, y siempre hay al menos un sub-jefe y un cofre intermedio.
- Con el héroe base y solo atacando se llega hasta el **primer sub-jefe (piso 5)**, donde cae. Es intencionado
  por ahora: el sub-jefe hace de "puerta" que obliga a buscar mejoras por el camino.

## 3. Cómo ejecutarlo

Necesita servirse por HTTP (los módulos ES no funcionan bajo `file://`).

```bash
npm run dev          # servidor en http://127.0.0.1:8770  (usa python -m http.server)
```

Tests:

```bash
npm install                        # solo la primera vez (Playwright)
npx playwright install chromium    # solo la primera vez
npm run test:engine                # lógica pura: héroe, monstruos, 300 mapas aleatorios, combate
npm run test:browser               # partida completa en el navegador (levanta su propio servidor)
npm test                           # ambos
```

## 4. Estructura

```
rpg-pack/
├── index.html            Página única (sin pestañas): inicio, mapa y combate
├── style.css             Base (tokens, botones) + todo el estilo del juego
├── package.json          Scripts y Playwright (type: module)
├── README.md             Este documento
├── src/
│   ├── engine.js         Lógica pura, sin DOM: héroe, escala de monstruos, generador de mapa, combate
│   ├── ui.js             Presentación: dibuja cartas, mapa (SVG + nodos), acciones, diario, efectos
│   └── main.js           Estado de la partida (gameState.rpg), flujo y eventos
└── tests/
    ├── rpg-sim.mjs       Tests del motor (Node)
    └── browser.test.mjs  Partida completa (Playwright)
```

Separación de responsabilidades (mantenerla al crecer):

- **`engine.js` no toca el DOM** y recibe el generador aleatorio por parámetro (`generateRpgMap(rng)`),
  así los mapas y combates se prueban de forma determinista.
- **`ui.js` solo pinta**; **`main.js` decide** qué pasa al hacer clic y guarda el estado.
- Todo `innerHTML` dinámico pasa por `esc()`; todo lookup del DOM se protege; los eventos van delegados.

## 5. Convenciones técnicas

- JavaScript vanilla con módulos ES, CSS3 (Grid/Flexbox/`color-mix`), GSAP por CDN solo para los efectos
  de golpe. **Sin build.** Interfaz en español.
- **Cache-busting**: los `import` y las etiquetas `<script>`/`<link>` llevan `?v=20260920a`. Si se publica en
  GitHub Pages y se cambia código, hay que **subir ese texto en todos los sitios a la vez** (`index.html`,
  `src/main.js`, `src/ui.js`); si `main.js` y `ui.js` importan el motor con versiones distintas, el navegador
  crea dos copias del módulo con estado separado.
- Esta carpeta es una **copia**: si se sigue tocando el modo RPG dentro de Easy Hit, los cambios no llegan aquí
  automáticamente (y al revés). Cuando el proyecto se independice, conviene dejar solo una de las dos.

## 6. Hoja de ruta propuesta

> Son **propuestas** para ordenar el trabajo, no decisiones tomadas.

**v1.0 — cerrar el bucle jugable**
- Guardar la partida en `localStorage` y poder retomarla.
- Curación (hogueras, cofres, o entre combates) y equilibrado de números.
- Pantalla final de partida (victoria/derrota con resumen) y volver a empezar.
- Más variedad: monstruos con comportamientos distintos, un jefe final con identidad propia.
- **Las decisiones que forman la clase** (ver abajo), que es lo que hace único este juego.

**Cómo podrían emerger guerrero, pícaro y elementalista** (a validar):
- Las mejoras que aparecen en cofres, altares y eventos se agrupan en tres "familias" afines a cada clase
  (aguante y HP · golpes rápidos y esquiva/crítico · daño elemental y control).
- El héroe acumula **afinidad** con cada familia según lo que elige; cuando una supera un umbral se
  convierte en su especialización y **desbloquea habilidades** en el menú *Habilidades* (ya preparado).
- Elegir un camino de monstruos, de cofres o de sub-jefes inclina hacia unas familias u otras.

**v1.1 — un mapa con más decisiones**: eventos, hogueras, tiendas, élites, varios actos con dificultad creciente,
semillas para repetir un mapa.

**v1.2 — profundidad de combate**: más habilidades por clase, un recurso (energía/enfriamientos), estados
(veneno, quemadura, aturdimiento), enemigos con intenciones visibles como en *Slay the Spire*.

**v2.0 — sistemas al estilo Slay the Spire**: reliquias/objetos pasivos, meta-progresión entre partidas y,
si se quiere, una capa de cartas/mazo.

### Preguntas abiertas

- ¿El combate seguirá siendo por menú (Atacar/Defender/Habilidades/Huir) o dará el salto a cartas y mazo?
- ¿Cuántas "familias" de mejora y cuándo se materializa la clase (a mitad de ruta, al final de un acto)?
- ¿Cuántos pisos y actos tiene una partida completa?
- Nombre definitivo del juego.
