// =============================================
// 🌐 RPG-pack — flujo completo en el navegador (Playwright)
// Levanta su propio servidor estático: no necesita Python ni nada en marcha.
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
assert('Al inicio solo se pueden pisar los nodos del primer piso',
    (await page.$$eval('#rpgMap .rpg-node.is-available', els => els.length)) === 4);

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
    (await page.$$('#rpgMap .rpg-node.is-available')).length === 4
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

console.log('\n🐉 Ruta completa hasta el jefe final');
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let reachedBoss = false;
for (let step = 0; step < 14 && !reachedBoss; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (avail.length === 0) break;
    await avail[0].click();
    await sleep(120);
    if (await page.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none')) {
        for (let i = 0; i < 5 && !(await page.$('#btnRpgCombatContinue')); i++) {
            await page.click('[data-rpg-action="attack"]');
            await sleep(60);
        }
        await page.click('#btnRpgCombatContinue');
        await sleep(150);
    }
    reachedBoss = (await page.$$('#rpgMap .type-boss.is-current')).length === 1;
}
assert('Recorriendo la ruta (peleando) se llega al jefe final', reachedBoss);
assert('Tras el jefe final no queda nada por pisar', (await page.$$('#rpgMap .rpg-node.is-available')).length === 0);
assert('El diario registró el recorrido', (await page.$$('#rpgLogContent .log-entry')).length >= 8);

await page.click('#btnRpgAbandon');
await sleep(200);
assert('Abandonar la ruta devuelve a la carta del héroe',
    await page.$eval('#rpgStartView', el => getComputedStyle(el).display !== 'none'));
assert('Sin errores de página durante toda la partida', pageErrors.length === 0);

const xss = await page.evaluate(() => window.UI.esc('<script>alert("x")</script>'));
assert('esc() neutraliza HTML', xss.includes('&lt;') && !xss.includes('<script>'));

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
