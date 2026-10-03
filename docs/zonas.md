# 🗺️ Cómo se monta una zona del Modo Aventura

Receta para pasar de «un mapa pintado» a «una zona jugable con paradas y caminos a trazos». Zafias se hizo así.

## 1. El mapa
1. El director entrega el mapa (o sus trozos reescalados). Sin iconos, personajes ni textos: solo terreno, con los
   **caminos bien marcados** (el prompt de reescalado pide caminos continuos y legibles).
2. Si llega en trozos: `node tools/split-map.mjs` los cortó con un índice de coordenadas, y
   `node tools/assemble-map.mjs` los recompone en HD fundiendo las costuras (las piezas redibujadas ceden).
3. La imagen va a `img/zones/<zona>.webp`, a ×3 del tamaño lógico. Las coordenadas del juego son siempre lógicas.

### Una escena con su propio cuadro
Una escena puede no ser un recorte del mapa grande, sino una imagen aparte (la aldea de Zafias y las casas del camino):
1. Se genera con la fábrica: `npm run generate -- scene "small medieval forest village" --variant v1 --no-game --details "…" --regions "inn:NW:…,forge:W:…"`
   (`--regions` dice en qué casilla de una rejilla 3×3 va cada edificio). Cuando una variante convence:
   `npm run generate -- fix scene <nombre>-v1 --game-id zafias-aldea` la deja en `img/zones/zafias-aldea.webp`.
2. En la escena: `image`, `width`, `height` (el tamaño lógico; la imagen va a ×2) y `box: { x: 0, y: 0, w, h }`.
   Sus paradas van en esas coordenadas, de 0 al tamaño de la escena.
3. El trazador (`tools/trace-paths.mjs`) y el visor la tratan como un lienzo aparte, sin más.

Lo que hizo que el cuadro de la aldea saliera bien (aprendido del prompt del mapa anterior): pedir **los caminos lo
primero** (una sola red de tierra clara, continua, con un ramal hasta la puerta de cada edificio y hasta cada salida,
y de un carro de ancho: si se piden «anchos» salen plazas vacías), un claro de tierra delante de cada puerta, nada de
gente ni animales, y mucho detalle pequeño nombrado uno a uno (muros bajos, vallas, faroles, leña, barriles).

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

> Pendiente para la segunda zona (las escenas con cuadro propio ya están; falta otra zona entera): hoy las herramientas leen Zafias directamente; al llegar otra, que reciban la zona
> por parámetro (`--zona nieve`) y que el visor cargue la zona de la escena en vez de importar Zafias.
