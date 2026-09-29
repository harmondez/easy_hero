// =============================================
// 🧪 Harness · Fase 4 — Descenso multi-tramo (el hueco que planning.md señala: el banco
// de equilibrio solo simula el tramo 0). Aquí se baja de verdad, tramo tras tramo, hasta morir
// o hasta un tope de tramos, con los 3 bots, miles de semillas. Es la fase más cara y la que
// más probable es que encuentre algo, porque ejercita rutas de código nunca fuzzeadas: el
// bucle de descenso completo con variantes + botín + escalado, muchos tramos seguidos.
// =============================================
import {
    generateRpgMap, rpgAvailableNodes, RPG_MAP_CONFIG, RPG_COMBAT_TYPES,
    createRpgHero, createRpgMonster, pickMonsterVariants, rpgVictoryReward, applyRpgReward, rpgAbsoluteFloor
} from '../../src/engine.js';
import * as Events from '../../src/events.js';
import { rollLootDrop, equipItem, discardItem, itemScore, ruleSum } from '../../src/items.js';
import { createRng } from '../../src/rng.js';
import { RPG_BALANCE } from '../../src/data/balance.js';
import { fightWith, BOTS } from '../sim.mjs';

let bugs = 0, checks = 0;
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };
const pass = () => { checks++; };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

function resolveLoot(botName, hero, rng, source, floor) {
    const it = rollLootDrop({ rng, floor, source, hero });
    if (botName === 'torpe') { equipItem(hero, it); return; }
    const gain = itemScore(it) - itemScore(hero.equipment[it.slot]);
    if (gain > 0) equipItem(hero, it); else discardItem(hero, it);
}

const MAX_TIERS = 12;

/** Una partida con descenso real: sigue bajando tras cada jefe hasta morir o llegar a MAX_TIERS. */
function playDescent(botName, seed) {
    const bot = BOTS[botName];
    const rng = createRng(seed);
    const hero = createRpgHero();
    let tier = 0;
    let map = generateRpgMap(rng, RPG_MAP_CONFIG, tier);
    const byId0 = () => new Map(map.nodes.map(n => [n.id, n]));
    let byId = byId0();
    const used = [];
    const res = { seed, botName, died: false, deathTier: null, deathFloor: null, killer: null,
        maxTier: 0, maxDepth: 0, fights: 0, anomalies: [] };
    let cur = null, skip = false;

    const checkHero = (where) => {
        if (!finite(hero.hp) || !finite(hero.maxHp) || !finite(hero.atq)) res.anomalies.push(`stats no finitos en ${where}`);
        if (hero.hp > hero.maxHp) res.anomalies.push(`hp(${hero.hp}) > maxHp(${hero.maxHp}) en ${where}`);
        if (hero.maxHp <= 0) res.anomalies.push(`maxHp <= 0 en ${where}`);
    };

    let guardNodes = 5000; // por si un bucle de mapa quedara atascado
    for (;;) {
        if (guardNodes-- <= 0) { res.anomalies.push('guardNodes agotado: posible bucle infinito recorriendo el mapa'); break; }
        const useSkip = skip; skip = false;
        const options = rpgAvailableNodes(map, cur, useSkip);
        if (!options.length) { res.anomalies.push(`sin opciones disponibles sin haber llegado al jefe (tramo ${tier})`); break; }
        const id = bot.chooseNode({ options, byId, hero, rng, map });
        const node = byId.get(id);

        if (RPG_COMBAT_TYPES.includes(node.type)) {
            const variants = pickMonsterVariants(seed, node.id, tier, node.floor);
            const m = createRpgMonster(node.type, node.floor, tier, variants);
            res.fights++;
            let out;
            try { out = fightWith(bot.policy, hero, m, rng); }
            catch (e) { res.anomalies.push(`fightWith lanzó: ${e.message} (tramo ${tier}, piso ${node.floor}, ${m.name})`); break; }
            if (out.result !== 'victory') {
                res.died = true; res.deathTier = tier; res.deathFloor = node.floor; res.killer = m.name;
                res.maxDepth = Math.max(res.maxDepth, rpgAbsoluteFloor(tier, node.floor));
                break;
            }
            applyRpgReward(hero, rpgVictoryReward(node.type));
            checkHero(`tras vencer a ${m.name} (tramo ${tier})`);
            if (node.type === 'subboss') resolveLoot(bot.policy, hero, rng, 'subboss', node.floor);
            else if (node.type === 'monster' && rng() < RPG_BALANCE.loot.combatDropChance) resolveLoot(bot.policy, hero, rng, 'combat', node.floor);
        } else if (node.type === 'chest') {
            hero.hp = Math.min(hero.maxHp, hero.hp + ruleSum(hero, 'treasure_heal'));
            resolveLoot(bot.policy, hero, rng, 'chest', node.floor);
        } else if (node.type === 'campfire') {
            const session = Events.startRpgEvent('hoguera', rng, node.floor);
            const out = Events.resolveRpgEventChoice(session, bot.campfire({ hero, rng }), hero, rng);
            if (out.loot) resolveLoot(bot.policy, hero, rng, out.loot, node.floor);
        } else if (node.type === 'event') {
            const evId = Events.pickRpgEvent(used, node.floor, rng, RPG_MAP_CONFIG);
            used.push(evId);
            const session = Events.startRpgEvent(evId, rng, node.floor);
            let r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            let g = 10;
            while (r.next && g--) r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            if (r.skipFloor) skip = true;
            if (r.combat) {
                const m = Events.createEventMonster(r.combat.monster, hero, node.floor, r.combat.hpFactor);
                res.fights++;
                let out;
                try { out = fightWith(bot.policy, hero, m, rng); }
                catch (e) { res.anomalies.push(`fightWith (evento) lanzó: ${e.message}`); break; }
                if (out.result !== 'victory') {
                    res.died = true; res.deathTier = tier; res.deathFloor = node.floor; res.killer = m.name;
                    res.maxDepth = Math.max(res.maxDepth, rpgAbsoluteFloor(tier, node.floor));
                    break;
                }
                if (r.combat.onWin) Events.applyRpgFx(hero, r.combat.onWin);
            }
        }
        checkHero(`nodo ${node.type} tramo ${tier}`);
        cur = node.id;

        if (node.type === 'boss') {
            res.maxTier = tier; res.maxDepth = Math.max(res.maxDepth, rpgAbsoluteFloor(tier, node.floor));
            if (tier >= MAX_TIERS) break;   // tope del harness, no del juego: ya hemos visto suficiente
            tier++;
            hero.hp = hero.maxHp;           // el descenso real cura del todo al bajar
            map = generateRpgMap(rng, RPG_MAP_CONFIG, tier);
            byId = byId0();
            cur = null;
        }
    }
    res.maxTier = Math.max(res.maxTier, tier);
    return res;
}

const N = 150; // por bot: 150 × 3 bots × hasta 12 tramos es ya un fuzz serio del descenso completo
const depthByBot = {};
for (const botName of Object.keys(BOTS)) {
    const depths = [];
    for (let s = 1; s <= N; s++) {
        let res;
        try { res = playDescent(botName, s * 104729 + 13); }
        catch (e) { bug(`playDescent(${botName}, seed=${s}) lanzó fuera de los try internos: ${e.message}`); continue; }
        pass();
        depths.push(res.maxDepth);
        for (const a of res.anomalies) bug(`${botName} seed=${s}: ${a}`);
        checks += res.anomalies.length === 0 ? 1 : 0;
    }
    depths.sort((a, b) => a - b);
    depthByBot[botName] = {
        min: depths[0], max: depths.at(-1),
        median: depths[Math.floor(depths.length / 2)],
        reachedCap: depths.filter(d => d >= rpgAbsoluteFloorCapCheck()).length
    };
}
function rpgAbsoluteFloorCapCheck() { return MAX_TIERS * RPG_MAP_CONFIG.floors; } // profundidad si llega al tope del harness

for (const [bot, d] of Object.entries(depthByBot)) {
    console.log(`OK descenso ${bot}: profundidad min=${d.min} mediana=${d.median} máx=${d.max} (de ${N} partidas, tope harness=${MAX_TIERS} tramos)`);
}

console.log(`\nSUMMARY fase4: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);
