// =============================================
// 🤖 El jugador de Zafias (librería): un bot que juega la aventura ENTERA con las reglas de verdad.
// A diferencia del bot viejo (adventure-bot.mjs, que solo pelea), este usa el mismo progreso que el juego (meta.js):
// paga la posada, compra pociones, lecciones, espadas y armaduras, vende lo que le sobra, recoge el botín (y los
// encuentros raros), habla con los vecinos (las misiones salen de los datos de la zona, no de una lista aparte) y pelea
// con maná, energía y habilidades. Todo con semilla: cada partida es reproducible.
// Lo usa tests/long-sim.mjs (las pruebas largas).
// =============================================
import { ZAFIAS } from '../../src/data/zones/zafias.js';
import { CREATURES } from '../../src/data/creatures.js';
import { GEAR, GEAR_FOR_SALE, STARTER_GEAR, STARTER_ARMOR, WEAPON_UPGRADE } from '../../src/data/gear.js';
import { FOOD } from '../../src/data/effects.js';
import { RPG_BALANCE } from '../../src/data/balance.js';
import { XP_REWARD, PRIMARY_KEYS } from '../../src/stats.js';
import { rollDrop } from '../../src/loot.js';
import { rollRare, applyRare } from '../../src/rares.js';
import { countingCreatures } from '../../src/quests.js';
import * as Engine from '../../src/engine.js';
import * as Items from '../../src/items.js';
import * as Meta from '../../src/meta.js';
import { rngFrom, enemiesOnWay, point, zone } from './adventure-bot.mjs';

export { rngFrom, point, zone };
export const MAIN = ['goblin-1', 'goblin-2', 'goblin-3', 'guardia', 'grask'];
export const OPTIONAL = ['lobo-sendero', 'goblin-puente', 'lobo-ruinas', 'centinela', 'rezagado', 'lobo-guarida', 'feronius'];
const FARM = ['goblin-1', 'lobo-sendero', 'goblin-2'];
const weaponId = meta => (GEAR[meta.advWeapon] ? meta.advWeapon : STARTER_GEAR);
const armorId = meta => (GEAR[meta.advArmor] ? meta.advArmor : STARTER_ARMOR);
const gearAtq = (meta, id) => GEAR[id].atq + Meta.weaponUpgradeLevel(meta, id) * WEAPON_UPGRADE.atq;

/** El héroe tal como lo monta la aventura (src/adventure.js _advHero): primarias, lecciones, espada, armadura. */
export function buildHero(meta, st = {}) {
    const hero = Engine.createRpgHero();
    for (const k of PRIMARY_KEYS) hero.primary[k] += meta.primary[k] || 0;
    const atk = Meta.upgradeEffect(meta, 'filo');
    if (atk) hero.atq += atk;
    const hp = Meta.upgradeEffect(meta, 'constitucion');
    if (hp) { hero.maxHp += hp; hero.hp = hero.maxHp; }
    Engine.refreshPrimaryStats(hero);
    const wid = weaponId(meta);
    if (wid !== STARTER_GEAR || Meta.weaponUpgradeLevel(meta, STARTER_GEAR) > 0) {
        const item = Items.createStarterItem();
        Items.equipItem(hero, { ...item, id: `aventura-${wid}`, name: GEAR[wid].name, stats: { ...item.stats, atq: gearAtq(meta, wid) } });
        Engine.refreshPrimaryStats(hero);
    }
    const armor = GEAR[armorId(meta)];
    if (armor.hp) { hero.maxHp += armor.hp; hero.hp += armor.hp; }
    hero.gearEffects = { onHit: GEAR[wid].onHit || [], onStart: GEAR[wid].onStart || [] };
    if (st.hp != null) hero.hp = Math.max(1, Math.min(hero.maxHp, st.hp));
    if (st.mp != null) hero.mp = Math.max(0, Math.min(hero.maxMp, st.mp));
    hero.maxEnergy = RPG_BALANCE.energy.max;
    hero.energy = Math.max(0, Math.min(hero.maxEnergy, st.energy || 0));
    return hero;
}

/** El enemigo de una parada, como lo crea la aventura: criatura o monstruo de su piso, con las reglas de la parada. */
export function makeEnemy(p, rare = false) {
    const def = p.enemy || { type: 'monster', floor: 0 };
    const c = def.creature && CREATURES[def.creature];
    const m = c ? Engine.createRpgCreature(c) : Engine.createRpgMonster(def.type, def.floor, 0);
    if (!c) m.name = p.name;
    if (def.rules) m.rules = { ...(m.rules || {}), ...def.rules };
    if (m.gold == null) m.gold = (RPG_BALANCE.adventure.gold[m.type] ?? RPG_BALANCE.adventure.gold.monster);
    if (!c) Engine.tuneEnemy(m, def);
    const rareId = def.rare || (c && c.rare);
    if (rare && rareId) applyRare(m, rareId);
    return m;
}
export const rareOf = p => (p.enemy && p.enemy.rare) || ((p.enemy && p.enemy.creature && CREATURES[p.enemy.creature]) || {}).rare || null;
export const dropsOf = p => (p.enemy && p.enemy.drops) || ((p.enemy && p.enemy.creature && CREATURES[p.enemy.creature]) || {}).drops || null;

// --- Cómo pelea: (combate) → [acción, habilidad] ---
export const POLICIES = {
    /** Solo ataca. */
    ingenuo: () => ['attack'],
    /** Un jugador que entiende el juego: poción por debajo del 35 %, se cubre de los golpes fuertes, gasta la energía
     *  en el Golpe poderoso y el maná en la Bola de fuego cuando pega más que su espada (o en el Grito contra jefes). */
    jugador: c => {
        const hero = c.hero, m = c.monster, it = m.intent;
        if (hero.hp <= hero.maxHp * 0.35 && c.potions > 0) return ['potion'];
        // Contra un jefe, si el fuego pega bastante más que la espada y se acaba el maná, bebe una poción de maná
        if (m.type !== 'monster' && c.manaPotions > 0 && hero.mp < Engine.rpgSkillInfo(hero, 'fire_strike', c).manaCost
            && Engine.rpgSkillInfo(hero, 'fire_strike', c).damage >= Engine.rpgAtk(hero) * 2) return ['mana_potion'];
        if (it && it.k === 'attack' && it.m >= 1.8) return ['defend'];
        if (Engine.rpgSkillReady(c, 'power_strike')) return ['skill', 'power_strike'];
        const fire = Engine.rpgSkillInfo(hero, 'fire_strike', c);
        if (Engine.rpgSkillReady(c, 'fire_strike') && fire.damage > Engine.rpgAtk(hero)) return ['skill', 'fire_strike'];
        if (m.type !== 'monster' && Engine.rpgSkillReady(c, 'war_cry') && !(hero.effects && hero.effects['mas-ataque']) && m.hp > Engine.rpgAtk(hero) * 4) return ['skill', 'war_cry'];
        return ['attack'];
    }
};

/** Un combate entero. Deja en `meta` y `st` lo que queda (pociones, vida, maná, energía). */
export function fight(meta, st, p, rng, { policy = POLICIES.jugador, rare = false } = {}) {
    const hero = buildHero(meta, st);
    const start = { hp: hero.hp, maxHp: hero.maxHp };
    const m = makeEnemy(p, rare);
    const c = Engine.createRpgCombat(hero, m, rng);
    c.potions = Meta.potionCount(meta);
    c.manaPotions = Meta.manaPotionCount(meta);
    c.elixirs = Meta.elixirsForCombat(meta);
    let turns = 0, bad = 0;
    while (!c.over && turns < 300) {
        turns++;
        const [action, skill] = policy(c);
        const res = Engine.rpgCombatAction(c, action, skill);
        if (!res.ok) { bad++; Engine.rpgCombatAction(c, 'attack'); }
    }
    const used = Meta.potionCount(meta) - c.potions;
    meta.potions = c.potions; meta.manaPotions = c.manaPotions; meta.elixirs = { ...c.elixirs };
    st.hp = Math.max(0, hero.hp); st.mp = hero.mp; st.energy = hero.energy;
    return { result: c.over ? c.result : 'timeout', turns, bad, used, enemy: m, hero, hpLost: (start.hp - Math.max(0, hero.hp)) / start.maxHp };
}

/** Lo que dice un vecino o un punto de interés: la misma regla que src/adventure.js (_advTalk). Aplica marcas y premios. */
export function talk(meta, st, p, ledger) {
    if (!p.talk) { if (p.kind === 'poi') st.flags[`visto:${p.id}`] = true; return null; }
    const has = fs => (fs || []).every(f => st.flags[f]);
    const e = p.talk.find(t => has(t.when) && !(t.unless || []).some(f => st.flags[f])
        && (!t.whenCount || ((st.counts || {})[t.whenCount.creature] || 0) >= t.whenCount.n)
        && (!t.whenItem || Meta.materialCount(meta, t.whenItem.material) >= (t.whenItem.n || 1)));
    if (!e || !e.set || st.flags[e.set]) return e || null;
    st.flags[e.set] = true;
    if (e.take) Meta.takeMaterial(meta, e.take.material, e.take.n || 1);
    const r = e.reward;
    if (r) {
        if (r.gold) { Meta.recordGold(meta, r.gold); ledger.in.misiones += r.gold; }
        if (r.potions) meta.potions = Math.min(RPG_BALANCE.potion.max, Meta.potionCount(meta) + r.potions);
        if (r.xp) Meta.recordXp(meta, r.xp);
        if (r.material) Meta.grantDrop(meta, { kind: 'material', id: r.material });
        if (r.food && FOOD[r.food]) meta.food = { ...(meta.food || {}), [r.food]: Math.min(FOOD[r.food].max, Meta.foodCount(meta, r.food) + 1) };
        if (r.item && GEAR[r.item] && !Meta.ownsGear(meta, r.item)) meta.advGear = [...(meta.advGear || []), r.item];
    }
    return e;
}

/**
 * Una partida entera: de recién llegado a vencer a Feronius, y después `extraNights` noches más de «seguir jugando»
 * (para ver hasta dónde llega la economía). → todo lo que pasó (ver `run` abajo).
 */
export function playRun(seed, opts = {}) {
    const o = { policy: POLICIES.jugador, extraNights: 0, shop: true, allocate: (meta, n) => (n % 2 ? 'vit' : 'str'), ...opts };
    const rng = rngFrom(seed);
    const meta = Meta.loadMeta(null);
    Object.assign(meta, { introSeen: true, advGear: [STARTER_GEAR], advWeapon: STARTER_GEAR, advArmor: STARTER_ARMOR });
    const st = { flags: {}, gone: {}, rare: {}, counts: {}, hp: null, mp: null, energy: 0 };
    const ledger = { in: { combate: 0, misiones: 0, hallazgos: 0, ventas: 0 }, out: { posada: 0, pociones: 0, lecciones: 0, espadas: 0, armaduras: 0, cristales: 0, caidas: 0 } };
    const run = { seed, fights: 0, turns: 0, deaths: 0, nights: 0, paidNights: 0, brokeNights: 0, potionsUsed: 0, timeouts: 0, badActions: 0,
        byEnemy: {}, drops: {}, kills: {}, rares: { seen: 0, won: 0 }, bought: [], sold: [], quests: {}, levelAt: {}, fightsAt: {}, anomalies: [], pointsSpent: 0 };
    const check = where => {
        if (!(meta.gold >= 0) || !Number.isFinite(meta.gold)) run.anomalies.push(`${where}: oro ${meta.gold}`);
        if (Meta.potionCount(meta) > RPG_BALANCE.potion.max) run.anomalies.push(`${where}: ${meta.potions} pociones`);
        if (Meta.manaPotionCount(meta) > RPG_BALANCE.manaPotion.max) run.anomalies.push(`${where}: ${meta.manaPotions} pociones de maná`);
        if (st.hp != null && !(st.hp >= 0)) run.anomalies.push(`${where}: vida ${st.hp}`);
    };
    const spendPoints = () => { while (meta.statPoints > 0) Meta.spendStatPoint(meta, o.allocate(meta, run.pointsSpent++)); };

    // Hablar con todos los vecinos y mirar todos los puntos de interés a los que se llega sin pelear
    const visitAll = () => {
        for (let pass = 0; pass < 4; pass++) {
            let changed = false;
            for (const p of Object.values(point)) {
                if (!['npc', 'poi', 'inn'].includes(p.kind) || !(p.requires || []).every(f => st.flags[f])) continue;
                const way = enemiesOnWay(st, p.id);
                if (!way || way.length) continue;
                const goldBefore = meta.gold, flagsBefore = Object.keys(st.flags).length, lvl = meta.charLevel;
                const e = talk(meta, st, p, ledger);
                if (p.kind === 'poi' && meta.gold > goldBefore) { ledger.in.misiones -= meta.gold - goldBefore; ledger.in.hallazgos += meta.gold - goldBefore; }
                if (e && e.set && /:cumplida$|^misionCumplida$/.test(e.set) && Object.keys(st.flags).length > flagsBefore) run.quests[e.set] = run.fights;
                if (Object.keys(st.flags).length > flagsBefore) changed = true;
                if (meta.charLevel > lvl) spendPoints();
            }
            if (!changed) break;
        }
        check('visitas');
    };

    // Comprar: lecciones baratas, la mejor espada y la mejor armadura que se pueda pagar, y pociones. Vende lo viejo.
    const buy = (kind, fn, name) => { const before = meta.gold; const r = fn(); if (r && r.ok) { ledger.out[kind] += before - meta.gold; run.bought.push({ what: name, fight: run.fights, cost: before - meta.gold }); return true; } return false; };
    const shop = () => {
        if (!o.shop) return;
        const reserve = st.flags.misionCumplida ? 0 : RPG_BALANCE.inn.price * 2;
        // Lo que sueltan los enemigos se vende en la forja (menos lo que pide una misión, que no tiene valor)
        for (const id of Object.keys(meta.materials || {})) while (Meta.sellInfo(meta, `material:${id}`).have > 0) { const s = Meta.sellItem(meta, `material:${id}`); if (!s.ok) break; ledger.in.ventas += s.value; }
        // Lecciones de Odo (se llega a las casas sin pelear): Filo y Constitución mientras sean baratas
        for (let guard = 0; guard < 20; guard++) {
            const pick = ['filo', 'constitucion'].map(id => ({ id, cost: Meta.nextUpgradeCost(meta, id) })).sort((a, b) => a.cost - b.cost)[0];
            if (!(pick.cost <= 100) || meta.gold - pick.cost < reserve || !buy('lecciones', () => Meta.buyUpgrade(meta, pick.id), `lección ${pick.id}`)) break;
        }
        // Equipo: lo mejor que mejore lo que lleva
        for (const slot of ['weapon', 'armor']) {
            const cur = slot === 'weapon' ? weaponId(meta) : armorId(meta);
            const val = id => (slot === 'weapon' ? GEAR[id].atq : GEAR[id].hp);
            // Algo ya suyo y mejor (la Espada de Zafias de Bram): se lo pone
            const owned = (meta.advGear || []).filter(id => GEAR[id] && GEAR[id].slot === slot && val(id) > val(cur)).sort((a, b) => val(b) - val(a))[0];
            if (owned) { if (slot === 'weapon') meta.advWeapon = owned; else meta.advArmor = owned; }
            const now = slot === 'weapon' ? weaponId(meta) : armorId(meta);
            const best = GEAR_FOR_SALE.filter(id => GEAR[id].slot === slot && val(id) > val(now) && Meta.canBuyGear(meta, id) && meta.gold - GEAR[id].price >= reserve).sort((a, b) => val(b) - val(a))[0];
            if (best && buy(slot === 'weapon' ? 'espadas' : 'armaduras', () => Meta.buyGear(meta, best), GEAR[best].name)) {
                if (slot === 'weapon') meta.advWeapon = best; else meta.advArmor = best;
                // Vende lo que ya no usa (lo que tenga precio)
                for (const id of [...(meta.advGear || [])]) {
                    if (GEAR[id].slot !== slot || id === best) continue;
                    const s = Meta.sellItem(meta, `gear:${id}`);
                    if (s.ok) { ledger.in.ventas += s.value; run.sold.push({ what: GEAR[id].name, fight: run.fights, value: s.value }); }
                }
            }
        }
        while (Meta.potionCount(meta) < RPG_BALANCE.potion.max && meta.gold - RPG_BALANCE.potion.price >= reserve && buy('pociones', () => Meta.buyPotion(meta), 'poción')) { /* hasta el tope */ }
        // Quien ha subido la Inteligencia vive del maná: también lleva pociones de maná
        if ((meta.primary.int || 0) >= 4) while (Meta.manaPotionCount(meta) < RPG_BALANCE.manaPotion.max && meta.gold - RPG_BALANCE.manaPotion.price >= reserve && buy('pociones', () => Meta.buyManaPotion(meta), 'poción de maná')) { /* hasta el tope */ }
        check('tienda');
    };

    // Dormir en la posada: cuesta (hasta que Evelyn deja de cobrar). Sin oro, no se duerme
    const sleep = () => {
        visitAll();
        const price = st.flags.misionCumplida ? 0 : RPG_BALANCE.inn.price;
        shop();
        if (meta.gold < price) { run.brokeNights++; return false; }
        if (price) { Meta.recordGold(meta, -price); ledger.out.posada += price; run.paidNights++; }
        st.hp = null; st.mp = null; st.energy = 0; st.gone = {}; st.rare = {};
        run.nights++;
        return true;
    };

    const battle = (id, training = false) => {
        const p = point[id];
        const rareId = rareOf(p);
        if (rareId && !(id in st.rare)) st.rare[id] = rollRare(rareId, rng);
        const isRare = !!st.rare[id];
        const r = fight(meta, st, p, rng, { policy: o.policy, rare: isRare });
        run.fights++; run.turns += r.turns; run.potionsUsed += r.used; run.badActions += r.bad;
        if (r.result === 'timeout') { run.timeouts++; run.anomalies.push(`combate sin fin contra ${r.enemy.name}`); }
        const key = isRare ? `${id}★` : id;
        const s = run.byEnemy[key] = run.byEnemy[key] || { name: r.enemy.name, fights: 0, wins: 0, hpLost: 0, turns: 0, level: 0, training: 0 };
        s.fights++; s.turns += r.turns; s.hpLost += r.hpLost; s.level += meta.charLevel; if (training) s.training++;
        if (isRare) run.rares.seen++;
        if (r.result === 'victory') {
            s.wins++; if (isRare) run.rares.won++;
            st.gone[id] = true; st.flags[`defeated:${id}`] = true;
            const m = r.enemy;
            const gold = Math.max(1, Math.round((m.gold != null ? m.gold : RPG_BALANCE.gold[m.type] || RPG_BALANCE.gold.monster) * (m.goldMul || 1))) + Meta.upgradeEffect(meta, 'buen_ojo');
            Meta.recordGold(meta, gold); ledger.in.combate += gold;
            const lvl = Meta.recordXp(meta, Math.max(1, Math.round((m.xp != null ? m.xp : XP_REWARD[m.type] || XP_REWARD.monster) * (m.xpMul || 1) * (1 + Meta.upgradeEffect(meta, 'estudio')))));
            if (lvl.levelsGained) spendPoints();
            Meta.recordCombatWin(meta);
            const table = dropsOf(p);
            const fam = (p.enemy && (p.enemy.creature || p.enemy.drops)) || 'otro';
            run.kills[fam] = (run.kills[fam] || 0) + 1;
            if (table) {
                const d = rollDrop(table, rng, { always: isRare });
                const k = `${table}${isRare ? '★' : ''}`;
                run.drops[k] = run.drops[k] || { kills: 0, items: {}, lost: 0 };
                run.drops[k].kills++;
                if (d) { const name = d.id || d.kind; run.drops[k].items[name] = (run.drops[k].items[name] || 0) + 1; if (!Meta.grantDrop(meta, d)) { run.drops[k].lost++; const sp = Meta.spareDropGold(d); if (sp) { Meta.recordGold(meta, sp); ledger.in.ventas += sp; } } }
            }
            if (fam && countingCreatures(st).has(fam)) st.counts[fam] = (st.counts[fam] || 0) + 1;
            check(`victoria ${id}`);
            return true;
        }
        run.deaths++;
        if (isRare) st.rareFell = true;
        const lost = Math.floor(meta.gold * 0.1);
        Meta.recordGold(meta, -lost); ledger.out.caidas += lost;
        st.hp = null; st.mp = null;   // despiertas en la posada, gratis
        check(`caída ${id}`);
        return false;
    };

    const tired = () => { if (st.rareFell) { st.rareFell = false; return true; } const h = buildHero(meta, st); return (st.hp ?? h.maxHp) < h.maxHp * 0.6; };
    const train = () => {
        const goal = meta.charLevel + 1;
        for (let n = 0; n < 80 && meta.charLevel < goal; n++) {
            if (tired() || FARM.every(id => st.gone[id])) { if (!sleep() && FARM.every(id => st.gone[id])) break; }
            const id = FARM.find(q => !st.gone[q]);
            if (!id) break;
            for (const w of enemiesOnWay(st, id) || []) if (!battle(w, true)) break;
        }
    };

    visitAll();   // al llegar: Evelyn, Bram, Amelie, los vecinos y el pozo
    for (const target of [...MAIN, ...OPTIONAL]) {
        let attempts = 0;
        while (!st.flags[`defeated:${target}`] && attempts < 50) {
            attempts++;
            if (tired()) sleep();
            const way = enemiesOnWay(st, target);
            if (!way) { attempts = 99; break; }
            let fell = false;
            for (const id of way) if (!battle(id)) { fell = true; break; }
            if (fell) train();
        }
        if (!st.flags[`defeated:${target}`]) { run.stuck = target; break; }
        run.levelAt[target] = meta.charLevel; run.fightsAt[target] = run.fights;
        visitAll();
    }
    run.done = !!st.flags['defeated:feronius'];
    run.atEnd = { level: meta.charLevel, gold: meta.gold, weapon: weaponId(meta), armor: armorId(meta), filo: Meta.upgradeLevel(meta, 'filo'), constitucion: Meta.upgradeLevel(meta, 'constitucion'),
        fights: run.fights, nights: run.nights, earned: { ...ledger.in }, spent: { ...ledger.out } };

    // Seguir jugando: noches enteras limpiando lo que reaparece, para ver adónde llega la economía
    for (let n = 0; run.done && n < o.extraNights; n++) {
        sleep();
        for (const id of [...MAIN, ...OPTIONAL]) {
            if (point[id].once || st.gone[id]) continue;
            const way = enemiesOnWay(st, id);
            if (!way) continue;
            let fell = false;
            for (const w of way) if (!battle(w, true)) { fell = true; break; }
            if (fell) break;
        }
    }
    sleep();
    run.final = { level: meta.charLevel, gold: meta.gold, weapon: weaponId(meta), armor: armorId(meta), filo: Meta.upgradeLevel(meta, 'filo'), constitucion: Meta.upgradeLevel(meta, 'constitucion'),
        fights: run.fights, nights: run.nights, materials: { ...(meta.materials || {}) }, hero: (h => ({ atq: h.atq, maxHp: h.maxHp }))(buildHero(meta, {})) };
    run.ledger = ledger;
    return run;
}
