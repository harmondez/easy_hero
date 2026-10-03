// =============================================
// 🎒 Botín en pantalla: lo que suelta el enemigo sale en el cartel de victoria, con el color de su rareza, y queda en
// el inventario. El sorteo se fuerza con window.__lootRng para que la prueba sea siempre la misma.
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

let seen = null;   // el enemigo del último combate, tal como salió
/** Vence a la parada `point` del bosque con el sorteo de botín fijado en `rolls` y devuelve lo que enseña el cartel. */
async function fight(point, rolls, meta = {}, rare = false) {
    await page.evaluate(({ m, point }) => {
        // Para llegar al lobo del sendero, los goblins del camino ya no están
        Object.assign(window.gameMeta, { introSeen: true, primary: { str: 80, dex: 0, int: 0, vit: 80 }, materials: {}, potions: 0, manaPotions: 0 }, m);
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: null, gone: { 'goblin-1': point !== 'goblin-1', 'goblin-2': point !== 'goblin-2' }, flags: { misionAceptada: true } }));
    }, { m: meta, point });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    await page.evaluate(r => { let i = 0; window.__lootRng = () => r[Math.min(i++, r.length - 1)]; }, rolls);
    await page.evaluate(r => { window.__rareRng = () => (r ? 0.05 : 0.5); }, rare);
    for (let i = 0; i < 20 && !(await page.$('[data-rpg-action="attack"]')) ; i++) {
        await page.click(`.adv-stop[data-point="${point}"]`, { force: true });
        await sleep(300);
        await talkAll();
    }
    seen = await page.evaluate(() => { const m = window.gameCombat().monster; return { name: m.name, hp: m.maxHp, atq: m.atq,
        tag: document.body.textContent.includes('Encuentro raro'),
        img: (document.querySelector('#rpgActorMonster > img') || {}).src || '' }; });
    if (process.env.SHOTS && rare) await page.screenshot({ path: path.join(process.env.SHOTS, `raro-${point}.png`) });
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    return page.evaluate(() => {
        const el = document.querySelector('.rpg-result-loot');
        if (!el) return null;
        return { rarity: el.dataset.rarity, left: el.classList.contains('is-left'), name: el.querySelector('b').textContent,
            rarityName: el.querySelector('i').textContent, color: getComputedStyle(el.querySelector('b')).color,
            img: el.querySelector('img').complete && el.querySelector('img').naturalWidth > 0 };
    });
}

console.log('\n🎒 Botín de los enemigos');
await page.goto(url, { waitUntil: 'load', timeout: 30000 });

// Un goblin que suelta su collar (tirada dentro del 33 % y en el último tramo de la tabla)
let loot = await fight('goblin-1', [0.1, 0.99]);
assert('Un goblin suelta el collar goblin: sale en el cartel de victoria con su dibujo', !!loot && loot.name === 'Collar goblin' && loot.img && !loot.left);
assert('El cartel dice su rareza (Raro) y pinta el nombre de azul', !!loot && loot.rarity === 'rara' && loot.rarityName === 'Raro' && loot.color === 'rgb(59, 130, 246)');
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'botin-victoria.png') });
assert('El collar queda guardado', await page.evaluate(() => window.gameMeta.materials['collar-goblin'] === 1));
await page.click('#btnRpgCombatContinue');
await sleep(300);
await page.click('.adv-inventory');
await sleep(200);
const row = await page.$eval('[data-inv-item="material:collar-goblin"]', el => ({ text: el.textContent.replace(/\s+/g, ' ').trim(), color: getComputedStyle(el.querySelector('.inv-name')).color })).catch(() => null);
assert('En el inventario sale «Collar goblin ×1», con la tinta de su rareza', !!row && /Collar goblin/.test(row.text) && /×1/.test(row.text) && row.color === 'rgb(31, 85, 184)');
await page.click('[data-inv-item="material:collar-goblin"]');
await sleep(100);
assert('Su ficha dice «Material · Raro · llevas 1»', /Material · Raro · llevas 1/.test(await page.$eval('.inv-item-kind', el => el.textContent)));
if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, 'botin-inventario.png') });

// Dos de cada tres veces no suelta nada
loot = await fight('goblin-1', [0.9]);
assert('Con la tirada fuera del 33 %, el cartel no enseña botín y no se guarda nada',
    loot === null && await page.evaluate(() => Object.keys(window.gameMeta.materials || {}).length === 0));

// Un lobo suelta un diente (épico, lila)
loot = await fight('lobo-sendero', [0.1, 0.4]);
assert('Un lobo suelta un diente de lobo: Épico, en lila', !!loot && loot.name === 'Diente de lobo' && loot.rarityName === 'Épico' && loot.color === 'rgb(168, 85, 247)');

// Una poción que no cabe
loot = await fight('lobo-sendero', [0.1, 0.0], { potions: 3 });
assert('Con tres pociones encima, la que suelta el lobo se queda en el suelo y el cartel lo dice',
    !!loot && loot.name === 'Poción de vida' && loot.left && await page.evaluate(() => window.gameMeta.potions === 3));
loot = await fight('lobo-sendero', [0.1, 0.0], { potions: 1 });
assert('Con sitio, la poción de vida se suma a las que llevas', !!loot && !loot.left && await page.evaluate(() => window.gameMeta.potions === 2));

// --- Encuentros raros ---
console.log('\n✨ Encuentros raros');
await fight('lobo-sendero', [0.9]);
const lobo = seen;
loot = await fight('lobo-sendero', [0.9, 0.4], {}, true);
assert('Con la tirada rara, en lugar del lobo sale el Lobo Negro, con su dibujo y la etiqueta «Encuentro raro»',
    seen.name === 'Lobo Negro' && /enemigo_lobo-negro/.test(seen.img) && seen.tag && lobo.name === 'Lobo de Zafias');
assert('El Lobo Negro tiene el doble de vida y de ataque que el normal', seen.hp === lobo.hp * 2 && seen.atq === lobo.atq * 2);
assert('Un raro suelta siempre algo, aunque la tirada de botín fuese mala', !!loot && !loot.left);
await fight('goblin-2', [0.9], {});
const gob = seen;
loot = await fight('goblin-2', [0.9, 0.99], {}, true);
assert('En un goblin del camino sale el Goblin Pícaro, con el doble de vida y de ataque',
    seen.name === 'Goblin Pícaro' && /enemigo_goblin-picaro/.test(seen.img) && seen.hp === gob.hp * 2 && seen.atq === gob.atq * 2);
assert('El Goblin Pícaro también suelta siempre (aquí, su collar)', !!loot && loot.name === 'Collar goblin');
await fight('goblin-1', [0.9], {}, true);
assert('Los goblins que hablan antes de pelear (el vigía) no cambian por el raro', seen.name !== 'Goblin Pícaro');

assert('Sin errores de JavaScript', errors.length === 0);
if (errors.length) console.log(errors);

await browser.close();
server.close();
console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
