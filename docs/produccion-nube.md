# 🏭 Producción con sesiones en la nube (octubre 2026)

Plan para gastar bien el crédito de **100 $ de sesiones en la nube de Claude Code** (caduca el **4 de
noviembre de 2026**). Decidido con el dueño del juego el 2026-10-01.

## Papeles

| Papel | Quién | Qué hace |
|---|---|---|
| 🎨 Director | El dueño del juego | Arte, historia, prueba jugando las vistas previas |
| 🧭 Arquitecto e integrador | Claude en local (no gasta el crédito) | Diseña, escribe los encargos (issues), revisa cada PR, fusiona y publica |
| 🔨 Obreros | Sesiones en la nube (gastan el crédito) | Un encargo cada una: rama propia → pull request |

## El circuito de cada encargo

1. **Issue** en GitHub con la plantilla de encargo (contexto, qué hacer, qué NO tocar, terminado cuando…, pruebas).
2. **Sesión en la nube** sobre ese issue → trabaja en su rama → abre un PR que cierra el issue.
3. **GitHub Actions** pasa `npm test`. Rojo = no sigue.
4. **Vista previa** del PR en Cloudflare Pages: el director la juega desde el navegador.
5. **Revisión** de Claude en local (pruebas, capturas, revisión de código).
6. **Fusión**: la hace Claude si todo está verde y la revisión es limpia. Al fusionar en `main`, se publica sola.

## Direcciones

- **Web oficial** (GitHub Pages, se publica al fusionar en `main` si las pruebas pasan): https://harmondez.github.io/easy_hero/
- **Vista previa de cada rama/PR** (Cloudflare): `https://<rama-con-guiones>-easy-hero.hernan96.workers.dev`
  (p. ej. la rama `nube/12-editor` → `nube-12-editor-easy-hero…`). Cloudflare la deja comentada en el propio PR.
- **Copia en Cloudflare de `main`**: https://easy-hero.hernan96.workers.dev

Circuito probado de punta a punta con el PR #1 (2026-10-01): pruebas en verde, vista previa jugable, fusión.

## Reglas decididas

- **Modelo mixto**: Sonnet para encargos bien cerrados; Opus para los de diseño o delicados.
- **2 sesiones a la vez**, con encargos que no toquen los mismos archivos.
- **Primero herramientas, luego contenido**: si el crédito se queda corto, se recorta contenido, no herramientas.
- **Tablero**: GitHub Issues (etiquetas `nube`, `oleada-N`, `sonnet`/`opus`).
- **Arte**: el director deja PNG por tandas en `img/entrantes/` con nombres claros (`enemigo_lobo.png`,
  `fondo_cueva.png`, `heroe_*.png`, `escena_*.png`). El taller de sprites los procesa. Esa carpeta no se sube.
- **Taller de sprites** (`npm run sprites`): procesa lo que haya en `img/entrantes/`.
  1. Deja los PNG (con fondo transparente) en `img/entrantes/` con estos nombres, `<id>` en minúsculas, sin tildes y con guiones:
     `enemigo_<id>.png` (mira a la izquierda), `heroe_<id>.png` (a la derecha), `fondo_<id>.png` (fondo de combate de lado),
     `escena_<id>.png` (mapa de una zona).
  2. `npm run sprites`. Enemigos y héroes: se recortan al contorno (2 px de aire; los pies tocan el borde inferior), bajan a
     256 px de alto como máximo (nunca se amplían) y salen en WebP en `img/sprites/`. Fondos → `img/bg/`, escenas → `img/zones/`,
     sin recortar. Lo que no cumple el nombre se avisa y se salta.
  3. Todo queda registrado en `src/data/art.js` (no se edita a mano). Se sube lo procesado y el manifiesto, nunca los PNG originales.
  4. El `<id>` de un enemigo es el **nombre base** del monstruo sin tildes y con guiones: «Goblin» → `enemigo_goblin.png`,
     «Rata Gigante» → `enemigo_rata-gigante.png`. En el combate se usa sin tinte y con su proporción real; los monstruos sin imagen
     siguen con el goblin teñido. El héroe usa la primera `heroe_*` (por orden alfabético) si hay alguna.
- **Calibración (2026-10-01)**: los dos primeros encargos (#2 perfilados y #3 taller de sprites, Sonnet, esfuerzo
  alto, a la vez) costaron **3 $ entre los dos** (~1,5 $ cada uno; quedan 97 $). El crédito da para muchos más
  encargos de los previstos: se puede subir el ritmo y usar Opus donde aporte.

## Fase 0 · Preparar el terreno (en local, sin crédito)

- [x] GitHub Actions: `npm test` en cada PR y en `main`; publicar la web con Actions solo si pasa (`.github/workflows/ci.yml`; Pages ya publica por Actions).
- [x] Entorno de la nube: hook SessionStart → `scripts/cloud-setup.sh` (`npm ci` + Chromium si la red deja; si no, `npm run test:core`).
- [x] CLAUDE.md: reglas para trabajar solo (rama, nunca publicar, pruebas antes del PR, historial, dudas al PR).
- [x] Plantilla de encargo (`.github/ISSUE_TEMPLATE/encargo.md`), plantilla de PR y etiquetas (`nube`, `oleada-1..4`, `sonnet`, `opus`, `calibración`).
- [x] Partir `main.js`: la aventura vive en `src/adventure.js`.
- [x] Vistas previas por PR en Cloudflare (Workers con archivos estáticos: `wrangler.jsonc` + `npm run build:site`; conectado el 2026-10-01).
- [ ] Claude en la nube: conectar GitHub en claude.ai/code y revisar la red del entorno (ver abajo).

**Detalle pendiente (no bloquea):** GitHub avisa de que `upload-artifact`, `configure-pages` y `deploy-pages` aún usan
Node 20 (las fuerza a Node 24 y funcionan); subirlas de versión cuando saquen la nueva.

## Oleadas

| Oleada | Cuándo | Encargos (2 en paralelo, sin solaparse) |
|---|---|---|
| **1 · Herramientas** | 1ª semana | Editor de zonas `?editor` · Misiones como datos · Taller de sprites + registro de imágenes · Tanda de Perfilados |
| **2 · Contenido de Zafias** | 2ª–3ª | Misión 2 (santuario) · Misión 3 (Bram y el hierro de las cuevas) · Arco del castillo · Fondos por zona |
| **3 · Profundidad DragonFable** | 3ª–4ª | Debilidades elementales · Jefes con furia y rotaciones · Equipo compartido aventura/descenso · Forja de Bram |
| **4 · Pulido y publicación** | última | Equilibrio, móvil, README; versión grande |

**Reparto orientativo del crédito:** ~10 % fase 0 en la nube · ~35 % oleada 1 · ~40 % contenido · ~15 % profundidad y pulido.
Se ajusta tras la calibración.
