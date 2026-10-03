// =============================================
// 🏭 Sprite Factory — el héroe animado por capas (armadura + espada)
// Uso: npm run sprite-factory -- <orden> …
//
//   lista                                   el armario: qué armaduras hay, de dónde sale cada una y si alguna pide revisión
//   reconstruir                             vuelve a montarlo todo desde las hojas guardadas (sin IA) y reescribe el manifiesto
//   armadura <id> "<descripción en inglés>" [--nombre "Cuero tachonado"] [--intentos 2] [--solo walk]
//                                           VISTE las hojas base con esa armadura (IA: una imagen por animación e intento),
//                                           las revisa contra la base, las entrega al juego y saca su vista previa
//   tinte <id> --de <armadura> --color negra|oro|bronce|sangre|jade [--nombre "…"]
//                                           otra armadura tiñendo el metal de una que ya existe (sin IA)
//   importar <id> <anim> <hoja.png> [--cuadricula 3x3] [--usar 1,2,3,4] [--nombre "…"]
//                                           una cuadrícula hecha por el director como animación de una armadura
//   lote <archivo.json>                     varias de golpe: [{ "id", "nombre", "prompt" } | { "id", "nombre", "tinte": { "de", "color" } }]
//   base <anim> --generar [--variante v2]   genera una hoja BASE candidata (IA) y la deja en taller/ con su vista previa
//   base <anim> --adoptar <hoja.png>        la da por buena: pasa a ser el ejemplo de esa animación
//   ver                                     monta la demo (taller/sprite-factory/demo.html): camina, respira y ataca
//
// Opciones comunes: --espada <id> (con qué espada se saca la vista previa; por defecto, espada-de-hierro)
// Receta y prompts: tools/sprite-factory/README.md
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpriteFactory } from './src/factory.mjs';
import { readSheet, layoutBase, renderFrame, TINTS } from './src/sheet.mjs';
import { preview } from './src/preview.mjs';
import { buildDemo } from './src/demo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flags = {}, words = [];
for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { words.push(argv[i]); continue; }
    const key = argv[i].slice(2);
    if (['generar', 'muestra'].includes(key)) flags[key] = true; else flags[key] = argv[++i];
}
const [cmd, ...rest] = words;
const log = m => console.log(m);

/** La fábrica de imágenes, solo si hace falta generar (necesita la clave de Google en .env). */
async function generator() {
    const { loadDotEnv } = await import('../image-generator/src/provider.mjs');
    const { createLogger } = await import('../image-generator/src/logger.mjs');
    const { AssetFactory } = await import('../image-generator/src/factory.mjs');
    loadDotEnv(root);
    const quiet = createLogger(path.join(root, 'taller'));
    return new AssetFactory({ root, toolDir: path.join(root, 'tools/image-generator'), log: { ...quiet, info: () => {}, warn: () => {} } });
}
const show = (f, shots) => { for (const [anim, s] of Object.entries(shots)) log(`   👁  ${anim}: ${path.relative(root, s.gif || s.contact)}`); };
const reviewText = e => (e.review ? Object.entries(e.review).map(([a, p]) => `      ⚠ ${a}: ${p.join(' · ')}`).join('\n') : '');

const sf = new SpriteFactory({ root, log });
const sword = flags.espada || 'espada-de-hierro';

try {
    if (!cmd || cmd === 'ayuda') {
        log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    } else if (cmd === 'lista') {
        for (const [id, e] of Object.entries(sf.armario)) {
            const how = e.base ? 'la base (hojas de ejemplo)' : e.tint ? `tinte ${e.tint.color} de «${e.tint.from}»` : e.imported ? 'cuadrícula del director' : 'vestida con IA';
            log(`${e.review ? '⚠' : '✔'} ${id} — ${e.name} · ${how}`);
            if (e.review) log(reviewText(e));
        }
        log(`\nAnimaciones: ${sf.anims().join(', ')} · tintes: ${Object.keys(TINTS).join(', ')}`);
    } else if (cmd === 'reconstruir') {
        for (const line of await sf.rebuild()) log(line);
        log(`→ ${sf.config.paths.manifest}`);
    } else if (cmd === 'armadura') {
        const [id, ...desc] = rest;
        if (!id || !desc.length) throw new Error('Uso: armadura <id> "<descripción en inglés>" [--nombre "…"]');
        sf.generator = await generator();
        const r = await sf.dress(id, desc.join(' '), { name: flags.nombre || id, attempts: Number(flags.intentos || sf.config.qa.attempts), anims: flags.solo ? flags.solo.split(',') : sf.anims(), sword, sample: !!flags.muestra });
        log(`${r.entry.review ? '⚠' : '✔'} ${id} — ${r.entry.name} · ${sf.spent} imagen(es) generada(s)`);
        if (r.entry.review) log(reviewText(r.entry));
        show(sf, r.shots);
    } else if (cmd === 'tinte') {
        const [id] = rest;
        if (!id || !flags.de || !flags.color) throw new Error('Uso: tinte <id> --de <armadura> --color negra|oro|… [--nombre "…"]');
        const r = await sf.tint(id, flags.de, flags.color, { name: flags.nombre || id, sword });
        log(`✔ ${id} — ${r.entry.name} · tinte ${flags.color} de «${flags.de}» (sin IA)`);
        show(sf, r.shots);
    } else if (cmd === 'importar') {
        const [id, anim, file] = rest;
        if (!id || !anim || !file) throw new Error('Uso: importar <id> <anim> <hoja.png> [--cuadricula 3x3] [--usar 1,2,3,4]');
        const r = await sf.importSheet(id, anim, path.resolve(file), { name: flags.nombre, grid: flags.cuadricula, pick: flags.usar ? flags.usar.split(',').map(Number) : null, sword });
        log(`${r.qa.ok ? '✔' : '⚠'} ${id} · ${anim}: ${r.qa.ok ? 'pasa la revisión' : r.qa.problems.join(' · ')}${r.qa.marker ? '' : ' (sin palo: la mano se toma de la base)'}`);
        show(sf, r.shots);
    } else if (cmd === 'lote') {
        const jobs = JSON.parse(fs.readFileSync(path.resolve(rest[0]), 'utf8'));
        for (const j of jobs) {
            if (j.tinte) { await sf.tint(j.id, j.tinte.de, j.tinte.color, { name: j.nombre || j.id, sword }); log(`✔ ${j.id}: tinte ${j.tinte.color} de «${j.tinte.de}»`); continue; }
            if (!sf.generator) sf.generator = await generator();
            const r = await sf.dress(j.id, j.prompt, { name: j.nombre || j.id, attempts: Number(flags.intentos || sf.config.qa.attempts), sword });
            log(`${r.entry.review ? '⚠' : '✔'} ${j.id} — ${r.entry.name}`);
            if (r.entry.review) log(reviewText(r.entry));
        }
        log(`${sf.spent} imagen(es) generada(s)`);
    } else if (cmd === 'base') {
        const [anim] = rest;
        const A = sf.config.anims[anim];
        if (!A) throw new Error(`Uso: base <anim> --generar | --adoptar <hoja.png>. Animaciones: ${sf.anims().join(', ')}`);
        if (flags.adoptar) {
            fs.copyFileSync(path.resolve(flags.adoptar), path.join(root, A.base));
            log(`✔ ${A.base} es ahora la hoja base de «${anim}». Ejecuta «reconstruir»: las armaduras vestidas sobre la hoja anterior habrá que vestirlas otra vez.`);
        } else {
            const gen = await generator();
            const variant = `${anim}-base-${flags.variante || 'v1'}`;
            const res = await gen.generateAsset('sheet', sf.config.hero.who, { details: `: ${A.action.replace('{marker}', sf.config.marker)}`, variant, noGame: true, force: true,
                ref: `${sf.config.hero.anchor},img/portraits/hero-cuerpo.webp` });
            const file = path.join(sf.work, 'base', `${variant}.png`);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.copyFileSync(res.plan.files.raw, file);
            const [c, r] = A.grid.split('x').map(Number);
            const figs = await readSheet(file, { frames: c * r, rows: r, marker: 'required' });
            const L = layoutBase(figs, { align: A.align, standing: A.standing });
            const pngs = [];
            for (const [i, f] of figs.entries()) pngs.push((await renderFrame(f, L.place[i], L)).png);
            const { ART } = await import('../../src/data/art.js');
            const icon = ART.icons[`objeto-${sword}`];
            const s = await preview(path.join(sf.work, 'base', variant), pngs, { ...L, fps: A.fps }, { ...sf.config.sword, file: icon ? path.join(root, icon.src) : null }, { order: A.order, fps: A.fps });
            log(`✔ candidata: ${path.relative(root, file)}\n   👁  ${path.relative(root, s.gif || s.contact)}\n   Si convence: npm run sprite-factory -- base ${anim} --adoptar ${path.relative(root, file)}`);
        }
    } else if (cmd === 'ver') {
        log(`→ ${path.relative(root, await buildDemo(sf))}`);
    } else throw new Error(`No conozco la orden «${cmd}». Prueba: npm run sprite-factory -- ayuda`);
} catch (e) {
    console.error(`❌ ${e.message}`);
    process.exitCode = 1;
}
