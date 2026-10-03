// =============================================
// 📜 Misiones: NPC por colores (amarillo habla, azul misión, gris cumplida), el diario con la principal y las
// secundarias (las cumplidas tachadas), misiones de contar (los lobos de Hilda, los goblins de Odo) y de traer algo
// (el colmillo de Feronius para Bram).
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { questLog, npcQuestMark, questStatus, countingCreatures } from '../src/quests.js';
import { QUESTS_BY_ID } from '../src/data/quests.js';

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('\n📜 Misiones (datos y reglas)');
{
    const fresh = { flags: {}, counts: {} };
    assert('Al empezar solo está la misión principal: «Descubre quién eres»',
        questLog(fresh).map(x => x.quest.id).join() === 'quien-soy');
    assert('La posada (Evelyn), Bram, Amelie, Odo e Hilda salen en azul (tienen misión); quien no tiene, en amarillo',
        ['posada', 'herrero', 'boticaria', 'odo', 'hilda'].every(id => npcQuestMark(id, fresh) === 'quest') && npcQuestMark('nell', fresh) === 'talk');
    const lobos = { flags: { 'lobos-hilda:aceptada': true }, counts: { 'lobo-de-zafias': 3 } };
    const d = questLog(lobos).find(x => x.quest.id === 'lobos-hilda');
    assert('Aceptada la de Hilda, cuenta los lobos: 3/4', d && d.status === 'active' && d.steps[0].progress.have === 3 && d.steps[0].progress.need === 4);
    assert('Mientras está en marcha, los lobos cuentan', countingCreatures(lobos).has('lobo-de-zafias') && !countingCreatures(fresh).has('lobo-de-zafias'));
    const odo = { flags: { 'goblins-odo:aceptada': true }, counts: { goblin: 6 } };
    assert('La de Odo cuenta goblins (por familia) y con seis su primer paso queda hecho',
        countingCreatures(odo).has('goblin') && questLog(odo).find(x => x.quest.id === 'goblins-odo').steps[0].done);
    // Misiones de traer algo: miran lo que llevas encima (state.items)
    const colmillo = { flags: { 'colmillo:aceptada': true }, counts: {}, items: {} };
    const c0 = questLog(colmillo).find(x => x.quest.id === 'colmillo');
    const c1 = questLog({ ...colmillo, items: { 'colmillo-feronius': 1 } }).find(x => x.quest.id === 'colmillo');
    assert('La de Bram pide el colmillo de Feronius: 0/1 sin él y hecho (1/1) al llevarlo encima',
        c0.steps[0].progress.have === 0 && !c0.steps[0].done && c1.steps[0].progress.have === 1 && c1.steps[0].done && !c1.steps[1].done);
    const plantas = questLog({ flags: { 'plantas:aceptada': true }, counts: {}, items: { 'planta-medicinal': 2 } }).find(x => x.quest.id === 'plantas');
    assert('La de Amelie pide tres plantas: con dos, 2/3', plantas.steps[0].progress.have === 2 && plantas.steps[0].progress.need === 3 && !plantas.steps[0].done);
    assert('La misión de los dientes de lobo ya no existe', !QUESTS_BY_ID.dientes);
    const doneState = { flags: { 'colmillo:aceptada': true, 'colmillo:cumplida': true }, counts: {}, items: {} };
    assert('Cumplida: estado «done», todos sus pasos tachados (aunque ya no lleves el colmillo) y Bram en gris',
        questStatus(QUESTS_BY_ID.colmillo, doneState) === 'done' && questLog(doneState).find(x => x.quest.id === 'colmillo').steps.every(st => st.done)
        && npcQuestMark('herrero', doneState) === 'done');
}

// --- En el navegador ---
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
    try { const body = fs.readFileSync(filePath); res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const shown = sel => page.$eval(sel, el => !el.hidden && getComputedStyle(el).display !== 'none').catch(() => false);
const talkAll = async () => { for (let i = 0; i < 10 && await shown('.adv-dialogue'); i++) { await page.click('.adv-dialogue-next'); await sleep(60); } };
const stopClass = id => page.$eval(`.adv-stop[data-point="${id}"]`, el => el.className);
const openQuests = async () => { await page.click('.adv-quests'); await sleep(200); return page.$eval('#panelBody', el => el.innerHTML); };

console.log('\n📜 Misiones en la aventura');
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.evaluate(() => {
    window.gameMeta.introSeen = true; window.gameMeta.primary = { str: 60, dex: 0, int: 0, vit: 60 };
    localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    localStorage.removeItem('easy-hero-adventure');
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
const leaveMenu = async () => { if (await shown('.adv-menu')) { await page.click('.adv-menu [data-menu="leave"]'); await sleep(120); } };
const goldNow = () => page.evaluate(() => window.gameMeta.gold);
assert('En la aldea, la posada, Bram y Amelie (con misión) salen en azul',
    /is-quest/.test(await stopClass('posada')) && /is-quest/.test(await stopClass('herrero')) && /is-quest/.test(await stopClass('boticaria')));
let html = await openQuests();
assert('El diario muestra la misión principal «Descubre quién eres» y aún ninguna secundaria',
    /Misión principal/.test(html) && /Descubre quién eres/.test(html) && !/colmillo/i.test(html));
await page.click('#btnPanelClose');
await sleep(150);

await page.click('.adv-stop[data-point="herrero"]', { force: true });
await sleep(250);
await talkAll();
await sleep(150);
assert('Hablar con Bram da una misión nueva: aviso y el botón del diario se ilumina',
    /Nueva misión: El colmillo de Feronius/.test(await page.$eval('.adv-toast', el => el.textContent)) && /is-new/.test(await page.$eval('.adv-quests', el => el.className)));
assert('…y al terminar de hablar pregunta: Comprar, Mejorar o Salir',
    (await page.$$eval('.adv-menu [data-menu]', els => els.map(e => e.textContent.trim()).join('|'))) === 'Comprar|Mejorar|Salir');
await leaveMenu();
html = await openQuests();
assert('El diario la muestra en secundarias, con su progreso 0/1', /Misiones secundarias/.test(html) && /El colmillo de Feronius/.test(html) && /0\/1/.test(html));
await page.click('#btnPanelClose');
await sleep(150);

// Las casas del camino: Hilda (lobos), Odo (goblins) y Nell
await page.click('.adv-stop[data-point="a-las-casas"]', { force: true });
await sleep(300);
assert('El camino del este lleva a las casas, con su propio cuadro', (await page.$eval('.adv-viewport', el => el.dataset.scene)) === 'casas'
    && /zafias-casas/.test(await page.$eval('.adv-world > img', el => el.src)));
assert('Allí viven tres vecinos: Odo e Hilda con misión (azul) y Nell, que solo habla (amarillo)',
    /is-quest/.test(await stopClass('odo')) && /is-quest/.test(await stopClass('hilda')) && /is-talk/.test(await stopClass('nell')));
await page.click('.adv-stop[data-point="hilda"]', { force: true });
await sleep(250);
await talkAll();
assert('Hilda da la misión «Los lobos del arroyo»', /Nueva misión: Los lobos del arroyo/.test(await page.$eval('.adv-toast', el => el.textContent)));
await page.click('.adv-stop[data-point="nell"]', { force: true });
await sleep(250);
await talkAll();
assert('Nell te da una hogaza de pan', (await page.evaluate(() => window.gameMeta.food.pan)) === 1);
await page.click('.adv-stop[data-point="nell"]', { force: true });
await sleep(250);
await talkAll();
assert('…una sola vez', (await page.evaluate(() => window.gameMeta.food.pan)) === 1);
await page.click('.adv-stop[data-point="odo"]', { force: true });
await sleep(250);
await talkAll();
await sleep(250);
assert('Odo da la misión «Seis goblins menos» y, al terminar de hablar, abre sus lecciones: las mejoras permanentes',
    await shown('#rpgShopView') && /Odo/.test(await page.$eval('#rpgShopView .char-title', el => el.textContent))
    && (await page.$$eval('#shopBody [data-shop-buy]', els => els.map(e => e.dataset.shopBuy).join())) === 'filo,constitucion,buen_ojo,estudio'
    && !(await page.$('#shopBody [data-shop-tab]')));
await page.click('#btnShopBack');
await sleep(300);
assert('Al salir de las lecciones sigues en las casas', (await page.$eval('.adv-viewport', el => el.dataset.scene)) === 'casas');
html = await openQuests();
assert('El diario lleva las tres secundarias en marcha, cada una con su cuenta', /Los lobos del arroyo/.test(html) && /Seis goblins menos/.test(html) && /0\/4/.test(html) && /0\/6/.test(html));
await page.click('#btnPanelClose');
await sleep(150);

// Un lobo y un goblin de verdad, y el resto de las cuentas a mano (los enemigos reaparecen al dormir)
const win = async () => {
    await talkAll();
    for (let i = 0; i < 80 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(25); }
    await page.click('#btnRpgCombatContinue');
    await sleep(300);
};
await page.click('.adv-stop[data-point="a-la-aldea-desde-casas"]', { force: true });
await sleep(300);
// Por el sendero del sur se llega al lobo sin cruzar goblins
await page.click('.adv-stop[data-point="al-bosque-sur"]', { force: true });
await sleep(300);
await page.click('.adv-stop[data-point="lobo-sendero"]', { force: true });
await sleep(300);
await win();
let counts = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')).counts);
assert('Vencer a un lobo con la misión de Hilda en marcha suma uno (y ningún goblin)', counts['lobo-de-zafias'] === 1 && !counts.goblin);
await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('easy-hero-adventure')); st.scene = 'bosque'; localStorage.setItem('easy-hero-adventure', JSON.stringify(st)); });
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.click('.adv-stop[data-point="goblin-1"]', { force: true });
await sleep(300);
await win();
counts = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')).counts);
assert('Vencer a un goblin con la misión de Odo en marcha suma uno', counts.goblin === 1 && counts['lobo-de-zafias'] === 1);
await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('easy-hero-adventure'));
    st.counts['lobo-de-zafias'] = 4; st.counts.goblin = 6; st.scene = 'casas';
    localStorage.setItem('easy-hero-adventure', JSON.stringify(st));
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
let g = await goldNow();
const xp0 = await page.evaluate(() => ({ xp: window.gameMeta.xp, lvl: window.gameMeta.charLevel }));
await page.click('.adv-stop[data-point="hilda"]', { force: true });
await sleep(250);
await talkAll();
const xp1 = await page.evaluate(() => ({ xp: window.gameMeta.xp, lvl: window.gameMeta.charLevel }));
assert('Con cuatro lobos, Hilda paga oro (+45) y experiencia, y la misión se cumple', (await goldNow()) === g + 45
    && (xp1.lvl > xp0.lvl || xp1.xp > xp0.xp) && /Misión cumplida: Los lobos del arroyo/.test(await page.$eval('.adv-toast', el => el.textContent)));
assert('…y su punto pasa de azul a gris', /is-cleared/.test(await stopClass('hilda')) && !/is-quest/.test(await stopClass('hilda')));
g = await goldNow();
await page.click('.adv-stop[data-point="odo"]', { force: true });
await sleep(250);
await talkAll();
await sleep(250);
assert('Con seis goblins, Odo paga (+50 de oro)', (await goldNow()) === g + 50);
await page.click('#btnShopBack');
await sleep(300);

// El colmillo de Feronius (aquí se pone en la mochila a mano: cómo cae se prueba en loot.test.mjs)
await page.evaluate(() => {
    window.gameMeta.materials = { ...(window.gameMeta.materials || {}), 'colmillo-feronius': 1 };
    localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    const st = JSON.parse(localStorage.getItem('easy-hero-adventure')); st.scene = 'aldea';
    localStorage.setItem('easy-hero-adventure', JSON.stringify(st));
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
html = await openQuests();
assert('Con el colmillo en la mochila, el diario marca 1/1 y pide llevárselo a Bram', /1\/1/.test(html) && /Llévaselo a Bram/.test(html));
await page.click('#btnPanelClose');
await sleep(150);
const goldBefore = await goldNow();
await page.click('.adv-stop[data-point="herrero"]', { force: true });
await sleep(250);
await talkAll();
await sleep(150);
assert('Bram se queda el colmillo, paga (+30 de oro) y la misión se cumple', (await goldNow()) === goldBefore + 30
    && (await page.evaluate(() => window.gameMeta.materials['colmillo-feronius'])) === 0
    && /Nuevo objeto: Espada de Zafias|Misión cumplida: El colmillo de Feronius/.test(await page.$eval('.adv-toast', el => el.textContent)));
await leaveMenu();
assert('…y su punto pasa de azul a gris', /is-cleared/.test(await stopClass('herrero')) && !/is-quest/.test(await stopClass('herrero')));
html = await openQuests();
assert('En el diario la misión cumplida sale tachada (y debajo de las que siguen en marcha)', /quest is-done[\s\S]*El colmillo de Feronius/.test(html));
await page.click('#btnPanelClose');

console.log('\n🎒 La Espada de Zafias y el inventario');
const advMeta = () => page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
let mm = await advMeta();
assert('Bram da la Espada de Zafias: entra en el inventario y el botón se ilumina',
    mm.advGear.includes('espada-de-zafias') && /is-new/.test(await page.$eval('.adv-inventory', el => el.className)));
await page.click('.adv-inventory');
await sleep(200);
assert('El inventario lista la espada de hierro (equipada), la Espada de Zafias y tu armadura',
    (await page.$$eval('.inv-rows:first-of-type [data-inv-item]', els => els.map(e => e.dataset.invItem).join())) === 'espada-de-hierro,espada-de-zafias,armadura-de-acero'
    && /is-equipped/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.className)) && !!(await page.$('[data-inv-item="espada-de-hierro"] .inv-check')));
await page.click('[data-inv-item="espada-de-zafias"]');
await sleep(150);
assert('Su ficha muestra ATK 3, de dónde sale y la espada tal cual es', /ATK 3/.test(await page.$eval('.inv-detail', el => el.textContent))
    && /objeto-espada-de-zafias/.test(await page.$eval('.inv-preview', el => el.src)));
await page.click('[data-inv-tab="preview"]');
await page.waitForFunction(() => { const i = document.querySelector('.inv-preview'); return i && i.dataset.weapon && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
assert('…y en «Vista previa», al héroe con ella en la mano (antes de equiparla)', await page.$eval('.inv-preview', el => el.dataset.weapon === 'espada-de-zafias' && el.dataset.armor === 'acero' && el.naturalWidth > 0));
await page.click('[data-inv-equip="espada-de-zafias"]');
await sleep(200);
mm = await advMeta();
assert('Equiparla la guarda y la marca como equipada', mm.advWeapon === 'espada-de-zafias'
    && /is-equipped/.test(await page.$eval('[data-inv-item="espada-de-zafias"]', el => el.className))
    && !/is-equipped/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.className)));
await page.click('#btnPanelClose');
await sleep(150);
await page.waitForFunction(() => document.querySelector('.adv-hero').dataset.weapon === 'espada-de-zafias', null, { timeout: 5000 }).catch(() => {});
assert('En el mapa, el héroe cambia de dibujo: lleva la Espada de Zafias', await page.$eval('.adv-hero', el => el.dataset.weapon === 'espada-de-zafias' && el.naturalWidth > 0));
// El lobo del sendero ya cayó antes: vuelve a los caminos (como al dormir) para pelear con la espada nueva
await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('easy-hero-adventure')); st.gone = {}; st.scene = 'bosque'; localStorage.setItem('easy-hero-adventure', JSON.stringify(st)); });
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.click('.adv-stop[data-point="lobo-sendero"]', { force: true });
await sleep(300);
await talkAll();
await page.waitForFunction(() => document.querySelector('#rpgActorHero > img').dataset.weapon === 'espada-de-zafias', null, { timeout: 5000 }).catch(() => {});
assert('En el combate también: el héroe sale con la Espada de Zafias', await page.$eval('#rpgActorHero > img', el => el.dataset.weapon === 'espada-de-zafias' && el.naturalWidth > 0));
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.waitForFunction(() => document.querySelector('.adv-hero').dataset.weapon === 'espada-de-zafias', null, { timeout: 5000 }).catch(() => {});
assert('Tras recargar sigue equipada (el equipo de la aventura es permanente)', await page.$eval('.adv-hero', el => el.dataset.weapon === 'espada-de-zafias'));

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
