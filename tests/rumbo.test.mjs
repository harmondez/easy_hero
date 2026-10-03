// =============================================
// 🧭 Andar por el mapa: cambiar de rumbo a medio camino y el telón al cambiar de escena.
// - Si pulsas una parada y, mientras el héroe va hacia ella, pulsas otra, cambia de rumbo en el acto.
// - Al pasar a otra escena la pantalla se va a negro con el nombre del lugar y el cuadro nuevo aparece poco a poco.
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

async function start(scene, flags = {}) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(({ scene, flags }) => {
        Object.assign(window.gameMeta, { introSeen: true, heroName: 'Aldric' });
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene, hp: null, gone: {}, flags }));
    }, { scene, flags });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
}
const click = id => page.evaluate(id => document.querySelector(`.adv-stop[data-point="${id}"]`).click(), id);
// Dónde está el héroe en el mapa (lo dice su transform: translate3d(x, y, 0))
const hero = () => page.$eval('.adv-hero', el => { const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(el.style.transform); return { x: +m[1], y: +m[2], walking: el.classList.contains('is-walking') }; });
const dialogueWho = () => page.$eval('.adv-dialogue-who', el => (el.offsetParent ? el.textContent : ''));

console.log('\n🧭 Cambiar de rumbo a medio camino');
await start('aldea');
const from = await hero();
await click('cueva');   // lejos, al suroeste: por la forja y los escalones
await sleep(700);
const mid = await hero();
assert('Pulsas la cueva y el héroe echa a andar hacia el oeste', mid.walking && mid.x < from.x - 10, JSON.stringify({ from, mid }));
await click('pozo');    // rectificas: el pozo queda al otro lado
await sleep(350);
const turned = await hero();
assert('Pulsas el pozo a medio camino: da la vuelta en el acto, sin llegar antes a la cueva', turned.walking && turned.x > mid.x + 3, JSON.stringify({ mid, turned }));
await page.waitForFunction(() => { const w = document.querySelector('.adv-dialogue-who'); return w && w.offsetParent && /pozo/i.test(w.textContent); }, null, { timeout: 8000 }).catch(() => {});
assert('…y llega al pozo, que es lo último que pulsaste (se abre lo del pozo, no lo de la cueva)', /pozo/i.test(await dialogueWho()), await dialogueWho());

// Rectificar dos veces seguidas y acabar en una tercera parada
await start('aldea', { 'visto:pozo': true });
await click('cueva');
await sleep(500);
await click('a-las-casas');
await sleep(500);
const east = await hero();
await click('mercado');
await page.waitForFunction(() => { const w = document.querySelector('.adv-dialogue-who'); return w && w.offsetParent && /mercado/i.test(w.textContent); }, null, { timeout: 9000 }).catch(() => {});
assert('Tres pulsaciones seguidas (cueva, casas, mercado): manda la última y sigue en la aldea',
    /mercado/i.test(await dialogueWho()) && (await page.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea', JSON.stringify(east));

// Plantado ante un enemigo, pulsar otra parada también funciona (y volver a pulsarle abre el combate)
await start('bosque', { misionAceptada: true });
await click('goblin-2');   // el vigía corta el paso: se para ante él y habla
await page.waitForFunction(() => { const w = document.querySelector('.adv-dialogue-who'); return w && w.offsetParent; }, null, { timeout: 8000 }).catch(() => {});
assert('Un enemigo sin vencer sigue cortando el paso: el héroe se planta ante el vigía', /vigía/i.test(await dialogueWho()), await dialogueWho());

console.log('\n🎬 El telón al cambiar de escena');
await start('aldea');
await click('al-bosque');
await page.waitForFunction(() => document.querySelector('.adv-viewport').dataset.scene === 'bosque', null, { timeout: 9000 }).catch(() => {});
const fade = await page.$eval('.adv-fade', el => ({ on: el.classList.contains('is-on'), text: el.textContent, opacity: +getComputedStyle(el).opacity, clicks: getComputedStyle(el).pointerEvents }));
assert('Al entrar en el bosque la pantalla está en negro con el nombre del lugar', fade.on && fade.opacity > 0.9 && fade.text === 'El bosque de los cruces', JSON.stringify(fade));
assert('El telón no se come las pulsaciones', fade.clicks === 'none');
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'telon.png') });
await page.waitForFunction(() => +getComputedStyle(document.querySelector('.adv-fade')).opacity < 0.02, null, { timeout: 4000 }).catch(() => {});
assert('…y se levanta solo: el bosque aparece poco a poco', (await page.$eval('.adv-fade', el => +getComputedStyle(el).opacity)) < 0.02);
const world = await page.$eval('.adv-world > img', el => ({ src: el.getAttribute('src'), ok: el.complete && el.naturalWidth > 0 }));
assert('Debajo ya está el mapa del bosque, cargado', /zafias\.webp$/.test(world.src) && world.ok, JSON.stringify(world));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'telon-despues.png') });

assert('Sin errores de JavaScript', errors.length === 0, errors.join(' | '));

await browser.close();
server.close();
console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
