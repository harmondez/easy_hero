# 🔭 El futuro de Easy Hero

> Hacia dónde crece el juego cuando crezca. Lo inmediato está en [planning.md](planning.md); aquí, las decisiones de
> fondo y el mapa del mundo que queremos construir.

---

## 1. Plataforma: seguimos en la web, con dominio propio cuando el juego lo pida

**Decisión (2 de octubre de 2026):** Easy Hero sigue siendo un juego web. Cuando tenga **horas de contenido** y haya
**gente conocida jugándolo de verdad**, damos el salto a **dominio propio** y vamos sumando maquinaria por etapas.
Nada de reescribirlo en otro motor.

### Por qué la web

- Es un juego por turnos de menús, diálogos y pantallas: lo que la web hace bien. No necesita la potencia de Unity ni
  de Godot.
- Lo que tiene valor no depende de la plataforma: el motor es puro, el contenido son datos y hay más de mil
  comprobaciones automáticas. Reescribir serían meses para volver al mismo punto.
- Desde la misma web se llega a todo: móvil (Capacitor) y Steam (Tauri o Electron). Una actualización, todas las
  plataformas. *CrossCode* (JavaScript) salió así en Steam y en consolas.

### Cuándo dar el salto (señales, no fechas)

- **Contenido:** unas 4-5 horas de juego, con al menos tres zonas terminadas (Zafias y dos más).
- **Jugadores:** un grupo de conocidos que vuelve por su cuenta y pide más, no solo que lo prueba una vez.
- **Una molestia real:** que alguien pierda su partida por borrar el navegador, o que pida jugar en otro dispositivo.

### Las etapas, cada una cuando haga falta

| Etapa | Qué | Para qué |
|:-:|---|---|
| 1 | **Dominio propio** apuntando a Cloudflare (ya publicamos ahí las vistas previas) y juego **instalable** (PWA, funciona sin conexión) | Que parezca un juego de verdad. Coste: ~10 € al año |
| 2 | **Cuentas y partida en la nube** (Cloudflare Workers + D1, o Supabase) | No perder nunca la partida y jugar en varios sitios |
| 3 | **TypeScript poco a poco** (con Vite), sin cambiar a React | Que el código aguante el crecimiento |
| 4 | **Tiendas:** Steam con Tauri o Electron; Android e iOS con Capacitor | Vender o tener visibilidad, con la misma web |
| 5 | **Otro motor (Godot)**, solo si el juego cambia de naturaleza: tiempo real o consolas | — |

**Descartado por ahora:** Flutter o Kotlin (reescribir para una sola plataforma), Unity (licencia y peso para un juego
2D por turnos), React y un servidor en Python (no ganamos nada que no dé ya Cloudflare).

---

## 2. El mapa del mundo

| # | Zona | Estado | Quién la gobierna | Enemigos |
|:-:|---|---|---|---|
| 1 | **El pueblo de Zafias** | ✅ Jugable | Los vecinos (los goblins de Grask cortaban los caminos) | Goblins, lobos, Grask, Feronius |
| 2 | **El castillo de Zafias** | Por hacer | **Los gnolls** | Gnolls, Gnoll Berserker, **Gnarok** (ya dibujados) |
| 3 | **El bosque amarillo** | Por hacer | **Tribus de orcos** | Orcos, Orco Guerrero, Orco Chamán, **Guul, el Rey Orco** (ya dibujados) |
| 4 | **Las Minas Hundidas** | Por hacer (zona de Claude) | Nadie, desde hace mucho | Por decidir, con la historia del director |

### 2.1 El castillo de Zafias (del director)

Grande por dentro: varias escenas (patio, salones, mazmorras, torres). Gobernado por gnolls.

Lo que ya está sembrado en Zafias y lleva hasta él:
- La escalinata, con un guardia que te para: «Cerrado hasta nueva orden», y tablones clavados por dentro.
- El camino del norte, junto a la cascada, con un portón atrancado desde dentro y demasiado silencio.
- Desde la torre del vigía se ven las banderas en las almenas, pero no se asoma nadie.

> ⚠️ **Contradicción a resolver:** en Zafias los goblins dicen que «el castillo es cosa de Grask», y quien cierra la
> puerta es un guardia humano. Si el castillo es de los gnolls, hay que decidir cómo encaja: ¿Grask fanfarronea? ¿El
> guardia está a las órdenes de los gnolls? ¿Los gnolls llegaron después? No lo decido yo: lo marco.

### 2.2 El bosque amarillo (del director)

Tribus de orcos. El chamán y su fuego (quemadura), el guerrero de armadura negra (aguanta el daño físico) y Guul,
el rey, que se cubre y golpea fuerte. Un buen sitio para que importen las armas elementales y la Bola de fuego.

### 2.3 Las Minas Hundidas (zona de Claude; historia y arte, del director)

**La idea en una frase:** detrás de la cueva sellada del sur están las minas viejas de Zafias: una zona grande, hecha a
mano como Zafias, de galerías y cavidades subterráneas con secretos.

**No es el roguelike.** El descenso sigue aparcado. Esto es una zona de la aventura como las demás: escenas
pintadas, paradas, personajes, misiones y un jefe.

**Por qué aquí.** El juego ya la está pidiendo. Todo esto está escrito en Zafias y nadie lo ha usado:
- La cueva del sur está sellada: «Algo te dice que todavía no estás preparado para entrar aquí».
- Maela: «dicen que de las cuevas del sur salen cosas peores».
- Bram: «Si algún día bajas a las cuevas del sur y vuelves con hierro de allí, tráemelo».

**Cómo se abre.** Cuando estés preparado; por ejemplo, tras vencer a Feronius la cueva ya no te echa para atrás.

**Ideas de partida** (hasta que lleguen la historia y el arte del director, que mandan):
- Varias escenas bajo tierra: la boca de la mina, las galerías, una cavidad grande, la parte hundida.
- **Secretos:** puntos de interés que esconden algo, y pasos que solo se abren más tarde.
- **Hierro de las minas** en vetas: Bram lo convierte en **armaduras y cascos**. Así se estrenan las ranuras de equipo
  que ya tienen icono.
- Un jefe al fondo.

**La historia es del director.** No toca la misión principal (quién es el héroe) salvo que él lo decida.

---

## 3. Lo siguiente, en orden

1. **Cerrar Zafias bien.**
   - Decidir las tres pistas del pasado del héroe: la empuñadura que Bram no reconoce, el buhonero que pregunta y
     las piedras azules.
   - Recalibrar la dificultad con el banco (el bot aún no usa energía, efectos ni armas nuevas).
   - Que el oro de la zona dé para comprar algo de la tienda.
2. **El castillo de Zafias** (gnolls). Resolver la contradicción de quién lo tiene. Mapa grande por escenas, con la
   receta de [docs/zonas.md](docs/zonas.md). Retratos con la fábrica (`npm run generate -- portrait …`) y diálogos
   con `npm run vn`.
3. **El equipo completo:** armadura, casco, guantes, botas, cinturón, collar y anillo (los iconos ya están). Hace
   falta antes de las Minas.
4. **El bosque amarillo** (orcos).
5. **Las Minas Hundidas**, con la historia y el arte que prepare el director.
6. **Etapa 1 de la plataforma** (dominio propio y juego instalable) en cuanto se cumplan las señales de arriba.
