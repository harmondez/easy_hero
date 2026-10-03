// =============================================
// 🪖 La pantalla de Equipo: el botón de la barra, el héroe de cuerpo entero entre sus ocho ranuras, la ficha de cada
// ranura y las estadísticas (las mismas con las que luego pelea), con los puntos de nivel para repartir.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { SLOT_ORDER, SLOT_NAMES, SLOT_ICONS } from '../src/data/gear.js';
import { ART } from '../src/data/art.js';

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('\n🪖 Equipo (datos)');
assert('Hay ocho ranuras, cada una con su nombre y su icono', SLOT_ORDER.length === 8 && new Set(SLOT_ORDER).size === 8
    && SLOT_ORDER.every(s => SLOT_NAMES[s] && ART.icons[SLOT_ICONS[s]]));
assert('El héroe de cuerpo entero está registrado y es una figura de pie (mucho más alta que ancha)',
    !!ART.portraits['hero-cuerpo'] && ART.portraits['hero-cuerpo'].h / ART.portraits['hero-cuerpo'].w > 1.7);

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

/** Abre el juego con este progreso, en `scene`. */
async function start(page, metaPatch, scene = 'aldea', extra = {}) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(({ metaPatch, scene, extra }) => {
        Object.assign(window.gameMeta, { introSeen: true, heroName: 'Aldric', charLevel: 1, xp: 0, statPoints: 0, primary: { str: 0, dex: 0, int: 0, vit: 0 },
            advGear: ['espada-de-hierro'], advWeapon: 'espada-de-hierro', advUpgrades: {} }, metaPatch);
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene, hp: null, gone: {}, flags: { misionAceptada: true }, ...extra }));
    }, { metaPatch, scene, extra });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
const stat = (page, id) => page.$eval(`[data-equip-stat="${id}"]`, el => el.textContent.trim());
const primary = (page, k) => page.$eval(`[data-equip-primary="${k}"]`, el => Number(el.textContent));

const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
page.on('pageerror', e => errors.push(e.message));

console.log('\n🪖 El botón y la pantalla');
await start(page, { charLevel: 3, xp: 35, statPoints: 2, primary: { str: 12, dex: 6, int: 0, vit: 4 },
    advGear: ['espada-de-hierro', 'mirmulnir'], advWeapon: 'mirmulnir', advUpgrades: { mirmulnir: 2 } }, 'bosque', { hp: 21 });
const bar = await page.$$eval('.adv-bar-buttons .adv-bar-btn', els => els.map(e => ({ text: e.textContent.trim(), img: e.querySelector('img').getAttribute('src') })));
assert('La barra tiene tres botones: Inventario, Equipo (con el casco) y Misiones',
    bar.map(b => b.text).join() === 'Inventario,Equipo,Misiones' && /ranura-casco/.test(bar[1].img));
assert('Con puntos de nivel sin repartir, el botón de Equipo avisa', /is-new/.test(await page.$eval('.adv-equip', el => el.className)));
await page.click('.adv-equip');
await sleep(300);
assert('«Equipo» abre su pantalla', await page.$eval('#panelOverlay', el => getComputedStyle(el).display !== 'none') && !!(await page.$('.equip')));
const fig = await page.$eval('.equip-figure img', el => ({ src: el.src, ok: el.complete && el.naturalWidth > 0, ratio: el.naturalHeight / el.naturalWidth, h: el.getBoundingClientRect().height }));
assert('En el centro, el héroe de cuerpo entero', /hero-cuerpo/.test(fig.src) && fig.ok && fig.ratio > 1.7 && fig.h > 250);
const slots = await page.$$eval('[data-equip-slot]', els => els.map(e => ({ slot: e.dataset.equipSlot, name: e.querySelector('.equip-slot-name').textContent,
    item: e.classList.contains('has-item'), rarity: e.dataset.rarity || null, img: e.querySelector('img').getAttribute('src'), x: e.getBoundingClientRect().left })));
const figX = await page.$eval('.equip-figure', el => { const r = el.getBoundingClientRect(); return [r.left, r.right]; });
assert('Ocho ranuras con su nombre: cuatro a la izquierda del héroe y cuatro a la derecha',
    slots.map(s => s.name).join() === 'Casco,Armadura,Guantes,Botas,Arma,Collar,Anillo,Cinturón'
    && slots.slice(0, 4).every(s => s.x < figX[0]) && slots.slice(4).every(s => s.x >= figX[1] - 1));
const weapon = slots.find(s => s.slot === 'weapon');
assert('La del arma enseña la espada equipada (Mirmulnir, épica) con su +2 de mejora', weapon.item && weapon.rarity === 'epica' && /objeto-mirmulnir/.test(weapon.img)
    && (await page.$eval('[data-equip-slot="weapon"] .equip-slot-plus', el => el.textContent)) === '+2');
assert('Las otras siete salen vacías, con el icono de su ranura', slots.filter(s => s.slot !== 'weapon').every(s => !s.item && /ranura-/.test(s.img)));
const inside = await page.$eval('[data-equip-slot="weapon"]', el => {
    const f = el.querySelector('.equip-slot-frame').getBoundingClientRect(), i = el.querySelector('img').getBoundingClientRect();
    return i.left >= f.left - 1 && i.right <= f.right + 1 && i.top >= f.top - 1 && i.bottom <= f.bottom + 1;
});
assert('La espada cabe dentro de su ranura (no se sale del marco)', inside);
let detail = await page.$eval('.equip-detail', el => el.textContent.replace(/\s+/g, ' ').trim());
assert('Al abrir, la ficha es la del arma: nombre, rareza, elemento, ATK y efecto', /Mirmulnir \+2/.test(detail) && /Arma · Épico · Fuego/.test(detail)
    && /ATK 6 \(\+2 de mejora\)/.test(detail) && /Quemadura/.test(detail)
    && (await page.$eval('.equip-detail-name', el => getComputedStyle(el).color)) === 'rgb(168, 85, 247)');
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'equipo.png') });
await page.click('[data-equip-slot="helmet"]');
await sleep(100);
detail = await page.$eval('.equip-detail', el => el.textContent.replace(/\s+/g, ' ').trim());
assert('Pulsar una ranura vacía: «Casco · Sin equipar», sin botón de cambiar', /Casco/.test(detail) && /Sin equipar/.test(detail) && !(await page.$('[data-equip-change]'))
    && /is-selected/.test(await page.$eval('[data-equip-slot="helmet"]', el => el.className)));

console.log('\n📊 Las estadísticas');
// Fuerza 17 → +1 ATK; Destreza 11 → 2,4 % de crítico y 1,8 % de esquiva; Vitalidad 9 → +16 de vida y 1,6 % de resistencia
const shown = { level: await stat(page, 'level'), xp: await stat(page, 'xp'), atk: await stat(page, 'atk'), ph: await stat(page, 'ph'), hp: await stat(page, 'hp'), mp: await stat(page, 'mp'),
    en: await stat(page, 'en'), crit: await stat(page, 'crit'), dodge: await stat(page, 'dodge'), pres: await stat(page, 'pres'), eres: await stat(page, 'eres') };
assert('Nivel y experiencia: «3» y «35/100 XP», con su barra a un tercio', shown.level === '3' && shown.xp === '35/100 XP'
    && Math.abs(parseFloat(await page.$eval('.equip-xp-fill', el => el.style.width)) - 35) < 0.5);
assert('ATK 7 (espada 4 + 2 de mejora + 1 de Fuerza), PH 5, vida 21/41, maná 12/12 y energía 0/100',
    shown.atk === '7' && shown.ph === '5' && shown.hp === '21/41' && shown.mp === '12/12' && shown.en === '0/100');
assert('Crítico 2,4 %, esquiva 1,8 %, resistencia física 1,6 % y elemental 0 %', /^2,4\s%$/.test(shown.crit) && /^1,8\s%$/.test(shown.dodge) && /^1,6\s%$/.test(shown.pres) && /^0\s%$/.test(shown.eres));
assert('Los cuatro atributos: Fuerza 17, Destreza 11, Inteligencia 5 y Vitalidad 9',
    (await primary(page, 'str')) === 17 && (await primary(page, 'dex')) === 11 && (await primary(page, 'int')) === 5 && (await primary(page, 'vit')) === 9
    && (await page.$$eval('.equip-primary-name', els => els.map(e => e.textContent).join())) === 'Fuerza,Destreza,Inteligencia,Vitalidad');
assert('La barra de abajo dice la misma vida', (await page.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent)) === '21/41');

console.log('\n➕ Repartir puntos de nivel');
assert('Con 2 puntos, lo dice y los cuatro «+» están activos', (await stat(page, 'points')) === '2' && (await page.$$('[data-equip-spend]:not([disabled])')).length === 4);
await page.click('[data-equip-spend="vit"]');
await sleep(200);
let m = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
assert('«+» en Vitalidad: sube a 10, queda 1 punto, la vida máxima pasa a 45 y se guarda',
    (await primary(page, 'vit')) === 10 && (await stat(page, 'points')) === '1' && /\/45$/.test(await stat(page, 'hp')) && m.statPoints === 1 && m.primary.vit === 5);
assert('La barra de abajo se entera (vida máxima 45)', /\/45$/.test(await page.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent)));
await page.click('[data-equip-spend="dex"]');
await sleep(200);
m = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
assert('El último punto, en Destreza: crítico 2,8 %, ya no quedan puntos y los «+» se apagan',
    (await primary(page, 'dex')) === 12 && /^2,8\s%$/.test(await stat(page, 'crit')) && m.statPoints === 0
    && !(await page.$('[data-equip-stat="points"]')) && (await page.$$('[data-equip-spend]:not([disabled])')).length === 0);
assert('…y el botón de Equipo deja de avisar', !/is-new/.test(await page.$eval('.adv-equip', el => el.className)));
const sheet = { atk: Number(await stat(page, 'atk')), hp: await stat(page, 'hp'), mp: await stat(page, 'mp') };
await page.click('[data-equip-slot="weapon"]');
await sleep(100);
await page.click('[data-equip-change]');
await sleep(250);
assert('«Cambiar» en la ranura del arma abre el inventario', !!(await page.$('.inv-list')) && !(await page.$('.equip')));
await page.click('#btnPanelClose');
await sleep(150);

// Las mismas cifras, en el combate
await page.click('.adv-stop[data-point="goblin-1"]', { force: true });
await sleep(300);
for (let i = 0; i < 8 && !(await page.$eval('.adv-dialogue', el => el.hidden)); i++) { await page.click('.adv-dialogue-next'); await sleep(60); }
await sleep(250);
const fight = await page.evaluate(() => { const h = window.gameCombat().hero; return { atq: h.atq, hp: `${h.hp}/${h.maxHp}`, mp: `${h.mp}/${h.maxMp}` }; });
assert('En el combate, el héroe pelea con las cifras de la pantalla de Equipo (ATK, vida y maná)', fight.atq === sheet.atk && fight.hp === sheet.hp && fight.mp === sheet.mp);

console.log('\n🪖 Sin puntos y con la espada de inicio');
await start(page, {});
assert('Sin puntos por repartir, el botón no avisa', !/is-new/.test(await page.$eval('.adv-equip', el => el.className)));
await page.click('.adv-equip');
await sleep(300);
assert('La ranura del arma enseña la Espada de hierro (común), sin «+»', /objeto-espada-de-hierro/.test(await page.$eval('[data-equip-slot="weapon"] img', el => el.getAttribute('src')))
    && (await page.$eval('[data-equip-slot="weapon"]', el => el.dataset.rarity)) === 'comun' && !(await page.$('.equip-slot-plus')));
assert('Los «+» salen apagados y el texto explica de dónde vienen los puntos', (await page.$$('[data-equip-spend][disabled]')).length === 4
    && /al subir de nivel/.test(await page.$eval('.equip-points', el => el.textContent)));
assert('Héroe recién llegado: nivel 1, ATK 1, vida 25/25', (await stat(page, 'level')) === '1' && (await stat(page, 'atk')) === '1' && (await stat(page, 'hp')) === '25/25');
await page.keyboard.press('Escape');
await sleep(100);
await page.click('#btnPanelClose').catch(() => {});
await page.context().close();

console.log('\n📱 En el móvil');
const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
mobile.on('pageerror', e => errors.push(e.message));
await start(mobile, { charLevel: 3, xp: 35, statPoints: 2, advGear: ['espada-de-hierro', 'mirmulnir'], advWeapon: 'mirmulnir', advUpgrades: { mirmulnir: 2 } });
const barM = await mobile.$$eval('.adv-bar-buttons .adv-bar-btn', els => els.map(e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, w: r.width, h: r.height }; }));
assert('Los tres botones de la barra caben en la pantalla, sin pisarse y pulsables con el dedo',
    barM.length === 3 && barM.every(b => b.l >= 0 && b.r <= 390 && b.w >= 44 && b.h >= 44) && barM[0].r <= barM[1].l + 1 && barM[1].r <= barM[2].l + 1);
await mobile.click('.adv-equip');
await sleep(400);
const mob = await mobile.evaluate(() => {
    const r = sel => document.querySelector(sel).getBoundingClientRect();
    const slots = [...document.querySelectorAll('[data-equip-slot]')].map(e => e.getBoundingClientRect());
    return { fig: r('.equip-figure img'), slots: slots.map(s => ({ l: s.left, r: s.right, t: s.top, w: s.width })), scroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        sheet: r('.equip-sheet') };
});
assert('El héroe arriba y las ocho ranuras debajo, en dos filas de cuatro', mob.slots.every(s => s.t >= mob.fig.bottom - 1)
    && new Set(mob.slots.map(s => Math.round(s.t))).size === 2 && mob.slots.slice(0, 4).every(s => Math.round(s.t) === Math.round(mob.slots[0].t)));
assert('Todo cabe a lo ancho (sin scroll horizontal) y las ranuras se pueden pulsar con el dedo',
    !mob.scroll && mob.slots.every(s => s.l >= 0 && s.r <= 390 && s.w >= 44) && mob.sheet.left >= 0 && mob.sheet.right <= 390);
if (process.env.SHOTS) await mobile.screenshot({ path: path.join(process.env.SHOTS, 'equipo-movil.png'), fullPage: true });
await mobile.context().close();

assert('Sin errores de JavaScript', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
server.close();
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
