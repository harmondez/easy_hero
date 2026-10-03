// =============================================
// 🏘️ La aldea nueva: cada tendero vende solo lo suyo y te compra al 75 %, Bram mejora la espada con un cristal,
// la posada cobra por dormir y las plantas de Amelie se encuentran en los puntos de interés.
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
const talkAll = async () => { for (let i = 0; i < 12 && await shown('.adv-dialogue'); i++) { await page.click('.adv-dialogue-next'); await sleep(60); } };
const go = async id => { await page.click(`.adv-stop[data-point="${id}"]`, { force: true }); await sleep(300); };
const meta = () => page.evaluate(() => JSON.parse(JSON.stringify(window.gameMeta)));
const hudGold = () => page.$eval('[data-hud="gold"]', el => Number(el.textContent));
const buyKeys = () => page.$$eval('#shopBody [data-shop-buy]', els => els.map(e => e.dataset.shopBuy));
const sellKeys = () => page.$$eval('#shopBody [data-shop-sell]', els => els.map(e => e.dataset.shopSell));

/** Empieza en `scene` con el progreso `metaPatch` y las marcas `flags`. */
async function start(scene, metaPatch = {}, flags = {}, extra = {}) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(({ scene, metaPatch, flags, extra }) => {
        Object.assign(window.gameMeta, { introSeen: true, gold: 0, potions: 0, manaPotions: 0, elixirs: {}, food: {}, crystals: 0, materials: {},
            advGear: ['espada-de-hierro'], advWeapon: 'espada-de-hierro', advUpgrades: {} }, metaPatch);
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene, hp: null, gone: {}, flags, counts: {}, ...extra }));
    }, { scene, metaPatch, flags, extra });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    // Dos fotogramas pintados: las paradas ya están en su sitio en pantalla antes del primer clic
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.hover('.adv-inventory');
}

// ---------------------------------------------
console.log('\n⚒️ La Forja de Bram: comprar, mejorar o salir');
await start('aldea', { gold: 1000 }, { 'colmillo:aceptada': true });
await go('herrero');
await talkAll();
await sleep(150);
assert('Bram dice lo suyo y pregunta: Comprar, Mejorar o Salir',
    (await page.$$eval('.adv-menu [data-menu]', els => els.map(e => e.dataset.menu).join())) === 'shop,upgrade,leave');
await page.click('.adv-menu [data-menu="upgrade"]');
await sleep(200);
assert('«Mejorar» sin cristales: lista tus espadas, pero no deja mejorar y te manda a comprar',
    (await page.$eval('[data-upgrade-crystals]', el => el.textContent)) === '0' && await page.$eval('[data-upgrade-weapon="espada-de-hierro"]', el => el.disabled)
    && /Comprar/.test(await page.$eval('.upgrade-panel', el => el.textContent)));
await page.click('#btnPanelClose');
await sleep(150);
await go('herrero');
await talkAll();
await sleep(150);
await page.click('.adv-menu [data-menu="shop"]');
await sleep(250);
let keys = await buyKeys();
assert('«Comprar»: su tienda solo vende espadas y el cristal de mejora (ni pociones ni mejoras permanentes)',
    await shown('#rpgShopView') && keys.length === 9 && keys.slice(0, 8).every(k => k.startsWith('gear:')) && keys[8] === 'crystal');
assert('El cristal cuesta 100 de oro', /100/.test(await page.$eval('[data-shop-buy="crystal"]', el => el.textContent)));
await page.click('[data-shop-buy="crystal"]');
await page.click('[data-shop-buy="crystal"]');
await page.click('[data-shop-buy="gear:aguijon"]');
await sleep(100);
let m = await meta();
assert('Comprar dos cristales y el Aguijón: 1000 − 100 − 100 − 300 = 500 de oro', m.gold === 500 && m.crystals === 2 && m.advGear.includes('aguijon'));
await page.click('[data-shop-tab="sell"]');
await sleep(100);
assert('«Vender»: Bram te compra el Aguijón y los cristales, no la espada que llevas puesta', (await sellKeys()).join() === 'gear:aguijon,crystal'
    && /\+225/.test(await page.$eval('[data-shop-sell="gear:aguijon"]', el => el.textContent)) && /\+75/.test(await page.$eval('[data-shop-sell="crystal"]', el => el.textContent)));
await page.click('[data-shop-sell="gear:aguijon"]');
await sleep(100);
m = await meta();
assert('Vender el Aguijón devuelve el 75 % (225) y sale del inventario', m.gold === 725 && !m.advGear.includes('aguijon') && (await sellKeys()).join() === 'crystal');
await page.click('#btnShopBack');
await sleep(300);
await go('herrero');
await talkAll();
await sleep(150);
await page.click('.adv-menu [data-menu="upgrade"]');
await sleep(200);
await page.click('[data-upgrade-weapon="espada-de-hierro"]');
await sleep(150);
m = await meta();
assert('«Mejorar» gasta un cristal y deja la espada en +1 (sin tocar el oro)', m.crystals === 1 && m.advUpgrades['espada-de-hierro'] === 1 && m.gold === 725
    && /\+1/.test(await page.$eval('.upgrade-panel .shop-name', el => el.textContent)) && /ATK 2/.test(await page.$eval('.upgrade-panel .shop-level', el => el.textContent)));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'aldea-mejorar.png') });
await page.click('#btnPanelClose');
await sleep(150);
await page.click('.adv-inventory');
await sleep(200);
assert('En el inventario: la espada +1 y el cristal que queda', /Espada de hierro \+1/.test(await page.$eval('[data-inv-item="espada-de-hierro"]', el => el.textContent))
    && /×1/.test(await page.$eval('[data-inv-item="cristal"]', el => el.textContent)));
await page.click('#btnPanelClose');
await sleep(150);

// ---------------------------------------------
console.log('\n🧪 La botica de Amelie');
await start('aldea', { gold: 200 });
await go('boticaria');
assert('Amelie se presenta y cuenta lo suyo antes de nada', /botica|Amelie/i.test(await page.$eval('.adv-dialogue-who', el => el.textContent)));
const dicho = [];
for (let i = 0; i < 12 && await shown('.adv-dialogue'); i++) { dicho.push(await page.$eval('.adv-dialogue-text', el => el.textContent)); await page.click('.adv-dialogue-next'); await sleep(60); }
assert('Lleva la botica sola, cuida de su hermana pequeña enferma y pide tres plantas medicinales',
    dicho.some(t => /sola/.test(t)) && dicho.some(t => /hermana pequeña está enferma/.test(t)) && dicho.some(t => /tres plantas medicinales/.test(t)));
await sleep(250);
keys = await buyKeys();
assert('…y al terminar abre la tienda directamente: poción de vida y de maná, elixir de fuerza y arcano, y frasco de veneno',
    await shown('#rpgShopView') && keys.join() === 'potion,mana_potion,elixir:fuerza,elixir:arcano,elixir:veneno');
await page.click('[data-shop-buy="potion"]');
await page.click('[data-shop-buy="elixir:veneno"]');
await sleep(100);
m = await meta();
assert('Comprar una poción (20) y un frasco de veneno (20)', m.gold === 160 && m.potions === 1 && m.elixirs.veneno === 1);
await page.click('[data-shop-tab="sell"]');
await sleep(100);
await page.click('[data-shop-sell="potion"]');
await sleep(100);
m = await meta();
assert('Devolverle la poción da 15 (el 75 %)', m.gold === 175 && m.potions === 0 && (await sellKeys()).join() === 'elixir:veneno');
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'aldea-botica-vender.png') });
await page.click('#btnShopBack');
await sleep(300);
assert('Con la misión aceptada, el diario pide las plantas (0/3)', await (async () => {
    await page.click('.adv-quests'); await sleep(200);
    const h = await page.$eval('#panelBody', el => el.textContent);
    await page.click('#btnPanelClose'); await sleep(100);
    return /Plantas para Amelie/.test(h) && /0\/3/.test(h);
})());

// Las tres plantas, en sus puntos de interés
console.log('\n🌿 Las plantas medicinales');
await start('bosque', {}, { 'visto:senda-santuario': true }, { gone: { 'goblin-1': true } });
assert('Sin la misión, la senda del santuario ya mirada sale gris', /is-cleared/.test(await page.$eval('.adv-stop[data-point="senda-santuario"]', el => el.className)));
await go('senda-santuario');
await talkAll();
assert('…y no da ninguna planta', !(await meta()).materials['planta-medicinal']);
await start('bosque', {}, { 'plantas:aceptada': true, 'visto:senda-santuario': true, 'visto:ruinas': true, misionAceptada: true },
    { gone: { 'goblin-1': true, 'goblin-2': true, 'lobo-ruinas': true } });
assert('Con la misión de Amelie, la senda vuelve a llamar la atención (deja de estar gris)',
    !/is-cleared/.test(await page.$eval('.adv-stop[data-point="senda-santuario"]', el => el.className)));
await go('senda-santuario');
const planta = await page.$eval('.adv-dialogue-text', el => el.textContent);
await talkAll();
assert('Allí crece una planta medicinal: te la llevas', /flores blancas/.test(planta) && (await meta()).materials['planta-medicinal'] === 1
    && /Planta medicinal/.test(await page.$eval('.adv-toast', el => el.textContent)));
await go('senda-santuario');
await talkAll();
assert('Una sola vez: después, la senda dice lo de siempre y queda gris', (await meta()).materials['planta-medicinal'] === 1
    && /is-cleared/.test(await page.$eval('.adv-stop[data-point="senda-santuario"]', el => el.className)));
for (let i = 0; i < 20 && !(await shown('.adv-dialogue')); i++) await go('ruinas');
await talkAll();
assert('En las ruinas del vigía, la segunda', (await meta()).materials['planta-medicinal'] === 2);
// La tercera está en la escalinata del castillo, en el campamento: se pone a mano y se entrega
await start('aldea', { materials: { 'planta-medicinal': 3 }, potions: 0 }, { 'plantas:aceptada': true, 'planta:senda': true, 'planta:ruinas': true, 'planta:escalinata': true });
const xpBefore = (await meta()).xp + (await meta()).charLevel * 1000;
await go('boticaria');
await talkAll();
await sleep(250);
m = await meta();
assert('Con las tres, Amelie paga: +40 de oro, experiencia y dos pociones; y se queda las plantas',
    m.gold === 40 && m.potions === 2 && m.xp + m.charLevel * 1000 > xpBefore && m.materials['planta-medicinal'] === 0);
assert('…y abre la botica, como siempre', await shown('#rpgShopView'));
await page.click('#btnShopBack');
await sleep(300);
assert('Su punto pasa a gris: misión cumplida', /is-cleared/.test(await page.$eval('.adv-stop[data-point="boticaria"]', el => el.className)));

// ---------------------------------------------
console.log('\n🛏️ La posada de Evelyn');
await start('aldea', { gold: 4 }, { misionAceptada: true }, { hp: 3, gone: { 'goblin-1': true } });
await go('posada');
assert('Con 4 monedas, «Descansar · 5 monedas» sale apagado', await page.$eval('.adv-menu [data-menu="sleep"]', el => el.disabled && /5 monedas/.test(el.textContent)));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'aldea-posada.png') });
await page.click('.adv-menu [data-menu="shop"]');
await sleep(250);
assert('«Comprar pan»: la despensa de la posada solo vende pan, a 5 monedas (y con 4 no llega)',
    (await buyKeys()).join() === 'food:pan' && await page.$eval('[data-shop-buy="food:pan"]', el => el.disabled && /5/.test(el.textContent)));
await page.click('#btnShopBack');
await sleep(300);
await page.evaluate(() => { window.gameMeta.gold = 11; });
await go('posada');
assert('Con oro, se puede descansar', !(await page.$eval('.adv-menu [data-menu="sleep"]', el => el.disabled)));
await page.click('.adv-menu [data-menu="sleep"]');
await sleep(200);
assert('Se cobra al momento (11 − 5 = 6)', (await hudGold()) === 6);
await talkAll();
const st = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
assert('Dormir cura del todo y hace volver a los enemigos', st.hp === null && Object.keys(st.gone).length === 0
    && /^(\d+)\/\1$/.test(await page.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent)));
await go('posada');
await page.click('.adv-menu [data-menu="leave"]');
await sleep(150);
assert('«Salir» cierra el menú sin cobrar', !(await shown('.adv-menu')) && (await hudGold()) === 6);

// ---------------------------------------------
console.log('\n🐺 Partidas de antes del colmillo');
await start('aldea', {}, { 'defeated:feronius': true });
assert('Quien ya había vencido a Feronius lleva su colmillo (ya no vuelve a aparecer para soltarlo)', (await meta()).materials['colmillo-feronius'] === 1);
await page.reload({ waitUntil: 'load' });
await sleep(400);
assert('…uno solo, aunque recargues', (await meta()).materials['colmillo-feronius'] === 1);
await page.click('.adv-inventory');
await sleep(200);
assert('Sale en el inventario como objeto épico, con el dibujo del diente de lobo',
    /material-diente-lobo/.test(await page.$eval('[data-inv-item="material:colmillo-feronius"] img', el => el.src))
    && (await page.$eval('[data-inv-item="material:colmillo-feronius"] .inv-name', el => getComputedStyle(el).color)) === 'rgb(122, 47, 184)');
await page.click('#btnPanelClose');

// ---------------------------------------------
console.log('\n📱 En el móvil');
const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
await mobile.goto(url, { waitUntil: 'load' });
await mobile.evaluate(() => {
    Object.assign(window.gameMeta, { introSeen: true, gold: 50 });
    localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'aldea', hp: null, gone: {}, flags: {} }));
});
await mobile.reload({ waitUntil: 'load' });
await sleep(500);
await mobile.click('.adv-stop[data-point="posada"]', { force: true });
await sleep(400);
const box = await mobile.$eval('.adv-menu-box', el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
assert('El menú de la posada cabe entero en la pantalla y sus botones se pueden pulsar con el dedo (48 px)',
    box.l >= 0 && box.r <= 390 && box.t >= 0 && box.b <= 844 && await mobile.$$eval('.adv-menu-option', els => els.every(e => e.getBoundingClientRect().height >= 44)));
assert('Sin scroll horizontal', !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
if (process.env.SHOTS) await mobile.screenshot({ path: path.join(process.env.SHOTS, 'aldea-movil-menu.png') });
await mobile.context().close();

assert('Sin errores de JavaScript', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
server.close();
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
