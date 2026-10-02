// =============================================
// ✨ Efectos de estado en pantalla: la fila de iconos sobre cada personaje, el número de color con su icono al
// hacer daño, el icono grande al ponerse, el turno perdido por aturdimiento y los elixires.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
const effectsOn = who => page.$$eval(`#rpgActor${who} .rpg-effect`, els => els.map(e => ({ id: e.dataset.effect, turns: (e.querySelector('.rpg-effect-turns') || {}).textContent || null })));

console.log('\n✨ Efectos de estado en el combate');
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
// Un héroe recio en el bosque, con dos elixires, frente al goblin vigía
await page.evaluate(() => {
    Object.assign(window.gameMeta, { introSeen: true, primary: { str: 0, dex: 0, int: 0, vit: 60 }, elixirs: { fuerza: 1, hierbas: 1 } });
    localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: null, gone: {}, flags: { misionAceptada: true } }));
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
for (let i = 0; i < 20 && !(await shown('.adv-dialogue')); i++) { await page.click('.adv-stop[data-point="goblin-1"]', { force: true }); await sleep(300); }
await talkAll();
await sleep(200);
assert('En combate, los elixires que llevas salen con su imagen junto a las pociones',
    !!(await page.$('[data-rpg-action="elixir"][data-rpg-skill="fuerza"] img')) && !!(await page.$('[data-rpg-action="elixir"][data-rpg-skill="hierbas"] img')));

// Grito de guerra: «Más ATK» sobre el héroe, con su icono grande al ponerse
await page.click('[data-rpg-action="skill"][data-rpg-skill="war_cry"]');
const popped = await page.waitForSelector('.rpg-stage-float.is-effect-on img', { timeout: 2000 }).then(() => true).catch(() => false);
let hero = await effectsOn('Hero');
assert('Grito de guerra: el icono de «Más ATK» aparece grande y se queda en la fila sobre el héroe, con sus 3 rondas',
    popped && hero.some(e => e.id === 'mas-ataque' && e.turns === '3'));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'efectos-grito.png') });

// Veneno sobre el goblin: al cerrar su turno, -1 en verde seguido del icono de la calavera
await page.evaluate(() => { window.gameCombat().monster.effects.veneno = { power: 1, turns: 3 }; });
await sleep(1200);
await page.click('[data-rpg-action="defend"]');
const tick = await page.waitForSelector('#rpgActorMonster ~ .rpg-stage-float.is-effect, .rpg-stage-float.is-effect', { timeout: 3000 })
    .then(h => h.evaluate(el => ({ text: el.textContent.trim(), color: getComputedStyle(el).color, icon: (el.querySelector('img') || {}).src || '' })))
    .catch(() => null);
assert('El daño del veneno sale en verde, seguido de su icono', tick && /^-1$/.test(tick.text) && tick.color === 'rgb(126, 217, 87)' && /efecto-veneno/.test(tick.icon));
const mon = await effectsOn('Monster');
assert('…y sobre el goblin queda la calavera con las rondas que le quedan (2)', mon.some(e => e.id === 'veneno' && e.turns === '2'));
assert('El diario cuenta el daño del veneno', /sufre 1 de veneno/.test(await page.$eval('#rpgCombatLogContent', el => el.textContent)));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'efectos-veneno.png') });

// El elixir de fuerza: se gasta (y se guarda) y su botón desaparece al no quedar
await sleep(1200);
await page.click('[data-rpg-action="elixir"][data-rpg-skill="fuerza"]');
await sleep(300);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')).elixirs);
assert('Beber el elixir de fuerza gasta el único que había (guardado) y su botón ya no sale',
    saved.fuerza === 0 && saved.hierbas === 1 && !(await page.$('[data-rpg-action="elixir"][data-rpg-skill="fuerza"]')));

// Aturdido: si su golpe te aturde, la barra solo ofrece seguir (pierdes el turno)
await page.evaluate(() => { window.gameCombat().monster.rules = { stunOnHeavy: 0.1 }; });
let stunned = false;
for (let i = 0; i < 6 && !stunned && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="defend"]');
    await sleep(250);
    stunned = /Aturdido/.test(await page.$eval('#rpgCombatActions', el => el.textContent));
}
hero = await effectsOn('Hero');
assert('Aturdido: el icono sobre el héroe y un único botón «Aturdido» en la barra', stunned && hero.some(e => e.id === 'aturdido')
    && (await page.$$('#rpgCombatActions .rpg-action')).length === 1);
await page.click('[data-rpg-action="attack"]');
await sleep(250);
assert('Pulsarlo pierde el turno y se te pasa', /aturdido y pierde el turno/.test(await page.$eval('#rpgCombatLogContent', el => el.textContent))
    && !(await effectsOn('Hero')).some(e => e.id === 'aturdido'));

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
