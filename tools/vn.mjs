// =============================================
// 🎭 Novela visual rápida — `npm run vn`: herramientas para meter NPC, retratos y diálogos sin tocar código.
//
//   npm run vn                                    = revisar
//   npm run vn -- revisar                         comprueba diálogos y retratos (sale con error si algo está roto)
//   npm run vn -- lista                           quién habla, cuántas líneas y si tiene retrato
//   npm run vn -- nuevo <clave> --quien "Nombre, oficio" [--retrato <id>]
//                                                 crea un diálogo de plantilla en src/data/zones/zafias.js y, con
//                                                 --retrato, le asigna el retrato en src/data/characters.js (si el
//                                                 PNG está en img/characters/<id>-profile.png, lo convierte también)
//   npm run vn -- ver <clave>                     abre el juego con ?vn=<clave> y guarda una captura por línea en
//                                                 taller/vn/<clave>/ (para revisar cómo queda sin jugar hasta allí)
//
// El retrato se puede pedir a la fábrica de arte:
//   npm run generate -- portrait "village healer" --game-id curandera --details "…"
// Receta completa: docs/novela-visual.md
// =============================================
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { readManifest, manifestText } from './sprites.mjs';
import { processPortrait, PORTRAIT_SRC } from './portraits.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZONE_FILE = path.join(root, 'src/data/zones/zafias.js');
const CHAR_FILE = path.join(root, 'src/data/characters.js');
const ART_FILE = path.join(root, 'src/data/art.js');
// Diálogos que abre el código y no una parada (la posada al dormir)
const USED_BY_CODE = ['posada-dormir'];
const MAX_LINE = 230;   // más largo y el cuadro de texto se queda corto

const load = async file => import(`${pathToFileURL(file).href}?t=${Date.now()}`);

/** Revisa diálogos y retratos. Devuelve { errors, warnings, speakers }. Lo usa también tests/vn-sim.mjs. */
export async function checkVN() {
    const { ZAFIAS, ZAFIAS_DIALOGUES } = await load(ZONE_FILE);
    const { PORTRAITS, HERO_WHO } = await load(CHAR_FILE);
    const { ART } = await load(ART_FILE);
    const errors = [], warnings = [];
    const portraitId = p => (typeof p === 'string' ? p : p && p.id);

    // Diálogos que piden las paradas y no existen
    const used = new Set(USED_BY_CODE);
    for (const [sid, sc] of Object.entries(ZAFIAS.scenes)) {
        for (const p of sc.points) {
            for (const key of [p.dialogue, ...(p.talk || []).map(t => t.dialogue)].filter(Boolean)) {
                used.add(key);
                if (!ZAFIAS_DIALOGUES[key]) errors.push(`La parada «${p.id}» (${sid}) pide el diálogo «${key}», que no existe`);
            }
        }
    }
    // Las líneas
    const speakers = {};
    for (const [key, lines] of Object.entries(ZAFIAS_DIALOGUES)) {
        if (!used.has(key)) warnings.push(`El diálogo «${key}» no lo usa ninguna parada`);
        if (!Array.isArray(lines) || !lines.length) { errors.push(`El diálogo «${key}» está vacío`); continue; }
        lines.forEach((l, i) => {
            const where = `«${key}» línea ${i + 1}`;
            if (!l.who || !l.text || !String(l.text).trim()) errors.push(`${where}: le falta quién habla o el texto`);
            const unknown = (String(l.text).match(/\{[^}]*\}/g) || []).filter(t => t !== '{heroe}');
            if (unknown.length) errors.push(`${where}: marcador desconocido ${unknown.join(', ')} (solo vale {heroe})`);
            if (l.text === '…' || /\bTODO\b/.test(l.text)) warnings.push(`${where}: sigue con el texto de plantilla`);
            if (String(l.text).length > MAX_LINE) warnings.push(`${where}: ${l.text.length} caracteres (más de ${MAX_LINE}: pártela en dos)`);
            const s = speakers[l.who] = speakers[l.who] || { lines: 0, dialogues: new Set() };
            s.lines++; s.dialogues.add(key);
        });
    }
    // Los retratos
    for (const [who, p] of Object.entries(PORTRAITS)) {
        const id = portraitId(p);
        if (!ART.portraits || !ART.portraits[id]) errors.push(`«${who}» tiene el retrato «${id}», que no está en img/portraits (npm run icons)`);
        if (!speakers[who]) warnings.push(`«${who}» tiene retrato pero no habla en ningún diálogo (¿el nombre está escrito igual?)`);
    }
    const assigned = new Set(Object.values(PORTRAITS).map(portraitId));
    for (const id of Object.keys(ART.portraits || {})) if (!assigned.has(id)) warnings.push(`El retrato «${id}» no lo lleva nadie (src/data/characters.js)`);
    if (!PORTRAITS[HERO_WHO]) warnings.push('Tu héroe no tiene retrato');
    return { errors, warnings, speakers, portraits: PORTRAITS };
}

async function revisar() {
    const { errors, warnings } = await checkVN();
    for (const e of errors) console.log(`  ❌ ${e}`);
    for (const w of warnings) console.log(`  ⚠️ ${w}`);
    console.log(errors.length ? `\n❌ ${errors.length} error(es)` : `\n✅ Diálogos y retratos en orden${warnings.length ? ` (${warnings.length} aviso/s)` : ''}`);
    if (errors.length) process.exitCode = 1;
}

async function lista() {
    const { speakers, portraits } = await checkVN();
    const rows = Object.entries(speakers).sort((a, b) => b[1].lines - a[1].lines);
    console.log('Quién habla                        Líneas  Diálogos  Retrato');
    for (const [who, s] of rows) {
        const p = portraits[who];
        const pid = p ? (typeof p === 'string' ? p : `${p.id} ×${p.scale}`) : '—';
        console.log(`${who.padEnd(34)} ${String(s.lines).padStart(6)}  ${String(s.dialogues.size).padStart(8)}  ${pid}`);
    }
}

// Escribe un archivo conservando sus saltos de línea
function rewrite(file, fn) {
    const raw = fs.readFileSync(file, 'utf8');
    const crlf = raw.includes('\r\n');
    const out = fn(raw.replace(/\r\n/g, '\n'));
    fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
}
const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

async function nuevo(key, { quien, retrato }) {
    if (!key || !quien) throw new Error('Uso: npm run vn -- nuevo <clave> --quien "Nombre, oficio" [--retrato <id>]');
    const { ZAFIAS_DIALOGUES } = await load(ZONE_FILE);
    if (ZAFIAS_DIALOGUES[key]) throw new Error(`Ya existe el diálogo «${key}»`);
    // 1. El diálogo de plantilla, al final de ZAFIAS_DIALOGUES
    rewrite(ZONE_FILE, s => {
        const end = s.lastIndexOf('\n};');
        if (end < 0) throw new Error('No encuentro el final de ZAFIAS_DIALOGUES');
        const before = s.slice(0, end).replace(/\s*$/, '');
        const block = `,\n\n    // --- ${quien} (npm run vn -- nuevo) ---\n    ${/^[a-z_$][\w$]*$/i.test(key) ? key : q(key)}: [\n`
            + `        { who: ${q(quien)}, text: '…' },\n        { who: '{heroe}', text: '…' }\n    ]`;
        return before + block + s.slice(end);
    });
    console.log(`📝 Diálogo «${key}» creado en src/data/zones/zafias.js (dos líneas de plantilla: escríbelas).`);
    // 2. El retrato
    if (retrato) {
        const art = await readManifest(ART_FILE);
        const png = path.join(root, PORTRAIT_SRC, `${retrato}-profile.png`);
        if (fs.existsSync(png)) {
            const p = await processPortrait(root, png, retrato, art);
            fs.writeFileSync(ART_FILE, manifestText(art), 'utf8');
            console.log(`🎭 Retrato convertido: ${p.src} (${p.w}×${p.h})`);
        } else if (!art.portraits || !art.portraits[retrato]) {
            console.log(`⚠️ No hay retrato «${retrato}»: deja ${PORTRAIT_SRC}/${retrato}-profile.png y ejecuta npm run icons, o pídelo a la fábrica.`);
        }
        const { PORTRAITS } = await load(CHAR_FILE);
        if (!PORTRAITS[quien]) {
            rewrite(CHAR_FILE, s => {
                const end = s.lastIndexOf('\n};');
                return s.slice(0, end).replace(/\s*$/, '') + `,\n    ${q(quien)}: ${q(retrato)}` + s.slice(end);
            });
            console.log(`🎭 «${quien}» lleva el retrato «${retrato}» (src/data/characters.js).`);
        }
    }
    console.log(`\nPara que hable en el mapa, añade una parada a su escena en src/data/zones/zafias.js:\n`
        + `    { id: ${q(key)}, kind: 'npc', name: ${q(quien)}, x: ?, y: ?, dialogue: ${q(key)} },\n`
        + `(las coordenadas, con node tools/zone-overlay.mjs; receta en docs/zonas.md). Míralo con: npm run vn -- ver ${key}`);
}

async function ver(key) {
    if (!key) throw new Error('Uso: npm run vn -- ver <clave>');
    const { ZAFIAS_DIALOGUES } = await load(ZONE_FILE);
    if (!ZAFIAS_DIALOGUES[key]) throw new Error(`No existe el diálogo «${key}»`);
    const { chromium } = await import('playwright');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
    const server = http.createServer((req, res) => {
        const p = decodeURIComponent(req.url.split('?')[0]);
        const f = path.join(root, p === '/' ? 'index.html' : p);
        try { const b = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); res.end(b); }
        catch { res.writeHead(404); res.end(); }
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const out = path.join(root, 'taller', 'vn', key);
    fs.mkdirSync(out, { recursive: true });
    const browser = await chromium.launch();
    try {
        const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' })).newPage();
        const base = `http://127.0.0.1:${server.address().port}/index.html`;
        await page.goto(base);
        await page.evaluate(() => { window.gameMeta.introSeen = true; window.gameMeta.heroName = window.gameMeta.heroName || 'Aldric';
            localStorage.setItem('easy-hero-meta', JSON.stringify(window.gameMeta)); });
        await page.goto(`${base}?vn=${encodeURIComponent(key)}`);
        await page.waitForSelector('.adv-dialogue:not([hidden])', { timeout: 10000 });
        await page.waitForTimeout(400);
        const n = ZAFIAS_DIALOGUES[key].length;
        for (let i = 1; i <= n; i++) {
            const file = path.join(out, `${String(i).padStart(2, '0')}.png`);
            await page.locator('.adv-viewport').screenshot({ path: file });
            console.log(`📸 ${path.relative(root, file)}`);
            await page.click('.adv-dialogue-next');
            await page.waitForTimeout(150);
        }
    } finally {
        await browser.close();
        server.close();
    }
}

// --- Línea de órdenes ---
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [cmd = 'revisar', ...rest] = process.argv.slice(2);
    const opts = {};
    const args = [];
    for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith('--')) opts[rest[i].slice(2)] = rest[i + 1], i++;
        else args.push(rest[i]);
    }
    const run = { revisar, lista, nuevo: () => nuevo(args[0], opts), ver: () => ver(args[0]) }[cmd];
    if (!run) { console.log('Órdenes: revisar · lista · nuevo <clave> --quien "Nombre" [--retrato id] · ver <clave>'); process.exitCode = 1; }
    else run().catch(e => { console.error(`❌ ${e.message}`); process.exitCode = 1; });
}
