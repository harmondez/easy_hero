# ⚖️ Equilibrio — cómo se mide y dónde está

> **⚠️ Objetivo nuevo desde la 1.4.0.** Con el **descenso sin fin**, vencer al primer jefe dejó de ser el final
> del juego y pasó a ser **la puerta del bucle**: si solo lo cruzara 1 de cada 5 jugadores, casi nadie llegaría a
> ver lo que sostiene la partida. El objetivo pasa del **20 % al 40 %**, medido siempre **sin mejoras compradas**
> en La Forja. La dificultad de verdad ya no vive en el primer jefe, sino en **hasta dónde aguantas bajando**.
>
> Lo de abajo describe el método (que no cambia) y el histórico. Resultado vigente en la sección 2.

## 0. Resultado vigente (1.4.0)

| Bot | Llega al primer jefe | **Lo vence** | Objetivo |
|-----|:------------------:|:------------:|:--------:|
| Torpe | 4 % | **3 %** | bajo |
| **Sensato** | 51 % | **39 %** | **~40 % ✅** |
| Experto | 65 % | **53 %** | alto |

*(1000 partidas por bot, con un héroe **sin ninguna mejora de La Forja**. Un jugador veterano, con mejoras
compradas, cruza el primer tramo con mucha más holgura: para él el reto empieza al bajar.)*

**Palancas movidas** (de una en una, como manda la casa): `monster.hpPerFloor` 3,6 → **2,9** y
`monster.atkPerFloor` 0,4 → **0,34**. Nada más se tocó.

### La curva del descenso

Cada tramo multiplica las estadísticas por **1,5 acumulativo** (y el oro por 1,6). Eso crea el muro que el
jugador empuja comprando mejoras:

| Tramo | Monstruo del piso 8 | Jefe del tramo |
|:-----:|:-------------------:|:--------------:|
| 0 | ATK 3 · HP 29 | ATK 8 · HP 75 |
| 1 | ATK 5 · HP 44 | ATK 12 · HP 113 |
| 2 | ATK 7 · HP 65 | ATK 18 · HP 169 |
| 3 | ATK 10 · HP 98 | ATK 27 · HP 253 |
| 5 | ATK 23 · HP 220 | ATK 61 · HP 570 |

> **Limitación conocida**: el banco **no simula el descenso**. Los bots juegan el tramo 0 y no compran nada, así
> que esta tabla está calculada, no medida. Saber en qué tramo muere un jugador con X mejoras exige extender
> `tools/sim.mjs`; está anotado en [planning.md](../planning.md).

---

## Histórico: entrega B1 (1.0.2)

> Resultado de la **entrega B1** (1.0.2: equipo), cuando el objetivo era que **un jugador medio ganara 1 de cada 5 partidas (20 %)**.
> Todo lo que hay aquí sale de `npm run balance`: se puede repetir y comprobar.

## 1. Cómo se mide

`npm run balance` juega miles de partidas completas con **tres bots** y cuenta qué pasa. No son jugadores reales, pero sirven
para tocar números con datos y no a ojo.

| Bot | Cómo juega | Para qué sirve |
|-----|-----------|----------------|
| **Torpe** | Ataca siempre, camina al azar, decide los eventos al azar | El suelo: alguien que no piensa |
| **Sensato** | Usa las intenciones (se defiende antes de un golpe fuerte), evita sub-jefes, se cura cuando toca | **El jugador medio**: es el que fija el 20 % |
| **Experto** | Mira dos rondas hacia delante y elige la ruta según lo que le costaría cada pelea | El techo: alguien que domina el juego |

```bash
npm run balance                                   # 1000 partidas por bot
npm run balance -- --n 3000                       # más partidas (más precisión)
npm run balance -- --set boss.hpMul=1.8           # prueba una variante SIN tocar ningún archivo
npm run balance -- --bots sensato                 # solo un bot
```

Los números viven en un solo archivo, [`src/data/balance.js`](../src/data/balance.js), y hay un **vigilante**
(`npm run test:balance`) que salta si un cambio deja el juego injugable, demasiado fácil o sin diferencia entre jugar bien y mal.

## 2. Resultado

| Bot | Llega al jefe | **Vence al jefe** | Objetivo |
|-----|:------------:|:-----------------:|:--------:|
| Torpe | 2,5 % | **0,7 %** | ~3 % |
| **Sensato** | 33 % | **22,3 %** | **~20 % ✅** |
| Experto | 52 % | **37,8 %** | ~50 % |

*(1000 partidas por bot. Los bots eligen y equipan objetos como haría un jugador de su nivel: el torpe se lleva uno al azar y
lo equipa siempre; sensato y experto comparan y solo se quedan lo que mejora su puntuación.)*

### Antes y después (entrega A → B1: equipo)

| | Con la 1.0.1 (sin equipo) | Ahora (1.0.2) |
|--|:---------------------:|:-----:|
| De dónde sale la fuerza del héroe | +1 ATK / +4 HP por cada victoria | **Solo del equipo** que encuentras |
| ATK de un monstruo por piso | +0,28 | **+0,4** (para compensar el equipo) |
| HP de un monstruo por piso | +3 | **+3,6** |
| Un jugador sensato vence al jefe | 18,8 % | **22,3 %** |
| Un jugador torpe vence al jefe | 12,5 % *(demasiado generoso)* | **0,7 %** *(sin builds no hay margen de error)* |

## 3. Qué se cambió

- **Cofres, hoguera y sub-jefes ya no dan números fijos**: ofrecen 1 de 3 objetos (chest sin mínimo, hoguera ≥ 🟢, sub-jefe ≥ 🔵).
- **La victoria dejó de dar fuerza.** Con el crecimiento automático y equipo a la vez, el sensato ganaba el 85 %: demasiado. Se quitó
  del todo (el plan preveía mantenerlo «hasta la entrega B», pero con equipo ya sobraba).
- **El piso 1 es siempre un cofre**: sin un primer objeto, el 15 % del sensato moría en el piso 5 antes de encontrar nada.
- **Monstruos más duros** (`atkPerFloor 0,4`, `hpPerFloor 3,6`) para que el equipo se note sin desequilibrar la curva.

## 4. Observaciones y cosas por decidir

- **El torpe casi no gana (0,7 %).** Sin el colchón de +ATK/+HP por victoria, equivocarse de objeto (el torpe equipa el primero que
  sale, sin comparar) sale caro. Es coherente con el objetivo («el suelo: alguien que no piensa»), pero conviene vigilarlo cuando
  lleguen las mejoras pasivas (B2): si compensan de más, el suelo subirá solo.
- **El experto (37,8 %) ya no dobla tan claramente al sensato (22,3 %).** Ambos usan la misma lógica de «qué objeto me conviene» en
  el banco; la diferencia real está en cómo juegan el combate y el mapa. Con las mejoras de B2 debería volver a abrirse la brecha.
- **Pico de dificultad en el piso 14** (el Jabalí Colosal, justo antes de la hoguera final): sigue pendiente de revisar.
- **El jefe final** sigue siendo la causa más común de derrota del sensato.
- **La tasa depende de cómo elige el bot su equipo**, no solo de cómo pelea. Con jugadores reales esto puede variar bastante:
  cuando haya métricas (secundario S15) se reajustará con datos.
- **Se recalibrará otra vez en B2** (mejoras «elige 1 de 3» y afinidad): al sumar otra fuente de poder, el banco se ejecutará de nuevo.

## 5. Cómo volver a ajustar

1. Ejecuta `npm run balance` y mira dónde mueren los bots.
2. Prueba **una sola** palanca con `--set` (por ejemplo, `--set monster.atkPerFloor=0.38`).
3. Cuando una variante guste, cambia el número en `src/data/balance.js` y ejecuta `npm test`: el vigilante confirma que sigue dentro de las bandas.
4. Anota aquí el antes y el después.
