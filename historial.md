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

## 2026-10-01 · Mapa de Zafias en alta resolución
- El director devolvió 11 de las 12 piezas de la cuadrícula reescaladas (≈×5) en `img/map-divided-upscaled/` (no se
  sube). Se identificaron comparándolas con los trozos originales a 64×64 y se renombraron `cuadricula_fX_cY_hd.jpg`.
- `tools/assemble-map.mjs`: coloca cada pieza en su recuadro del índice de `split-map.mjs` × 3 y funde las costuras
  en la franja de solape. Pieza que falta → el original ampliado. Pieza **redibujada** (diferencia > 35 con su
  original) → cede en el solape (peso⁴) para que no se vean dos dibujos superpuestos.
- Resultado: `img/zones/zafias.webp` a 4302×3291 (2,7 MB). Las coordenadas del juego no cambian (la imagen se estira
  al tamaño lógico 1434×1097); se quitó `image-rendering: pixelated` porque ahora la imagen se reduce, no se amplía.
  Las piezas HD vienen además sin los marcadores pintados (cofres, muñecos), que el juego ya dibuja por su cuenta.
- Pendiente: f1_c1 (no llegó) y f1_c3 (llegó redibujada, con el río en otro sitio). Ver planning.

## 2026-10-01 · Caminos que siguen el mapa HD y más paradas en Zafias
- Con el mapa HD los caminos pintados se ven mucho más marcados. Se trazaron de nuevo todas las líneas a trazos
  siguiendo la tierra (máscara de color marrón claro sobre una cuadrícula de coordenadas lógicas): ahora van por el
  camino y no a través de los árboles. Herramienta: `tools/zone-overlay.mjs` (con `--tierra` resalta los caminos).
- Paradas de 11 a 24. Tipo nuevo **`poi`** (punto de interés, 🔍 dorado): se mira como se habla con un NPC y puede dar
  un hallazgo una sola vez (marca `visto:<id>`). Aldea: pozo (+10 🪙), mercado, y una segunda salida al bosque por el
  sendero del sur. Bosque: senda del santuario, poste de los cruces, ruinas del vigía (+1 🧪), camino del norte, un
  fardo en la orilla (+25 🪙); enemigos nuevos: goblin explorador, goblin del puente y el **Orco del puente** (opcional,
  con su dibujo). Campamento: estandartes, goblin centinela, escalinata del castillo, goblin rezagado y el botín de
  Grask (+40 🪙 +1 🧪, solo tras vencerle). La misión no cambia: siguen contando los tres goblins de siempre.
- La cueva del sur no tiene camino pintado desde la aldea: su línea baja por los escalones viejos, monte a través.
- Prueba nueva `tests/zones-sim.mjs` (en `test:core`): caminos que unen paradas reales, todo alcanzable, dentro del
  encuadre, salidas con destino real, diálogos escritos y hallazgos de una sola vez.

## 2026-10-01 · Trazado automático de los caminos (`tools/trace-paths.mjs`)
- Objetivo: que montar una zona nueva (p. ej. una de nieve) no exija leer coordenadas a ojo. Ahora los caminos se
  escriben sin recodos (`['poste', 'goblin-puente']`) y la herramienta los traza en ~10 s.
- Cómo: el color del camino se **aprende** de la zona (histograma de colores alrededor de paradas y cruces frente al
  del mapa entero: vale para tierra, nieve o piedra) → coste por píxel (camino barato, bosque caro, agua carísima) →
  ruta más barata con A* dentro del encuadre → suavizado → «tirar de la cuerda» (ir recto solo si ningún punto de la
  recta pisa terreno peor que la ruta) → Ramer-Douglas-Peucker. Resultado en `src/data/zones/zafias-paths.js`.
- Lecciones: sin suavizar, la cuadrícula da líneas en escalera; con el «tirar de la cuerda» por coste medio, todo
  salía recto atajando por los árboles (hizo falta exigir que ningún punto fuera peor que la ruta).
- Comparado con lo trazado a mano: la mayoría a 1-9 px. Se quedan a mano 4 caminos donde no mejora: la cueva (sin
  camino pintado), el claro rojizo de Grask (dos) y el poste→puente. Los recodos a mano siempre mandan.
- Receta completa de una zona en `docs/zonas.md`. `tests/zones-sim.mjs` avisa si un camino queda sin trazar.

## 2026-10-01 · Criaturas con nombre en la recámara (lobos, gnolls, orcos)
- `src/data/creatures.js`: enemigos fijos del Modo Aventura con su ficha (tipo, piso de referencia, patrón,
  multiplicadores y reglas). Una parada los usa con `enemy: { creature: 'gnoll-berserker' }`; el motor los crea con
  `createRpgCreature` (siempre iguales, sin variantes al azar) y el mapa y el combate buscan su dibujo por su nombre.
- Nueve: Lobo de Zafias · Feronius el Feroz (lobo alfa, sub-jefe, furia) · Gnoll de Zafias · Gnoll Berserker (×1,4
  daño, ×0,7 vida) · Gnarok, el Jefe Gnoll (sub-jefe, sed de sangre) · Orco de Zafias · Orco Guerrero (armadura
  negra = 30 % de resistencia física) · Orco Chamán (×1,25 daño y vida, quema) · Guul, el Rey Orco (jefe).
- Dibujos con la Asset Factory, uno a uno (9 imágenes, ~0,30 $): todos de perfil mirando a la izquierda a la primera.
  Regla del director: **los nombres propios no van al prompt**, solo qué es y cómo es; el nombre va en `--game-id`.
- Aún no están colocados en ninguna zona. Prueba: `tests/creatures-sim.mjs`.

## 2026-10-01 · Feronius, jefe de Zafias, y el primer banco de la aventura
- Zafias solo tiene goblins y lobos (gnolls y orcos quedan para el bosque amarillo). Escena nueva **la guarida del
  lobo** (sureste, tras el campamento; se abre al vencer a Grask): un lobo de guardia, unos huesos roídos (pista) y
  **Feronius el Feroz** como jefe de la zona (tipo jefe, se ve más grande, `once`). El Orco del puente se fue.
- `tests/adventure-sim.mjs` (`npm run sim:aventura`): un bot juega Zafias miles de veces sobre el grafo real (salidas,
  bloqueos, marcas) con el motor de combate; si cae, entrena con los enemigos fáciles que reaparecen al dormir.
- **Hallazgo:** un héroe nuevo necesitaba nivel 11 y ~250 combates de entrenamiento para vencer a Grask, porque en
  la aventura no hay equipo (ATK 1) y los enemigos venían de pisos 2-3. Se bajaron los pisos de Zafias (Grask:
  sub-jefe de piso 1) y Feronius quedó como jefe de piso 1 con ×0,8 daño y ×0,85 vida: ahora ~16 combates de
  entrenamiento antes de Grask, y Feronius a la primera hacia el nivel 4 perdiendo dos tercios de la vida. Jugar bien
  cuenta: el bot que solo ataca necesita 55 combates y cae 5 veces (2 el que se defiende y bebe).
- `tests/adventure-flow.test.mjs` (en `npm test`): el final de Zafias jugado en el navegador, del campamento a
  Maela pasando por Grask, el botín, la guarida y Feronius.

## 2026-10-01 · Tras la prueba del director: tamaños y salidas que se encuentran
- Lobos demasiado grandes y Feronius llenando la pantalla: los dibujos se normalizan a la altura del héroe, así que
  un cuadrúpedo salía tan alto como él. Campo `scale` en `creatures.js` (lobo ×0,55, a media altura del torso;
  Feronius ×0,55 sobre el ×1,5 de jefe ≈ 0,85 del héroe), aplicado en el combate y en el mapa. Feronius lleva la
  etiqueta «Jefe de Zafias» en vez de «Jefe final».
- Costaba encontrar al jefe: la cámara sigue al héroe y la salida a la guarida quedaba fuera de la pantalla. Las
  salidas son ahora un cartel dorado que brilla, con una flecha hacia donde llevan y el nombre de la escena de
  destino; si la salida no se ve, su cartel espera pegado al borde apuntando hacia ella (y se puede pulsar). Tras
  vencer a Grask, el objetivo añade «Algo aúlla al sureste del campamento».

## 2026-10-02 · Onboarding: la introducción y la aventura como puerta de entrada
- Decisión del director: el jugador nuevo entra **directo al Modo Aventura**, nunca al menú de la mazmorra. La primera
  vez, una introducción; después, directo a donde dejó la aventura (la mazmorra queda a un clic: «La mazmorra» y la
  cueva del sur). `?inicio` abre la pantalla antigua (lo usan las pruebas).
- La introducción (`src/intro.js`, guion como datos en `src/data/intro.js`): pensamientos sobre negro → «los
  párpados» se abren sobre unas ruinas al amanecer (fondo nuevo `img/bg/ruinas.webp`, Asset Factory; el primer
  prompt lo bloqueó el filtro de seguridad de Google por «a lonely place to wake up») → el héroe tendido se incorpora →
  escribe su nombre → la espada de hierro → fundido → «Zafias» → la aldea. Clic, Intro o Espacio para seguir;
  Escape o «Saltar» la terminan; Opciones → «Ver la introducción».
- Nombre del héroe en `meta.heroName` (y `introSeen`). Los diálogos aceptan `{heroe}`; Maela lo usa, y el héroe le
  cuenta que despertó en las ruinas. La espada inicial pasa a llamarse «Espada de hierro».
- Quien ya tenía partida (descenso o aventura) no ve la introducción de golpe: entra directo a la aventura.
- Misiones como datos (`src/data/quests.js`, reglas puras en `src/quests.js`): principal «Descubre quién eres»
  (sin final todavía), «Los goblins del bosque» (Maela, la de siempre) y «Dientes de lobo» (Bram: vencer 5 lobos
  con la misión en marcha; cuentas en `counts` del guardado; `whenCount` en los diálogos). Botón «Misiones» con
  el diario (cumplidas tachadas, al estilo Skyrim) y aviso al recibir o cumplir. NPC: azul con misión, amarillo si
  solo habla, gris cumplida; puntos de interés grises una vez vistos. Cubre buena parte del encargo #5: la barra
  de objetivo sigue escrita a mano en `_advQuestText()`.
- **Decisión del director: el roguelike (descenso) queda aparcado, con su botín. El Modo Aventura es el foco**:
  es lo que el jugador jugará las primeras horas.
- Equipo propio de la aventura (`src/data/gear.js`, permanente, en `meta.advGear` / `meta.advWeapon`), aparte del
  botín del descenso. Primer objeto: la **Espada de Zafias** (ATK 2), recompensa de Bram (`reward.item`). Cada arma
  trae el dibujo del héroe con ella (`sprite`: `arma_<id>`, original en `img/weapons/`, no se sube; tipo `arma_`
  nuevo en `npm run sprites`); el héroe la lleva en el mapa y en el combate. Inventario «DragonFable»: lista y
  ficha en pergamino, con la vista previa del héroe y «Equipar».
- Opciones → «Borrar progreso»: advertencia (qué se pierde, «Cancelar» / «BORRAR»); borra todas las claves
  `easy-hero-*` y recarga sin parámetros, así que vuelve a salir la introducción.
- Pruebas intermitentes arregladas (todas por el azar del mapa de la prueba): hogueras (se pedían 5; el mínimo
  garantizado es 2), el salto de piso (el destino podía abrir un combate), descansar (equipo con «Calidez») y
  «ganar no da fuerza» (un arma del botín). 8 vueltas seguidas del navegador sin un fallo.

## 2026-10-02 · Maná y la poción de maná menor; taller de iconos
- El héroe tiene maná: `maxMp` = la mitad de la vida inicial (25 → 12, `RPG_BALANCE.manaFromHp`). El Golpe de Fuego
  cuesta 5 de maná (`manaCost`) y desaparece la recarga por rondas. Lo que antes bajaba la recarga (afijo «Recarga»,
  ahora «Ahorro»; la vía de la llama) abarata el maná 1 punto por cada ronda que quitaba.
- Aventura: el maná se conserva entre combates como la vida (`adv.state.mp`) y vuelve al dormir o al caer.
  Descenso (aparcado): cada combate empieza con el maná lleno, para no cambiar su equilibrio.
- Poción de maná menor (`manaPotion`: devuelve el 50 %, tope 3, 25 de oro) en la tienda y en el combate
  (acción `mana_potion`). Botones de pociones con imagen (`img/ui/pocion-vida`, `pocion-mana`).
- `tools/icons.mjs` (`npm run icons`): convierte `img/items/`, `img/icons/` e `img/icons/effects/` a WebP
  ≤128 px en `img/ui/<id>.webp` con ids en español (tabla NOMBRES) y los registra en `ART.icons`. Originales
  sin subir.
- Sin calibrar a propósito (el director: «funcional primero, el equilibrio lo hablamos luego»). Una prueba de
  1500 builds al azar ahora admite algún empate eterno (sin maná, ATK 1 contra un muñeco que se cura).

## 2026-10-02 · La mazmorra, aparcada: Easy Hero es la aventura
- Fuera el botón «🗡️ La mazmorra» de la aventura (y su gancho `onExit`). La cueva del sur pasa de `cave` a `poi`
  con el diálogo `cueva` (escalofrío, «todavía no estás preparado»): ya no baja al descenso. Se quitan
  `enterDescent`, `returnFromDescent`, `forgetDescentOrigin` y la marca `fromCave`. El descenso sigue en el código,
  solo accesible con `?inicio` (lo usan las pruebas).

## 2026-10-02 · Motor de efectos de estado, PH y elixires
- Motor genérico y puro en `src/effects.js` con los datos en `src/data/effects.js` (`EFFECTS` y `ELIXIRS`). Cada
  combatiente lleva `effects = { id: { power, turns } }` (turns null = todo el combate), vacío al empezar el combate.
  Daño y cura por ronda al cerrar el turno de quien los lleva; las mejoras puestas por tu propia acción no gastan esa
  ronda (`fresh`); aturdido no gasta rondas, se consume al perder el turno. Apilado: veneno suma; el resto, el mayor.
- Sustituye a `monster.status` y `combat.heroStatus`: veneno y quemadura de objetos, variantes y criaturas pasan por
  el motor (las reglas `poisonOnHit`, `burnOnHit`, `poison_on_hit`… siguen igual). Reglas nuevas: `onHit: [{ id, power,
  turns, chance }]` y `stunOnHeavy: m` en criaturas, variantes y `enemy.rules` de una parada; `onHit`/`onStart` en el
  equipo de la aventura (`hero.gearEffects`).
- Sucesos nuevos: `effect-on` (icono grande), `effect` (número en el color del efecto + icono), `effect-off`, `stunned`.
- PH: `RPG_HERO_BASE.ph = 5`, `rpgHeroPh(hero)`; las habilidades con `ph` hacen PH × ph. `rpgAtk(unit)` aplica «Más ATK».
- Convención del director: PH (Poder de Habilidad) para todo lo «mágico» (nunca «magia»); ATK (Poder de Ataque) el
  golpe básico. El icono `efecto-mas-magia` pasa a `efecto-mas-ph`.
- Elixires en `meta.elixirs`, en la tienda (`elixir:<id>`) y en combate (acción `elixir`). `window.gameCombat()` para
  pruebas. Pruebas: `tests/effects-sim.mjs` (motor) y `tests/effects.test.mjs` (navegador).

## 2026-10-02 · Inventario estilo DragonFable, armas del mercader y barra de habilidades
- `npm run icons` también pasa las hojas de img/weapons/weapon_sword-*.png a img/ui/objeto-<id>.webp (≤256 px) y recorta
  de img/icons/buttons-ui/ui_1.png los marcos de interfaz (marco-boton*, marco-mini*, marco-ranura*) además de las piezas
  ya recortadas por el director (barras de vida/maná, ranura bloqueada/desbloqueada).
- `src/data/gear.js`: `ELEMENTS`, `SLOT_ICONS`, rareza por id, `price` (lo vende el mercader), `GEAR_FOR_SALE`,
  `WEAPON_UPGRADE` (cristal, `meta.advUpgrades`). Ocho espadas nuevas con efectos para probar el motor de efectos.
- Tienda por secciones (Armas solo desde la aventura · Consumibles · La Forja); `Meta.shopPrice` aplica el modo pruebas
  (`RPG_BALANCE.freeShop = true`): las pruebas de precios lo apagan. Frasco de veneno = elixir con `target: "enemy"`;
  comida en `FOOD` (`meta.food`), se come desde el inventario.
- Habilidades fuera de la barra de acciones: `#rpgSkillBar` con `RPG_BALANCE.skillSlots` ranuras (6). «Golpe de Fuego» pasa
  a llamarse «Bola de fuego» (el id sigue siendo `fire_strike`). Pruebas nuevas: `tests/gear-sim.mjs`.

## 2026-10-02 · Repaso de iconografía (1.ª parte)
- Barra de abajo de la aventura (`.adv-bar`): `Adventure.setHud(obj)` pinta nombre, medidores `.ui-gauge` (barra-vida/mana
  recortada con clip-path sobre barra-vacia), bolsa con `data-hud` y el objetivo en `.adv-objective`. Las pruebas leen
  esos `data-hud`, ya no el texto con emoticonos. El combate usa los mismos medidores (`_rpgGauge`).
- `UI_IMG(id)` para meter un icono de img/ui donde iba un emoticono. Botones `.btn-secondary` y `.shop-buy` con
  border-image de marco-boton (luz al pasar, oscuro deshabilitado). Pendiente: iconos que pidió el director (opciones,
  logros, bestiario, colección, misiones, forja, diario, paradas del mapa, huir, grito, victoria/derrota, mejoras).

## 2026-10-02 · Revisión del texto de la aventura
- Reescritos la introducción, los 80 diálogos de Zafias (con líneas de narración: `who` = el lugar), las misiones,
  los avisos de golpe fuerte (6), las fichas de las criaturas y los mensajes de huir y de caer. Pistas nuevas del
  pasado del héroe, para que el director las confirme o las quite: la empuñadura que Bram no reconoce, el buhonero que
  pregunta por alguien sin memoria, la voz y las piedras azules del santuario (sueño en la posada).
- Las pruebas leen los diálogos enteros en vez de contar líneas.

## 2026-10-02 · Repaso de iconografía (2.ª parte): los 16 iconos del director
- `npm run icons`: menu-* (bestiario, colección, logros, opciones), parada-* (hablar, posada, mirar, salida), habilidad-grito,
  victoria, derrota y forja-* (filo, estudio, herencia, linterna, suerte). Colocados en el menú de arriba, las cabeceras de los
  paneles, las paradas del mapa (las salidas llevan la puerta y la flecha), la barra de habilidades, el cartel de fin de
  combate (`RESULT_IMG`), las mejoras de La Forja (`UPGRADE_IMG`) y la espada de la introducción.

## 2026-10-02 · Diálogos estilo novela visual
- Retratos: img/characters/<id>-profile.png → img/portraits/<id>.webp (`npm run icons`, ART.portraits). Quién lleva cada uno:
  `src/data/characters.js` (clave = el `who` de la línea). El héroe a la derecha, volteado; el otro a la izquierda; quien
  habla en luz y el que escucha en penumbra; la etiqueta del nombre, del lado de quien habla. «tabernero» es Bram (decisión
  del director); Maela aún no tiene retrato.

## 2026-10-02 · Retratos de Maela, los goblins y Grask
- Retratos nuevos del director (img/characters → img/portraits): tabernera-maela, enemy-goblin-minion (lo comparten
  los cuatro goblins que hablan), enemy-grask-boss y herrero-braum (sustituye a «tabernero»).
- `PORTRAITS` admite `{ id, scale }`: Grask a ×1,25 y bajado detrás del cuadro (`.is-big`), para que se vea enorme sin
  cortarle la cabeza. La armadura de su diálogo pasa a ser de placas, como en el retrato.
- Prueba en zones-sim: cada retrato existe y es de alguien que habla en Zafias.

## 2026-10-02 · Energía, Golpe poderoso y medidores en 9 trozos
- `RPG_BALANCE.energy` { max 100, onAttack 5, onHit 5, onDefend 10 }; `hero.energy`/`maxEnergy` se ponen a 0/100 al crear
  cada combate. Las habilidades pueden costar `energyCost` en vez de maná (`rpgSkillReady` mira las dos). `power_strike`:
  `atkMul: 3` (golpe físico: protección y armadura del enemigo cuentan), `stun: 0.5` con `combat.rng`.
- Icono compuesto en tools/icons.mjs (`COMPOSITES`): llama al 55 % de opacidad + la espada.
- `.ui-gauge` v2: border-image de barra-vacia en 9 trozos (30/48 px del arte, escalados con --h) y relleno en degradado
  por bandas (--g-hi/mid/lo). La rejilla del combate pone las habilidades bajo las acciones; en móvil, ranuras de 42 px.
- Pruebas: 11 en effects-sim (energía y Golpe poderoso), 4 en effects.test (pantalla), ranuras en browser.test.

## 2026-10-02 · Texto de la aventura, línea a línea con anti-slop-writing
- Guía clonada en research/anti-slop-writing (no se sube: /research/ ya está en .gitignore). Se aplicó, más la pauta del
  director, a toda la narrativa: introducción, 80 diálogos de Zafias, misiones, avisos de golpe fuerte, bestiario, mensajes de
  huir/caer y descripciones de armas. Criterio: habla llana de pueblo, nada de frases de poema, concreto antes que
  abstracto, y quitar lo que no existía en el material (se eliminaron detalles inventados: yelmo de caballero muerto,
  huesos en las trenzas del chamán, «Mirmulnir lleva nombre de dragón»…).
- Se conservan las tres pistas del pasado del héroe de la 1.9 (empuñadura de Bram, buhonero, piedras azules): siguen
  pendientes de que el director las confirme.

## 2026-10-02 · Paradas sin número y enemigos sin nombre
- Eliminada la numeración de mundo (`STOP_LABELS`, `zone.number`). Los enemigos no muestran su nombre al pasar el ratón y su
  aria-label es «Enemigo»; el resto de paradas conserva su nombre al pasar el ratón. Prueba nueva en browser.test.

## 2026-10-02 · Herramienta de novela visual rápida
- `tools/portraits.mjs`: procesado de retratos (lo usan `npm run icons`, la fábrica y `npm run vn`).
- Fábrica: tipo `portrait` (prompts/portrait.json, estilo `portrait` en la STYLE_BIBLE con los retratos del juego como
  referencia, 3:4, sin las reglas de cuerpo entero) que entrega a img/characters + img/portraits (`deliver: portrait`).
- `tools/vn.mjs` (`npm run vn`): revisar (`checkVN`, también en tests/vn-sim.mjs), lista, nuevo (diálogo de plantilla +
  retrato en characters.js) y ver (capturas por línea en taller/vn/). `?vn=<clave>` en el juego abre un diálogo sin
  recompensas ni marcas (`Adventure.previewDialogue`). Receta: docs/novela-visual.md. Pruebas: vn-sim (8) y vn.test (8).

## 2026-10-02 · 1.9.2: aturdido sin carteles, ritmo del combate y efectos claros
- Sin cartel de escena (.adv-plaque) en el mapa. El título del combate («Combate · escena · Ronda») se mantiene.
- Aturdido: sin botón ni texto flotante. La barra se apaga (`.is-stunned`) y el controlador (adventure.js/main.js) lanza
  solo la acción perdida tras la animación (`playRpgCombatFx` devuelve su duración) + 900 ms: el enemigo vuelve a actuar.
- ¡Atacar! con 2 s de espera (`UI.startAttackCooldown`, franja `.is-cooling`); no se aplica con navigator.webdriver salvo
  `window.__forceAttackCooldown`. Embestida 880 ms (golpe al 55 %). Golpe recibido: dos destellos blancos solo en el dibujo
  y un temblor corto (`_rpgHitFeedback`). Los números salen por encima de la fila de efectos.
- `EFFECT_TURNS = 3` en src/data/effects.js: `applyEffect` impone 3 rondas a todo menos el aturdimiento. Datos ajustados a 3.
  Efectos en la carta junto a la vida (`.rpg-fx-chip`: icono, nombre, rondas) y nombre al ponerse.
- «Sobre Easy Hero» reescrito (beta, gratis, sin cuenta ni anuncios). Pruebas: aturdido automático y espera de ¡Atacar!
  en effects.test; duraciones en items-sim y effects-sim.

## 2026-10-02 · Energía que se guarda y botones del inventario en ámbar
- `createRpgCombat` ya no pone la energía a 0: la recorta a [0, 100]. La aventura la guarda en `adv.state.energy` tras cada
  acción y la vacía al dormir (no al caer). Medidor de energía en la barra de abajo. Pruebas: effects-sim y effects.test.
- `.inv-equip` activo y `.inv-tab.is-on`: marco dorado con interior ámbar y letra oscura en mayúsculas.

## 2026-10-02 · Arreglo: el icono de efecto mostraba el sprite del personaje
- `_rpgRenderStage` cogía `actor.querySelector('img')`: desde que la fila de efectos va dentro del actor (y antes del dibujo),
  esa primera img era un icono de efecto, y `_rpgSetSprite` le ponía el sprite. Ahora `:scope > img`. La fila queda solo con
  el icono (sin recuadro ni número). Prueba en effects.test.

## 2026-10-02 · Números de combate (v2)
- Fuente Grenze 900 cursiva (`--font-numbers`), contorno con text-shadow en 8 direcciones. Clases por dirección: `is-taken`
  (rojo), `is-dealt` (claro), `is-crit`, `is-heal`; el tick de efecto, en su color con su icono a 1,05 em.
- Nacen al 32 % del alto del personaje con un desvío horizontal al azar (±18 px) y un tope para no salirse por arriba;
  suben hasta 1,5 veces su alto y se desvanecen. Prueba en effects.test (dentro del escenario, cursiva, negrita, Grenze).

## 2026-10-02 · Arreglo: la cara anterior asomaba al cambiar de retrato
- Los retratos son dos <img> que se reutilizan; al cambiar el src, el navegador sigue pintando la imagen vieja hasta que
  llega la nueva (en la web, con la red de por medio). Ahora: `.is-loading` (oculto) hasta `img.decode()` y precarga de
  todos los retratos al montar la vista. `npm run vn -- ver` espera a que estén listos antes de cada captura.
- Prueba en vn.test: red lenta simulada (500 ms por retrato) y registro por fotograma; falla sin el arreglo.

## 2026-10-02 · La Forja nueva, precios y efectos en el impacto
- Mejoras con `ramp: true` (`upgradeTotal`: perLevel·n(n+1)/2): Filo, Constitución y Buen ojo, coste 10 y crecimiento ×2. Buen ojo
  pasa de porcentaje a oro fijo por combate (`goldFlat`). Poción 20, pan 5; `sold: false` en el tónico (no se vende, se usa).
- `playRpgCombatFx`: los efectos de un `effect-on` se esconden (`.is-pending`) al dibujar y se revelan en el impacto del golpe que
  los trae (`lastImpact` por objetivo); el aturdimiento, sin texto flotante. Prueba con animaciones reales en effects.test.

## 2026-10-03 · Botín, rarezas, encuentros raros y la aldea rehecha (1.10.0)
- **Rarezas oficiales** en `rarities.js`: Común gris, Poco común verde, Raro azul, Épico lila, Legendario amarillo.
- **Botín** (`src/data/loot.js`, `src/loot.js`): goblins y lobos normales, 33 % de soltar algo; tablas por pesos. Los materiales
  se guardan en `meta.materials`. Una poción que no cabe se queda en el suelo. Feronius suelta siempre su colmillo.
- **Encuentros raros** (`src/data/rares.js`): Lobo Negro y Goblin Pícaro (10 %, ×2 vida y ataque, botín seguro). Solo en los
  goblins sin diálogo. La tirada se guarda por parada hasta dormir (huir no la repite).
- **La aldea**: cuadro propio (`scene.image`), hecho con la fábrica (tipo `scene`, 2 intentos de 5). Evelyn (antes Maela), Bram
  con menú Comprar/Mejorar/Salir, Amelie y su botica, posada a 5 monedas (gratis tras Grask). **Las casas del camino**: Odo,
  Hilda y Nell (1 intento para el cuadro, 1 por retrato). 7 imágenes de las 15 del cupón.
- **Tiendas como datos** (`src/data/shops.js`): cada una vende lo suyo y compra lo mismo al 75 %. El cristal de mejora es un
  objeto (100 de oro) que Bram gasta al mejorar. Las mejoras permanentes pasan a ser las lecciones de Odo.
- **Misiones**: fuera «Dientes de lobo»; entran el colmillo de Feronius (Bram), las plantas de Amelie (tres puntos de interés,
  con `unless`), los seis goblins de Odo y los cuatro lobos de Hilda. Pasos de misión `item: { material, n }`.
- **Trazador de caminos**: se quedaba en bucle (comparaba un doble con un float de 32 bits y «mejoraba» siempre); arreglado con
  `Math.fround`. Ahora traza también las escenas con cuadro propio.
- Decisiones mías, a confirmar por el director: están en planning.md («Dudas de la aldea nueva»).

## 2026-10-03 · La pantalla de Equipo (1.11.0)
- Botón «Equipo» en la barra (icono del casco). Panel `renderEquipPanel`: figura de cuerpo entero (`ART.portraits['hero-cuerpo']`),
  ocho ranuras (`SLOT_ORDER`, `SLOT_NAMES` en gear.js), ficha de la ranura elegida y hoja de estadísticas sacadas del mismo héroe
  con el que se pelea (`_advHero`). Los puntos de nivel se gastan aquí (`Meta.spendStatPoint`); el botón avisa si quedan.
- Fábrica: tipos `figure` (cuerpo entero; salió a la primera usando el retrato del héroe como referencia) y `gear` (pieza de
  equipo; con él se hizo la Espada de hierro, la única sin dibujo).
- La espada va girada 45° en su ranura: vertical no cabía en un marco cuadrado.
