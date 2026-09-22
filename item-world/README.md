# 🧰 item-world — Taller de items de Easy Hero

Espacio de trabajo de **Itemizer** para diseñar, fabricar y equilibrar **todo el contenido de objetos** del juego
(Entrega B1 · P5 del [planning](../planning.md)).

## Reglas del taller

- **Solo se escribe aquí**: dentro de `item-world/` Itemizer tiene permiso de edición.
- **Fuera de aquí solo se lee** (motor, UI, guardado, tests, docs del juego). Los cambios que hagan falta fuera del
  taller se piden al PM en [solicitudes-itemizer-pm.md](solicitudes-itemizer-pm.md).
- Todo lo que produzcamos debe respetar las reglas del proyecto: **JavaScript vanilla, contenido como datos, emoji y
  CSS, motor puro y probado, números del equilibrio en un solo sitio.**

## Cómo está organizado

```text
item-world/
├── README.md                    ← este fichero
├── docs/
│   └── diseno.md                ← el sistema de items con todas sus decisiones y mi jerga
├── src/                         ← el contenido (datos) y la fabricación (lógica pura)
│   ├── rarities.js              ← la UNICA tabla de rarezas (color, afijos, poder, probabilidad)
│   ├── items.js                 ← 4 ranuras, 6 tipos de daño y 122 bases hechas a mano
│   ├── affixes.js               ← 24 afijos (6 números, 12 reglas y 6 únicos de legendaria)
│   └── fabrication.js           ← fabricar un objeto real: rareza + afijos + escalado por piso
├── tools/
│   └── print-items.mjs          ← genera muestras y vigila invariantes (se ejecuta con node)
└── solicitudes-itemizer-pm.md   ← canal de peticiones al PM (cambios fuera del taller)
```

## Cómo comprobar el taller

Desde la raíz del proyecto (o con `workdir=item-world`): `node item-world/tools/print-items.mjs`.
Imprime muestras de objetos de cada rareza y validaciones de invariantes (afijos sin repetir, escalado monótono,
probabilidades que suman 100…). Si algo se rompe, el error lo dice.