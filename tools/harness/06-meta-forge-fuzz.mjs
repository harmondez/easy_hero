// =============================================
// 🧪 Harness · Fase 6 — Progreso persistente: La Forja, expedición, XP/nivel,
// logros. Sobre todo casos límite: ids desconocidos, cantidades extremas,
// relojes que van hacia atrás, compras hasta agotar el oro.
// =============================================
import {
    loadMeta, saveMeta, recordGold, recordXp, recordDepth, recordVariantSeen,
    upgradeLevel, nextUpgradeCost, canBuyUpgrade, buyUpgrade, upgradeEffect,
    claimExpedition, checkAchievements, spendStatPoint, UPGRADES, PRIMARY_KEYS
} from '../../src/meta.js';

let bugs = 0, checks = 0;
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };
const pass = () => { checks++; };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

const fakeStorage = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };

// --- Mejora con id desconocido: nunca debe romper ni cobrar ---
{
    const meta = loadMeta(fakeStorage());
    recordGold(meta, 1000);
    let r;
    try { r = buyUpgrade(meta, 'no-existe'); } catch (e) { bug(`buyUpgrade con id desconocido lanzó: ${e.message}`); }
    pass();
    if (r && r.ok) bug('buyUpgrade con id desconocido devolvió ok:true');
    pass();
    if (meta.gold !== 1000) bug(`buyUpgrade con id desconocido descontó oro (${1000 - meta.gold})`);
    pass();
    if (canBuyUpgrade(meta, 'no-existe')) bug('canBuyUpgrade con id desconocido devuelve true');
}

// --- Comprar cada mejora hasta el tope 200 veces: el oro nunca debe quedar negativo ---
for (const u of UPGRADES) {
    const meta = loadMeta(fakeStorage());
    recordGold(meta, 10_000_000);
    let iters = 0;
    while (canBuyUpgrade(meta, u.id) && iters++ < 500) buyUpgrade(meta, u.id);
    pass();
    if (meta.gold < 0) bug(`comprar "${u.id}" en bucle dejó el oro negativo (${meta.gold})`);
    pass();
    if (u.max && upgradeLevel(meta, u.id) > u.max) bug(`"${u.id}" superó su tope (${upgradeLevel(meta, u.id)} > ${u.max})`);
    pass();
    if (!finite(nextUpgradeCost(meta, u.id)) && upgradeLevel(meta, u.id) < (u.max || Infinity)) bug(`"${u.id}": coste no finito sin haber llegado al tope`);
}
console.log(`OK La Forja: ${UPGRADES.length} mejoras compradas hasta el tope u hasta 500 iteraciones`);

// --- Oro/XP con cantidades extremas y negativas: nunca deben dejar el estado inconsistente ---
{
    const meta = loadMeta(fakeStorage());
    recordGold(meta, -50); // nunca debería bajar de 0
    pass(); if (meta.gold < 0) bug(`recordGold negativo dejó el oro en ${meta.gold} (debería quedarse en 0)`);
    recordGold(meta, Number.MAX_SAFE_INTEGER);
    pass(); if (!finite(meta.gold)) bug(`recordGold con un número enorme deja meta.gold no finito`);
    const meta2 = loadMeta(fakeStorage());
    const before = meta2.charLevel;
    const r = recordXp(meta2, 1_000_000);
    pass(); if (!finite(meta2.charLevel) || meta2.charLevel <= before) bug('recordXp con 1.000.000 de XP no sube de nivel de forma sensata');
    pass(); if (meta2.statPoints < 0 || !finite(meta2.statPoints)) bug(`statPoints inválido tras XP masiva: ${meta2.statPoints}`);
    pass(); if (r.levelsGained <= 0) bug('recordXp con 1.000.000 no reporta niveles ganados');
}
console.log('OK oro/XP: cantidades negativas y extremas');

// --- spendStatPoint: nunca debe dejar puntos negativos ni una primaria inválida ---
{
    const meta = loadMeta(fakeStorage());
    meta.statPoints = 2;
    for (let i = 0; i < 10; i++) spendStatPoint(meta, 'str'); // solo hay 2 puntos: las otras 8 deben fallar limpio
    pass(); if (meta.statPoints < 0) bug(`statPoints quedó negativo tras gastar de más: ${meta.statPoints}`);
    pass(); if (meta.primary.str !== 2) bug(`gastar de más subió str a ${meta.primary.str} en vez de parar en 2`);
    pass(); if (spendStatPoint(meta, 'primaria-inventada')) bug('spendStatPoint aceptó una clave de primaria que no existe');
}
console.log('OK spendStatPoint: sin puntos negativos ni claves inventadas');

// --- Expedición: relojes raros ---
{
    const meta = loadMeta(fakeStorage());
    const t0 = 1_700_000_000_000;
    claimExpedition(meta, t0);
    const back = claimExpedition(meta, t0 - 3600_000); // el reloj del sistema retrocede
    pass(); if (back.gold < 0 || !finite(back.gold)) bug(`claimExpedition con el reloj hacia atrás da oro inválido: ${back.gold}`);
    pass(); if (meta.gold < 0) bug('claimExpedition con reloj hacia atrás dejó oro negativo');
    const meta2 = loadMeta(fakeStorage());
    meta2.lastSeen = t0;
    const huge = claimExpedition(meta2, t0 + 1000 * 3600_000); // 1000 horas de golpe
    pass(); if (!finite(huge.gold) || huge.gold < 0) bug(`claimExpedition con 1000h da oro inválido: ${huge.gold}`);
    pass(); if (!huge.capped) bug('claimExpedition con 1000h no marca el tope (capped)');
}
console.log('OK expedición: reloj hacia atrás y saltos enormes de tiempo');

// --- checkAchievements con contextos incompletos o nulos: nunca debe lanzar ---
{
    const meta = loadMeta(fakeStorage());
    const weirdCtxs = [null, undefined, {}, { result: 'victory' }, { result: 'victory', hero: null, stats: null },
        { result: 'victory', hero: { equipment: {} }, stats: {} }];
    for (const ctx of weirdCtxs) {
        pass();
        try { checkAchievements(meta, ctx, { floors: 16 }); }
        catch (e) { bug(`checkAchievements con contexto ${JSON.stringify(ctx)} lanzó: ${e.message}`); }
    }
}
console.log('OK logros: contextos incompletos o nulos (6 variantes)');

// --- Guardar/cargar meta con el progreso acumulado: nada se pierde ---
{
    const storage = fakeStorage();
    const meta = loadMeta(storage);
    recordGold(meta, 500); recordXp(meta, 300);
    buyUpgrade(meta, UPGRADES[0].id);
    recordVariantSeen(meta, 'Orco', { adj: 'colerico', lin: 'plaga' });
    recordDepth(meta, { depth: 45, tier: 2 });
    saveMeta(storage, meta);
    const back = loadMeta(storage);
    pass(); if (back.gold !== meta.gold) bug('el oro no sobrevive a guardar/cargar el progreso');
    pass(); if (upgradeLevel(back, UPGRADES[0].id) !== upgradeLevel(meta, UPGRADES[0].id)) bug('el nivel de una mejora no sobrevive a guardar/cargar');
    pass(); if (back.bestDepth !== 45 || back.bestTier !== 2) bug('la profundidad récord no sobrevive a guardar/cargar');
    pass(); if (JSON.stringify(back.variantsSeen) !== JSON.stringify(meta.variantsSeen)) bug('las medallas de variante no sobreviven a guardar/cargar');
}
console.log('OK progreso persistente: guardar y recargar con todo lo nuevo de la 1.4.x');

console.log(`\nSUMMARY fase6: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);
