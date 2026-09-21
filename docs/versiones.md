# 🏷️ Sistema de versiones

El juego tiene **una versión** (`1.0.1`) que se ve en la cabecera del juego y en el README, y que queda anotada en el
[registro de cambios](../CHANGELOG.md). Está pensado para que **no se pueda olvidar actualizar nada**: hay un solo sitio donde vive
y un comando que lo cambia todo a la vez.

## 1. Cómo se numera

Usamos tres números, `MAJOR.MINOR.PATCH` (por ejemplo, `1.0.1`):

| Número | Cuándo sube | Ejemplos |
|--------|-------------|----------|
| **PATCH** (1.0.**1**) | Correcciones, ajustes y mejoras que no cambian *qué* es el juego | Equilibrio, un texto, un fallo, una mejora de la interfaz |
| **MINOR** (1.**1**.0) | Una **entrega** o contenido nuevo importante | Equipo y mejoras, Ruptura, nuevos eventos en bloque |
| **MAJOR** (**2**.0.0) | Un cambio de fondo del juego | Varios actos, un sistema nuevo que cambia cómo se juega todo |

> **Propuesta para el plan** (puedes cambiarla): la entrega A salió como `1.0.1`; las siguientes entregas grandes serían
> **B = 1.1.0**, **C = 1.2.0** y **D = 1.3.0**, y los ajustes entre medias subirían el PATCH.

## 2. Dónde vive la versión

| Sitio | Para qué |
|-------|----------|
| [`src/version.js`](../src/version.js) | **La fuente de verdad.** El juego la lee (la cabecera la muestra desde aquí) |
| `package.json` | La versión del proyecto |
| `?v=1.0.1` en `index.html` y en cada módulo | El **código de caché**: hace que el navegador descargue los archivos nuevos al publicar |
| Cabecera de `index.html` | La etiqueta de respaldo, antes de que cargue el juego |
| Insignia del README | La versión visible en GitHub |
| [`CHANGELOG.md`](../CHANGELOG.md) | Qué trae cada versión |

## 3. Cómo se publica una versión nueva

```bash
npm run release                  # ¿Está todo sincronizado? (también lo comprueba npm test)
npm run release -- patch         # 1.0.1 → 1.0.2   (o minor / major / una versión concreta como 1.4.2)
npm run release -- minor --dry-run   # solo enseña qué cambiaría
```

1. Mientras trabajas, ve anotando los cambios en **`## [Sin publicar]`** del `CHANGELOG.md`.
2. Ejecuta `npm run release -- patch` (o `minor` / `major`). El script:
   - actualiza los seis sitios de la tabla de arriba,
   - convierte lo de *Sin publicar* en la sección de la versión nueva, con la fecha de hoy,
   - **no** hace commit ni etiqueta.
3. Revisa las notas y añade el resumen a la sección **Novedades** del README.
4. `npm test` (incluye la comprobación de versiones).
5. Publica: `git add -A && git commit -m "Versión X.Y.Z"`, `git tag -a vX.Y.Z -m "Versión X.Y.Z"` y `git push --follow-tags`.

## 4. La comprobación automática

`tests/version-check.mjs` (parte de `npm test`) falla si:

- la versión de `package.json` y la de `src/version.js` no coinciden,
- algún `?v=` de caché no es la versión actual,
- la cabecera o la insignia del README dicen otra cosa,
- el `CHANGELOG.md` no tiene una sección para la versión actual, no es la más reciente, o las versiones están desordenadas o repetidas.

## 5. Dos versiones que no hay que confundir

| | Qué es | Dónde | Cuándo cambia |
|--|--------|-------|---------------|
| **Versión del juego** | La que ve el jugador (`1.0.1`) | `src/version.js` | En cada publicación |
| **Versión del guardado** | El formato de la partida guardada (`SAVE_VERSION`) | `src/save.js` | **Solo** si el formato de los datos guardados cambia de forma incompatible |

Si el formato del guardado cambia, las partidas guardadas antiguas se **descartan con un aviso** en lugar de romper el juego. Cada guardado
anota además con qué versión del juego se hizo, por si hace falta diagnosticar algo.

## 6. Etiquetas de git

Cada publicación lleva una etiqueta `vX.Y.Z` (por ejemplo, `v1.0.1`), así se puede volver a cualquier versión con `git checkout v1.0.0`.
