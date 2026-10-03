// =============================================
// 📜 Misiones (puro, sin DOM): en qué estado está cada misión según las marcas y las cuentas de la aventura
// =============================================
import { QUESTS } from './data/quests.js?v=1.11.0';

const hasAll = (flags, list) => (list || []).every(f => flags[f]);

/** Estado de una misión: 'locked' (sin empezar) · 'active' · 'done'. */
export function questStatus(q, state) {
    const flags = state.flags || {};
    if (q.done && flags[q.done]) return 'done';
    if (q.start && !flags[q.start]) return 'locked';
    return 'active';
}

/** Cuántas criaturas de ese tipo lleva vencidas para la misión (desde que empezó). */
export const questCount = (state, creature) => ((state.counts || {})[creature]) || 0;

/** Cuántos materiales de ese tipo llevas encima (state.items: los materiales del inventario). */
export const questItems = (state, material) => ((state.items || {})[material]) || 0;

function stepDone(step, state) {
    if (step.count) return questCount(state, step.count.creature) >= step.count.n;
    if (step.item) return questItems(state, step.item.material) >= step.item.n;
    if (step.when) return hasAll(state.flags || {}, step.when);
    return false;
}

/** Los pasos con su estado y su progreso («2/5»), para el diario. */
export function questSteps(q, state) {
    return q.steps.map(step => {
        const done = stepDone(step, state);
        let progress = null;
        if (step.count) progress = { have: Math.min(step.count.n, questCount(state, step.count.creature)), need: step.count.n };
        else if (step.item) progress = { have: Math.min(step.item.n, questItems(state, step.item.material)), need: step.item.n };
        else if (step.progress) progress = { have: step.progress.filter(f => (state.flags || {})[f]).length, need: step.progress.length };
        return { text: step.text, done, progress };
    });
}

/** El objetivo de ahora: el primer paso sin cumplir (o null si está cumplida). */
export function questCurrentStep(q, state) {
    return questSteps(q, state).find(s => !s.done) || null;
}

/** Todas las misiones visibles en el diario (empezadas o cumplidas), principal primero. */
export function questLog(state) {
    return QUESTS.map(q => ({ quest: q, status: questStatus(q, state) }))
        .filter(x => x.status !== 'locked')
        .map(x => ({ ...x, steps: questSteps(x.quest, state).map(s => x.status === 'done' ? { ...s, done: true } : s) }));   // cumplida: todo tachado
}

/** El color de un NPC en el mapa: 'quest' (azul: tiene misión por dar o en marcha) · 'done' (gris) · 'talk' (amarillo). */
export function npcQuestMark(npcId, state) {
    const mine = QUESTS.filter(q => q.giver === npcId);
    if (!mine.length) return 'talk';
    return mine.every(q => questStatus(q, state) === 'done') ? 'done' : 'quest';
}

/** Las criaturas que cuentan ahora mismo para alguna misión en marcha. */
export const countingCreatures = state => new Set(QUESTS
    .filter(q => questStatus(q, state) === 'active')
    .flatMap(q => q.steps.filter(s => s.count).map(s => s.count.creature)));
