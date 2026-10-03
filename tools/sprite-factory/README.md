# 🏭 Sprite Factory — el héroe animado por capas

Hace que el héroe **se vea con la armadura y la espada que lleva puestas**, andando por el mapa y peleando, sin dibujar
una animación por cada combinación.

```
hoja base (4 poses, con un palo magenta en la mano)
   ├─ vestir   → la misma hoja con otra armadura (IA, 1 imagen por animación)
   ├─ teñir    → el metal de otro color (código, gratis)
   └─ importar → una cuadrícula hecha por el director
        ↓
fotogramas alineados + dónde está la mano en cada uno
        ↓
img/hero/<armadura>/<anim>_<n>.webp   y   src/data/hero-sprites.js
```

**La espada no se dibuja en ninguna hoja.** El juego la coloca en la mano de cada fotograma: una imagen por espada
sirve para todas las animaciones y todas las armaduras.

## Las tres ideas que lo sostienen

1. **El palo magenta.** En las hojas, el héroe empuña un palo de color magenta puro en vez de una espada. Por su color
   se saca solo dónde está la mano y hacia dónde apunta el arma; luego se borra. No hay que marcar nada a mano.
2. **Vestir la hoja, no pedir un personaje nuevo** (idea del director). A la IA se le pasa la hoja base y se le pide
   «la misma, con esta armadura». Las poses salen idénticas, así que la mano vale para todas las armaduras.
3. **Teñir.** Una armadura de otro color es la misma con el metal teñido por código. No gasta imágenes ni puede
   cambiar al personaje.

El reposo tampoco se dibuja: es el héroe de pie respirando (un estiramiento mínimo, por código).

## Uso

```bash
npm run sprite-factory -- lista                    # el armario
npm run sprite-factory -- armadura malla "a chainmail hauberk…" --nombre "Cota de malla"
npm run sprite-factory -- tinte imperial-negra --de imperial --color negra --nombre "Placas imperiales negras"
npm run sprite-factory -- importar cuero walk mi-hoja.png --cuadricula 3x3 --usar 1,2,3,7
npm run sprite-factory -- lote tools/sprite-factory/lotes/armaduras-1.json --intentos 1
npm run sprite-factory -- reconstruir              # rehace todo desde las hojas guardadas (sin IA)
npm run sprite-factory -- ver                      # demo: taller/sprite-factory/demo.html
npm run sprite-factory -- base cast --generar      # una hoja base candidata para una animación
npm run sprite-factory -- base cast --adoptar taller/sprite-factory/base/cast-base-v2.png
```

Cada armadura vestida cuesta **una imagen por animación** (hoy tres: caminar, atacar y lanzar habilidad; unos 10
céntimos). Los tintes son gratis.

Tras cada orden deja una **vista previa** en `taller/sprite-factory/<armadura>/` (un GIF y una hoja de contacto por
animación, con una espada puesta) para juzgar el movimiento.

## La revisión automática

Cada hoja vestida se compara con su base. Se avisa si:

- no se ven las figuras que tocan, o el palo solo aparece en algunas;
- el héroe mide distinto, o la mano o el giro del arma no coinciden con la base;
- un fotograma lleva un color que los demás no llevan (una capa azul entre capas verdes);
- la ropa no coincide con la de otra animación de la misma armadura;
- alguna figura se sale del lienzo.

Si falla se vuelve a generar (`--intentos`, por defecto 2). Lo que no pase a la última se entrega igualmente, marcado
con ⚠ en `lista`. **Criterio del director:** funcional antes que perfecto; lo importante es que se vea la armadura y
la espada puestas, no que cada fotograma sea impecable.

## Piezas

| Archivo | Papel |
|---|---|
| `config.json` | Quién es el héroe, las animaciones (hoja base, cuadrícula, cómo se alinea, el **prompt** de la acción), las medidas de la espada y lo que exige la revisión |
| `armario.json` | Las armaduras: la base, las vestidas (con su prompt), los tintes y las importadas |
| `ejemplos/` | Las **hojas base** de cada animación y `ancla.png` (el héroe canónico, de lado y sin arma). Son la referencia de todo |
| `lotes/` | Listas de armaduras para hacer de golpe |
| `prompt-director.md` | El prompt de cuadrícula 3×4 del director, guardado como referencia |
| `src/sheet.mjs` | Leer una hoja: figuras, palo, mano, giro; alinear; teñir; huella de color |
| `src/factory.mjs` | Vestir, teñir, importar, revisar, entregar y escribir el manifiesto |
| `src/preview.mjs`, `src/demo.mjs` | GIF y hoja de contacto; la demo |

Los prompts que hablan con la IA están en la fábrica de imágenes: `tools/image-generator/prompts/sheet.json` (una hoja
base) y `dress.json` (vestir una hoja). Las hojas vestidas se guardan en `taller/sprite-factory/` (no se sube): con
ellas, `reconstruir` rehace los fotogramas sin gastar.

## Lo aprendido (no repetir)

- **Cuadrícula de 2×2 con cada pose descrita**, no «un ciclo de 9 fotogramas». En las de 3×3 la IA repite la misma
  pose seis veces y cada figura sale con menos detalle.
- **Caminar sale con imágenes** si se describe paso a paso (contacto, paso, contacto, paso). No hizo falta vídeo.
- **La capa del héroe no se cambia** al vestir. Pedir otra capa hacía que unos fotogramas conservaran la azul de la
  base y otros no. La capa azul es la seña del héroe; la armadura es lo que cambia.
- **Una sola imagen de referencia al vestir.** Pasar una segunda como muestra de la ropa contagiaba poses y colores.
- **El arma, a la vista en todos los fotogramas.** Una animación con el brazo del arma escondido salió de frente y sin
  palo. «Lanzar habilidad» canaliza por el arma: se alza y se apunta al frente.
- A veces la IA dibuja **las rayas de la cuadrícula**: se borran solas antes de cortar.
- Al borrar el palo pueden quedar **motas sueltas**; se quita todo lo que no esté unido al cuerpo.
- El metal se reconoce por ser **gris** (poca saturación). Una armadura de cuero o de escamas rojas no se puede teñir
  así: hay que vestirla.

## Añadir una animación

1. En `config.json` → `anims`: su cuadrícula, cómo se alinea (`torso` para ciclos, `masa` para acciones), el fotograma
   en el que el héroe está de pie y el prompt de la acción (con `{marker}` donde va el palo).
2. `npm run sprite-factory -- base <anim> --generar`, mirar el GIF y, si vale, `--adoptar`.
3. Vestir esa animación en cada armadura: `armadura <id> "…" --solo <anim>`.
