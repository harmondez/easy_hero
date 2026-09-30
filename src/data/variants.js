// =============================================
// 🧬 Variantes de monstruo — dos tablas que se combinan sobre cualquier nombre base
//
//   [Nombre] + [Adjetivo] + [Linaje]  →  «Ogro Colérico de la Plaga»
//
// ADJETIVOS: cambian estadísticas y/o forma de pelear (casi siempre con un contrapeso).
// LINAJES:   añaden un efecto temático («de la Plaga» envenena, «de las Brasas» quema).
//
// Un monstruo lleva como mucho UNO de cada tabla, y lo normal es que no lleve ninguno. La
// probabilidad sube con la profundidad (RPG_BALANCE.variants), así que los tramos hondos no son
// solo más duros: son más raros.
//
// Campos (todos opcionales salvo id y name):
//   atkMul / hpMul     multiplican las estadísticas del monstruo
//   goldMul / xpMul    multiplican la recompensa al vencerlo
//   minTier            no aparece antes de ese tramo (0 = desde el principio)
//   pattern(p)         devuelve el patrón de movimientos transformado
//   rules              banderas que lee el motor durante el combate (ver engine.js)
// =============================================
import { atk, heal, CHARGE, GUARD, REST } from './monsters.js?v=1.5.1';

// Quita de un patrón los movimientos que no son ataques (para los que «no se paran»)
const onlyAttacks = p => {
    const hits = p.filter(m => m.k === 'attack');
    return hits.length ? hits : [atk(1)];
};

export const MONSTER_ADJECTIVES = [
    {
        id: 'colerico', name: 'Colérico',
        atkMul: 1.4, hpMul: 0.75, goldMul: 1.2,
        desc: 'Pega mucho más fuerte, pero aguanta menos.'
    },
    {
        id: 'petreo', name: 'Pétreo',
        atkMul: 0.8, hpMul: 1.5, goldMul: 1.2,
        pattern: p => [GUARD, ...p],
        desc: 'Duro de roer y se protege a menudo.'
    },
    {
        id: 'veloz', name: 'Veloz',
        atkMul: 0.85, hpMul: 0.9, goldMul: 1.15,
        pattern: onlyAttacks,
        desc: 'No descansa ni carga: golpea todas las rondas.'
    },
    {
        id: 'paciente', name: 'Paciente',
        hpMul: 1.15, goldMul: 1.3,
        pattern: () => [CHARGE, CHARGE, atk(3.5)],
        desc: 'Se toma su tiempo y descarga un golpe demoledor.'
    },
    {
        id: 'colosal', name: 'Colosal',
        atkMul: 1.2, hpMul: 1.8, goldMul: 1.5,
        pattern: p => [...p, REST],
        desc: 'Enorme y lento: mucha vida y mucho daño, con pausas.'
    },
    {
        id: 'furibundo', name: 'Furibundo',
        hpMul: 1.1, goldMul: 1.3,
        rules: { rageBelow: 0.3, rageAtkMul: 1.6 },
        desc: 'Por debajo de un tercio de vida se vuelve loco.'
    },
    {
        id: 'espinoso', name: 'Espinoso',
        hpMul: 1.1, goldMul: 1.25,
        rules: { thorns: 2 },
        desc: 'Te devuelve parte del daño cada vez que le golpeas.'
    },
    {
        id: 'coriaceo', name: 'Coriáceo',
        goldMul: 1.25,
        rules: { physResist: 0.25 },
        desc: 'El daño físico le hace menos: cambia de arma o tardarás.'
    },
    {
        id: 'etereo', name: 'Etéreo',
        goldMul: 1.25,
        rules: { elemResist: 0.25 },
        desc: 'El daño elemental le hace menos.'
    },
    {
        id: 'escurridizo', name: 'Escurridizo',
        hpMul: 0.8, goldMul: 1.3,
        rules: { dodge: 0.15 },
        desc: 'A veces esquiva tus golpes por completo.'
    },
    {
        id: 'certero', name: 'Certero',
        hpMul: 0.9, goldMul: 1.35,
        rules: { pierceGuard: true },
        desc: 'Defenderte no te sirve de nada contra él.'
    },
    {
        id: 'cauto', name: 'Cauto',
        goldMul: 1.2,
        rules: { healBelow: 0.5, healPct: 0.25 },
        desc: 'Cuando se ve perdido, se cura una vez.'
    },
    {
        id: 'dorado', name: 'Dorado',
        hpMul: 0.7, atkMul: 0.9, goldMul: 5,
        desc: 'Cargado de monedas y poco aguante. Que no se escape.'
    },
    {
        id: 'sabio', name: 'Sabio',
        hpMul: 1.2, xpMul: 3, goldMul: 0.8,
        desc: 'Enseña más de lo que castiga: mucha experiencia.'
    }
];

export const MONSTER_LINEAGES = [
    {
        id: 'plaga', name: 'de la Plaga',
        goldMul: 1.3,
        rules: { poisonOnHit: 2 },
        desc: 'Sus ataques te envenenan.'
    },
    {
        id: 'brasas', name: 'de las Brasas',
        goldMul: 1.3,
        rules: { burnOnHit: { dmg: 2, turns: 2 } },
        desc: 'Sus ataques te dejan ardiendo.'
    },
    {
        id: 'carrona', name: 'de la Carroña',
        hpMul: 1.1, goldMul: 1.35,
        rules: { lifesteal: 0.5 },
        desc: 'Se cura con la mitad del daño que te hace.'
    },
    {
        id: 'sangre', name: 'de la Sangre',
        goldMul: 1.35,
        rules: { bloodlust: 0.6 },
        desc: 'Cuanta menos vida le queda, más fuerte pega.'
    },
    {
        id: 'huesos', name: 'de los Huesos',
        goldMul: 1.3,
        rules: { deathBlow: 1.2 },
        desc: 'Al caer te asesta un último golpe.'
    },
    {
        id: 'forja', name: 'de la Forja',
        hpMul: 1.2, goldMul: 2,
        rules: { physResist: 0.2, elemResist: 0.2 },
        desc: 'Resiste todo, pero está hecho de monedas.'
    },
    {
        id: 'abismo', name: 'del Abismo',
        atkMul: 1.3, hpMul: 1.3, goldMul: 1.6, xpMul: 1.5,
        minTier: 2,
        desc: 'Criatura de las profundidades: más de todo.'
    },
    {
        id: 'niebla', name: 'de la Niebla',
        hpMul: 1.15, goldMul: 1.8, xpMul: 1.4,
        minTier: 2,
        rules: { ambush: 2 },
        desc: 'Surge de la niebla: su primer golpe hace el doble.'
    }
];

export const ADJECTIVES_BY_ID = Object.fromEntries(MONSTER_ADJECTIVES.map(v => [v.id, v]));
export const LINEAGES_BY_ID = Object.fromEntries(MONSTER_LINEAGES.map(v => [v.id, v]));

/** Las variantes que pueden salir en ese tramo (las hay que solo aparecen en profundidad). */
export const adjectivesFor = tier => MONSTER_ADJECTIVES.filter(v => (v.minTier || 0) <= tier);
export const lineagesFor = tier => MONSTER_LINEAGES.filter(v => (v.minTier || 0) <= tier);
