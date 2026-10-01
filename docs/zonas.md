# 🗺️ Cómo se monta una zona del Modo Aventura

Receta para pasar de «un mapa pintado» a «una zona jugable con paradas y caminos a trazos». Zafias se hizo así.

## 1. El mapa
1. El director entrega el mapa (o sus trozos reescalados). Sin iconos, personajes ni textos: solo terreno, con los
   **caminos bien marcados** (el prompt de reescalado pide caminos continuos y legibles).
2. Si llega en trozos: `node tools/split-map.mjs` los cortó con un índice de coordenadas, y
   `node tools/assemble-map.mjs` los recompone en HD fundiendo las costuras (las piezas redibujadas ceden).
3. La imagen va a `img/zones/<zona>.webp`, a ×3 del tamaño lógico. Las coordenadas del juego son siempre lógicas.

## 2. Las paradas (lo único que se decide a mano: es diseño de juego)
1. Mirar el mapa con cuadrícula: `node tools/zone-overlay.mjs salida.jpg x,y,ancho,alto 2`
   (`--tierra` resalta la tierra de camino de Zafias; `--limpio` quita las paradas).
2. En `src/data/zones/<zona>.js`: escenas (`box` = encuadre de la cámara), paradas (`points`: npc, enemy, exit, inn,
   shop, cave, **poi**) y cruces (`forks`). **Las paradas y los cruces van encima del camino pintado**: además de
   verse bien, es de donde el trazador aprende de qué color es el camino.
3. Los caminos (`links`) se escriben **sin recodos**: solo qué une con qué, `['poste', 'goblin-puente']`.

## 3. Los caminos a trazos (automático)
1. `node tools/trace-paths.mjs --captura <carpeta>`: aprende el color del camino de las paradas, busca la ruta
   más barata entre cada par (A*), la endereza y la reduce a unos recodos. Tarda ~10 s y escribe
   `src/data/zones/<zona>-paths.js`. La captura (cian) permite revisarlo de un vistazo.
2. Si un camino sale mal (un claro de otro color, un tramo sin camino pintado), se le escriben los recodos **a mano**
   en el archivo de la zona: mandan sobre los automáticos. `--comparar` dice cuánto se separan ambos.
3. `--mascara m.png` enseña qué ha entendido como camino (blanco). Si un mapa nuevo confunde colores, ahí se ve.

## 4. Comprobar
- `npm run sim:aventura`: un bot juega la zona miles de veces; dice cuánto cuesta cada enemigo, dónde se cae y
  cuánto hay que entrenar. Ajustar pisos y fichas (`creatures.js`) hasta que la curva tenga sentido.
- `node tests/zones-sim.mjs`: caminos que unen paradas reales, todo alcanzable, dentro del encuadre, salidas con
  destino, diálogos escritos, hallazgos de una sola vez y ningún camino sin trazar.
- Una captura en el juego de cada escena.

> Pendiente para la segunda zona: hoy las herramientas leen Zafias directamente; al llegar otra, que reciban la zona
> por parámetro (`--zona nieve`) y que el visor cargue la zona de la escena en vez de importar Zafias.
