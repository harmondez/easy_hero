# Prompt del director: hoja de 3×4 (caminar, correr y atacar en una sola imagen)

Guardado como referencia. El Sprite Factory usa hojas de 2×2 por animación (ver README: «Lo aprendido»), pero de este
prompt se tomó el tono: tratar al personaje como un «rig» fijo, repetir qué debe conservarse y poner la consistencia por
delante del detalle. Una hoja hecha con él se puede meter con `importar … --cuadricula 3x4 --usar …`.

```text
Using the attached character image as an ABSOLUTE visual reference, create a professional 3 columns × 4 rows sprite
sheet containing exactly 12 sequential animation frames of the exact same character.

DO NOT redesign the character between frames.

Preserve exactly: same body proportions and height, same hairstyle and face, same armour and its decorations, same
cape, same gauntlets, leg armour and boots, same colours and materials, same modern detailed pixel-art style, same
pixel density.

The character must remain side-facing toward the RIGHT in all 12 frames.

ROW 1: WALK — left leg forward · neutral passing position · right leg forward
ROW 2: RUN — first stride · passing / airborne transition · opposite stride
ROW 3: ATTACK, FIRST HALF — combat stance · wind-up · beginning the forward slash
ROW 4: ATTACK, SECOND HALF — main strike / impact · follow-through · recovery

Every frame must: contain exactly the same character, preserve the armour design exactly, preserve the same scale, use
the same camera angle, use consistent lighting, maintain a consistent ground baseline, remain centred within its cell.

Modern high-quality HD fantasy pixel art, crisp pixels, strong readable silhouettes. Exactly 3 columns and 4 rows.
Exactly 12 sprites. Equal-sized cells. Generous spacing between sprites. Plain pure white background. No text. No
labels. No numbers. No scenery. No additional characters.

Treat the reference character as a FIXED GAME CHARACTER RIG. Animate the existing design instead of recreating the
character independently for each frame. Character consistency, exact equipment preservation, frame alignment and
animation continuity are more important than adding new visual detail.
```
