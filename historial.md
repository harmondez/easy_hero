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
  > ⚠️ **Revisado el 2026-09-22**: tanto «meta-progresión vertical» como «mochila de objetos» se reabrieron a
  > propósito (decisión explícita del usuario, no un descuido). Mochila → ver la entrada de inventario más abajo.
  > Meta-progresión vertical → ver «Estadísticas primarias y nivel permanente» más abajo.

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

## 2026-09-22 · Personaje, inventario, oro y trofeo del jefe (v1.2.0)
Escalada de alcance dentro de la misma sesión de decorado: el usuario pidió, con una imagen de referencia (un
equipo tipo ARPG con muñeco de personaje y ranuras conectadas), que el héroe tenga un **inventario** (10
ranuras) y **oro** que se acumula al matar monstruos. Reabre a propósito la decisión cerrada «sin mochila» —
señalado al usuario antes de construirlo, no en silencio.

- **Decisiones tomadas con el usuario** (ronda de preguntas antes de tocar código): la pantalla de Personaje es
  una **vista propia** (no un panel superpuesto como Bestiario/Colección), con botón junto a «NUEVA RUTA»; si
  el inventario está lleno, **equipar siempre es posible** (lo que sale se descarta y cura en vez de bloquear),
  solo se bloquea «guardar»; el inventario se reinicia cada ruta, salvo el **trofeo del jefe final**, que
  permanece para siempre.
- **Modelo del trofeo** (decisión propia, explicada al usuario): vive en `meta.trophyItem`, fuera de las 10
  ranuras normales. Cada ruta nueva recibe una **copia** del trofeo en `hero.trophy`; equiparlo no lo consume
  (siempre disponible, como una habilidad desbloqueada, no un objeto físico escaso). Si vuelves a vencer al
  jefe con un trofeo ya guardado, eliges quedarte con el nuevo o conservar el antiguo (mismo componente de
  botín que cofres/hogueras, con `source: 'boss'`).
- **Cambio de flujo de botín:** equipar ya no hace desaparecer lo que llevabas puesto — pasa al inventario si
  hay hueco (y solo se descarta, con cura, si no lo hay). Nueva opción «GUARDAR EN EL INVENTARIO» junto a
  Equipar/Descartar.
- **Oro de relleno** (sin tienda todavía, no afecta al equilibrio): monstruo 2, sub-jefe 6, jefe 18. Vive en
  `meta.gold`, nunca baja de 0, sobrevive a la muerte.
- **Bug encontrado y corregido al construirlo:** `saveMeta(null, …)` devolvía `true` aunque no hubiera
  `storage` (nada se guardaba pero la función no lo decía). El mismo patrón que `save.js` ya evitaba con un
  `if (!storage) return false` explícito; `meta.js` no lo tenía.
- **Verificación:** `tests/meta-sim.mjs` nuevo (38 comprobaciones: guardado/carga, bestiario, colección, oro,
  trofeo, los 15 logros con sus casos límite). 26 comprobaciones nuevas en `tests/items-sim.mjs` (inventario:
  llenar las 10 ranuras, equipar desde el inventario, sin hueco no bloquea, ranuras vacías incluida el arma,
  viaja en el guardado). 19 nuevas en `tests/browser.test.mjs` (pantalla de Personaje, guardar/equipar desde el
  inventario, el trofeo persiste a través de una recarga y de una ruta nueva). **625 comprobaciones en total**,
  todas en verde. Capturas revisadas a mano.
- Publicado como **1.2.0** (entrega, no patch: mismo criterio que el decorado).

## 2026-09-22 · Estadísticas primarias y nivel permanente — sin publicar
El usuario propuso, de golpe, un sistema de estadísticas de ARPG completo: 4 primarias (STR/DEX/INT/VIT) + ~28
secundarias (daño físico/elemental, resistencias, crítico, esquiva, velocidad de ataque, daño por sangrado/
veneno/quemadura, daño contra 8 tipos de criatura, probabilidades de aturdir/quemar/envenenar, vida/maná y su
regeneración, oro y experiencia totales). Se le explicó la tensión con el pilar del proyecto («solo ATK y HP,
minimalista») y se pidió que hiciera **preguntas antes de planificar** — dos rondas de preguntas (8 en total)
resolvieron la arquitectura antes de tocar código.

**Decisiones (con el usuario), en orden de impacto:**
1. **Las primarias GENERAN ATK/HP, no los sustituyen.** Con las 4 en su base (5/5/5/5, sin invertir nada), todas
   las fórmulas dan 0 de bono: el héroe se comporta exactamente igual que antes de que este sistema existiera.
   Así el resto del motor, los 122 objetos, los 24 monstruos y el banco de equilibrio siguieron funcionando sin
   tocarlos — las 625 comprobaciones de antes de este cambio pasan **sin modificar ni una**, salvo la lista
   exacta de campos del héroe (que crece con los nuevos).
2. **El crecimiento viene de un nivel con experiencia, y es PERMANENTE.** El usuario confirmó esto explícitamente
   sabiendo que **reabre la regla «meta-progresión solo horizontal, nunca poder fijo»** fijada al principio del
   proyecto (se le avisó de la tensión antes de construirlo). Ganas XP al vencer combates (solo eso, como el
   oro), subes de nivel y repartes **tú mismo** los puntos entre las 4 primarias desde la pantalla de Personaje.
   A diferencia del equipo y el inventario (que se reinician cada ruta), el nivel y los puntos invertidos se
   guardan en `meta.js` y te acompañan **para siempre**, en todas las partidas futuras.
3. **Físico/elemental ligados al tipo de arma**: Filo/Contundente/Perforante los potencia STR; Veneno/Fuego/Rayo,
   INT. Conecta con la afinidad de clase ya planeada (P7).
4. **Fuera de esta fase, anotado para después**: velocidad de ataque/orden de turnos (ya es P9, entrega C) y daño
   contra 8 tipos de criatura (los 24 del bestiario no están etiquetados por tipo todavía). También quedan sin
   construir: sangrado como tercer DOT, probabilidades de aturdir/quemar/envenenar (hoy el veneno y la quemadura
   son garantizados al golpear, no una tirada), maná (sigue siendo de la entrega C) y daño/resistencia elemental
   aplicados de verdad (los monstruos no tienen tipo de daño propio todavía, así que la resistencia elemental se
   calcula y se ve, pero no hace nada en combate hasta que lo tengan).

**Fórmulas de la fase 1** (`src/stats.js`, todas 0 en la base 5/5/5/5):
- `maxHp += (VIT−5) × 4` (siempre) · `ATK += ⌊(STR−5)/10⌋` (solo con arma física) · `daño elemental += ⌊(INT−5)/10⌋`
  (solo con arma elemental) · `crítico = (DEX−5) × 0,4 %` (×1,5 de daño) · `esquiva = (DEX−5) × 0,3 %` ·
  `resist. física = (VIT−5) × 0,4 %` · `resist. elemental = (INT−5) × 0,4 %` (sin efecto todavía, ver arriba).
- Nivel: XP por victoria `{monstruo 5, sub-jefe 15, jefe 50}` · siguiente nivel = `40 + nivel × 20` · 2 puntos por
  nivel. Todo de relleno, sin calibrar contra el banco de equilibrio (como el oro): se recalibrará cuando el
  sistema esté completo.
- **Riesgo técnico real y cómo se evitó**: crítico y esquiva tiran un dado (`combat.rng()`) en pleno combate; con
  DEX en la base eso podría desincronizar el generador aleatorio y romper cientos de pruebas con valores exactos.
  Se resolvió con un guardián `if (probabilidad > 0)`: en la base la probabilidad es 0 y el dado **no se llega a
  tirar**, así que el generador aleatorio consume exactamente los mismos números que antes para cualquier héroe
  sin puntos invertidos.
- **Bug real encontrado al escribir las pruebas**: la primera vez, `hero.primary.vit` se comparó contra `1` (el
  punto invertido) en vez de `6` (base 5 + 1): eran fallos de la prueba, no del juego. Y el punto permanente
  invertido en una prueba se filtraba a las pruebas siguientes del mismo archivo (un héroe "nuevo" ya no tenía
  25 HP) — se corrigió limpiando `meta.primary` al final del bloque de pruebas, ya que la persistencia entre
  partidas es aquí comportamiento correcto del juego, no un defecto.
- **Verificación**: `tests/stats-sim.mjs` nuevo (39 comprobaciones: fórmulas, curva de nivel, reparto de puntos,
  migración de un progreso antiguo sin primarias, y el efecto real en combate — crítico, esquiva y resistencia
  forzados con un generador de números fijo). 26 nuevas en `tests/browser.test.mjs` (pantalla de nivel, repartir
  un punto, que sobreviva a recargar la página y a empezar una ruta nueva). `SAVE_VERSION` sube a 3.

---

## Supuestos confirmados antes de B1 (las 8 dudas que quedaban)
Accesorio = rasgo pasivo casi sin números · mejoras con las mismas 5 rarezas del equipo · descartar cura 3 HP
(luego ajustado a 3+1/rareza) · hoguera da 1 de 3 con mínimo Poco común · 4-6 ofertas de objeto por ruta ·
cofres solo dan objetos · legendarios máx. 1 igual, sin límite total · equipo inicial = solo espada básica.

## Riesgos ya gestionados (de la ronda A/B1)
- «5 rarezas es mucho contenido»: resuelto con base fija + pocas bases + afijos compartidos, calibrado con el banco.
- «El test del navegador tardaba 88 s»: sigue igual de acotado (ahora 113 pruebas, ~131 s); no ha hecho falta acelerarlo aún.
- «La opinión de un bot no es la de un jugador»: sigue siendo una limitación conocida; sin jugadores reales todavía (S15 pendiente).
