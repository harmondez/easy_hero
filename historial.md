# 📜 Historial

Registro compacto de lo ya decidido, investigado y hecho. Formato de log, más antiguo arriba.
**Lo que queda por hacer vive en [planning.md](planning.md)**, no aquí.

---

## 2026-09-21 · Arranque: prototipo, README y eliminación de DEF
- Semilla inicial del proyecto copiada desde `rpg-pack/` (carpeta gitignored, ya no se usa).
- Repo público `harmondez/easy_hero`, GitHub Pages habilitado, `.gitignore` completo.
- README visual con enlace directo a jugar, capturas, diagrama Mermaid.
- Eliminado el atributo **DEF** del héroe y los monstruos por completo (solo ATK/HP).
- Añadidos los **15 eventos** y el nodo 🎲; mapa ampliado a **16 pisos** con rutas más largas y densas.

## 2026-09-21 · Investigación y plan de la primera ronda
- Investigación cruzada sobre el género (propia + la del usuario) anotada en `jrpg-trend.md` y
  `Diseño de Sistemas RPG Minimalista.md`.
- Método de pruebas documentado en `test-method.md` (motor puro + azar con semilla = miles de partidas/segundo;
  el navegador solo para lo que el motor no puede demostrar).
- `planning.md` creado con 11 PRINCIPALES (P1-P11) y 20 SECUNDARIOS (S1-S20), priorizados por ROI, y repartidos en
  **4 entregas: A (jugable) → B (con build) → C (táctico) → D (largo plazo)**.
- **Decisiones de diseño cerradas** (todas las de P1-P7, resueltas antes de implementar):
  tasa de victoria objetivo **20 %** · sub-jefes opcionales (siempre hay camino sin ellos) · meta-progresión
  **solo horizontal** (nunca poder fijo) · eventos con probabilidades y pistas visibles · hoguera con 2 opciones
  (descansar o equiparte) · mejoras «elige 1 de 3» tras cada combate, mismas 5 rarezas que el equipo · jefe único
  ahora, 3 más adelante · equipo de **4 ranuras**, **5 rarezas**, base fija + afijos al azar, escalado por piso,
  sin mochila (equipar o descartar), objetos solo en cofre/hoguera/sub-jefe, legendarios máx. 1 igual, equipo
  inicial = solo espada básica.
- Fuera de la ronda, a propósito: cuadrícula 3×3, grupo de aliados, cartas/mazo, Boost Points, meta-progresión
  vertical, mochila de objetos, calendario tipo Persona, MP como recurso (se retoma en la entrega C).

## 2026-09-21 · Entrega A (v1.0.0 → v1.0.1) — «Jugable»
**P1** intenciones visibles del enemigo · **P2** hoguera (30 % o afilar +1 ATK, provisional) · **P3** curva y banco
de equilibrio (`npm run balance`, 3 bots) · **P4** guardado automático, semilla con código, pantalla final con «casi».

- Resultado del banco (1000 partidas/bot): sensato **18,8 %** (objetivo ~20 %), experto 53,8 %, torpe 12,5 %.
- Diferencias vs. plan: bot torpe más generoso de lo previsto (12,5 % en vez de ~3 %); coste por combate 6-17 %
  (no 10-15 %); «misma semilla = mismo botín» se quedó en «mismo mapa siempre, mismos eventos si repites
  decisiones»; sub-jefe recalibrado a ×1,3 HP/+1 ATK y jefe a ×1,5/+2 (en vez de ×2,5/+2 y ×3,5/+5).
- Pendiente detectado y no resuelto en A: pico de dificultad en el piso 14 (Jabalí Colosal, antes de la última
  hoguera).
- Publicado como **1.0.0** y, tras un ajuste de README y sistema de versiones, **1.0.1**. Sistema de versiones
  (`tools/version.mjs`, `npm run release`) creado en este punto.

## 2026-09-22 · Entrega B1 (v1.0.2) — «Equipo»
**P5** equipo de 4 ranuras y 5 rarezas.

- El contenido (122 bases, 24 afijos, 5 rarezas) lo fabricó un taller aparte, **`item-world/`** (otro asistente,
  con su propio README y canal de solicitudes al PM), y se integró copiándolo a `src/data/` y escribiendo la
  fabricación/equipar/descartar/botín en `src/items.js` nuevo. Las 24 reglas quedaron todas conectadas al motor de
  combate (`src/engine.js`): golpe furtivo, extra, gracia, frenesí, venganza, espinas, guardia de escudo, curas
  variadas, robavida, última defensa, determinación, huir sin daño, resistir al Lector, veneno y quemadura (dos
  **estados** nuevos del enemigo), mejoras al Golpe de Fuego.
- Cofres, hoguera (≥ 🟢) y sub-jefes (≥ 🔵) dan botín real («1 de 3»); descartar cura (3 + 1 por escalón de
  rareza). Guardado con equipo y botín pendiente (`SAVE_VERSION 2`: las partidas de la 1.0.1 se descartan con
  aviso).
- Bug real encontrado y corregido en `tools/version.mjs`: cuando un archivo recibía dos ediciones en la misma
  publicación (caso de `index.html`), la segunda pisaba a la primera y dejaba el código de caché desincronizado.
  Se corrigió encadenando las ediciones sobre el mismo texto en memoria.
- Diferencias vs. plan, decididas al implementar:
  - **Se quitó ya el crecimiento automático por victoria** (el plan decía «hasta la entrega B»): con crecimiento
    y equipo a la vez el sensato ganaba el 85 %.
  - **El piso 1 es siempre un cofre** (antes era un monstruo cualquiera): sin objeto temprano, el 15 % del
    sensato moría en el piso 5.
  - No hay gancho `onSkill` literal: `skill_dmg`/`skill_cd` van directos a `skillMods`; `skill_burn`/`pyre`/
    `first_turn_focus` se leen al usar la habilidad. Mismo efecto, sin el nombre del gancho.
  - Los multiplicadores, interruptores y duraciones de las reglas (golpe furtivo, frenesí, veneno, Lector,
    robavida…) **no escalan con el piso**; solo lo que suma HP/ATK/daño.
- Monstruos recalibrados (`atkPerFloor` 0,28→0,4, `hpPerFloor` 3→3,6) para que el equipo se note sin romper la
  curva. Resultado final (1000 partidas/bot): sensato **22,3 %**, experto 37,8 %, torpe 0,7 %.
- 532 comprobaciones automáticas (122 nuevas en `tests/items-sim.mjs`); las del navegador (113) se adaptaron para
  el botín (`takeLoot()`, equipo limpio en las pruebas de intención). Publicado como **1.0.2**.
- Pendiente sin bloquear, movido al backlog de `planning.md`: capturas de pantalla del botín/panel de equipo;
  script de viabilidad de las 6 armas y cada afijo; el experto casi no dobla ya al sensato (revisar en B2).

---

## 2026-09-22 · Decorado, cabecera con menú, bestiario/colección/logros/opciones (v1.1.0)
Pausa deliberada del contenido para atender **decorado, onboarding y la página** (decisión del usuario: «hemos
llegado a un punto dulce en cuanto a contenido»). Publicado como **1.1.0** (entrega, no patch: el usuario
confirmó que bestiario/colección/logros/importar-exportar son sistemas nuevos de verdad).

- **Herramientas de diseño:** clonado `Claude-Code-Frontend-Design-Toolkit` (catálogo de referencia, no se
  integra en el repo) e instalado el skill oficial `frontend-design` de Anthropic, con scope de proyecto
  (`.claude/settings.json`). La mayoría del catálogo no aplica (asume React/Tailwind/Figma); solo se
  aprovecharon principios (dirección estética deliberada, un único momento de movimiento orquestado, paleta
  derivada de pocos acentos) y la propia disciplina del skill, que señala el azul-índigo + Inter + tarjetas
  redondeadas con sombra gris como el «olor a IA» que el juego tenía hasta ahora.
- **Dirección elegida (con el usuario):** fantasía oscura de mazmorra — piedra y forja, nunca azulado. Fijada en
  `CLAUDE.md` para que no se pierda en próximas sesiones. Paleta nueva en `:root` de `style.css` (ámbar de forja
  `--primary`, oro de leyenda `--gold`, fondos casi negros y cálidos); tipografía **Cinzel** (títulos y momentos
  de impacto) + **Work Sans** (cuerpo), sustituyendo a Inter. Cascada automática: todas las vistas (mapa,
  combate, eventos, botín, fin) heredan la paleta sin tocarlas una a una.
- **Pantalla de inicio y onboarding:** hero card con vista previa de qué esperar (4 iconos), copia reescrita en
  segunda persona y con el escenario en mente, botón «Entrar en la mazmorra». Transición entre vistas mejorada
  (desliza en vez de aparecer en seco), sin tocar la lógica de `toggleRpgView` (solo CSS, cero riesgo para los
  tests existentes).
- **Escalada de alcance a mitad de sesión:** el usuario pidió, además, 4 secciones nuevas navegables desde la
  cabecera. Decisión técnica propia: **paneles superpuestos** (no vistas de pantalla completa), para poder
  consultarlas sin abandonar la ruta en curso.
  - 📖 **Bestiario** (24 entradas: 15 monstruos + 3 sub-jefes + jefe + 5 enemigos de evento) y 🎒 **Colección**
    (122 bases de objeto, con las rarezas vistas de cada una): progreso persistente nuevo, `src/meta.js`,
    independiente del guardado de la partida (`easy-hero-meta` en `localStorage`).
  - 🏆 **15 logros** (primer borrador; el plan preveía ~20), todos **horizontales** (solo información, coherente
    con la meta-progresión ya decidida: nunca dan poder). Se anuncian en la pantalla de fin de ruta.
  - ⚙️ **Opciones:** semilla de la ruta actual, **importar/exportar** el progreso (ruta + bestiario + colección +
    logros) como un texto (`EH1:` + JSON en base64, con codificación segura de acentos), y un «Sobre Easy Hero»
    que explica que el proyecto está empezando.
- **Bug encontrado y corregido al construirlo:** el botón de copiar (exportar) usaba `try/catch` alrededor de
  `navigator.clipboard.writeText`, que es una promesa — el rechazo async no lo capturaba el `catch` síncrono y
  generaba un `pageerror`. Se corrigió encadenando `.then().catch()`.
- **Verificación:** 10 comprobaciones nuevas en `tests/browser.test.mjs` (113 → 123: abrir/cerrar los 4
  paneles, que reflejen progreso real tras jugar, importar/exportar con ida y vuelta real —incluida la recarga
  de página—, rechazo de un texto inválido). Las 542 comprobaciones totales en verde. Capturas revisadas a mano
  (escritorio y móvil) antes de dar el trabajo por bueno.
- README actualizado (Novedades, «Ya se puede jugar», tabla de entregas) y publicado junto con el código.

---

## Supuestos confirmados antes de B1 (las 8 dudas que quedaban)
Accesorio = rasgo pasivo casi sin números · mejoras con las mismas 5 rarezas del equipo · descartar cura 3 HP
(luego ajustado a 3+1/rareza) · hoguera da 1 de 3 con mínimo Poco común · 4-6 ofertas de objeto por ruta ·
cofres solo dan objetos · legendarios máx. 1 igual, sin límite total · equipo inicial = solo espada básica.

## Riesgos ya gestionados (de la ronda A/B1)
- «5 rarezas es mucho contenido»: resuelto con base fija + pocas bases + afijos compartidos, calibrado con el banco.
- «El test del navegador tardaba 88 s»: sigue igual de acotado (ahora 113 pruebas, ~131 s); no ha hecho falta acelerarlo aún.
- «La opinión de un bot no es la de un jugador»: sigue siendo una limitación conocida; sin jugadores reales todavía (S15 pendiente).
