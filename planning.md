# 🗺️ Planificación — lo pendiente

> Solo lo que falta por hacer y las decisiones vigentes. Lo hecho y cómo se resolvió está en
> [historial.md](historial.md) (la bitácora). Cómo se trabaja: [CLAUDE.md](CLAUDE.md),
> [cloud-method.md](cloud-method.md) (sesiones en la nube) y [tools/image-generator/README.md](tools/image-generator/README.md)
> (fábrica de arte).

## 📍 Estado (2026-10-01)

- **Publicado:** la **1.6.0** (https://harmondez.github.io/easy_hero/): descenso sin fin, La Forja, combate de lado
  estilo DragonFable con panel de pergamino y pociones, enemigos sin intenciones visibles (telegrafiado de golpes
  fuertes), el **Modo Aventura en Zafias** (aldea, bosque, campamento; misión de Maela y Grask; posada, tienda,
  cueva al descenso; mapa con caminos a trazos y paradas 1-1, 1-2…) y los primeros enemigos con arte propio de la
  **Asset Factory** (Orco y Grask).
- Herramientas: taller de sprites (`npm run sprites`) y Asset Factory (`npm run generate`).

## 🔥 Siguiente, en este orden

1. **Arte con la Asset Factory** (`tools/image-generator`, ~0,034 $ por imagen):
   - **Fondos de combate por zona**: el combate usa siempre `img/bg/forest.webp`; debe usar el fondo de su zona
     (`src/data/art.js` → `bg`).
   - **Escala por especie**: todo sprite se normaliza a ≤256 px de alto, así que un orco sale igual de alto que el
     héroe. Guardar una escala por monstruo y aplicarla en el combate.
   - **Comprobar la orientación** automáticamente (el modelo a veces dibuja mirando al lado contrario; hoy se
     arregla a mano con `fix --flip`).
   - Lotes de enemigos por familia (los 90 monstruos comparten ~15-20 familias): empezar por Zafias y los primeros
     pisos.
2. **Mapa de Zafias en alta**: las piezas para rehacer están en `img/map-divided/` (ver su `LEEME.md`). Cuando el
   director las devuelva, el juego usará la pieza nítida al entrar en cada escena.
3. **Encargos de la nube pendientes** (GitHub Issues): **#4 editor de zonas** (`?editor`) y después **#5 misiones
   como datos**. Lanzarlos según [cloud-method.md](cloud-method.md).
4. **Más Zafias**: misión 2 (santuario de piedras), misión 3 (Bram y el hierro de las cuevas), arco del castillo.
   Mejor después de #5 (misiones como datos).
5. **Publicar** la siguiente versión cuando haya novedades jugables en `main`.

## 📌 Decisiones vigentes

| Tema | Decisión |
|---|---|
| Plataforma | Web estática (GitHub Pages + vistas previas en Cloudflare), JavaScript vanilla sin bundler. Godot/Flutter descartados. **Escritorio primero**; en móvil basta con que funcione |
| Combate | De lado: héroe SIEMPRE a la izquierda mirando a la derecha, enemigo SIEMPRE a la derecha mirando a la izquierda; único movimiento la embestida + número de daño. Panel de pergamino con ¡Atacar! y el resto a un clic |
| Enemigos | Sin intenciones visibles (patrones ocultos que se aprenden); los golpes fuertes se telegrafían con una frase y brillo rojo |
| Pociones | 40 % de vida, gastan turno, máx. 3, 40 de oro, se conservan entre partidas |
| Aventura | Mismo héroe que el descenso; derrota → posada, vida llena, −10 % de oro; enemigos visibles que vuelven al dormir; zonas que se abren por historia; dificultad fija por zona; movimiento por caminos a trazos entre paradas |
| Arte | Pixel art de fantasía oscura (STYLE_BIBLE en `tools/image-generator/config/style-bible.json`). Arte generado con Gemini (`gemini-3.1-flash-lite-image`); sin arte propio, el goblin teñido por especie/linaje |
| Método | Funcional primero; el pulido va a Perfilados. Nube para encargos grandes y cerrados; diseño y ajustes visuales en local |

## 🧩 Perfilados (no bloquean; cuando toque)

- **Jefes:** furia bajo el 30 % de vida; patrones propios para los 5 jefes profundos (hoy comparten el del jefe final).
- **Telegrafiado:** frases por tipo de enemigo; ¿avisar también de curarse o protegerse?
- **Aventura:** colocar mejor los goblins del bosque (el vigía queda entre árboles); los puntos rojos se ven pequeños
  en la aldea; el cofre pintado del campamento no hace nada; el objetivo de misión merecería su propio cartel;
  retratos en los diálogos; si caes en un descenso de la cueva y eliges «nueva ruta», esa ruta también vuelve a la
  aldea; el equipo del descenso no viaja a la aventura (vas con espada básica + nivel/primarias/Forja).
- **Combate:** debilidades elementales ×0,5/×1,5 con los 6 tipos de daño; entrada del combate como momento.
- **Equilibrio:** los bots del banco siguen «viendo» la intención; revisar la tasa de victoria real.
- **Móvil:** en el bosque a 390 px el héroe queda pegado al borde al llegar.
- **Pruebas intermitentes:** «Descansar cura el 30 %» y «Hay hogueras 🔥 en el mapa y en la leyenda» fallan de vez
  en cuando (pasan al repetir); probablemente dependen del mapa al azar.
- **CI:** subir `upload-artifact`, `configure-pages` y `deploy-pages` cuando saquen versión sin Node 20.
- **Créditos:** nota sobre el arte hecho con IA (precaución, no verificado que sea obligatoria).

## 🧭 Ideas de diseño a largo plazo (sin fecha)

- **Mejoras pasivas «elige 1 de 3»** tras cada combate normal (reglas, no solo números).
- **Afinidad y clase emergente**: los objetos suman afinidad; a los umbrales el héroe «despierta» como guerrero,
  pícaro o elementalista (y 3 híbridos).
- **Debilidades y Ruptura**: escudo por enemigo; romperlo cancela su acción y da una acción extra.
- **Varios enemigos y orden de turnos** (el cambio más invasivo del motor).
- **Legado**: lo que deja un héroe caído para la siguiente partida.
- **Niveles de riesgo** tras la primera victoria.
- **Descenso:** segunda moneda para mejoras caras, prestigio sobre La Forja, sub-jefes y eventos propios por tramo,
  6 variantes de monstruo ya diseñadas sin construir; el banco de equilibrio no simula el descenso.
- **Primarias:** velocidad de ataque, daño contra tipos de criatura, sangrado, maná (MP), resistencia elemental útil.

## ⚠️ Riesgos vivos

- **El arte marca el ritmo**: cada enemigo necesita su imagen; la Asset Factory lo abarata, pero hay que revisar cada
  resultado (orientación, escala, estilo).
- **Crédito de la nube**: 97 $ hasta el **5 de noviembre de 2026** (~1,5 $ por encargo típico).
- **Crédito de Google** para imágenes: el director tiene 20 €; ~0,034 $ por imagen.
