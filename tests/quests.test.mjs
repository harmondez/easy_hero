// =============================================
// 📜 Misiones: NPC por colores (amarillo habla, azul misión, gris cumplida), el diario con la principal y las
// secundarias (las cumplidas tachadas) y una misión de contar: los dientes de lobo de Bram.
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
    assert('Maela y Bram salen en azul (tienen misión); quien no tiene, en amarillo',
        npcQuestMark('posadera', fresh) === 'quest' && npcQuestMark('herrero', fresh) === 'quest' && npcQuestMark('nadie', fresh) === 'talk');
    const dientes = { flags: { 'dientes:aceptada': true }, counts: { 'lobo-de-zafias': 3 } };
    const d = questLog(dientes).find(x => x.quest.id === 'dientes');
    assert('Aceptada la de Bram, cuenta los lobos: 3/5', d && d.status === 'active' && d.steps[0].progress.have === 3 && d.steps[0].progress.need === 5);
    assert('Mientras está en marcha, los lobos cuentan', countingCreatures(dientes).has('lobo-de-zafias') && !countingCreatures(fresh).has('lobo-de-zafias'));
    const doneState = { flags: { 'dientes:aceptada': true, 'dientes:cumplida': true }, counts: { 'lobo-de-zafias': 5 } };
    assert('Cumplida: estado «done», todos sus pasos tachados y Bram en gris',
        questStatus(QUESTS_BY_ID.dientes, doneState) === 'done' && questLog(doneState).find(x => x.quest.id === 'dientes').steps.every(s => s.done)
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
assert('En la aldea, Maela y Bram (con misión) salen en azul', /is-quest/.test(await stopClass('posadera')) && /is-quest/.test(await stopClass('herrero')));
let html = await openQuests();
assert('El diario muestra la misión principal «Descubre quién eres» y aún ninguna secundaria',
    /Misión principal/.test(html) && /Descubre quién eres/.test(html) && !/Dientes de lobo/.test(html));
await page.click('#btnPanelClose');
await sleep(150);

await page.click('.adv-stop[data-point="herrero"]', { force: true });
await sleep(250);
await talkAll();
assert('Hablar con Bram da una misión nueva: aviso y el botón del diario se ilumina',
    /Nueva misión: Dientes de lobo/.test(await page.$eval('.adv-toast', el => el.textContent)) && /is-new/.test(await page.$eval('.adv-quests', el => el.className)));
html = await openQuests();
assert('El diario la muestra en secundarias, con su progreso 0/5', /Misiones secundarias/.test(html) && /Dientes de lobo/.test(html) && /0\/5/.test(html));
await page.click('#btnPanelClose');
await sleep(150);

// Cinco lobos (los de la aventura reaparecen al dormir: aquí se ponen las cuentas a mano tras vencer a uno de verdad)
// Por el sendero del sur se llega al lobo sin cruzar goblins
await page.click('.adv-stop[data-point="al-bosque-sur"]', { force: true });
await sleep(300);
await page.click('.adv-stop[data-point="lobo-sendero"]', { force: true });
await sleep(300);
await talkAll();
for (let i = 0; i < 80 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(25); }
await page.click('#btnRpgCombatContinue');
await sleep(300);
const counted = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')).counts['lobo-de-zafias']);
assert('Vencer a un lobo con la misión en marcha suma un diente', counted === 1);
await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('easy-hero-adventure'));
    s.counts['lobo-de-zafias'] = 5; s.scene = 'aldea';
    localStorage.setItem('easy-hero-adventure', JSON.stringify(s));
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
const goldBefore = await page.evaluate(() => window.gameMeta.gold);
await page.click('.adv-stop[data-point="herrero"]', { force: true });
await sleep(250);
await talkAll();
assert('Con cinco dientes, Bram paga (+30 de oro) y la misión se cumple', (await page.evaluate(() => window.gameMeta.gold)) === goldBefore + 30
    && /Misión cumplida: Dientes de lobo/.test(await page.$eval('.adv-toast', el => el.textContent)));
assert('…y su punto pasa de azul a gris', /is-cleared/.test(await stopClass('herrero')) && !/is-quest/.test(await stopClass('herrero')));
html = await openQuests();
assert('En el diario la misión cumplida sale tachada (y debajo de las que siguen en marcha)', /quest is-done[\s\S]*Dientes de lobo/.test(html));
await page.click('#btnPanelClose');

console.log('\n🎒 La Espada de Zafias y el inventario');
const advMeta = () => page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
let mm = await advMeta();
assert('Bram da la Espada de Zafias: entra en el inventario y el botón se ilumina',
    mm.advGear.includes('espada-de-zafias') && /is-new/.test(await page.$eval('.adv-inventory', el => el.className)));
await page.click('.adv-inventory');
await sleep(200);
assert('El inventario lista la espada de hierro (equipada) y la Espada de Zafias',
    (await page.$$('.inv-rows:first-of-type [data-inv-item]')).length === 2
    && /is-equipped/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.className)) && !!(await page.$('[data-inv-item="espada-de-hierro"] .inv-check')));
await page.click('[data-inv-item="espada-de-zafias"]');
await sleep(150);
assert('Su ficha muestra ATK 2, de dónde sale y la espada tal cual es', /ATK 2/.test(await page.$eval('.inv-detail', el => el.textContent))
    && /objeto-espada-de-zafias/.test(await page.$eval('.inv-preview', el => el.src)));
await page.click('[data-inv-tab="preview"]');
await sleep(100);
assert('…y en «Vista previa», al héroe con ella', /arma_espada-de-zafias/.test(await page.$eval('.inv-preview', el => el.src)));
await page.click('[data-inv-equip="espada-de-zafias"]');
await sleep(200);
mm = await advMeta();
assert('Equiparla la guarda y la marca como equipada', mm.advWeapon === 'espada-de-zafias'
    && /is-equipped/.test(await page.$eval('[data-inv-item="espada-de-zafias"]', el => el.className))
    && !/is-equipped/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.className)));
await page.click('#btnPanelClose');
await sleep(150);
assert('En el mapa, el héroe cambia de dibujo: lleva la Espada de Zafias', /arma_espada-de-zafias/.test(await page.$eval('.adv-hero', el => el.src)));
// El lobo del sendero ya cayó antes: vuelve a los caminos (como al dormir) para pelear con la espada nueva
await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('easy-hero-adventure')); st.gone = {}; st.scene = 'bosque'; localStorage.setItem('easy-hero-adventure', JSON.stringify(st)); });
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.click('.adv-stop[data-point="sendero-aldea"]', { force: true });
await sleep(300);
await page.click('.adv-stop[data-point="lobo-sendero"]', { force: true });
await sleep(300);
await talkAll();
assert('En el combate también: el héroe sale con la Espada de Zafias', /arma_espada-de-zafias/.test(await page.$eval('#rpgActorHero img', el => el.src)));
await page.reload({ waitUntil: 'load' });
await sleep(500);
assert('Tras recargar sigue equipada (el equipo de la aventura es permanente)', /arma_espada-de-zafias/.test(await page.$eval('.adv-hero', el => el.src)));

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
