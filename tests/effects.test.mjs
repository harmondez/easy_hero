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
const floats = await page.evaluate(() => { const s = document.getElementById('rpgStage').getBoundingClientRect();
    return [...document.querySelectorAll('.rpg-stage-float')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return { top: r.top - s.top, bottom: s.bottom - r.bottom, italic: cs.fontStyle, weight: Number(cs.fontWeight), font: cs.fontFamily }; }); });
assert('Los números salen dentro del escenario, en cursiva y negrita, con su fuente propia', floats.length > 0
    && floats.every(f => f.top >= 0 && f.bottom >= 0 && f.italic === 'italic' && f.weight >= 800 && /Grenze/.test(f.font)));
const mon = await effectsOn('Monster');
assert('…y sobre el goblin queda la calavera con las rondas que le quedan (2)', mon.some(e => e.id === 'veneno' && e.turns === '2'));
const looks = await page.evaluate(() => {
    const a = document.getElementById('rpgActorMonster');
    const icon = a.querySelector('.rpg-effect[data-effect="veneno"] img');
    const box = getComputedStyle(a.querySelector('.rpg-effect'));
    return { icon: icon.getAttribute('src'), sprite: a.querySelector(':scope > img').getAttribute('src'), border: box.borderTopWidth, bg: box.backgroundColor };
});
assert('El icono es el del veneno (no el dibujo del personaje), solo, sin recuadro', /efecto-veneno/.test(looks.icon)
    && !/efecto-/.test(looks.sprite) && looks.border === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(looks.bg));
assert('El diario cuenta el daño del veneno', /sufre 1 de veneno/.test(await page.$eval('#rpgCombatLogContent', el => el.textContent)));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'efectos-veneno.png') });

// El elixir de fuerza: se gasta (y se guarda) y su botón desaparece al no quedar
await sleep(1200);
await page.click('[data-rpg-action="elixir"][data-rpg-skill="fuerza"]');
await sleep(300);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')).elixirs);
assert('Beber el elixir de fuerza gasta el único que había (guardado) y su botón ya no sale',
    saved.fuerza === 0 && saved.hierbas === 1 && !(await page.$('[data-rpg-action="elixir"][data-rpg-skill="fuerza"]')));

// Aturdido: no sale ningún botón ni cartel; la barra se apaga, pierdes el turno solo y el enemigo vuelve a actuar
await page.evaluate(() => { window.gameCombat().monster.rules = { stunOnHeavy: 0.1 }; });
let stunned = false;
for (let i = 0; i < 6 && !stunned && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="defend"]');
    await sleep(150);
    // En cuanto aturde, se le quitan las reglas: así no vuelve a aturdir en el turno que aprovecha
    stunned = await page.evaluate(() => { const c = window.gameCombat(); const s = !!c.hero.effects.aturdido; if (s) c.monster.rules = {}; return s; });
}
hero = await effectsOn('Hero');
const roundBefore = await page.$eval('#rpgCombatTitle', el => el.textContent);
assert('Aturdido: su icono sobre el héroe, la barra de siempre pero apagada, y ningún botón ni cartel «Aturdido»', stunned && hero.some(e => e.id === 'aturdido')
    && await page.$eval('#rpgCombatActions', el => el.classList.contains('is-stunned') && !/Aturdido/.test(el.textContent))
    && await page.$$eval('#rpgCombatActions button', bs => bs.length > 3 && bs.every(b => b.disabled))
    && !(await page.$$eval('.rpg-stage-float', els => els.some(e => /Aturdido/i.test(e.textContent)))));
await page.waitForFunction(() => /aturdido y pierde el turno/.test(document.getElementById('rpgCombatLogContent').textContent), null, { timeout: 8000 }).catch(() => {});
await sleep(300);
assert('Sin pulsar nada, pierdes el turno y el enemigo actúa otra vez (pasa la ronda)',
    /aturdido y pierde el turno/.test(await page.$eval('#rpgCombatLogContent', el => el.textContent))
    && (await page.$eval('#rpgCombatTitle', el => el.textContent)) !== roundBefore
    && !(await effectsOn('Hero')).some(e => e.id === 'aturdido'));
assert('…y la barra vuelve a encenderse', (await page.$('#btnRpgCombatContinue')) || await page.$eval('#rpgCombatActions', el => !el.classList.contains('is-stunned')));

// ⚡ Energía: defenderse la llena; Golpe poderoso la gasta con un clic
console.log('\n⚡ Energía y Golpe poderoso en pantalla');
await page.evaluate(() => {
    localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: null, gone: {}, flags: { misionAceptada: true } }));
});
await page.reload({ waitUntil: 'load' });
await sleep(500);
for (let i = 0; i < 20 && !(await shown('.adv-dialogue')); i++) { await page.click('.adv-stop[data-point="goblin-1"]', { force: true }); await sleep(300); }
await talkAll();
await sleep(300);
const energy = () => page.$eval('#rpgCombatHero .rpg-stat.en', el => Number(el.textContent.split('/')[0]));
assert('Al empezar el combate, la energía está a 0 y Golpe poderoso apagado', (await energy()) === 0
    && await page.$eval('[data-rpg-skill="power_strike"]', el => el.disabled));
for (let i = 0; i < 6 && (await energy()) < 50; i++) { await page.click('[data-rpg-action="defend"]'); await sleep(250); }
const before = await energy();
assert('Defenderse llena la energía hasta poder usarlo, y el botón se enciende', before >= 50
    && await page.$eval('[data-rpg-skill="power_strike"]', el => !el.disabled));
await page.click('[data-rpg-skill="power_strike"]');
await sleep(300);
assert('Pulsarlo lanza el Golpe poderoso y gasta 50 de energía',
    /golpe poderoso/i.test(await page.$eval('#rpgCombatLogContent', el => el.textContent))
    && ((await page.$('#btnRpgCombatContinue')) || (await energy()) <= before - 50 + 10));

// ⏳ ¡Atacar! espera 2 segundos antes de volver a pulsarse (en las pruebas se desactiva salvo que se pida)
if (!(await page.$('#btnRpgCombatContinue'))) {
    await page.evaluate(() => { window.__forceAttackCooldown = true; const c = window.gameCombat(); c.monster.hp = c.monster.maxHp = 999; c.hero.hp = c.hero.maxHp; });
    await page.click('[data-rpg-action="defend"]');
    await sleep(300);
    await page.click('[data-rpg-action="attack"]');
    await sleep(200);
    const cooling = await page.$eval('[data-rpg-action="attack"]', el => el.disabled && el.classList.contains('is-cooling'));
    await sleep(2200);
    const ready = await page.$eval('[data-rpg-action="attack"]', el => !el.disabled && !el.classList.contains('is-cooling'));
    assert('Tras atacar, ¡Atacar! se apaga 2 segundos (con la franja que se vacía) y vuelve', cooling && ready);
}

// ⚡ La energía se guarda entre combates y solo se vacía al dormir
console.log('\n⚡ La energía se guarda hasta dormir');
await page.evaluate(() => {
    window.gameMeta.gold = 50;   // dormir cuesta 5 monedas
    localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'aldea', hp: null, energy: 60, gone: {}, flags: { misionAceptada: true } }));
});
await page.reload({ waitUntil: 'load' });
await sleep(600);
const barEnergy = () => page.$eval('[data-hud="en"] .ui-gauge-text', el => el.textContent);
assert('La barra de abajo enseña la energía guardada (60/100)', (await barEnergy()) === '60/100');
for (let i = 0; i < 20 && !(await shown('.adv-menu')); i++) { await page.click('.adv-stop[data-point="posada"]', { force: true }); await sleep(300); }
await page.click('.adv-menu [data-menu="sleep"]');
await sleep(250);
await talkAll();
await sleep(300);
const slept = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
assert('Dormir en la posada la vacía (0/100)', slept.energy === 0 && (await barEnergy()) === '0/100');

// 💥 El efecto que trae un golpe aparece en el impacto, no al pulsar (con animaciones de verdad)
console.log('\n💥 Efectos en el momento del impacto');
{
    const p2 = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    p2.on('pageerror', e => errors.push(e.message));
    await p2.goto(url, { waitUntil: 'load' });
    await p2.evaluate(() => { Object.assign(window.gameMeta, { introSeen: true, primary: { str: 0, dex: 0, int: 0, vit: 40 } }); localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: null, gone: {}, flags: { misionAceptada: true } })); });
    await p2.reload({ waitUntil: 'load' });
    await sleep(800);
    const open = () => p2.$eval('.adv-dialogue', el => !el.hidden).catch(() => false);
    for (let i = 0; i < 25 && !(await open()); i++) { await p2.click('.adv-stop[data-point="goblin-1"]', { force: true }); await sleep(500); }
    for (let i = 0; i < 6 && await open(); i++) { await p2.click('.adv-dialogue-next'); await sleep(150); }
    await sleep(700);
    // Tu arma envenena siempre; el goblin no ataca (así solo cuenta tu golpe)
    await p2.evaluate(() => { const c = window.gameCombat(); c.monster.hp = c.monster.maxHp = 80; c.monster.intent = { k: 'rest' }; c.monster.pattern = [{ k: 'rest' }];
        c.hero.gearEffects = { onHit: [{ id: 'veneno', power: 1, turns: 3, chance: 1 }], onStart: [] }; });
    const poisonShown = () => p2.evaluate(() => { const el = document.querySelector('#rpgActorMonster .rpg-effect[data-effect="veneno"]');
        const chip = document.querySelector('#rpgCombatMonster .rpg-fx-chip[data-effect="veneno"]');
        return !!el && getComputedStyle(el).visibility !== 'hidden' && !!chip && getComputedStyle(chip).visibility !== 'hidden'; });
    await p2.click('[data-rpg-action="attack"]');
    await sleep(120);
    const early = await poisonShown();
    await sleep(800);
    const late = await poisonShown();
    assert('Mientras tu golpe va de camino, el veneno aún no se ve; al impactar, aparece (icono y etiqueta)', !early && late);
    await p2.context().close();
}

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
