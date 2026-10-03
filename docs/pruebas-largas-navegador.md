# 🐒 Prueba de aguante en el navegador

> Generado por `node tests/soak.test.mjs` el 2026-10-03 14:07 · 8.6 minutos · versión 1.11.0.

Un «mono» jugó al juego de verdad en tres turnos (recién llegado en escritorio, con 9000 de oro en escritorio y con 9000 de oro en el móvil), pulsando al azar lo que había en pantalla.

**5422 acciones · 113 combates (76 victorias, 10 caídas) · 112 compras · 45 ventas · 0 cambios de equipo · 8 noches · 1038 líneas de diálogo · escenas pisadas: aldea, bosque, casas, campamento, guarida.**

## Resultado: sin problemas

Ni un error de JavaScript, ni una pantalla sin salida, ni una cifra imposible.

## Qué hizo

- ir a una parada: 2618
- siguiente línea: 1038
- acción de combate: 475
- cerrar el panel: 276
- abrir un panel: 236
- pestaña de la tienda: 139
- salir de la tienda: 135
- seguir tras el combate: 113
- comprar: 112
- mirar una pieza: 91
- usar algo del panel: 79
- vender: 45
- menú: shop: 25
- menú: leave: 17
- menú: upgrade: 13
- menú: sleep: 8
- menú: talk: 2

## Pasada anterior, de 30 minutos

19 951 acciones · 331 combates (263 victorias, 13 caídas) · 300 compras · 222 ventas · 37 noches · 3893 líneas de diálogo · las cinco escenas pisadas. Sin un solo error de JavaScript ni una cifra imposible. Dejó dos apuntes:

- **«Pantalla sin salida» en el combate, 15 veces: era el propio mono.** Cuando el héroe está aturdido, los botones se apagan un par de segundos y el turno pasa solo; el mono solo esperaba un segundo antes de darlo por atascado. Ahora espera 12 segundos: en la pasada de arriba, con la corrección, no hubo ninguna.
- **Scroll horizontal en el móvil, 1 vez en 30 minutos.** No se ha podido repetir en la pasada de arriba (que ya anota en qué pantalla ocurre y qué elemento se sale). Queda pendiente de cazar.
