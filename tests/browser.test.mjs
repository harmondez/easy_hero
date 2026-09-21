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

await page.click('[data-rpg-action="defend"]');
await sleep(150);
assert('Defender queda anotado',
    (await page.$$eval('#rpgCombatLogContent .log-entry', els => els.map(e => e.textContent).join('|'))).includes('se defiende'));

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
assert('El héroe se hizo más fuerte', await page.evaluate(() =>
    window.gameState.rpg.hero.atq === 2 && window.gameState.rpg.hero.level === 2));

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
async function stepNode(node) {
    await node.click();
    await sleep(100);
    if (await visible('#rpgCombatView')) await finishCombat();
    else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
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
const chips = () => page.$$eval('.rpg-event-chip', els => els.map(e => e.textContent));

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
    if (await visible('#rpgCombatView')) {
        sawLockedSkills = await page.$eval('[data-rpg-action="skills"]', el => el.disabled);
        await finishCombat();
    } else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
}
assert('Con el Voto de Silencio el botón HABILIDADES está bloqueado en combate', sawLockedSkills);

// -- El puente de cuerdas: salto de piso
await openEvent('puente_cuerdas');
await page.evaluate(() => { window.__realRandom = Math.random; Math.random = () => 0.1; });
await page.click('[data-rpg-event-opt="0"]');
await sleep(120);
await page.evaluate(() => { Math.random = window.__realRandom; });
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

// -- Recorrido completo hasta el jefe pasando por todo tipo de nodos
console.log('\n🐉 Ruta completa hasta el jefe final (pasando por los eventos)');
await page.click('#btnRpgNewMap');
await sleep(300);
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let reachedBoss = false;
let eventsCrossed = 0;
for (let step = 0; step < 40 && !reachedBoss; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (avail.length === 0) break;
    const pick = avail[0];
    if (await pick.evaluate(el => el.classList.contains('type-event'))) eventsCrossed++;
    await stepNode(pick);
    reachedBoss = (await page.$$('#rpgMap .type-boss.is-current')).length === 1;
}
assert('Recorriendo la ruta (peleando y resolviendo eventos) se llega al jefe final', reachedBoss);
assert('Por el camino se cruzaron eventos', eventsCrossed >= 1);
assert('Tras el jefe final no queda nada por pisar', (await page.$$('#rpgMap .rpg-node.is-available')).length === 0);
assert('El diario registró el recorrido', (await page.$$('#rpgLogContent .log-entry')).length >= 8);
await page.screenshot({ path: shot('mapa-completado'), fullPage: true });

await page.click('#btnRpgAbandon');
await sleep(200);
assert('Abandonar la ruta devuelve a la carta del héroe',
    await page.$eval('#rpgStartView', el => getComputedStyle(el).display !== 'none'));
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
