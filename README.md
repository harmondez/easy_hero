<div align="center">

# 🗡️ Easy Hero

**Un roguelike de ruta con combate JRPG por turnos.**
*Minimalista en forma, denso en decisiones.*

![estado](https://img.shields.io/badge/estado-prototipo-orange)
![sin build](https://img.shields.io/badge/build-ninguno-brightgreen)
![js](https://img.shields.io/badge/JavaScript-vanilla-yellow)
![idioma](https://img.shields.io/badge/idioma-espa%C3%B1ol-blue)

</div>

---

## ✨ La idea

Todos empiezan con **el mismo héroe**, sin nada. No hay pantalla de elegir clase: **la clase emerge de tus decisiones**.
Cada camino que tomas, cada cofre que abres y cada evento que resuelves te empuja hacia un estilo de juego distinto.

Recorres una **ruta que se ramifica** como en *Slay the Spire*, y cada combate es un pequeño puzle de **JRPG por turnos**
al estilo *Octopath Traveler*: leer las debilidades del enemigo, romper su escudo y aprovechar el turno libre.

> 🎯 Una partida dura entre **25 y 40 minutos**: un acto largo, un jefe final al fondo de la ruta.

## 🧭 Cómo se juega

```
        🐉  Jefe final
       ╱ │ ╲
     🧰  💀  🔥        elige tu camino: monstruos, élites, hogueras,
     │ ╲ │ ╱ │         eventos, tiendas y cofres
     👹  👹  🎲
      ╲  │  ╱
        🚪  Inicio
```

1. **Elige tu ruta.** El mapa es procedural y muestra a qué te enfrentarás. Ir a por lo fácil o arriesgarte por la mejor recompensa es una decisión real.
2. **Combate por turnos.** Menú clásico: ⚔️ Atacar · 🛡️ Defender · ✨ Habilidades · 🏃 Huir. Un **orden de turnos visible** y hasta **3 enemigos** por encuentro.
3. **Rompe al enemigo.** Cada enemigo tiene un escudo y **debilidades**. Golpéalas para romperlo: pierde su turno y recibe más daño.
4. **Crece a tu manera.** Lo que eliges te da **afinidad** con un estilo y desbloquea habilidades y sinergias.

## ⚔️ Tres estilos, seis tipos de daño

La clase no se elige: se **descubre**. Cada familia domina dos tipos de daño, y los enemigos son débiles a tipos distintos,
así que **tu build condiciona qué ruta te conviene tomar**.

| Estilo | Filosofía | Daño |
|--------|-----------|------|
| 🛡️ **Guerrero** | Aguante, defensa y golpes contundentes | 🗡️ Filo · 🔨 Contundente |
| 🏹 **Pícaro** | Velocidad, críticos y venenos | 🏹 Perforante · ☠️ Veneno |
| 🔥 **Elementalista** | Daño elemental y control | 🔥 Fuego · ⚡ Rayo |

Nada te obliga a quedarte en uno: mezclar familias es posible… y a veces es la mejor jugada.

## 📊 Atributos

Pocos números, muy legibles:

| Atributo | Para qué sirve |
|----------|----------------|
| **ATK** | Daño que infliges |
| **HP** | Vida |
| **DEF** | Daño que reduces |
| **SPD** | Decide el orden de los turnos |
| **MP** | Coste de las habilidades |

Los monstruos empiezan débiles y **escalan a medida que avanzas**.

## 🧱 Filosofía de diseño

- **Minimalista:** emojis y CSS. Cero imágenes, cero assets.
- **Denso:** la profundidad viene de los sistemas y del contenido, no del arte.
- **Contenido como datos:** enemigos, habilidades y eventos viven en archivos de datos, separados del motor. Añadir contenido es escribir datos, no reescribir el juego.
- **Reproducible:** el motor es puro y usa un generador aleatorio con semilla, así se puede probar y repetir una ruta.

## 🚧 Estado actual

Es un **prototipo**. Ya funciona el bucle básico; el resto está por construir.

| Pieza | Estado |
|-------|--------|
| Mapa procedural de ruta (10 pisos, caminos que no se cruzan) | ✅ |
| Nodos de monstruo, cofre, sub-jefe y jefe final | ✅ |
| Combate por turnos 1 contra 1 con menú | ✅ |
| Escalado de monstruos por piso | ✅ |
| Orden de turnos, SPD y MP | ⬜ |
| Varios enemigos, debilidades y Ruptura | ⬜ |
| Afinidades y clases emergentes | ⬜ |
| Hogueras, eventos y tiendas | ⬜ |
| Guardado de partida | ⬜ |
| Publicación en GitHub Pages | ⬜ |

## 🗺️ Hoja de ruta

1. **M0 · Base** — Pages, semilla aleatoria, guardado y pantalla final de partida.
2. **M1 · Núcleo de combate** — SPD, MP, varios enemigos, elementos, debilidades y Ruptura.
3. **M2 · Contenido y builds** — enemigos, habilidades y afinidades como datos; recompensa «elige 1 de 3».
4. **M3 · Más nodos** — hoguera, evento, tienda y élite.
5. **M4 · Equilibrio y pulido** — números, resumen de partida y semillas compartibles.

## 🚀 Ejecutarlo en local

Necesita servirse por HTTP (los módulos ES no funcionan con `file://`):

```bash
npm run dev            # http://127.0.0.1:8770  (usa python -m http.server)
```

Tests:

```bash
npm install                        # solo la primera vez
npx playwright install chromium    # solo la primera vez
npm run test:engine                # lógica pura: héroe, monstruos, mapas, combate
npm run test:browser               # partida completa en el navegador
npm test                           # ambos
```

## 📁 Estructura

```
├── index.html        Página única
├── style.css         Estilo del juego
├── src/
│   ├── engine.js     Lógica pura, sin DOM
│   ├── ui.js         Presentación
│   └── main.js       Estado de la partida y eventos
├── tests/            Tests del motor y del navegador
└── docs/             Notas de diseño del prototipo
```

Las reglas y los números actuales del prototipo están en [docs/prototipo-v0.md](docs/prototipo-v0.md).

---

<div align="center">

*JavaScript vanilla · sin build · hecho para GitHub Pages*

</div>
