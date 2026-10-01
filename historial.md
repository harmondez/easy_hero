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

## 2026-09-22 · Mapa: se le da la vuelta y niebla de guerra
- **El mapa se dibuja al revés que antes**: el piso 0 (los primeros monstruos) ahora aparece **arriba**, y el
  jefe final abajo — antes era al contrario (`pos()` en `src/ui.js` invertía el eje Y). Solo cambió la fórmula
  de posición; el motor (`generateRpgMap`, floor 0 = inicio) no se tocó. La etiqueta «INICIO DE LA RUTA» se movió
  de debajo del mapa a encima, coherente con el nuevo sentido.
- **Niebla de guerra**: los nodos a más de 3 pisos por delante de la posición actual (`RPG_FOG_AHEAD` en
  `src/ui.js`) se cubren — icono ❓, sin revelar tipo ni nombre — y se despejan solos a medida que avanzas
  (se recalcula en cada `renderRpgMap` a partir de `currentId`). Antes del primer paso (piso −1 implícito) se ven
  los pisos 0-2; el jefe casi siempre queda en niebla («???» en vez de «JEFE FINAL») hasta estar cerca.
  Los nodos ya visitados o disponibles para pisar nunca se cubren, solo los bloqueados lejanos.
- Puramente de presentación: no toca `generateRpgMap`, `rpgAvailableNodes` ni ningún dato del motor, así que las
  671 comprobaciones existentes pasaron sin cambiar ninguna (esta parte no tiene test dedicado: se verificó a
  ojo con capturas, como el resto del aspecto visual del mapa/combate).
- De paso, a petición del usuario: el icono genérico de nodo-monstruo y el del Orco pasan de 👹 a 👾 (motor,
  datos y pantalla de inicio; el CHANGELOG y el documento histórico del prototipo v0 se dejan tal cual, son
  registro de lo ya publicado).

## 2026-09-29 · El descenso sin fin, La Forja y las variantes (la 1.4.0)

**De dónde salió.** El usuario pidió opinión sobre el juego como *juego*, no sobre el código, con una meta
explícita: que sea **adictivo** y, a ser posible, **sin final**, al estilo de los incrementales. Del análisis
salió el diagnóstico: de los tres motores de enganche del género, Easy Hero solo tenía encendido el de
**maestría** (aprender a leer al enemigo); le faltaban el de **acumulación** (Cookie Clicker) y el de
**curiosidad narrativa** (Hades). Y, sobre todo, que el juego **ya era estructuralmente un incremental sin
saberlo**: la ruta es un ciclo de prestigio (mueres, pierdes el equipo, conservas oro y nivel) al que solo le
faltaba una pieza — que la moneda permanente sirviera para algo.

Se descartó a propósito volverlo un idle de verdad (combate automático): eso mataría la intención visible, que
es el único rasgo que distingue al juego. La regla que salió de ahí: **la ruta es el juego de habilidad; la capa
de encima es el juego incremental**.

**Decisiones (16 preguntas en 4 tandas, todas del usuario):**
1. **El «sin fin» es un descenso, no un menú.** Vencer al jefe no termina la partida: se genera otro tramo de 16
   pisos y se sigue con el mismo héroe. La ruta acaba al morir, y la marca es la profundidad.
2. **Vida completa al bajar de tramo** (el usuario eligió esto en contra de la recomendación de curar solo una
   parte). Consecuencia asumida: la atrición deja de ser el límite y el muro pasa a ser puramente estadístico —
   más fácil de calibrar, pero ya no existe la decisión de «plantarse».
3. **Escalado ×1,5 acumulativo por tramo** y oro ×1,6, para que bajar compense el riesgo.
4. **La Forja entre rutas**, con mejoras mixtas: cuatro de nivel infinito con coste geométrico (el ritmo
   «ráfaga barata / ahorro largo» que sostiene el género) y cuatro de compra única (hitos memorables).
5. **Expedición automática con tope de 8 h**: el gancho de «vuelve mañana» que no existía.
6. **Cada jefe deja trofeo** y eliges quedarte con el mejor, reutilizando el flujo de la 1.2.0.
7. **Variantes de monstruo en dos tablas que se combinan** (idea del usuario): adjetivo + linaje sobre 90 nombres
   base. Frecuencia creciente con la profundidad, recompensa proporcional al peligro, y **medallas dentro de la
   ficha del bestiario** en vez de fichas nuevas (si no, el panel pasaría a miles de casillas).

> ⚠️ **Enmienda a una regla del proyecto.** Esto **entierra** la «meta-progresión solo horizontal, nunca poder
> fijo» fijada el 2026-09-21, que ya se había reabierto en la 1.3.0. Ahora el poder permanente es el motor del
> juego, no una excepción. Decisión explícita y consciente del usuario.

**Cómo se construyó sin romper nada** (el patrón que ya funcionó en la 1.3.0):
- `rpgMonsterStats(tipo, piso, tramo)` aplica el multiplicador **solo si `tramo > 0`**, así que en el tramo 0
  devuelve los mismos números de siempre y las 483 comprobaciones del motor pasaron sin tocar ni una.
- **El tramo 0 conserva el elenco original** (Slime, Goblin, Orco…) en el mismo orden: los tests que fijan qué
  monstruo sale en cada piso siguen valiendo, y el jugador veterano no pierde su mazmorra.
- Las **variantes se sortean con un hash de `(semilla, nodo, tramo)`**, nunca con `rng()` del motor. Consumir
  azar habría cambiado todos los mapas existentes y roto cientos de comprobaciones exactas.
- **Los pisos del «grupo fácil» nunca llevan variante**: un «Slime Certero de la Niebla» en el piso 1 sería una
  pésima bienvenida, y además hacía flaquear una prueba de daño exacto.

**Dos decisiones de combate que protegen la promesa del juego:**
- **La furia y la curación de las variantes se deciden al ELEGIR la intención, no al ejecutarla.** Si no, un
  monstruo enfurecido pegaría más de lo que anunciaba y se rompería «lo que ves es exactamente lo que hará».
- **Ni las púas ni el golpe póstumo matan** (dejan en 1 de vida): ganar y morir a la vez, o morir por tu propio
  ataque, se siente injusto.

**Equilibrio.** Con el descenso, vencer al primer jefe deja de ser la meta y pasa a ser la puerta del bucle, así
que el objetivo subió del 20 % al 40 %. Palancas movidas de una en una con el banco: `hpPerFloor` 3,6 → 2,9 y
`atkPerFloor` 0,4 → 0,34. Resultado (1000 partidas/bot, **sin mejoras compradas**): sensato **39 %**, experto
53 %, torpe 3 %. La dificultad real ya no está en el primer jefe sino en cuánto aguantas bajando: un jefe del
tramo 3 pega 27 por golpe.

**Verificación.** 717 comprobaciones en verde. 24 nuevas en `tests/meta-sim.mjs` (compras, coste geométrico, tope
de las únicas, expedición con reloj falso, profundidad, medallas) y 19 en `tests/browser.test.mjs` (ruta completa
hasta el jefe, pantalla de tramo, descenso real al tramo 2 con elenco nuevo, La Forja de punta a punta y las
medallas del bestiario). `SAVE_VERSION` sube a 4.

**Backlog que deja abierto**: una segunda moneda para la capa profunda, prestigio sobre La Forja, sub-jefes
propios por tramo, y ocho variantes más ya diseñadas pero no construidas (Acorazado, Menguante, de la Tormenta,
de la Escarcha, del Eco, del Enjambre…).

## 2026-09-30 · Equipo siempre visible y botín sin elegir 1 de 3

**De dónde salió.** Tres pedidos del usuario: (1) el equipo no debe ocultarse tras un botón, siempre en pantalla;
(2) al elegir botín, seguir viendo el equipo para comparar sin cambiar de vista; (3) los verdes salen demasiado
fácil, más grises y menos objetos fuertes en combates normales. Y una nota aparte: quitar el «1 de 3» y que cada
combate tenga su propia probabilidad de soltar algo.

**El hallazgo que cambió el análisis.** Antes de tocar números, se comprobó la matemática real: con la tabla de
rarezas (50/28/14/6/2 %) y «elige 1 de 3», la probabilidad de que **al menos una** de las tres sea verde o mejor
es del 87 %. El punto 3 no era un problema de pesos — era el «mejor de tres» inflando lo que se veía. Conclusión:
**quitar el «1 de 3» resuelve el punto 3 sin tocar ni un peso.**

**Decisión (del usuario, contra la recomendación).** Se ofrecieron tres opciones: mixto (goteo en combates,
elegir en cofres/sub-jefe), quitar el «1 de 3» en todas partes, o no tocarlo. El usuario eligió **quitarlo en
todas partes**: cofre, hoguera, sub-jefe y jefe pasan a dar un único objeto, igual que los combates normales.
Asumido a sabiendas de que el juego pierde su única decisión de comparar-y-elegir en el botín; el foco pasa a la
decisión de equipar/guardar/descartar sobre lo que cae.

**Cómo quedó:**
- `Items.rollLootDrop` (sustituye a `rollLootOffers`): una gota por evento de botín, con `RARITY_BIAS` por origen
  — combate muy sesgado a gris (peso ×2,2 al común, ×0,15 al legendario), sub-jefe sesgado a lo bueno, y cofre y
  hoguera con el peso base de la tabla (ya no inflado por el «mejor de 3»).
- Combates normales: 25 % de probabilidad de soltar algo (`RPG_BALANCE.loot.combatDropChance`), casi siempre gris.
- **Equipo siempre visible**: `gearPanelHtml()`/`renderGearPanel()` en `src/ui.js`, una columna fija junto al
  mapa y reutilizada en la pantalla de botín (con la ranura afectada resaltada). El botón «🧍 PERSONAJE» pasa a
  «🎒 INVENTARIO», porque el equipo ya no vive detrás de él — solo el inventario y el trofeo.

**Bug real encontrado de paso (no pedido, se corrigió porque se estaba tocando el mismo código)**: el botín se
fabricaba con `node.floor` (0-15, el piso DENTRO del tramo) en vez de la profundidad absoluta. En el tramo 3 el
piso 8 daba un objeto de poder ×1,64 mientras el monstruo de al lado escalaba a ×3,4: el equipo se quedaba
congelado mientras la mazmorra se disparaba, y el descenso se volvía imposible por una razón que no era la
prevista. Corregido con `Engine.rpgAbsoluteFloor(tier, floor)` en `_rpgLootDepth()`.

**Recalibración.** El botín más débil (una gota en vez del mejor de tres) bajó el equipo típico, así que el
sensato cayó al 25 % de victorias. Se movió `hpPerFloor` 2,9 → **2,0** (una sola palanca, medida con el banco)
para volver al objetivo ~40 %.

**Verificación**: 720 comprobaciones (los tests de `items-sim.mjs` que asumían 3 ofertas se reescribieron para
una gota, con comprobaciones nuevas de sesgo por origen). Se encontró y corrigió de paso un fallo real de CSS: en
móvil, `align-items: flex-start` en el contenedor de la columna de equipo + mapa hacía que el mapa se encogiera a
su ancho mínimo de contenido en vez de ocupar la pantalla, provocando que los nodos se solaparan.

## 2026-09-30 · Harness de pruebas de propiedades (fuzzing) — 2 bugs reales encontrados

Encargo aparte, en paralelo a lo de arriba: diseñar un harness de pruebas «de todo tipo», ejecutarlo en
escalera (barato → caro) y anotar los hallazgos en un markdown, gastando el mínimo de tokens posible (tarea
para ejecutar de forma autónoma).

**Qué se construyó**: `tools/harness/`, 6 fases independientes (`node tools/harness/run-all.mjs` las corre
todas, o cada `0N-*.mjs` suelta) que complementan `npm test` con pruebas de propiedades — miles de
combinaciones aleatorias contra invariantes generales, no valores exactos:
1. Integridad estática de los 6 archivos de datos de la 1.4.x (sin azar).
2. Fuzzing del motor puro: mapas, monstruos y combate.
3. Fuzzing de objetos y botín.
4. **Descensos multi-tramo completos** (hasta 12 tramos o la muerte) con los 3 bots — la única prueba del
   proyecto que baja de verdad varios tramos seguidos con variantes activas.
5. Fuzzing de guardar/restaurar sobre partidas a medias.
6. Casos límite de La Forja, expedición, XP y logros.

**2 bugs reales encontrados y corregidos** (detalle completo, con la traza exacta de cada uno, en
[docs/harness-hallazgos.md](docs/harness-hallazgos.md)):
1. **`tools/sim.mjs`** — el bot `experto` del simulador reventaba (`cloneCombat` no copiaba
   `combat.heroStatus`) al mirar dos rondas por delante contra cualquier monstruo con la variante «de la
   Plaga» o «de las Brasas». El motor del juego real nunca falla (no clona combates); el bug vivía en la
   herramienta de simulación, y explica por qué el banco de equilibrio nunca ha podido probar variantes: si
   alguien lo intentara, reventaría en silencio. Corregido añadiendo `heroStatus` al clon.
2. **`src/meta.js`** — tres logros (`no_gear_win`, `flawless`, `full_gear`) comprobaban `!!ctx` pero no sus
   subcampos (`ctx.stats`, `ctx.hero`), y lanzaban con un contexto incompleto. No alcanzable desde el juego
   real hoy (los 4 sitios que llaman a `checkAchievements` siempre pasan `hero`+`stats` completos o `null`),
   pero es código frágil. Corregido con el mismo estilo defensivo que ya usa el resto del archivo.

**103.054 comprobaciones, 0 bugs** tras las dos correcciones; el resto de la suite (721 comprobaciones)
sigue en verde sin cambios de comportamiento para el jugador.

**Límite explícito que deja anotado**: el banco de equilibrio oficial (`tools/balance.mjs`,
`tests/balance-guard.mjs`) sigue sin simular variantes ni tramos > 0 — es la misma limitación ya apuntada en
`planning.md` antes de este harness; extenderlo es trabajo aparte, no tocado aquí.

## 2026-09-30 · El mapa en el centro y la mazmorra visual

**De dónde salió.** El usuario compartió una captura de un editor de RPG táctico como referencia de
composición (no de arte): un mapa grande en el centro con paneles de información a los lados. Se descartó
imitar el terreno con tiles/sprites (exige arte con licencia y choca con «vanilla, sin build») y el usuario
eligió **terminar la mazmorra visual ya diseñada** en la Fase 1 del 2026-09-29, que se había quedado sin
construir al desviarse al motor incremental, más **un panel del personaje a la derecha**.

**Cómo quedó:**
- `.map-layout` pasa de flex a **grid con zonas** (`gear · map · hero`): tres columnas en ancho, con los
  laterales `position: sticky` para que sigan a la vista al bajar por un mapa de ~1000 px; dos columnas en
  medio; una sola en móvil (personaje, equipo, mapa). `#rpgHeroPanel` se muda de la cabecera a la derecha y
  concentra identidad, vida, ATK, nivel con XP, las 4 primarias y el oro (solo lectura: repartir puntos sigue
  en el Inventario). El pie de estadísticas del panel de equipo se quita en el mapa para no repetirlas.
- Mapa: pasillos como `<path>` curvos (curva cuadrática con un doblez que sale de un hash de sus extremos) con
  una bóveda oscura debajo; salas descolocadas con otro hash (nunca `rng()` del juego); fondo de roca con
  gradientes y vetas en CSS; la niebla como hueco sin dibujar (sin icono ni borde); y la **antorcha del héroe**
  como único movimiento autónomo del mapa, respetando `prefers-reduced-motion`.

**Un número medido, no elegido.** El desorden de las salas empezó en 2 % × 1 % y la prueba de móvil falló:
midiendo 300 mapas a 390 px, el 4,7 % tenía una sala pegada a un sub-jefe en la columna de al lado. Con
**1,2 % × 0,6 %**, 0 solapes en 600 mapas, con ~5 px de margen. La curva de los pasillos pone el resto del
efecto orgánico.

**Un fallo de pruebas de la 1.4.1 que se había colado.** La prueba de navegador fallaba ~1 de cada 4 veces
desde que los combates normales sueltan botín: tras ganar, podía abrirse el botín en vez del mapa, y tres
sitios del test daban el mapa por hecho. Días antes se había despachado como «intermitencia conocida»; no lo
era. Corregido haciendo que esos sitios resuelvan el botín, y verificado forzando el 100 % de combates con
botín (182/182). Además, el goteo de botín, que no tenía ninguna prueba de navegador, ya la tiene.

## 2026-09-30 · Giro visual: prueba de concepto del combate de lado y del Modo Aventura

**De dónde salió.** El usuario aporta arte pixel art (héroe, goblin, fondo de bosque pintado de lado, mapa de
Zafias) y quiere las vibes de DragonFable. Acepta salir del «minimalista con emojis», pero **sin muros que obliguen
a cambiar de lenguaje**. Tras revisar la viabilidad (todo cabe en web estática con vanilla + Web Animations API;
PixiJS solo como capa de pintado si hiciera falta; Godot/Flutter descartados) y tres tandas de preguntas, las
decisiones quedaron en `planning.md`. Prioridad: **web de escritorio primero**; en móvil basta con que funcione.

**Qué se construyó (prueba de concepto, sin publicar):**
- **Combate de lado** (paso A1): `#rpgStage` sobre `img/bg/forest.webp`, héroe siempre a la izquierda y enemigo
  (el goblin, provisional para todos) siempre a la derecha. Único movimiento: embestida rápida hacia el otro con
  WAAPI, número de daño encima del golpeado al impactar, y vuelta. Sustituye a los efectos viejos sobre las cartas
  (y a GSAP del CDN, que solo usaban ellos). Las cartas siguen debajo hasta el panel de pergamino (A2).
- **Modo Aventura** (`src/adventure-view.js`, datos en `src/data/zones/zafias.js`): el mapa es un «mundo» que se
  desplaza y escala con `transform`; la escena llena el visor y la cámara sigue al héroe dentro de su recuadro;
  marcadores en capa de pantalla (tamaño fijo con cualquier zoom); aldea con 2 NPC y diálogo de pergamino
  («Siguiente» → «Cerrar»), bosque con el goblin visible; recodos `via` para que el héroe siga el sendero en vez
  de cruzar árboles. `?debug` muestra los fps.
- Imágenes a WebP: mapa 3,7 MB → 0,7 MB; fondo 2,8 MB → 0,25 MB. Sprites recortados a su silueta (`img/sprites/`).

**Medido, no supuesto.** Caminando y con la cámara viajando entre escenas: 60 fps de media y ningún fotograma de
más de 33 ms, tanto normal como con la CPU a ×4 más lenta (Chromium sin interfaz, 1440×900). La prueba de
concepto confirma que el stack aguanta; el riesgo que queda es el arte, no la técnica.

## 2026-09-30 · Panel de pergamino, adiós a las intenciones y pociones (A2)

**Decisiones del usuario (dos tandas):** barra con ¡Atacar! grande + iconos a un clic; diario plegado; pociones
al 40 % que gastan turno (máx. 3, se conservan entre partidas, 40 de oro fijo en La Forja); final del combate
como cartel sobre el escenario. Y un giro de fondo: **las intenciones dejan de mostrarse** («nos desviamos de
Slay the Spire y nos acercamos a DragonFable»). Los enemigos mantienen sus patrones, solo ocultos; tu ataque
sigue diciendo su daño, pero calculado sin la defensa del enemigo (si no, delataría que va a protegerse).
«de la Niebla» perdió su sentido (ocultaba la intención) y pasó a emboscada: su primer golpe ×2.

**Un fallo propio de camino:** el script que adaptó las pruebas usaba `String.replace` con `$$eval` en el
texto de sustitución, y `$$` ahí significa «un `$`»: dos pruebas quedaron con `$eval` y fallaban por eso, no
por el juego. Detectado aislando el caso; conviene usar una función como sustitución en esos scripts.

**La investigación del usuario** (`research/`) confirma el rumbo; lo que se adopta, adapta y aparca quedó en
`planning.md`. Lo urgente que trae: sin intenciones hace falta **telegrafiado sin números** (frases y postura).

## 2026-09-30 · Versión 1.5.0: Zafias jugable de punta a punta

**Cambio de método pedido por el usuario:** «no hagas tanta sobreingeniería»: primero contenido funcional estilo
DragonFable; los detalles, a la sección **Perfilados** de `planning.md`. Con esa regla, el camino crítico C1-C5
salió en una sola tanda:
- **C1** combates de verdad en la aventura (el mismo héroe; vida y vencidos guardados aparte en
  `easy-hero-adventure`, para no pisar un descenso a medias; derrota → posada, −10 % de oro).
- **C2** la primera misión (Maela → 3 goblins → campamento → Grask → recompensa), con marcas de historia
  (`defeated:<id>`, `requires`, `talk` por etapas) definidas como datos en `src/data/zones/zafias.js`.
- **C3** la aldea: posada (cura y repuebla), tienda (La Forja) y la cueva que baja al descenso.
- **C4** el goblin teñido por especie/linaje (filtros CSS) y jefes más grandes.
- **C5** publicación con README nuevo y capturas.

Cada paso se probó jugando la misión completa con un guion automático antes de comitear.

---

## 2026-10-01 · Perfilados de la aventura (encargo en la nube, issue #2)
- **Etiquetas de parada**: icono (1,3 rem) y número (monoespaciada) en elementos propios; antes eran texto de 0,74 rem.
- **El enemigo no tapa su punto**: el sprite se coloca con los pies 11 px de mapa por encima de la parada (`ENEMY_OFFSET`);
  el punto y su latido quedan siempre a la vista.
- **Vuelta a la aldea tras el descenso de la cueva**: la cueva marca `fromCave` en el guardado de la aventura solo si
  *empieza* un descenso nuevo (si retoma uno a medias, no cambia su origen). Al terminar la ruta (`_rpgBackToStart`:
  fin de partida o abandonar) se consume la marca y se reabre la aventura. Empezar desde el botón del inicio borra
  una marca vieja. La marca vive en el guardado, así que sobrevive a recargar la página.
- Pruebas de navegador nuevas: abandonar el descenso de la cueva (aldea) y de inicio (inicio), y la derrota en la
  aventura (posada, vida llena, −10 % de oro).

## 2026-10-01 · Asset Factory: arte generado con Gemini

**Qué es.** `tools/image-generator/` (`npm run generate -- <tipo> <nombre>`): prompt = plantilla del tipo + STYLE_BIBLE
(con el estilo de los prompts del director en `taller/`) → Gemini → validación → quitar fondo en local → PNG
transparente → taller de sprites → juego. Escenarios: BACKGROUND (fondo de combate) y MAP (mapa maestro + MAP CUTTER
con recortes literales verificados píxel a píxel). Manual en `tools/image-generator/README.md`.

**Decisiones y hallazgos.** Node en vez de Python (reutiliza `sharp` y el taller de sprites). `gemini-2.5-flash-image`
se apaga el 2026-10-02: se usa `gemini-3.1-flash-lite-image` (0,034 $), que solo devuelve JPEG (se pasa a PNG en
local). Quitar fondo sin servicios externos: relleno desde los bordes + huecos interiores + borde descontaminado
respecto al contorno (sin halo). La primera imagen (un orco) salió mirando a la DERECHA pese al prompt: el modelo
copiaba la orientación de la referencia del héroe → referencias por tipo y `fix --flip` para arreglar sin pagar.
Fondo blanco y no negro: los contornos casi negros se perderían. Coste de la prueba: una imagen (~0,034 $).

## 2026-10-01 · Repaso de la Asset Factory y Grask

Revisión «creation-ready»: `budget.max_images_per_run` no se usaba (cada ejecución genera UNA imagen) → fuera;
`--game-id` solo existía en `fix` → también al generar; el mapa de la aventura pintaba siempre el goblin y Grask
nunca encontraría su arte (lo buscaba como «grask-jefe-goblin») → el visor usa `src/data/art.js` y las paradas
tienen `sprite`. Prueba real: `boss grask` salió a la primera mirando a la izquierda (con la referencia del goblin
y no la del héroe), y se ve en el mapa y en el combate. Gasto acumulado de Google: 2 imágenes (~0,07 $).

## Supuestos confirmados antes de B1 (las 8 dudas que quedaban)
Accesorio = rasgo pasivo casi sin números · mejoras con las mismas 5 rarezas del equipo · descartar cura 3 HP
(luego ajustado a 3+1/rareza) · hoguera da 1 de 3 con mínimo Poco común · 4-6 ofertas de objeto por ruta ·
cofres solo dan objetos · legendarios máx. 1 igual, sin límite total · equipo inicial = solo espada básica.

## Riesgos ya gestionados (de la ronda A/B1)
- «5 rarezas es mucho contenido»: resuelto con base fija + pocas bases + afijos compartidos, calibrado con el banco.
- «El test del navegador tardaba 88 s»: sigue igual de acotado (ahora 113 pruebas, ~131 s); no ha hecho falta acelerarlo aún.
- «La opinión de un bot no es la de un jugador»: sigue siendo una limitación conocida; sin jugadores reales todavía (S15 pendiente).

---

## 2026-10-01 · Oleada 1 · Taller de sprites (encargo #3)
- `npm run sprites` (`tools/sprites.mjs`, con `sharp` como dependencia de desarrollo): cada PNG de `img/entrantes/` se
  recorta al contorno (2 px de aire a los lados y arriba, los pies tocan el borde inferior), baja a 256 px de alto como
  máximo (nunca se amplía) y sale en WebP sin pérdida. Fondos → `img/bg/`, escenas → `img/zones/`, sin recortar.
- Manifiesto `src/data/art.js` (ruta, ancho, alto de cada imagen). Una tanda nueva **añade** al manifiesto sin perder lo
  anterior, porque la carpeta de entrada no se sube. Consulta pura en `src/art.js` (id por nombre base: «Rata Gigante» →
  `enemigo_rata-gigante`).
- Combate: imagen propia sin tinte y con su proporción real (`--ratio` = alto del monstruo / alto del héroe); sin imagen,
  el goblin teñido. Héroe: la primera `heroe_*` por orden alfabético, si hay; si no, `hero_right.png`.
- Pruebas: `tests/sprites-sim.mjs` (en `test:core`, con imágenes generadas al vuelo) y una sección en el navegador que
  sirve un manifiesto de prueba.
