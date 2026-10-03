# 🧪 Pruebas largas de Zafias

> Informe generado por `npm run sim:largo` (tests/long-sim.mjs) el 2026-10-03 16:47 · duración: 4.9 minutos.
> Versión del juego: 1.11.0. Todo con semilla: repetirlo da lo mismo.

## Resumen

**0 fallos · 0 avisos · 16 datos.** Un *fallo* es algo roto (una regla que no se cumple). Un *aviso* es algo que funciona pero pide una decisión de diseño. Un *dato* es una cifra para tener a mano.

- ℹ️ Sin comprar nada, Grask se vence 4 de cada 5 veces desde el nivel 4 y Feronius desde el 10+. Con lecciones y cuero: 1 y 3.
- ℹ️ Goblin Pícaro a nivel 3 sin equipo: se le vence el 100 % de las veces (al normal, el 100 %) y dura 5 turnos (el normal, 2).
- ℹ️ Lobo Negro a nivel 3 sin equipo: se le vence el 100 % de las veces (al normal, el 100 %) y dura 8 turnos (el normal, 2).
- ℹ️ En partida, a Feronius el Feroz se le vence el 45 % de los intentos.
- ℹ️ Botín de «lobo»: el 37 % de lo que cae son pociones que no caben (se cambian por oro, no se pierden).
- ℹ️ Botín de «lobo (raro)»: el 38 % de lo que cae son pociones que no caben (se cambian por oro, no se pierden).
- ℹ️ Acabar Zafias le cuesta al jugador 59 combates y 14 noches, cae 2.9 veces y llega al nivel 5.3.
- ℹ️ Hasta vencer a Feronius gana 888 de oro. La espada más barata cuesta 180 y la armadura más barata 90.
- ℹ️ Ni con las noches de más llega nadie a comprar (metas a largo plazo): Espada imperial (420), Espada negra (480), Cryovain (600), Sanguine (900), Shadowvain (950), Placas imperiales negras (1500).
- ℹ️ Las lecciones de Odo se llevan 284 de oro por partida (6.0 lecciones): 32 % de todo lo ganado.
- ℹ️ Jugar con cabeza importa: quien solo ataca cae 9.6 veces por partida (el jugador, 2.9) y necesita 117 combates (el jugador, 59).
- ℹ️ Sin comprar nada: acaba el 100 %, con 262 combates y 9.7 caídas.
- ℹ️ Atributos: todo a Fuerza acaba en 49 combates (2.2 caídas); todo a Vitalidad, 55 (2.7); todo a Destreza, 79 (3.7).
- ℹ️ Encuentros raros en partida: 21.8 por partida; el jugador gana el 98 %.
- ℹ️ Tras 30 noches más: nivel 13.0, ATK 13.0, vida 116, 1047 de oro en el bolsillo.
- ℹ️ Materiales que quedan sin vender al acabar:  por partida.

## 1. Dropeos

Cada tabla, tirada muchas veces y comparada con sus datos. La desviación se mide en sigmas: por debajo de 3 es azar normal.

**goblin** · 40.000.000 tiradas · suelta algo: 33.01 % (esperado 33.00 %)

| Objeto | Esperado | Observado | Desviación (σ) |
|---|---|---|---|
| Poción de maná | 9.90 % | 9.90 % | 0.9 |
| Trozo de armadura oxidada | 8.25 % | 8.26 % | 1.3 |
| Oreja de goblin | 8.25 % | 8.24 % | -1.8 |
| Collar goblin | 6.60 % | 6.61 % | 1.7 |

**feronius** · 40.000.000 tiradas · suelta algo: 100.00 % (esperado 100.00 %)

| Objeto | Esperado | Observado | Desviación (σ) |
|---|---|---|---|
| Colmillo de Feronius | 100.00 % | 100.00 % | 0.0 |

**lobo** · 40.000.000 tiradas · suelta algo: 32.99 % (esperado 33.00 %)

| Objeto | Esperado | Observado | Desviación (σ) |
|---|---|---|---|
| Poción de vida | 9.90 % | 9.91 % | 1.8 |
| Diente de lobo | 8.25 % | 8.25 % | -0.8 |
| Piel de lobo | 8.25 % | 8.23 % | -4.2 |
| Garra de lobo | 3.30 % | 3.31 % | 3.1 |
| Poción de maná | 3.30 % | 3.30 % | -0.9 |

Con la mochila llena, la poción que cae se queda en el suelo (bien).

## 2. Encuentros raros

| Raro | Esperado | Observado | Desviación (σ) | Tiradas |
|---|---|---|---|---|
| Lobo Negro | 10.0 % | 10.01 % | 1.4 | 40.000.000 |
| Goblin Pícaro | 10.0 % | 10.00 % | 0.3 | 40.000.000 |

Cuánto aguantan y cuánto pegan en un combate de verdad está en los duelos (sección 4) y en las partidas (sección 5).

## 3. Compraventa al azar

22.834.800 operaciones al azar en 57.087 sesiones (compras: 10.276.301, aceptadas 18 %; ventas: 6.851.314, aceptadas 14 %; mejoras con cristal: 81.271; cambios de equipo: 2.970.179).

Tras cada operación se comprueba: oro entero y nunca negativo, nada por encima de su tope, nada duplicado, no se vende lo equipado ni lo de inicio, y que **sin ingresos el patrimonio no crece** (no hay forma de fabricar oro comprando y vendiendo).

**Resultado: ningún fallo.**

Lo que se pierde al comprar algo y revenderlo:

| Cosa | Cuesta | Te dan | Pierdes |
|---|---|---|---|
| Poción de vida | 20 | 15 | 25 % |
| Poción de maná | 25 | 18 | 28 % |
| Hogaza de pan | 5 | 3 | 40 % |
| Cristal de mejora | 100 | 75 | 25 % |
| Armadura de cuero | 90 | 67 | 26 % |
| Aguijón | 180 | 135 | 25 % |
| Cota de malla | 200 | 150 | 25 % |
| Espada imperial | 420 | 315 | 25 % |
| Armadura negra | 420 | 315 | 25 % |
| Espada negra | 480 | 360 | 25 % |
| Cryovain | 600 | 450 | 25 % |
| Placas imperiales | 800 | 600 | 25 % |
| Mirmulnir | 900 | 675 | 25 % |
| Sanguine | 900 | 675 | 25 % |
| Shadowvain | 950 | 712 | 25 % |
| Armadura de escamas | 950 | 712 | 25 % |
| Armadura dorada | 1400 | 1050 | 25 % |
| Quebrantaamaneceres | 1500 | 1125 | 25 % |
| Placas imperiales negras | 1500 | 1125 | 25 % |

## 4. Duelos

Cada enemigo contra un héroe de cada nivel (puntos repartidos entre Fuerza y Vitalidad), con tres equipos. 8680 combates por casilla, 1.874.880 en total. El héroe juega con cabeza: poción por debajo del 35 %, se cubre de los golpes fuertes y usa sus habilidades.

### Héroe recién llegado

A nivel 1: ATK 1, vida 25. A nivel 10: ATK 5, vida 61. Lleva 2 pociones. Cada casilla: **cuántas veces gana · turnos que dura**.

| Enemigo | Nv 1 | Nv 2 | Nv 3 | Nv 4 | Nv 5 | Nv 6 | Nv 8 | Nv 10 |
|---|---|---|---|---|---|---|---|---|
| Goblin vigía | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Goblin del camino | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Goblin del camino → raro | 100 % · 8t | 100 % · 8t | 100 % · 5t | 100 % · 5t | 100 % · 4t | 100 % · 4t | 100 % · 4t | 100 % · 4t |
| Goblin ladrón | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t |
| Goblin de guardia | 100 % · 7t | 100 % · 7t | 100 % · 7t | 100 % · 7t | 100 % · 7t | 100 % · 7t | 100 % · 5t | 100 % · 5t |
| Lobo de Zafias | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Lobo de Zafias → raro | 12 % · 11t | 86 % · 12t | 100 % · 8t | 100 % · 8t | 100 % · 6t | 100 % · 6t | 100 % · 5t | 100 % · 4t |
| Grask, jefe goblin | 0 % · 18t | 0 % · 22t | 65 % · 22t | 86 % · 23t | 100 % · 13t | 100 % · 12t | 100 % · 10t | 100 % · 9t |
| Feronius el Feroz | 0 % · 4t | 0 % · 5t | 0 % · 8t | 0 % · 8t | 0 % · 11t | 0 % · 12t | 0 % · 13t | 8 % · 14t |

### Héroe con lecciones y cuero

A nivel 1: ATK 6, vida 43. A nivel 10: ATK 10, vida 79. Lleva 2 pociones. Cada casilla: **cuántas veces gana · turnos que dura**.

| Enemigo | Nv 1 | Nv 2 | Nv 3 | Nv 4 | Nv 5 | Nv 6 | Nv 8 | Nv 10 |
|---|---|---|---|---|---|---|---|---|
| Goblin vigía | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Goblin del camino | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Goblin del camino → raro | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Goblin ladrón | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Goblin de guardia | 100 % · 4t | 100 % · 4t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t |
| Lobo de Zafias | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 1t |
| Lobo de Zafias → raro | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 2t |
| Grask, jefe goblin | 100 % · 6t | 100 % · 6t | 100 % · 6t | 100 % · 6t | 100 % · 5t | 100 % · 5t | 100 % · 5t | 100 % · 4t |
| Feronius el Feroz | 45 % · 11t | 48 % · 11t | 88 % · 11t | 100 % · 11t | 100 % · 11t | 100 % · 10t | 100 % · 9t | 100 % · 8t |

### Héroe bien equipado

A nivel 1: ATK 9, vida 69. A nivel 10: ATK 13, vida 105. Lleva 2 pociones. Cada casilla: **cuántas veces gana · turnos que dura**.

| Enemigo | Nv 1 | Nv 2 | Nv 3 | Nv 4 | Nv 5 | Nv 6 | Nv 8 | Nv 10 |
|---|---|---|---|---|---|---|---|---|
| Goblin vigía | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Goblin del camino | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Goblin del camino → raro | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Goblin ladrón | 100 % · 1t | 100 % · 1t | 100 % · 2t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Goblin de guardia | 100 % · 3t | 100 % · 3t | 100 % · 2t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 2t | 100 % · 2t |
| Lobo de Zafias | 100 % · 2t | 100 % · 2t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t | 100 % · 1t |
| Lobo de Zafias → raro | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t | 100 % · 2t |
| Grask, jefe goblin | 100 % · 4t | 100 % · 4t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t | 100 % · 3t |
| Feronius el Feroz | 100 % · 8t | 100 % · 8t | 100 % · 6t | 100 % · 6t | 100 % · 6t | 100 % · 6t | 100 % · 6t | 100 % · 5t |

## 5. Partidas enteras

1678 partidas de principio a fin (676.845 combates, 1.432.358 turnos), con seis formas de jugar. Después de Feronius, cada una sigue 30 noches más.

| Forma de jugar | Partidas | Acaba Zafias | Caídas | Combates | Noches | Nivel con Grask | Nivel con Feronius | Oro al acabar |
|---|---|---|---|---|---|---|---|---|
| jugador | 280 | 100 % | 2.9 | 59 | 13.5 | 3.0 | 5.3 | 228 |
| solo ataca | 280 | 100 % | 9.6 | 117 | 29.5 | 4.2 | 7.1 | 385 |
| todo a Fuerza | 280 | 100 % | 2.2 | 49 | 11.1 | 2.9 | 4.9 | 214 |
| todo a Vitalidad | 280 | 100 % | 2.7 | 55 | 13.0 | 3.1 | 5.2 | 219 |
| todo a Destreza | 279 | 100 % | 3.7 | 79 | 19.3 | 3.3 | 6.0 | 273 |
| no compra nada | 279 | 100 % | 9.7 | 262 | 74.6 | 6.1 | 10.9 | 1527 |

### Enemigo a enemigo (jugador)

| Enemigo | Combates | Gana | Vida perdida | Turnos | Nivel medio |
|---|---|---|---|---|---|
| Goblin vigía | 11733 | 100 % | 1 % | 1.2 | 7.6 |
| Goblin del camino | 9625 | 100 % | 1 % | 1.4 | 8.1 |
| Goblin Pícaro (raro) | 1122 | 100 % | 4 % | 2.7 | 8.2 |
| Goblin ladrón | 9232 | 99 % | 4 % | 1.9 | 8.3 |
| Goblin Pícaro (raro) | 1007 | 96 % | 12 % | 2.9 | 8.4 |
| Goblin de guardia | 10040 | 99 % | 3 % | 2.9 | 8.5 |
| Grask, jefe goblin | 394 | 71 % | 31 % | 9.9 | 2.7 |
| Lobo de Zafias | 11086 | 100 % | 5 % | 1.7 | 7.5 |
| Lobo Negro (raro) | 1203 | 94 % | 16 % | 2.8 | 7.5 |
| Goblin del puente | 8680 | 100 % | 0 % | 1.1 | 9.3 |
| Lobo de Zafias | 7796 | 100 % | 1 % | 1.3 | 9.4 |
| Lobo Negro (raro) | 884 | 100 % | 5 % | 2.0 | 9.5 |
| Goblin centinela | 8680 | 100 % | 2 % | 2.6 | 9.4 |
| Goblin rezagado | 8277 | 100 % | 2 % | 2.6 | 9.1 |
| Goblin Pícaro (raro) | 992 | 100 % | 8 % | 3.9 | 9.0 |
| Lobo de Zafias | 8213 | 100 % | 1 % | 1.3 | 9.3 |
| Lobo Negro (raro) | 895 | 100 % | 6 % | 2.3 | 9.3 |
| Feronius el Feroz | 624 | 45 % | 54 % | 12.0 | 4.7 |

### Botín que cae de verdad (jugador)

| Tabla | Enemigos vencidos | Suelta algo | Se pierde (mochila llena) | Qué |
|---|---|---|---|---|
| goblin | 66037 | 33.0 % | 27 % | poción de maná 6604 · Trozo de armadura oxidada 5542 · Oreja de goblin 5367 · Collar goblin 4266 |
| lobo | 27095 | 32.9 % | 37 % | poción de vida 2685 · Piel de lobo 2288 · Diente de lobo 2148 · poción de maná 896 · Garra de lobo 884 |
| lobo (raro) | 2910 | 100.0 % | 38 % | poción de vida 866 · Diente de lobo 746 · Piel de lobo 694 · Garra de lobo 310 · poción de maná 294 |
| goblin (raro) | 3074 | 100.0 % | 28 % | poción de maná 954 · Oreja de goblin 788 · Trozo de armadura oxidada 775 · Collar goblin 557 |
| feronius | 280 | 100.0 % | 0 % | Colmillo de Feronius 280 |

### Oro hasta vencer a Feronius (jugador)

Entra:

| De dónde | Oro | Parte |
|---|---|---|
| Combates | 407 | 46 % |
| Misiones | 225 | 25 % |
| Hallazgos | 75 | 8 % |
| Ventas | 181 | 20 % |

Sale:

| En qué | Oro |
|---|---|
| posada | 27 |
| pociones | 139 |
| lecciones | 284 |
| espadas | 101 |
| armaduras | 91 |
| perdido al caer | 18 |

Primera espada comprada: en el 100 % de las partidas, hacia el combate 65. Primera armadura: en el 100 %, hacia el combate 30.

Al vencer a Feronius lleva: Aguijón 56 % · Espada de hierro 44 % · y de armadura: Armadura de cuero 92 % · Armadura de acero 5 % · Cota de malla 3 %.

Tras 30 noches más: Mirmulnir 96 % · Quebrantaamaneceres 4 % · y de armadura: Armadura de escamas 57 % · Armadura dorada 43 %.

### Misiones (jugador)

| Misión | Se cumple | Hacia el combate |
|---|---|---|
| Grask (Evelyn) | 100 % | 20 |
| El colmillo de Feronius (Bram) | 100 % | 53 |
| Plantas para Amelie | 100 % | 25 |
| Seis goblins menos (Odo) | 100 % | 11 |
| Los lobos del arroyo (Hilda) | 100 % | 14 |
