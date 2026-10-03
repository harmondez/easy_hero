# 📜 Registro de cambios

Aquí se anota **qué trae cada versión** del juego, de la más reciente a la más antigua.
Cómo se numeran las versiones y cómo se publica una nueva: [docs/versiones.md](docs/versiones.md).

## [Sin publicar]

## [1.10.0] - 2026-10-03

### ✨ Novedades
- 🏘️ **La aldea de Zafias, rehecha**: un cuadro nuevo (la plaza del pozo, la posada, la forja, la botica, el mercado y la cueva), con las calles marcadas para pasear de un sitio a otro.
- ⚒️ **La Forja de Bram**: al hablar con él pregunta **Comprar, Mejorar o Salir**. Vende solo espadas y el **cristal de mejora** (100 de oro); con un cristal mejora una espada (+1 de ATK, hasta +3).
- 🧪 **La botica de Amelie**: una chica tímida que lleva la tienda sola y cuida de su hermana enferma. Habla y abre la tienda: pociones de vida y de maná, elixir de fuerza, elixir arcano y frasco de veneno. Te pide **tres plantas medicinales**, escondidas en puntos de interés.
- 🛏️ **La posada de Evelyn** (antes Maela), posadera y bibliotecaria: **Hablar con Evelyn** o **Descansar · 5 monedas**. Te pide que te encargues de Grask; cuando vuelves, dormir es **gratis para siempre**. También vende el pan.
- 🏡 **Zona nueva: las casas del camino**, con tres vecinos: **Odo** el veterano (misión de goblins y sus lecciones: las mejoras permanentes), **Hilda** la curtidora (misión de lobos) y **Nell** la abuela. Las dos misiones pagan oro y experiencia.
- 🦷 **El colmillo de Feronius** sustituye a la misión de los cinco dientes de lobo: lo suelta Feronius y Bram te forja la Espada de Zafias a cambio.
- 💰 **Vender**: cada tienda te compra lo que vende, al 75 % de su precio.
- 🎒 **Botín**: los goblins y los lobos sueltan algo una de cada tres veces (pociones y materiales: oreja de goblin, collar goblin, piel, garra y diente de lobo…). Sale en el cartel de victoria y se guarda en el inventario.
- 💎 **Rarezas oficiales**: Común (gris), Poco común (verde), Raro (azul), Épico (lila) y Legendario (amarillo).
- ✨ **Encuentros raros**: un 10 % de las veces, en lugar de un lobo sale el **Lobo Negro**, y en lugar de un goblin del camino, el **Goblin Pícaro**: doble de vida y de ataque, y sueltan botín siempre.

### 🔧 Por dentro
- Una escena puede tener su propio cuadro (`image`, `width`, `height`); la fábrica tiene el tipo `scene` para hacerlos y el trazador de caminos los entiende (y ya no se queda en bucle por un redondeo).
- Tiendas como datos (`src/data/shops.js`), botín (`src/data/loot.js`) y encuentros raros (`src/data/rares.js`). Las paradas admiten `menu`, `shop`, `whenItem`, `take` y `unless`.
- El taller de iconos lee `img/items/drop/<enemigo>/` e `img/icons/buttons-ui/`.

## [1.9.3] - 2026-10-02

### ✨ Novedades
- ⚡ **La energía se guarda**: ya no vuelve a 0 en cada combate. Se acumula hasta 100 y solo se vacía al dormir en la posada. La barra de abajo la enseña junto a la vida y el maná.
- 🎒 **Botones del inventario que se ven activos**: Comer, Equipar y la pestaña abierta, en ámbar y con letra clara (antes parecían bloqueados).
- 🐛 **Iconos de efecto arreglados**: sobre el personaje salía su propio dibujo en miniatura en vez del icono (la calavera del veneno, la gota del sangrado…). Ahora sale el icono, solo y sin recuadro; las rondas, en la lista junto a la vida.
- 💥 **Números de combate rehechos**: más grandes, en negrita y cursiva con una fuente medieval (Grenze) y contorno grueso. El daño que recibes, en rojo; el que haces, en claro; el crítico, en oro; el de veneno, sangrado o quemadura, en su color y con su icono al lado. Nacen a la altura del pecho, suben un poco y se desvanecen sin salirse de la pantalla, también en el móvil.
- 🐛 **Retratos sin cruces**: al hablar con alguien ya no asoma un instante la cara de la conversación anterior (el goblin antes que Maela). Los retratos se cargan al entrar y cada cara espera a estar lista para salir.
- 💥 **Los efectos llegan con el golpe**: el icono y la etiqueta de un veneno, un sangrado o un aturdimiento aparecen en el instante del impacto, con el destello y el temblor, y no al pulsar el botón.
- ⚒️ **La Forja, más sencilla**: Filo afilado, Constitución y Buen ojo empiezan en 10 de oro y doblan su precio en cada nivel (10, 20, 40…). Cada nivel da un punto más que el anterior: +1, luego +2, luego +3 (de ATK, de vida o de oro por combate).
- 🧪 **Tienda más barata**: poción de vida a 20, hogaza de pan a 5. El tónico de hierbas ya no se vende (el que tengas sigue sirviendo).

## [1.9.2] - 2026-10-02

### ✨ Novedades
- ⚡ **Energía** (barra amarilla, 0 a 100): empieza cada combate vacía y se llena peleando: +5 al atacar, +5 al
  recibir daño y +10 al defenderte (que además encaja el golpe: defenderse es la forma más rápida de cargarla).
- 💥 **Golpe poderoso**, tercera ranura de la barra de habilidades: triple de daño y un 50 % de aturdir al enemigo
  1 turno, por 50 de energía.
- 💫 **Aturdido, sin carteles**: si te aturden, la barra se apaga, pierdes el turno solo y el enemigo aprovecha para
  actuar otra vez.
- ✨ **Efectos de estado más claros**: todos duran 3 rondas (el aturdimiento, 1 turno). Iconos más grandes sobre cada
  personaje, su nombre al ponerse y, junto a la vida, la lista de lo que llevas con las rondas que quedan.
- ⏳ **Combates con más peso**: ¡Atacar! espera 2 segundos antes de volver a pulsarse (con una franja que se vacía),
  las embestidas son más pausadas y quien recibe un golpe parpadea en blanco y tiembla.
- ❤️ **Barras de vida, maná y energía rehechas**: el marco ya no se deforma al estirarse y el relleno tiene brillo y
  sombra de pixel art. Las habilidades, justo bajo las acciones; en el móvil caben las seis.
- 🎭 **Más retratos en los diálogos**: Maela, los goblins esbirros y Grask, que se te echa encima más grande que nadie.
- 🗺️ **Mapa más limpio**: sin el cartel con el nombre de la escena y sin números en las paradas. Los enemigos solo
  llevan el punto rojo y la espada: no dicen quién te espera.
- ✍️ **Toda la historia, más llana**: introducción, diálogos, misiones y bestiario reescritos línea a línea en el
  habla de un pueblo, sin frases de adorno.
- 📜 **«Sobre Easy Hero»**, en Opciones, contado de nuevo: un juego en beta, gratis, sin cuenta y sin anuncios.
- 🏭 **Novela visual rápida** (para quien hace el juego): `npm run vn` crea NPC con retrato y diálogo, los revisa y saca
  capturas línea a línea; la fábrica de arte genera retratos (`portrait`); `?vn=<diálogo>` abre cualquier diálogo.

## [1.9.0] - 2026-10-02

### ✨ Novedades
- 🗺️ **Easy Hero es la aventura, entera**: la mazmorra queda aparcada. Ya no hay botón «La mazmorra», y la cueva del
  sur está sellada: al acercarte, un escalofrío y «todavía no estás preparado para entrar aquí».
- ✨ **Efectos de estado**: veneno, quemadura, sangrado, aturdido, más ATK, más PH y regeneración. Se ven como iconos
  sobre cada personaje, con las rondas que les quedan; al ponerse, su icono aparece en grande, y su daño o su cura
  sale en su color seguido del icono. Aturdido pierde el turno.
- 🐺 **Enemigos con mala idea**: los goblins a veces envenenan, los lobos hacen sangrar, Grask aturde con su golpe
  fuerte y Feronius hace las dos cosas.
- 💧 **Maná**: una barra azul (la mitad de tu vida inicial: 12). Las habilidades cuestan maná en vez de tardar en
  recargarse, y dormir en la posada lo devuelve. **Poción de maná menor** en la tienda.
- 🔮 **PH (Poder de Habilidad)**: estadística nueva. La **Bola de fuego** (antes «Golpe de Fuego») hace tu PH en daño.
- 🔥 **Barra de habilidades** bajo las acciones del combate: seis ranuras, con la Bola de fuego y el nuevo **Grito de
  guerra** (+50 % de ATK durante 3 rondas) a un clic; el resto, cerradas con candado.
- ⚔️ **El mercader vende armas**: ocho espadas nuevas, de 300 a 2000 de oro, cada una con su elemento y su efecto
  (veneno, sangrado, quemadura, aturdir, más ATK, más PH, regeneración). La Espada de Zafias también hace sangrar.
- 💎 **Cristal de mejora**: +1 ATK para siempre al arma equipada, hasta +3.
- 🧪 **Elixires** (de fuerza, arcano y tónico de hierbas), **frasco de veneno** para lanzar al enemigo y **pan** para
  curarte en el camino. La tienda, ordenada en Armas, Consumibles y La Forja.
- 🎒 **Inventario al estilo DragonFable**: el icono de cada objeto sobre el color de su elemento, el nombre en el color
  de su rareza y una ✔ en lo equipado. La ficha enseña la pieza tal cual (con brillo si es épica o legendaria) y, en
  «Vista previa», a tu héroe con ella. Lo que llevas encima también sale, y el pan se come desde ahí.
- 🎭 **Diálogos estilo novela visual**: quien habla aparece de cuerpo entero sobre el cuadro de texto, con su nombre en
  una etiqueta (de momento, Bram y tu héroe).
- ✍️ **Toda la historia reescrita**: la introducción, los 80 diálogos de Zafias, las misiones y el bestiario, con más
  tensión y alguna pista sobre quién eres.
- 🖼️ **Arte en vez de emoticonos**: barra de abajo como en DragonFable (tu nombre, vida y maná, oro, pociones,
  Inventario, Misiones y el objetivo); el menú, las paradas del mapa, los botones del combate, la tienda y los carteles
  de victoria y derrota, con sus iconos; botones de piedra en toda la página.

## [1.8.0] - 2026-10-02

### ✨ Novedades
- 🌅 **Una introducción para empezar**: la primera vez que entras despiertas a oscuras, sin recordar nada, en unas
  ruinas del bosque. Recuerdas tu nombre (lo escribes tú), encuentras tu espada de hierro y te pones en marcha hacia
  el pueblo más cercano: Zafias. Se puede saltar, y verla otra vez desde Opciones.
- 🧭 **Entras directo en la aventura**: el juego ya no abre con el menú de la mazmorra. La primera vez, la
  introducción; las siguientes, apareces donde dejaste la aventura. La mazmorra sigue a un clic (botón «La mazmorra»
  y la cueva del sur).
- ✍️ **Tu héroe tiene nombre**: Maela te llama por él, y aparece en la carta del héroe y en la mazmorra.
- 📜 **Diario de misiones** (botón «Misiones» de la aventura): la misión principal, «Descubre quién eres», y las
  secundarias con su progreso. Las cumplidas salen tachadas. Al recibir o cumplir una, aparece un aviso.
- 🔵 **Los NPC por colores**: azul si tiene una misión para ti, amarillo si solo habla, gris cuando ya cumpliste su
  encargo. Los puntos de interés también se ponen grises una vez vistos.
- 🐺 **Misión nueva: Dientes de lobo.** Bram, el herrero, te pide cinco; cada lobo vencido con la misión en marcha
  suma uno. La recompensa: el primer objeto de la aventura.
- ⚔️ **La Espada de Zafias** (ATK 2, el doble que la de hierro), forjada por Bram. **Cada espada tiene su propio
  dibujo del héroe**: al equiparla, tu héroe la lleva en el mapa y en el combate.
- 🎒 **Inventario de la aventura**, al estilo DragonFable: la lista a la izquierda y la ficha del objeto a la
  derecha, con tu héroe tal como se verá con él. Es permanente: no se pierde al caer.
- 🗑️ **Borrar progreso** (Opciones): con una advertencia antes; al confirmar, el juego vuelve a empezar desde la
  introducción.

### 🔧 Cambios
- La espada inicial se llama ahora **Espada de hierro**.
- Arreglo de cuatro pruebas que fallaban de vez en cuando por el azar del mapa (no eran fallos del juego).

## [1.7.1] - 2026-10-01

### ✨ Novedades
- 🐺 **Cada criatura con su tamaño**: los lobos llegan a media altura del torso de tu héroe, y Feronius es grande
  sin llenar la pantalla (en el combate y en el mapa). Bajo su nombre pone «Jefe de Zafias».
- 🚪 **Salidas que se encuentran**: cada salida es un cartel dorado que brilla, con una flecha hacia donde lleva y
  el nombre de la escena de destino. Si queda fuera de la pantalla, su cartel espera en el borde apuntando hacia
  ella, y se puede pulsar igual.
- 📜 Tras vencer a Grask, el objetivo avisa: «Algo aúlla al sureste del campamento».

## [1.7.0] - 2026-10-01

### ✨ Novedades
- 🗺️ **Zafias en alta resolución**: el mapa entero, rehecho pieza a pieza, con los caminos mucho más marcados.
  Se ve nítido aunque acerques la cámara.
- 🐺 **Feronius el Feroz, el jefe de Zafias**: una escena nueva, **la guarida del lobo**, al fondo del barranco del
  sureste. Se abre al vencer a Grask; un lobo guarda el paso y el lobo alfa espera en la boca de su cueva.
- 🐺 **Lobos en el bosque**: el Lobo de Zafias, con su dibujo propio, ronda el sendero del oeste y la subida de las
  ruinas.
- 🔍 **Puntos de interés**: paradas doradas que se miran en vez de pelearse. Algunas esconden un hallazgo (oro o una
  poción) la primera vez: el pozo de la plaza, un fardo en la orilla, las ruinas del vigía, el botín de Grask…
- 🧭 **Zafias más grande**: de 10 a 28 paradas numeradas. Una segunda salida de la aldea al bosque (el sendero del sur), el
  poste de los cruces, el puente viejo, el camino del norte, la escalinata del castillo y más goblins.
- ✒️ **Caminos que siguen el mapa**: las líneas a trazos van ahora por los caminos pintados, sin atravesar árboles.

### ⚖️ Equilibrio
- **Zafias se puede terminar empezando de cero.** Antes, un héroe nuevo necesitaba unos 250 combates de
  entrenamiento para vencer a Grask. Los enemigos de Zafias bajan de piso (es la primera zona) y Grask queda como un
  primer muro: unos 16 combates de entrenamiento si juegas bien (defenderse de los golpes fuertes y beber a tiempo).
  Feronius se vence hacia el nivel 4, perdiendo dos tercios de la vida.

### 🔧 Cambios
- 🐾 **Criaturas con nombre** (`src/data/creatures.js`): enemigos fijos con ficha propia. Ya están dibujados y listos
  para el próximo mapa el **gnoll**, el **gnoll berserker**, **Gnarok, el jefe gnoll**, el **orco**, el **orco
  guerrero** (armadura negra), el **orco chamán** y **Guul, el rey orco**.
- 🛤️ Herramientas para montar zonas: `assemble-map` (recompone el mapa HD), `zone-overlay` (cuadrícula para colocar
  paradas) y `trace-paths` (traza solos los caminos aprendiendo el color del camino del propio mapa). Receta en
  `docs/zonas.md`.
- 🧪 Pruebas nuevas: integridad de las zonas, criaturas, un recorrido completo del final de Zafias en el navegador y
  un banco de equilibrio de la aventura (`npm run sim:aventura`).

## [1.6.0] - 2026-10-01

### ✨ Novedades
- 🎨 **Los primeros enemigos con dibujo propio**: el **Orco** y **Grask, el jefe goblin**, dejan de ser el goblin
  teñido. Grask se ve en el mapa del campamento y en su combate, más grande que tú.
- 🏭 **Fábrica de arte** (`npm run generate`): genera enemigos, jefes, personajes, fondos de combate y mapas con
  un mismo estilo (pixel art de fantasía oscura), les quita el fondo y los deja listos en el juego. Es lo que
  permitirá que cada criatura tenga su propia imagen.
- 🧭 **Aventura más legible**: iconos y números de las paradas más grandes, y los enemigos ya no tapan su punto.
- 🕳️ **Vuelta a la aldea**: si bajas al descenso desde la cueva de Zafias y la ruta termina, regresas a la aldea.

### 🔧 Cambios
- 🖼️ **Taller de sprites** (`npm run sprites`): los PNG de `img/entrantes/` se recortan, se alinean por los pies y
  se guardan en WebP, y quedan registrados en `src/data/art.js`.
- ⚔️ En el combate, un monstruo con imagen propia la usa sin tinte y con su proporción real; el héroe también si
  tiene `heroe_*`. Los demás siguen siendo el goblin teñido de siempre.
- 🛠️ Producción: pruebas automáticas en cada cambio (GitHub Actions), publicación solo si pasan, y vistas
  previas de cada propuesta en Cloudflare.

## [1.5.1] - 2026-09-30

### ✨ Novedades
- 🗺️ **Zafias como un mapa antiguo**: los caminos se dibujan a trazos de tinta y las paradas son puntos rojos que
  laten, numerados 1-1, 1-2, 1-3… Tu héroe anda por el camino de parada en parada. Un enemigo sin vencer corta el
  paso, y al vencerlo su parada queda marcada con ✓.
- 🚪 Las salidas a otra escena son puntos dorados que no laten, para distinguirlas de las paradas.

### 🔧 Cambios
- Si huyes de un enemigo del camino, sigues delante de él: no se puede cruzar sin vencerle.
- Las zonas del Modo Aventura se describen ahora como paradas, cruces y caminos entre ellos (el paso previo a un
  editor de zonas).
- Capturas nuevas de la aventura en el README.

## [1.5.0] - 2026-09-30

### ✨ Novedades
- ⚔️ **Combate de lado**: tu héroe a la izquierda y el enemigo a la derecha, sobre un bosque pintado. Al atacar,
  cada uno se lanza hacia el otro, el daño sale encima del golpeado y vuelve a su sitio. De momento todos los
  enemigos se ven como un goblin.
- 🧭 **Modo aventura: Zafias.** Un botón nuevo en el inicio abre el mapa de Zafias, que se recorre escena a
  escena con tu héroe de siempre (nivel, primarias, Forja, oro y pociones compartidos).
  - **La primera misión**: Maela, la posadera, te pide echar a los goblins del bosque. Vencidos los tres, se abre
    el sendero al **campamento goblin**, con su guardia y **Grask**, el jefe. Vuelve con ella a por la recompensa.
    El objetivo de la misión está siempre a la vista.
  - **Combates de verdad** contra los enemigos que ves en el mapa, en la misma pantalla de lado.
  - **La aldea**: la **posada** (dormir cura del todo y los goblins vuelven a los caminos), la **tienda** (La
    Forja y las pociones) y la **cueva del sur**, que baja al descenso.
  - Si caes, despiertas en la posada con la vida llena y un 10 % menos de oro. Tu progreso se guarda solo.
- 🎨 Mientras no haya arte de cada monstruo, el goblin se tiñe con un color por especie y otro por linaje
  (la Plaga en verde tóxico, las Brasas en fuego…), y los sub-jefes y jefes se ven más grandes.
- 🌬️ **Los golpes fuertes se ven venir**: una frase sobre el escenario y el enemigo brillando en rojo, sin cifras.

- 📜 **Panel de pergamino** bajo el escenario: tu vida a la izquierda, la del enemigo a la derecha y en el centro
  un gran **¡Atacar!** con el resto de acciones a un clic (Defender, cada habilidad, Poción y Huir).
- 🧪 **Pociones**: curan el 40 % de tu vida a cambio del turno. Se compran en La Forja (40 de oro), llevas hasta
  3 y no se pierden entre partidas.
- 🏆 El final del combate es un cartel sobre el propio escenario.

### 🔧 Cambios
- **El enemigo ya no anuncia lo que va a hacer.** Sigue teniendo su forma de pelear (cargar, protegerse,
  curarse), pero hay que aprenderla; el diario la delata.
- La variante «de la Niebla» ya no oculta nada (no hay nada que ocultar): ahora su primer golpe hace el doble.
- El diario del combate va plegado y enseña solo la última línea.
- Los números de daño ya no salen sobre las cartas, sino en el escenario. Se deja de cargar GSAP desde internet.

## [1.4.2] - 2026-09-30

### ✨ Novedades
- 🗺️ **El mapa ocupa el centro, con el equipo a un lado y el personaje al otro**, siempre a la vista. Los dos
  paneles te siguen al bajar por el mapa, así que nunca pierdes de vista tu vida ni lo que llevas puesto. El
  panel del personaje reúne vida, ataque, nivel, experiencia, las 4 primarias y el oro; la cabecera queda solo
  con las acciones.
- 🏚️ **El mapa ya parece una mazmorra**, no un grafo: pasillos curvos excavados en roca en lugar de líneas
  rectas, salas ligeramente descolocadas (se acabó la rejilla perfecta), y **la antorcha del héroe** iluminando
  lo que tiene alrededor.
- 🌫️ **La niebla de guerra es un hueco sin dibujar**: más allá de lo que ilumina tu antorcha no ves salas ni
  iconos, solo se intuyen los túneles que siguen hacia abajo.

### 🐛 Correcciones
- Los últimos restos del azul-índigo antiguo (fondo del mapa, salas, pasillos, etiqueta del jefe en niebla)
  pasan a la paleta de piedra y forja.
- La ficha de un monstruo en el mapa enseñaba sus estadísticas del primer tramo aunque estuvieras más abajo.

### 🛠️ Por dentro
- Corregida una prueba de navegador que fallaba ~1 de cada 4 veces desde la 1.4.1: tras ganar un combate normal
  podía caer botín, y la prueba daba por hecho que volvías al mapa. Ahora se valida también con el 100 % de
  combates soltando botín. 8 comprobaciones nuevas (182 en el navegador).

## [1.4.1] - 2026-09-29

### ✨ Novedades
- ⚔️ **El equipo ya no se oculta.** Una columna fija junto al mapa muestra siempre las 4 ranuras, con nombre,
  rareza y lo que da cada objeto — sin abrir ningún botón. También aparece junto al botín, para comparar sin
  cambiar de pantalla. Lo que sí se sigue ocultando tras un botón es el inventario.
- 🎁 **El botín ya no se elige 1 de 3: cae un solo objeto.** Elegir el mejor de tres hacía que el 87 % de los
  botines fueran verdes o mejores aunque la tabla diga que la mitad son grises — se veía el máximo de tres
  tiradas, no la distribución real. Ahora lo que cae es lo que cae.
- 🩸 **Los combates normales también sueltan botín**, de vez en cuando (1 de cada 4) y casi siempre gris: es el
  goteo constante. Lo bueno se sigue ganando en cofres y, sobre todo, en sub-jefes.

### ⚖️ Equilibrio
- Recalibrado tras el cambio de botín (el equipo llega más débil sin el «mejor de tres»): `hpPerFloor` 2,9 → 2,0.
  El sensato vuelve a vencer al primer jefe ~40 % de las veces.
- **Corregido un fallo de la 1.4.0**: el botín se fabricaba con el piso *dentro del tramo* (0-15) en vez de la
  profundidad real, así que en tramos hondos el equipo se quedaba congelado mientras los monstruos escalaban sin
  freno. Ahora usa la profundidad absoluta.

### 🛠️ Por dentro
- `Items.rollLootDrop` sustituye a `rollLootOffers`; `RARITY_BIAS` en `data/rarities.js` sesga la rareza según el
  origen del botín (combate, cofre, hoguera, sub-jefe). `RPG_BALANCE.loot.combatDropChance = 0.25`.
- `gearPanelHtml()`/`renderGearPanel()` en `src/ui.js`, reutilizados en el mapa y en la pantalla de botín.
- **Nuevo harness de fuzzing** (`tools/harness/`, `node tools/harness/run-all.mjs`): 103.000 comprobaciones
  de propiedades que complementan `npm test`. Encontró y corrigió 2 bugs reales (uno en el simulador del
  banco de equilibrio, otro de robustez en los logros); detalle en
  [docs/harness-hallazgos.md](docs/harness-hallazgos.md).

## [1.4.0] - 2026-09-29

### ✨ Novedades
- 🕳️ **El descenso no tiene fin.** Vencer al Dragón ya no acaba la partida: el suelo se abre y bajas a un tramo
  nuevo de 16 pisos, **con la vida al completo** y todo tu equipo. Cada tramo pega y aguanta un 50 % más que el
  anterior (acumulativo) y da un 60 % más de oro. La ruta termina cuando caes, y tu marca es **la profundidad**.
- ⚒️ **La Forja**: por fin hay dónde gastar el oro. **8 mejoras permanentes** que no se pierden nunca: cuatro se
  compran una y otra vez, cada vez más caras (ataque, vida, oro y experiencia), y cuatro son hitos de una sola
  compra (empezar con arma, ver más lejos en el mapa, 15 ranuras de inventario y primer cofre de rareza alta).
  Se entra desde el inicio y desde la pantalla de fin de ruta, que es donde se cierra el bucle.
- ⛏️ **Expedición**: la mazmorra rinde oro mientras no juegas, hasta un tope de 8 horas, y rinde más cuanto más
  hondo hayas llegado. Al volver te espera el botín.
- 👾 **90 monstruos en 6 elencos y 6 jefes distintos.** El primer tramo es la mazmorra de siempre; cada tramo
  nuevo estrena 15 criaturas que no habías visto y su propio guardián.
- 🧬 **Variantes de monstruo**: un adjetivo y/o un linaje sobre el nombre base — *«Orco Colérico de la Plaga»*.
  **22 variantes** con efecto real: púas que te hieren al golpear, resistencias que te obligan a cambiar de arma,
  esquiva, furia al verse herido, robo de vida, veneno y quemadura sobre ti, un golpe póstumo al caer y
  **«de la Niebla»**, que te oculta la intención del enemigo. Aparecen más a menudo cuanto más bajas, y nunca en
  los primeros pisos.
- 🏅 **7 logros nuevos** (22 en total) y los del bestiario reescalados a 25 / 50 / 104, ahora que hay tanto que ver.
  Las variantes se coleccionan como **medallas** dentro de la ficha de cada monstruo, sin inflar el panel.

### ⚖️ Equilibrio
- Vencer al primer jefe pasa de ser el final del juego a ser **la puerta del bucle**, así que ahora la cruza mucha
  más gente: un jugador sensato **sin ninguna mejora comprada** lo vence el **39 %** de las veces (antes el 22 %),
  el experto el 53 % y el que solo ataca el 3 %. Palancas movidas: `hpPerFloor` 3,6 → 2,9 y `atkPerFloor` 0,4 → 0,34.
- La dificultad de verdad ya no está en el primer jefe, sino en **hasta dónde aguantas bajando**.

### ⚠️ Decisión de diseño
- Esto **entierra definitivamente** la regla «meta-progresión solo horizontal, nunca poder fijo» del principio del
  proyecto, que ya se había reabierto en la 1.3.0. Ahora la progresión permanente es el motor del juego. Decisión
  explícita del usuario. Detalle en [historial.md](historial.md).

### 🛠️ Por dentro
- `src/data/variants.js` y `src/data/upgrades.js` nuevos; `rpgMonsterStats(tipo, piso, tramo)` y `meta.upgrades`.
- Las variantes se sortean con un **hash del nodo y la semilla**, sin consumir azar del motor: la misma semilla
  sigue dando el mismo mapa y los mismos eventos que antes.
- `SAVE_VERSION` sube a 4 (la partida lleva el tramo): las partidas a medias de la 1.3.1 se descartan con aviso.
- 717 comprobaciones en verde, 46 de ellas nuevas.

## [1.3.1] - 2026-09-22

### ✨ Novedades
- 🗺️ El mapa se dibuja al revés: los primeros monstruos aparecen **arriba** y el jefe final al fondo, abajo. Es
  puramente visual: el mapa en sí (qué piso es cada cosa) no cambia.
- 🌫️ **Niebla de guerra**: lo que queda a más de 3 pisos por delante de tu posición se ve cubierto (❓), sin
  revelar de qué se trata, hasta que te acerques; el jefe final se anuncia como «???» hasta entonces. Se despeja
  sola a medida que avanzas por la ruta.
- 👾 El icono de monstruo cambia de 👹 a 👾.

### 🛠️ Por dentro
- Todo el cambio vive en `renderRpgMap` (`src/ui.js`): se invierte el eje del piso en `pos()` y se añade
  `RPG_FOG_AHEAD` para decidir qué nodos se cubren. No toca el motor ni los datos del mapa.

## [1.3.0] - 2026-09-22

### ✨ Novedades
- 🧬 **Estadísticas primarias**: Fuerza, Destreza, Inteligencia y Vitalidad. Generan tu ATK, tu vida máxima, tu probabilidad de **crítico** y de **esquiva**, y tu **resistencia física** — sin cambiar nada de lo ya calibrado (con las 4 en su valor base, el héroe se comporta exactamente igual que antes de que existiera este sistema).
- ⚔️ **Físico y elemental, según el arma**: Filo/Contundente/Perforante los potencia la Fuerza; Veneno/Fuego/Rayo, la Inteligencia. Cambiar de arma cambia qué estadística importa.
- 🧬 **Nivel de personaje, PERMANENTE**: ganas experiencia al vencer combates, subes de nivel y repartes tú mismo los puntos entre las 4 primarias, desde la pantalla de Personaje. A diferencia del equipo (que se reinicia cada ruta), el nivel y los puntos invertidos **te acompañan para siempre**, en todas tus partidas futuras.

### ⚠️ Decisión de diseño
- Esto **reabre a propósito** la regla «meta-progresión solo horizontal, nunca poder fijo» fijada al principio del proyecto: ahora sí hay una fuente de poder permanente entre partidas. Decisión explícita del usuario, con conocimiento de la regla que cambia. Detalle en [historial.md](historial.md).

### 🛠️ Por dentro
- `src/stats.js` nuevo (fórmulas puras); `meta.charLevel/xp/statPoints/primary` en `src/meta.js`; `SAVE_VERSION` sube a 3 (las partidas de antes de este cambio se descartan con aviso).
- 39 comprobaciones nuevas en `tests/stats-sim.mjs`; 26 nuevas en `tests/browser.test.mjs`.

## [1.2.0] - 2026-09-22

### ✨ Novedades
- 🧍 **Pantalla de Personaje**, propia y accesible desde el mapa: tu héroe con sus 4 ranuras de equipo conectadas visualmente, un inventario de **10 ranuras** y el oro acumulado.
- 🎒 **Inventario**: los cofres, hogueras y botín de sub-jefe ya no obligan a decidir en el momento — ahora puedes **guardar** un objeto sin equiparlo (si hay hueco) y decidir más tarde. Al equipar algo, lo que llevabas puesto pasa al inventario en vez de perderse.
- 🪙 **Oro**: los monstruos dejan monedas al ser vencidos (más los sub-jefes, mucho más el jefe final). Se acumula para siempre, incluso si mueres. Todavía no hay dónde gastarlo.
- 🐉 **El trofeo del jefe**: al vencer al Dragón Ancestral te quedas con un objeto legendario que te acompaña en **todas las rutas futuras**, para siempre, sin ocupar una ranura del inventario normal. Si lo ganas más de una vez, eliges quedarte con el nuevo o conservar el que ya tenías.

### 🛠️ Por dentro
- `hero.inventory` (10 ranuras) y `hero.trophy` en `src/engine.js`/`src/items.js`; `meta.gold` y `meta.trophyItem` en `src/meta.js`, persistentes.
- 26 comprobaciones nuevas en `tests/items-sim.mjs` (148 en total) y 19 nuevas en `tests/browser.test.mjs` (142 en total).
- Bug corregido: `saveMeta(null, …)` devolvía `true` sin haber guardado nada.

## [1.1.0] - 2026-09-22

### ✨ Novedades
- 🏰 **Nueva dirección visual**: fantasía oscura de mazmorra (piedra y forja) en vez de la paleta índigo/Inter por defecto. Tipografía Cinzel para títulos, Work Sans para el resto.
- 📖 **Bestiario**: cada monstruo, sub-jefe, jefe y enemigo de evento (24 en total) se revela al cruzártelo, y se marca en verde al vencerlo. Persiste entre partidas.
- 🎒 **Colección**: las 122 bases de objeto se van descubriendo (con las rarezas en que las has visto) a medida que aparecen en cofres, hogueras y botín de sub-jefe.
- 🏆 **15 logros**, solo información y orgullo (nunca poder): desde «Primera sangre» hasta «Naturalista» (bestiario completo). Se anuncian en la pantalla de fin de ruta.
- 💾 **Importar / exportar** tu progreso (ruta en curso + bestiario + colección + logros) como un texto para copiar y guardar.
- ⚙️ Panel de **Opciones** con la semilla de la ruta actual y un «Sobre Easy Hero».
- 🧭 Menú fijo en la cabecera para abrir estos 4 paneles en cualquier momento, sin abandonar la ruta.

### 🛠️ Por dentro
- Progreso persistente en `src/meta.js` (independiente del guardado de la partida).
- 10 comprobaciones nuevas en `tests/browser.test.mjs` (123 en total).

## [1.0.2] - 2026-09-22

### ✨ Novedades
- 🎒 **Equipo: 4 ranuras y 5 rarezas.** Tu héroe lleva arma primaria (define el **tipo de daño**: Filo, Contundente, Perforante, Veneno, Fuego o Rayo), secundaria (escudo, daga o foco), armadura y accesorio. **122 objetos** de base, con **⚪ Común, 🟢 Poco común, 🔵 Rara, 🟣 Épica y 🟠 Legendaria** (cada una con más afijos y más poder, y las legendarias con un rasgo único).
- 🧰 **Los cofres ya solo dan objetos**: eliges 1 de 3, lo comparas con lo que llevas puesto y decides **equiparlo** (pierdes el anterior) o **descartarlo** (te cura). El piso 1 siempre es un cofre: tu primera decisión de equipo.
- 🔥 La hoguera ahora ofrece **Descansar** o **Equiparte** (1 de 3 objetos, mínimo 🟢). El botín de un **sub-jefe** es siempre 🔵 o mejor.
- 🎯 **24 afijos** con efecto real en combate: golpe furtivo, golpe extra, golpe de gracia, frenesí, venganza, espinas, robo de vida, última defensa, determinación, huir sin daño, resistir al Lector, curas al empezar/defender/vencer un combate, mejoras al Golpe de Fuego (más daño, menos enfriamiento, quemadura)…
- ☠️🔥 **Veneno y quemadura**: nuevos estados que se ven en la carta del enemigo y hacen daño ronda a ronda.
- 🗡️ La vista previa de Atacar ahora es exacta, incluidos los golpes extra y lo que reduce un enemigo que se protege.

### ⚖️ Equilibrio
- El poder ya no viene de vencer combates (eso ya no da +ATK ni +HP): viene del **equipo** que encuentras.
- Monstruos algo más duros (`atkPerFloor 0,4`, `hpPerFloor 3,6`) para compensar el poder del equipo: con 1000 partidas por bot, el jugador **sensato gana el 22 %** (objetivo ~20 %), el experto el 38 % y el torpe el 1 %.
- Detalle y método actualizados en [docs/equilibrio.md](docs/equilibrio.md).

### 🛠️ Por dentro
- El contenido de objetos (rarezas, bases y afijos) vive en `src/data/`; la fabricación, equipar/descartar y el botín en `src/items.js`.
- El guardado incluye el equipo del héroe y el botín pendiente (`SAVE_VERSION 2`): las partidas de la 1.0.1 se descartan con aviso.
- **122 comprobaciones nuevas** sobre la fabricación, el equipo y las reglas en combate (`tests/items-sim.mjs`).

## [1.0.1] - 2026-09-21

*Lo primero que se hizo tras la 1.0: que el juego se pueda ganar, se entienda lo que pasa y no se pierda la partida.*

### ✨ Novedades
- 👁️ **Ves lo que va a hacer el enemigo antes de elegir.** Sobre cada enemigo aparece su próximo movimiento (`⚔️ Ataca 5`, `💥 Golpe fuerte 9`, `⚡ Reúne fuerzas`, `🛡️ Se protege`, `💚 Se cura`, `💤 Descansa`) y es exactamente el que hará. Los botones te dicen cuánto recibirías si te defiendes.
- 👹 **15 monstruos distintos**, uno por piso, y **3 sub-jefes y un jefe**, cada uno con su forma de atacar: el Goblin carga y golpea fuerte, el Esqueleto se protege, el Murciélago se cura…
- 🔥 **Hogueras.** Descansa (cura el 30 % de tu vida máxima) o afila tu arma (+1 ATK). Hay una **siempre antes del jefe**, y todo camino pasa por al menos dos.
- 💀 **Los sub-jefes son opcionales.** Desde cualquier punto del mapa siempre puedes elegir un camino sin ellos.
- 💾 **Guardado automático.** Cierra la pestaña y sigue donde lo dejaste, incluso en mitad de un combate o de un evento. En el inicio aparece **CONTINUAR LA RUTA** con tu piso, tu vida y tu semilla.
- 🏁 **Pantalla final** al ganar o perder: quién te venció, hasta qué piso llegaste, tus datos, los eventos que viviste y una línea de **«casi»** (cuánta vida le quedaba al enemigo). Desde ahí: nueva ruta, **repetir con la misma semilla** o volver al inicio.
- 🌱 **Semilla.** Cada ruta tiene un código (`K3F9-2QA`). También puedes escribir el tuyo (cualquier texto sirve) en la pantalla de inicio: la misma semilla da el mismo mapa, y los mismos eventos si tomas las mismas decisiones.
- 🏷️ La cabecera muestra la **versión del juego**.

### ⚖️ Equilibrio
- El juego ya se puede ganar: un jugador medio gana **~1 de cada 5 partidas** (medido con miles de partidas simuladas).
- Un combate normal cuesta un **6-17 %** de la vida (antes, el 20-30 %).
- Un sub-jefe se puede vencer con la vida completa (cuesta el 23-42 %).
- El jefe final tiene más vida y más ataque que cualquier sub-jefe.
- Detalle y método en [docs/equilibrio.md](docs/equilibrio.md).

### 🐛 Correcciones
- Defender ya no queda «guardado» para la ronda siguiente: cubre solo el golpe de la ronda en curso.
- En la pantalla final los valores a cero se veían vacíos.
- Un texto con espacios o guiones como semilla daba un resultado distinto según cómo se escribiera.

### 🛠️ Por dentro
- Todo el azar de una partida sale de **un solo generador con semilla** (que se guarda y se retoma).
- Los números de equilibrio viven en un solo archivo (`src/data/balance.js`).
- **Banco de equilibrio** (`npm run balance`) con tres bots (torpe, sensato y experto) y un **vigilante** que avisa si un cambio deja el juego injugable.
- **380 comprobaciones automáticas** (motor, eventos, guardado, equilibrio y navegador).
- Sistema de versiones con comprobación automática.

## [1.0.0] - 2026-09-21

*La primera versión completa del juego.*

### ✨ Novedades
- 🗺️ **Mapa de 16 pisos** con 7 columnas y 6 caminos que se ramifican, distinto en cada partida.
- ⚔️ **Combate por turnos** con menú: Atacar, Defender, Habilidades (Golpe de Fuego) y Huir.
- 🎲 **15 eventos**, cada uno con una situación y **dos decisiones** que cuestan algo: la chica herida, el extraño encapuchado, el cofre susurrante, el campamento, el espejo oscuro, el caballero caído, el pozo de los deseos, el puente de cuerdas, la puerta sellada, el alquimista, el derrumbe, el juicio de las hermanas, el voto, el maestro errante y **El Lector**.
- 🧠 **El Lector**, un enemigo que lee tus movimientos: si repites la acción, su golpe hace el doble.
- 🤞 **Votos y lecciones** que cambian tu forma de jugar (renunciar a huir, renunciar a las habilidades, mejorar el Golpe de Fuego…) y **afinidades** ya registradas para el futuro.
- 💀 Nodos de cofre, sub-jefe y **jefe final**.
- 📱 Funciona en móvil y en ordenador, sin instalar nada. Publicado en GitHub Pages.

### ⚠️ Conocido
- El equilibrio era provisional: el jefe final era prácticamente inalcanzable (se corrigió en la 1.0.1).
