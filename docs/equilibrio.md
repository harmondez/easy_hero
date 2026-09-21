# ⚖️ Equilibrio — cómo se mide y dónde está

> Resultado de la **entrega A** (1.0.1). El objetivo de diseño es que **un jugador medio gane 1 de cada 5 partidas (20 %)**.
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
| Torpe | 32 % | **12,5 %** | ~3 % *(algo generoso, ver observaciones)* |
| **Sensato** | 54 % | **18,8 %** | **~20 % ✅** |
| Experto | 77 % | **53,8 %** | ~50 % ✅ |

*(1000 partidas por bot.)*

### Antes y después

| | Antes de la entrega A | Ahora |
|--|:---------------------:|:-----:|
| Un combate normal cuesta | **20-30 %** de la vida | **6-17 %** (el más caro, el 17 %, en el piso 5) |
| Un sub-jefe con el héroe **sano** | **Lo mata** desde el piso 5 | Cuesta 23-42 %: es un reto **vencible** |
| Un jugador sensato llega al jefe | 0,2 % | **54 %** |
| Un jugador sensato **vence** al jefe | 0 % | **19 %** |

## 3. Qué se cambió

Primero se añadieron las **mecánicas** (que ya, por sí solas, bajan el coste de cada combate) y después se afinaron los **números**,
palanca a palanca, con el banco:

| Mecánica | Efecto |
|----------|--------|
| 👁️ **Intenciones visibles** | El jugador ve el golpe que viene y puede defenderse justo cuando hace falta |
| 🔥 **Hogueras** | Curan el 30 % y siempre hay una antes del jefe (~9 por mapa, ≥ 2 en todo camino) |
| 💀 **Sub-jefes opcionales** | Siempre hay una salida sin ellos; pasan de ~20 % a ~10 % de los nodos |
| 👹 **15 monstruos distintos** | Cada uno con su patrón: carga, se protege, se cura… |

| Número | Antes | Ahora |
|--------|:-----:|:-----:|
| ATK de un monstruo por piso | +0,5 | **+0,28** |
| Sub-jefe: vida / ATK | ×2,5 / +2 | **×1,3 / +1** |
| Jefe final: vida / ATK | ×3,5 / +5 | **×1,5 / +2** |
| Peso de los sub-jefes en el mapa | 20 | **10** |
| Peso de las hogueras | — | 12 |

## 4. Observaciones y cosas por decidir

- **El bot torpe gana un 12,5 %.** Es más de lo previsto (~3 %): el juego perdona bastante a quien solo pulsa *Atacar*. Sigue habiendo
  diferencia entre jugar mal (12,5 %), bien (19 %) y muy bien (54 %), pero la brecha entre torpe y sensato es corta. Se puede ampliar con
  golpes fuertes más castigadores, aunque también bajaría el porcentaje del jugador medio.
- **Un pico de dificultad en el piso 14.** El **Jabalí Colosal** (justo antes de la hoguera final) mata al 24 % de los jugadores
  sensatos que caen. Es la última pelea antes de poder curarse. Se puede suavizar moviendo el monstruo o dando una hoguera antes.
- **El jefe final es la causa del 36 % de las muertes del sensato.** Es lo esperado: es el reto final.
- **La tasa depende de los bots.** Un jugador humano decide de otra forma. Cuando haya jugadores, las métricas locales (secundario
  S15) darán datos reales para reajustar.
- **Se recalibrará en cada entrega.** El equipo y las mejoras (entrega B) añaden mucho poder: el banco se ejecutará de nuevo.

## 5. Cómo volver a ajustar

1. Ejecuta `npm run balance` y mira dónde mueren los bots.
2. Prueba **una sola** palanca con `--set` (por ejemplo, `--set monster.atkPerFloor=0.3`).
3. Cuando una variante guste, cambia el número en `src/data/balance.js` y ejecuta `npm test`: el vigilante confirma que sigue dentro de las bandas.
4. Anota aquí el antes y el después.
