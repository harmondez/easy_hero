// =============================================
// 🌅 La introducción y la entrada al juego: la primera vez, el despertar en las ruinas; después, directo a la
// aventura. Nunca aparece el menú de la mazmorra al entrar.
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
const url = `http://127.0.0.1:${server.address().port}/index.html`;

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shotDir = process.env.SHOT_DIR || '';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const shown = sel => page.$eval(sel, el => !el.hidden && getComputedStyle(el).display !== 'none').catch(() => false);
const viewOn = id => page.$eval(`#${id}`, el => getComputedStyle(el).display !== 'none').catch(() => false);
const meta = () => page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta') || '{}'));

console.log('\n🌅 Primera vez: la introducción');
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await sleep(400);
assert('Quien entra por primera vez ve la introducción, no el menú de la mazmorra',
    await shown('#introView') && !(await viewOn('rpgStartView')));
assert('Empieza a oscuras, con un pensamiento', /…/.test(await page.$eval('.intro-thought', el => el.textContent)));

// Avanzar con clics (los pasos automáticos van solos) hasta el nombre, y escribirlo
const seen = new Set();
let named = false, sawItem = false;
for (let i = 0; i < 60 && await shown('#introView'); i++) {
    seen.add(await page.$eval('#introView', el => el.dataset.step));
    if (await shown('.intro-name')) {
        if (shotDir) await page.screenshot({ path: path.join(shotDir, 'intro-nombre.png') });
        await page.fill('#introNameInput', '  Aldric  ');
        await page.keyboard.press('Enter');
        named = true;
    } else {
        if (await shown('.intro-item')) { sawItem = /Espada de hierro/.test(await page.$eval('.intro-item', el => el.textContent)); if (shotDir) await page.screenshot({ path: path.join(shotDir, 'intro-espada.png') }); }
        await page.mouse.click(720, 300);
    }
    await sleep(140);
}
assert('Pasa por el despertar en las ruinas, el nombre, la espada y el camino al pueblo',
    ['thought', 'say', 'name', 'item', 'title'].every(k => seen.has(k)));   // los automáticos (despertar, incorporarse) duran 60 ms con «reducir movimiento»
assert('El jugador escribe el nombre de su héroe', named);
assert('Encuentra su espada de hierro', sawItem);
assert('Al terminar aparece en la aventura, en la aldea de Zafias', !(await shown('#introView')) && await viewOn('rpgAdventureView')
    && (await page.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea');
let m = await meta();
assert('Se recuerda el nombre (sin espacios de más) y que ya vio la introducción', m.heroName === 'Aldric' && m.introSeen === true);
await page.click('.adv-stop[data-point="posadera"]', { force: true });
await sleep(250);
const lines = [];
for (let i = 0; i < 8 && await shown('.adv-dialogue'); i++) {
    lines.push(`${await page.$eval('.adv-dialogue-who', el => el.textContent)}: ${await page.$eval('.adv-dialogue-text', el => el.textContent)}`);
    await page.click('.adv-dialogue-next'); await sleep(60);
}
assert('Maela le llama por su nombre y él cuenta que despertó en las ruinas',
    lines.some(l => /^Aldric: .*ruinas/.test(l)) && lines.some(l => /Pues, Aldric/.test(l)) && !lines.some(l => /\{heroe\}/.test(l)));

console.log('\n🔁 Al volver: directo a la aventura');
await page.reload({ waitUntil: 'load' });
await sleep(500);
assert('Al volver no hay introducción ni menú de la mazmorra: directo a la aventura',
    !(await shown('#introView')) && !(await viewOn('rpgStartView')) && await viewOn('rpgAdventureView'));
assert('El botón de arriba lleva a la mazmorra', /mazmorra/i.test(await page.$eval('.adv-back', el => el.textContent)));
await page.click('.adv-back');
await sleep(250);
assert('…y la mazmorra muestra al héroe con su nombre', await viewOn('rpgStartView') && /Aldric/.test(await page.$eval('#rpgHeroCard', el => el.textContent)));

console.log('\n⚙️ Opciones: verla otra vez y saltarla');
await page.evaluate(() => window.openPanel('options'));
await sleep(200);
await page.click('#btnPanelIntro');
await sleep(300);
assert('Desde Opciones se puede ver la introducción otra vez', await shown('#introView'));
await page.click('.intro-skip');
await sleep(300);
m = await meta();
assert('Saltarla lleva a la aventura y conserva el nombre', !(await shown('#introView')) && await viewOn('rpgAdventureView') && m.heroName === 'Aldric');

console.log('\n🧓 Quien ya jugaba antes de la introducción');
const old = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
old.on('pageerror', e => errors.push(e.message));
await old.goto(url, { waitUntil: 'load' });
await old.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: null, gone: {}, flags: { misionAceptada: true } }));
});
await old.reload({ waitUntil: 'load' });
await sleep(500);
assert('Con una partida de la aventura guardada no ve la introducción: vuelve donde estaba',
    !(await old.$eval('#introView', el => !el.hidden)) && (await old.$eval('.adv-viewport', el => el.dataset.scene)) === 'bosque');
await old.context().close();

console.log('\n⏭️ Saltar la primera vez');
const skip = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
skip.on('pageerror', e => errors.push(e.message));
await skip.goto(url, { waitUntil: 'load' });
await sleep(400);
await skip.keyboard.press('Escape');
await sleep(300);
const skipMeta = await skip.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta') || '{}'));
assert('En el móvil, Escape (o «Saltar») la termina: aldea, y el héroe se llama «Héroe»',
    (await skip.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea' && skipMeta.introSeen === true && skipMeta.heroName === 'Héroe');
await skip.context().close();

console.log('\n🗑️ Borrar progreso');
await page.evaluate(() => window.openPanel('options'));
await sleep(200);
await page.click('#btnPanelWipe');
await sleep(150);
assert('Borrar progreso pide confirmación antes de hacer nada', /No se puede deshacer/.test(await page.$eval('#panelBody', el => el.textContent))
    && (await meta()).heroName === 'Aldric');
await page.click('#btnWipeCancel');
await sleep(150);
assert('Cancelar vuelve a Opciones sin borrar nada', !!(await page.$('#btnPanelWipe')) && (await meta()).heroName === 'Aldric');
await page.click('#btnPanelWipe');
await sleep(150);
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#btnWipeConfirm')]);
await sleep(500);
const left = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('easy-hero-') && k !== 'easy-hero-meta'));
const fresh = await meta();
assert('BORRAR lo borra todo y vuelve a empezar con la introducción', await shown('#introView') && !left.length && !fresh.heroName && !fresh.introSeen);

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
