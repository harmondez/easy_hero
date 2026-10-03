// =============================================
// 🐒 Prueba de aguante en el navegador: un «mono» juega al juego de verdad durante minutos, pulsando lo que haya en
// pantalla (paradas del mapa, diálogos, menús, tiendas, combate, inventario, Equipo, misiones), y vigila que nada se
// rompa: errores de JavaScript, pantallas sin salida, oro negativo, pociones por encima del tope, la barra de abajo
// diciendo otra cosa que el guardado, o el héroe sin su dibujo. Dos turnos: uno pobre (recién llegado) y uno rico
// (con oro para comprar y vender de todo).
// Uso: node tests/soak.test.mjs [minutos=10]     Deja su informe en docs/pruebas-largas-navegador.md
// =============================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const MINUTES = Number(process.argv.slice(2).find(a => /^[\d.]+$/.test(a)) || 10);
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Azar con semilla: el mono hace siempre lo mismo
let seed = 20261003;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = xs => xs[Math.floor(rnd() * xs.length)];

const browser = await chromium.launch({ headless: true });
const problems = new Map();
const note = (t, extra = '') => { const e = problems.get(t) || { n: 0, first: extra }; e.n++; problems.set(t, e); };
const totals = { actions: 0, fights: 0, wins: 0, falls: 0, buys: 0, sells: 0, sleeps: 0, talks: 0, equips: 0, scenes: new Set(), kinds: {} };
const count = k => { totals.actions++; totals.kinds[k] = (totals.kinds[k] || 0) + 1; };

async function turn(label, metaPatch, minutes, viewport) {
    const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', e => note(`Error de JavaScript: ${e.message.split('\n')[0]}`, label));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) note(`Error en consola: ${m.text().slice(0, 140)}`, label); });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(patch => {
        Object.assign(window.gameMeta, { introSeen: true, heroName: 'Mono' }, patch);
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.removeItem('easy-hero-adventure');
    }, metaPatch);
    await page.reload({ waitUntil: 'load' });
    await sleep(600);
    await page.evaluate(() => { window.__rareRng = Math.random; });   // el mono sí se cruza con encuentros raros
    const end = Date.now() + minutes * 60000;
    let idle = 0, idleSince = 0;
    const vis = sel => page.$eval(sel, el => !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0).catch(() => false);
    const clickOne = async sel => { const els = await page.$$(sel); const ok = []; for (const e of els) if (await e.isVisible().catch(() => false) && await e.isEnabled().catch(() => false)) ok.push(e); if (!ok.length) return false; await pick(ok).click({ timeout: 2000 }).catch(() => {}); return true; };

    while (Date.now() < end) {
        let did = null;
        try {
            if (await vis('#rpgCombatResult')) {
                const txt = await page.$eval('#rpgCombatResult', el => el.className);
                if (/is-victory/.test(txt)) totals.wins++; else if (/is-defeat/.test(txt)) totals.falls++;
                await page.click('#btnRpgCombatContinue', { timeout: 2000 }).catch(() => {}); did = 'seguir tras el combate'; totals.fights++;
            } else if (await vis('#rpgCombatView')) {
                // Pelea: sobre todo ataca; a veces una habilidad, una poción, defenderse o huir
                const r = rnd();
                const sel = r < 0.6 ? '[data-rpg-action="attack"]' : r < 0.78 ? '[data-rpg-action="skill"]' : r < 0.86 ? '[data-rpg-action="defend"]' : r < 0.94 ? '[data-rpg-action="potion"], [data-rpg-action="mana_potion"], [data-rpg-action="elixir"]' : '[data-rpg-action="flee"]';
                did = (await clickOne(sel)) || (await clickOne('[data-rpg-action="attack"]')) ? 'acción de combate' : null;
            } else if (await vis('#panelOverlay')) {
                const r = rnd();
                if (r < 0.3 && await clickOne('[data-inv-item], [data-equip-slot]')) did = 'mirar una pieza';
                else if (r < 0.45 && await clickOne('[data-inv-equip]:not([disabled])')) { did = 'equipar'; totals.equips++; }
                else if (r < 0.55 && await clickOne('[data-inv-use]:not([disabled]), [data-inv-tab], [data-equip-spend]:not([disabled]), [data-upgrade-weapon]:not([disabled]), [data-equip-change]')) did = 'usar algo del panel';
                else { await page.click('#btnPanelClose', { timeout: 2000 }).catch(() => {}); did = 'cerrar el panel'; }
            } else if (await vis('#rpgShopView')) {
                const r = rnd();
                if (r < 0.45 && await clickOne('[data-shop-buy]:not([disabled])')) { did = 'comprar'; totals.buys++; }
                else if (r < 0.6 && await clickOne('[data-shop-sell]:not([disabled])')) { did = 'vender'; totals.sells++; }
                else if (r < 0.8 && await clickOne('[data-shop-tab]')) did = 'pestaña de la tienda';
                else { await page.click('#btnShopBack', { timeout: 2000 }).catch(() => {}); did = 'salir de la tienda'; }
            } else if (await vis('.adv-menu')) {
                const opt = await page.$$eval('.adv-menu [data-menu]:not([disabled])', els => els.map(e => e.dataset.menu));
                const m = pick(opt.length ? opt : ['leave']);
                if (m === 'sleep') totals.sleeps++;
                await page.click(`.adv-menu [data-menu="${m}"]`, { timeout: 2000 }).catch(() => {}); did = `menú: ${m}`;
            } else if (await vis('.adv-dialogue')) {
                await page.click('.adv-dialogue-next', { timeout: 2000 }).catch(() => {}); did = 'siguiente línea'; totals.talks++;
            } else if (await vis('#rpgAdventureView')) {
                totals.scenes.add(await page.$eval('.adv-viewport', el => el.dataset.scene));
                const r = rnd();
                if (r < 0.08) { await clickOne('.adv-inventory, .adv-equip, .adv-quests'); did = 'abrir un panel'; }
                else {
                    const stops = await page.$$eval('.adv-stop', els => els.map(e => e.dataset.point));
                    if (stops.length) { await page.click(`.adv-stop[data-point="${pick(stops)}"]`, { force: true, timeout: 2000 }).catch(() => {}); did = 'ir a una parada'; }
                }
            } else if (await vis('#introView')) { await clickOne('#introView button'); did = 'introducción'; }
        } catch (e) { note(`El mono tropezó: ${String(e.message).split('\n')[0].slice(0, 120)}`, label); }
        // En el combate hay ratos sin nada que pulsar (aturdido: el turno pasa solo; el enemigo actuando): se espera.
        // Solo es una pantalla sin salida si pasan 12 segundos seguidos sin poder hacer nada.
        if (did) { count(did); idle = 0; idleSince = 0; } else if (!idleSince) { idleSince = Date.now(); } else if (Date.now() - idleSince > 12000) { idleSince = 0; note('Pantalla sin salida: no hay nada que pulsar', `${label} · ${await page.evaluate(() => [...document.querySelectorAll('.rpg-view')].filter(v => getComputedStyle(v).display !== 'none').map(v => v.id).join())}`); await page.reload({ waitUntil: 'load' }); await sleep(600); }
        await sleep(40);
        // Lo que no puede pasar nunca
        if (totals.actions % 15 === 0) {
            const s = await page.evaluate(() => {
                const m = window.gameMeta, hudGold = document.querySelector('[data-hud="gold"]'), adv = document.getElementById('rpgAdventureView'), hero = document.querySelector('.adv-hero');
                const saved = JSON.parse(localStorage.getItem('easy-hero-meta') || 'null');
                return { gold: m.gold, potions: m.potions, mana: m.manaPotions, crystals: m.crystals || 0, gear: m.advGear || [], weapon: m.advWeapon, armor: m.advArmor,
                    advOn: adv && getComputedStyle(adv).display !== 'none', hud: hudGold ? Number(hudGold.textContent) : null, savedGold: saved && saved.gold,
                    hero: hero ? { armor: hero.dataset.armor, ok: hero.complete && hero.naturalWidth > 0 } : null, panel: getComputedStyle(document.getElementById('panelOverlay')).display !== 'none',
                    shop: getComputedStyle(document.getElementById('rpgShopView')).display !== 'none', scroll: document.documentElement.scrollWidth > window.innerWidth + 1,
                    where: [...document.querySelectorAll('.rpg-view')].filter(v => getComputedStyle(v).display !== 'none').map(v => v.id).join() + (getComputedStyle(document.getElementById('panelOverlay')).display !== 'none' ? ' + panel ' + ((document.querySelector('#panelBody > *') || {}).className || '') : ''),
                    wide: (() => { let worst = null; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > window.innerWidth + 1 && (!worst || r.right > worst.r)) worst = { r: Math.round(r.right), c: (el.className && String(el.className).slice(0, 40)) || el.tagName }; } return worst; })() };
            }).catch(() => null);
            if (s) {
                if (!(s.gold >= 0) || !Number.isInteger(s.gold)) note(`Oro imposible: ${s.gold}`, label);
                if (s.potions > 3 || s.mana > 3) note(`Más pociones que el tope (${s.potions} y ${s.mana})`, label);
                if (s.crystals > 9) note(`Más cristales que el tope (${s.crystals})`, label);
                if (new Set(s.gear).size !== s.gear.length) note('Una pieza de equipo duplicada en el inventario', label);
                if (s.weapon && s.weapon !== 'espada-de-hierro' && !s.gear.includes(s.weapon)) note(`Lleva puesta un arma que no tiene (${s.weapon})`, label);
                if (s.armor && s.armor !== 'armadura-de-acero' && !s.gear.includes(s.armor)) note(`Lleva puesta una armadura que no tiene (${s.armor})`, label);
                if (s.advOn && !s.panel && !s.shop && s.hud != null && s.hud !== s.gold) note(`La barra dice ${s.hud} de oro y tienes ${s.gold}`, label);
                if (s.savedGold != null && s.savedGold !== s.gold && s.advOn && !s.panel) note(`El guardado tiene ${s.savedGold} de oro y la partida ${s.gold}`, label);
                if (s.advOn && s.hero && s.hero.armor && !s.hero.ok) note('El héroe del mapa se quedó sin dibujo', label);
                if (s.scroll) note(`La página tiene scroll horizontal en ${s.where}${s.wide ? ` (se sale «${s.wide.c}», hasta ${s.wide.r} px)` : ''}`, label);
            }
        }
    }
    await ctx.close();
}

const T0 = Date.now();
console.log(`🐒 Prueba de aguante: ${MINUTES} minutos`);
await turn('pobre, escritorio', {}, MINUTES * 0.35, { width: 1440, height: 900 });
console.log(`  turno 1 hecho: ${totals.actions} acciones`);
await turn('rico, escritorio', { gold: 9000, charLevel: 6, primary: { str: 6, dex: 0, int: 0, vit: 4 }, statPoints: 4 }, MINUTES * 0.4, { width: 1440, height: 900 });
console.log(`  turno 2 hecho: ${totals.actions} acciones`);
await turn('rico, móvil', { gold: 9000, charLevel: 6, primary: { str: 6, dex: 0, int: 0, vit: 4 } }, MINUTES * 0.25, { width: 390, height: 844 });
await browser.close();
server.close();

const rows = [...problems.entries()].sort((a, b) => b[1].n - a[1].n);
const md = `# 🐒 Prueba de aguante en el navegador

> Generado por \`node tests/soak.test.mjs\` el ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${((Date.now() - T0) / 60000).toFixed(1)} minutos · versión ${JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version}.

Un «mono» jugó al juego de verdad en tres turnos (recién llegado en escritorio, con 9000 de oro en escritorio y con 9000 de oro en el móvil), pulsando al azar lo que había en pantalla.

**${totals.actions.toLocaleString('es-ES')} acciones · ${totals.fights} combates (${totals.wins} victorias, ${totals.falls} caídas) · ${totals.buys} compras · ${totals.sells} ventas · ${totals.equips} cambios de equipo · ${totals.sleeps} noches · ${totals.talks} líneas de diálogo · escenas pisadas: ${[...totals.scenes].join(', ')}.**

## Resultado: ${rows.length ? `${rows.length} problema(s)` : 'sin problemas'}

${rows.length ? rows.map(([t, e]) => `- ❌ ${t} — ${e.n} ${e.n === 1 ? 'vez' : 'veces'} (primera: ${e.first})`).join('\n') : 'Ni un error de JavaScript, ni una pantalla sin salida, ni una cifra imposible.'}

## Qué hizo

${Object.entries(totals.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n.toLocaleString('es-ES')}`).join('\n')}
`;
fs.writeFileSync(path.join(root, 'docs', 'pruebas-largas-navegador.md'), md);
console.log(`\n📊 RESULTS: ${rows.length ? 0 : 1} passed, ${rows.length} failed`);
console.log(`Informe: docs/pruebas-largas-navegador.md · ${totals.actions} acciones, ${rows.length} problema(s)`);
process.exit(0);
