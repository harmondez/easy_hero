# 🎒 Sistema de items de Easy Hero (P5 · Entrega B1)

Documento de trabajo de **Itemizer**. Recoge las decisiones **ya cerradas en `planning.md`** (P5) y la jerga que usa el
taller, para que el motor (que vive fuera de `item-world`) las consuma sin ambigüedad.

> Fuentes: [`planning.md`](../planning.md) §P5 · [`README.md`](../README.md) · `src/engine.js` (convenciones `atq`/`maxHp`).

## Decisiones cerradas (del plan)

| Tema | Decisión |
|------|----------|
| **Ranuras** | 4: ⚔️ arma primaria · 🛡️ secundaria (escudo/daga/foco) · 🧥 armadura · 💍 accesorio |
| **Rarezas** | 5, una sola tabla para todo el botín: ⚪🟢🔵🟣🟠 |
| **Fabricación** | Base fija + afijos al azar (la rareza decide cuántos) |
| **Escalado por piso** | `valor = base × (1 + 0,08 × piso) × multiplicador de rareza` |
| **Dónde salen** | Solo en cofre (1 de 3), hoguera (1 de 3, mín. 🟢) y sub-jefe (1 de 3, mín. 🔵) |
| **Sin mochila** | Al recibirlo, equipar (se pierde el anterior) o descartar (**cura 3 HP**, + algo por rareza) |
| **Legendarios** | Máximo 1 igual equipado; sin límite total |
| **Equipo inicial** | Espada básica (🗡️ Filo, 0 afijos); 3 ranuras vacías |
| **Ofertas por ruta** | 4-6 |

## Jerga del taller (para que el motor la entienda sin tocar datos)

### Rareza → cuántos afijos y poder

| Id | Nombre | Icono | Color | Afijos | Poder × | Prob. |
|----|--------|:-----:|-------|:------:|:-------:|:-----:|
| `comun` | Común | ⚪ | `#e2e8f0` | 0 | ×1,00 | 50 % |
| `poco_comun` | Poco común | 🟢 | `#22c55e` | 1 | ×1,15 | 28 % |
| `rara` | Rara | 🔵 | `#3b82f6` | 2 | ×1,30 | 14 % |
| `epica` | Épica | 🟣 | `#a855f7` | 3 | ×1,50 | 6 % |
| `legendaria` | Legendaria | 🟠 | `#f97316` | 3 + **rasgo único** | ×1,70 | 2 % |

### Base

Un objeto empieza en una **base** hecha a mano (22). Define la ranura, su **estadística principal** y, en armaduras y
accesorios, un **rasgo** fijo. Las armas primarias definen además el **tipo de daño** de tus golpes.

```js
{
  id: 'espada_sendero',           // id único, en snake_case
  name: 'Espada del sendero',     // nombre visible
  icon: '🗡️',                     // emoji visible
  slot: 'weapon',                 // weapon | secondary | armor | accessory
  damaged: 'filo',                // SOLO armas primarias: uno de los 6 tipos de daño
  main: { atq: 1 },               // estadística principal en el PISO 0
  trait: null,                    // rasgo fijo (armaduras y accesorios; también secundarias)
  desc: 'La hoja con la que empieza toda ruta.'
}
```

### Afijo

La rareza sortea afijos del pool (`src/affixes.js`). Dos clases:

| Clase | Cómo se aplica | Ejemplo |
|-------|----------------|---------|
| **Número** `kind:'number'` | Suma a una estadística (escala con piso y rareza) | `+2 ATK`, `+6 HP máx` |
| **Regla** `kind:'rule'` | Altera una **regla** del motor mediante un **gancho** | `quema al golpear`, `primer golpe ×2` |

Las reglas nombran el **gancho del motor** al que se engancharán en B1. Esos ganchos viven fuera del taller; esta lista
es el **contrato** que solicita Itemizer al PM:

| Gancho | Cuándo dispara | Ejemplo de afijo |
|--------|----------------|------------------|
| `onCombatStart` | Al empezar cada combate | `combat_start_heal` (curas 3) |
| `onAttack` | Cuando el héroe ataca | `burn_on_hit` (quemas) |
| `onDefend` | Cuando el héroe defiende | `defend_heal` (curas 2) |
| `onDamaged` | Cuando el héroe recibe daño | `revenge` (próximo ataque +2) |
| `onVictory` | Al ganar un combate | `victory_heal` (curas 3) |
| `global` | Regla permanente, sin disparador | `flee_safe` (huir sin daño) |

Los números de los afijos son **valores de piso 0**; la fabricación los escala con `valor = base × (1 + 0,08 × piso) × power`.

### Ranuras y su estadística principal

| Ranura | Aporta | Estadística principal |
|--------|--------|-----------------------|
| ⚔️ `weapon` | ATK y el **tipo de daño** del ataque | `atq` |
| 🛡️ `secondary` | Escudo (mejora Defender) / daga (golpe extra) / foco (potencia habilidades) | `guard`, `extraStrike`, `skillMods` |
| 🧥 `armor` | **HP máx** + un rasgo *(sin DEF)* | `hp` |
| 💍 `accessory` | Un rasgo pasivo, casi sin números | `trait` |

### Estadísticas y claves que ya usa el motor (`src/engine.js`)

- `atq` (el motor escribe `atq`, no `atk`), `hp`, `maxHp`.
- `skillMods[skillId] = { damage, cooldown }` (ver `rpgSkillInfo`).
- `vows` (votos del evento **El voto**), `affinity` (guerrero/picaro/elementalista, llega en B2).

## Invariantes del contenido (lo que `print-items.mjs` vigila)

1. Las probabilidades de rareza suman **100** y el orden de poder crece (×1 → ×1,7).
2. **122 bases**: 24 armas, 30 secundarias, 34 armaduras, 34 accesorios; ids únicos.
3. Las 24 armas cubren los **6 tipos de daño**, 4 por cada uno.
4. Los afijos de un mismo objeto **no se repiten**.
5. El **escalado por piso es monótono**: mismo objeto en el piso 8 > piso 3.
6. Cada regla declara **un gancho conocido** de la tabla de arriba.
7. Los 6 tipos de daño tienen al menos 4 armas cada uno; las armas tienen `main.atq` ≥ 1.

## Pendientes para B1 (fuera del taller → PM)

- Ganchos del motor (`onCombatStart`, `onAttack`, `onDefend`, `onDamaged`, `onVictory`, `global`) en `src/engine.js`.
- Mover este contenido a `src/data/` (raridades, items, afijos) cuando el PM abra B1.
- Reemplazar el botín provisional (cofre `+1 ATK/+5 HP`, victorias `+1 ATK/+4 HP`, hoguera `Afilar +1 ATK`).
- UI: panel de 4 ranuras con color de rareza y comparación equipar/descartar.
- Guardado: `SAVE_VERSION` sube; el héroe lleva el equipo.
- Banco de equilibrio con las nuevas fuentes de poder (meta de victoria del 20 %).