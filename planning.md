# 🗺️ Planificación — lo pendiente

> Solo lo que falta por hacer y las decisiones vigentes. Lo hecho y cómo se resolvió está en
> [historial.md](historial.md) (la bitácora). Cómo se trabaja: [CLAUDE.md](CLAUDE.md),
> [cloud-method.md](cloud-method.md) (sesiones en la nube) y [tools/image-generator/README.md](tools/image-generator/README.md)
> (fábrica de arte).

## 📍 Estado (2026-10-02)

- **Publicado:** la **1.9.2** (https://harmondez.github.io/easy_hero/): Easy Hero es solo la aventura (la mazmorra,
  aparcada tras la cueva sellada). Zafias con introducción, 4 escenas, 28 paradas, misiones y diario, Grask y
  **Feronius**; combate de lado con **efectos de estado**, **maná**, **PH** y barra de habilidades; 10 armas con rareza,
  elemento y efecto; energía y Golpe poderoso; aturdido que da turno al enemigo; tienda con elixires y cristales; inventario estilo DragonFable; diálogos de novela visual; toda la
  interfaz con arte del director. Criaturas con nombre en la recámara (gnolls y orcos con sus jefes, ya dibujados).
- Herramientas: taller de sprites, Asset Factory, montaje de zonas (`docs/zonas.md`) y banco de la aventura
  (`npm run sim:aventura`).

## 🔥 Siguiente, en este orden

0. **Equilibrio de la aventura, con los informes de la nube** (#8 builds y atributos, #9 progresión; #10 variedad de
   combate, sin lanzar). Antes del bosque amarillo:
   - **Progresión del héroe:** decidido el camino —equipo propio de la aventura, por misiones y jefes (la Espada de
     Zafias es el primero)—. Falta la curva: cuántas armas, de qué ATK y dónde, con el informe del #9.
   - **Recalibrar Zafias:** el bot no usa la Bola de fuego con maná, ni el Grito de guerra, ni elixires, ni las armas
     de la tienda (300-2000 de oro, ATK 2-5 con efecto), ni sufre bien los efectos de estado (veneno de goblins,
     sangrado de lobos, aturdir de Grask y Feronius). Enseñárselo y ajustar con `npm run sim:aventura`.
   - **Precios y oro:** las armas cuestan 300-2000 y Zafias da ~60 de oro al final: hoy solo se compran entrenando
     mucho. Decidir cuánto oro da la zona (o si las mejores armas salen de jefes).
   - **Combates largos y repetidos:** los goblins de piso 2 (guardia, centinela, rezagado) duran ~20 turnos con el
     ritmo carga-golpe y defenderse. Y casi no hay azar: todas las partidas del bot salen idénticas.
   - **Curva de Zafias hoy:** se acaba hacia el nivel 4; ~16 combates de entrenamiento antes de Grask jugando bien
     (55 si solo atacas); Feronius se vence a la primera perdiendo ~65 % de la vida; ~60 de oro al final.
   - Las fichas de gnolls y orcos (`creatures.js`) usan pisos 2-6 de la escala vieja: recalibrarlas con el banco
     cuando se coloquen.

1. **Arte con la Asset Factory** (`tools/image-generator`, ~0,034 $ por imagen):
   - **Fondos de combate por zona**: el combate usa siempre `img/bg/forest.webp`; debe usar el fondo de su zona
     (`src/data/art.js` → `bg`).
   - **Escala por especie**: hecha para las criaturas con nombre (`scale` en `creatures.js`: lobo ×0,55,
     Feronius ×0,55 sobre su ×1,5 de jefe). Falta para los monstruos del descenso y Grask (siguen a ≤256 px).
   - **Comprobar la orientación** automáticamente (el modelo a veces dibuja mirando al lado contrario; hoy se
     arregla a mano con `fix --flip`).
   - **Colocar las criaturas de la recámara** (`src/data/creatures.js`: lobos, gnolls, orcos y sus tres jefes, ya con
     dibujo y ficha) en zonas o misiones: `enemy: { creature: id }` en la parada.
   - Lotes de enemigos por familia (los 90 monstruos comparten ~15-20 familias): empezar por Zafias y los primeros
     pisos.
2. **Mapa de Zafias en alta: casi hecho.** Ya se juega con el mapa HD recompuesto (`node tools/assemble-map.mjs`).
   Faltan dos piezas: **f1_c1** (santuario de piedras, arriba a la izquierda; hoy va el original ampliado) y rehacer
   **f1_c3** fiel al original (la que llegó está redibujada: el río y la cascada cambian de sitio y cede en las
   costuras). Ojo: los caminos del norte del bosque (ruinas, camino del norte, puente del orco) ya están trazados
   sobre la redibujada; si se cambia, basta con volver a ejecutar `node tools/trace-paths.mjs`. Quizá compense quedarse con ella.
   Dejarlas en `img/map-divided-upscaled/` como `cuadricula_fX_cY_hd.jpg` y volver a ejecutar la herramienta.
3. **Encargos de la nube pendientes** (GitHub Issues): **#4 editor de zonas** (`?editor`). El **#5 misiones como
   datos** quedó casi hecho en local (`src/data/quests.js`): solo falta que la barra de objetivo salga de los datos
   (hoy `_advQuestText()` escrito a mano) — reescribir el issue o hacerlo aquí. Lanzar según
   [cloud-method.md](cloud-method.md).
4. **Más Zafias**: el mapa ya tiene los ganchos puestos como puntos de interés: la senda del santuario (misión 2),
   el camino del norte y la escalinata (arco del castillo), Bram y el hierro de las cuevas (misión 3). Mejor después
   de #5 (misiones como datos). Receta de zonas y caminos: [docs/zonas.md](docs/zonas.md).
5. **Publicar** la siguiente versión cuando haya novedades jugables en `main`.

## 📌 Decisiones vigentes

| Tema | Decisión |
|---|---|
| Foco | **Easy Hero es la aventura** (2026-10-02). El descenso y su botín, aparcados: el código sigue (se entra con `?inicio`, lo usan las pruebas) pero no hay acceso en el juego; la cueva del sur está sellada («todavía no estás preparado») |
| Vocabulario | **PH** (Poder de Habilidad) para todo lo «mágico» (nunca «magia»); **ATK** (Poder de Ataque) para el golpe básico |
| Maná y habilidades | Maná = la mitad de la vida inicial (12); las habilidades cuestan maná, sin recarga; barra de 6 ranuras en combate. Bola de fuego = PH en daño; Grito de guerra = +50 % ATK 3 rondas |
| Efectos de estado | Motor genérico (`src/effects.js`, datos en `src/data/effects.js`): 7 efectos, iconos sobre cada personaje, número en su color + icono |
| Tienda | Armas del mercader 300-2000 de oro; `freeShop` (balance.js) = modo pruebas, apagado al publicar |
| Diálogos | Novela visual: retrato de quien habla (`src/data/characters.js`); el héroe a la derecha. El retrato «tabernero» es Bram |
| Equipo de la aventura | Propio y permanente (`src/data/gear.js`), por misiones y jefes; cada arma con su dibujo del héroe (`img/weapons/<Nombre>.png` → `arma_<id>`) |
| Plataforma | Web estática (GitHub Pages + vistas previas en Cloudflare), JavaScript vanilla sin bundler. Godot/Flutter descartados. **Escritorio primero**; en móvil basta con que funcione |
| Combate | De lado: héroe SIEMPRE a la izquierda mirando a la derecha, enemigo SIEMPRE a la derecha mirando a la izquierda; único movimiento la embestida + número de daño. Panel de pergamino con ¡Atacar! y el resto a un clic |
| Enemigos | Sin intenciones visibles (patrones ocultos que se aprenden); los golpes fuertes se telegrafían con una frase y brillo rojo |
| Pociones | Vida: 40 %, máx. 3, 40 de oro. Maná menor: 50 % del maná, máx. 3, 25 de oro. Gastan turno y se conservan |
| Aventura | Mismo héroe que el descenso; derrota → posada, vida llena, −10 % de oro; enemigos visibles que vuelven al dormir; zonas que se abren por historia; dificultad fija por zona; movimiento por caminos a trazos entre paradas |
| Arte | Pixel art de fantasía oscura (STYLE_BIBLE en `tools/image-generator/config/style-bible.json`). Arte generado con Gemini (`gemini-3.1-flash-lite-image`); sin arte propio, el goblin teñido por especie/linaje |
| Método | Funcional primero; el pulido va a Perfilados. Nube para encargos grandes y cerrados; diseño y ajustes visuales en local |

## 🧩 Perfilados (no bloquean; cuando toque)

- **Jefes:** furia bajo el 30 % de vida; patrones propios para los 5 jefes profundos (hoy comparten el del jefe final).
- **Telegrafiado:** frases por tipo de enemigo; ¿avisar también de curarse o protegerse?
- **Aventura:** colocar mejor los goblins del bosque (el vigía queda entre árboles); los puntos rojos se ven pequeños
  en la aldea; el cofre pintado del campamento no hace nada; el objetivo de misión merecería su propio cartel;
  retratos que faltan (Maela, Grask, Feronius, goblins); las armas de la tienda sin dibujo del héroe que las lleva
  (`arma_<id>`) usan el sprite de siempre; el resto del equipo (armadura, casco, guantes, botas, cinturón, collar,
  anillo) ya tiene icono pero no existe en el juego; ranuras de habilidad cerradas a la espera de habilidades nuevas.
- **Historia:** confirmar o cambiar las pistas sembradas en la 1.9 (la empuñadura que Bram no reconoce, el buhonero
  que pregunta por alguien sin memoria, las piedras azules que dicen tu nombre).
- **Interfaz:** quedan emoticonos dentro del texto (diario de combate, avisos, recompensas de los diálogos); la
  introducción podría llevar el retrato del héroe en sus frases.
- **Combate:** debilidades elementales ×0,5/×1,5 con los 6 tipos de daño; entrada del combate como momento.
- **Equilibrio:** los bots del banco siguen «viendo» la intención; revisar la tasa de victoria real.
- **Móvil:** en el bosque a 390 px el héroe queda pegado al borde al llegar.
- **CI:** subir `upload-artifact`, `configure-pages` y `deploy-pages` cuando saquen versión sin Node 20.
- **Créditos:** nota sobre el arte hecho con IA (precaución, no verificado que sea obligatoria).

## 🧭 Ideas de diseño a largo plazo (sin fecha)

- **Mejoras pasivas «elige 1 de 3»** tras cada combate normal (reglas, no solo números).
- **Afinidad y clase emergente**: los objetos suman afinidad; a los umbrales el héroe «despierta» como guerrero,
  pícaro o elementalista (y 3 híbridos).
- **Debilidades y Ruptura**: escudo por enemigo; romperlo cancela su acción y da una acción extra.
- **Varios enemigos y orden de turnos** (el cambio más invasivo del motor).
- **Legado**: lo que deja un héroe caído para la siguiente partida.
- **Niveles de riesgo** tras la primera victoria.
- **Descenso:** segunda moneda para mejoras caras, prestigio sobre La Forja, sub-jefes y eventos propios por tramo,
  6 variantes de monstruo ya diseñadas sin construir; el banco de equilibrio no simula el descenso.
- **Primarias:** velocidad de ataque, daño contra tipos de criatura, resistencia elemental útil; que la Inteligencia
  sume PH.

## ⚠️ Riesgos vivos

- **El arte marca el ritmo**: cada enemigo necesita su imagen; la Asset Factory lo abarata, pero hay que revisar cada
  resultado (orientación, escala, estilo).
- **Crédito de la nube**: 97 $ hasta el **5 de noviembre de 2026** (~1,5 $ por encargo típico).
- **Crédito de Google** para imágenes: el director tiene 20 €; ~0,034 $ por imagen.
