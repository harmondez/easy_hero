# 🏭 Asset Factory de Easy Hero

Genera arte del juego con la API de Google Gemini manteniendo un mismo estilo, y lo deja listo para usar.

```
Concepto → prompt (STYLE_BIBLE + reglas del tipo) → generación → validación → postproceso → asset del juego → registro
```

## Puesta en marcha
1. Copia `.env.example` a `.env` y pon tu clave: `GOOGLE_API_KEY=…` (`.env` no se sube nunca).
2. `npm install` (instala `@google/genai` y `sharp`).

## Uso
```bash
npm run generate -- enemy orco --dry-run        # enseña prompt, referencias, rutas y coste; NO gasta
npm run generate -- enemy orco                  # genera UNA imagen (≈0,034 $ con el modelo por defecto)
npm run generate -- boss grask --details "goblin chieftain with a bone crown"
npm run generate -- enemy goblin --variant plaga --details "green toxic boils"
npm run generate -- background templo_volcanico
npm run generate -- map volcanic_world          # mapa maestro + regiones recortadas + manifest.json
npm run generate -- map mi_isla --regions "playa:S:sandy beach,pico:N:snowy peak"
npm run generate -- fix enemy orco --flip       # arreglar sin pagar: voltear y volver a entregar al juego
npm run generate -- list                        # lo generado hasta ahora
```
Tipos: `character`, `enemy`, `npc`, `boss`, `prop`, `obstacle`, `structure`, `ambient`, `terrain`, `background`, `map`.
Opciones: `--dry-run`, `--force` (rehacer; lo anterior se aparta con fecha), `--variant`, `--details`, `--regions`,
`--model`, `--no-game`, `--game-id`.

**El juego busca cada imagen por un id**: en el descenso, el nombre base del monstruo en español («Orco» →
`enemigo_orco`); en la aventura, el campo `sprite` de la parada en `src/data/zones/*.js` (Grask → `sprite: 'grask'`).
Si el nombre del asset no coincide, entrégalo con `--game-id`: `npm run generate -- boss grask --game-id grask`.

**Los nombres propios NO van al prompt.** El nombre (y `--details`) dicen QUÉ es y cómo es: especie, tamaño,
armadura, cicatrices… El nombre propio del jefe solo va en `--game-id`. El modelo no sabe quién es «Grask».

**Las criaturas con nombre** (`src/data/creatures.js`) buscan su dibujo por su nombre:
«Gnoll Berserker» → `enemigo_gnoll-berserker`, así que `--game-id` es ese nombre en minúsculas y con guiones.

**Ejemplo completo (goblin jefe para Grask):**
```bash
npm run generate -- boss "goblin chieftain" --game-id grask --details "a huge goblin, bone crown, jagged cleaver, red war cloak"
```
Genera, quita el fondo, valida, crea `img/sprites/enemigo_grask.webp`, lo registra en `src/data/art.js` y Grask
lo usa al momento en el mapa del campamento y en su combate (más grande por ser sub-jefe).

## Dónde va cada cosa
| Qué | Dónde |
|---|---|
| Crudo (fondo blanco), final PNG transparente y metadatos (`.meta.json`: prompt, modelo, config, huella, validación) | `taller/<categoría>/<id>/` (no se sube) |
| Registro de todo lo generado | `taller/manifest.json` |
| Log | `taller/logs/factory.log` |
| Mapas: `<mapa>_full.png` (maestro, nunca se borra), `regions/*.png` (recortes literales), `manifest.json` | `taller/maps/<id>/` |
| Lo que entra al juego (vía `tools/sprites.mjs`) | `img/sprites/enemigo_*.webp`, `heroe_*`, `img/bg/`, `img/zones/` y `src/data/art.js` |

## Piezas
| Archivo | Papel |
|---|---|
| `config/factory.json` | Modelo, formato, tamaños por tipo, reintentos, tope de gasto, rutas, quitar fondo |
| `config/style-bible.json` | **STYLE_BIBLE**: estilo por familia (sprites, fondos, mapas), luz, perspectiva, proporciones, reglas y referencias |
| `prompts/*.json` | Plantilla y reglas obligatorias de cada tipo (p. ej. ENEMY IMAGE RULES), temas de mapa (`map-themes.json`) |
| `src/provider.mjs` | Gemini (SDK oficial), reintentos con espera exponencial, errores claros, salida a PNG |
| `src/prompt-builder.mjs` | Junta plantilla + STYLE_BIBLE + reglas |
| `src/remove-bg.mjs` | Quitar el fondo blanco en local: relleno desde los bordes, huecos interiores y bordes sin halo |
| `src/validate.mjs` | Imagen válida; sprite: alfa real, sin restos blancos, nada cortado |
| `src/map-cutter.mjs` | Recortes literales del mapa maestro + verificación píxel a píxel |
| `src/factory.mjs` | Orquesta todo: `AssetGenerator`, `BackgroundGenerator`, `MapGenerator` |

## Lo aprendido (no repetir)
- `gemini-2.5-flash-image` se apaga el 2026-10-02. Por defecto: `gemini-3.1-flash-lite-image` (0,034 $).
- Ese modelo **solo devuelve JPEG**: se pide JPEG y se convierte a PNG en local.
- El modelo **copia la orientación de las referencias**: a los enemigos solo se les pasa el goblin (mira a la
  izquierda); a los héroes, el héroe (mira a la derecha). Si aun así sale al revés: `fix … --flip`.
- La API no admite semilla: la reproducibilidad se basa en guardar prompt, modelo y configuración (huella).
- Fondo blanco, no negro: el estilo lleva contornos casi negros y un fondo negro se los comería.
