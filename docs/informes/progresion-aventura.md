# 🧭 Cómo gana fuerza el héroe en el Modo Aventura

> Informe del encargo [#9](https://github.com/harmondez/easy_hero/issues/9). **Es una investigación: no se ha cambiado nada del juego.**
> Todas las tablas salen de `tests/progresion-sim.mjs` (cómo reproducirlas, al final). Escrito para el director.

## Resumen: lo que hay que saber

1. **El Golpe de Fuego cambia toda la curva de Zafias, y conviene decidirlo antes de calibrar nada.** Con el bot de hoy (que no lo usa)
   Zafias cuesta ~16 combates de entrenamiento antes de Grask, 2 caídas por partida y Feronius se lleva el 65 % de la vida. Si el bot
   usa el Golpe de Fuego en cuanto está listo: **0 entrenamiento, 0 caídas, y Feronius un paseo** (los combates duran 4 turnos en vez de 10).
   Un jugador de verdad tiene el botón delante, así que lo normal es que juegue como el segundo bot. Todas las tablas de este informe
   se dan **con y sin** Golpe de Fuego.
2. **La segunda zona, con las fichas de gnolls y orcos tal cual, es inalcanzable con el héroe de hoy**: hacen falta cientos de combates
   de entrenamiento (907 sin Golpe de Fuego; 567 con él). El muro son **Gnarok** (21 de vida, ATK 4) y sobre todo **Guul** (35 de vida, golpes
   de 12): para vencer a Guul de un solo combate hace falta **ATK 9 y +24 de vida** de equipo. Hay que dar fuerza al héroe *y* recalibrar
   esas fichas.
3. **La fuerza que más rinde por lo que cuesta es el botín garantizado de los jefes**: un arma rara de Grask y una armadura rara de
   Feronius llevan al héroe a la segunda zona con **ATK 4,4 y 49 de vida** y dejan las fichas de gnolls y orcos justo donde están
   (≈ 20 combates de entrenamiento y menos de 1 caída sin Golpe de Fuego, parecido a lo que cuesta Zafias hoy). No toca la curva de Zafias
   hasta Grask (el botín llega después), pero **deja a Feronius sin mordiente** (pierde el 8 % de vida, en 2-3 turnos): hay que darle ~4 veces más vida.
4. **La tienda de equipo sola no basta con el oro que hay**: se ganan ~200 de oro en toda Zafias (≈ 135 fijos —el pozo, el fardo y lo de
   Maela y el botín de Grask— y 2 por victoria) y una poción cuesta 40. Dos o tres piezas baratas caben; las de la segunda zona
   (160-300 de oro) son 80-150 combates de oro y no se llegan a comprar. Y **La Forja que ya existe** (Filo afilado: +1 ATK por 40 de oro)
   rinde igual que mis tiendas en la segunda zona.
5. **Traer el equipo del descenso tal cual rompe Zafias**: la cueva está en la aldea desde el minuto 1, así que una ruta media (piso 8)
   deja a Zafias en ~1 combate de entrenamiento y a Feronius en el 8 % de vida, y una larga (piso 16) lo convierte en un paseo. Solo
   tiene sentido con un tope (una «reliquia»).

**Recomendación** (detalle y pros y contras en la sección 7): *botín garantizado de jefes y sub-jefes como columna* + *La Forja de hoy como
sumidero de oro* (sin construir tienda de equipo todavía) + *recalibrar la segunda zona y a Feronius con los números del informe*.
Todo depende de resolver primero si el Golpe de Fuego cuenta (punto 1).

---

## 1. La pregunta

En el descenso la fuerza viene del botín; en la aventura no hay botín y el héroe pelea con la espada básica (ATK 1, 25 de vida). Para Zafias
se resolvió bajando los pisos de sus enemigos. La segunda zona (el bosque amarillo, con gnolls y orcos de `src/data/creatures.js`)
necesita otra cosa. Se miden tres vías (tienda en la aldea, botín de jefes, equipo traído del descenso), sus mezclas, y se añade como
punto de comparación **La Forja que ya existe** (en la tienda de la aldea: Filo afilado +1 ATK, Constitución +4 de vida, a precios que
suben ×1,6 y ×1,5 por nivel).

## 2. Método

- **El bot** es el de siempre (`tests/lib/adventure-bot.mjs`: juega Zafias entera sobre su grafo real, con el motor de combate de verdad,
  de jugador nuevo hasta Feronius). Se le han puesto dos políticas: **«listo»** (la de hoy: no usa el Golpe de Fuego) y **«fuego»**
  (usa el Golpe de Fuego en cuanto está listo; si no, se comporta como «listo»). Una tercera, «fuegoYa» (lo usa incluso antes que defenderse),
  da lo mismo en Zafias y algo menos de entrenamiento en la segunda zona (507 frente a 567), así que no se repite.
- **Cada variante** son 2000 partidas con sus ganchos (`heroHook`, `onVictory`, `onSleep`): qué equipo lleva, qué botín recibe, qué compra al
  dormir. Las variantes sin azar (tienda, Forja) dan **la misma partida las 2000 veces** —el bot es casi determinista—; las de botín y
  descenso sí varían (cada partida sortea su botín con su semilla).
- **La segunda zona** es de prueba, construida en memoria con las fichas tal cual: dos ramas desde su aldea —la manada de gnolls (2 gnolls,
  2 berserkers, **Gnarok**) y el fuerte orco (orco, 2 guerreros, chamán, **Guul**)—. Mismas reglas que Zafias: caer = posada, al dormir
  reaparece todo menos los jefes; el bot entrena con gnolls sueltos de la entrada hasta subir un nivel. Oro y XP por victoria como Zafias
  (2 de oro y 5 de XP por monstruo normal).
- **«Entrenamiento»** = combates extra, tras caer, para subir un nivel. Es la medida del muro: Zafias hoy cuesta ~16 antes de Grask. En la
  segunda zona se considera razonable **hasta ~30** (el doble que Zafias).
- **Cómo se compra** (opción tienda): al dormir, el bot compra primero la mejora que pueda pagar y con lo que sobra, pociones; mientras le falte algo por
  comprar **ahorra** (se queda con 1 poción). Es un supuesto mío: un jugador real puede comportarse distinto.
- **«ATK / vida»** son los del héroe con todo puesto (nivel, puntos de nivel y equipo), al llegar a Feronius y al entrar en la segunda zona.
- **«Vida × k»**: las propuestas de dureza se miden multiplicando en memoria la vida de los enemigos (en datos sería `hpMul` en las fichas).

## 3. Punto de partida

### 3.1 Zafias, sin y con el Golpe de Fuego (héroe sin equipo)

| Variante | ATK / vida al llegar a Feronius | Entrenamiento antes de Grask | Caídas | Sin caer nunca | Feronius: vida perdida | Turnos por combate | Nivel final | Oro ganado | Oro gastado en equipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| listo (no usa el Golpe de Fuego) | 1.0 / 37 | 16.0 | 2.00 | 0 % | 65 % | 9.9 | 4.0 | 263 | 0 |
| fuego (lo usa cuando está listo) | 1.0 / 29 | 0.0 | 0.00 | 100 % | -7 % | 4.1 | 3.0 | 197 | 0 |
| fuegoYa (lo usa antes que defenderse) | 1.0 / 29 | 0.0 | 0.00 | 100 % | -7 % | 4.1 | 3.0 | 197 | 0 |

*(«Feronius: vida perdida» negativa = bebe una poción y acaba con más vida que al empezar.)*

Con el Golpe de Fuego los combates duran la mitad, no hay caídas y Zafias deja de ser un muro. Para que cueste algo habría que subir la vida
de **todos** los enemigos ×3 (el primer × en el que cae alguien; ver el apéndice). Ese
ajuste es del encargo hermano (builds y atributos); aquí solo importa que **el techo de lo que el héroe puede conseguir se mide frente a
un Zafias que ya es fácil**: cualquier fuerza extra lo vuelve trivial.

### 3.2 La segunda zona con las fichas tal cual

| Variante | ATK / vida al entrar | ATK / vida al acabar | Vence a Guul | Entrenamiento (combates) | Caídas | Guul: vida perdida | Turnos por combate | Nivel al final |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| listo (no usa el Golpe de Fuego) | 1.0 / 37 | 3.0 / 105 | 100 % | 907.0 | 23.00 | 43 % | 6.8 | 21.0 |
| fuego (lo usa cuando está listo) | 1.0 / 33 | 2.0 / 85 | 100 % | 567.0 | 14.00 | 43 % | 4.9 | 17.0 |
| fuegoYa (lo usa antes que defenderse) | 1.0 / 33 | 2.0 / 85 | 100 % | 507.0 | 13.00 | 40 % | 4.9 | 16.0 |

### 3.3 Qué hace falta para vencer a gnolls y orcos

Un solo combate, vida llena, sin pociones ni Golpe de Fuego, héroe de nivel 1:

| Enemigo | ATK 1 | ATK 3 | ATK 3 · +8 vida | ATK 5 · +8 | ATK 5 · +16 | ATK 7 · +16 | ATK 9 · +24 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gnoll de Zafias | gana (48 % de vida perdida) | gana (16 % de vida perdida) | gana (12 % de vida perdida) | gana (3 % de vida perdida) | gana (2 % de vida perdida) | gana (2 % de vida perdida) | gana (2 % de vida perdida) |
| Gnoll Berserker | gana (72 % de vida perdida) | gana (16 % de vida perdida) | gana (12 % de vida perdida) | gana (6 % de vida perdida) | gana (5 % de vida perdida) | gana (5 % de vida perdida) | gana (0 % de vida perdida) |
| Gnarok, el Jefe Gnoll | cae | cae | gana (94 % de vida perdida) | gana (61 % de vida perdida) | gana (49 % de vida perdida) | gana (22 % de vida perdida) | gana (18 % de vida perdida) |
| Orco de Zafias | cae | gana (36 % de vida perdida) | gana (27 % de vida perdida) | gana (18 % de vida perdida) | gana (15 % de vida perdida) | gana (7 % de vida perdida) | gana (6 % de vida perdida) |
| Orco Guerrero | cae | gana (72 % de vida perdida) | gana (55 % de vida perdida) | gana (18 % de vida perdida) | gana (15 % de vida perdida) | gana (15 % de vida perdida) | gana (12 % de vida perdida) |
| Orco Chamán | cae | gana (96 % de vida perdida) | gana (73 % de vida perdida) | gana (30 % de vida perdida) | gana (24 % de vida perdida) | gana (20 % de vida perdida) | gana (8 % de vida perdida) |
| Guul, el Rey Orco | cae | cae | cae | cae | cae | cae | gana (76 % de vida perdida) |

Y lo que cuesta en entrenamiento la zona completa con un equipo fijo desde el principio (según cuánto aguanten gnolls y orcos):

**Sin Golpe de Fuego (el bot de hoy)**

| Dureza | ATK 1 · +0 vida | ATK 2 · +4 vida | ATK 3 · +8 vida | ATK 4 · +8 vida | ATK 5 · +12 vida | ATK 6 · +16 vida | ATK 7 · +20 vida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| × 1 la vida de gnolls y orcos | 907 | 633 | 392 | 282 | 238 | 0 | 0 |
| × 0.7 la vida de gnolls y orcos | 745 | 279 | 233 | 150 | 34 | 0 | 0 |
| × 0.5 la vida de gnolls y orcos | 302 | 229 | 81 | 0 | 0 | 0 | 0 |
| × 0.35 la vida de gnolls y orcos | 205 | 109 | 0 | 0 | 0 | 0 | 0 |

**Con Golpe de Fuego**

| Dureza | ATK 1 · +0 vida | ATK 2 · +4 vida | ATK 3 · +8 vida | ATK 4 · +8 vida | ATK 5 · +12 vida | ATK 6 · +16 vida | ATK 7 · +20 vida |
| --- | --- | --- | --- | --- | --- | --- | --- |
| × 1 la vida de gnolls y orcos | 567 | 283 | 334 | 190 | 154 | 86 | 0 |
| × 0.7 la vida de gnolls y orcos | 277 | 232 | 82 | 82 | 0 | 0 | 0 |
| × 0.5 la vida de gnolls y orcos | 145 | 80 | 10 | 0 | 0 | 0 | 0 |
| × 0.35 la vida de gnolls y orcos | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Lectura: con las fichas actuales (× 1) hace falta un equipo de **ATK 6 y +16 de vida** para vencer sin entrenar (sin Golpe de Fuego; con él,
**ATK 7 y +20**) y un equipo de **ATK 4 y +8** si los enemigos aguantan la mitad. La subida es a saltos, no suave: la zona la cierra Guul, que o se vence
o te tumba.

## 4. Opción 1 · Armas y armaduras en la tienda de la aldea

Precios y piezas propuestos (con el oro de Zafias: ~200 en total):

| Pieza | ATK / vida | Precio | Dónde |
|---|---|---|---|
| Gladio corto | ATK 2 | 40 | aldea de Zafias |
| Mandoble del lobo | ATK 3 | 90 | aldea de Zafias |
| Cota de mazmorra | +4 vida | 30 | aldea de Zafias |
| Cota de malla | +8 vida (+2 al devolver golpe) | 70 | aldea de Zafias |
| Mandoble del lobo (calidad piso 5) | ATK 4 | 160 | zona 2 |
| Mandoble del lobo (calidad piso 10) | ATK 5 | 300 | zona 2 |
| Pechera de piedra | +12 vida (+espinas 2) | 140 | zona 2 |
| Coraza de ancla (calidad piso 5) | +18 vida (+2 al devolver golpe) | 280 | zona 2 |

(«Calidad piso N» = el objeto fabricado como en el piso N del descenso: +8 % por piso. Así el ATK sube de uno en uno sin objetos nuevos.)

Variantes: **T1** solo las 2 armas de Zafias · **T2** las 4 piezas de Zafias · **T3** T2 + las 4 de la zona 2 · **T4** T3 con todo al
doble de precio. **F0** = gastar el oro en La Forja de hoy (la mejora más barata que pueda pagar).

**Sin Golpe de Fuego (el bot de hoy)**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 37 | 16.0 | 2.00 | 65 % | 0 | 1.0 / 37 | 907.0 | 23.00 | 302.0 | 9.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 3.0 / 45 | 33.0 | 3.00 | 16 % | 179 | 3.0 / 45 | 301.0 | 8.00 | 0.0 | 0.00 |
| T1 · tienda de armas (2 armas, solo Zafias) | 3.0 / 33 | 16.0 | 2.00 | 21 % | 130 | 3.0 / 37 | 373.0 | 10.00 | 127.0 | 5.00 |
| T2 · armas y armaduras (4 piezas, solo Zafias) | 3.0 / 33 | 3.0 | 1.00 | 21 % | 120 | 3.0 / 37 | 230.0 | 8.00 | 2.0 | 1.00 |
| T3 · tiendas por zona (T2 + 4 piezas mejores en la zona 2) | 3.0 / 33 | 3.0 | 1.00 | 21 % | 120 | 3.0 / 37 | 330.0 | 10.00 | 2.0 | 1.00 |
| T4 · T3 con todo al doble de precio | 2.0 / 37 | 16.0 | 2.00 | 24 % | 140 | 2.0 / 41 | 312.0 | 9.00 | 167.0 | 6.00 |

**Con Golpe de Fuego**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 29 | 0.0 | 0.00 | -7 % | 0 | 1.0 / 33 | 567.0 | 14.00 | 145.0 | 6.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 2.0 / 37 | 0.0 | 0.00 | 24 % | 115 | 2.0 / 41 | 333.0 | 10.00 | 0.0 | 0.00 |
| T1 · tienda de armas (2 armas, solo Zafias) | 3.0 / 29 | 0.0 | 0.00 | 14 % | 90 | 3.0 / 33 | 283.0 | 9.00 | 9.0 | 1.00 |
| T2 · armas y armaduras (4 piezas, solo Zafias) | 3.0 / 33 | 0.0 | 0.00 | 12 % | 120 | 3.0 / 33 | 237.0 | 8.00 | 0.0 | 0.00 |
| T3 · tiendas por zona (T2 + 4 piezas mejores en la zona 2) | 3.0 / 33 | 0.0 | 0.00 | 12 % | 120 | 3.0 / 33 | 285.0 | 9.00 | 0.0 | 0.00 |
| T4 · T3 con todo al doble de precio | 2.0 / 33 | 0.0 | 0.00 | 27 % | 140 | 2.0 / 33 | 339.0 | 10.00 | 114.0 | 5.00 |

*(Zona 2: «fichas tal cual» y con la vida de gnolls y orcos a la mitad.)*

Lectura:

- **Zafias:** T1 no cambia el camino hasta Grask (16 combates, 2 caídas); T2, con las armaduras, lo deja en 3 combates y 1 caída.
  Feronius baja del 65 % al 21 % de vida perdida.
- **Segunda zona:** ninguna tienda abre la zona tal cual (230-373 combates sin Golpe de Fuego; 237-339 con él): un ATK 3 y +8 de vida no
  basta para Guul. Con las fichas a la mitad, T2 y F0 sí la dejan en 0-2 combates.
- **Las piezas de la zona 2 no llegan:** T3 no mejora a T2. Con 2 de oro por victoria, el mandoble de 160 son 80 combates; el bot ahorra,
  bebe menos pociones y cae más. T4 (precios al doble) apenas compra algo (llega a ATK 2) y se queda en 312.
- **La Forja de hoy (F0) rinde como mis tiendas** (301 frente a 230-373) y ya existe: ATK 3 y +8 de vida con ~180 de oro (sin Golpe de
  Fuego). Su pega, para este bot: **ahorrar para ella hace que beba menos pociones antes de Grask** (33 combates de entrenamiento frente
  a 16).

**Pros:** el jugador elige y ve la mejora (estilo DragonFable); da un uso al oro, que hoy sobra. **Contras:** el oro que hay no da para más de
2-3 piezas por zona (habría que subir el oro por victoria, hoy 2); obliga a una pantalla de tienda de equipo con ranuras (hoy la tienda de
la aldea es La Forja y las pociones) y a guardar el equipo en la partida de aventura (hoy el héroe se reconstruye desde el progreso permanente
y no tiene dónde guardarlo).

## 5. Opción 2 · Botín de jefes y sub-jefes

Variantes: **B1** Grask suelta una pieza de ranura al azar (rara o mejor) y Feronius otra · **B2** Grask suelta un **arma rara** y Feronius una
**armadura rara** (ranura fija) · **B3** B2 y además **Gnarok** suelta una pieza (rara o mejor) · **B4** como B2 pero épicas.
(Piezas fabricadas con el motor de siempre: calidad de piso 2-3 para Zafias, 5 para Gnarok.)

**Sin Golpe de Fuego (el bot de hoy)**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 37 | 16.0 | 2.00 | 65 % | 0 | 1.0 / 37 | 907.0 | 23.00 | 302.0 | 9.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 3.0 / 45 | 33.0 | 3.00 | 16 % | 179 | 3.0 / 45 | 301.0 | 8.00 | 0.0 | 0.00 |
| B1 · Grask suelta una pieza (rara o mejor); Feronius, otra | 2.1 / 38 | 16.0 | 2.00 | 11 % | 0 | 3.3 / 45 | 72.3 | 2.06 | 14.4 | 0.48 |
| B2 · Grask: arma rara; Feronius: armadura rara | 4.0 / 34 | 16.0 | 2.00 | 8 % | 0 | 4.4 / 49 | 19.7 | 0.66 | 0.6 | 0.02 |
| B3 · B2 y Gnarok suelta una pieza (ayuda contra Guul) | 4.0 / 34 | 16.0 | 2.00 | 8 % | 0 | 4.4 / 49 | 5.2 | 0.18 | 0.2 | 0.01 |
| B4 · B2 pero épicas | 4.2 / 35 | 16.0 | 2.00 | 6 % | 0 | 4.9 / 52 | 4.3 | 0.14 | 0.1 | 0.00 |

**Con Golpe de Fuego**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 29 | 0.0 | 0.00 | -7 % | 0 | 1.0 / 33 | 567.0 | 14.00 | 145.0 | 6.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 2.0 / 37 | 0.0 | 0.00 | 24 % | 115 | 2.0 / 41 | 333.0 | 10.00 | 0.0 | 0.00 |
| B1 · Grask suelta una pieza (rara o mejor); Feronius, otra | 2.1 / 33 | 0.0 | 0.00 | 6 % | 0 | 3.3 / 37 | 15.6 | 0.63 | 0.1 | 0.01 |
| B2 · Grask: arma rara; Feronius: armadura rara | 4.0 / 30 | 0.0 | 0.00 | 5 % | 0 | 4.4 / 41 | 3.1 | 0.14 | 0.0 | 0.00 |
| B3 · B2 y Gnarok suelta una pieza (ayuda contra Guul) | 4.0 / 30 | 0.0 | 0.00 | 5 % | 0 | 4.4 / 41 | 0.2 | 0.01 | 0.0 | 0.00 |
| B4 · B2 pero épicas | 4.2 / 31 | 0.0 | 0.00 | 4 % | 0 | 4.9 / 44 | 0.2 | 0.01 | 0.0 | 0.00 |

Lectura:

- **El botín llega tarde para Zafias:** hasta Grask no cambia nada (16 combates, 2 caídas); solo ayuda contra lo que viene después, sobre todo
  **Feronius** (de perder el 65 % de la vida a perder el 8 %, y de ~10 turnos a ~3).
- **Es lo que más rinde para la segunda zona:** entrando con ATK 4,4 y 49 de vida (B2), las fichas tal cual cuestan **20 combates y menos de
  1 caída** sin Golpe de Fuego (la curva de Zafias de hoy: 16 y 2) y 3 con él. B1 (ranura al azar) se queda en 72: **la ranura fija importa**.
  Con la pieza de Gnarok (B3) la zona baja a 5. Las épicas (B4) casi no aportan más que B3.
- **Se puede controlar con precisión:** la pieza que cae es la que se decide, y el botín no depende del oro ni de cuánto se entrena.

**Qué hace falta para Feronius:** con B2, Feronius deja de ser un jefe. Se ha medido con más vida solo para él (hoy: 10 de vida):

**Sin Golpe de Fuego**

| Equipo | Vida de Feronius | Gana el héroe (por combate) | Vida que pierde el héroe | Turnos | Caídas por partida (toda Zafias) |
| --- | --- | --- | --- | --- | --- |
| Sin equipo | × 1 | 100 % | 65 % | 10.0 | 2.00 |
| Sin equipo | × 2 | 17 % | 48 % | 13.8 | 7.00 |
| Sin equipo | × 3 | 13 % | 44 % | 16.8 | 9.00 |
| Sin equipo | × 4 | 13 % | 46 % | 17.6 | 9.00 |
| Sin equipo | × 6 | 13 % | 51 % | 18.9 | 9.00 |
| B2 · botín de jefes | × 1 | 100 % | 7 % | 2.6 | 2.00 |
| B2 · botín de jefes | × 2 | 100 % | 17 % | 4.8 | 2.00 |
| B2 · botín de jefes | × 3 | 100 % | 27 % | 7.7 | 2.00 |
| B2 · botín de jefes | × 4 | 98 % | 34 % | 10.2 | 2.02 |
| B2 · botín de jefes | × 6 | 75 % | 48 % | 17.6 | 2.33 |
| M1 · tiendas por zona + botín | × 1 | 100 % | 5 % | 2.1 | 1.00 |
| M1 · tiendas por zona + botín | × 2 | 100 % | 14 % | 3.8 | 1.00 |
| M1 · tiendas por zona + botín | × 3 | 100 % | 22 % | 5.3 | 1.00 |
| M1 · tiendas por zona + botín | × 4 | 100 % | 29 % | 6.8 | 1.00 |
| M1 · tiendas por zona + botín | × 6 | 100 % | 36 % | 9.7 | 1.00 |
| M0 · La Forja de hoy + botín | × 1 | 100 % | 3 % | 1.8 | 3.00 |
| M0 · La Forja de hoy + botín | × 2 | 100 % | 8 % | 3.1 | 3.00 |
| M0 · La Forja de hoy + botín | × 3 | 100 % | 19 % | 5.0 | 3.00 |
| M0 · La Forja de hoy + botín | × 4 | 100 % | 26 % | 6.4 | 3.00 |
| M0 · La Forja de hoy + botín | × 6 | 100 % | 35 % | 9.2 | 3.00 |

**Con Golpe de Fuego**

| Equipo | Vida de Feronius | Gana el héroe (por combate) | Vida que pierde el héroe | Turnos | Caídas por partida (toda Zafias) |
| --- | --- | --- | --- | --- | --- |
| Sin equipo | × 1 | 100 % | -7 % | 5.0 | 0.00 |
| Sin equipo | × 2 | 100 % | 0 % | 10.0 | 0.00 |
| Sin equipo | × 3 | 100 % | 31 % | 18.0 | 0.00 |
| Sin equipo | × 4 | 50 % | 46 % | 21.0 | 1.00 |
| Sin equipo | × 6 | 13 % | 60 % | 23.6 | 7.00 |
| B2 · botín de jefes | × 1 | 100 % | 5 % | 2.0 | 0.00 |
| B2 · botín de jefes | × 2 | 100 % | 18 % | 4.0 | 0.00 |
| B2 · botín de jefes | × 3 | 100 % | 24 % | 6.4 | 0.00 |
| B2 · botín de jefes | × 4 | 100 % | 27 % | 8.7 | 0.00 |
| B2 · botín de jefes | × 6 | 97 % | 29 % | 13.3 | 0.03 |
| M1 · tiendas por zona + botín | × 1 | 100 % | 3 % | 1.8 | 0.00 |
| M1 · tiendas por zona + botín | × 2 | 100 % | 11 % | 3.3 | 0.00 |
| M1 · tiendas por zona + botín | × 3 | 100 % | 21 % | 4.8 | 0.00 |
| M1 · tiendas por zona + botín | × 4 | 100 % | 29 % | 6.5 | 0.00 |
| M1 · tiendas por zona + botín | × 6 | 100 % | 32 % | 9.7 | 0.00 |
| M0 · La Forja de hoy + botín | × 1 | 100 % | 4 % | 1.9 | 0.00 |
| M0 · La Forja de hoy + botín | × 2 | 100 % | 14 % | 3.6 | 0.00 |
| M0 · La Forja de hoy + botín | × 3 | 100 % | 24 % | 5.4 | 0.00 |
| M0 · La Forja de hoy + botín | × 4 | 100 % | 30 % | 7.3 | 0.00 |
| M0 · La Forja de hoy + botín | × 6 | 100 % | 32 % | 10.9 | 0.00 |

Con B2, Feronius a **× 4 la vida (≈ 41)** mantiene lo que dura hoy (10 turnos) y pierde el 34 % de la vida al héroe en vez del 65 %
(98 % de victorias a la primera); con Golpe de Fuego, × 4 deja 8,7 turnos y el 27 %.

**Y la segunda zona con más vida de gnolls y orcos**, con el botín de B2 y B3:

**Sin Golpe de Fuego**

| Botín | Vida de gnolls y orcos | Vence a Guul | Entrenamiento (combates) | Caídas | Guul: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- | --- | --- |
| B2 · botín de jefes | × 1 | 100 % | 19.4 | 0.66 | 37 % | 4.3 |
| B2 · botín de jefes | × 1.5 | 100 % | 70.9 | 2.02 | 41 % | 5.4 |
| B2 · botín de jefes | × 2 | 99 % | 157.8 | 4.29 | 45 % | 6.3 |
| B2 · botín de jefes | × 3 | 96 % | 404.8 | 10.35 | 47 % | 7.7 |
| B2 · botín de jefes | × 4 | 92 % | 696.9 | 16.99 | 48 % | 9.0 |
| B3 · B2 y Gnarok también suelta | × 1 | 100 % | 2.6 | 0.11 | 26 % | 3.3 |
| B3 · B2 y Gnarok también suelta | × 1.5 | 100 % | 20.2 | 0.65 | 34 % | 4.8 |
| B3 · B2 y Gnarok también suelta | × 2 | 100 % | 54.0 | 1.58 | 40 % | 6.0 |
| B3 · B2 y Gnarok también suelta | × 3 | 98 % | 183.8 | 4.96 | 44 % | 7.6 |
| B3 · B2 y Gnarok también suelta | × 4 | 97 % | 343.2 | 8.80 | 47 % | 9.1 |

**Con Golpe de Fuego**

| Botín | Vida de gnolls y orcos | Vence a Guul | Entrenamiento (combates) | Caídas | Guul: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- | --- | --- |
| B2 · botín de jefes | × 1 | 100 % | 2.5 | 0.12 | 28 % | 3.3 |
| B2 · botín de jefes | × 1.5 | 100 % | 35.6 | 1.35 | 42 % | 4.1 |
| B2 · botín de jefes | × 2 | 100 % | 111.9 | 3.80 | 49 % | 4.5 |
| B2 · botín de jefes | × 3 | 99 % | 364.8 | 10.29 | 49 % | 5.9 |
| B2 · botín de jefes | × 4 | 96 % | 683.0 | 17.44 | 47 % | 7.3 |
| B3 · B2 y Gnarok también suelta | × 1 | 100 % | 0.2 | 0.01 | 26 % | 2.8 |
| B3 · B2 y Gnarok también suelta | × 1.5 | 100 % | 6.8 | 0.28 | 33 % | 3.9 |
| B3 · B2 y Gnarok también suelta | × 2 | 100 % | 30.1 | 1.10 | 41 % | 4.3 |
| B3 · B2 y Gnarok también suelta | × 3 | 100 % | 139.6 | 4.41 | 48 % | 5.5 |
| B3 · B2 y Gnarok también suelta | × 4 | 99 % | 318.7 | 8.97 | 49 % | 6.8 |

Con el botín de B2 y sin Golpe de Fuego, las fichas tal cual (× 1) ya valen; **con Golpe de Fuego haría falta × 1,5 (36 combates) o × 2 si Gnarok
también suelta botín (30)**. A partir de ×3 la zona vuelve a ser un muro (140-400 combates).

**Pros:** barato de construir (datos: una tabla `drops` por jefe, y usar el generador de objetos que ya existe); no depende del oro; refuerza
la sensación de «jefe que merece la pena» y de progreso por historia; **no toca la curva de Zafias hasta Grask**. **Contras:** una sola vez por partida
(no recompensa repetir zonas, salvo que se añada un trofeo por zona); el jugador no elige; hay que persistir el equipo de la aventura (igual que
en la opción 1) y dejar al héroe equiparlo (hoy no hay pantalla de equipo en la aventura).

## 6. Opción 3 · Traer el equipo del descenso

El descenso se juega desde la cueva de la aldea de Zafias, que está abierta **desde el minuto 1**. Qué trae una ruta (3000 rutas
simuladas con los pesos del juego: cofres, hogueras, sub-jefes y un 25 % de los combates):

| Ruta hasta | Objetos conseguidos | ATK del arma (media y reparto) | Vida extra del equipo (media y reparto) |
| --- | --- | --- | --- |
| piso 4 | 1.5 | 1.7 (p10 1 · p50 1 · p90 4) | 3.7 (p10 0 · p90 12) |
| piso 8 | 3.3 | 2.7 (p10 1 · p50 2 · p90 5) | 8.2 (p10 0 · p90 20) |
| piso 12 | 5.1 | 3.8 (p10 1 · p50 4 · p90 7) | 13.2 (p10 0 · p90 28) |
| piso 16 | 6.9 | 5.0 (p10 1 · p50 5 · p90 9) | 17.4 (p10 0 · p90 34) |

Variantes (el héroe empieza la aventura con ese equipo): **D1-D3** el kit completo (mejor pieza de cada ranura) de una ruta hasta el
piso 4, 8 o 16 · **D4/D5** solo el mejor objeto de la ruta (pisos 8 y 16) · **D6** el kit del piso 16 **con tope** (cada pieza como mucho ATK 3,
+8 de vida y 1 de guardia).

**Sin Golpe de Fuego (el bot de hoy)**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 37 | 16.0 | 2.00 | 65 % | 0 | 1.0 / 37 | 907.0 | 23.00 | 302.0 | 9.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 3.0 / 45 | 33.0 | 3.00 | 16 % | 179 | 3.0 / 45 | 301.0 | 8.00 | 0.0 | 0.00 |
| D1 · kit completo de una ruta corta (piso 4) | 1.9 / 35 | 5.2 | 0.63 | 21 % | 0 | 1.9 / 36 | 518.1 | 13.56 | 151.1 | 4.81 |
| D2 · kit completo de una ruta media (piso 8) | 3.3 / 38 | 1.0 | 0.13 | 8 % | 0 | 3.3 / 38 | 191.9 | 5.28 | 47.7 | 1.60 |
| D3 · kit completo de una ruta larga (piso 16) | 6.3 / 47 | 0.0 | 0.00 | 2 % | 0 | 6.3 / 47 | 22.5 | 0.66 | 4.0 | 0.14 |
| D4 · solo el mejor objeto de una ruta media (piso 8) | 2.8 / 35 | 1.7 | 0.21 | 10 % | 0 | 2.8 / 35 | 322.4 | 8.92 | 83.3 | 2.86 |
| D5 · solo el mejor objeto de una ruta larga (piso 16) | 4.5 / 37 | 0.4 | 0.05 | 7 % | 0 | 4.5 / 38 | 149.0 | 4.40 | 33.4 | 1.18 |
| D6 · kit del piso 16 con tope (ATK ≤ 3, vida ≤ +8 por pieza) | 3.6 / 38 | 0.0 | 0.01 | 3 % | 0 | 3.6 / 38 | 36.5 | 1.13 | 5.3 | 0.19 |

**Con Golpe de Fuego**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 29 | 0.0 | 0.00 | -7 % | 0 | 1.0 / 33 | 567.0 | 14.00 | 145.0 | 6.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 2.0 / 37 | 0.0 | 0.00 | 24 % | 115 | 2.0 / 41 | 333.0 | 10.00 | 0.0 | 0.00 |
| D1 · kit completo de una ruta corta (piso 4) | 1.9 / 33 | 0.0 | 0.00 | 5 % | 0 | 1.9 / 34 | 246.1 | 7.14 | 38.9 | 1.72 |
| D2 · kit completo de una ruta media (piso 8) | 3.3 / 37 | 0.0 | 0.00 | 3 % | 0 | 3.3 / 37 | 69.1 | 2.25 | 6.4 | 0.30 |
| D3 · kit completo de una ruta larga (piso 16) | 6.3 / 47 | 0.0 | 0.00 | 1 % | 0 | 6.3 / 47 | 4.8 | 0.18 | 0.1 | 0.01 |
| D4 · solo el mejor objeto de una ruta media (piso 8) | 2.8 / 34 | 0.0 | 0.00 | 6 % | 0 | 2.8 / 34 | 134.3 | 4.51 | 8.9 | 0.44 |
| D5 · solo el mejor objeto de una ruta larga (piso 16) | 4.5 / 37 | 0.0 | 0.00 | 4 % | 0 | 4.5 / 37 | 43.8 | 1.70 | 0.6 | 0.04 |
| D6 · kit del piso 16 con tope (ATK ≤ 3, vida ≤ +8 por pieza) | 3.6 / 38 | 0.0 | 0.00 | 1 % | 0 | 3.6 / 38 | 8.0 | 0.29 | 0.2 | 0.01 |

Lectura:

- **Rompe Zafias:** con el kit de una ruta media (D2) Zafias cuesta ~1 combate de entrenamiento y 0,13 caídas; con una larga (D3), nada
  (turnos por combate: 1,8; Feronius al 2 %). Y hay mucho reparto: en al menos 1 de cada 10 rutas la mejor arma sigue siendo la básica.
- **Para la segunda zona:** el kit largo (D3) sí la abre (23 combates; 5 con Golpe de Fuego), pero eso es una ruta de 16 pisos entera antes de poder
  jugarla; un solo objeto (D4/D5) no basta (149-322 combates). Con tope (D6): 37 combates (8 con fuego) y Zafias sigue sin costar nada.
- **Lo que no mide este banco:** el coste en tiempo y el riesgo de bajar al descenso, ni cuántas veces se repetiría. Es la opción que más
  incentiva la rejugabilidad (cada ruta trae algo distinto) y la que más acopla los dos modos.

**Pros:** une los dos modos y da sentido a bajar; el descenso ya genera el equipo, hay que añadir persistencia. **Contras:** **salta la
curva de la aventura** (puedes saltarte Zafias bajando al descenso en el minuto 1); sin tope manda la profundidad que alcance cada jugador, así que no se
puede calibrar la aventura contra un héroe «típico»; y penaliza al que no quiere jugar el descenso.

## 7. Mezclas y recomendación

**M0** = La Forja de hoy + botín B2 (lo más barato de construir) · **M1** = tiendas por zona (T3) + botín B2 · **M2** = tienda de Zafias
(T2) + botín B2 + una **reliquia** del descenso (el mejor objeto de una ruta hasta el piso 8, con tope de ATK 3 / +8 de vida).

**Sin Golpe de Fuego (el bot de hoy)**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 37 | 16.0 | 2.00 | 65 % | 0 | 1.0 / 37 | 907.0 | 23.00 | 302.0 | 9.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 3.0 / 45 | 33.0 | 3.00 | 16 % | 179 | 3.0 / 45 | 301.0 | 8.00 | 0.0 | 0.00 |
| M1 · tiendas por zona (T3) + botín de jefes (B2) | 4.0 / 38 | 3.0 | 1.00 | 5 % | 100 | 4.4 / 45 | 29.8 | 1.06 | 1.7 | 0.07 |
| M0 · La Forja de hoy + botín de jefes (B2): lo más barato de construir | 6.0 / 46 | 33.0 | 3.00 | 3 % | 179 | 6.4 / 57 | 0.7 | 0.02 | 0.0 | 0.00 |
| M2 · tienda de Zafias (T2) + botín (B2) + reliquia del descenso (mejor objeto del piso 8, con tope) | 4.3 / 36 | 0.7 | 0.14 | 4 % | 36 | 4.6 / 42 | 16.2 | 0.58 | 0.5 | 0.02 |

**Con Golpe de Fuego**

| Variante | Zafias: ATK / vida en Feronius | Entrenam. antes de Grask | Caídas en Zafias | Feronius: vida perdida | Oro gastado en equipo | Zona 2: ATK / vida al entrar | Zona 2 (fichas tal cual): entrenam. | caídas | Zona 2 (vida ×0,5): entrenam. | caídas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sin equipo (la aventura de hoy) | 1.0 / 29 | 0.0 | 0.00 | -7 % | 0 | 1.0 / 33 | 567.0 | 14.00 | 145.0 | 6.00 |
| F0 · gastar el oro en La Forja de hoy (Filo y Constitución) | 2.0 / 37 | 0.0 | 0.00 | 24 % | 115 | 2.0 / 41 | 333.0 | 10.00 | 0.0 | 0.00 |
| M1 · tiendas por zona (T3) + botín de jefes (B2) | 4.0 / 38 | 0.0 | 0.00 | 3 % | 70 | 4.4 / 41 | 7.0 | 0.28 | 0.0 | 0.00 |
| M0 · La Forja de hoy + botín de jefes (B2): lo más barato de construir | 5.0 / 38 | 0.0 | 0.00 | 4 % | 115 | 5.4 / 49 | 0.3 | 0.01 | 0.0 | 0.00 |
| M2 · tienda de Zafias (T2) + botín (B2) + reliquia del descenso (mejor objeto del piso 8, con tope) | 4.3 / 34 | 0.0 | 0.00 | 2 % | 16 | 4.6 / 42 | 1.3 | 0.06 | 0.0 | 0.00 |

- **M0** da la fuerza más alta (ATK 6, 57 de vida al entrar) y deja la segunda zona en 0,7 combates: **demasiado**; la Forja mete oro sin
  tope y el botín ya basta.
- **M1** deja las fichas de gnolls y orcos tal cual en **30 combates** (7 con Golpe de Fuego), pero exige construir tienda de equipo y reparar su economía.
- **M2** (con reliquia) queda en 16 combates pero mezcla las tres cosas.

### Recomendación

1. **Botín garantizado de jefes y sub-jefes (B3)** como columna del progreso: Grask suelta un arma rara, Feronius una armadura rara y Gnarok una pieza rara
   o mejor. Es lo que más fuerza da por lo que cuesta, no depende del oro ni de la rejugabilidad y deja a Zafias intacta hasta Grask.
2. **La Forja de hoy como sumidero de oro**, sin construir todavía una tienda de equipo. Si más adelante se quiere el estilo DragonFable de
   comprar armas, hacerlo con piezas **baratas (≤ 70 de oro)** o subiendo el oro por victoria (hoy 2): con el oro de hoy no caben las piezas caras.
3. **El equipo del descenso no viaja tal cual.** Si se quiere un puente entre los dos modos, una **reliquia**: un solo objeto de la ruta con
   tope (ATK ≤ 3, +8 de vida por pieza). Así la aventura se puede calibrar sin depender de lo que haya bajado cada jugador.
4. **Recalibrar con estos números** (ver propuestas): Feronius ×4 de vida (≈ 41) y, si el Golpe de Fuego cuenta, gnolls y orcos ×1,5.

| | Tienda | Botín de jefes | Equipo del descenso |
|---|---|---|---|
| Fuerza en la 2.ª zona (fichas tal cual, sin fuego) | 230-373 combates | **5-20 combates (B2-B3)** | 23 (kit largo) / 37 (con tope) |
| Cambia Zafias hasta Grask | sí, algo (3-16) | **no** | sí, mucho |
| Depende del oro | **sí (poco oro)** | no | no |
| Rejugabilidad | alta (compras distintas) | media (una vez) | **alta (cada ruta trae algo)** |
| Estilo DragonFable | **sí** | sí (misiones con premio) | no |
| Relación con el descenso | ninguna | ninguna | **acopla los dos modos** |
| Esfuerzo | pantalla de tienda + guardar equipo | datos + guardar equipo + equipar | guardar y trasladar equipo + tope |

## 8. Propuestas concretas, ordenadas por impacto

1. **Botín de jefes** (datos de la zona + un pequeño trozo de motor para darlo y guardarlo). La parada de un enemigo con botín:

   ```js
   // src/data/zones/zafias.js — nuevo campo `loot` en las paradas de jefe (borrador; hoy no existe)
   { id: 'grask',    /* … */ loot: { slot: 'weapon', rarity: 'rara', floor: 2 } },
   { id: 'feronius', /* … */ loot: { slot: 'armor',  rarity: 'rara', floor: 3 } },
   // y en la segunda zona, un sub-jefe también suelta:
   { id: 'gnarok',   /* … */ loot: { source: 'subboss', floor: 5 } },
   ```
   La medida (`tests/progresion-sim.mjs`) usa `Items.createRpgItem({ rarityId: 'rara', slot, floor })` y `Items.rollLootDrop({ source: 'subboss', floor })`.
2. **Feronius, ×4 de vida** (si se adopta el botín): hoy 10 → ≈ 41.

   ```js
   // src/data/creatures.js
   feronius: { /* … */ atkMul: 0.8, hpMul: 3.4 },   // hoy hpMul: 0.85 → ≈ 41 de vida con el ×1,5 de jefe
   ```
3. **Gnolls y orcos ×1,5 de vida si el Golpe de Fuego cuenta** (con el botín B2: 36 combates de entrenamiento, 1,35 caídas; ×1 si no cuenta, 19 y 0,66).
   Multiplicar el `hpMul` actual de cada ficha de gnoll y orco (`gnoll-de-zafias`, `gnoll-berserker`, `gnarok`, `orco-de-zafias`, `orco-guerrero`,
   `orco-chaman`, `guul`) por 1,5 (los que no lo tienen: `hpMul: 1.5`).
4. **Recalibrar Zafias cuando se decida el Golpe de Fuego** (encargo hermano): conviene hacerlo con fichas (`hpMul`/`atkMul`) y no con pisos:
   un piso más a los enemigos de Zafias pasa de 16 a 90 combates de entrenamiento antes de Grask y de 2 a 10 caídas (`SHIFT=1 node tests/adventure-sim.mjs`),
   un salto enorme; con la vida, el entrenamiento antes de Grask va de 16 (× 1) a 10 (× 1,25), 11 (× 2) y 36 (× 2,5) (apéndice), así que **cualquier
   cambio hay que medirlo**: Zafias está en el filo.
5. **Subir el oro por victoria** (hoy 2) solo si se construye la tienda de equipo: con 2 por victoria y ~200 por zona no caben piezas de más de ~70.
6. **No traer el equipo del descenso crudo.** Si se quiere, una reliquia con tope (M2).

## 9. Límites del estudio

- **Un solo bot.** Dos políticas de combate y un jugador que «ahorra» para comprar: un jugador real puede comprar antes, tener más azar
  o usar el Golpe de Fuego peor. Los números son relativos (comparar opciones), no una promesa de lo que verá cada jugador.
- **El bot es casi determinista**: en las variantes sin sorteo, las 2000 partidas salen iguales. Donde hay sorteo (botín, descenso) varían
  y se promedian: con 100 partidas B2 daba 14 combates de entrenamiento en la segunda zona y con 2000, 20; por eso esas variantes van a 2000.
- **Los saltos de las curvas son reales**: en Zafias, pasar de `× 1,25` a `× 1,5` de vida deja el entrenamiento en 10 y sube las caídas de 4 a 6. Por eso este
  informe da tablas por valores y no un único «número óptimo».
- **La segunda zona es de prueba** (dos ramas de 5 combates con las fichas tal cual); la real tendrá su propio mapa, sus misiones y su oro.
- **No se mide el tiempo** de ir al descenso ni se simula el descenso mismo (se simula el botín de una ruta).
- **Los precios y las piezas de la tienda son una propuesta mía**, no una calibración.

## 10. Cómo reproducirlo

```bash
node tests/progresion-sim.mjs                       # todas las tablas (2000 partidas por variante; ~35 min)
node tests/progresion-sim.mjs 500 --seccion tienda  # una sola sección y menos partidas
```

Secciones: `ref`, `hace-falta`, `tienda`, `botin`, `descenso`, `mezcla`, `dureza` (Zafias con más vida de enemigos), `feronius`, `zona2`, `rutas`.
El banco reutiliza `tests/lib/adventure-bot.mjs` sin modificarlo. La segunda zona de prueba y el bucle de entrenamiento se copian
dentro del banco porque la librería solo conoce Zafias (anotado en el PR como «Para después»).

### Apéndice · Zafias con más vida de enemigos

Zafias con la vida de **todos** sus enemigos multiplicada (500 partidas por fila). Lo que miden: cuánto cuesta llegar a Grask y cuánto pierde
Feronius. (El banco saca también T2 y M1; aquí las más útiles.)

**Sin equipo · sin Golpe de Fuego**

| Vida de los enemigos | Entrenam. antes de Grask | Caídas | Feronius: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- |
| enemigos de Zafias × 1 | 16.0 | 2.00 | 65 % | 9.9 |
| enemigos de Zafias × 1.25 | 10.0 | 4.00 | 38 % | 9.5 |
| enemigos de Zafias × 1.5 | 10.0 | 6.00 | 56 % | 9.6 |
| enemigos de Zafias × 2 | 11.0 | 8.00 | 42 % | 10.8 |
| enemigos de Zafias × 2.5 | 36.0 | 10.00 | 35 % | 12.3 |
| enemigos de Zafias × 3 | 61.0 | 13.00 | 34 % | 14.7 |

**Sin equipo · con Golpe de Fuego**

| Vida de los enemigos | Entrenam. antes de Grask | Caídas | Feronius: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- |
| enemigos de Zafias × 1 | 0.0 | 0.00 | -7 % | 4.1 |
| enemigos de Zafias × 1.25 | 0.0 | 0.00 | -3 % | 4.5 |
| enemigos de Zafias × 1.5 | 0.0 | 0.00 | -7 % | 4.6 |
| enemigos de Zafias × 2 | 0.0 | 0.00 | 10 % | 5.5 |
| enemigos de Zafias × 2.5 | 0.0 | 0.00 | 28 % | 6.0 |
| enemigos de Zafias × 3 | 0.0 | 1.00 | 14 % | 6.5 |

**Con el botín B2 · sin Golpe de Fuego**

| Vida de los enemigos | Entrenam. antes de Grask | Caídas | Feronius: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- |
| enemigos de Zafias × 1 | 16.0 | 2.00 | 7 % | 7.2 |
| enemigos de Zafias × 1.25 | 10.0 | 2.00 | 10 % | 7.8 |
| enemigos de Zafias × 1.5 | 10.0 | 2.00 | 10 % | 8.1 |
| enemigos de Zafias × 2 | 11.0 | 2.00 | 15 % | 8.6 |
| enemigos de Zafias × 2.5 | 36.0 | 4.00 | 18 % | 10.8 |
| enemigos de Zafias × 3 | 61.0 | 8.00 | 19 % | 13.2 |

**Con la tienda T2 · sin Golpe de Fuego**

| Vida de los enemigos | Entrenam. antes de Grask | Caídas | Feronius: vida perdida | Turnos por combate |
| --- | --- | --- | --- | --- |
| enemigos de Zafias × 1 | 3.0 | 1.00 | 21 % | 7.6 |
| enemigos de Zafias × 1.25 | 0.0 | 1.00 | 24 % | 8.2 |
| enemigos de Zafias × 1.5 | 10.0 | 2.00 | 24 % | 8.7 |
| enemigos de Zafias × 2 | 27.0 | 3.00 | 7 % | 8.1 |
| enemigos de Zafias × 2.5 | 27.0 | 3.00 | 24 % | 8.8 |
| enemigos de Zafias × 3 | 14.0 | 6.00 | 2 % | 10.2 |
