// =============================================
// 🌐 RPG-pack — flujo completo en el navegador (Playwright)
// Levanta su propio servidor estático: no necesita Python ni nada en marcha.
// Con SHOT_DIR=<carpeta> guarda capturas de pantalla para revisar el aspecto.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
        const body = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' });
        res.end(body);
    } catch {
        res.writeHead(404); res.end('not found');
    }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shotDir = process.env.SHOT_DIR || '';
const shot = name => path.join(shotDir || os_tmp(), `${name}.png`);
function os_tmp() { return process.env.TEMP || process.env.TMPDIR || '/tmp'; }

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await sleep(500);

await page.waitForFunction(() => getComputedStyle(document.getElementById('rpgStartView')).opacity === '1', null, { timeout: 15000 });
console.log('\n🗡️ Inicio — la Carta de Héroe');
const cardBox = await (await page.$('#rpgHeroCard')).boundingBox();
assert('La Carta de Héroe y el botón Comenzar son visibles en pantalla', !!cardBox && cardBox.width > 0 && await page.isVisible('#btnRpgStart'));
const heroCardText = await page.$eval('#rpgHeroCard', el => el.textContent);
assert('La carta muestra ATK 1 / HP 25 y ninguna DEF',
    /ATK\s*1\b/.test(heroCardText) && /HP\s*25\b/.test(heroCardText) && !/DEF/.test(heroCardText));
assert('Solo hay RPG: sin motor ni datos del Easy Hit original', await page.evaluate(() =>
    typeof window.Engine.OFFICIAL_CARDS === 'undefined' && typeof window.Engine.ULTIMATE_DB === 'undefined'
    && typeof window.Engine.MAX_FERVOR === 'undefined' && !document.getElementById('tab-library')));

assert('La cabecera muestra la versión del juego (la misma de package.json)',
    (await page.$eval('.game-version', el => el.textContent)).includes(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version));

await page.click('#btnRpgStart');
await sleep(700);

console.log('\n🗺️ Mapa');
assert('El mapa dibuja nodos y un único jefe final',
    (await page.$$eval('#rpgMap .rpg-node', els => els.length)) >= 10
    && (await page.$$eval('#rpgMap .type-boss', els => els.length)) === 1);
assert('Al inicio solo se pueden pisar los nodos del primer piso (6 caminos)',
    (await page.$$eval('#rpgMap .rpg-node.is-available', els => els.length)) === 6);
assert('El mapa es largo y denso: 16 pisos y al menos 40 nodos',
    (await page.$$eval('#rpgMap .rpg-node', els => els.length)) >= 40
    && await page.evaluate(() => window.gameState.rpg.map.floors === 16));
assert('Hay nodos de evento 🎲 en el mapa y en la leyenda',
    (await page.$$eval('#rpgMap .rpg-node.type-event', els => els.length)) >= 6
    && (await page.$eval('#rpgLegend', el => el.textContent)).includes('Evento'));
assert('Hay hogueras 🔥 en el mapa y en la leyenda',
    (await page.$$eval('#rpgMap .rpg-node.type-campfire', els => els.length)) >= 5
    && (await page.$eval('#rpgLegend', el => el.textContent)).includes('Hoguera'));
assert('Los sub-jefes son minoría en el mapa (menos del 15 % de los nodos)',
    (await page.$$eval('#rpgMap .rpg-node.type-subboss', els => els.length)) < 0.15 * (await page.$$eval('#rpgMap .rpg-node', els => els.length)));
await page.screenshot({ path: shot('mapa-escritorio'), fullPage: true });

console.log('\n⚔️ Combate');
await page.click('#rpgMap .rpg-node.is-available');
await sleep(400);
assert('Pulsar un monstruo abre el combate',
    await page.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none'));
const heroBox = await (await page.$('#rpgCombatHero .rpg-fighter-card')).boundingBox();
const monBox = await (await page.$('#rpgCombatMonster .rpg-fighter-card')).boundingBox();
assert('Héroe a la izquierda y monstruo a la derecha', heroBox && monBox && heroBox.x + heroBox.width <= monBox.x);
assert('Ambos se muestran como carta con ATK/HP',
    (await page.$$eval('.rpg-fighter-card .rpg-stat', els => els.length)) === 4);
const labels = await page.$$eval('#rpgCombatActions .rpg-action-label', els => els.map(e => e.textContent.trim()));
assert('Acciones: Atacar / Defender / Habilidades / Huir', labels.join(',') === 'ATACAR,DEFENDER,HABILIDADES,HUIR');
assert('El enemigo muestra su INTENCIÓN antes de que elijas: «Ataca 1» (el Slime empieza atacando)',
    /Ataca/.test(await page.$eval('#rpgCombatMonster .rpg-intent', el => el.textContent)) && (await page.$$('#rpgCombatMonster .rpg-intent.is-attack')).length === 1);

await page.click('[data-rpg-action="defend"]');
await sleep(150);
assert('Defender queda anotado',
    (await page.$$eval('#rpgCombatLogContent .log-entry', els => els.map(e => e.textContent).join('|'))).includes('se defiende'));
assert('La intención cambia cada ronda: tras atacar, el Slime anuncia que DESCANSA',
    /Descansa/.test(await page.$eval('#rpgCombatMonster .rpg-intent', el => el.textContent)) && (await page.$$('#rpgCombatMonster .rpg-intent.is-rest')).length === 1);

await page.click('[data-rpg-action="skills"]');
await sleep(100);
const skillBtn = await page.$('[data-rpg-skill="fire_strike"]');
assert('Habilidades abre un submenú con Golpe de Fuego', !!skillBtn);
await skillBtn.click();
await sleep(150);
assert('Golpe de Fuego inflige 5 de daño (6 → 1 HP)',
    /1\s*\/\s*6/.test(await page.$eval('#rpgCombatMonster .rpg-stat.hp', el => el.textContent)));
await page.click('[data-rpg-action="skills"]');
await sleep(100);
assert('Golpe de Fuego queda enfriándose', await page.$eval('[data-rpg-skill="fire_strike"]', el => el.disabled));
await page.click('[data-rpg-action="back"]');
await sleep(100);

await page.click('[data-rpg-action="flee"]');
await sleep(150);
assert('Huir muestra "Has huido"', (await page.$eval('#rpgCombatResult', el => el.textContent)).includes('Has huido'));
await page.click('#btnRpgCombatContinue');
await sleep(300);
assert('Tras huir vuelves al mapa sin avanzar',
    (await page.$$('#rpgMap .rpg-node.is-available')).length === 6
    && (await page.$$('#rpgMap .rpg-node.is-visited')).length === 0);

await page.click('#rpgMap .rpg-node.is-available');
await sleep(300);
for (let i = 0; i < 30 && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="attack"]');
    await sleep(60);
}
assert('Ganar muestra el panel de victoria', (await page.$eval('#rpgCombatResult', el => el.textContent)).includes('Victoria'));
await page.click('#btnRpgCombatContinue');
await sleep(300);
assert('Tras ganar, el nodo pasa a ser tu posición', (await page.$$('#rpgMap .rpg-node.is-current')).length === 1);
assert('Ganar ya no da fuerza (viene del equipo); solo sube el nivel', await page.evaluate(() =>
    window.gameState.rpg.hero.atq === 1 && window.gameState.rpg.hero.level === 2));

// ---------------------------------------------
console.log('\n🎲 Eventos en el navegador');
const visible = sel => page.$eval(sel, el => getComputedStyle(el).display !== 'none').catch(() => false);
async function finishCombat() {
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) {
        await page.click('[data-rpg-action="attack"]');
        await sleep(40);
    }
    await page.click('#btnRpgCombatContinue');
    await sleep(120);
}
async function resolveEventFirstOptions() {
    for (let i = 0; i < 8 && !(await page.$('#btnRpgEventContinue')); i++) {
        const opt = await page.$('[data-rpg-event-opt="0"]');
        if (!opt) break;
        await opt.click();
        await sleep(60);
    }
    if (await page.$('#btnRpgEventContinue')) {
        await page.click('#btnRpgEventContinue');
        await sleep(120);
        if (await visible('#rpgCombatView')) await finishCombat();
    }
}
// Botín abierto: se lleva la primera oferta y la equipa
async function takeLoot() {
    for (let i = 0; i < 3 && await visible('#rpgLootView'); i++) {
        await page.click('[data-rpg-loot-pick="0"]');
        await sleep(40);
        await page.click('#btnRpgLootEquip');
        await sleep(100);
    }
}
async function stepNode(node) {
    await node.click();
    await sleep(100);
    if (await visible('#rpgCombatView')) await finishCombat();
    else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
    await takeLoot();
}
// Nueva ruta con un héroe casi invencible; se camina hasta un evento y se fuerza cuál es
async function openEvent(target) {
    await page.click('#btnRpgNewMap');
    await sleep(300);
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
    for (let step = 0; step < 20; step++) {
        const ev = await page.$('#rpgMap .rpg-node.type-event.is-available');
        if (ev) {
            await page.evaluate(t => { window.gameState.rpg.usedEvents = window.Events.RPG_EVENTS.map(e => e.id).filter(id => id !== t); }, target);
            await ev.click();
            await sleep(120);
            return;
        }
        const avail = await page.$$('#rpgMap .rpg-node.is-available');
        if (!avail.length) throw new Error('sin nodos disponibles');
        await stepNode(avail[0]);
    }
    throw new Error('no se encontró un evento en la ruta');
}
const eventText = () => page.$eval('#rpgEventBody', el => el.textContent);
const heroNow = () => page.evaluate(() => JSON.parse(JSON.stringify(window.gameState.rpg.hero)));
const chips = () => page.$$eval('#rpgEventBody .rpg-event-chip', els => els.map(e => e.textContent));

// -- Evento genérico: situación + 2 decisiones + resultado
await openEvent('pozo_deseos');
assert('Pisar un nodo 🎲 abre la vista de evento (y oculta el mapa)', await visible('#rpgEventView') && !(await visible('#rpgMapView')));
assert('El evento muestra título, situación y exactamente 2 decisiones A / B',
    (await eventText()).includes('El pozo de los deseos') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2
    && (await page.$$eval('.rpg-event-option-key', els => els.map(e => e.textContent).join(''))) === 'AB');
await page.screenshot({ path: shot('evento-decision'), fullPage: true });
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 100; h.maxHp = 999; h.atq = 10; });
await page.click('[data-rpg-event-opt="1"]');           // Desear poder: +1 ATK, -4 HP
await sleep(150);
assert('Tras elegir se ve el resultado, los cambios y un botón para continuar',
    !!(await page.$('#btnRpgEventContinue')) && (await chips()).join('|') === '+1 ATK|−4 HP');
const afterPozo = await heroNow();
assert('El héroe recibe el efecto: +1 ATK y −4 HP', afterPozo.atq === 11 && afterPozo.hp === 96);
await page.screenshot({ path: shot('evento-resultado'), fullPage: true });
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('Continuar devuelve al mapa con el evento como tu posición',
    await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);
assert('El diario cuenta lo ocurrido en el evento',
    (await page.$eval('#rpgLogContent', el => el.textContent)).includes('El pozo de los deseos'));
assert('El evento visto queda anotado y no se repetirá', await page.evaluate(() => window.gameState.rpg.usedEvents.includes('pozo_deseos')));

// -- La chica herida: ayudar = emboscada
await openEvent('chica_herida');
await page.click('[data-rpg-event-opt="0"]');
await sleep(150);
assert('Ayudar a la chica: se cuenta la emboscada y el botón es "A combatir"',
    (await eventText()).includes('emboscada') && (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('COMBATIR'));
const atqBefore = (await heroNow()).atq;
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('Se abre un combate contra el Jefe de los bandidos', await visible('#rpgCombatView')
    && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Jefe de los bandidos')
    && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Emboscada'));
assert('De un combate de evento no se puede huir', await page.$eval('[data-rpg-action="flee"]', el => el.disabled));
for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="attack"]');
    await sleep(40);
}
const resultText = await page.$eval('#rpgCombatResult', el => el.textContent);
assert('Ganar da el botín que promete el evento (+1 ATK)', resultText.includes('Victoria') && resultText.includes('botín') && resultText.includes('+1 ATK'));
assert('El héroe sube exactamente +1 ATK (no la recompensa estándar)', (await heroNow()).atq === atqBefore + 1);
await page.click('#btnRpgCombatContinue');
await sleep(200);
assert('Tras el combate de evento vuelves al mapa avanzando', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);

// -- El derrumbe: sin salida neutral, cambios visibles
await openEvent('derrumbe');
assert('El derrumbe tiene dos decisiones nombradas y ninguna es marcharse',
    (await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim())))
        .every(t => /Salvar a (Elena|Bram)/.test(t)));
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 100; h.maxHp = 200; });
await page.click('[data-rpg-event-opt="0"]');
await sleep(150);
assert('Salvar a Elena: −5 HP y +8 HP máx en pantalla', (await chips()).sort().join('|') === '+8 HP máx|−5 HP');
await page.click('#btnRpgEventContinue');
await sleep(150);

// -- El voto: héroe con etiquetas y menú de combate con la acción bloqueada
await openEvent('voto');
await page.click('[data-rpg-event-opt="1"]');            // Voto de Silencio
await sleep(120);
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('El panel del héroe muestra la etiqueta "Sin habilidades"',
    (await page.$eval('#rpgHeroPanel', el => el.textContent)).includes('Sin habilidades'));
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let sawLockedSkills = false;
for (let step = 0; step < 12 && !sawLockedSkills; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (!avail.length) break;
    await avail[0].click();
    await sleep(150);
    await takeLoot();
    if (await visible('#rpgCombatView')) {
        sawLockedSkills = await page.$eval('[data-rpg-action="skills"]', el => el.disabled);
        await finishCombat();
    } else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
}
assert('Con el Voto de Silencio el botón HABILIDADES está bloqueado en combate', sawLockedSkills);

// -- El puente de cuerdas: salto de piso
await openEvent('puente_cuerdas');
await page.evaluate(() => { window.__realRng = window.gameState.rpg.rng; window.gameState.rpg.rng = () => 0.1; }); // fuerza «el puente aguanta»
await page.click('[data-rpg-event-opt="0"]');
await sleep(120);
await page.evaluate(() => { window.gameState.rpg.rng = window.__realRng; });
await page.click('#btnRpgEventContinue');
await sleep(200);
const skipCheck = await page.evaluate(() => {
    const r = window.gameState.rpg;
    const cur = r.map.nodes.find(n => n.id === r.currentId);
    const avail = window.Engine.rpgAvailableNodes(r.map, r.currentId, r.skipNext).map(id => r.map.nodes.find(n => n.id === id).floor);
    return { skipNext: r.skipNext, curFloor: cur.floor, avail };
});
assert('El puente aguanta: el siguiente paso salta un piso', skipCheck.skipNext === true && skipCheck.avail.length > 0 && skipCheck.avail.every(f => f === skipCheck.curFloor + 2));
assert('En pantalla solo se pueden pisar nodos dos pisos por delante',
    (await page.$$eval('#rpgMap .rpg-node.is-available', els => els.length)) === skipCheck.avail.length);
await stepNode(await page.$('#rpgMap .rpg-node.is-available'));
assert('Tras usar el salto se vuelve a avanzar de piso en piso', await page.evaluate(() => window.gameState.rpg.skipNext === false));

// -- El Lector: 3 preguntas, dos respuestas cada una
await openEvent('lector');
await page.click('[data-rpg-event-opt="0"]');            // Plantarle cara
await sleep(100);
let asked = 0;
for (let i = 0; i < 3; i++) {
    const info = await page.evaluate(() => {
        const st = window.gameState.rpg.event.session.state;
        const q = st.qs[st.i];
        return { right: q.right, count: document.querySelectorAll('#rpgEventBody [data-rpg-event-opt]').length, text: document.getElementById('rpgEventBody').textContent, q: q.q };
    });
    if (info.count === 2 && info.text.includes(info.q) && info.text.includes(`Pregunta ${i + 1} de 3`)) asked++;
    if (i === 0) await page.screenshot({ path: shot('lector-pregunta'), fullPage: true });
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim().replace(/^[AB]/, '')));
    await page.click(`[data-rpg-event-opt="${opts.indexOf(info.right)}"]`);
    await sleep(100);
}
assert('El Lector plantea 3 preguntas, cada una con 2 respuestas', asked === 3);
assert('Con 3 aciertos se evita el combate: +2 ATK y +8 HP máx',
    !!(await page.$('#btnRpgEventContinue')) && (await eventText()).includes('Puedes pasar')
    && (await chips()).join('|') === '+2 ATK|+8 HP máx'
    && (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('CONTINUAR'));
await page.click('#btnRpgEventContinue');
await sleep(150);

// -- El Lector: fallar todo = combate contra un enemigo que lee tus movimientos
await openEvent('lector');
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 1; h.hp = h.maxHp = 9999; });
await page.click('[data-rpg-event-opt="0"]');
await sleep(100);
for (let i = 0; i < 3; i++) {
    const wrong = await page.evaluate(() => { const st = window.gameState.rpg.event.session.state; return st.qs[st.i].wrong; });
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim().replace(/^[AB]/, '')));
    await page.click(`[data-rpg-event-opt="${opts.indexOf(wrong)}"]`);
    await sleep(100);
}
assert('Fallar las 3 preguntas lleva a un combate', (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('COMBATIR'));
await page.click('#btnRpgEventContinue');
await sleep(200);
const lectorCard = await page.$eval('#rpgCombatMonster', el => el.textContent);
assert('El Lector aparece como "Enemigo inteligente" y avisa de que lee tus movimientos',
    lectorCard.includes('El Lector') && lectorCard.includes('Enemigo inteligente') && lectorCard.includes('Lee tus movimientos'));
await page.click('[data-rpg-action="attack"]');
await sleep(100);
assert('Tras atacar, recuerda ATACAR y avisa de que repetirla hace golpe doble',
    (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Recuerda ATACAR'));
await page.click('[data-rpg-action="attack"]');
await sleep(100);
assert('Repetir el ataque dispara el golpe doble en el registro',
    (await page.$eval('#rpgCombatLogContent', el => el.textContent)).includes('lee tus movimientos'));
await page.screenshot({ path: shot('combate-lector'), fullPage: true });
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; });
await finishCombat();

// ---------------------------------------------
async function walkTo(type) {
    await page.click('#btnRpgNewMap');
    await sleep(300);
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
    for (let step = 0; step < 25; step++) {
        const target = await page.$(`#rpgMap .rpg-node.type-${type}.is-available`);
        if (target) return target;
        const avail = await page.$$('#rpgMap .rpg-node.is-available');
        if (!avail.length) throw new Error('sin nodos disponibles');
        await stepNode(avail[0]);
    }
    throw new Error(`no se encontró un nodo ${type} en la ruta`);
}

console.log('\n🔥 Hoguera');
{
    const camp = await walkTo('campfire');
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 50; h.maxHp = 100; });
    await camp.click();
    await sleep(150);
    assert('Pisar una hoguera abre la vista de descanso con 2 decisiones', await visible('#rpgEventView')
        && (await eventText()).includes('Hoguera') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2);
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent));
    assert('Las opciones son Descansar (con la cura a la vista) y Equiparte', /Descansar.*30 %/.test(opts[0]) && /Equiparte/.test(opts[1]));
    await page.screenshot({ path: shot('hoguera'), fullPage: true });
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    assert('Descansar cura el 30 % de la vida máxima (+30 HP) y lo muestra', (await chips()).join('|') === '+30 HP' && (await heroNow()).hp === 80);
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('La hoguera queda como tu posición en el mapa', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-campfire')).length === 1);
    assert('La hoguera cuenta en la partida y no gasta ningún evento del catálogo',
        await page.evaluate(() => window.gameState.rpg.stats.campfires === 1 && !window.gameState.rpg.usedEvents.includes('hoguera')));

    const camp2 = await walkTo('campfire');
    await camp2.click();
    await sleep(150);
    await page.click('[data-rpg-event-opt="1"]');
    await sleep(150);
    assert('Equiparte no cambia nada por sí solo', (await chips()).length === 0);
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('…y abre el botín de la hoguera: 3 objetos, todos 🟢 o mejor',
        await visible('#rpgLootView') && (await page.$$('.rpg-loot-card')).length === 3
        && (await page.$$eval('.rpg-loot-card', els => els.every(e => e.dataset.rarity !== 'comun'))));
    await takeLoot();
    assert('Tras elegir vuelves al mapa con el objeto equipado', await visible('#rpgMapView')
        && await page.evaluate(() => Object.values(window.gameState.rpg.hero.equipment).filter(Boolean).length >= 2));
}

// Abre un combate concreto (héroe con 500 de vida y 1 de ATK) para probar la interfaz sin depender del mapa
async function showCombat(type, floor, heroHp = 500) {
    await page.evaluate(({ type, floor, heroHp }) => {
        const r = window.gameState.rpg;
        // Equipo limpio: el botín recogido en pasos anteriores no debe alterar estas pruebas deterministas
        r.hero.equipment = { weapon: window.Items.createStarterItem(), secondary: null, armor: null, accessory: null };
        r.hero.guard = 0; r.hero.skillMods = {};
        r.hero.hp = heroHp; r.hero.maxHp = Math.max(heroHp, r.hero.maxHp); r.hero.atq = 1;
        r.combat = window.Engine.createRpgCombat(r.hero, window.Engine.createRpgMonster(type, floor), r.rng);
        r.pendingNodeId = r.map.nodes[0].id; r.combatMenu = 'main';
        window.UI.toggleRpgView('rpgCombatView');
        window.UI.hideRpgCombatResult(); window.UI.clearRpgCombatLog();
        window.UI.renderRpgCombat(r.combat, { menu: 'main' });
    }, { type, floor, heroHp });
    await sleep(150);
}

console.log('\n👁️ Intenciones visibles');
{
    const intentText = () => page.$eval('#rpgCombatMonster .rpg-intent', el => el.textContent.replace(/\s+/g, ' ').trim());
    const hint = act => page.$eval(`[data-rpg-action="${act}"] .rpg-action-hint`, el => el.textContent);
    const heroHp = () => page.evaluate(() => window.gameState.rpg.hero.hp);

    // Orco (piso 8): carga y luego golpe fuerte
    await showCombat('monster', 7);
    assert('El Orco empieza «reuniendo fuerzas» (⚡) y no ataca', /Reúne fuerzas/.test(await intentText()) && (await page.$$('#rpgCombatMonster .rpg-intent.is-charge')).length === 1);
    assert('Si no va a atacar, la pista de Defender lo dice', /no te ataca/i.test(await hint('defend')));
    await page.click('[data-rpg-action="defend"]');
    await sleep(150);
    assert('Defenderte cuando no ataca no sirve de nada: no pierdes vida', await heroHp() === 500);
    assert('La siguiente intención es un GOLPE FUERTE (💥) con su daño a la vista',
        (await page.$$('#rpgCombatMonster .rpg-intent.is-heavy')).length === 1 && /Golpe fuerte/.test(await intentText()));
    const dmg = Number(await page.$eval('#rpgCombatMonster .rpg-intent-value', el => el.textContent));
    const shown = await hint('defend');
    assert('La pista de Defender calcula lo que recibirías: «Recibiría X en vez de Y»',
        new RegExp(`Recibiría ${Math.ceil(dmg / 2)} en vez de ${dmg}`).test(shown));
    await page.screenshot({ path: shot('combate-intencion'), fullPage: true });
    const before = await heroHp();
    await page.click('[data-rpg-action="defend"]');
    await sleep(150);
    assert('Defender ante el golpe fuerte lo reduce a la mitad, justo como anunciaba', before - (await heroHp()) === Math.ceil(dmg / 2));

    // Esqueleto (piso 6): se protege primero
    await showCombat('monster', 5);
    assert('El Esqueleto anuncia que SE PROTEGE (🛡️)', /Se protege/.test(await intentText()) && (await page.$$('#rpgCombatMonster .rpg-intent.is-guard')).length === 1);
    assert('La pista de Atacar avisa de que el daño se reducirá', /se protege/.test(await hint('attack')));
    await page.evaluate(() => { window.gameState.rpg.hero.atq = 6; window.UI.renderRpgCombat(window.gameState.rpg.combat, { menu: 'main' }); });
    const mhp = await page.evaluate(() => window.gameState.rpg.combat.monster.hp);
    await page.click('[data-rpg-action="attack"]');
    await sleep(150);
    assert('Atacar a un enemigo que se protege hace la mitad (6 → 3)', mhp - (await page.evaluate(() => window.gameState.rpg.combat.monster.hp)) === 3);
    assert('La intención es siempre visible mientras el combate sigue', (await page.$$('#rpgCombatMonster .rpg-intent')).length === 1);

    // Al terminar el combate la intención desaparece
    await page.evaluate(() => { window.gameState.rpg.hero.atq = 9999; });
    await page.click('[data-rpg-action="attack"]');
    await sleep(150);
    assert('Al vencer, la carta del enemigo ya no muestra intención', (await page.$$('#rpgCombatMonster .rpg-intent')).length === 0);
    // salir del combate ficticio
    await page.evaluate(() => { const r = window.gameState.rpg; r.combat = null; r.combatResult = null; window.UI.hideRpgCombatResult(); window.UI.toggleRpgView('rpgMapView'); });
}

console.log('\n🏁 Fin de partida');
{
    await page.click('#btnRpgNewMap');
    await sleep(300);
    const start = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, map: JSON.stringify(window.gameState.rpg.map) }));
    await page.evaluate(() => { window.gameState.rpg.hero.hp = 1; });
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) {
        await page.click('[data-rpg-action="attack"]');
        await sleep(40);
    }
    assert('Al caer, el panel de combate ofrece VER RESUMEN', (await page.$eval('#btnRpgCombatContinue', el => el.textContent)).includes('VER RESUMEN'));
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    const endText = await page.$eval('#rpgEndBody', el => el.textContent);
    assert('Aparece la pantalla de fin de partida (derrota)', await visible('#rpgEndView') && !(await visible('#rpgCombatView')) && endText.includes('Has caído') && endText.includes('💀'));
    assert('La derrota dice quién te ha vencido y en qué piso', endText.includes('Slime') && endText.includes('piso 1 de 15'));
    assert('La derrota incluye la línea de «casi» con el % de vida que le quedaba', /¡Casi!|aún conservaba/.test(endText) && /\d+ %/.test(endText));
    assert('El resumen muestra 6 datos: combates, eventos, hogueras, cofres, ATK y HP máx', (await page.$$('#rpgEndBody .rpg-end-stat')).length === 6);
    assert('Se muestra la semilla con su código (XXXX-XXX) y se puede copiar',
        /^[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(await page.$eval('#rpgEndSeed', el => el.textContent)) && !!(await page.$('#btnRpgCopySeed')));
    assert('Hay tres salidas: nueva ruta, repetir con la misma semilla e inicio',
        !!(await page.$('#btnRpgEndNew')) && !!(await page.$('#btnRpgEndRepeat')) && !!(await page.$('#btnRpgEndHome')));
    await page.screenshot({ path: shot('fin-derrota'), fullPage: true });

    await page.click('#btnRpgEndRepeat');
    await sleep(400);
    const again = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, map: JSON.stringify(window.gameState.rpg.map), atq: window.gameState.rpg.hero.atq, hp: window.gameState.rpg.hero.hp }));
    assert('REPETIR CON LA MISMA SEMILLA da el mismo mapa exacto y un héroe nuevo', await visible('#rpgMapView') && again.seed === start.seed && again.map === start.map && again.atq === 1 && again.hp === 25);

    await page.evaluate(() => { window.gameState.rpg.hero.hp = 1; });
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    await page.click('#btnRpgEndNew');
    await sleep(400);
    const fresh = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, atq: window.gameState.rpg.hero.atq }));
    assert('NUEVA RUTA empieza otra partida con otra semilla', await visible('#rpgMapView') && fresh.seed !== start.seed && fresh.atq === 1);
}

console.log('\n🌱 Semilla');
{
    await page.click('#btnRpgAbandon');
    await sleep(200);
    const mapOf = async text => {
        await page.fill('#rpgSeedInput', text);
        await page.click('#btnRpgStart');
        await sleep(300);
        const m = await page.evaluate(() => JSON.stringify(window.gameState.rpg.map));
        await page.click('#btnRpgAbandon');
        await sleep(200);
        return m;
    };
    const a1 = await mapOf('mi ruta secreta');
    const a2 = await mapOf('MI-RUTA  secreta');
    const b = await mapOf('otra ruta');
    assert('La misma semilla escrita a mano da siempre el mismo mapa (sin importar mayúsculas, espacios ni guiones)', a1 === a2);
    assert('Otra semilla da otro mapa', a1 !== b);
}

console.log('\n💾 Guardar y retomar');
{
    const goStart = async () => { await page.reload({ waitUntil: 'load' }); await sleep(500); };
    const seedText = () => page.evaluate(() => window.gameState.rpg.seed);
    await page.evaluate(() => localStorage.clear());
    await goStart();
    assert('Sin partida guardada no aparece el botón de continuar', !(await visible('#btnRpgContinue')));

    // 1) A mitad de un combate
    await page.click('#btnRpgStart');
    await sleep(300);
    const seed1 = await seedText();
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    await page.click('[data-rpg-action="attack"]');
    await sleep(150);
    const inFight = await page.evaluate(() => { const c = window.gameState.rpg.combat; return { mhp: c.monster.hp, hhp: window.gameState.rpg.hero.hp, intent: JSON.stringify(c.monster.intent), turn: c.turn, name: c.monster.name }; });
    await goStart();
    assert('Tras recargar, en el inicio aparece CONTINUAR con el piso, la vida y la semilla', await visible('#btnRpgContinue')
        && /CONTINUAR/.test(await page.$eval('#btnRpgContinue', el => el.textContent)) && /HP/.test(await page.$eval('#btnRpgContinue', el => el.textContent)));
    await page.click('#btnRpgContinue');
    await sleep(300);
    const restored = await page.evaluate(() => { const c = window.gameState.rpg.combat; return { mhp: c.monster.hp, hhp: window.gameState.rpg.hero.hp, intent: JSON.stringify(c.monster.intent), turn: c.turn, name: c.monster.name, seed: window.gameState.rpg.seed }; });
    assert('Retomas EN MEDIO DEL COMBATE: mismo enemigo, misma vida, misma ronda y la misma intención',
        await visible('#rpgCombatView') && restored.mhp === inFight.mhp && restored.hhp === inFight.hhp && restored.turn === inFight.turn
        && restored.intent === inFight.intent && restored.name === inFight.name && restored.seed === seed1);
    assert('El combate retomado se ve completo: intención y acciones disponibles',
        (await page.$$('#rpgCombatMonster .rpg-intent')).length === 1 && (await page.$$('#rpgCombatActions .rpg-action')).length === 4);
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(250);

    // 2) En el mapa
    const onMap = await page.evaluate(() => ({ cur: window.gameState.rpg.currentId, hp: window.gameState.rpg.hero.hp, atq: window.gameState.rpg.hero.atq, visited: window.gameState.rpg.visitedIds.length, mapJson: JSON.stringify(window.gameState.rpg.map) }));
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    const backOnMap = await page.evaluate(() => ({ cur: window.gameState.rpg.currentId, hp: window.gameState.rpg.hero.hp, atq: window.gameState.rpg.hero.atq, visited: window.gameState.rpg.visitedIds.length, mapJson: JSON.stringify(window.gameState.rpg.map) }));
    assert('Retomas EN EL MAPA: misma posición, mismo héroe, mismo recorrido y mismo mapa',
        await visible('#rpgMapView') && JSON.stringify(backOnMap) === JSON.stringify(onMap));
    assert('El nodo actual se ve marcado y los siguientes están disponibles', (await page.$$('#rpgMap .rpg-node.is-current')).length === 1 && (await page.$$('#rpgMap .rpg-node.is-available')).length >= 1);
    assert('El diario de la ruta se recupera', (await page.$$('#rpgLogContent .log-entry')).length >= 2);

    // 3) En medio de un evento (y con el resultado ya mostrado)
    await openEvent('pozo_deseos');
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas EN MEDIO DE UN EVENTO: la misma situación con sus 2 decisiones',
        await visible('#rpgEventView') && (await eventText()).includes('El pozo de los deseos') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2);
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    const chipsBefore = await chips();
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas con el RESULTADO del evento a la vista (mismos cambios y botón para seguir)',
        (await chips()).join('|') === chipsBefore.join('|') && !!(await page.$('#btnRpgEventContinue')));
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('Tras continuar vuelves al mapa sin haber repetido el evento', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);

    // 4) Evento con combate: se retoma el combate y, al ganar, se aplica el premio del evento una sola vez
    await openEvent('chica_herida');
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    await page.click('#btnRpgEventContinue');
    await sleep(250);
    const atqBeforeFight = (await heroNow()).atq;
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas un COMBATE DE EVENTO (los bandidos)', await visible('#rpgCombatView') && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Jefe de los bandidos'));
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas con el panel de VICTORIA a la vista, sin haber cobrado el premio dos veces',
        !!(await page.$('#btnRpgCombatContinue')) && (await heroNow()).atq === atqBeforeFight + 1);
    await page.click('#btnRpgCombatContinue');
    await sleep(250);

    // 5) Al terminar la partida, el guardado se borra
    await showCombat('monster', 5, 1); // héroe con 1 de vida contra un Esqueleto: caerá enseguida
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    assert('Al terminar la partida se borra el guardado', await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
    await goStart();
    assert('Tras una partida terminada no se ofrece continuar', !(await visible('#btnRpgContinue')));

    // 6) Guardados de otra versión, dañados o ausentes
    await page.evaluate(() => localStorage.setItem('easy-hero-save', JSON.stringify({ v: 999, hero: {} })));
    await goStart();
    assert('Un guardado de otra versión se descarta con un aviso y sin botón de continuar',
        !(await visible('#btnRpgContinue')) && /otra versión/.test(await page.$eval('#rpgStartNotice', el => el.textContent))
        && await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
    await page.evaluate(() => localStorage.setItem('easy-hero-save', '{esto no es json'));
    await goStart();
    assert('Un guardado dañado no rompe el juego: se descarta y se puede empezar de nuevo',
        !(await visible('#btnRpgContinue')) && await visible('#btnRpgStart'));
    await page.click('#btnRpgStart');
    await sleep(300);
    assert('Tras un guardado dañado se puede jugar con normalidad', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-available')).length === 6);

    // 7) Sin almacenamiento (modo privado)
    const blocked = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
    const blockedErrors = [];
    blocked.on('pageerror', e => blockedErrors.push(e.message));
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
    await blocked.goto(url, { waitUntil: 'load' });
    await sleep(500);
    await blocked.click('#btnRpgStart');
    await sleep(300);
    await (await blocked.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    assert('Con el almacenamiento bloqueado el juego sigue funcionando (sin guardar y sin errores)',
        await blocked.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none') && blockedErrors.length === 0);
    await blocked.context().close();
}

// -- Recorrido completo hasta el jefe pasando por todo tipo de nodos
console.log('\n🐉 Ruta completa hasta el jefe final (pasando por eventos y hogueras)');
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.click('#btnRpgStart');
await sleep(300);
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let ended = false;
let eventsCrossed = 0;
let campfiresCrossed = 0;
for (let step = 0; step < 45 && !ended; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (avail.length === 0) break;
    const pick = avail[0];
    const cls = await pick.evaluate(el => el.className);
    if (/type-event/.test(cls)) eventsCrossed++;
    if (/type-campfire/.test(cls)) campfiresCrossed++;
    await stepNode(pick);
    ended = await visible('#rpgEndView');
}
const winText = ended ? await page.$eval('#rpgEndBody', el => el.textContent) : '';
assert('Recorriendo la ruta (peleando y resolviendo eventos y hogueras) se vence al jefe y aparece la pantalla de VICTORIA',
    ended && winText.includes('¡Ruta completada!') && winText.includes('🏆'));
assert('Se cruzaron eventos y hogueras por el camino', eventsCrossed >= 1 && campfiresCrossed >= 1);
assert('El resumen de victoria cuenta lo vivido (eventos incluidos)', (await page.$$('#rpgEndBody .rpg-end-stat')).length === 6 && /Eventos vividos/.test(winText));
assert('Una victoria no muestra la línea de «casi»', !(await page.$('#rpgEndBody .rpg-end-almost')));
assert('Al ganar no queda nada guardado', await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
await page.screenshot({ path: shot('fin-victoria'), fullPage: true });

await page.click('#btnRpgEndHome');
await sleep(200);
assert('INICIO devuelve a la carta del héroe', await page.$eval('#rpgStartView', el => getComputedStyle(el).display !== 'none'));
assert('Sin errores de página durante toda la partida', pageErrors.length === 0);
if (pageErrors.length) console.log('     ', pageErrors.slice(0, 3));

const xss = await page.evaluate(() => window.UI.esc('<script>alert("x")</script>'));
assert('esc() neutraliza HTML', xss.includes('&lt;') && !xss.includes('<script>'));
assert('Un evento con texto hostil no inyecta HTML', await page.evaluate(() => {
    window.UI.renderRpgEventScreen({ icon: '🎲', title: '<img src=x onerror=window.__pwned=1>', text: '<b>hola</b>', options: ['<i>a</i>', 'b'] });
    return !window.__pwned && !document.querySelector('#rpgEventBody img') && !document.querySelector('#rpgEventBody b');
}));

// ---------------------------------------------
console.log('\n📱 Móvil (390 × 844)');
{
    const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    const mobileErrors = [];
    mobile.on('pageerror', e => mobileErrors.push(e.message));
    await mobile.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(500);
    await mobile.click('#btnRpgStart');
    await sleep(2000); // la animación de entrada de los nodos dura hasta ~1,6 s
    assert('El mapa de 7 columnas cabe en el móvil sin scroll horizontal',
        !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    const boxes = await mobile.$$eval('#rpgMap .rpg-node', els => els.map(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w * 0.9 && b.x < a.x + a.w * 0.9 && a.y < b.y + b.h * 0.9 && b.y < a.y + a.h * 0.9) overlaps++;
    }
    assert('En el móvil los nodos no se solapan entre sí', overlaps === 0);
    assert('En el móvil los nodos son pulsables (≥ 34 px)', boxes.every(b => b.w >= 34));
    await mobile.screenshot({ path: shot('mapa-movil'), fullPage: true });
    await mobile.evaluate(() => {
        window.gameState.rpg.usedEvents = window.Events.RPG_EVENTS.map(e => e.id).filter(id => id !== 'juicio_hermanas');
        window.gameState.rpg.hero.atq = 999;
    });
    // El primer nodo de evento del piso 1 puede no estar disponible: se abre la vista directamente
    await mobile.evaluate(() => {
        const r = window.gameState.rpg;
        const node = r.map.nodes.find(n => n.type === 'event');
        r.currentId = null;
        window.UI.toggleRpgView('rpgEventView');
        const session = window.Events.startRpgEvent('juicio_hermanas', Math.random, node.floor);
        r.event = { node, session, result: null };
        window.UI.renderRpgEventScreen(window.Events.rpgEventScreen(session));
    });
    await sleep(200);
    assert('En el móvil el evento cabe sin scroll horizontal', !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await mobile.screenshot({ path: shot('evento-movil'), fullPage: true });
    assert('Sin errores de página en el móvil', mobileErrors.length === 0);
    await mobile.context().close();
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
