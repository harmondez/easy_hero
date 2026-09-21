# 🎲 Eventos — plan de los 15

> Estado: **los 15 eventos están implementados** (contenido en `src/data/events.js`, lógica en `src/events.js`).
> Los números son provisionales y usan la escala actual (héroe ATK 1 · HP 25; +1 ATK por combate ganado).
> Los 15 salen de forma aleatoria en las rutas procedurales, sin repetirse en la misma partida.
> Al final de este documento están las decisiones que se tomaron al implementarlos.

## Regla de oro

Todo evento tiene **una situación** y **exactamente 2 decisiones**. Ninguna decisión es "correcta" sin más:
cada una cuesta algo o arriesga algo. Si una opción domina siempre, el evento no vale.

## Los 10 eventos

| # | Evento | Situación | Decisión A | Decisión B |
|---|--------|-----------|------------|------------|
| 1 | 🩹 **La chica herida** | Una joven herida pide ayuda en plena mazmorra. | **Ayudarla** → sonríe y aparecen **3 bandidos**: ¡era una emboscada! Combate. Si ganas, botín: **+1 ATK**. | **Ignorarla** → sigues tu camino. Nada. |
| 2 | 🥷 **El extraño encapuchado** | Una figura encapuchada te hace una seña: «Conozco esta mazmorra. Dame la mano y te enseñaré el camino». | **Confiar en él** → 2 de cada 3: te guía y comparte su botín (**+1 ATK y +8 HP**). 1 de cada 3: era un ladrón (**−8 HP**). | **Rechazarlo** → se encoge de hombros y desaparece. Nada. |
| 3 | 📦 **El cofre susurrante** | Un cofre murmura tu nombre. | **Abrirlo** → 50 %: **+2 ATK**. 50 %: era un **mímico** (combate). | **Dejarlo** → nada. |
| 4 | 🏕️ **El campamento abandonado** | Brasas aún calientes, nadie a la vista. | **Descansar** → **curas 10 HP**, pero 1 de cada 3 veces algo te encuentra dormido (combate sin poder huir). | **Registrarlo** → **+1 ATK**, pero una trampa te hiere: **−4 HP**. |
| 5 | 🪞 **El espejo oscuro** | Tu reflejo te sostiene la mirada… y se mueve solo. | **Enfrentarlo** → duelo contra una **copia de ti** (mismo ATK y HP, sin poder huir). Si ganas: **+1 ATK y +5 HP máx**. | **Apartar la mirada** → nada. |
| 6 | 🗿 **La estatua del caballero caído** | Una estatua sostiene una espada con un brillo extraño. | **Rendirle honores** → **+6 HP máx**. | **Saquear la espada** → **+2 ATK**, pero la maldición te cuesta **−8 HP**. |
| 7 | ⛲ **El pozo de los deseos** | Un pozo antiguo, con monedas en el fondo. | **Desear salud** → **curas 12 HP**. | **Desear poder** → **+1 ATK**, pero pagas **−4 HP**. |
| 8 | 🌉 **El puente de cuerdas** | Un puente medio podrido cruza el abismo: acorta la ruta. | **Cruzarlo** → **te saltas un piso**. 1 de cada 3 veces cedes y caes: **−6 HP**. | **Rodearlo** → sigues el camino normal. |
| 9 | 🚪 **La puerta sellada** | Una puerta de piedra, sellada por una fuerza antigua. | **Forzarla** → si tu **ATK ≥ 4**, **+2 ATK** y **+5 HP máx** del tesoro. Si no, el esfuerzo te cuesta **−6 HP** y nada más. | **Buscar otro camino** → nada. |
| 10 | ⚗️ **El alquimista errante** | Un anciano ofrece una pócima sin etiqueta. | **Beberla** → al azar: **+2 ATK y −6 HP** · **curación completa** · **+8 HP máx y −1 ATK**. | **Rechazarla** → **+3 HP** (te da un tónico de consuelo). |

## ✨ Los 5 eventos especiales

Siguen la regla de las 2 decisiones, pero **cuesta mucho más elegir**: las consecuencias llegan más tarde, hay
información oculta o renuncias a algo para siempre. Lo que le cuesta o le da a cada jugador depende de su build.

| # | Evento | Situación | Decisión A | Decisión B |
|---|--------|-----------|------------|------------|
| 11 | 🪨 **El derrumbe** | El techo cede y atrapa a dos personas bajo las vigas: **Elena**, una niña de ocho años, y **Bram**, un herrero que conoce el oficio de reforjar armas. Solo te da tiempo de levantar una viga. **No hay opción de marcharte.** | **Salvar a Elena** → esfuerzo: **−5 HP**. Ella te regala el colgante de su madre: **+8 HP máx**. Bram muere bajo la viga. | **Salvar a Bram** → esfuerzo: **−5 HP**. Agradecido, **reforja tu arma**: **+2 ATK**. Elena muere bajo la viga. |
| 12 | ⚖️ **El juicio de las hermanas** | Mara y Lira se acusan de haber robado un amuleto. Una miente. Mara sostiene tu mirada sin pestañear; Lira tiene barro fresco en las botas y evita hablar del pasillo sur. | **Creer a Mara** → si Lira mentía: **+2 ATK y +5 HP máx**. Si mentía Mara: la traición te cuesta **−8 HP**. | **Creer a Lira** → si Mara mentía: **+2 ATK y +5 HP máx**. Si mentía Lira: **−8 HP**. |
| 13 | 🤞 **El voto** | Un monje te ofrece poder a cambio de renunciar a algo para siempre. | **Voto de Acero** → **+3 ATK y +6 HP máx**, pero **no podrás Huir** el resto de la ruta. | **Voto de Silencio** → **+2 ATK y +12 HP máx**, pero **no podrás usar Habilidades** el resto de la ruta. |
| 14 | 🥋 **El maestro errante** | Un maestro te enseñará una sola lección. Elige bien. | **La vía del acero** → **+2 ATK y +6 HP máx**. Afinidad **⚔️ Guerrero +2**. | **La vía de la llama** → **Golpe de Fuego** pasa a **8 de daño** y a enfriarse en **2 rondas**. Afinidad **🔥 Elementalista +2**. |
| 15 | 👁️ **El Lector** | Un ser de cientos de ojos bloquea el paso: «Nadie cruza sin responderme… o sin vencerme». | **Plantarle cara** → te hace **3 preguntas** antes de pelear. Según cuántas aciertes, **evitas el combate** o lo peleas más o menos débil (ver abajo). | **Retroceder en silencio** → evitas todo. Nada. |

#### El Lector: cómo funciona

El único evento con **varias pantallas**. Todas siguen la regla de las 2 decisiones: cada pregunta ofrece 2 respuestas.

| Aciertos | Resultado |
|:--------:|-----------|
| **3 de 3** | Impresionado, **te cede el paso sin pelear** y te da su bendición: **+2 ATK y +8 HP máx**. |
| **2 de 3** | Duda de ti: pelea **debilitado** (empieza con un 40 % menos de HP). |
| **0 o 1** | Pelea **a pleno poder**. |

**El combate.** Es el enemigo más fuerte de la primera mitad de la ruta: los stats de un sub-jefe de ese piso con
**+50 % de HP y +2 ATK**. No se puede huir. Además es **inteligente**: *lee tus movimientos*. Si repites la misma acción
dos veces seguidas, su siguiente golpe hace **el doble de daño**. Obliga a alternar entre Atacar, Defender y Habilidades.
Si lo vences: **+3 ATK y +10 HP máx**. Ganar pelea es más rentable que un 3/3, pero mucho más arriesgado.

**Las preguntas.** Se sortean 3 de un banco de adivinanzas (empezamos con 6, así no siempre son las mismas):

| Pregunta | Correcta | Incorrecta |
|----------|----------|------------|
| «Cuanto más me quitas, más grande soy. ¿Qué soy?» | Un agujero | Una montaña |
| «Tengo ciudades pero no casas, ríos pero no agua. ¿Qué soy?» | Un mapa | Un espejo |
| «Si me nombras, dejo de existir. ¿Qué soy?» | El silencio | La oscuridad |

### Por qué son difíciles de elegir

| # | Qué hace difícil la decisión |
|---|------------------------------|
| 11 | Es el único evento **sin salida neutral**: hay que elegir a quién dejas morir. Elena es el corazón (una niña, un premio de aguante); Bram es la cabeza (poder ofensivo). Las dos recompensas valen casi lo mismo a propósito, así que no hay respuesta que sea solo cálculo. |
| 12 | **Información oculta.** Hay pistas en el texto, pero no es una certeza. Una es real, la otra engaña. |
| 13 | Es **permanente**. Vale distinto según tu build: un guerrero pierde poco sin Habilidades, un elementalista lo pierde casi todo. |
| 14 | Define **quién serás**. Las afinidades se activarán en M2; la elección ya cuenta desde ahora. |
| 15 | **Riesgo escalonado.** Entras sin saber si sabrás las respuestas. Fallar no te elimina, pero te deja ante un combate muy duro, y un 3/3 rinde menos que ganar. Además el combate exige alternar tus acciones. |

### Lo que necesitan del motor

Los especiales exigen mecanismos nuevos que los 10 primeros no piden:

| Mecanismo | Lo usan | Qué es |
|-----------|---------|--------|
| **Eventos de varias pantallas** | 15 | Un evento que encadena preguntas y decide el resultado por los aciertos. Cada pantalla mantiene sus 2 opciones. |
| **Enemigo con IA** | 15 | Un campo `ai` en el enemigo, que el combate consulta. El Lector recuerda tu última acción y castiga que la repitas. |
| **Votos** | 13 | Prohibiciones permanentes en el héroe: `noFlee`, `noSkills`. El motor de combate las consulta. |
| **Modificadores de habilidad** | 14 | `skillMods` en el héroe (daño y enfriamiento de Golpe de Fuego). |
| **Verdad oculta** | 12 | Se sortea al entrar al evento (con la semilla) quién miente, y las pistas del texto se generan según ese dato. |

## Por qué los 10 primeros

Cada evento cubre un tipo de decisión distinto, para que no se sientan repetidos:

| Tipo | Eventos |
|------|---------|
| Confianza / engaño | 1, 2 |
| Sacrificio por poder | 6, 7 |
| Azar | 2, 3, 10 |
| Descanso o riesgo | 4 |
| Combate opcional con premio | 1, 3, 5 |
| Decisión sobre la **ruta** | 8 |
| Depende de **tu build** (stats) | 9 |

## Dependencias con el resto del plan

| Evento | Necesita | Mientras tanto |
|--------|----------|----------------|
| 1 | Varios enemigos (M1) | Un único **bandido jefe** con los stats de los 3 sumados |
| 5 | Nada nuevo | La copia usa el héroe actual |
| 8 | Que el mapa deje **saltar un piso** | Requiere un cambio pequeño en el generador y en `rpgAvailableNodes` |
| Todos | Afinidades (M2) | Cada opción llevará una etiqueta de afinidad para activarla más adelante |

## Cómo se guardan (contenido como datos)

Cada evento es un objeto en `src/data/events.js`. El motor solo interpreta los **efectos**:

```js
{
  id: 'chica_herida',
  icon: '🩹',
  title: 'La chica herida',
  text: 'Una joven herida pide ayuda en plena mazmorra.',
  options: [
    { label: 'Ayudarla',
      outcome: { text: '¡Era una emboscada!', combat: { enemies: ['bandido', 'bandido', 'bandido'], onWin: { atq: 1 } } } },
    { label: 'Ignorarla',
      outcome: { text: 'Sigues tu camino.' } }
  ]
}
```

Efectos previstos: `hp`, `maxHp`, `atq`, `combat`, `skipFloor`, `chance` (azar), `requires` (condición de stat)
y `roll` (resultado al azar entre varios).

## Rutas más largas y densas (implementado)

| Parámetro | Ahora | Propuesta |
|-----------|:-----:|:---------:|
| Pisos | 10 | **16** |
| Columnas | 5 | **7** |
| Caminos que arrancan | 4 | **6** |
| Combates por ruta (mínimo) | ~9 | ~12 |

Reparto de nodos (los pisos intermedios):

| Nodo | Peso | Reglas |
|------|:----:|--------|
| 👹 Monstruo | 45 % | Base |
| 🎲 **Evento** | **22 %** | Nunca dos seguidos; mínimo 3 por ruta; no en el piso 0 ni justo antes del jefe |
| 🧰 Cofre | 13 % | Igual que ahora |
| 💀 Sub-jefe | 20 % (desde el piso 5) | Igual que ahora, con más pisos para repartirlos |

Cada evento se sortea **sin repetirse en la misma partida** (15 eventos, unos 3-4 por ruta, así que cada partida
enseña solo una parte del catálogo).
Hoguera, tienda y élite llegarán en M3 y ocuparán su parte del reparto.

## Decisiones tomadas al implementarlos

Puntos donde el plan era ambiguo o no encajaba tal cual. Están todos abiertos a cambio.

| Tema | Decisión |
|------|----------|
| **Daño de eventos** | Nunca mata: deja al héroe en **1 HP como mínimo**. Solo se muere en combate. |
| **`+X HP máx`** | También **cura X**, igual que las recompensas del resto del juego. Por eso el derrumbe (Elena) deja un neto de +3 HP: −5 por el esfuerzo y +8 por el colgante. |
| **Emboscada de la chica herida** | Un solo **Jefe de los bandidos** (ATK +1, HP ×2 sobre un monstruo del piso) en vez de «los stats de 3 bandidos sumados», que era demasiado duro. Cuando haya varios enemigos por combate (M1) se cambia por 3 bandidos. |
| **Combates de evento** | No se puede huir y **no dan la recompensa estándar**: solo lo que prometa el evento. Mímico: +1 ATK. Reflejo: +1 ATK y +5 HP máx. Bandidos: +1 ATK. Merodeador del campamento: nada. Lector: +3 ATK y +10 HP máx. |
| **Puente de cuerdas** | Si cede, el héroe se hace daño (−6 HP) y **no se salta el piso**. Solo puede salir a 4 pisos o más del jefe, para que nunca lleve directo al cofre final ni al jefe. |
| **Reflejo** | Copia tu ATK y tu HP **actuales**. Quien golpea primero (tú) gana ventaja, pero abrir con una habilidad débil se paga caro. |
| **Mínimo de eventos** | Todo camino de inicio a jefe cruza **al menos 3 eventos** (verificado en miles de mapas). El puente puede saltarse alguno. Ocasionalmente se regenera el mapa (≈0,3 %) para cumplirlo. |
| **Sub-jefes** | Empiezan en el **piso 5** (antes en el 4) al haber más pisos por delante. |
| **Cofres** | Sin DEF, solo ofrecen `+1 ATK` o `+5 HP`. |
| **Etiquetas del héroe** | El panel muestra los votos (`Sin huir`, `Sin habilidades`), las mejoras de habilidad y las afinidades acumuladas. Las afinidades aún no desbloquean nada (M2). |

## ⚠️ Equilibrio: pendiente

Con los números provisionales, **ni con el mapa antiguo de 10 pisos se podía vencer al jefe** (un bot con un juego sensato
lo alcanzaba el 26 % de las veces y lo vencía el 0 %). El mapa largo lo agrava, porque los monstruos escalan piso a piso
y el héroe no tiene forma de curarse entre combates (las hogueras llegan en M3):

| Configuración (bot sensato, 1500 partidas) | Alcanza al jefe | Vence al jefe |
|--------------------------------------------|:---------------:|:-------------:|
| Mapa antiguo, 10 pisos | 26 % | 0 % |
| Mapa nuevo, 16 pisos | 0,2 % | 0 % |
| Nuevo + curar el 25 % de HP tras cada victoria | 10 % | 0 % |
| Nuevo + curar el 50 % de HP tras cada victoria | 17 % | 0 % |

Casi todas las muertes ocurren en los sub-jefes (pisos 5-9). Es trabajo de M4, junto con las hogueras, pero conviene
tenerlo presente al probar: **ahora mismo el jefe final es prácticamente inalcanzable jugando de forma normal**.
