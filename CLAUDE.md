# Easy Hero — guía para trabajar en este repo

## Dirección visual: fantasía oscura de mazmorra

<always_use_dungeon_fantasy_theme>
Easy Hero usa siempre esta dirección estética. No volver al azul-índigo/Inter por defecto.
- **Paleta**: piedra y forja. Fondos casi negros y cálidos (`--bg-main #15100c`, nunca azulados),
  ámbar de forja como acento principal (`--primary #d9662c`), oro de leyenda para lo especial
  (`--gold #f0b03c`). Toda la paleta vive en `:root` de `style.css`: cambiar ahí, nunca poner un
  hex suelto en un componente salvo que sea un color funcional (rareza de objeto, tipo de nodo).
- **Tipografía**: `Cinzel` (grabado en piedra) SOLO para títulos y momentos de impacto — nombre
  del juego, nombres de combatientes, títulos de evento/fin/combate. `Work Sans` para todo lo
  demás (cuerpo, botones, listas): a tamaños pequeños Cinzel no se lee bien. Los números de
  estadísticas (ATK/HP/semilla) van en monoespaciada, como un cómputo.
- **Motivo**: piedra, antorcha, pergamino, forja. Nunca gradientes SaaS genéricos, glassmorphism
  ni tarjetas redondeadas idénticas con la misma sombra gris — cada superficie usa el `--accent`
  de su propio contexto (rareza, tipo de daño, resultado).
- **Movimiento**: un momento orquestado por transición, no efectos sueltos en cada tarjeta. Las
  vistas (`.rpg-view`) entran deslizando una vez; nada de fade-in escalonado por elemento.
- **Antes de añadir una pantalla nueva**: usa el skill `frontend-design` (ya instalado, scope de
  proyecto) para revisar la propuesta contra esta dirección antes de escribir CSS.
</always_use_dungeon_fantasy_theme>

## Arquitectura del proyecto (resumen; no repetir aquí lo que ya cuentan los docs)

- Motor puro sin DOM en `src/engine.js`, `src/items.js`, `src/events.js`, `src/meta.js`; todo el
  azar se recibe por parámetro (`rng`). La capa de presentación vive solo en `src/ui.js`.
- Contenido como datos en `src/data/`. Nunca vanilla JS con dependencias de build: sin bundler,
  sin framework, sin npm en producción (solo Playwright como dev-dependency de test).
- `planning.md` es **solo lo pendiente**; lo ya decidido o implementado va a `historial.md` (log
  compacto). Actualiza el que corresponda al terminar un cambio de alcance.
- Antes de comitear: `npm test` (motor, eventos, equipo, guardado, equilibrio y navegador).
