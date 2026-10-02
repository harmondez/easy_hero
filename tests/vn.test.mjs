// =============================================
// 🎭 Novela visual en pantalla: ?vn=<clave> abre un diálogo al momento, con el retrato de quien habla (y el del héroe
// en penumbra mientras escucha), la etiqueta del nombre de su lado y sin dar recompensas ni poner marcas.
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const portrait = side => page.$eval(`.adv-portrait.is-${side}`, el => ({ shown: !el.hidden, src: el.getAttribute('src') || '', speaking: el.classList.contains('is-speaking') }));

console.log('\n🎭 ?vn=<clave>: un diálogo al momento');
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => { Object.assign(window.gameMeta, { introSeen: true, heroName: 'Aldric', gold: 5 }); localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta)); });
await page.goto(`${url}?vn=posadera-fin`, { waitUntil: 'load' });
await sleep(600);
assert('Abre el diálogo pedido sin introducción', !(await page.$eval('#introView', el => !el.hidden)) && await page.$eval('.adv-dialogue', el => !el.hidden)
    && /Grask/.test(await page.$eval('.adv-dialogue-text', el => el.textContent)));
let left = await portrait('left'), right = await portrait('right');
assert('Maela habla a la izquierda, con su retrato; el héroe escucha a la derecha, en penumbra', left.shown && /tabernera-maela/.test(left.src) && left.speaking
    && right.shown && /hero/.test(right.src) && !right.speaking);
await page.click('.adv-dialogue-next');
await sleep(150);
left = await portrait('left'); right = await portrait('right');
assert('Cuando habla el héroe se cambian las luces, y su nombre va a su lado', right.speaking && !left.speaking
    && /Aldric/.test(await page.$eval('.adv-dialogue-who', el => el.textContent)) && await page.$eval('.adv-dialogue-who', el => el.classList.contains('is-hero')));
await page.click('.adv-dialogue-next');
await sleep(150);
left = await portrait('left'); right = await portrait('right');
assert('En la narración, los dos en penumbra', !left.speaking && !right.speaking);
for (let i = 0; i < 6 && await page.$eval('.adv-dialogue', el => !el.hidden); i++) { await page.click('.adv-dialogue-next'); await sleep(100); }
const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
const adv = await page.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure') || '{}'));
assert('Verlo así no da recompensas ni pone marcas de la historia', meta.gold === 5 && !(adv.flags && adv.flags.misionCumplida));

console.log('\n👺 Grask, más grande');
await page.goto(`${url}?vn=grask`, { waitUntil: 'load' });
await sleep(600);
const grask = await page.$eval('.adv-portrait.is-left', el => ({ big: el.classList.contains('is-big'), h: el.getBoundingClientRect().height }));
const view = await page.$eval('.adv-viewport', el => el.getBoundingClientRect().height);
assert('Grask sale más grande que nadie (y bajado tras el cuadro)', grask.big && grask.h > view * 0.85);
assert('Una clave que no existe no rompe nada', await page.goto(`${url}?vn=no-existe`, { waitUntil: 'load' }).then(() => sleep(400)).then(() => page.$eval('.adv-dialogue', el => el.hidden)));

assert('Sin errores de página', errors.length === 0);
if (errors.length) console.log(errors);
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
