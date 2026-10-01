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

## Reglas decididas

- **Modelo mixto**: Sonnet para encargos bien cerrados; Opus para los de diseño o delicados.
- **2 sesiones a la vez**, con encargos que no toquen los mismos archivos.
- **Primero herramientas, luego contenido**: si el crédito se queda corto, se recorta contenido, no herramientas.
- **Tablero**: GitHub Issues (etiquetas `nube`, `oleada-N`, `sonnet`/`opus`).
- **Arte**: el director deja PNG por tandas en `img/entrantes/` con nombres claros (`enemigo_lobo.png`,
  `fondo_cueva.png`, `heroe_*.png`, `escena_*.png`). El taller de sprites los procesa. Esa carpeta no se sube.
- **Calibración**: el primer encargo sirve para medir cuánto cuesta uno típico (saldo antes y después);
  con eso se reparte el resto.

## Fase 0 · Preparar el terreno (en local, sin crédito)

- [ ] GitHub Actions: `npm test` en cada PR y en `main`; publicar la web con Actions solo si pasa.
- [ ] Entorno de la nube: script de arranque (Node, `npm ci`, Chromium de Playwright).
- [ ] CLAUDE.md: reglas para trabajar solo (rama, nunca publicar, pruebas antes del PR, historial, dudas al PR).
- [ ] Plantilla de encargo (issue template) y etiquetas.
- [ ] Partir `main.js`: la aventura a su propio módulo, para que dos sesiones no se pisen.
- [ ] Vistas previas por PR en Cloudflare Pages (cuenta del director, ya existe).

## Oleadas

| Oleada | Cuándo | Encargos (2 en paralelo, sin solaparse) |
|---|---|---|
| **1 · Herramientas** | 1ª semana | Editor de zonas `?editor` · Misiones como datos · Taller de sprites + registro de imágenes · Tanda de Perfilados |
| **2 · Contenido de Zafias** | 2ª–3ª | Misión 2 (santuario) · Misión 3 (Bram y el hierro de las cuevas) · Arco del castillo · Fondos por zona |
| **3 · Profundidad DragonFable** | 3ª–4ª | Debilidades elementales · Jefes con furia y rotaciones · Equipo compartido aventura/descenso · Forja de Bram |
| **4 · Pulido y publicación** | última | Equilibrio, móvil, README; versión grande |

**Reparto orientativo del crédito:** ~10 % fase 0 en la nube · ~35 % oleada 1 · ~40 % contenido · ~15 % profundidad y pulido.
Se ajusta tras la calibración.
