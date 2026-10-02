// =============================================
// 🌐 RPG-pack — flujo completo en el navegador (Playwright)
// Levanta su propio servidor estático: no necesita Python ni nada en marcha.
// Con SHOT_DIR=<carpeta> guarda capturas de pantalla para revisar el aspecto.
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
    try {
        const body = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'text/plain' });
        res.end(body);
    } catch {
        res.writeHead(404); res.end('not found');
    }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
// ?inicio: la pantalla de la mazmorra como antes (sin introducción ni entrada directa a la aventura)
const url = `http://127.0.0.1:${server.address().port}/index.html?inicio`;

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// El juego está en modo pruebas (la tienda lo da gratis): estas pruebas miran los precios de verdad
const realPrices = p => p.evaluate(async () => {
    const v = document.querySelector('script[type=module]').src.split('?')[1];
    (await import(`./src/data/balance.js?${v}`)).RPG_BALANCE.freeShop = false;
});
// Arriba del todo: los helpers de más abajo (takeLoot…) la usan desde la primera sección
const visible = sel => page.$eval(sel, el => getComputedStyle(el).display !== 'none').catch(() => false);
const shotDir = process.env.SHOT_DIR || '';
const shot = name => path.join(shotDir || os_tmp(), `${name}.png`);
function os_tmp() { return process.env.TEMP || process.env.TMPDIR || '/tmp'; }

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await sleep(500);

await page.waitForFunction(() => getComputedStyle(document.getElementById('rpgStartView')).opacity === '1', null, { timeout: 15000 });
console.log('\n🗡️ Inicio — la Carta de Héroe');
const cardBox = await (await page.$('#rpgHeroCard')).boundingBox();
assert('La Carta de Héroe y el botón Comenzar son visibles en pantalla', !!cardBox && cardBox.width > 0 && await page.isVisible('#btnRpgStart'));
const heroCardText = await page.$eval('#rpgHeroCard', el => el.textContent);
assert('La carta muestra ATK 1 / HP 25 y ninguna DEF',
    /ATK\s*1\b/.test(heroCardText) && /HP\s*25\b/.test(heroCardText) && !/DEF/.test(heroCardText));
assert('Solo hay RPG: sin motor ni datos del Easy Hit original', await page.evaluate(() =>
    typeof window.Engine.OFFICIAL_CARDS === 'undefined' && typeof window.Engine.ULTIMATE_DB === 'undefined'
    && typeof window.Engine.MAX_FERVOR === 'undefined' && !document.getElementById('tab-library')));

assert('La cabecera muestra la versión del juego (la misma de package.json)',
    (await page.$eval('.game-version', el => el.textContent)).includes(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version));

await page.click('#btnRpgStart');
await sleep(700);

console.log('\n🗺️ Mapa');
assert('El mapa dibuja nodos y un único jefe final',
    (await page.$$eval('#rpgMap .rpg-node', els => els.length)) >= 10
    && (await page.$$eval('#rpgMap .type-boss', els => els.length)) === 1);
assert('Al inicio solo se pueden pisar los nodos del primer piso (6 caminos)',
    (await page.$$eval('#rpgMap .rpg-node.is-available', els => els.length)) === 6);
assert('El mapa es largo y denso: 16 pisos y al menos 40 nodos',
    (await page.$$eval('#rpgMap .rpg-node', els => els.length)) >= 40
    && await page.evaluate(() => window.gameState.rpg.map.floors === 16));
assert('Hay nodos de evento 🎲 en el mapa y en la leyenda',
    (await page.$$eval('#rpgMap .rpg-node.type-event', els => els.length)) >= 6
    && (await page.$eval('#rpgLegend', el => el.textContent)).includes('Evento'));
// El mapa sale al azar: lo garantizado es un mínimo de hogueras por ruta (antes se pedían 5 y 1 de cada ~500 mapas trae 4)
assert('Hay hogueras 🔥 en el mapa y en la leyenda',
    (await page.$$eval('#rpgMap .rpg-node.type-campfire', els => els.length)) >= await page.evaluate(() => window.Engine.RPG_MIN_CAMPFIRES_PER_ROUTE)
    && (await page.$eval('#rpgLegend', el => el.textContent)).includes('Hoguera'));
assert('Los sub-jefes son minoría en el mapa (menos del 15 % de los nodos)',
    (await page.$$eval('#rpgMap .rpg-node.type-subboss', els => els.length)) < 0.15 * (await page.$$eval('#rpgMap .rpg-node', els => els.length)));
assert('El equipo y el personaje se ven a los lados del mapa, sin abrir nada',
    await page.isVisible('#rpgGearPanel') && await page.isVisible('#rpgHeroPanel') && (await page.$$('#rpgGearPanel .gear-slot')).length === 4
    && /Nivel/.test(await page.$eval('#rpgHeroPanel', el => el.textContent)));
assert('El panel del personaje muestra las 4 primarias', (await page.$$('#rpgHeroPanel .hero-panel-primary')).length === 4);
assert('La niebla es un hueco sin dibujar: las salas lejanas no revelan su icono',
    await page.$$eval('#rpgMap .rpg-node.is-fog', els => els.length > 0 && els.every(e => e.textContent.trim() === '')));
assert('Los pasillos se dibujan como curvas excavadas, no como líneas rectas',
    (await page.$$('#rpgMap path.rpg-tunnel')).length > 0 && (await page.$$('#rpgMap line')).length === 0);
assert('La antorcha del héroe ilumina el mapa', !!(await page.$('#rpgMap .rpg-map-light')));
await page.screenshot({ path: shot('mapa-escritorio'), fullPage: true });

console.log('\n⚔️ Combate');
await page.click('#rpgMap .rpg-node.is-available');
await sleep(400);
assert('Pulsar un monstruo abre el combate',
    await page.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none'));
const heroBox = await (await page.$('#rpgCombatHero .rpg-hud-card')).boundingBox();
const monBox = await (await page.$('#rpgCombatMonster .rpg-hud-card')).boundingBox();
assert('Panel de pergamino: tu lado a la izquierda y el del enemigo a la derecha', heroBox && monBox && heroBox.x + heroBox.width <= monBox.x);
assert('Cada lado muestra su vida con números', (await page.$$eval('.rpg-hud-card .rpg-stat.hp', els => els.length)) === 2);
const labels = await page.$$eval('#rpgCombatActions .rpg-action-label', els => els.map(e => e.textContent.trim()));
assert('Acciones a un clic: Defender, ¡Atacar!, las dos pociones (solo su imagen) y Huir', labels.join(',') === 'Defender,¡Atacar!,Huir'
    && (await page.$$('#rpgCombatActions .rpg-action.is-image .rpg-action-img')).length === 2
    && !!(await page.$('[data-rpg-action="mana_potion"]')));
assert('Barra de habilidades: 6 ranuras; Bola de fuego, Grito de guerra y Golpe poderoso con su icono y su coste, y 3 cerradas',
    (await page.$$('#rpgSkillBar .rpg-skill')).length === 6 && (await page.$$('#rpgSkillBar .rpg-skill.is-locked')).length === 3
    && (await page.$eval('#rpgSkillBar [data-rpg-skill="power_strike"] .is-energy', el => el.textContent)) === '50'
    && await page.$eval('#rpgSkillBar [data-rpg-skill="power_strike"]', el => el.disabled && /energía/.test(el.title))
    && /Bola de fuego/.test(await page.$eval('#rpgSkillBar [data-rpg-skill="fire_strike"]', el => el.title))
    && (await page.$eval('#rpgSkillBar [data-rpg-skill="fire_strike"] .is-mana', el => el.textContent)) === '5');
assert('Y barra de energía amarilla, que empieza a 0 de 100', /^0 \/ 100$/.test(await page.$eval('#rpgCombatHero .rpg-stat.en', el => el.textContent)));
assert('El héroe tiene barra de maná: 12 / 12 (la mitad de su vida inicial)', /12 \/ 12/.test(await page.$eval('#rpgCombatHero .rpg-stat.mp', el => el.textContent)));
assert('¡Atacar! es el botón protagonista (el más grande)', await page.evaluate(() => {
    const [main, ...rest] = [document.querySelector('[data-rpg-action="attack"]'), ...document.querySelectorAll('.rpg-action:not([data-main])')];
    return rest.every(b => b.offsetWidth < main.offsetWidth);
}));
assert('Estilo DragonFable: lo que hará el enemigo NO se anuncia (sin cartel de intención)', (await page.$$('#rpgCombatView .rpg-intent')).length === 0);
assert('…ni se predice en los botones: Defender no dice cuánto recibirías',
    !/Recibiría|no te ataca/.test(await page.$eval('[data-rpg-action="defend"]', el => el.title)));
assert('Sin pociones, el botón de Poción está apagado y lo explica', await page.$eval('[data-rpg-action="potion"]', el => el.disabled && /No te quedan/.test(el.title)));
assert('Escenario de lado: el fondo del bosque está pintado', /forest\.webp/.test(await page.$eval('#rpgStage', el => getComputedStyle(el).backgroundImage)));
const heroActor = await (await page.$('#rpgActorHero')).boundingBox();
const monActor = await (await page.$('#rpgActorMonster')).boundingBox();
assert('Escenario: el héroe SIEMPRE a la izquierda y el enemigo SIEMPRE a la derecha',
    heroActor && monActor && heroActor.width > 0 && heroActor.x + heroActor.width <= monActor.x);
assert('Escenario: el enemigo usa la imagen del goblin mirando a la izquierda (arte provisional para todos)',
    /goblin_left\.png$/.test(await page.$eval('#rpgActorMonster img', el => el.src)));

await page.click('[data-rpg-action="defend"]');
await sleep(150);
assert('Defender queda anotado',
    (await page.$$eval('#rpgCombatLogContent .log-entry', els => els.map(e => e.textContent).join('|'))).includes('se defiende'));
assert('El diario está plegado y enseña la última línea', await page.$eval('.rpg-combat-log', el => !el.open)
    && (await page.$eval('#rpgCombatLogLast', el => el.textContent)).length > 0);

const skillBtn = await page.$('[data-rpg-skill="fire_strike"]');
assert('Bola de fuego está a un clic, sin submenú', !!skillBtn);
await skillBtn.click();
await sleep(150);
assert('Bola de fuego inflige 5 de daño (6 → 1 HP)',
    /1\s*\/\s*6/.test(await page.$eval('#rpgCombatMonster .rpg-stat.hp', el => el.textContent)));
assert('Escenario: al golpear, la imagen del héroe se lanza hacia el enemigo',
    (await page.$eval('#rpgActorHero', el => el.getAnimations().length)) > 0);
await sleep(450);   // la embestida es pausada: el golpe llega a mitad de camino
assert('Escenario: el daño sale como número encima del enemigo (-5)',
    (await page.$$eval('#rpgStage .rpg-stage-float', els => els.map(e => e.textContent))).includes('-5'));
assert('Bola de fuego gasta 5 de maná (12 → 7) y su coste está a la vista; sin recarga, sigue disponible',
    /7 \/ 12/.test(await page.$eval('#rpgCombatHero .rpg-stat.mp', el => el.textContent))
    && await page.$eval('[data-rpg-skill="fire_strike"]', el => !el.disabled && el.querySelector('.rpg-action-badge')?.textContent === '5'));

await page.click('[data-rpg-action="flee"]');
await sleep(150);
assert('Huir muestra "Has huido"', (await page.$eval('#rpgCombatResult', el => el.textContent)).includes('Has huido'));
await page.click('#btnRpgCombatContinue');
await sleep(300);
assert('Tras huir vuelves al mapa sin avanzar',
    (await page.$$('#rpgMap .rpg-node.is-available')).length === 6
    && (await page.$$('#rpgMap .rpg-node.is-visited')).length === 0);

await page.click('#rpgMap .rpg-node.is-available');
await sleep(300);
for (let i = 0; i < 30 && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="attack"]');
    await sleep(60);
}
assert('Ganar muestra el panel de victoria', (await page.$eval('#rpgCombatResult', el => el.textContent)).includes('Victoria'));
await page.click('#btnRpgCombatContinue');
await sleep(300);
// Antes de recoger el botín: un arma del botín (1 de cada 4 combates) sí subiría el ATK, pero eso es el equipo, no ganar
assert('Ganar ya no da fuerza (viene del equipo); solo sube el nivel', await page.evaluate(() =>
    window.gameState.rpg.hero.atq === 1 && window.gameState.rpg.hero.level === 2));
await takeLoot();   // un combate normal puede soltar botín (1 de cada 4): se resuelve antes de mirar el mapa
assert('Tras ganar, el nodo pasa a ser tu posición', (await page.$$('#rpgMap .rpg-node.is-current')).length === 1);

// ---------------------------------------------
console.log('\n🎲 Eventos en el navegador');
async function finishCombat() {
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) {
        await page.click('[data-rpg-action="attack"]');
        await sleep(40);
    }
    await page.click('#btnRpgCombatContinue');
    await sleep(120);
    await takeLoot();   // el goteo de botín de los combates normales
}
async function resolveEventFirstOptions() {
    for (let i = 0; i < 8 && !(await page.$('#btnRpgEventContinue')); i++) {
        const opt = await page.$('[data-rpg-event-opt="0"]');
        if (!opt) break;
        await opt.click();
        await sleep(60);
    }
    if (await page.$('#btnRpgEventContinue')) {
        await page.click('#btnRpgEventContinue');
        await sleep(120);
        if (await visible('#rpgCombatView')) await finishCombat();
    }
}
// Botín abierto (un solo objeto desde la 1.4.1): lo equipa
async function takeLoot() {
    if (await visible('#rpgLootView')) {
        await page.click('#btnRpgLootEquip');
        await sleep(100);
    }
}
async function stepNode(node) {
    await node.click();
    await sleep(100);
    if (await visible('#rpgCombatView')) await finishCombat();
    else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
    await takeLoot();
}
// Nueva ruta con un héroe casi invencible; se camina hasta un evento y se fuerza cuál es
async function openEvent(target) {
    await page.click('#btnRpgNewMap');
    await sleep(300);
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
    for (let step = 0; step < 20; step++) {
        const ev = await page.$('#rpgMap .rpg-node.type-event.is-available');
        if (ev) {
            await page.evaluate(t => { window.gameState.rpg.usedEvents = window.Events.RPG_EVENTS.map(e => e.id).filter(id => id !== t); }, target);
            await ev.click();
            await sleep(120);
            return;
        }
        const avail = await page.$$('#rpgMap .rpg-node.is-available');
        if (!avail.length) throw new Error('sin nodos disponibles');
        await stepNode(avail[0]);
    }
    throw new Error('no se encontró un evento en la ruta');
}
const eventText = () => page.$eval('#rpgEventBody', el => el.textContent);
const heroNow = () => page.evaluate(() => JSON.parse(JSON.stringify(window.gameState.rpg.hero)));
const chips = () => page.$$eval('#rpgEventBody .rpg-event-chip', els => els.map(e => e.textContent));

// -- Evento genérico: situación + 2 decisiones + resultado
await openEvent('pozo_deseos');
assert('Pisar un nodo 🎲 abre la vista de evento (y oculta el mapa)', await visible('#rpgEventView') && !(await visible('#rpgMapView')));
assert('El evento muestra título, situación y exactamente 2 decisiones A / B',
    (await eventText()).includes('El pozo de los deseos') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2
    && (await page.$$eval('.rpg-event-option-key', els => els.map(e => e.textContent).join(''))) === 'AB');
await page.screenshot({ path: shot('evento-decision'), fullPage: true });
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 100; h.maxHp = 999; h.atq = 10; });
await page.click('[data-rpg-event-opt="1"]');           // Desear poder: +1 ATK, -4 HP
await sleep(150);
assert('Tras elegir se ve el resultado, los cambios y un botón para continuar',
    !!(await page.$('#btnRpgEventContinue')) && (await chips()).join('|') === '+1 ATK|−4 HP');
const afterPozo = await heroNow();
assert('El héroe recibe el efecto: +1 ATK y −4 HP', afterPozo.atq === 11 && afterPozo.hp === 96);
await page.screenshot({ path: shot('evento-resultado'), fullPage: true });
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('Continuar devuelve al mapa con el evento como tu posición',
    await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);
assert('El diario cuenta lo ocurrido en el evento',
    (await page.$eval('#rpgLogContent', el => el.textContent)).includes('El pozo de los deseos'));
assert('El evento visto queda anotado y no se repetirá', await page.evaluate(() => window.gameState.rpg.usedEvents.includes('pozo_deseos')));

// -- La chica herida: ayudar = emboscada
await openEvent('chica_herida');
await page.click('[data-rpg-event-opt="0"]');
await sleep(150);
assert('Ayudar a la chica: se cuenta la emboscada y el botón es "A combatir"',
    (await eventText()).includes('emboscada') && (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('COMBATIR'));
const atqBefore = (await heroNow()).atq;
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('Se abre un combate contra el Jefe de los bandidos', await visible('#rpgCombatView')
    && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Jefe de los bandidos')
    && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Emboscada'));
assert('De un combate de evento no se puede huir', await page.$eval('[data-rpg-action="flee"]', el => el.disabled));
for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) {
    await page.click('[data-rpg-action="attack"]');
    await sleep(40);
}
const resultText = await page.$eval('#rpgCombatResult', el => el.textContent);
assert('Ganar da el botín que promete el evento (+1 ATK)', resultText.includes('Victoria') && resultText.includes('botín') && resultText.includes('+1 ATK'));
assert('El héroe sube exactamente +1 ATK (no la recompensa estándar)', (await heroNow()).atq === atqBefore + 1);
await page.click('#btnRpgCombatContinue');
await sleep(200);
assert('Tras el combate de evento vuelves al mapa avanzando', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);

// -- El derrumbe: sin salida neutral, cambios visibles
await openEvent('derrumbe');
assert('El derrumbe tiene dos decisiones nombradas y ninguna es marcharse',
    (await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim())))
        .every(t => /Salvar a (Elena|Bram)/.test(t)));
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 100; h.maxHp = 200; });
await page.click('[data-rpg-event-opt="0"]');
await sleep(150);
assert('Salvar a Elena: −5 HP y +8 HP máx en pantalla', (await chips()).sort().join('|') === '+8 HP máx|−5 HP');
await page.click('#btnRpgEventContinue');
await sleep(150);

// -- El voto: héroe con etiquetas y menú de combate con la acción bloqueada
await openEvent('voto');
await page.click('[data-rpg-event-opt="1"]');            // Voto de Silencio
await sleep(120);
await page.click('#btnRpgEventContinue');
await sleep(200);
assert('El panel del héroe muestra la etiqueta "Sin habilidades"',
    (await page.$eval('#rpgHeroPanel', el => el.textContent)).includes('Sin habilidades'));
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let sawLockedSkills = false;
for (let step = 0; step < 12 && !sawLockedSkills; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (!avail.length) break;
    await avail[0].click();
    await sleep(150);
    await takeLoot();
    if (await visible('#rpgCombatView')) {
        sawLockedSkills = await page.$$eval('[data-rpg-action="skill"]', els => els.length > 0 && els.every(el => el.disabled));
        await finishCombat();
    } else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
}
assert('Con el Voto de Silencio las habilidades están bloqueadas en combate', sawLockedSkills);

// -- El puente de cuerdas: salto de piso
await openEvent('puente_cuerdas');
await page.evaluate(() => { window.__realRng = window.gameState.rpg.rng; window.gameState.rpg.rng = () => 0.1; }); // fuerza «el puente aguanta»
await page.click('[data-rpg-event-opt="0"]');
await sleep(120);
await page.evaluate(() => { window.gameState.rpg.rng = window.__realRng; });
await page.click('#btnRpgEventContinue');
await sleep(200);
const skipCheck = await page.evaluate(() => {
    const r = window.gameState.rpg;
    const cur = r.map.nodes.find(n => n.id === r.currentId);
    const avail = window.Engine.rpgAvailableNodes(r.map, r.currentId, r.skipNext).map(id => r.map.nodes.find(n => n.id === id).floor);
    return { skipNext: r.skipNext, curFloor: cur.floor, avail };
});
assert('El puente aguanta: el siguiente paso salta un piso', skipCheck.skipNext === true && skipCheck.avail.length > 0 && skipCheck.avail.every(f => f === skipCheck.curFloor + 2));
assert('En pantalla solo se pueden pisar nodos dos pisos por delante',
    (await page.$$eval('#rpgMap .rpg-node.is-available', els => els.length)) === skipCheck.avail.length);
await stepNode(await page.$('#rpgMap .rpg-node.is-available'));
// El nodo de destino es al azar: un evento puede acabar en combate o en botín. Se termina el paso antes de comprobar
for (let i = 0; i < 6 && !(await visible('#rpgMapView')); i++) {
    if (await visible('#rpgCombatView')) await finishCombat();
    else if (await visible('#rpgEventView')) await resolveEventFirstOptions();
    await takeLoot();
}
assert('Tras usar el salto se vuelve a avanzar de piso en piso', await page.evaluate(() => window.gameState.rpg.skipNext === false));

// -- El Lector: 3 preguntas, dos respuestas cada una
await openEvent('lector');
await page.click('[data-rpg-event-opt="0"]');            // Plantarle cara
await sleep(100);
let asked = 0;
for (let i = 0; i < 3; i++) {
    const info = await page.evaluate(() => {
        const st = window.gameState.rpg.event.session.state;
        const q = st.qs[st.i];
        return { right: q.right, count: document.querySelectorAll('#rpgEventBody [data-rpg-event-opt]').length, text: document.getElementById('rpgEventBody').textContent, q: q.q };
    });
    if (info.count === 2 && info.text.includes(info.q) && info.text.includes(`Pregunta ${i + 1} de 3`)) asked++;
    if (i === 0) await page.screenshot({ path: shot('lector-pregunta'), fullPage: true });
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim().replace(/^[AB]/, '')));
    await page.click(`[data-rpg-event-opt="${opts.indexOf(info.right)}"]`);
    await sleep(100);
}
assert('El Lector plantea 3 preguntas, cada una con 2 respuestas', asked === 3);
assert('Con 3 aciertos se evita el combate: +2 ATK y +8 HP máx',
    !!(await page.$('#btnRpgEventContinue')) && (await eventText()).includes('Puedes pasar')
    && (await chips()).join('|') === '+2 ATK|+8 HP máx'
    && (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('CONTINUAR'));
await page.click('#btnRpgEventContinue');
await sleep(150);

// -- El Lector: fallar todo = combate contra un enemigo que lee tus movimientos
await openEvent('lector');
await page.evaluate(() => {
    const h = window.gameState.rpg.hero;
    // Equipo limpio: un arma con reglas recogida antes en la prueba (golpe furtivo, frenesí…) podría rematarlo
    // de un solo golpe y el combate nunca llegaría a la segunda ronda que esta prueba necesita.
    h.equipment = { weapon: window.Items.createStarterItem(), secondary: null, armor: null, accessory: null };
    h.atq = 1; h.hp = h.maxHp = 9999;
});
await page.click('[data-rpg-event-opt="0"]');
await sleep(100);
for (let i = 0; i < 3; i++) {
    const wrong = await page.evaluate(() => { const st = window.gameState.rpg.event.session.state; return st.qs[st.i].wrong; });
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent.trim().replace(/^[AB]/, '')));
    await page.click(`[data-rpg-event-opt="${opts.indexOf(wrong)}"]`);
    await sleep(100);
}
assert('Fallar las 3 preguntas lleva a un combate', (await page.$eval('#btnRpgEventContinue', el => el.textContent)).includes('COMBATIR'));
await page.click('#btnRpgEventContinue');
await sleep(200);
const lectorCard = await page.$eval('#rpgCombatMonster', el => el.textContent);
assert('El Lector aparece como "Enemigo inteligente" y avisa de que lee tus movimientos',
    lectorCard.includes('El Lector') && lectorCard.includes('Enemigo inteligente') && lectorCard.includes('Lee tus movimientos'));
await page.click('[data-rpg-action="attack"]');
await sleep(100);
assert('Tras atacar, recuerda ATACAR y avisa de que repetirla hace golpe doble',
    (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Recuerda ATACAR'));
await page.click('[data-rpg-action="attack"]');
await sleep(100);
assert('Repetir el ataque dispara el golpe doble en el registro',
    (await page.$eval('#rpgCombatLogContent', el => el.textContent)).includes('lee tus movimientos'));
await page.screenshot({ path: shot('combate-lector'), fullPage: true });
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; });
await finishCombat();

// ---------------------------------------------
async function walkTo(type) {
    await page.click('#btnRpgNewMap');
    await sleep(300);
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
    for (let step = 0; step < 25; step++) {
        const target = await page.$(`#rpgMap .rpg-node.type-${type}.is-available`);
        if (target) return target;
        const avail = await page.$$('#rpgMap .rpg-node.is-available');
        if (!avail.length) throw new Error('sin nodos disponibles');
        await stepNode(avail[0]);
    }
    throw new Error(`no se encontró un nodo ${type} en la ruta`);
}

console.log('\n🔥 Hoguera');
{
    const camp = await walkTo('campfire');
    // Sin armadura ni accesorio: el equipo al azar podría llevar «Calidez» y curar más del 30 %
    await page.evaluate(() => { const h = window.gameState.rpg.hero; h.hp = 50; h.maxHp = 100; h.equipment.armor = null; h.equipment.accessory = null; });
    await camp.click();
    await sleep(150);
    assert('Pisar una hoguera abre la vista de descanso con 2 decisiones', await visible('#rpgEventView')
        && (await eventText()).includes('Hoguera') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2);
    const opts = await page.$$eval('.rpg-event-option', els => els.map(e => e.textContent));
    assert('Las opciones son Descansar (con la cura a la vista) y Equiparte', /Descansar.*30 %/.test(opts[0]) && /Equiparte/.test(opts[1]));
    await page.screenshot({ path: shot('hoguera'), fullPage: true });
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    assert('Descansar cura el 30 % de la vida máxima (+30 HP) y lo muestra', (await chips()).join('|') === '+30 HP' && (await heroNow()).hp === 80);
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('La hoguera queda como tu posición en el mapa', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-campfire')).length === 1);
    assert('La hoguera cuenta en la partida y no gasta ningún evento del catálogo',
        await page.evaluate(() => window.gameState.rpg.stats.campfires === 1 && !window.gameState.rpg.usedEvents.includes('hoguera')));

    const camp2 = await walkTo('campfire');
    await camp2.click();
    await sleep(150);
    await page.click('[data-rpg-event-opt="1"]');
    await sleep(150);
    assert('Equiparte no cambia nada por sí solo', (await chips()).length === 0);
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('…y abre el botín de la hoguera: un objeto, 🟢 o mejor',
        await visible('#rpgLootView') && (await page.$$('.rpg-loot-card')).length === 1
        && (await page.$eval('.rpg-loot-card', el => el.dataset.rarity !== 'comun')));
    await takeLoot();
    assert('Tras elegir vuelves al mapa con el objeto equipado', await visible('#rpgMapView')
        && await page.evaluate(() => Object.values(window.gameState.rpg.hero.equipment).filter(Boolean).length >= 2));
}

console.log('\n🧍 Personaje: equipo, inventario y oro');
{
    // El botín de la hoguera anterior pudo tocar cualquier ranura al azar: se deja el equipo limpio y predecible
    await page.evaluate(() => { window.gameState.rpg.hero.equipment = { weapon: window.Items.createStarterItem(), secondary: null, armor: null, accessory: null }; });
    await page.click('#btnRpgChar');
    await sleep(200);
    assert('El botón Personaje abre una vista propia, no un panel superpuesto', await visible('#rpgCharView') && !(await visible('#rpgMapView')) && !(await visible('#panelOverlay')));
    assert('Se ven las 4 ranuras del muñeco, el inventario y el oro acumulado',
        (await page.$$('.char-doll-slot')).length === 4 && !!(await page.$('.char-inventory-grid')) && /🪙/.test(await page.$eval('#charBody', el => el.textContent)));
    assert('Nada seleccionado todavía: el panel de detalle lo dice', /Toca una ranura/.test(await page.$eval('#charDetail', el => el.textContent)));

    await page.click('.char-doll-slot[data-char-slot="weapon"]');
    await sleep(150);
    assert('Pulsar la ranura del arma (con la espada inicial) muestra su detalle y ofrece guardar/descartar',
        /Espada de hierro/.test(await page.$eval('#charDetail', el => el.textContent))
        && !!(await page.$('[data-char-action="store"]')) && !!(await page.$('[data-char-action="discard"]')));
    await page.click('.char-doll-slot[data-char-slot="weapon"]');
    await sleep(100);
    assert('Pulsarla otra vez la deselecciona', /Toca una ranura/.test(await page.$eval('#charDetail', el => el.textContent)));
    await page.screenshot({ path: shot('personaje'), fullPage: true });

    await page.click('#btnCharBack');
    await sleep(150);
    assert('VOLVER AL MAPA deja el mapa tal cual estaba', await visible('#rpgMapView'));

    // Cofre → GUARDAR EN EL INVENTARIO (en vez de equipar o descartar)
    const chest = await walkTo('chest');
    await chest.click();
    await sleep(200);
    const invBefore = (await page.evaluate(() => window.gameState.rpg.hero.inventory.length));
    assert('El botín ofrece EQUIPAR, GUARDAR y DESCARTAR', !!(await page.$('#btnRpgLootEquip')) && !!(await page.$('#btnRpgLootStore')) && !!(await page.$('#btnRpgLootDiscard')));
    await page.click('#btnRpgLootStore');
    await sleep(150);
    assert('Guardar vuelve al mapa sin tocar el equipo, y el objeto pasa al inventario',
        await visible('#rpgMapView') && (await page.evaluate(() => window.gameState.rpg.hero.inventory.length)) === invBefore + 1);

    // Desde Personaje: equipar ese objeto guardado (lo que llevabas puesto vuelve al inventario)
    await page.click('#btnRpgChar');
    await sleep(200);
    const invSlot = await page.$('.char-inv-slot:not(.is-empty)');
    await invSlot.click();
    await sleep(120);
    assert('Elegir un objeto del inventario ofrece EQUIPAR (no guardar: ya está guardado)',
        !!(await page.$('[data-char-action="equip"]')) && !(await page.$('[data-char-action="store"]')));
    const before = await page.evaluate(() => ({ inv: window.gameState.rpg.hero.inventory.length, eq: JSON.stringify(window.gameState.rpg.hero.equipment) }));
    await page.click('[data-char-action="equip"]');
    await sleep(150);
    const after = await page.evaluate(() => ({ inv: window.gameState.rpg.hero.inventory.length, eq: JSON.stringify(window.gameState.rpg.hero.equipment) }));
    // Si la ranura estaba ocupada, lo anterior vuelve al inventario (mismo recuento); si estaba vacía, el inventario baja en 1
    assert('Equipar desde el inventario cambia el equipo y el inventario nunca crece',
        after.eq !== before.eq && after.inv <= before.inv);

    console.log('\n🧬 Nivel de personaje (STR/DEX/INT/VIT): permanente, con puntos por repartir');
    // Los combates previos de esta prueba ya han dado algo de XP: se deja en cero para partir de un estado conocido
    await page.evaluate(() => { window.gameMeta.statPoints = 0; });
    await page.click('#btnCharBack'); // aún estábamos en Personaje tras el paso anterior; se recarga la vista
    await sleep(100);
    await page.click('#btnRpgChar');
    await sleep(150);
    assert('Sin puntos por repartir, no aparece ningún botón de +1', (await page.$$('[data-char-spend]')).length === 0);
    const primaryBefore = await page.evaluate(() => window.gameState.rpg.hero.primary.vit);
    await page.evaluate(() => { window.gameMeta.statPoints = 3; }); // como si se acabara de subir de nivel
    await page.click('#btnCharBack');
    await sleep(100);
    await page.click('#btnRpgChar'); // recargar la vista para que se vea el reparto
    await sleep(150);
    assert('Con puntos disponibles, aparece un botón +1 por cada una de las 4 primarias', (await page.$$('[data-char-spend]')).length === 4);
    await page.screenshot({ path: shot('personaje-nivel'), fullPage: true });
    await page.click('[data-char-spend="vit"]');
    await sleep(150);
    const afterState = await page.evaluate(() => ({ primaryVit: window.gameState.rpg.hero.primary.vit, metaVit: window.gameMeta.primary.vit, points: window.gameMeta.statPoints, maxHp: window.gameState.rpg.hero.maxHp }));
    assert('Gastar un punto en VIT sube esa primaria y la vida máxima de verdad, y descuenta el punto',
        afterState.primaryVit === primaryBefore + 1 && afterState.points === 2 && afterState.maxHp > 25);
    assert('El punto invertido se guarda en el progreso permanente (meta), no solo en la ruta', afterState.metaVit === 1);
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    const afterReload = await page.evaluate(() => window.gameMeta.primary.vit);
    assert('Sobrevive a recargar la página: es permanente de verdad', afterReload === 1);
    await page.click('#btnRpgContinue');
    await sleep(300);
    await page.click('#btnRpgChar');
    await sleep(150);
    assert('Al retomar la ruta, el punto ya invertido se ve reflejado en el héroe (base 5 + 1 invertido)',
        (await page.evaluate(() => window.gameState.rpg.hero.primary.vit)) === primaryBefore + 1);
    await page.click('#btnCharBack');
    await sleep(150);
    await page.click('#btnRpgNewMap');
    await sleep(400);
    assert('Y en una ruta completamente NUEVA, el punto permanente sigue ahí (empieza igual salvo por lo invertido)',
        (await page.evaluate(() => window.gameState.rpg.hero.primary.vit)) === primaryBefore + 1);

    // Limpieza: el punto es permanente A PROPÓSITO (así lo decidió el usuario), pero el resto de pruebas de este
    // mismo archivo asumen una cuenta nueva sin nada invertido — se retira aquí para no contaminarlas.
    await page.evaluate(() => { window.gameMeta.primary = { str: 0, dex: 0, int: 0, vit: 0 }; });
}

// Abre un combate concreto (héroe con 500 de vida y 1 de ATK) para probar la interfaz sin depender del mapa
async function showCombat(type, floor, heroHp = 500) {
    await page.evaluate(({ type, floor, heroHp }) => {
        const r = window.gameState.rpg;
        // Equipo limpio: el botín recogido en pasos anteriores no debe alterar estas pruebas deterministas
        r.hero.equipment = { weapon: window.Items.createStarterItem(), secondary: null, armor: null, accessory: null };
        r.hero.guard = 0; r.hero.skillMods = {};
        r.hero.hp = heroHp; r.hero.maxHp = Math.max(heroHp, r.hero.maxHp); r.hero.atq = 1;
        r.combat = window.Engine.createRpgCombat(r.hero, window.Engine.createRpgMonster(type, floor), r.rng);
        r.pendingNodeId = r.map.nodes[0].id; r.combatMenu = 'main';
        window.UI.toggleRpgView('rpgCombatView');
        window.UI.hideRpgCombatResult(); window.UI.clearRpgCombatLog();
        window.UI.renderRpgCombat(r.combat, { menu: 'main' });
    }, { type, floor, heroHp });
    await sleep(150);
}

console.log('\n🫥 Patrones ocultos (estilo DragonFable) y pociones');
{
    const heroHp = () => page.evaluate(() => window.gameState.rpg.hero.hp);
    const logText = () => page.$$eval('#rpgCombatLogContent .log-entry', els => els.map(e => e.textContent).join('|'));

    // Orco (piso 8): sigue cargando y luego golpeando fuerte, pero ya no lo anuncia
    await showCombat('monster', 7);
    assert('El Orco no anuncia nada antes de actuar', (await page.$$('#rpgCombatView .rpg-intent')).length === 0);
    await page.click('[data-rpg-action="defend"]');
    await sleep(150);
    assert('Su patrón sigue ahí: primero reúne fuerzas y no te toca (el diario lo delata)',
        await heroHp() === 500 && /reúne fuerzas/.test(await logText()));
    assert('Lo siguiente es un golpe fuerte: una frase lo avisa sobre el escenario, sin cifras',
        await visible('#rpgStageCaption') && !/\d/.test(await page.$eval('#rpgStageCaption', el => el.textContent)));
    assert('…y el enemigo brilla en rojo mientras lo prepara', await page.$eval('#rpgActorMonster', el => el.classList.contains('is-winding')));
    await page.click('[data-rpg-action="defend"]');
    await sleep(150);
    assert('Tras soltar el golpe, la frase y el brillo desaparecen',
        !(await visible('#rpgStageCaption')) && !(await page.$eval('#rpgActorMonster', el => el.classList.contains('is-winding'))));

    // Esqueleto (piso 6): se protege primero; la pista de Atacar NO lo delata
    await showCombat('monster', 5);
    await page.evaluate(() => { window.gameState.rpg.hero.atq = 6; window.UI.renderRpgCombat(window.gameState.rpg.combat); });
    assert('Tu ataque dice su daño completo aunque el enemigo vaya a protegerse (no se adelanta nada)',
        /6 de daño/.test(await page.$eval('[data-rpg-action="attack"]', el => el.title)));
    const mhp = await page.evaluate(() => window.gameState.rpg.combat.monster.hp);
    await page.click('[data-rpg-action="attack"]');
    await sleep(150);
    assert('Pero al golpear se protege: hace la mitad (6 → 3) y el diario lo cuenta',
        mhp - (await page.evaluate(() => window.gameState.rpg.combat.monster.hp)) === 3 && /se protege/.test(await logText()));

    // Pociones: 40 % de la vida máxima, gastan turno, son tuyas entre partidas
    await showCombat('monster', 0);
    await page.evaluate(() => {
        const r = window.gameState.rpg;
        r.hero.hp = 100; window.gameMeta.potions = 2; r.combat.potions = 2;
        window.UI.renderRpgCombat(r.combat);
    });
    assert('Con pociones, el botón las cuenta', (await page.$eval('[data-rpg-action="potion"] .rpg-action-badge', el => el.textContent)) === '2'
        && !(await page.$eval('[data-rpg-action="potion"]', el => el.disabled)));
    const turnBefore = await page.evaluate(() => window.gameState.rpg.combat.turn);
    await page.click('[data-rpg-action="potion"]');
    await sleep(250);
    const after = await page.evaluate(() => ({ hp: window.gameState.rpg.hero.hp, left: window.gameState.rpg.combat.potions, meta: window.gameMeta.potions, turn: window.gameState.rpg.combat.turn }));
    assert('Beber cura el 40 % de la vida máxima (500 → +200) y el enemigo responde (gasta el turno)',
        after.hp >= 100 + 200 - 10 && after.hp <= 300 && after.turn === turnBefore + 1);
    assert('La poción se gasta en el combate y en tu progreso (quedan 1)', after.left === 1 && after.meta === 1);
    assert('La curación sale como número verde sobre el héroe',
        (await page.$$eval('#rpgStage .rpg-stage-float.is-heal', els => els.map(e => e.textContent))).includes('+200'));
    await page.evaluate(() => { const r = window.gameState.rpg; r.hero.hp = r.hero.maxHp; window.UI.renderRpgCombat(r.combat); });
    assert('Con la vida al máximo no se puede beber', await page.$eval('[data-rpg-action="potion"]', el => el.disabled && /al máximo/.test(el.title)));
    await page.evaluate(() => { const r = window.gameState.rpg; r.combat = null; r.combatResult = null; window.UI.hideRpgCombatResult(); });

    // La Forja vende pociones a precio fijo, con tope
    await realPrices(page);
    await page.evaluate(() => { window.gameMeta.gold = 100; window.gameMeta.potions = 0; window.UI.renderShop(window.gameMeta); window.UI.toggleRpgView('rpgShopView'); });
    await page.click('[data-shop-buy="potion"]');
    await sleep(100);
    assert('La Forja vende la poción a 20 de oro', await page.evaluate(() => window.gameMeta.potions === 1 && window.gameMeta.gold === 80));
    await page.evaluate(() => { window.gameMeta.potions = 3; window.UI.renderShop(window.gameMeta); });
    assert('Con 3 pociones encima ya no se pueden comprar más', await page.$eval('[data-shop-buy="potion"]', el => el.disabled));
    // Limpieza: el resto de pruebas asumen una cuenta sin pociones ni oro extra
    await page.evaluate(() => { window.gameMeta.potions = 0; window.gameMeta.gold = 0; window.UI.toggleRpgView('rpgMapView'); });
}

console.log('\n🏁 Fin de partida');
{
    await page.click('#btnRpgNewMap');
    await sleep(300);
    const start = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, map: JSON.stringify(window.gameState.rpg.map) }));
    await page.evaluate(() => { window.gameState.rpg.hero.hp = 1; });
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) {
        await page.click('[data-rpg-action="attack"]');
        await sleep(40);
    }
    assert('Al caer, el panel de combate ofrece VER RESUMEN', (await page.$eval('#btnRpgCombatContinue', el => el.textContent)).includes('VER RESUMEN'));
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    const endText = await page.$eval('#rpgEndBody', el => el.textContent);
    assert('Aparece la pantalla de fin de partida (derrota)', await visible('#rpgEndView') && !(await visible('#rpgCombatView')) && endText.includes('Has caído') && endText.includes('💀'));
    assert('La derrota dice quién te ha vencido y en qué piso', endText.includes('Slime') && endText.includes('piso 1 de 15'));
    assert('La derrota incluye la línea de «casi» con el % de vida que le quedaba', /¡Casi!|aún conservaba/.test(endText) && /\d+ %/.test(endText));
    assert('El resumen muestra 7 datos: combates, eventos, hogueras, cofres, ATK, HP máx y oro', (await page.$$('#rpgEndBody .rpg-end-stat')).length === 7);
    assert('Se muestra la semilla con su código (XXXX-XXX) y se puede copiar',
        /^[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(await page.$eval('#rpgEndSeed', el => el.textContent)) && !!(await page.$('#btnRpgCopySeed')));
    assert('Hay tres salidas: nueva ruta, repetir con la misma semilla e inicio',
        !!(await page.$('#btnRpgEndNew')) && !!(await page.$('#btnRpgEndRepeat')) && !!(await page.$('#btnRpgEndHome')));
    await page.screenshot({ path: shot('fin-derrota'), fullPage: true });

    await page.click('#btnRpgEndRepeat');
    await sleep(400);
    const again = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, map: JSON.stringify(window.gameState.rpg.map), atq: window.gameState.rpg.hero.atq, hp: window.gameState.rpg.hero.hp }));
    assert('REPETIR CON LA MISMA SEMILLA da el mismo mapa exacto y un héroe nuevo', await visible('#rpgMapView') && again.seed === start.seed && again.map === start.map && again.atq === 1 && again.hp === 25);

    await page.evaluate(() => { window.gameState.rpg.hero.hp = 1; });
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    await page.click('#btnRpgEndNew');
    await sleep(400);
    const fresh = await page.evaluate(() => ({ seed: window.gameState.rpg.seed, atq: window.gameState.rpg.hero.atq }));
    assert('NUEVA RUTA empieza otra partida con otra semilla', await visible('#rpgMapView') && fresh.seed !== start.seed && fresh.atq === 1);
}

console.log('\n🌱 Semilla');
{
    await page.click('#btnRpgAbandon');
    await sleep(200);
    const mapOf = async text => {
        await page.fill('#rpgSeedInput', text);
        await page.click('#btnRpgStart');
        await sleep(300);
        const m = await page.evaluate(() => JSON.stringify(window.gameState.rpg.map));
        await page.click('#btnRpgAbandon');
        await sleep(200);
        return m;
    };
    const a1 = await mapOf('mi ruta secreta');
    const a2 = await mapOf('MI-RUTA  secreta');
    const b = await mapOf('otra ruta');
    assert('La misma semilla escrita a mano da siempre el mismo mapa (sin importar mayúsculas, espacios ni guiones)', a1 === a2);
    assert('Otra semilla da otro mapa', a1 !== b);
}

console.log('\n💾 Guardar y retomar');
{
    const goStart = async () => { await page.reload({ waitUntil: 'load' }); await sleep(500); };
    const seedText = () => page.evaluate(() => window.gameState.rpg.seed);
    await page.evaluate(() => localStorage.clear());
    await goStart();
    assert('Sin partida guardada no aparece el botón de continuar', !(await visible('#btnRpgContinue')));

    // 1) A mitad de un combate
    await page.click('#btnRpgStart');
    await sleep(300);
    const seed1 = await seedText();
    await (await page.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    await page.click('[data-rpg-action="attack"]');
    await sleep(150);
    const inFight = await page.evaluate(() => { const c = window.gameState.rpg.combat; return { mhp: c.monster.hp, hhp: window.gameState.rpg.hero.hp, intent: JSON.stringify(c.monster.intent), turn: c.turn, name: c.monster.name }; });
    await goStart();
    assert('Tras recargar, en el inicio aparece CONTINUAR con el piso, la vida y la semilla', await visible('#btnRpgContinue')
        && /CONTINUAR/.test(await page.$eval('#btnRpgContinue', el => el.textContent)) && /HP/.test(await page.$eval('#btnRpgContinue', el => el.textContent)));
    await page.click('#btnRpgContinue');
    await sleep(300);
    const restored = await page.evaluate(() => { const c = window.gameState.rpg.combat; return { mhp: c.monster.hp, hhp: window.gameState.rpg.hero.hp, intent: JSON.stringify(c.monster.intent), turn: c.turn, name: c.monster.name, seed: window.gameState.rpg.seed }; });
    assert('Retomas EN MEDIO DEL COMBATE: mismo enemigo, misma vida, misma ronda y el mismo plan (oculto) del enemigo',
        await visible('#rpgCombatView') && restored.mhp === inFight.mhp && restored.hhp === inFight.hhp && restored.turn === inFight.turn
        && restored.intent === inFight.intent && restored.name === inFight.name && restored.seed === seed1);
    assert('El combate retomado se ve completo: vida del enemigo, las 5 acciones y la barra de habilidades',
        (await page.$$('#rpgCombatActions .rpg-action')).length === 5 && (await page.$$('#rpgSkillBar .rpg-skill')).length === 6 && !!(await page.$('#rpgCombatMonster .rpg-stat.hp')));
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(250);
    await takeLoot();   // si el combate soltó botín, se resuelve: si no, el guardado retomaría el botín y no el mapa

    // 2) En el mapa
    const onMap = await page.evaluate(() => ({ cur: window.gameState.rpg.currentId, hp: window.gameState.rpg.hero.hp, atq: window.gameState.rpg.hero.atq, visited: window.gameState.rpg.visitedIds.length, mapJson: JSON.stringify(window.gameState.rpg.map) }));
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    const backOnMap = await page.evaluate(() => ({ cur: window.gameState.rpg.currentId, hp: window.gameState.rpg.hero.hp, atq: window.gameState.rpg.hero.atq, visited: window.gameState.rpg.visitedIds.length, mapJson: JSON.stringify(window.gameState.rpg.map) }));
    assert('Retomas EN EL MAPA: misma posición, mismo héroe, mismo recorrido y mismo mapa',
        await visible('#rpgMapView') && JSON.stringify(backOnMap) === JSON.stringify(onMap));
    assert('El nodo actual se ve marcado y los siguientes están disponibles', (await page.$$('#rpgMap .rpg-node.is-current')).length === 1 && (await page.$$('#rpgMap .rpg-node.is-available')).length >= 1);
    assert('El diario de la ruta se recupera', (await page.$$('#rpgLogContent .log-entry')).length >= 2);

    // 3) En medio de un evento (y con el resultado ya mostrado)
    await openEvent('pozo_deseos');
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas EN MEDIO DE UN EVENTO: la misma situación con sus 2 decisiones',
        await visible('#rpgEventView') && (await eventText()).includes('El pozo de los deseos') && (await page.$$('#rpgEventBody [data-rpg-event-opt]')).length === 2);
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    const chipsBefore = await chips();
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas con el RESULTADO del evento a la vista (mismos cambios y botón para seguir)',
        (await chips()).join('|') === chipsBefore.join('|') && !!(await page.$('#btnRpgEventContinue')));
    await page.click('#btnRpgEventContinue');
    await sleep(200);
    assert('Tras continuar vuelves al mapa sin haber repetido el evento', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-current.type-event')).length === 1);

    // 4) Evento con combate: se retoma el combate y, al ganar, se aplica el premio del evento una sola vez
    await openEvent('chica_herida');
    await page.click('[data-rpg-event-opt="0"]');
    await sleep(150);
    await page.click('#btnRpgEventContinue');
    await sleep(250);
    const atqBeforeFight = (await heroNow()).atq;
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas un COMBATE DE EVENTO (los bandidos)', await visible('#rpgCombatView') && (await page.$eval('#rpgCombatMonster', el => el.textContent)).includes('Jefe de los bandidos'));
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await goStart();
    await page.click('#btnRpgContinue');
    await sleep(300);
    assert('Retomas con el panel de VICTORIA a la vista, sin haber cobrado el premio dos veces',
        !!(await page.$('#btnRpgCombatContinue')) && (await heroNow()).atq === atqBeforeFight + 1);
    await page.click('#btnRpgCombatContinue');
    await sleep(250);

    // 5) Al terminar la partida, el guardado se borra
    await showCombat('monster', 5, 1); // héroe con 1 de vida contra un Esqueleto: caerá enseguida
    for (let i = 0; i < 40 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    assert('Al terminar la partida se borra el guardado', await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
    await goStart();
    assert('Tras una partida terminada no se ofrece continuar', !(await visible('#btnRpgContinue')));

    // 6) Guardados de otra versión, dañados o ausentes
    await page.evaluate(() => localStorage.setItem('easy-hero-save', JSON.stringify({ v: 999, hero: {} })));
    await goStart();
    assert('Un guardado de otra versión se descarta con un aviso y sin botón de continuar',
        !(await visible('#btnRpgContinue')) && /otra versión/.test(await page.$eval('#rpgStartNotice', el => el.textContent))
        && await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
    await page.evaluate(() => localStorage.setItem('easy-hero-save', '{esto no es json'));
    await goStart();
    assert('Un guardado dañado no rompe el juego: se descarta y se puede empezar de nuevo',
        !(await visible('#btnRpgContinue')) && await visible('#btnRpgStart'));
    await page.click('#btnRpgStart');
    await sleep(300);
    assert('Tras un guardado dañado se puede jugar con normalidad', await visible('#rpgMapView') && (await page.$$('#rpgMap .rpg-node.is-available')).length === 6);

    // 7) Sin almacenamiento (modo privado)
    const blocked = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
    const blockedErrors = [];
    blocked.on('pageerror', e => blockedErrors.push(e.message));
    await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
    await blocked.goto(url, { waitUntil: 'load' });
    await sleep(500);
    await blocked.click('#btnRpgStart');
    await sleep(300);
    await (await blocked.$('#rpgMap .rpg-node.is-available')).click();
    await sleep(200);
    assert('Con el almacenamiento bloqueado el juego sigue funcionando (sin guardar y sin errores)',
        await blocked.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none') && blockedErrors.length === 0);
    await blocked.context().close();
}

// -- Recorrido completo hasta el jefe pasando por todo tipo de nodos
console.log('\n🐉 Ruta completa hasta el jefe final (pasando por eventos y hogueras)');
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await sleep(500);
await page.click('#btnRpgStart');
await sleep(300);
await page.evaluate(() => { const h = window.gameState.rpg.hero; h.atq = 999; h.hp = h.maxHp = 999; });
let ended = false;
let eventsCrossed = 0;
let campfiresCrossed = 0;
for (let step = 0; step < 45 && !ended; step++) {
    const avail = await page.$$('#rpgMap .rpg-node.is-available');
    if (avail.length === 0) break;
    const pick = avail[0];
    const cls = await pick.evaluate(el => el.className);
    if (/type-event/.test(cls)) eventsCrossed++;
    if (/type-campfire/.test(cls)) campfiresCrossed++;
    await stepNode(pick);
    ended = await visible('#rpgTierView');
}
const winText = ended ? await page.$eval('#rpgTierBody', el => el.textContent) : '';
assert('Recorriendo la ruta se vence al jefe y la mazmorra NO acaba: se abre el tramo siguiente',
    ended && /La mazmorra sigue/.test(winText) && /La Cripta/.test(winText));
assert('Se cruzaron eventos y hogueras por el camino', eventsCrossed >= 1 && campfiresCrossed >= 1);
assert('La pantalla de tramo muestra profundidad récord, oro y el piso al que bajarías',
    (await page.$$('#rpgTierBody .rpg-tier-stat')).length === 3 && /Profundidad récord/.test(winText));
assert('Vencer al primer jefe sigue contando como ganar una ruta', await page.evaluate(() => window.gameMeta.runsWon >= 1));
await page.screenshot({ path: shot('tramo-superado'), fullPage: true });

// --- El descenso: bajar al tramo 2 ---
const beforeDescend = await page.evaluate(() => {
    const r = window.gameState.rpg;
    return { tier: r.tier, mapTier: r.map.tier, names: r.map.nodes.length };
});
await page.click('#btnRpgDescend');
await sleep(400);
const afterDescend = await page.evaluate(() => {
    const r = window.gameState.rpg;
    return {
        tier: r.tier, mapTier: r.map.tier, view: !!document.getElementById('rpgMapView').offsetParent,
        hp: r.hero.hp, maxHp: r.hero.maxHp, visited: r.visitedIds.length,
        monsterName: window.Engine.createRpgMonster('monster', 5, r.map.tier).name,
        monsterHp: window.Engine.createRpgMonster('monster', 5, r.map.tier).hp,
        baseHp: window.Engine.createRpgMonster('monster', 5, 0).hp
    };
});
assert('SEGUIR BAJANDO te lleva al tramo 2 con un mapa nuevo', afterDescend.tier === 1 && afterDescend.mapTier === 1
    && beforeDescend.tier === 0 && afterDescend.visited === 0 && afterDescend.view);
assert('Al bajar de tramo recuperas toda la vida', afterDescend.hp === afterDescend.maxHp);
assert('El tramo nuevo estrena monstruos que no salen arriba', afterDescend.monsterName === 'Osario Andante');
assert('Y pegan y aguantan bastante más que los del tramo anterior', afterDescend.monsterHp > afterDescend.baseHp * 1.4);

// Para las comprobaciones siguientes hace falta la pantalla de fin: se fuerza una derrota
await page.evaluate(() => {
    const r = window.gameState.rpg;
    const node = r.map.nodes.find(n => n.type === 'monster' && r.map.startIds.includes(n.id)) || r.map.nodes[0];
    r.hero.hp = 1; r.hero.atq = 1;
    const m = window.Engine.createRpgMonster('monster', 15, r.map.tier);
    r.combat = window.Engine.createRpgCombat(r.hero, m, r.rng);
    r.pendingNodeId = node.id;
    window.UI.toggleRpgView('rpgCombatView');
    window.UI.renderRpgCombat(r.combat, { menu: 'main' });
});
await sleep(150);
await finishCombat();
assert('Al caer en profundidad aparece la pantalla de fin de ruta', await visible('#rpgEndView'));
const endDeep = await page.$eval('#rpgEndBody', el => el.textContent);
assert('La pantalla de fin ofrece gastar el oro en La Forja', /LA FORJA/.test(endDeep));
assert('Al terminar no queda nada guardado', await page.evaluate(() => localStorage.getItem('easy-hero-save') === null));
await page.screenshot({ path: shot('fin-profundidad'), fullPage: true });

console.log('\n📖🎒🏆⚙️ Progreso persistente (bestiario, colección, logros) y opciones');
assert('Ganar el jefe desbloquea logros y el resumen los muestra',
    /Logros desbloqueados/.test(winText) && /La ruta es tuya/.test(winText));
const metaAfterWin = await page.evaluate(() => window.gameMeta);
assert('El progreso persistente registró la partida (monstruos, objetos y logros)',
    metaAfterWin.runsWon >= 1 && Object.keys(metaAfterWin.monstersDefeated).length > 0
    && Object.keys(metaAfterWin.itemsSeen).length > 0 && Object.keys(metaAfterWin.achievements).length > 0);
assert('Se acumuló oro peleando por toda la ruta', metaAfterWin.gold > 0);
assert('Vencer al jefe deja un trofeo legendario para siempre', metaAfterWin.trophyItem && metaAfterWin.trophyItem.rarity === 'legendaria');
assert('El resumen final muestra el oro acumulado', new RegExp(String(metaAfterWin.gold)).test(endDeep) && /[Oo]ro/.test(endDeep));

await page.click('[data-panel="bestiary"]');
await sleep(150);
assert('El bestiario muestra progreso real y cubre las 104 criaturas del descenso',
    (await page.$$('.panel-tile:not(.is-locked)')).length > 0 && (await page.$$('.panel-tile')).length === 104);
{
    // Las variantes son medallas dentro de la ficha del monstruo, no fichas nuevas
    await page.evaluate(() => {
        window.gameMeta.monstersSeen['Orco'] = true;
        window.gameMeta.variantsSeen = { Orco: { adj: { colerico: true, petreo: true }, lin: { plaga: true } } };
        window.UI.closePanel();
    });
    await page.click('[data-panel="bestiary"]');
    await sleep(150);
    assert('Una variante vista se muestra como medalla, sin añadir una ficha nueva',
        (await page.$$('.panel-tile')).length === 104 && (await page.$$('.panel-tile-variants')).length === 1);
    assert('La medalla cuenta las variantes de ese monstruo y las nombra al pasar el ratón', await page.evaluate(() => {
        const el = document.querySelector('.panel-tile-variants');
        return el.textContent.includes('3') && /Col[ée]rico/.test(el.title) && /Plaga/.test(el.title);
    }));
    assert('El encabezado lleva la cuenta de variantes distintas sobre el total',
        /3 de 22/.test(await page.$eval('.panel-sub', el => el.textContent)));
}
await page.screenshot({ path: shot('panel-bestiario'), fullPage: true });
await page.click('#btnPanelClose');
await sleep(100);
assert('Cerrar el panel oculta la superposición', await page.$eval('#panelOverlay', el => getComputedStyle(el).display === 'none'));

await page.click('[data-panel="collection"]');
await sleep(150);
assert('La colección refleja los objetos vistos en esta ruta', (await page.$$('.panel-tile:not(.is-locked)')).length > 0);
await page.click('#btnPanelClose');
await sleep(100);

await page.click('[data-panel="achievements"]');
await sleep(150);
assert('Los logros conseguidos aparecen marcados', (await page.$$('.panel-row.is-done')).length > 0
    && (await page.$$('.panel-row')).length === 22);
await page.screenshot({ path: shot('panel-logros'), fullPage: true });
await page.click('#btnPanelClose');
await sleep(100);

console.log('\n💾 Exportar / importar el progreso');
await page.click('[data-panel="options"]');
await sleep(150);
await page.click('#btnPanelExport');
await sleep(150);
const exported = await page.$eval('#panelExportText', el => el.value);
assert('Exportar genera un texto con el prefijo esperado', exported.startsWith('EH1:') && exported.length > 20);
await page.fill('#panelImportText', 'esto no es un código válido');
await page.click('#btnPanelImport');
await sleep(100);
assert('Importar un texto inválido avisa sin romper nada', /⚠️/.test(await page.$eval('#panelImportStatus', el => el.textContent)));
await page.fill('#panelImportText', exported);
const navigated = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
await page.click('#btnPanelImport');
await sleep(150);
assert('Importar el propio texto exportado funciona y avisa que va a recargar',
    /Importado/.test(await page.$eval('#panelImportStatus', el => el.textContent)));
await navigated;   // ui.js recarga la página ~900 ms después de un import correcto
await sleep(400);
const metaAfterImport = await page.evaluate(() => window.gameMeta);
assert('Tras recargar, el progreso importado se conserva', metaAfterImport.runsWon >= 1 && Object.keys(metaAfterImport.achievements).length > 0);
// La importación recarga la página entera: ya estamos de vuelta en la Carta de Héroe, como si hubiéramos pulsado INICIO
assert('Tras importar (y recargar), la vista vuelve a la Carta de Héroe', await page.$eval('#rpgStartView', el => getComputedStyle(el).display !== 'none'));
assert('El trofeo del jefe sigue guardado tras la recarga', !!metaAfterImport.trophyItem && metaAfterImport.trophyItem.rarity === 'legendaria');

console.log('\n🏆 El trofeo pasa a la ruta siguiente');
await page.click('#btnRpgStart');
await sleep(600);
const trophyInNewRun = await page.evaluate(() => window.gameState.rpg.hero.trophy);
assert('Una ruta nueva empieza ya con el trofeo disponible (una copia, no el mismo objeto)', !!trophyInNewRun && trophyInNewRun.baseId === metaAfterImport.trophyItem.baseId);
await page.click('#btnRpgChar');
await sleep(200);
assert('El trofeo se ve en la pantalla de Personaje, fuera del inventario normal', !!(await page.$('.char-trophy')));
await page.click('.char-trophy .char-inv-slot');
await sleep(120);
assert('Elegir el trofeo ofrece EMPUÑARLO', !!(await page.$('[data-char-action="equip"]')));
const eqBefore = await page.evaluate(() => JSON.stringify(window.gameState.rpg.hero.equipment));
await page.click('[data-char-action="equip"]');
await sleep(150);
const eqAfter = await page.evaluate(() => JSON.stringify(window.gameState.rpg.hero.equipment));
assert('Empuñar el trofeo lo equipa de verdad', eqAfter !== eqBefore);
assert('El trofeo sigue disponible tras equiparlo (no se consume: es permanente)', !!(await page.$('.char-trophy')));
await page.click('#btnCharBack');
await sleep(150);

// ---------------------------------------------
console.log('\n🩸 Goteo de botín en los combates normales');
{
    // La probabilidad real es 1 de 4: se fuerza al 100 % para comprobar el camino de forma determinista
    await page.evaluate(() => { window.__RPG_BALANCE__.loot.combatDropChance = 1; });
    await showCombat('monster', 6);
    for (let i = 0; i < 60 && !(await page.$('#btnRpgCombatContinue')); i++) { await page.click('[data-rpg-action="attack"]'); await sleep(40); }
    await page.click('#btnRpgCombatContinue');
    await sleep(200);
    assert('Ganar un combate normal puede soltar botín: se abre «Entre los restos» con UN objeto',
        await visible('#rpgLootView') && /Entre los restos/.test(await page.$eval('#rpgLootBody', el => el.textContent))
        && (await page.$$('#rpgLootBody .rpg-loot-card')).length === 1);
    assert('Junto al botín se ve tu equipo, con la ranura afectada resaltada',
        !!(await page.$('#rpgLootBody .gear-panel')) && (await page.$$('#rpgLootBody .gear-slot.is-highlight')).length === 1);
    await page.click('#btnRpgLootDiscard');
    await sleep(150);
    assert('Tras decidir vuelves al mapa', await visible('#rpgMapView'));
    await page.evaluate(() => { window.__RPG_BALANCE__.loot.combatDropChance = 0.25; });
}

// ---------------------------------------------
console.log('\n⚒️ La Forja: gastar el oro en mejoras permanentes');
{
    await page.evaluate(() => {
        window.gameMeta.gold = 399;   // llega para casi todo menos para la mejora más cara (400)
        window.gameMeta.upgrades = {};
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    await realPrices(page);
    assert('El inicio ofrece La Forja con el oro que llevas', /399/.test(await page.$eval('#btnRpgShop', el => el.textContent)));

    await page.click('#btnRpgShop');
    await sleep(200);
    assert('La Forja es una vista propia, no un panel superpuesto',
        await visible('#rpgShopView') && !(await visible('#panelOverlay')));
    // 8 mejoras + los consumibles con tope: dos pociones, cuatro elixires (con el frasco de veneno) y el pan
    assert('Se ofrecen las 8 mejoras del catálogo y los 6 consumibles (sin armas: eso es en la aventura; el tónico ya no se vende)', (await page.$$('#shopBody .shop-card')).length === 14
        && !(await page.$('#shopBody [data-shop-buy="elixir:hierbas"]'))
        && !(await page.$('#shopBody [data-shop-buy^="gear:"]'))
        && !!(await page.$('#shopBody [data-shop-buy="elixir:fuerza"]'))
        && !!(await page.$('#shopBody [data-shop-buy="potion"]')) && !!(await page.$('#shopBody [data-shop-buy="mana_potion"]')));
    assert('Con 399 de oro, lo barato se puede comprar y la mejora de 400 no',
        (await page.$$('#shopBody .shop-card.is-affordable')).length === 13 && (await page.$$('#shopBody .shop-buy:disabled')).length === 1);

    await page.click('[data-shop-buy="constitucion"]');
    await sleep(200);
    const afterBuy = await page.evaluate(() => ({ gold: window.gameMeta.gold, level: window.gameMeta.upgrades.constitucion }));
    assert('Comprar descuenta el oro (Constitución cuesta 10) y sube la mejora de nivel', afterBuy.gold === 389 && afterBuy.level === 1);
    const shopText = await page.$eval('#shopBody', el => el.textContent);
    assert('La tarjeta enseña el nivel y lo que aporta ahora (+1 HP, y el siguiente da +2)', /nivel 1/.test(shopText) && /\+1 HP/.test(shopText) && /\+2 más/.test(shopText));
    assert('El precio se duplica para la siguiente compra (10 → 20)', /20/.test(await page.$eval('[data-shop-buy="constitucion"]', el => el.textContent)));

    await page.click('[data-shop-buy="constitucion"]');
    await sleep(150);
    assert('Se puede volver a comprar la misma mejora: sube a nivel 2',
        await page.evaluate(() => window.gameMeta.upgrades.constitucion === 2));

    await page.click('[data-shop-buy="zurron"]');
    await sleep(150);
    assert('Una mejora de compra única queda marcada como comprada y no se repite',
        (await page.$$('#shopBody .shop-card.is-maxed')).length === 1
        && /COMPRADA/.test(await page.$eval('#shopBody', el => el.textContent)));

    await page.click('#btnShopBack');
    await sleep(200);
    assert('Volver de La Forja te deja en el inicio', await visible('#rpgStartView'));
    assert('La carta del héroe ya refleja lo comprado (+1 y +2: +3 de vida máxima)',
        /28/.test(await page.$eval('#rpgHeroCard', el => el.textContent)));

    await page.reload({ waitUntil: 'load' });
    await sleep(400);
    assert('Lo comprado sobrevive a recargar la página: es permanente',
        await page.evaluate(() => window.gameMeta.upgrades.constitucion === 2 && window.gameMeta.upgrades.zurron === 1));

    await page.click('#btnRpgStart');
    await sleep(400);
    const heroNow = await page.evaluate(() => {
        const h = window.gameState.rpg.hero;
        return { maxHp: h.maxHp, hp: h.hp, slots: window.Items.inventorySize(h) };
    });
    assert('Una ruta nueva empieza ya con la vida comprada (25 + 3 = 28)', heroNow.maxHp === 28 && heroNow.hp === 28);
    assert('El zurrón ancho da 15 ranuras de inventario en vez de 10', heroNow.slots === 15);

    // La expedición: el reloj se mueve hacia atrás para simular horas fuera
    await page.evaluate(() => {
        window.gameMeta.lastSeen = Date.now() - 3 * 3600 * 1000;
        window.gameMeta.gold = 0;
        window.gameMeta.bestTier = 0;   // el ritmo sube con la profundidad: se fija para que el número sea exacto
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
    });
    await page.reload({ waitUntil: 'load' });
    await sleep(500);
    assert('Tras 3 horas fuera, la expedición deja oro al volver', await page.evaluate(() => window.gameMeta.gold === 45));
    assert('…y se avisa en la pantalla de inicio', /expedición/i.test(await page.$eval('#rpgStartNotice', el => el.textContent)));
}

assert('Sin errores de página durante toda la partida', pageErrors.length === 0);
if (pageErrors.length) console.log('     ', pageErrors.slice(0, 3));

const xss = await page.evaluate(() => window.UI.esc('<script>alert("x")</script>'));
assert('esc() neutraliza HTML', xss.includes('&lt;') && !xss.includes('<script>'));
assert('Un evento con texto hostil no inyecta HTML', await page.evaluate(() => {
    window.UI.renderRpgEventScreen({ icon: '🎲', title: '<img src=x onerror=window.__pwned=1>', text: '<b>hola</b>', options: ['<i>a</i>', 'b'] });
    return !window.__pwned && !document.querySelector('#rpgEventBody img') && !document.querySelector('#rpgEventBody b');
}));

// ---------------------------------------------
console.log('\n📱 Móvil (390 × 844)');
{
    const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    const mobileErrors = [];
    mobile.on('pageerror', e => mobileErrors.push(e.message));
    await mobile.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(500);
    await mobile.click('#btnRpgStart');
    await sleep(2000); // la animación de entrada de los nodos dura hasta ~1,6 s
    assert('El mapa de 7 columnas cabe en el móvil sin scroll horizontal',
        !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    const boxes = await mobile.$$eval('#rpgMap .rpg-node', els => els.map(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w * 0.9 && b.x < a.x + a.w * 0.9 && a.y < b.y + b.h * 0.9 && b.y < a.y + a.h * 0.9) overlaps++;
    }
    assert('En el móvil los nodos no se solapan entre sí', overlaps === 0);
    assert('En el móvil los nodos son pulsables (≥ 34 px)', boxes.every(b => b.w >= 34));
    await mobile.screenshot({ path: shot('mapa-movil'), fullPage: true });
    await mobile.evaluate(() => {
        window.gameState.rpg.usedEvents = window.Events.RPG_EVENTS.map(e => e.id).filter(id => id !== 'juicio_hermanas');
        window.gameState.rpg.hero.atq = 999;
    });
    // El primer nodo de evento del piso 1 puede no estar disponible: se abre la vista directamente
    await mobile.evaluate(() => {
        const r = window.gameState.rpg;
        const node = r.map.nodes.find(n => n.type === 'event');
        r.currentId = null;
        window.UI.toggleRpgView('rpgEventView');
        const session = window.Events.startRpgEvent('juicio_hermanas', Math.random, node.floor);
        r.event = { node, session, result: null };
        window.UI.renderRpgEventScreen(window.Events.rpgEventScreen(session));
    });
    await sleep(200);
    assert('En el móvil el evento cabe sin scroll horizontal', !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await mobile.screenshot({ path: shot('evento-movil'), fullPage: true });
    assert('Sin errores de página en el móvil', mobileErrors.length === 0);
    await mobile.context().close();
}

// ---------------------------------------------
console.log('\n🧭 Modo Aventura (prueba de concepto)');
{
    // Con «reducir movimiento» el héroe llega al instante: la prueba no depende de la velocidad al caminar
    const adv = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
    const advErrors = [];
    adv.on('pageerror', e => advErrors.push(e.message));
    await adv.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(300);
    await adv.click('#btnRpgAdventure');
    await sleep(400);
    assert('El botón «Modo aventura» abre la vista de Zafias', await adv.$eval('#rpgAdventureView', el => getComputedStyle(el).display !== 'none'));
    assert('Empieza en la aldea, sin cartel con el nombre encima del mapa', (await adv.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea'
        && !(await adv.$('.adv-plaque')));
    assert('La aldea tiene 2 NPC, 3 puntos de interés (con la cueva sellada) y 2 salidas al bosque', (await adv.$$('.adv-stop.is-npc')).length === 2
        && (await adv.$$('.adv-stop.is-poi')).length === 3 && (await adv.$$('.adv-stop.is-exit')).length === 2);
    assert('El mapa se ve con zoom (la cámara escala el mundo)', await adv.$eval('.adv-world', el => /scale\((1\.[5-9]|2\.)/.test(el.style.transform)));
    assert('Los caminos se dibujan a trazos, como en un mapa antiguo', await adv.$eval('.adv-paths .adv-path-ink', el =>
        getComputedStyle(el).strokeDasharray !== 'none' && el.getAttribute('d').length > 10));
    assert('Las paradas no llevan número', !/\d-\d/.test(await adv.$eval('.adv-markers', el => el.textContent)));

    await adv.click('.adv-stop[data-point="posadera"]');
    await sleep(250);
    assert('Pulsar un NPC: el héroe camina hasta él y se abre el diálogo', !(await adv.$eval('.adv-dialogue', el => el.hidden))
        && /Maela/.test(await adv.$eval('.adv-dialogue-who', el => el.textContent)));
    const pages = [];
    for (let i = 0; i < 10 && !(await adv.$eval('.adv-dialogue', el => el.hidden)); i++) {
        pages.push(await adv.$eval('.adv-dialogue-next', el => el.textContent));
        await adv.click('.adv-dialogue-next');
        await sleep(60);
    }
    assert('El diálogo es solo historia: «Siguiente» hasta la última línea, que dice «Cerrar»',
        pages.length >= 2 && pages[0] === 'Siguiente' && pages[pages.length - 1] === 'Cerrar' && await adv.$eval('.adv-dialogue', el => el.hidden));
    assert('Maela te da la primera misión y el objetivo queda a la vista', /goblins del bosque: 0\/3/.test(await adv.$eval('.adv-objective', el => el.textContent)));

    await adv.click('.adv-stop[data-point="al-bosque"]', { force: true });
    await sleep(250);
    assert('La salida lleva a la escena del bosque', (await adv.$eval('.adv-viewport', el => el.dataset.scene)) === 'bosque');
    assert('Los enemigos del mapa no dicen quién es: solo el punto y la espada (ni nombre al pasar el ratón)',
        !(await adv.$('.adv-stop.is-enemy .adv-stop-name')) && (await adv.$eval('.adv-stop.is-enemy', el => el.getAttribute('aria-label'))) === 'Enemigo'
        && !!(await adv.$('.adv-stop.is-enemy .adv-stop-img')));
    const enemySrcs = await adv.$$eval('.adv-world .adv-enemy', els => els.map(e => e.src));
    assert('En el bosque se ven sus 4 goblins (mirando a la izquierda) y 2 lobos con su dibujo',
        enemySrcs.filter(s => /goblin_left/.test(s)).length === 4 && enemySrcs.filter(s => /enemigo_lobo-de-zafias/.test(s)).length === 2);
    const enemiesBefore = (await adv.$$('.adv-world .adv-enemy')).length;
    await adv.click('.adv-stop[data-point="goblin-1"]', { force: true });
    await sleep(250);
    assert('Pulsar al goblin: el héroe va hasta él y el goblin le grita', /Goblin/.test(await adv.$eval('.adv-dialogue-who', el => el.textContent)));
    for (let i = 0; i < 6 && !(await adv.$eval('.adv-dialogue', el => el.hidden)); i++) { await adv.click('.adv-dialogue-next'); await sleep(80); }   // su grito, entero
    await sleep(200);
    assert('Tras su grito empieza un combate de verdad, en la pantalla de lado, con el nombre del bosque',
        await adv.$eval('#rpgCombatView', el => getComputedStyle(el).display !== 'none')
        && /bosque/i.test(await adv.$eval('#rpgCombatTitle', el => el.textContent)));
    for (let i = 0; i < 60 && !(await adv.$('#btnRpgCombatContinue')); i++) { await adv.click('[data-rpg-action="attack"]'); await sleep(30); }
    assert('Vencerle da oro y XP', /🪙/.test(await adv.$eval('#rpgCombatResult', el => el.textContent)));
    await adv.click('#btnRpgCombatContinue');
    await sleep(250);
    assert('Tras la victoria vuelves al bosque: ese goblin ya no está y su parada queda superada (✓)',
        (await adv.$eval('.adv-viewport', el => el.dataset.scene)) === 'bosque'
        && !!(await adv.$('.adv-stop.is-cleared[data-point="goblin-1"]'))
        && (await adv.$$('.adv-world .adv-enemy')).length === enemiesBefore - 1);
    const saved = await adv.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
    assert('La aventura se guarda: escena, vida y enemigos vencidos', saved.scene === 'bosque' && saved.gone['goblin-1'] === true && saved.hp > 0);
    assert('La barra de abajo muestra vida y maná (con su arte), oro y las dos pociones',
        /^\d+\/\d+$/.test(await adv.$eval('[data-hud="hp"] .ui-gauge-text', el => el.textContent)) && /^\d+\/\d+$/.test(await adv.$eval('[data-hud="mp"] .ui-gauge-text', el => el.textContent))
        && /^\d+$/.test(await adv.$eval('[data-hud="gold"]', el => el.textContent)) && !!(await adv.$('[data-hud="potions"]')) && !!(await adv.$('[data-hud="mana-potions"]')));
    assert('La misión cuenta el goblin vencido (1/3) y el camino al campamento sigue cerrado',
        /1\/3/.test(await adv.$eval('.adv-objective', el => el.textContent)) && !(await adv.$('.adv-stop[data-point="al-campamento"]')));
    // La aldea funciona: posada, tienda y cueva
    const talkAll = async () => { for (let i = 0; i < 8 && !(await adv.$eval('.adv-dialogue', el => el.hidden)); i++) { await adv.click('.adv-dialogue-next'); await sleep(50); } };
    await adv.click('.adv-stop[data-point="a-la-aldea"]', { force: true });
    await sleep(200);
    await adv.click('.adv-stop[data-point="posada"]', { force: true });
    await sleep(200);
    await talkAll();
    const slept = await adv.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
    assert('Dormir en la posada cura del todo y hace volver a los goblins', slept.hp === null && Object.keys(slept.gone).length === 0
        && slept.flags['defeated:goblin-1'] === true);
    // Un punto de interés se mira como se habla, y su hallazgo se da una sola vez
    const goldOf = async () => Number(await adv.$eval('[data-hud="gold"]', el => el.textContent));
    const goldBefore = await goldOf();
    await adv.click('.adv-stop[data-point="pozo"]', { force: true });
    await sleep(200);
    const pozoWho = await adv.$eval('.adv-dialogue-who', el => el.textContent);
    await talkAll();
    const goldAfter = await goldOf();
    await adv.click('.adv-stop[data-point="pozo"]', { force: true });
    await sleep(200);
    await talkAll();
    assert('El pozo (punto de interés) abre su texto y da 10 de oro una sola vez',
        /pozo/i.test(pozoWho) && goldAfter === goldBefore + 10 && (await goldOf()) === goldAfter);
    await adv.click('.adv-stop[data-point="mercado"]', { force: true });
    await sleep(200);
    await talkAll();
    assert('Un punto de interés ya mirado se pone gris, como un enemigo vencido (pozo y mercado)',
        !!(await adv.$('.adv-stop.is-cleared[data-point="pozo"]')) && !!(await adv.$('.adv-stop.is-cleared[data-point="mercado"]')));
    await adv.click('.adv-stop[data-point="tienda"]', { force: true });
    await sleep(250);
    assert('La tienda de la aldea abre La Forja (con las pociones)', await adv.$eval('#rpgShopView', el => getComputedStyle(el).display !== 'none')
        && !!(await adv.$('[data-shop-buy="potion"]')));
    await adv.click('#btnShopBack');
    await sleep(250);
    assert('Al salir de la tienda vuelves a la aldea', await adv.$eval('#rpgAdventureView', el => getComputedStyle(el).display !== 'none'));
    await adv.click('.adv-stop[data-point="cueva"]', { force: true });
    await sleep(300);
    // Lee el diálogo entero, línea a línea
    let cueva = '';
    for (let i = 0; i < 8 && !(await adv.$eval('.adv-dialogue', el => el.hidden)); i++) {
        cueva += await adv.$eval('.adv-dialogue', el => el.textContent);
        await adv.click('.adv-dialogue-next');
        await sleep(50);
    }
    assert('La cueva del sur está sellada: un escalofrío, «todavía no estás preparado», y sigues en la aldea',
        /todavía no estás preparado/.test(cueva) && await adv.$eval('#rpgAdventureView', el => getComputedStyle(el).display !== 'none')
        && (await adv.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea' && !(await adv.$('#btnRpgAbandon:visible')));
    assert('La aventura ya no tiene botón a la mazmorra', !(await adv.$('.adv-back')));
    assert('Sin errores de página en la aventura', advErrors.length === 0);
    await adv.context().close();
}

console.log('\n🖼️ Imágenes propias de los monstruos (taller de sprites)');
{
    // Un manifiesto de prueba servido en lugar del vacío: Slime y un héroe con imagen propia; el resto, sin ella
    const sharp = (await import('sharp')).default;
    const mk = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } } }).webp({ lossless: true }).toBuffer();
    const slimeWebp = await mk(120, 80);
    const heroWebp = await mk(100, 200);
    const manifest = `export const ART = { sprites: {
        enemigo_slime: { src: 'img/sprites/enemigo_slime.webp', w: 120, h: 80 },
        heroe_prueba: { src: 'img/sprites/heroe_prueba.webp', w: 100, h: 200 } }, bg: {}, zones: {} };`;
    const art = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const artErrors = [];
    art.on('pageerror', e => artErrors.push(e.message));
    await art.route(/\/src\/data\/art\.js/, r => r.fulfill({ contentType: 'text/javascript', body: manifest }));
    await art.route(/\/img\/sprites\/enemigo_slime\.webp/, r => r.fulfill({ contentType: 'image/webp', body: slimeWebp }));
    await art.route(/\/img\/sprites\/heroe_prueba\.webp/, r => r.fulfill({ contentType: 'image/webp', body: heroWebp }));
    await art.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(500);
    await art.click('#btnRpgStart');
    await sleep(700);
    await art.click('#rpgMap .rpg-node.is-available');
    await sleep(400);
    const stage = () => art.evaluate(() => {
        const img = document.querySelector('#rpgActorMonster img');
        return {
            src: img.getAttribute('src'), filter: img.style.filter, ratio: document.getElementById('rpgActorMonster').style.getPropertyValue('--ratio'),
            heroSrc: document.querySelector('#rpgActorHero img').getAttribute('src')
        };
    });
    // El combate es de verdad; solo cambiamos de qué criatura se trata, y una acción repinta el escenario
    await art.evaluate(() => { const m = window.gameState.rpg.combat.monster; m.baseName = 'Lobo'; m.name = 'Lobo'; delete m.variants; });
    await art.click('[data-rpg-action="defend"]');
    await sleep(300);
    let st = await stage();
    assert('Un monstruo SIN imagen propia sigue con el goblin de siempre', /goblin_left\.png$/.test(st.src));
    assert('…y con su tinte (el lobo no es verde-goblin)', st.filter !== 'none' && st.filter !== '');
    await art.evaluate(() => { const m = window.gameState.rpg.combat.monster; m.baseName = 'Slime'; m.name = 'Slime'; delete m.variants; });
    await art.click('[data-rpg-action="defend"]');
    await sleep(300);
    st = await stage();
    assert('Un monstruo CON imagen en el manifiesto usa su imagen (Slime → enemigo_slime.webp)', /img\/sprites\/enemigo_slime\.webp$/.test(st.src));
    assert('…sin tinte', st.filter === 'none');
    assert('…con su proporción real respecto al héroe (80 / 200 = 0,4)', Math.abs(parseFloat(st.ratio) - 0.4) < 0.01);
    assert('El héroe usa su heroe_* si existe', /img\/sprites\/heroe_prueba\.webp$/.test(st.heroSrc));
    assert('La imagen propia carga de verdad (no está rota)', await art.$eval('#rpgActorMonster img', el => el.complete && el.naturalWidth === 120));
    assert('Sin errores de página con imágenes propias', artErrors.length === 0);
    await art.context().close();
}

// ---------------------------------------------
console.log('\n💀 Modo Aventura: caer en un combate');
{
    const fall = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
    const fallErrors = [];
    fall.on('pageerror', e => fallErrors.push(e.message));
    await fall.goto(url, { waitUntil: 'load', timeout: 30000 });
    await sleep(300);
    // Partida preparada: 200 de oro y 1 de vida en el bosque, para caer en el primer golpe
    await fall.evaluate(() => {
        window.gameMeta.gold = 200;
        localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta));
        localStorage.setItem('easy-hero-adventure', JSON.stringify({ v: 1, scene: 'bosque', hp: 1, gone: {}, flags: { misionAceptada: true } }));
    });
    await fall.reload({ waitUntil: 'load' });
    await sleep(400);
    await fall.click('#btnRpgAdventure');
    await sleep(400);
    await fall.click('.adv-stop[data-point="goblin-1"]', { force: true });
    await sleep(250);
    for (let i = 0; i < 6 && !(await fall.$eval('.adv-dialogue', el => el.hidden)); i++) { await fall.click('.adv-dialogue-next'); await sleep(80); }
    await sleep(200);
    for (let i = 0; i < 40 && !(await fall.$('#btnRpgCombatContinue')); i++) { await fall.click('[data-rpg-action="attack"]'); await sleep(30); }
    assert('Con 1 de vida, el goblin te derriba: sale el cartel «Has caído»',
        /Has caído/.test(await fall.$eval('#rpgCombatResult', el => el.textContent)));
    await fall.click('#btnRpgCombatContinue');
    await sleep(300);
    const woke = await fall.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-adventure')));
    const meta = await fall.evaluate(() => JSON.parse(localStorage.getItem('easy-hero-meta')));
    assert('Tras caer despiertas en la posada de la aldea', await fall.$eval('#rpgAdventureView', el => getComputedStyle(el).display !== 'none')
        && (await fall.$eval('.adv-viewport', el => el.dataset.scene)) === 'aldea' && woke.scene === 'aldea');
    assert('…con la vida llena', woke.hp === null
        && await fall.$eval('[data-hud="hp"] .ui-gauge-text', el => { const m = /(\d+)\/(\d+)/.exec(el.textContent); return !!m && m[1] === m[2]; }));
    assert('…y un 10 % menos de oro (200 → 180)', meta.gold === 180);
    assert('Sin errores de página al caer', fallErrors.length === 0);
    await fall.context().close();
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);
