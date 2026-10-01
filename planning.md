# 🗺️ Planificación — lo pendiente

> Solo lo que falta por hacer y las decisiones vigentes. Lo hecho y cómo se resolvió está en
> [historial.md](historial.md) (la bitácora). Cómo se trabaja: [CLAUDE.md](CLAUDE.md),
> [cloud-method.md](cloud-method.md) (sesiones en la nube) y [tools/image-generator/README.md](tools/image-generator/README.md)
> (fábrica de arte).

## 📍 Estado (2026-10-01)

- **Publicado:** la **1.7.0** (https://harmondez.github.io/easy_hero/): descenso sin fin, La Forja, combate de lado
  estilo DragonFable, y el **Modo Aventura en Zafias** con mapa HD, 4 escenas (aldea, bosque, campamento y la
  guarida del lobo), 28 paradas con puntos de interés, goblins y lobos, la misión de Maela y Grask, y **Feronius**
  como jefe de la zona. Criaturas con nombre en la recámara (gnolls y orcos con sus jefes, ya dibujados).
- Herramientas: taller de sprites, Asset Factory, montaje de zonas (`docs/zonas.md`) y banco de la aventura
  (`npm run sim:aventura`).

## 🔥 Siguiente, en este orden

0. **Lo que dijo el banco de la aventura** (`npm run sim:aventura`, 2026-10-01). Antes del bosque amarillo:
   - **El héroe de la aventura no tiene progresión de equipo.** Pelea con la espada básica (ATK 1) y solo mejora con
     los puntos de nivel y La Forja: en el descenso la fuerza viene del botín, aquí no hay botín. Para Zafias basta
     (se bajaron los pisos de sus enemigos), pero la segunda zona necesitará armas en la tienda de la aldea, botín
     de los jefes o equipo que se traiga del descenso. Es una decisión de diseño para el director.
   - **Combates largos y repetidos:** los goblins de piso 2 (guardia, centinela, rezagado) duran ~20 turnos con el
     ritmo carga-golpe y defenderse. Y casi no hay azar: todas las partidas del bot salen idénticas.
   - **Curva de Zafias hoy:** se acaba hacia el nivel 4; ~16 combates de entrenamiento antes de Grask jugando bien
     (55 si solo atacas); Feronius se vence a la primera perdiendo ~65 % de la vida; ~60 de oro al final.
   - Las fichas de gnolls y orcos (`creatures.js`) usan pisos 2-6 de la escala vieja: recalibrarlas con el banco
     cuando se coloquen.
   - Tras la misión, el objetivo dice «Misión cumplida» y no apunta a Feronius: añadir una pista («algo aúlla al
     sureste del campamento»).

1. **Arte con la Asset Factory** (`tools/image-generator`, ~0,034 $ por imagen):
   - **Fondos de combate por zona**: el combate usa siempre `img/bg/forest.webp`; debe usar el fondo de su zona
     (`src/data/art.js` → `bg`).
   - **Escala por especie**: todo sprite se normaliza a ≤256 px de alto, así que un orco sale igual de alto que el
     héroe. Guardar una escala por monstruo y aplicarla en el combate.
   - **Comprobar la orientación** automáticamente (el modelo a veces dibuja mirando al lado contrario; hoy se
     arregla a mano con `fix --flip`).
   - **Colocar las criaturas de la recámara** (`src/data/creatures.js`: lobos, gnolls, orcos y sus tres jefes, ya con
     dibujo y ficha) en zonas o misiones: `enemy: { creature: id }` en la parada.
   - Lotes de enemigos por familia (los 90 monstruos comparten ~15-20 familias): empezar por Zafias y los primeros
     pisos.
2. **Mapa de Zafias en alta: casi hecho.** Ya se juega con el mapa HD recompuesto (`node tools/assemble-map.mjs`).
   Faltan dos piezas: **f1_c1** (santuario de piedras, arriba a la izquierda; hoy va el original ampliado) y rehacer
   **f1_c3** fiel al original (la que llegó está redibujada: el río y la cascada cambian de sitio y cede en las
   costuras). Ojo: los caminos del norte del bosque (ruinas, camino del norte, puente del orco) ya están trazados
   sobre la redibujada; si se cambia, basta con volver a ejecutar `node tools/trace-paths.mjs`. Quizá compense quedarse con ella.
   Dejarlas en `img/map-divided-upscaled/` como `cuadricula_fX_cY_hd.jpg` y volver a ejecutar la herramienta.
3. **Encargos de la nube pendientes** (GitHub Issues): **#4 editor de zonas** (`?editor`) y después **#5 misiones
   como datos**. Lanzarlos según [cloud-method.md](cloud-method.md).
4. **Más Zafias**: el mapa ya tiene los ganchos puestos como puntos de interés: la senda del santuario (misión 2),
   el camino del norte y la escalinata (arco del castillo), Bram y el hierro de las cuevas (misión 3). Mejor después
   de #5 (misiones como datos). Receta de zonas y caminos: [docs/zonas.md](docs/zonas.md).
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
