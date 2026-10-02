// =============================================
// 🧭 El final de Zafias jugado de verdad en el navegador: campamento → Grask → botín → la guarida del lobo →
// Feronius (el jefe de la zona) → Maela. Con un héroe ya fuerte, para que el combate no sea lo que se prueba.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try { const body = fs.readFileSync(filePath); res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
// ?inicio: la pantalla de la mazmorra como antes (sin introducción ni entrada directa a la aventura)
const url = `http://127.0.0.1:${server.address().port}/index.html?inicio`;

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const scene = () => page.$eval('.adv-viewport', el => el.dataset.scene);
const hud = () => page.$eval('.adv-hud', el => el.textContent);
const gold = async () => Number((await hud()).match(/🪙 (\d+)/)[1]);
const potions = async () => Number((await hud()).match(/🧪 (\d+)/)[1]);
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
const stop = id => page.$(`.adv-stop[data-point="${id}"]`);
/** Pasa los diálogos y, si hay combate, ataca hasta el final y vuelve a la aventura. Devuelve el nombre del enemigo. */
async function playOut() {
    for (let i = 0; i < 10 && !(await page.$eval('.adv-dialogue', el => el.hidden)); i++) { await page.click('.adv-dialogue-next'); await sleep(60); }
    await sleep(150);
    if (!(await page.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none'))) return null;
    const info = await page.evaluate(() => ({ name: document.querySelector('#rpgCombatTitle').textContent, src: document.querySelector('#rpgActorMonster img').src }));
    for (let i = 0; i < 120 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(25); }
    info.won = /Victoria/i.test(await page.$eval('#rpgCombatResult', el => el.textContent));
    await page.click('#btnRpgCombatContinue');
    await sleep(250);
    return info;
}
async function prepare(advState) {
    await page.evaluate(s => {
        // Un héroe veterano: muchos puntos de fuerza y vitalidad (el equilibrio lo mide tests/adventure-sim.mjs)
        window.gameMeta.primary = { str: 60, dex: 0, int: 0, vit: 60 };
        window.gameMeta.gold = 0; window.gameMeta.potions = 0;
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify(s));
    }, advState);
    await page.reload({ waitUntil: 'load' });
    await sleep(300);
    await page.click('#btnRpgAdventure');
    await sleep(400);
}

console.log('\n🧭 Zafias de principio a fin: campamento, Grask, la guarida y Feronius');
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await sleep(300);
const goblins = { misionAceptada: true, 'defeated:goblin-1': true, 'defeated:goblin-2': true, 'defeated:goblin-3': true };
await prepare({ v: 1, scene: 'campamento', hp: null, gone: {}, flags: goblins });

assert('Empieza en el campamento: Grask no está hasta vencer a su guardia, ni la salida a la guarida',
    (await scene()) === 'campamento' && !(await stop('grask')) && !!(await stop('guardia')) && !(await stop('a-la-guarida')) && !(await stop('botin')));
await page.click('.adv-stop[data-point="guardia"]', { force: true });
await sleep(250);
const guard = await playOut();
assert('El goblin de guardia grita, pelea y cae', !!guard && guard.won);
assert('Vencida la guardia, aparece Grask', !!(await stop('grask')));

await page.click('.adv-stop[data-point="grask"]', { force: true });
await sleep(250);
const grask = await playOut();
assert('Grask pelea con su dibujo propio y cae', !!grask && grask.won && /enemigo_grask/.test(grask.src));
assert('La misión pide volver con Maela', /Vuelve con Maela/.test(await hud()));
assert('Vencido Grask aparecen su botín y la bajada a la guarida del lobo', !!(await stop('botin')) && !!(await stop('a-la-guarida')));
assert('La misión ya apunta al jefe de la zona («algo aúlla al sureste»)', /aúlla/.test(await hud()));
const inView = await page.evaluate(() => {
    const v = document.querySelector('.adv-viewport').getBoundingClientRect();
    const l = document.querySelector('.adv-stop[data-point="a-la-guarida"] .adv-stop-label').getBoundingClientRect();
    return l.left >= v.left - 1 && l.right <= v.right + 1 && l.top >= v.top - 1 && l.bottom <= v.bottom + 1;
});
assert('La salida a la guarida se ve siempre: si cae fuera de la pantalla, espera en el borde con su flecha', inView
    && /guarida del lobo/i.test(await page.$eval('.adv-stop[data-point="a-la-guarida"]', el => el.textContent)));

const g0 = await gold(), p0 = await potions();
await page.click('.adv-stop[data-point="botin"]', { force: true });
await sleep(250);
// De camino al botín cruza al goblin rezagado: primero ese combate, luego el hallazgo
const rez = await playOut();
if (rez) { await page.click('.adv-stop[data-point="botin"]', { force: true }); await sleep(250); await playOut(); }
assert('El botín de Grask da +40 de oro y una poción (una sola vez)', (await gold()) >= g0 + 40 && (await potions()) === p0 + 1);
const g1 = await gold();
await page.click('.adv-stop[data-point="botin"]', { force: true });
await sleep(250);
await playOut();
assert('…y la segunda vez ya no da nada', (await gold()) === g1);

await page.click('.adv-stop[data-point="a-la-guarida"]', { force: true });
await sleep(300);
assert('El sendero del sureste lleva a la guarida del lobo', (await scene()) === 'guarida' && /guarida/i.test(await page.$eval('.adv-plaque', el => el.textContent)));
assert('En la guarida se ven el lobo de guardia y Feronius, cada uno con su dibujo', await page.$$eval('.adv-world .adv-enemy', els =>
    els.some(e => /enemigo_lobo-de-zafias/.test(e.src)) && els.some(e => /enemigo_feronius-el-feroz/.test(e.src))));
const sizes = await page.$$eval('.adv-world .adv-enemy', els => Object.fromEntries(els.map(e => [/feronius/.test(e.src) ? 'jefe' : 'lobo', parseFloat(e.style.height)])));
assert('Feronius se ve más grande que un lobo normal (es el jefe)', sizes.jefe > sizes.lobo * 1.2);

await page.click('.adv-stop[data-point="feronius"]', { force: true });
await sleep(250);
const wolfRatio = await page.evaluate(() => new Promise(r => setTimeout(() => r(parseFloat(getComputedStyle(document.getElementById('rpgActorMonster')).getPropertyValue('--ratio'))), 200)));
const wolf = await playOut();
assert('El lobo de guardia corta el paso: hay que vencerlo antes de llegar al jefe', !!wolf && wolf.won && /enemigo_lobo-de-zafias/.test(wolf.src));
assert('En combate, el lobo llega a media altura del héroe (no tan alto como él)', wolfRatio > 0.45 && wolfRatio < 0.7);
await page.click('.adv-stop[data-point="huesos"]', { force: true });
await sleep(250);
assert('Los huesos roídos (punto de interés) avisan de lo que espera', /Huesos/.test(await page.$eval('.adv-dialogue-who', el => el.textContent)));
await playOut();
await page.click('.adv-stop[data-point="feronius"]', { force: true });
await sleep(250);
const fer = await playOut();
assert('Feronius, el jefe de Zafias, pelea con su dibujo y cae', !!fer && fer.won && /enemigo_feronius-el-feroz/.test(fer.src));
const st = await saved();
assert('Feronius queda vencido para siempre (no vuelve al dormir)', st.flags['defeated:feronius'] === true
    && !!(await page.$('.adv-stop.is-cleared[data-point="feronius"]')));

// Maela, de vuelta en la aldea: recompensa de la misión, una sola vez
await prepare({ v: 1, scene: 'aldea', hp: null, gone: {}, flags: { ...st.flags } });
const g2 = await gold();
await page.click('.adv-stop[data-point="posadera"]', { force: true });
await sleep(250);
await playOut();
assert('Maela paga la misión (+60 de oro y una poción) y la marca como cumplida', (await gold()) === g2 + 60 && (await potions()) === 1
    && /Misión cumplida/.test(await hud()));
await page.click('.adv-stop[data-point="posadera"]', { force: true });
await sleep(250);
const after = await page.$$eval('.adv-dialogue-text', els => els.map(e => e.textContent).join(' '));
await playOut();
assert('…y después solo da conversación (ni oro ni poción otra vez)', (await gold()) === g2 + 60 && /bosque respira/.test(after));

assert('Sin errores de página en todo el recorrido', errors.length === 0);
if (errors.length) console.log(errors);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
