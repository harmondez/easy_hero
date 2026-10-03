# Builds y atributos en la aventura

Informe de investigación del [issue #8](https://github.com/harmondez/easy_hero/issues/8) · Zafias, versión 1.7.1 · octubre de 2026.
Escrito para el director. No se ha tocado el juego: todo lo que se prueba aquí se cambia **en memoria** dentro del banco
(`tests/builds-sim.mjs`) y las propuestas están al final, con números y listas para aplicar.

---

## Lo primero: el Golpe de Fuego cambia la curva entera de Zafias

> **Con el Golpe de Fuego, Zafias deja de tener curva.** El bot de hoy («listo») nunca lo usa; un jugador que lo pulse cada vez
> que está listo gana **todos** los combates desde el nivel 1: sin entrenar (16 → 0 combates antes de Grask), sin caer una sola
> vez (2 caídas por partida → 0) y con la mitad de combates y de turnos (56 → 21 combates por partida; 9,9 → 4,1 turnos por
> combate). Grask, que hoy tumba al 67 % de los intentos, pasa a caer siempre a la primera.

Por qué: con ATK 1, un ataque normal hace 1 de daño y el Golpe de Fuego hace 5 (y se repite cada 4 rondas: 5 + 1 + 1 + 1 = 8 en vez
de 4). Es **el doble de daño** y los combates duran la mitad, así que el héroe recibe la mitad de golpes. Zafias se calibró el
2026-10-01 sin esa habilidad.

| Política | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan | Pociones / partida | Combates / partida |
|---|---|---|---|---|---|---|---|---|---|
| ingenuo | 54.0 | 5.00 | 5.0 | 6.0 | 32 % | 7.4 | 0.0 % | 0.0 | 104.0 |
| listo | 16.0 | 2.00 | 3.0 | 4.0 | 65 % | 9.9 | 0.0 % | 7.0 | 56.0 |
| fuego | 0.0 | 0.00 | 1.0 | 3.0 | 34 % | 4.1 | 0.0 % | 1.0 | 21.0 |
| fuego-guardia | 0.0 | 0.00 | 1.0 | 3.0 | 34 % | 4.1 | 0.0 % | 1.0 | 21.0 |
| fuego-solo | 0.0 | 0.00 | 1.0 | 3.0 | 31 % | 4.2 | 0.0 % | 1.0 | 25.0 |

*(«ingenuo» solo ataca; «listo» es el bot de hoy; «fuego» usa el Golpe de Fuego en cuanto está listo y, si no, hace lo de «listo»;
«fuego-guardia» defiende antes de un golpe fuerte aunque el Golpe esté listo; «fuego-solo» no se defiende nunca. Todos beben
poción por debajo del 35 % de vida. Con el reparto de hoy, STR y VIT alternos.)*

Combate a combate se ve dónde está la diferencia:

| Política | Goblin vigía | Goblin ladrón | Goblin de guardia | Grask | Lobo de Zafias | Goblin centinela | Feronius |
|---|---|---|---|---|---|---|---|
| listo | 6.0 t · 100 % | 8.0 t · 100 % | 20.0 t · 100 % | 5.7 t · 33 % | 8.0 t · 100 % | 19.0 t · 100 % | 10.0 t · 100 % |
| fuego | 2.0 t · 100 % | 4.0 t · 100 % | 5.0 t · 100 % | 5.0 t · 100 % | 4.0 t · 100 % | 5.0 t · 100 % | 5.0 t · 100 % |

(Cada celda: turnos por combate · victorias por intento.)

**Combinar con defender y pociones casi no cambia nada** mientras Zafias siga como está: «fuego-guardia» sale idéntico a
«fuego» (el Golpe de Fuego acaba el combate antes de que lleguen los golpes fuertes) y «fuego-solo», que no se defiende nunca,
solo necesita 25 combates por partida en vez de 21. Donde la política sí importa es cuando el combate aprieta (escenario W2, más
abajo): ahí beber antes ayuda un poco.

### ¿Cuánto habría que endurecer Zafias para devolverle la curva?

Subiendo pisos a todos los enemigos (en memoria), con la misma política:

Se suben `k` pisos a todos los enemigos, en memoria. «listo» a +0 es la curva con la que se calibró Zafias.

| Política · dificultad | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan | Combates / partida |
|---|---|---|---|---|---|---|---|---|
| listo · +0 pisos | 16.0 | 2.00 | 3.0 | 4.0 | 65 % | 9.9 | 0.0 % | 56.0 |
| listo · +1 pisos | 90.0 | 10.00 | 7.0 | 11.0 | 30 % | 9.8 | 0.0 % | 314.0 |
| listo · +2 pisos | 121.0 | 19.00 | 11.0 | 11.0 | 46 % | 14.8 | 0.0 % | 340.0 |
| listo · +3 pisos | 172.0 | 73.00 | 12.0 | 12.0 | 54 % | 14.3 | 0.0 % | 445.0 |
| fuego · +0 pisos | 0.0 | 0.00 | 1.0 | 3.0 | 34 % | 4.1 | 0.0 % | 21.0 |
| fuego · +1 pisos | 0.0 | 0.00 | 1.0 | 3.0 | 38 % | 5.0 | 0.0 % | 25.0 |
| fuego · +2 pisos | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % | 107.0 |
| fuego · +3 pisos | 36.0 | 9.00 | 5.0 | 10.0 | 41 % | 5.7 | 0.0 % | 265.0 |

- Con el Golpe de Fuego, **+1 piso no cambia nada** (sigue sin entrenar y sin caídas) y **+2 pisos devuelve las caídas** (4
  por partida) y obliga a entrenar 36 combates antes de Grask. No hay punto medio: a escala ATK 1 cada piso de enemigo mueve la
  vida de golpe, y el bot «listo» muestra lo mismo (de +0 a +1 salta de 16 a 90 combates de entrenamiento).
- Conclusión: **si se quiere mantener la curva de hoy con el Golpe de Fuego, no sirve subir pisos; hay que afinar la vida y el
  daño de cada criatura** (`hpMul` y `atkMul` en `src/data/creatures.js`). Eso es otro encargo (ver «Para después»).

A partir de aquí uso tres **escenarios** para todo lo demás:

| Escenario | Qué es | Para qué sirve |
|---|---|---|
| **W0** | Zafias de hoy, bot «listo» (sin Golpe de Fuego) | Es el mundo con el que se calibró el juego |
| **W1** | Zafias de hoy, bot «fuego» | Lo que vive un jugador que usa la habilidad: todo es trivial |
| **W2** | Zafias con todos los enemigos 2 pisos más arriba, bot «fuego» | Un mundo donde la habilidad existe y la dificultad vuelve: aquí **los atributos importan** |

Cuándo beber poción (W2, política «fuego»):

| Umbral | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan | Pociones / partida |
|---|---|---|---|---|---|---|---|---|
| beber por debajo del 20 % | 36.0 | 6.00 | 4.0 | 8.0 | 49 % | 5.2 | 0.0 % | 13.0 |
| beber por debajo del 35 % | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % | 10.0 |
| beber por debajo del 50 % | 36.0 | 3.00 | 4.0 | 5.0 | 65 % | 5.3 | 0.0 % | 8.0 |
| beber por debajo del 65 % | 57.0 | 4.00 | 5.0 | 5.0 | 59 % | 5.1 | 0.0 % | 7.0 |

Beber hacia el 50 % da menos caídas (3,0 frente a 4,0 al 35 %) y gasta menos pociones; beber tarde (20 %) es lo peor. No es una
diferencia grande: el 35 % de «listo» vale.

---

## Qué builds funcionan hoy

**Dato previo: el combate de Zafias no tiene azar.** Los monstruos repiten un patrón fijo y, si no hay puntos en DEX, no se tira
ningún dado (el crítico y la esquiva son lo único aleatorio). Por eso una variante sin DEX da **exactamente** lo mismo con 100
partidas que con 2000 (tabla 6a, al final). Las variantes sin DEX se juegan con 200 partidas y las que llevan DEX con 2000.

Columnas: «entrenan antes de Grask» = combates de entrenamiento que el bot necesita antes de poder con Grask; «caídas» = veces
que cae por partida; «se atascan» = partidas que no consiguen vencer a Feronius tras 40 intentos. «Vida perdida ante Feronius»
es lo que le quitan, aunque beba poción.

### W0 · Zafias de hoy, bot «listo»

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo STR | 79.0 | 5.00 | 6.0 | 6.0 | 48 % | 7.3 | 0.0 % |
| todo VIT | 16.0 | 2.00 | 3.0 | 4.0 | 53 % | 9.9 | 0.0 % |
| todo DEX | 95.1 | 14.01 | 6.5 | 14.7 | 50 % | 7.1 | 0.0 % |
| todo INT | 108.0 | 46.00 | 7.0 | — | 38 % | 7.3 | 100.0 % |
| STR+VIT (el de hoy) | 16.0 | 2.00 | 3.0 | 4.0 | 65 % | 9.9 | 0.0 % |
| STR+DEX | 105.1 | 10.00 | 6.9 | 11.0 | 33 % | 7.5 | 0.0 % |
| STR+INT | 108.0 | 10.00 | 7.0 | 11.0 | 29 % | 7.6 | 0.0 % |
| DEX+VIT | 16.0 | 2.00 | 3.0 | 4.0 | 66 % | 9.9 | 0.0 % |
| INT+VIT | 16.0 | 2.00 | 3.0 | 4.0 | 65 % | 9.9 | 0.0 % |
| DEX+INT | 105.1 | 27.80 | 6.9 | 21.9 | 51 % | 7.1 | 1.3 % |
| 4 por igual | 16.0 | 5.75 | 3.0 | 7.7 | 47 % | 8.1 | 0.0 % |

### W2 · Zafias +2 pisos, bot «fuego»

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo STR | 111.0 | 6.00 | 7.0 | 7.0 | 56 % | 5.0 | 0.0 % |
| todo VIT | 19.0 | 2.00 | 3.0 | 4.0 | 59 % | 5.3 | 0.0 % |
| todo DEX | 179.7 | 18.61 | 8.8 | 17.3 | 41 % | 5.0 | 0.0 % |
| todo INT | 316.0 | 53.00 | 12.0 | — | 15 % | 5.0 | 100.0 % |
| STR+VIT (el de hoy) | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| STR+DEX | 219.2 | 11.01 | 9.8 | 12.0 | 44 % | 5.0 | 0.0 % |
| STR+INT | 267.0 | 10.00 | 11.0 | 11.0 | 56 % | 5.1 | 0.0 % |
| DEX+VIT | 36.0 | 3.74 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| INT+VIT | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| DEX+INT | 236.2 | 33.95 | 10.2 | 24.3 | 34 % | 5.0 | 8.5 % |
| 4 por igual | 110.7 | 7.72 | 7.0 | 8.8 | 46 % | 5.1 | 0.0 % |

### W1 · Zafias de hoy, bot «fuego» (para comprobar que aquí nada importa)

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo STR | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |
| todo VIT | 0.0 | 0.00 | 1.0 | 2.0 | 39 % | 4.1 | 0.0 % |
| todo DEX | 0.0 | 0.00 | 1.0 | 3.0 | 37 % | 4.1 | 0.0 % |
| todo INT | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |
| STR+VIT (el de hoy) | 0.0 | 0.00 | 1.0 | 3.0 | 34 % | 4.1 | 0.0 % |
| STR+DEX | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |
| STR+INT | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |
| DEX+VIT | 0.0 | 0.00 | 1.0 | 3.0 | 35 % | 4.1 | 0.0 % |
| INT+VIT | 0.0 | 0.00 | 1.0 | 3.0 | 34 % | 4.1 | 0.0 % |
| DEX+INT | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |
| 4 por igual | 0.0 | 0.00 | 1.0 | 3.0 | 36 % | 4.1 | 0.0 % |

Lo que se ve, en los dos escenarios donde los atributos cuentan (W0 y W2):

1. **VIT domina.** «Todo VIT» entrena 16 combates (W0) o 19 (W2) y cae 2 veces. Es el mejor build, con diferencia.
2. **El reparto de hoy (STR+VIT) funciona solo gracias a VIT.** Sale igual que «DEX+VIT» y que «INT+VIT» en W0 (16 combates, 2
   caídas): la mitad de sus puntos, los de STR, **no hacen nada**. Y con la mitad de puntos en VIT, en W2 necesita el doble
   (36 combates frente a 19).
3. **Sin VIT, el héroe sufre.** «Todo STR»: 79 combates de entrenamiento y 5 caídas en W0, 111 y 6 en W2. «Todo DEX»: 95 y 14
   caídas en W0, 180 y 18,6 en W2. Mezclas sin VIT (STR+DEX, STR+INT, DEX+INT): de 105 a 267 combates de entrenamiento.
4. **«Todo INT» es injugable: no vence nunca a Feronius** (100 % de partidas atascadas, 46 caídas en W0 y 53 en W2, tras llegar al
   nivel 7 y 12). Sus puntos no dan nada.
5. **«4 por igual» queda a medio camino:** 16 combates y 5,75 caídas en W0; 111 y 7,7 en W2.
6. **Con el Golpe de Fuego y Zafias como está (W1) ningún build importa:** todos entrenan 0 combates y caen 0 veces.

### INT con un arma elemental

INT solo da algo si el arma es elemental (+1 de daño cada 10 puntos). Probado con la Varita de ceniza (Fuego, ATK 1: igual que
la espada del sendero), en W2:

| Build · arma | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo INT · espada | 316.0 | 53.00 | 12.0 | — | 15 % | 5.0 | 100.0 % |
| todo INT · varita de fuego | 115.0 | 11.00 | 7.0 | 12.0 | 39 % | 4.1 | 0.0 % |
| INT+VIT · espada | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| INT+VIT · varita de fuego | 36.0 | 4.00 | 4.0 | 6.0 | 56 % | 4.5 | 0.0 % |
| STR+VIT (el de hoy) · espada | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| STR+VIT (el de hoy) · varita de fuego | 36.0 | 4.00 | 4.0 | 6.0 | 56 % | 4.5 | 0.0 % |

«Todo INT» pasa de **atascado** (316 combates, 53 caídas) a **terminar la zona** (115 combates, 11 caídas) con la varita; para
INT+VIT y STR+VIT no cambia nada importante (36 combates, 4 caídas). O sea, INT hoy solo existe para quien lleva un arma
elemental, y la aventura no da ninguna (solo hay oro y pociones), así que en Zafias INT es un atributo muerto.

---

## Cuánto poder da cada punto y cuánto se nota subir de nivel

Aquí quito el entrenamiento del bot y miro el poder crudo: un héroe con la vida llena y **sin pociones** que pelea contra cinco
combates de Zafias (goblin ladrón, goblin de guardia, Grask, lobo de la guarida y Feronius). La tabla da la **vida que pierde de
media**: cuanto **menos**, más poder.

Héroe con la vida llena, sin pociones, política «fuego». Cuanto **menos** se pierde, más poder. `*` = pierde algún combate. Fórmulas de hoy.

**W2 · Zafias +2 pisos, bot «fuego» (la dificultad vuelve)**

| Build \ puntos | 0 | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| todo VIT | 58 % | 44 % | 35 % | 29 % | 25 % | 22 % | 20 % | 16 % | 13 % |
| todo STR | 58 % | 58 % | 58 % | 58 % | 58 % | 42 % | 42 % | 42 % | 33 % |
| todo DEX | 58 % | 56 % | 55 % | 55 % | 54 % | 53 % | 52 % | 51 % | 49 % |
| todo INT | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % |

**W1 · Zafias de hoy, bot «fuego»**

| Build \ puntos | 0 | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| todo VIT | 18 % | 14 % | 11 % | 9 % | 8 % | 7 % | 6 % | 5 % | 4 % |
| todo STR | 18 % | 18 % | 18 % | 18 % | 18 % | 16 % | 16 % | 16 % | 8 % |
| todo DEX | 18 % | 18 % | 18 % | 18 % | 18 % | 17 % | 17 % | 17 % | 16 % |
| todo INT | 18 % | 18 % | 18 % | 18 % | 18 % | 18 % | 18 % | 18 % | 18 % |

- **VIT es fuerte desde el primer punto:** los primeros puntos bajan la vida perdida entre 4 y 7 puntos porcentuales cada uno, y
  luego cada vez menos. Con 10 puntos pierde 22 % en vez de 58 %.
- **STR no hace nada hasta el punto 10.** Entonces salta (de 58 % a 42 %), pero un héroe de nivel 4 (6 puntos) está a dos niveles
  de la primera mejora: hasta el nivel 6 su fuerza no existe.
- **DEX casi nada:** a 20 puntos (nivel 11) mejora 9 puntos (58 % → 49 %); a nivel 4 (6 puntos), 3 puntos.
- **INT: cero**, en cualquier cantidad.

### ¿Cuánto se nota subir de nivel?

Cada nivel da 2 puntos. Así cambia el poder por nivel (W2). Las filas «C · …» son la propuesta C (más abajo).

| Build \ nivel | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|---|---|---|
| STR+VIT (el de hoy) | 58 % | 50 % | 44 % | 39 % | 35 % | 32 % | 27 % | 24 % |
| todo VIT | 58 % | 44 % | 35 % | 29 % | 25 % | 22 % | 18 % | 14 % |
| todo STR | 58 % | 58 % | 58 % | 58 % | 58 % | 42 % | 42 % | 42 % |
| todo DEX | 58 % | 56 % | 55 % | 55 % | 54 % | 53 % | 52 % | 50 % |
| todo INT | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % |
| C · STR+VIT (el de hoy) | 58 % | 51 % | 34 % | 31 % | 28 % | 21 % | 18 % | 13 % |
| C · todo VIT | 58 % | 46 % | 39 % | 33 % | 29 % | 26 % | 21 % | 18 % |
| C · todo STR | 58 % | 42 % | 42 % | 33 % | 27 % | 27 % | 21 % | 18 % |
| C · todo DEX | 58 % | 51 % | 45 % | 41 % | 36 % | 32 % | 27 % | 23 % |
| C · todo INT | 58 % | 45 % | 36 % | 36 % | 36 % | 34 % | 22 % | 9 % |

(Las filas sin prefijo son las fórmulas de hoy; las de «C · …», la propuesta C.)

Hoy, subir de nivel **se nota casi solo por la vida**: con el reparto de hoy, pasar del nivel 1 al 4 baja la vida perdida de 58 % a
39 %; con todo VIT, a 29 %. Con STR no se nota nada hasta el nivel 6, con DEX apenas (58 % → 55 % en el nivel 4) y con INT nunca.

---

## Diagnóstico atributo por atributo

| Atributo | Qué da hoy | Qué se ve | Veredicto |
|---|---|---|---|
| 💪 **STR** | +1 ATK cada 10 puntos (arma física) | Nada hasta el nivel 6 (10 puntos); con ATK 1, el primer +1 vale el doble de daño | **Casi inútil al principio.** Es un escalón de 10 en un juego donde un héroe tiene 6 puntos al llegar al jefe |
| ❤️ **VIT** | +4 de vida y +0,4 % de resistencia por punto | Cada punto es +16 % de la vida base; domina todas las tablas | **Dominante** |
| 🏹 **DEX** | +0,4 % de crítico y +0,3 % de esquiva por punto | 6 puntos = +2,4 % de crítico y +1,8 % de esquiva | **Inútil.** Además es lo único que mete azar en una aventura que, sin DEX, es determinista |
| 🧠 **INT** | +1 de daño elemental cada 10 puntos (solo con arma elemental) y resistencia elemental | El Golpe de Fuego **no lee INT**, el arma inicial es de filo y ningún monstruo hace daño elemental | **Muerto.** Con INT no se consigue vencer a Feronius |

---

## Propuestas, ordenadas por impacto

### 0. (la de más impacto, y no es de atributos) Decidir cómo se juega Zafias con el Golpe de Fuego

Todo lo anterior depende de esto: mientras el Golpe de Fuego haga el combate trivial, **ningún atributo importa** (escenario W1).
Opciones: (a) reajustar la vida y el daño de cada criatura de Zafias hasta recuperar la curva de «listo» (no sirve subir pisos:
ver la tabla 1c); (b) bajar el Golpe de Fuego (daño o enfriamiento); (c) dejarlo como está y asumir que Zafias es la zona fácil.
Para las propuestas siguientes **uso W2**, que es un mundo donde la habilidad existe y la dificultad ha vuelto. Las propuestas valen
también para W0, pero sus números no cambian el panorama de W1.

### Las tres propuestas de fórmula

Cada una incluye las anteriores:

- **A · arreglar la fuerza.** +1 ATK a los 2 puntos y uno más cada 3 (hoy: el primero a los 10 y luego cada 10).
- **B · A + que INT y DEX sirvan.** INT: +1 al Golpe de Fuego cada 2 puntos (regla nueva). DEX: 4 % de crítico y 2 % de esquiva por
  punto, con topes (60 % y 50 %).
- **C · B + suavizar la vida.** VIT: +3 de vida y +0,3 % de resistencia por punto (hoy +4 y +0,4 %).  **← la que recomiendo.**

| Propuesta | Números respecto a hoy |
|---|---|
| Actual | strPerAtk 10 · vitHp 4 · vitRes 0.004 · dexCrit 0.004 · dexDodge 0.003 · intSkill 0 (INT no toca el Golpe de Fuego) |
| A · fuerza arreglada | strStart 2 · strPerAtk 3 |
| B · A + INT y DEX útiles | strStart 2 · strPerAtk 3 · intStart 2 · dexCrit 0.04 · dexDodge 0.02 · intSkill 2 · dexCritCap 0.6 · dexDodgeCap 0.5 |
| C · B + vida suavizada | strStart 2 · strPerAtk 3 · intStart 2 · vitHp 3 · vitRes 0.003 · dexCrit 0.04 · dexDodge 0.02 · intSkill 2 · dexCritCap 0.6 · dexDodgeCap 0.5 |

*(Leyenda: `strStart`/`strPerAtk` = puntos de STR para el primer +1 ATK y para cada siguiente; `intStart`/`intSkill` = lo mismo
para INT y el Golpe de Fuego; `vitHp`/`vitRes` = vida y resistencia por punto de VIT; `dexCrit`/`dexDodge` = crítico y esquiva
por punto de DEX; `dexCritCap`/`dexDodgeCap` = topes.)*

#### Poder por punto de cada build puro (W2; vida perdida media, cuanto menos mejor)

| Propuesta · build \ puntos | 0 | 2 | 4 | 6 | 8 | 10 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| Actual · todo VIT | 58 % | 44 % | 35 % | 29 % | 25 % | 22 % | 20 % | 16 % | 13 % |
| Actual · todo STR | 58 % | 58 % | 58 % | 58 % | 58 % | 42 % | 42 % | 42 % | 33 % |
| Actual · todo DEX | 58 % | 56 % | 55 % | 55 % | 54 % | 53 % | 52 % | 51 % | 49 % |
| Actual · todo INT | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % |
| A · todo VIT | 58 % | 44 % | 35 % | 29 % | 25 % | 22 % | 20 % | 16 % | 13 % |
| A · todo STR | 58 % | 42 % | 42 % | 33 % | 27 % | 27 % | 21 % | 21 % | 18 % |
| A · todo DEX | 58 % | 56 % | 55 % | 55 % | 54 % | 53 % | 52 % | 51 % | 49 % |
| A · todo INT | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % | 58 % |
| B · todo VIT | 58 % | 44 % | 35 % | 29 % | 25 % | 22 % | 20 % | 16 % | 13 % |
| B · todo STR | 58 % | 42 % | 42 % | 33 % | 27 % | 27 % | 21 % | 21 % | 18 % |
| B · todo DEX | 58 % | 51 % | 45 % | 41 % | 36 % | 32 % | 29 % | 25 % | 22 % |
| B · todo INT | 58 % | 45 % | 36 % | 36 % | 36 % | 34 % | 31 % | 14 % | 3 % |
| C · todo VIT | 58 % | 46 % | 39 % | 33 % | 29 % | 26 % | 24 % | 20 % | 17 % |
| C · todo STR | 58 % | 42 % | 42 % | 33 % | 27 % | 27 % | 21 % | 21 % | 18 % |
| C · todo DEX | 58 % | 51 % | 45 % | 41 % | 36 % | 32 % | 29 % | 25 % | 22 % |
| C · todo INT | 58 % | 45 % | 36 % | 36 % | 36 % | 34 % | 31 % | 14 % | 3 % |

Con la fórmula de hoy hay un atributo que lo hace todo y tres que no hacen nada. Con **C**, a 10 puntos los cuatro builds puros pierden entre
26 % y 34 % (hoy: 22 %, 42 %, 53 % y 58 %); a 20 puntos, entre 17 % y 22 % salvo INT (que a esa altura tumba casi todo de un golpe: 3 %,
algo que en Zafias no se llega a ver porque hacen falta 11 niveles).

#### Partidas completas de Zafias en W2 con cada propuesta

**Actual**

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo VIT | 19.0 | 2.00 | 3.0 | 4.0 | 59 % | 5.3 | 0.0 % |
| todo STR | 111.0 | 6.00 | 7.0 | 7.0 | 56 % | 5.0 | 0.0 % |
| todo DEX | 179.7 | 18.61 | 8.8 | 17.3 | 41 % | 5.0 | 0.0 % |
| todo INT | 316.0 | 53.00 | 12.0 | — | 15 % | 5.0 | 100.0 % |
| STR+VIT (el de hoy) | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| DEX+VIT | 36.0 | 3.74 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| INT+VIT | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| 4 por igual | 110.7 | 7.72 | 7.0 | 8.8 | 46 % | 5.1 | 0.0 % |

**A · fuerza arreglada**

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo VIT | 19.0 | 2.00 | 3.0 | 4.0 | 59 % | 5.3 | 0.0 % |
| todo STR | 36.0 | 3.00 | 4.0 | 5.0 | 44 % | 4.8 | 0.0 % |
| todo DEX | 179.7 | 18.61 | 8.8 | 17.3 | 41 % | 5.0 | 0.0 % |
| todo INT | 316.0 | 53.00 | 12.0 | — | 15 % | 5.0 | 100.0 % |
| STR+VIT (el de hoy) | 19.0 | 2.00 | 3.0 | 4.0 | 38 % | 5.1 | 0.0 % |
| DEX+VIT | 36.0 | 3.74 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| INT+VIT | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| 4 por igual | 36.2 | 3.05 | 4.0 | 5.1 | 56 % | 5.1 | 0.0 % |

**B · A + INT y DEX útiles**

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo VIT | 19.0 | 2.00 | 3.0 | 4.0 | 59 % | 5.3 | 0.0 % |
| todo STR | 36.0 | 3.00 | 4.0 | 5.0 | 44 % | 4.8 | 0.0 % |
| todo DEX | 53.2 | 5.03 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| todo INT | 19.0 | 2.00 | 3.0 | 4.0 | 56 % | 5.0 | 0.0 % |
| STR+VIT (el de hoy) | 19.0 | 2.00 | 3.0 | 4.0 | 38 % | 5.1 | 0.0 % |
| DEX+VIT | 30.7 | 3.01 | 3.7 | 5.0 | 47 % | 5.2 | 0.0 % |
| INT+VIT | 19.0 | 2.00 | 3.0 | 4.0 | 38 % | 5.1 | 0.0 % |
| 4 por igual | 36.2 | 3.10 | 4.0 | 5.1 | 47 % | 5.0 | 0.0 % |

**C · B + vida suavizada**

| Build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| todo VIT | 19.0 | 2.00 | 3.0 | 4.0 | 56 % | 5.4 | 0.0 % |
| todo STR | 36.0 | 3.00 | 4.0 | 5.0 | 44 % | 4.8 | 0.0 % |
| todo DEX | 53.2 | 5.03 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| todo INT | 19.0 | 2.00 | 3.0 | 4.0 | 56 % | 5.0 | 0.0 % |
| STR+VIT (el de hoy) | 19.0 | 2.00 | 3.0 | 4.0 | 41 % | 5.0 | 0.0 % |
| DEX+VIT | 39.5 | 3.56 | 4.1 | 5.5 | 48 % | 5.2 | 0.0 % |
| INT+VIT | 19.0 | 2.00 | 3.0 | 4.0 | 41 % | 5.1 | 0.0 % |
| 4 por igual | 37.7 | 3.27 | 4.1 | 5.3 | 49 % | 5.0 | 0.0 % |

Lo más visible, con el mismo reparto de hoy y con los otros:

- **A sola arregla el reparto de hoy:** «STR+VIT» pasa de 36 combates de entrenamiento y 4,0 caídas a **19 y 2,0**, igual que «todo VIT».
- **Con B y C todos los builds puros terminan y ninguno se atasca.** «Todo INT» pasa de 316 combates y 53 caídas (atascado) a 19 y 2,0;
  «todo STR», de 111 y 6,0 a 36 y 3,0; «todo DEX», de 180 y 18,6 a 53 y 5,0.
- **DEX sigue siendo el más débil de los cuatro** (53 combates de entrenamiento frente a 19-36): es azar y mejora poco al principio.
  Si se quiere más igualado, 5 % / 2,5 % por punto lo deja casi como VIT (tabla 4e: 43 combates y 4,2 caídas en W2, y 86 % de
  victorias en el descenso a 20 puntos frente al 79 % con 4 % / 2 %), pero el crítico llegaría al tope del 60 % con solo 12 puntos.
- «4 por igual» pasa de 111 combates y 7,7 caídas a 38 y 3,3.
- VIT con C pierde algo de poder puro (a 10 puntos, de 22 % a 26 % de vida perdida): es lo previsto.

#### Puntos por nivel

| Fórmulas · build · puntos | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| Actual · STR+VIT (el de hoy) · 2 pts/nivel | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| Actual · STR+VIT (el de hoy) · 3 pts/nivel | 36.0 | 4.00 | 4.0 | 6.0 | 42 % | 5.2 | 0.0 % |
| Actual · STR+VIT (el de hoy) · 4 pts/nivel | 19.0 | 2.00 | 3.0 | 4.0 | 59 % | 5.3 | 0.0 % |
| Actual · 4 por igual · 2 pts/nivel | 110.7 | 7.72 | 7.0 | 8.8 | 46 % | 5.1 | 0.0 % |
| Actual · 4 por igual · 3 pts/nivel | 110.7 | 7.70 | 7.0 | 8.8 | 46 % | 5.1 | 0.0 % |
| Actual · 4 por igual · 4 pts/nivel | 56.6 | 4.03 | 4.9 | 6.0 | 61 % | 5.2 | 0.0 % |
| C · STR+VIT (el de hoy) · 2 pts/nivel | 19.0 | 2.00 | 3.0 | 4.0 | 41 % | 5.0 | 0.0 % |
| C · STR+VIT (el de hoy) · 3 pts/nivel | 19.0 | 2.00 | 3.0 | 4.0 | 41 % | 4.9 | 0.0 % |
| C · STR+VIT (el de hoy) · 4 pts/nivel | 19.0 | 2.00 | 3.0 | 4.0 | 49 % | 4.9 | 0.0 % |
| C · 4 por igual · 2 pts/nivel | 37.7 | 3.27 | 4.1 | 5.3 | 49 % | 5.0 | 0.0 % |
| C · 4 por igual · 3 pts/nivel | 18.9 | 2.16 | 3.0 | 4.2 | 46 % | 4.8 | 0.0 % |
| C · 4 por igual · 4 pts/nivel | 18.5 | 1.97 | 3.0 | 4.0 | 45 % | 4.8 | 0.0 % |

Con **C no hace falta tocar los puntos por nivel**: el reparto de hoy llega igual con 2, 3 o 4 puntos por nivel (19 combates y 2,0
caídas), y «4 por igual» mejora con más puntos (de 38 a 19 combates) pero ya se juega con 2. Con la fórmula de hoy, en cambio, hacen
falta **4 puntos por nivel** para que el reparto de hoy llegue al mismo sitio (19 y 2,0), y «4 por igual» ni así (57 combates, 4,0
caídas): subir los puntos por nivel disimula el problema pero no lo arregla.

#### Cuánto crítico y esquiva por punto de DEX

DEX es el atributo más difícil de igualar porque es azar. Tres valores (el resto de la propuesta C igual):

| Crítico / esquiva por punto · build | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| 3 % / 1.5 % · todo DEX | 68.1 | 6.45 | 5.3 | 7.7 | 40 % | 4.9 | 0.0 % |
| 3 % / 1.5 % · DEX+VIT | 43.3 | 3.80 | 4.3 | 5.8 | 49 % | 5.2 | 0.0 % |
| 4 % / 2.0 % · todo DEX | 53.2 | 5.03 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| 4 % / 2.0 % · DEX+VIT | 39.5 | 3.56 | 4.1 | 5.5 | 48 % | 5.2 | 0.0 % |
| 5 % / 2.5 % · todo DEX | 43.2 | 4.21 | 4.3 | 5.9 | 42 % | 4.9 | 0.0 % |
| 5 % / 2.5 % · DEX+VIT | 36.0 | 3.37 | 3.9 | 5.4 | 46 % | 5.1 | 0.0 % |

Descenso con el bot sensato (600 partidas por celda), «todo DEX»: victorias % / llegadas al jefe %

| Crítico / esquiva por punto | 6 puntos | 12 puntos | 20 puntos | 30 puntos |
|---|---|---|---|---|
| 3 % / 1.5 % | 48 % / 60 % | 59 % / 69 % | 73 % / 82 % | 82 % / 90 % |
| 4 % / 2.0 % | 50 % / 66 % | 68 % / 78 % | 79 % / 87 % | 86 % / 92 % |
| 5 % / 2.5 % | 55 % / 68 % | 73 % / 82 % | 86 % / 92 % | 86 % / 92 % |

Con 4 % / 2 % (el de C), DEX queda algo por debajo de VIT; con 5 % / 2,5 % queda a su altura pero llega al tope de crítico (60 %) con 12
puntos, y su descenso satura a partir de los 20.

---

## ⚠️ Riesgo: los atributos también se usan en el descenso

El banco del descenso (`npm run balance`) **no mira los atributos**: crea el héroe sin puntos, así que no avisa de nada de esto (con 0 puntos
todas las fórmulas dan lo mismo, y es lo que vigila el test de equilibrio, que seguirá en verde: `npm run test:core` sale igual). Para medirlo he
copiado su bucle en `tests/builds-sim.mjs` (`playDescent`) con un héroe que sale con `puntos` ya repartidos. Control: con 0 puntos, la copia del bucle coincide con `playRun` de tools/sim.mjs en las mismas semillas (partidas idénticas) → sensato: 200/200 · experto: 200/200.

Tabla: **victorias % / llegadas al jefe %** en una ruta de 16 pisos, con 0, 6, 12, 20 y 30 puntos repartidos antes de empezar. A 20 puntos hay
nivel 11; a 30, nivel 16.

#### Bot «sensato»

| Propuesta · build | 0 puntos | 6 puntos | 12 puntos | 20 puntos | 30 puntos |
|---|---|---|---|---|---|
| Actual · todo VIT | 41 % / 55 % | 66 % / 78 % | 81 % / 88 % | 94 % / 97 % | 97 % / 99 % |
| Actual · todo STR | 41 % / 55 % | 41 % / 55 % | 46 % / 62 % | 54 % / 69 % | 63 % / 75 % |
| Actual · todo DEX | 41 % / 55 % | 44 % / 56 % | 45 % / 59 % | 45 % / 60 % | 48 % / 61 % |
| Actual · todo INT | 41 % / 55 % | 41 % / 55 % | 42 % / 56 % | 42 % / 57 % | 43 % / 58 % |
| Actual · STR+VIT (el de hoy) | 41 % / 55 % | 55 % / 69 % | 66 % / 78 % | 84 % / 91 % | 92 % / 96 % |
| Actual · INT+VIT | 41 % / 55 % | 55 % / 69 % | 66 % / 78 % | 79 % / 87 % | 88 % / 92 % |
| Actual · DEX+VIT | 41 % / 55 % | 55 % / 68 % | 66 % / 77 % | 75 % / 85 % | 88 % / 93 % |
| Actual · 4 por igual | 41 % / 55 % | 47 % / 58 % | 55 % / 68 % | 62 % / 75 % | 70 % / 79 % |
| A · todo VIT | 41 % / 55 % | 66 % / 78 % | 81 % / 88 % | 94 % / 97 % | 97 % / 99 % |
| A · todo STR | 41 % / 55 % | 54 % / 69 % | 67 % / 79 % | 78 % / 87 % | 83 % / 92 % |
| A · todo DEX | 41 % / 55 % | 44 % / 56 % | 45 % / 59 % | 45 % / 60 % | 48 % / 61 % |
| A · todo INT | 41 % / 55 % | 41 % / 55 % | 42 % / 56 % | 42 % / 57 % | 43 % / 58 % |
| A · STR+VIT (el de hoy) | 41 % / 55 % | 63 % / 77 % | 79 % / 90 % | 93 % / 97 % | 99 % / 100 % |
| A · INT+VIT | 41 % / 55 % | 55 % / 69 % | 66 % / 78 % | 79 % / 87 % | 88 % / 92 % |
| A · DEX+VIT | 41 % / 55 % | 55 % / 68 % | 66 % / 77 % | 75 % / 85 % | 88 % / 93 % |
| A · 4 por igual | 41 % / 55 % | 52 % / 64 % | 63 % / 75 % | 75 % / 87 % | 89 % / 95 % |
| B · todo VIT | 41 % / 55 % | 66 % / 78 % | 81 % / 88 % | 94 % / 97 % | 97 % / 99 % |
| B · todo STR | 41 % / 55 % | 54 % / 69 % | 67 % / 79 % | 78 % / 87 % | 83 % / 92 % |
| B · todo DEX | 41 % / 55 % | 50 % / 66 % | 68 % / 78 % | 79 % / 87 % | 86 % / 92 % |
| B · todo INT | 41 % / 55 % | 49 % / 64 % | 58 % / 73 % | 68 % / 81 % | 79 % / 90 % |
| B · STR+VIT (el de hoy) | 41 % / 55 % | 63 % / 77 % | 79 % / 90 % | 93 % / 97 % | 99 % / 100 % |
| B · INT+VIT | 41 % / 55 % | 58 % / 72 % | 75 % / 87 % | 89 % / 96 % | 97 % / 99 % |
| B · DEX+VIT | 41 % / 55 % | 61 % / 73 % | 75 % / 85 % | 93 % / 97 % | 98 % / 99 % |
| B · 4 por igual | 41 % / 55 % | 55 % / 67 % | 68 % / 81 % | 87 % / 95 % | 97 % / 99 % |
| C · todo VIT | 41 % / 55 % | 61 % / 74 % | 76 % / 85 % | 87 % / 92 % | 95 % / 98 % |
| C · todo STR | 41 % / 55 % | 54 % / 69 % | 67 % / 79 % | 78 % / 87 % | 83 % / 92 % |
| C · todo DEX | 41 % / 55 % | 50 % / 66 % | 68 % / 78 % | 79 % / 87 % | 86 % / 92 % |
| C · todo INT | 41 % / 55 % | 49 % / 64 % | 58 % / 73 % | 68 % / 81 % | 79 % / 90 % |
| C · STR+VIT (el de hoy) | 41 % / 55 % | 59 % / 74 % | 75 % / 87 % | 89 % / 95 % | 97 % / 100 % |
| C · INT+VIT | 41 % / 55 % | 54 % / 69 % | 69 % / 84 % | 83 % / 93 % | 93 % / 98 % |
| C · DEX+VIT | 41 % / 55 % | 58 % / 69 % | 70 % / 81 % | 89 % / 94 % | 97 % / 98 % |
| C · 4 por igual | 41 % / 55 % | 54 % / 66 % | 65 % / 79 % | 83 % / 93 % | 94 % / 98 % |

#### Bot «experto»

| Propuesta · build | 0 puntos | 6 puntos | 12 puntos | 20 puntos | 30 puntos |
|---|---|---|---|---|---|
| Actual · todo VIT | 51 % / 66 % | 76 % / 84 % | 87 % / 94 % | 96 % / 97 % | 98 % / 100 % |
| Actual · todo STR | 51 % / 66 % | 51 % / 66 % | 62 % / 75 % | 67 % / 80 % | 70 % / 84 % |
| Actual · todo DEX | 51 % / 66 % | 60 % / 72 % | 61 % / 74 % | 64 % / 75 % | 63 % / 75 % |
| Actual · todo INT | 51 % / 66 % | 51 % / 66 % | 52 % / 68 % | 54 % / 69 % | 55 % / 70 % |
| Actual · STR+VIT (el de hoy) | 51 % / 66 % | 67 % / 79 % | 76 % / 84 % | 87 % / 94 % | 95 % / 98 % |
| Actual · INT+VIT | 51 % / 66 % | 67 % / 79 % | 76 % / 84 % | 85 % / 92 % | 90 % / 96 % |
| Actual · DEX+VIT | 51 % / 66 % | 75 % / 84 % | 81 % / 88 % | 89 % / 92 % | 92 % / 96 % |
| Actual · 4 por igual | 51 % / 66 % | 65 % / 76 % | 75 % / 84 % | 78 % / 89 % | 84 % / 90 % |
| A · todo VIT | 51 % / 66 % | 76 % / 84 % | 87 % / 94 % | 96 % / 97 % | 98 % / 100 % |
| A · todo STR | 51 % / 66 % | 67 % / 80 % | 77 % / 86 % | 86 % / 93 % | 91 % / 95 % |
| A · todo DEX | 51 % / 66 % | 60 % / 72 % | 61 % / 74 % | 64 % / 75 % | 63 % / 75 % |
| A · todo INT | 51 % / 66 % | 51 % / 66 % | 52 % / 68 % | 54 % / 69 % | 55 % / 70 % |
| A · STR+VIT (el de hoy) | 51 % / 66 % | 73 % / 83 % | 86 % / 93 % | 96 % / 99 % | 99 % / 100 % |
| A · INT+VIT | 51 % / 66 % | 67 % / 79 % | 76 % / 84 % | 85 % / 92 % | 90 % / 96 % |
| A · DEX+VIT | 51 % / 66 % | 75 % / 84 % | 81 % / 88 % | 89 % / 92 % | 92 % / 96 % |
| A · 4 por igual | 51 % / 66 % | 68 % / 81 % | 76 % / 87 % | 88 % / 93 % | 95 % / 99 % |
| B · todo VIT | 51 % / 66 % | 76 % / 84 % | 87 % / 94 % | 96 % / 97 % | 98 % / 100 % |
| B · todo STR | 51 % / 66 % | 67 % / 80 % | 77 % / 86 % | 86 % / 93 % | 91 % / 95 % |
| B · todo DEX | 51 % / 66 % | 67 % / 78 % | 78 % / 86 % | 86 % / 93 % | 91 % / 95 % |
| B · todo INT | 51 % / 66 % | 64 % / 79 % | 73 % / 87 % | 82 % / 93 % | 90 % / 97 % |
| B · STR+VIT (el de hoy) | 51 % / 66 % | 73 % / 83 % | 86 % / 93 % | 96 % / 99 % | 99 % / 100 % |
| B · INT+VIT | 51 % / 66 % | 71 % / 82 % | 84 % / 92 % | 95 % / 98 % | 98 % / 99 % |
| B · DEX+VIT | 51 % / 66 % | 77 % / 87 % | 86 % / 94 % | 95 % / 98 % | 99 % / 100 % |
| B · 4 por igual | 51 % / 66 % | 75 % / 83 % | 82 % / 89 % | 95 % / 98 % | 99 % / 100 % |
| C · todo VIT | 51 % / 66 % | 71 % / 81 % | 83 % / 89 % | 91 % / 96 % | 97 % / 98 % |
| C · todo STR | 51 % / 66 % | 67 % / 80 % | 77 % / 86 % | 86 % / 93 % | 91 % / 95 % |
| C · todo DEX | 51 % / 66 % | 67 % / 78 % | 78 % / 86 % | 86 % / 93 % | 91 % / 95 % |
| C · todo INT | 51 % / 66 % | 64 % / 79 % | 73 % / 87 % | 82 % / 93 % | 90 % / 97 % |
| C · STR+VIT (el de hoy) | 51 % / 66 % | 71 % / 82 % | 82 % / 89 % | 92 % / 97 % | 97 % / 100 % |
| C · INT+VIT | 51 % / 66 % | 68 % / 81 % | 81 % / 90 % | 92 % / 97 % | 97 % / 99 % |
| C · DEX+VIT | 51 % / 66 % | 76 % / 85 % | 83 % / 91 % | 93 % / 98 % | 99 % / 100 % |
| C · 4 por igual | 51 % / 66 % | 73 % / 82 % | 81 % / 89 % | 94 % / 97 % | 98 % / 99 % |

**Qué se ve** (sensato y experto dicen lo mismo; el experto se mueve ±3 puntos por tener 300 partidas por celda):

- **Hoy los puntos mandan en el descenso, y solo los de VIT.** Con 20 puntos, «todo VIT» gana el 94 % de las rutas (sensato) y los
  otros tres atributos, con los mismos puntos, el 54 %, el 45 % y el 42 %. Con el experto: 96 % frente a 67 %, 64 % y 54 %.
- **Con C los builds puros quedan mucho más juntos.** A 20 puntos, de 94-42 (52 puntos de diferencia) a 87-68 (19) con el sensato, y de
  96-54 a 91-82 con el experto. A 12 puntos, de 81-42 a 76-58 (sensato).
- **El techo no sube.** El mejor build a 20 puntos gana el 94 % hoy y el 89 % con C (sensato); el 96 % y el 93 % (experto). A 30 puntos, 97 %
  en los dos casos.
- **Lo que sube es el suelo, sobre todo en los builds mezclados:** «4 por igual» a 20 puntos pasa de 62 % a 83 % (sensato) y de 78 % a
  94 % (experto); «DEX+VIT» de 75 % a 89 % (sensato). El reparto de hoy (STR+VIT) gana poco: a 12 puntos, de 66 % a 75 % (sensato) y de 76 % a
  82 % (experto).
- **Riesgo para quien decida:** si el director no quiere que el descenso sea más fácil para quien reparte los puntos entre varios atributos
  (entre 6 y 20 puntos, de +4 a +21 puntos de victoria con el sensato), habría que compensarlo por el lado del descenso (por ejemplo, con la
  dureza por tramo, `depth.tierMul`). Eso **no lo he medido**: lo dejo anotado.
- **A 0 puntos no cambia nada** (todas las fórmulas dan lo mismo), así que el vigilante de equilibrio (`tests/balance-guard.mjs`) y `npm run balance`
  seguirán sin enterarse de nada de esto: ninguno de los dos reparte puntos. Merece la pena dárselo (ver «Para después»).

---

## Código listo para aplicar (propuesta C)

> Solo si se decide aplicarla. **Yo no he tocado `src/`.**

`src/stats.js`:

```js
// Bono escalonado: el primero llega a los `first` puntos y luego uno más cada `every`
const step = (d, first, every) => (d < first ? 0 : 1 + Math.floor((d - first) / every));

export function derivePrimary(primary, weaponDamageType) {
    const p = { ...PRIMARY_BASE, ...primary };
    const d = k => Math.max(0, p[k] - PRIMARY_BASE[k]);
    const isPhys = isPhysicalDamage(weaponDamageType);
    const isElem = isElementalDamage(weaponDamageType);
    return {
        maxHpBonus: (p.vit - PRIMARY_BASE.vit) * 3,                          // antes 4
        atqBonus: isPhys ? step(d('str'), 2, 3) : 0,                         // antes floor(d / 10)
        elemDmgBonus: isElem ? Math.floor((p.int - PRIMARY_BASE.int) / 10) : 0,   // sin cambios
        skillBonus: step(d('int'), 2, 2),                                    // NUEVO: +1 al Golpe de Fuego cada 2 puntos de INT
        critChance: Math.min(0.6, d('dex') * 0.04),                          // antes 0,004 y sin tope
        critMult: 1.5,
        dodgeChance: Math.min(0.5, d('dex') * 0.02),                         // antes 0,003 y sin tope
        physResist: d('vit') * 0.003,                                        // antes 0,004
        elemResist: Math.max(0, (p.int - PRIMARY_BASE.int) * 0.004)          // sin cambios
    };
}
```

`src/engine.js` (la regla nueva de INT; el banco la aplica con el `skillMods` que el motor ya respeta, así que el efecto es el mismo):

```js
// createRpgHero: añadir  skillBonus: 0  junto a  elemResist: 0
// refreshPrimaryStats: añadir
hero.skillBonus = bonus.skillBonus;
// rpgSkillInfo: en  let bonus = mods.damage || 0;  sumar el de INT
let bonus = (mods.damage || 0) + (skillId === 'fire_strike' ? (hero.skillBonus || 0) : 0);
```

Quedan por actualizar `PRIMARY_INFO.int.desc` («Daño elemental y **potencia el Golpe de Fuego**»), el texto de las tarjetas de personaje
y `tests/stats-sim.mjs` (sus comprobaciones de fórmulas usan los números de hoy).

---

## Cómo reproducirlo

```bash
node tests/builds-sim.mjs fuego        # 1 · el Golpe de Fuego (≈ 40 s)
node tests/builds-sim.mjs builds       # 2 · builds en los tres escenarios (≈ 12 min)
node tests/builds-sim.mjs poder        # 3 · poder por punto y por nivel (segundos)
node tests/builds-sim.mjs propuestas   # 4 · propuestas A, B y C (≈ 7 min)
node tests/builds-sim.mjs descenso     # 5 · el descenso (≈ 20 min con cada bot; --bot sensato|experto para uno solo)
node tests/builds-sim.mjs semillas     # 6 · otras semillas (≈ 6 min)
node tests/builds-sim.mjs todo         # todo seguido
```

Opciones: `--runs N` (partidas por variante con azar, 2000), `--det-runs N` (por variante sin azar, 200), `--descenso-runs N` (600 con el
bot sensato; el experto, la mitad), `--seed S`. Se puede lanzar cada sección en su propio proceso a la vez. Todas las tablas de este
informe salen literalmente de esa salida (el banco imprime Markdown).

### Estabilidad con otras semillas

| Partidas | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| 100 partidas | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| 200 partidas | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |
| 2000 partidas | 36.0 | 4.00 | 4.0 | 6.0 | 50 % | 5.3 | 0.0 % |

| Variante | Entrenan antes de Grask | Caídas / partida | Nivel en Grask | Nivel en Feronius | Vida perdida ante Feronius | Turnos / combate | Se atascan |
|---|---|---|---|---|---|---|---|
| Actual · todo DEX · semilla 1000 | 179.7 | 18.61 | 8.8 | 17.3 | 41 % | 5.0 | 0.0 % |
| Actual · todo DEX · semilla 500000 | 179.2 | 18.50 | 8.8 | 17.3 | 41 % | 5.0 | 0.0 % |
| Actual · todo DEX · semilla 9000000 | 178.7 | 18.49 | 8.8 | 17.2 | 41 % | 5.0 | 0.0 % |
| Actual · DEX+VIT · semilla 1000 | 36.0 | 3.74 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| Actual · DEX+VIT · semilla 500000 | 36.2 | 3.74 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| Actual · DEX+VIT · semilla 9000000 | 36.1 | 3.72 | 4.0 | 5.7 | 50 % | 5.2 | 0.0 % |
| C · todo DEX · semilla 1000 | 53.2 | 5.03 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| C · todo DEX · semilla 500000 | 52.6 | 5.01 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| C · todo DEX · semilla 9000000 | 53.4 | 5.07 | 4.7 | 6.5 | 42 % | 4.9 | 0.0 % |
| C · DEX+VIT · semilla 1000 | 39.5 | 3.56 | 4.1 | 5.5 | 48 % | 5.2 | 0.0 % |
| C · DEX+VIT · semilla 500000 | 39.3 | 3.58 | 4.1 | 5.5 | 47 % | 5.2 | 0.0 % |
| C · DEX+VIT · semilla 9000000 | 39.7 | 3.53 | 4.1 | 5.5 | 49 % | 5.2 | 0.0 % |

Sin DEX las partidas son idénticas, y con DEX la diferencia entre tres bloques de 2000 partidas distintas es de menos de 1 combate de entrenamiento y de décimas de caída.

---

## Método y límites

- **Bot y banco:** el de `tests/lib/adventure-bot.mjs`, sin modificar. Las políticas, el reparto de puntos y el héroe (fórmulas nuevas,
  arma) entran por sus ganchos (`policy`, `allocate`, `heroHook`). Las fórmulas nuevas se aplican sobre el héroe justo antes de cada combate
  (`applyDerive`); con los números de hoy dan exactamente lo mismo que `derivePrimary` (el banco lo comprueba al arrancar).
- **Pisos de los enemigos:** se suben en memoria (`withShift`), como el `SHIFT` de `tests/adventure-sim.mjs`, y se devuelven al terminar.
- **«Vida perdida» bruta:** lo que le quitan al héroe aunque beba poción (el informe de `tests/adventure-sim.mjs` resta lo curado, y por
  eso da cifras negativas a veces). Medida desde fuera, envolviendo la política y `onVictory`.
- **Poder por punto:** duelos sueltos con la vida llena y sin pociones; para los builds sin DEX, 3 repeticiones por combate (idénticas);
  con DEX, 150.
- **Descenso:** sensato 600 partidas por celda, experto 300 (el experto mira dos rondas hacia delante y es lento). Tras cada botín se
  recalculan las derivadas (STR/INT dependen del arma) como hace `main.js`; `tools/sim.mjs` no lo hace.
- **No medido:** los puntos de nivel se reparten en bloque y no cambia la curva de XP (`xpToNext`, `POINTS_PER_LEVEL` están importados dentro
  de la librería del bot; los puntos por nivel de más se emulan sumando extras al mismo atributo). Tampoco se ha probado el equipo de
  la forja ni el trofeo del jefe sobre los atributos, ni más de un jefe de zona.
