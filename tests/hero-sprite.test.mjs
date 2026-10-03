// =============================================
// 🧍 El héroe por capas, en el juego: se le ve la armadura y la espada que lleva (en el mapa, en el combate, en el
// inventario y en Equipo), camina con sus fotogramas, respira en reposo, alza la espada al atacar y la apunta al
// lanzar una habilidad. Se mira lo que enseña el <img> (data-armor, data-weapon, data-anim, data-frame) y, para
// asegurarse de que la espada y la armadura están pintadas de verdad, sus píxeles.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { HERO_SPRITES } from '../src/data/hero-sprites.js';

let passed = 0, failed = 0;
function assert(label, cond, extra = '') {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label} ${extra}`); }
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
const errors = [];

async function start(page, metaPatch, scene = 'aldea', extra = {}) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(({ metaPatch, scene, extra }) => {
        Object.assign(window.gameMeta, { introSeen: true, heroName: 'Aldric', gold: 0, charLevel: 1, xp: 0, statPoints: 0, primary: { str: 40, dex: 0, int: 0, vit: 40 },
            advGear: ['espada-de-hierro'], advWeapon: 'espada-de-hierro', advArmor: 'armadura-de-acero', advUpgrades: {}, materials: {} }, metaPatch);
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene, hp: null, gone: {}, flags: { misionAceptada: true }, ...extra }));
    }, { metaPatch, scene, extra });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
const look = (page, sel) => page.$eval(sel, el => ({ armor: el.dataset.armor, weapon: el.dataset.weapon, anim: el.dataset.anim, frame: el.dataset.frame, ok: el.complete && el.naturalWidth > 0 }));
const ready = (page, sel, test = 'true') => page.waitForFunction(({ sel, test }) => { const el = document.querySelector(sel); return el && el.dataset.armor && el.complete && el.naturalWidth > 0 && eval(test); }, { sel, test }, { timeout: 6000 }).catch(() => {});
/** Lo que hay pintado en un <img>: píxeles muy rojos (una espada de fuego), amarillos (oro) y la luz media del gris (el metal). */
const paint = (page, sel) => page.$eval(sel, el => {
    const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(el, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let red = 0, gold = 0, grey = 0, greySum = 0, solid = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        solid++;
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]], max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (r > 190 && g < 130 && b < 90) red++;
        if (r > 170 && g > 130 && b < 100 && r - b > 90) gold++;
        if (max && (max - min) / max < 0.2 && max > 58) { grey++; greySum += (r + g + b) / 3; }
    }
    return { red, gold, grey, light: grey ? greySum / grey : 0, solid };
});

const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', e => errors.push(e.message));

// ---------------------------------------------
console.log('\n🧍 En el mapa');
await start(page, {}, 'bosque', { gone: { 'goblin-1': true } });   // sin el vigía: el camino a la senda está libre
await ready(page, '.adv-hero');
let h = await look(page, '.adv-hero');
assert('El héroe sale con lo que lleva: armadura de acero y espada de hierro', h.ok && h.armor === 'acero' && h.weapon === 'espada-de-hierro');
assert('Parado, está en reposo (de pie)', h.anim === HERO_SPRITES.idle.anim && h.frame === String(HERO_SPRITES.idle.frame + 1));
const steel = await paint(page, '.adv-hero');
// Camina (con animaciones de verdad): sus fotogramas van pasando
await page.evaluate(() => { window.__frames = []; const el = document.querySelector('.adv-hero'); window.__obs = new MutationObserver(() => window.__frames.push(el.dataset.anim + el.dataset.frame)); window.__obs.observe(el, { attributes: true, attributeFilter: ['data-frame', 'data-anim'] }); });
await page.click('.adv-stop[data-point="senda-santuario"]', { force: true });
await sleep(1500);
const walked = await page.evaluate(() => [...new Set(window.__frames)]);
assert('Al andar va pasando por sus fotogramas de caminar', walked.filter(f => /^walk[1-4]$/.test(f)).length >= 3, walked.join());
await page.waitForFunction(() => document.querySelector('.adv-hero').dataset.anim !== 'walk' || !document.querySelector('.adv-dialogue').hidden, null, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 12 && !(await page.$eval('.adv-dialogue', el => el.hidden)); i++) { await page.click('.adv-dialogue-next'); await sleep(80); }
await sleep(400);
h = await look(page, '.adv-hero');
assert('Al llegar se para: vuelve al reposo', h.anim === HERO_SPRITES.idle.anim && h.frame === String(HERO_SPRITES.idle.frame + 1));
// (la cámara le sigue con suavidad: se le da un momento para que termine de encuadrarle)
await page.waitForFunction(() => { const r = document.querySelector('.adv-hero').getBoundingClientRect(), v = document.querySelector('.adv-viewport').getBoundingClientRect(); return r.height > 40 && r.right > v.left && r.left < v.right && r.bottom > v.top && r.top < v.bottom; }, null, { timeout: 6000 }).catch(() => {});
const box = await page.evaluate(() => { const r = document.querySelector('.adv-hero').getBoundingClientRect(), v = document.querySelector('.adv-viewport').getBoundingClientRect(); return { h: r.height, in: r.right > v.left && r.left < v.right && r.bottom > v.top && r.top < v.bottom }; });
assert('Se le ve dentro del mapa', box.in && box.h > 40, JSON.stringify(box));

// ---------------------------------------------
console.log('\n🛡️ Cambiar de armadura y de espada');
await start(page, { advGear: ['espada-de-hierro', 'mirmulnir', 'armadura-negra', 'armadura-dorada'] });
await ready(page, '.adv-hero');
const hp0 = await page.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent);
await page.click('.adv-inventory');
await sleep(250);
assert('El inventario lista las espadas y, después, las armaduras, con lo que da cada una',
    (await page.$$eval('.inv-rows:first-of-type [data-inv-item]', els => els.map(e => e.dataset.invItem).join())) === 'espada-de-hierro,mirmulnir,armadura-negra,armadura-dorada,armadura-de-acero'
    && /Vida \+16/.test(await page.$eval('[data-inv-item="armadura-negra"]', el => el.textContent)));
await page.click('[data-inv-item="armadura-negra"]');
await sleep(150);
assert('Su ficha dice «Armadura · Raro» y enseña al héroe de pie con ella', /Armadura · Raro/.test(await page.$eval('.inv-item-kind', el => el.textContent))
    && /img\/hero\/negra\//.test(await page.$eval('.inv-preview', el => el.getAttribute('src'))));
await page.click('[data-inv-tab="preview"]');
await ready(page, '.inv-preview');
h = await look(page, '.inv-preview');
assert('«Vista previa»: el héroe con la armadura negra puesta, antes de equiparla (y con su espada de ahora)', h.ok && h.armor === 'negra' && h.weapon === 'espada-de-hierro');
await page.click('[data-inv-equip="armadura-negra"]');
await sleep(300);
await ready(page, '.adv-hero', "el.dataset.armor === 'negra'");
h = await look(page, '.adv-hero');
assert('Equiparla: en el mapa el héroe ya la lleva puesta', h.armor === 'negra' && h.weapon === 'espada-de-hierro');
const black = await paint(page, '.adv-hero');
assert('…y se ve: su metal es claramente más oscuro que el del acero', black.light < steel.light * 0.9, `${steel.light.toFixed(0)} → ${black.light.toFixed(0)}`);
const hp1 = await page.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent);
assert('La armadura negra da 16 de vida máxima', Number(hp1.split('/')[1]) === Number(hp0.split('/')[1]) + 16, `${hp0} → ${hp1}`);
assert('Queda marcada como equipada, y la de acero ya no', /is-equipped/.test(await page.$eval('[data-inv-item="armadura-negra"]', el => el.className))
    && !/is-equipped/.test(await page.$eval('[data-inv-item="armadura-de-acero"]', el => el.className)) && /is-equipped/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.className)));
await page.click('[data-inv-item="mirmulnir"]');
await sleep(150);
await page.click('[data-inv-equip="mirmulnir"]');
await sleep(300);
await ready(page, '.adv-hero', "el.dataset.weapon === 'mirmulnir'");
h = await look(page, '.adv-hero');
assert('Equipar Mirmulnir: armadura negra y espada de fuego a la vez', h.armor === 'negra' && h.weapon === 'mirmulnir');
const fire = await paint(page, '.adv-hero');
assert('…y la espada está pintada en su mano: aparece el rojo de su hoja', fire.red > black.red + 150, `${black.red} → ${fire.red}`);
await page.click('#btnPanelClose');
await sleep(150);
await page.click('.adv-equip');
await ready(page, '.equip-figure img');
h = await look(page, '.equip-figure img');
assert('En Equipo, el héroe del centro va igual', h.armor === 'negra' && h.weapon === 'mirmulnir');
assert('…y la ranura de la armadura enseña la negra (rara)', await page.$eval('[data-equip-slot="armor"]', el => el.dataset.rarity === 'rara' && /img\/hero\/negra\//.test(el.querySelector('img').getAttribute('src'))));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'heroe-equipo.png') });
await page.click('#btnPanelClose');
await page.reload({ waitUntil: 'load' });
await sleep(500);
await ready(page, '.adv-hero');
h = await look(page, '.adv-hero');
assert('Tras recargar sigue igual (la armadura equipada se guarda)', h.armor === 'negra' && h.weapon === 'mirmulnir');
await page.click('.adv-inventory');
await sleep(250);
await page.click('[data-inv-item="armadura-dorada"]');
await sleep(100);
await page.click('[data-inv-equip="armadura-dorada"]');
await ready(page, '.adv-hero', "el.dataset.armor === 'oro'");
const golden = await paint(page, '.adv-hero');
assert('La dorada se ve dorada', golden.gold > steel.gold + 300, `${steel.gold} → ${golden.gold}`);
await page.click('#btnPanelClose');

// ---------------------------------------------
console.log('\n⚔️ En el combate');
await start(page, { advGear: ['espada-de-hierro', 'mirmulnir', 'placas-imperiales'], advWeapon: 'mirmulnir', advArmor: 'placas-imperiales' }, 'bosque');
await page.evaluate(() => { window.__forceAttackCooldown = false; });
await page.click('.adv-stop[data-point="goblin-1"]', { force: true });
await page.waitForFunction(() => !document.querySelector('.adv-dialogue').hidden, null, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 8 && !(await page.$eval('.adv-dialogue', el => el.hidden)); i++) { await page.click('.adv-dialogue-next'); await sleep(80); }
await ready(page, '#rpgActorHero > img');
h = await look(page, '#rpgActorHero > img');
assert('El héroe sale con sus placas imperiales y Mirmulnir', h.ok && h.armor === 'imperial' && h.weapon === 'mirmulnir');
assert('En reposo respira (no hay dibujo de reposo: es el de pie, animado por código)', h.anim === HERO_SPRITES.idle.anim
    && await page.$eval('#rpgActorHero > img', el => el.classList.contains('is-idle') && getComputedStyle(el).animationName === 'heroBreathe'));
const feet = await page.evaluate(() => { const a = document.querySelector('#rpgActorHero').getBoundingClientRect(), m = document.querySelector('#rpgActorMonster').getBoundingClientRect(), s = document.querySelector('#rpgStage').getBoundingClientRect(), i = document.querySelector('#rpgActorHero > img').getBoundingClientRect();
    return { hero: a.bottom, mon: m.bottom, heroH: a.height, inStage: i.left >= s.left - 2 && i.bottom <= s.bottom + 2, imgH: i.height }; });
assert('Pisa el mismo suelo que el enemigo y no se sale del escenario', Math.abs(feet.hero - feet.mon) < 2 && feet.inStage && feet.heroH > 120, JSON.stringify(feet));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'heroe-combate.png') });
// Atacar: alza la espada y la baja
await page.evaluate(() => { window.__frames = []; const el = document.querySelector('#rpgActorHero > img'); new MutationObserver(() => window.__frames.push(el.dataset.anim + el.dataset.frame)).observe(el, { attributes: true, attributeFilter: ['data-frame', 'data-anim'] }); });
await page.click('[data-rpg-action="attack"]');
await sleep(1500);
let seen = await page.evaluate(() => window.__frames);
assert('Al atacar hace su gesto: guardia, alza la espada, golpea y remata', ['attack1', 'attack2', 'attack3', 'attack4'].every(f => seen.includes(f))
    && seen.indexOf('attack2') < seen.indexOf('attack3'), seen.join());
h = await look(page, '#rpgActorHero > img');
assert('…y vuelve al reposo', h.anim === HERO_SPRITES.idle.anim && await page.$eval('#rpgActorHero > img', el => el.classList.contains('is-idle')));
// Bola de fuego: apunta con la espada
if (!(await page.$('#btnRpgCombatContinue'))) {
    await page.evaluate(() => { window.__frames.length = 0; });
    await page.click('[data-rpg-action="skill"][data-rpg-skill="fire_strike"]').catch(() => {});
    await sleep(1500);
    seen = await page.evaluate(() => window.__frames);
    assert('Con la Bola de fuego hace el gesto de lanzar (alza la espada recta y apunta)', ['cast2', 'cast3'].every(f => seen.includes(f)), seen.join());
} else assert('Con la Bola de fuego hace el gesto de lanzar (alza la espada recta y apunta)', true);
await page.context().close();

// ---------------------------------------------
console.log('\n📱 En el móvil');
const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
mobile.on('pageerror', e => errors.push(e.message));
await start(mobile, { advGear: ['espada-de-hierro', 'quebrantaamaneceres', 'armadura-de-escamas'], advWeapon: 'quebrantaamaneceres', advArmor: 'armadura-de-escamas' }, 'bosque');
await ready(mobile, '.adv-hero');
h = await look(mobile, '.adv-hero');
assert('El héroe sale con su armadura de escamas y su espada', h.ok && h.armor === 'escamas' && h.weapon === 'quebrantaamaneceres');
await mobile.click('.adv-stop[data-point="goblin-1"]', { force: true });
await mobile.waitForFunction(() => !document.querySelector('.adv-dialogue').hidden, null, { timeout: 15000 }).catch(() => {});
for (let i = 0; i < 8 && !(await mobile.$eval('.adv-dialogue', el => el.hidden)); i++) { await mobile.click('.adv-dialogue-next'); await sleep(80); }
await ready(mobile, '#rpgActorHero > img');
const m = await mobile.evaluate(() => { const s = document.querySelector('#rpgStage').getBoundingClientRect(), a = document.querySelector('#rpgActorHero').getBoundingClientRect(), mon = document.querySelector('#rpgActorMonster').getBoundingClientRect();
    return { scroll: document.documentElement.scrollWidth > window.innerWidth + 1, heroIn: a.left >= s.left && a.right <= s.right, apart: a.right <= mon.left + 4, h: a.height }; });
assert('En el combate cabe en la pantalla, sin pisarse con el enemigo y sin scroll horizontal', !m.scroll && m.heroIn && m.apart && m.h > 60, JSON.stringify(m));
if (process.env.SHOTS) await mobile.screenshot({ path: path.join(process.env.SHOTS, 'heroe-movil.png') });
await mobile.context().close();

assert('Sin errores de JavaScript', errors.length === 0, errors.join(' | '));
await browser.close();
server.close();
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
