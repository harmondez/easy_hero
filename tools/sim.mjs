// =============================================
// 🤖 Simulador de partidas — lo usan `npm run balance` y los tests
// Tres bots con distinta habilidad juegan partidas enteras sobre el motor puro:
//   torpe   → ataca siempre, camina al azar, decide los eventos al azar
//   sensato → usa las intenciones (defiende antes de un golpe fuerte), evita sub-jefes, se cura cuando toca
//   experto → mira dos rondas hacia delante en cada combate y elige la ruta según lo que le costaría cada pelea
// =============================================
import {
    createRpgHero, createRpgCombat, rpgCombatAction, rpgSkillReady, rpgSkillInfo, rpgAttackPreview,
    generateRpgMap, rpgAvailableNodes, createRpgMonster, rpgVictoryReward, applyRpgReward,
    RPG_COMBAT_TYPES, RPG_MAP_CONFIG
} from '../src/engine.js';
import * as Events from '../src/events.js';
import { createRng } from '../src/rng.js';

const STUB_RNG = () => 0.5;
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- Combate ----------
function cloneCombat(c) {
    const { hero, monster, turn, defending, cooldowns, lastAction, over, result } = c;
    return { ...clone({ hero, monster, turn, defending, cooldowns, lastAction, over, result }), rng: STUB_RNG };
}

/** Cambia la acción si repetirla activaría la lectura del Lector. */
function avoidRepeat(c, action) {
    if (c.monster.ai !== 'reader' || c.lastAction !== action) return action;
    if (action !== 'attack') return 'attack';
    return rpgSkillReady(c, 'fire_strike') ? 'skill' : 'defend';
}

const POLICIES = {
    torpe: () => ({ action: 'attack' }),

    sensato: c => {
        const { hero, monster } = c;
        const it = monster.intent;
        const incoming = it && it.k === 'attack' ? it.dmg : 0;
        let action = 'attack';
        if (incoming >= 0.28 * hero.hp || (incoming > 0 && incoming >= hero.hp - 1)) action = 'defend';
        else if (rpgSkillReady(c, 'fire_strike') && rpgSkillInfo(hero, 'fire_strike').damage > rpgAttackPreview(c)) action = 'skill';
        return { action: avoidRepeat(c, action), skillId: 'fire_strike' };
    },

    experto: c => {
        const candidates = ['attack', 'defend'];
        if (rpgSkillReady(c, 'fire_strike')) candidates.push('skill');
        const score = (before, after) => {
            if (after.result === 'victory') return 3;
            if (after.result === 'defeat') return -10;
            const dealt = (before.monster.hp - after.monster.hp) / Math.max(1, before.monster.maxHp);
            const lost = (before.hero.hp - after.hero.hp) / Math.max(1, before.hero.maxHp);
            return dealt * 2 - lost * 2.6;
        };
        let best = null;
        for (const a1 of candidates) {
            const c1 = cloneCombat(c);
            rpgCombatAction(c1, a1, 'fire_strike');
            let s = score(c, c1);
            if (!c1.over) {
                // segunda ronda: la mejor respuesta
                let best2 = -Infinity;
                const next = ['attack', 'defend'];
                if (rpgSkillReady(c1, 'fire_strike')) next.push('skill');
                for (const a2 of next) {
                    const c2 = cloneCombat(c1);
                    rpgCombatAction(c2, a2, 'fire_strike');
                    best2 = Math.max(best2, score(c1, c2));
                }
                s += best2 * 0.9;
            }
            if (c.monster.ai === 'reader' && c.lastAction === a1) s -= 2;
            if (!best || s > best.s + 1e-9) best = { a: a1, s };
        }
        return { action: best.a, skillId: 'fire_strike' };
    }
};

/** Juega un combate entero con la política dada. Devuelve 'victory' | 'defeat' | 'fled' | null. */
export function fightWith(policyName, hero, monster, rng) {
    const c = createRpgCombat(hero, monster, rng);
    const policy = POLICIES[policyName];
    let guard = 400;
    while (!c.over && guard--) {
        const { action, skillId } = policy(c);
        const r = rpgCombatAction(c, action, skillId);
        if (!r.ok) rpgCombatAction(c, 'attack');
    }
    return { result: c.result, monster, rounds: c.turn };
}

/** Vida que le costaría al héroe una pelea (sin tocar nada real). */
function estimateFightLoss(policyName, hero, monster) {
    const h = clone(hero), m = clone(monster);
    const start = h.hp;
    const out = fightWith(policyName, h, m, STUB_RNG);
    return out.result === 'victory' ? start - h.hp : Infinity;
}

// ---------- Valor de un héroe (para elegir opciones de eventos) ----------
const heroValue = h => h.hp + 0.5 * h.maxHp + 7 * h.atq;

function sampleEventOption(session, index, hero, rng, samples = 24) {
    let total = 0;
    for (let i = 0; i < samples; i++) {
        const h = clone(hero), s = clone(session);
        const r = Events.resolveRpgEventChoice(s, index, h, rng);
        if (!r.ok) return -Infinity;
        let v = heroValue(h) - heroValue(hero);
        if (r.combat) v -= 0.35 * hero.hp + 6;       // una pelea forzada cuesta vida
        if (r.next) v -= 2;                          // incertidumbre del Lector
        total += v;
    }
    return total / samples;
}

// ---------- Bots ----------
const PRIORITY = { campfire: 0, event: 1, chest: 2, monster: 3, subboss: 4, boss: 5 };

export const BOTS = {
    torpe: {
        policy: 'torpe',
        chooseNode: ({ options, rng }) => options[Math.floor(rng() * options.length)],
        chooseOption: ({ rng }) => Math.floor(rng() * 2),
        campfire: ({ rng }) => Math.floor(rng() * 2)
    },
    sensato: {
        policy: 'sensato',
        chooseNode: ({ options, byId, hero, rng }) => {
            const hurt = hero.hp < 0.6 * hero.maxHp;
            const score = id => {
                const t = byId.get(id).type;
                if (t === 'campfire') return hurt ? -1 : 2;
                return PRIORITY[t];
            };
            const best = Math.min(...options.map(score));
            const pool = options.filter(id => score(id) === best);
            return pool[Math.floor(rng() * pool.length)];
        },
        chooseOption: ({ session, hero, rng }) => {
            const a = sampleEventOption(session, 0, hero, rng), b = sampleEventOption(session, 1, hero, rng);
            return b > a ? 1 : 0;
        },
        campfire: ({ hero }) => (hero.hp < 0.7 * hero.maxHp ? 0 : 1)
    },
    experto: {
        policy: 'experto',
        chooseNode: ({ options, byId, hero, rng }) => {
            const hurt = hero.hp < 0.7 * hero.maxHp;
            let best = null;
            for (const id of options) {
                const n = byId.get(id);
                let v;
                if (n.type === 'campfire') v = hurt ? 90 : 25;
                else if (n.type === 'event') v = 45;
                else if (n.type === 'chest') v = 50;
                else if (RPG_COMBAT_TYPES.includes(n.type)) {
                    const loss = estimateFightLoss('experto', hero, createRpgMonster(n.type, n.floor));
                    const frac = loss / hero.hp;
                    v = 40 - 100 * frac + (n.type === 'subboss' ? 8 : 0);
                    if (n.type === 'boss') v = 100;
                    if (frac >= 1) v = -1000;
                } else v = 0;
                v += rng() * 0.01;
                if (!best || v > best.v) best = { id, v };
            }
            return best.id;
        },
        chooseOption: ({ session, hero, rng }) => {
            const a = sampleEventOption(session, 0, hero, rng, 40), b = sampleEventOption(session, 1, hero, rng, 40);
            return b > a ? 1 : 0;
        },
        campfire: ({ hero }) => (hero.hp < 0.75 * hero.maxHp ? 0 : 1)
    }
};

// ---------- Una partida ----------
/**
 * Juega una partida completa. Devuelve un resumen:
 * { won, reachedBoss, deathFloor, killer, events, campfires, subbosses, fights }
 */
export function playRun(botName, seed, { cfg = RPG_MAP_CONFIG, god = false } = {}) {
    const bot = god ? BOTS.torpe : BOTS[botName];   // `god`: héroe invencible que solo ataca, para probar el FLUJO
    const rng = createRng(seed);
    const hero = createRpgHero();
    if (god) { hero.atq = 99999; hero.hp = hero.maxHp = 99999; } // (su propio reflejo cae de un golpe)
    const map = generateRpgMap(rng, cfg);
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const used = [];
    const res = { won: false, reachedBoss: false, deathFloor: null, killer: null, events: 0, campfires: 0, subbosses: 0, fights: 0, skips: 0, eventFights: 0, eventIds: [], hero };
    let cur = null, skip = false;

    const die = (node, monster) => { res.deathFloor = node.floor; res.killer = monster.name; };

    for (;;) {
        const useSkip = skip;
        skip = false;
        const options = rpgAvailableNodes(map, cur, useSkip);
        if (!options.length) break;
        const id = bot.chooseNode({ options, byId, hero, rng, map });
        const node = byId.get(id);
        if (node.type === 'boss') res.reachedBoss = true;

        if (RPG_COMBAT_TYPES.includes(node.type)) {
            const m = createRpgMonster(node.type, node.floor);
            res.fights++;
            if (node.type === 'subboss') res.subbosses++;
            const out = fightWith(bot.policy, hero, m, rng);
            if (out.result !== 'victory') { die(node, m); return res; }
            applyRpgReward(hero, rpgVictoryReward(node.type));
        } else if (node.type === 'chest') {
            if (rng() < 0.5) hero.atq += 1; else { hero.maxHp += 5; hero.hp += 5; }
        } else if (node.type === 'campfire') {
            res.campfires++;
            const session = Events.startRpgEvent('hoguera', rng, node.floor);
            Events.resolveRpgEventChoice(session, bot.campfire({ hero, rng }), hero, rng);
        } else if (node.type === 'event') {
            res.events++;
            const evId = Events.pickRpgEvent(used, node.floor, rng, cfg);
            used.push(evId);
            res.eventIds.push(evId);
            const session = Events.startRpgEvent(evId, rng, node.floor);
            let r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            let guard = 10;
            while (r.next && guard--) r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            if (r.skipFloor) { skip = true; res.skips++; }
            if (r.combat) {
                const m = Events.createEventMonster(r.combat.monster, hero, node.floor, r.combat.hpFactor);
                res.fights++;
                res.eventFights++;
                const out = fightWith(bot.policy, hero, m, rng);
                if (out.result !== 'victory') { die(node, m); return res; }
                if (r.combat.onWin) Events.applyRpgFx(hero, r.combat.onWin);
            }
        }
        cur = node.id;
        if (node.type === 'boss') { res.won = true; return res; }
    }
    return res;
}

// ---------- Muchas partidas ----------
export function runBatch(botName, n = 1000, seed0 = 1000, opts = {}) {
    const agg = { bot: botName, n, won: 0, reached: 0, deaths: new Array((opts.cfg || RPG_MAP_CONFIG).floors).fill(0),
        killers: new Map(), events: 0, campfires: 0, subbosses: 0, fights: 0 };
    for (let i = 0; i < n; i++) {
        const r = playRun(botName, seed0 + i, opts);
        if (r.won) agg.won++;
        if (r.reachedBoss) agg.reached++;
        if (r.deathFloor != null) {
            agg.deaths[r.deathFloor]++;
            agg.killers.set(r.killer, (agg.killers.get(r.killer) || 0) + 1);
        }
        agg.events += r.events; agg.campfires += r.campfires; agg.subbosses += r.subbosses; agg.fights += r.fights;
    }
    return agg;
}
