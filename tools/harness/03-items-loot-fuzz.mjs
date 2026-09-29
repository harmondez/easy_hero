// =============================================
// 🧪 Harness · Fase 3 — Fuzzing de objetos y botín
// =============================================
import { RARITIES } from '../../src/data/rarities.js';
import { ITEM_BASES } from '../../src/data/items.js';
import {
    createRpgItem, createStarterItem, equipItem, unequipSlot, discardItem,
    storeInInventory, removeFromInventory, hasInventoryRoom, inventorySize,
    rollLootDrop, itemDelta, itemScore, describeItem, equippedUniqueIds, LOOT_SOURCES, ITEM_SLOT_ORDER
} from '../../src/items.js';
import { createRpgHero } from '../../src/engine.js';
import { createRng } from '../../src/rng.js';

let bugs = 0, checks = 0;
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };
const pass = () => { checks++; };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const badText = (s) => /undefined|NaN|\{|\[object/.test(s);

// --- createRpgItem: todas las bases × todas las rarezas × profundidades extremas ---
let itemsMade = 0;
for (const base of ITEM_BASES) {
    for (const r of RARITIES) {
        for (const floor of [0, 15, 40, 95, 159]) { // hasta el tramo ~10
            let it;
            try { it = createRpgItem({ rng: createRng(floor * 31 + 7), floor, baseId: base.id, rarityId: r.id }); }
            catch (e) { bug(`createRpgItem(${base.id}, ${r.id}, piso ${floor}) lanzó: ${e.message}`); continue; }
            itemsMade++; pass();
            if (!it) { bug(`createRpgItem(${base.id}, ${r.id}, piso ${floor}) devolvió null`); continue; }
            pass();
            if (!ITEM_SLOT_ORDER.includes(it.slot)) bug(`${base.id}/${r.id}/piso${floor}: ranura inválida "${it.slot}"`);
            pass();
            const bad = Object.entries(it.stats || {}).filter(([, v]) => !finite(v));
            if (bad.length) bug(`${base.id}/${r.id}/piso${floor}: estadística no finita: ${JSON.stringify(bad)}`);
            let lines;
            try { lines = describeItem(it); } catch (e) { bug(`describeItem(${base.id}/${r.id}) lanzó: ${e.message}`); continue; }
            pass();
            if (lines.some(badText)) bug(`${base.id}/${r.id}/piso${floor}: descripción con texto roto → ${JSON.stringify(lines)}`);
        }
    }
}
console.log(`OK createRpgItem: ${itemsMade} objetos generados (${ITEM_BASES.length} bases × ${RARITIES.length} rarezas × 5 profundidades)`);

// --- rollLootDrop: las 5 fuentes, 500 semillas cada una, con héroes en distintos estados ---
const heroStates = () => ([
    createRpgHero(),
    (() => { const h = createRpgHero(); for (const s of ITEM_SLOT_ORDER) equipItem(h, createRpgItem({ rng: createRng(9), floor: 5, slot: s })); return h; })()
]);
for (const source of Object.keys(LOOT_SOURCES)) {
    let minViol = 0;
    for (let s = 1; s <= 500; s++) {
        for (const hero of heroStates()) {
            let it;
            try { it = rollLootDrop({ rng: createRng(s), floor: s % 200, source, hero }); }
            catch (e) { bug(`rollLootDrop(${source}, seed=${s}) lanzó: ${e.message}`); continue; }
            pass();
            if (!it || !ITEM_SLOT_ORDER.includes(it.slot)) { bug(`rollLootDrop(${source}, seed=${s}): objeto inválido`); continue; }
            const min = LOOT_SOURCES[source].min;
            if (min) {
                const idx = RARITIES.findIndex(r => r.id === it.rarity);
                const minIdx = RARITIES.findIndex(r => r.id === min);
                if (idx < minIdx) minViol++;
            }
        }
    }
    pass();
    if (minViol > 0) bug(`rollLootDrop(${source}): ${minViol} objetos por debajo del mínimo de rareza prometido`);
}
console.log(`OK rollLootDrop: 5 fuentes × 500 semillas × 2 estados de héroe`);

// --- Único ya equipado nunca se repite (avoidUniques), 500 tiradas legendarias ---
{
    const holder = createRpgHero();
    const legend = createRpgItem({ rng: createRng(3), floor: 20, rarityId: 'legendaria' });
    if (legend.unique) {
        equipItem(holder, legend);
        let dup = 0;
        for (let s = 1; s <= 500; s++) {
            const it = createRpgItem({ rng: createRng(s), floor: 20, rarityId: 'legendaria', avoidUniques: equippedUniqueIds(holder) });
            if (it.unique && it.unique.id === legend.unique.id) dup++;
        }
        pass();
        if (dup > 0) bug(`avoidUniques: el rasgo único ya equipado se repitió ${dup}/500 veces`);
    }
}
console.log('OK avoidUniques: 500 tiradas legendarias');

// --- Secuencias aleatorias de equipar/guardar/descartar: el inventario nunca se desborda ---
let invOverflow = 0, atqBelowOne = 0, hpAboveMax = 0;
for (let s = 1; s <= 300; s++) {
    const rng = createRng(s);
    const hero = createRpgHero();
    for (let step = 0; step < 40; step++) {
        const action = Math.floor(rng() * 4);
        try {
            if (action === 0) {
                const it = createRpgItem({ rng, floor: step, slot: ITEM_SLOT_ORDER[step % 4] });
                equipItem(hero, it);
            } else if (action === 1 && hero.inventory.length) {
                removeFromInventory(hero, Math.floor(rng() * hero.inventory.length));
            } else if (action === 2 && hasInventoryRoom(hero)) {
                storeInInventory(hero, createRpgItem({ rng, floor: step, slot: ITEM_SLOT_ORDER[step % 4] }));
            } else if (action === 3) {
                unequipSlot(hero, ITEM_SLOT_ORDER[step % 4]);
            }
        } catch (e) { bug(`secuencia de inventario lanzó en seed=${s} paso=${step} (acción ${action}): ${e.message}`); break; }
        if (hero.inventory.length > inventorySize(hero)) invOverflow++;
        if (hero.atq < 1) atqBelowOne++;
        if (hero.hp > hero.maxHp) hpAboveMax++;
    }
}
pass(); if (invOverflow) bug(`el inventario superó su tamaño ${invOverflow} veces`);
pass(); if (atqBelowOne) bug(`hero.atq bajó de 1 en ${atqBelowOne} pasos (¿un arma/desequipo deja ATK inválido?)`);
pass(); if (hpAboveMax) bug(`hero.hp superó hero.maxHp en ${hpAboveMax} pasos`);
console.log('OK secuencias de inventario: 300 semillas × 40 pasos aleatorios');

// --- itemDelta / itemScore nunca deben lanzar ni devolver NaN, incluida ranura vacía ---
for (let s = 1; s <= 200; s++) {
    const hero = createRpgHero();
    const it = createRpgItem({ rng: createRng(s), floor: s });
    let d, sc;
    try { d = itemDelta(hero, it); sc = itemScore(it); }
    catch (e) { bug(`itemDelta/itemScore lanzó (seed=${s}): ${e.message}`); continue; }
    pass();
    if (Object.values(d).some(v => !finite(v))) bug(`itemDelta con valor no finito (seed=${s}): ${JSON.stringify(d)}`);
    pass();
    if (!finite(sc)) bug(`itemScore no finito (seed=${s})`);
}
console.log('OK itemDelta/itemScore: 200 semillas');

console.log(`\nSUMMARY fase3: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);
