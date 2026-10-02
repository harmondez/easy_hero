# 🎭 Novela visual rápida: meter un NPC con su retrato y su diálogo

Los diálogos de la aventura se ven como una novela visual: quien habla sale de cuerpo entero sobre el cuadro de texto
(a la izquierda; tu héroe, a la derecha), quien escucha queda en penumbra y el nombre va en una etiqueta de su lado.
Todo es contenido como datos; no hace falta tocar código.

| Pieza | Dónde |
|---|---|
| Lo que dice cada uno | `src/data/zones/zafias.js` → `ZAFIAS_DIALOGUES` (líneas `{ who, text }`; `{heroe}` = el nombre del jugador) |
| Quién lleva qué retrato | `src/data/characters.js` → `PORTRAITS` (la clave es el `who`, tal cual) |
| Los retratos | `img/portraits/<id>.webp` (del PNG `img/characters/<id>-profile.png`, que no se sube) |
| Dónde está el NPC en el mapa | una parada `kind: 'npc'` de su escena en `src/data/zones/zafias.js` |

## Receta (5 minutos)

1. **El retrato.** O lo dibujas (PNG con fondo transparente, de la cabeza a medio muslo, de frente) y lo dejas en
   `img/characters/<id>-profile.png`, o lo pides a la fábrica (≈0,034 $):
   ```bash
   npm run generate -- portrait "village healer" --game-id curandera --details "old woman, herb pouches, green shawl" --dry-run
   npm run generate -- portrait "village healer" --game-id curandera --details "old woman, herb pouches, green shawl"
   ```
   Como siempre, **sin nombres propios en el prompt**: el nombre solo va en `--game-id`. La fábrica lo recorta, lo
   deja en `img/characters/curandera-profile.png` y en `img/portraits/curandera.webp`, y lo registra.
2. **El diálogo y su dueño.**
   ```bash
   npm run vn -- nuevo curandera --quien "Ulma, la curandera" --retrato curandera
   ```
   Crea el diálogo `curandera` con dos líneas de plantilla y le asigna el retrato. Escribe las líneas (estilo: gente
   de pueblo, frases llanas; nada de frases de poema).
3. **La parada.** La orden anterior te da la línea para pegar en su escena; las coordenadas, con
   `node tools/zone-overlay.mjs` (receta en [docs/zonas.md](zonas.md)).
4. **Mirarlo sin jugar hasta allí.**
   ```bash
   npm run vn -- ver curandera     # una captura por línea en taller/vn/curandera/
   ```
   O en el navegador: `index.html?vn=curandera` (abre ese diálogo al momento; no da recompensas ni pone marcas).
5. **Revisar.** `npm run vn` comprueba que cada parada tiene su diálogo, que cada retrato existe y tiene dueño, que
   no quedan marcadores raros ni textos de plantilla y avisa de las líneas demasiado largas. Va también en `npm test`.

## Detalles

- **Varios que comparten cara** (los goblins esbirros): el mismo id en `PORTRAITS` para cada `who`.
- **Los grandes** (Grask): `{ id, scale: 1.25 }` en `PORTRAITS`. Sale más grande y bajado tras el cuadro, para que se
  te eche encima sin cortarle la cabeza.
- **Narración** (lo que pasa, no lo que se dice): se firma con el lugar (`who: 'La fragua'`) y no lleva retrato;
  mientras se lee, los dos personajes quedan en penumbra.
- `npm run vn -- lista` enseña quién habla, cuántas líneas tiene y qué retrato lleva.
