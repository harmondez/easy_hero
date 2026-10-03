// =============================================
// 🏭 Sprite Factory · la fábrica: del armario (qué armaduras hay y cómo se hace cada una) a los sprites del juego
//
//   hoja base (ejemplos/)  ──►  fotogramas + puntos de la mano  ──►  img/hero/<armadura>/<anim>_<n>.webp
//        │                                                              src/data/hero-sprites.js (manifiesto)
//        ├─ vestir  (IA: la misma hoja con otra armadura; se revisa sola contra la base y se repite si falla)
//        ├─ teñir   (código: el metal de una armadura, de otro color; sin IA)
//        └─ importar (una cuadrícula hecha por el director)
// La espada no se dibuja en ninguna hoja: el juego la coloca en la mano de cada fotograma.
// =============================================
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { readSheet, layoutBase, layoutOnBase, renderFrame, colorDrift, sheetPrint, printGap, tintMetal, TINTS } from './sheet.mjs';
import { preview } from './preview.mjs';

sharp.cache(false);
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rel = (root, f) => path.relative(root, f).replace(/\\/g, '/');
const gridOf = g => { const [c, r] = String(g).toLowerCase().split('x').map(Number); return { cols: c, rows: r, count: c * r }; };

export class SpriteFactory {
    constructor({ root, log = console.log, generator = null }) {
        this.root = root;
        this.log = log;
        this.generator = generator;      // la fábrica de imágenes (tools/image-generator); solo hace falta para generar
        this.dir = path.join(root, 'tools/sprite-factory');
        this.config = readJson(path.join(this.dir, 'config.json'));
        this.armarioFile = path.join(root, this.config.paths.armario);
        this.armario = fs.existsSync(this.armarioFile) ? readJson(this.armarioFile) : {};
        this.work = path.join(root, this.config.paths.work);
        this.game = path.join(root, this.config.paths.game);
        this.bases = {};
        this.spent = 0;                  // imágenes generadas en esta ejecución
    }

    saveArmario() { fs.writeFileSync(this.armarioFile, JSON.stringify(this.armario, null, 2) + '\n'); }
    anims() { return Object.keys(this.config.anims); }
    baseArmor() { return Object.keys(this.armario).find(id => this.armario[id].base) || null; }

    /** La hoja base de una animación, leída y colocada (se calcula una vez). → { figs, layout } */
    async base(anim) {
        if (this.bases[anim]) return this.bases[anim];
        const A = this.config.anims[anim];
        if (!A) throw new Error(`No existe la animación «${anim}». Las hay: ${this.anims().join(', ')}.`);
        const g = gridOf(A.grid);
        const figs = await readSheet(path.join(this.root, A.base), { frames: g.count, rows: g.rows, marker: 'required' });
        const layout = layoutBase(figs, { align: A.align, standing: A.standing });
        return (this.bases[anim] = { figs, layout });
    }

    /** Lo que el juego necesita saber de una animación: lienzo, altura del héroe y la mano en cada fotograma. */
    async animInfo(anim) {
        const A = this.config.anims[anim], { layout } = await this.base(anim);
        return { w: layout.w, h: layout.h, cx: layout.cx, baseline: layout.baseline, heroHeight: layout.heroHeight, fps: A.fps, loop: !!A.loop,
            order: A.order, ...(A.hold ? { hold: A.hold } : {}), frames: layout.frames };
    }

    /**
     * Revisa una hoja vestida contra su base. → { ok, problems: [texto], marker: ¿traía palo? }
     * Mira: que el héroe mida lo mismo, que la mano esté a la misma altura y el arma con el mismo giro en cada
     * fotograma, y que ningún fotograma lleve un color que los demás no llevan.
     */
    async qa(anim, figs) {
        const Q = this.config.qa, A = this.config.anims[anim], { figs: bfigs, layout } = await this.base(anim);
        const problems = [];
        const height = figs[A.standing].body.y1 - figs[A.standing].body.y0;
        const ratio = height / layout.heroHeight;
        if (Math.abs(ratio - 1) > Q.height) problems.push(`el héroe mide un ${Math.round(Math.abs(ratio - 1) * 100)} % ${ratio > 1 ? 'más' : 'menos'} que en la base`);
        const marker = figs.every(f => f.hand);
        if (!marker && figs.some(f => f.hand)) problems.push('el palo magenta solo aparece en algunos fotogramas');
        figs.forEach((f, i) => {
            const b = bfigs[i];
            if (f.hand && b.hand) {
                const da = Math.abs(((f.angle - b.angle + 540) % 360) - 180);
                if (da > Q.angle) problems.push(`fotograma ${i + 1}: el arma gira ${da.toFixed(0)}° respecto a la base`);
                const dh = Math.abs((f.body.y1 - f.hand.y) / height - (b.body.y1 - b.hand.y) / layout.heroHeight);
                if (dh > Q.hand) problems.push(`fotograma ${i + 1}: la mano está un ${Math.round(dh * 100)} % de la altura más ${(f.body.y1 - f.hand.y) / height > (b.body.y1 - b.hand.y) / layout.heroHeight ? 'arriba' : 'abajo'} que en la base`);
            }
        });
        colorDrift(figs).forEach((d, i) => { if (d > Q.color) problems.push(`fotograma ${i + 1}: lleva un color que los demás no llevan (${Math.round(d * 100)} % de sus píxeles)`); });
        return { ok: !problems.length, problems, marker };
    }

    /** Escribe los fotogramas de una armadura para una animación en el juego. → PNG de cada fotograma */
    async deliver(armor, anim, pngs) {
        const dir = path.join(this.game, armor);
        fs.mkdirSync(dir, { recursive: true });
        for (const [i, png] of pngs.entries()) await sharp(png).webp({ nearLossless: true, quality: 60, effort: 6 }).toFile(path.join(dir, `${anim}_${i + 1}.webp`));
        return pngs;
    }

    /** La armadura base: los fotogramas de las hojas de ejemplo, tal cual. */
    async buildBase(armor) {
        const out = {};
        for (const anim of this.anims()) {
            const { figs, layout } = await this.base(anim);
            const pngs = [];
            for (const [i, f] of figs.entries()) pngs.push((await renderFrame(f, layout.place[i], layout)).png);
            out[anim] = await this.deliver(armor, anim, pngs);
        }
        return out;
    }

    /**
     * Lee una hoja de una armadura (vestida o importada), la revisa y la coloca sobre el lienzo de su base.
     * opts: { grid, pick: [índices, desde 1], marker: 'optional' }  → { figs, qa, pngs, clipped }
     */
    async sheetFrames(anim, file, { grid = null, pick = null, outfit = null } = {}) {
        const A = this.config.anims[anim], g = gridOf(grid || A.grid), want = gridOf(A.grid).count;
        let figs = await readSheet(file, { frames: g.count, rows: g.rows, marker: 'optional' });
        if (pick) figs = pick.map(n => { if (!figs[n - 1]) throw new Error(`--usar ${n}: la hoja solo tiene ${figs.length} figuras.`); return figs[n - 1]; });
        if (figs.length !== want) throw new Error(`«${anim}» necesita ${want} fotogramas y la hoja da ${figs.length}. Elige cuáles con --usar 1,2,3,4.`);
        const qa = await this.qa(anim, figs);
        // La ropa, igual que en la otra animación de esta armadura (outfit: { anim, print })
        const print = sheetPrint(figs);
        if (outfit && printGap(print, outfit.print) > this.config.qa.outfit) qa.problems.push(`la ropa no tiene los colores de «${outfit.anim}» (difieren un ${Math.round(printGap(print, outfit.print) * 100)} %)`);
        const { layout } = await this.base(anim);
        const on = layoutOnBase(figs, layout, { align: A.align, standing: A.standing });
        const pngs = [];
        let clipped = false;
        for (const [i, f] of figs.entries()) { const r = await renderFrame(f, on.place[i], layout, on.scale); pngs.push(r.png); clipped = clipped || r.clipped; }
        if (clipped) qa.problems.push('alguna figura se sale del lienzo de la base (capa demasiado ancha)');
        return { figs, qa: { ...qa, ok: !qa.problems.length }, pngs, scale: on.scale, print };
    }

    /**
     * La muestra de la ropa de una armadura: UNA figura suelta sobre blanco (el fotograma de pie de una animación ya
     * entregada). Se le pasa a la IA al vestir las demás animaciones para que lleven lo mismo. Una hoja entera no vale:
     * contagia sus poses.
     */
    async outfitSample(armor, anim) {
        const src = path.join(this.game, armor, `${anim}_${this.config.anims[anim].standing + 1}.webp`);
        const out = path.join(this.work, armor, 'muestra.png');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        await sharp(src).trim().flatten({ background: '#ffffff' }).extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#ffffff' }).png().toFile(out);
        return rel(this.root, out);
    }

    /** Vista previa (hoja de contacto y GIF) de una armadura, con una espada puesta. */
    async previews(armor, frames, swordId = 'espada-de-hierro') {
        const { ART } = await import('../../../src/data/art.js');
        const icon = ART.icons[`objeto-${swordId}`];
        const sword = { ...this.config.sword, file: icon ? path.join(this.root, icon.src) : null };
        const out = {};
        for (const anim of Object.keys(frames)) {
            const info = await this.animInfo(anim);
            out[anim] = await preview(path.join(this.work, armor, anim), frames[anim], info, sword, { order: info.order, fps: info.fps });
        }
        return out;
    }

    /**
     * Viste todas las animaciones con una armadura nueva (IA). Cada hoja se revisa contra su base; si falla, se vuelve
     * a generar (hasta `attempts`). Lo que no pase a la última queda entregado pero marcado para revisar.
     * sample: pasar además a la IA una figura ya vestida como muestra de la ropa (por defecto no: en las pruebas, la
     * segunda imagen contagiaba poses y colores; basta con comprobar después que las animaciones llevan lo mismo).
     */
    async dress(armor, prompt, { name = armor, attempts = this.config.qa.attempts, anims = this.anims(), sword, sample = false } = {}) {
        if (!this.generator) throw new Error('Para vestir hace falta la fábrica de imágenes (clave de Google en .env).');
        const entry = { ...(this.armario[armor] || {}), name, prompt, sheets: { ...((this.armario[armor] || {}).sheets || {}) }, review: {} };
        delete entry.tint; delete entry.base;
        const frames = {};
        // La muestra de la ropa: la primera animación que quede vestida (o una ya vestida de antes, si se viste solo una)
        let outfit = null;
        for (const [a, sheet] of Object.entries(entry.sheets)) {
            if (anims.includes(a) || outfit || !fs.existsSync(path.join(this.root, sheet))) continue;
            const g = gridOf(this.config.anims[a].grid);
            outfit = { anim: a, file: await this.outfitSample(armor, a), print: sheetPrint(await readSheet(path.join(this.root, sheet), { frames: g.count, rows: g.rows, marker: 'optional' })) };
        }
        for (const anim of anims) {
            const A = this.config.anims[anim];
            let best = null;
            for (let n = 1; n <= attempts; n++) {
                this.log(`🎨 ${armor} · ${A.label}: generando (intento ${n} de ${attempts})…`);
                // (el nombre corto es solo para la carpeta del taller: la descripción entera va en los detalles del prompt)
                const res = await this.generator.generateAsset('dress', 'this outfit', { details: `: ${prompt}`, variant: `${armor}-${anim}-${n}`, ref: sample && outfit ? `${A.base},${outfit.file}` : A.base, noGame: true, force: true });
                this.spent++;
                const file = path.join(this.work, armor, `${anim}-intento-${n}.png`);
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.copyFileSync(res.plan.files.raw, file);
                let got;
                try { got = await this.sheetFrames(anim, file, { outfit }); }
                catch (e) { this.log(`   ✗ no se pudo leer: ${e.message}`); continue; }
                got.file = file;
                if (!best || got.qa.problems.length < best.qa.problems.length) best = got;
                if (got.qa.ok) { this.log(`   ✓ pasa la revisión${got.qa.marker ? '' : ' (sin palo: la mano se toma de la base)'}`); break; }
                this.log(`   ✗ ${got.qa.problems.join(' · ')}`);
            }
            if (!best) throw new Error(`${armor} · ${A.label}: ningún intento dio una hoja que se pudiera leer.`);
            const kept = path.join(this.work, armor, `${anim}.png`);
            fs.copyFileSync(best.file, kept);
            entry.sheets[anim] = rel(this.root, kept);
            if (entry.imported) { delete entry.imported[anim]; if (!Object.keys(entry.imported).length) delete entry.imported; }   // ya no es la hoja importada
            if (!outfit) outfit = { anim, file: entry.sheets[anim], print: best.print };
            if (!best.qa.ok) entry.review[anim] = best.qa.problems;
            frames[anim] = await this.deliver(armor, anim, best.pngs);
            if (outfit.anim === anim) outfit.file = await this.outfitSample(armor, anim);
        }
        if (!Object.keys(entry.review).length) delete entry.review;
        this.armario[armor] = entry;
        this.saveArmario();
        const shots = await this.previews(armor, frames, sword);
        await this.writeManifest();
        return { entry, shots };
    }

    /** Una hoja hecha por el director (cuadrícula) como animación de una armadura. */
    async importSheet(armor, anim, file, { name = null, grid = null, pick = null, sword } = {}) {
        const kept = path.join(this.work, armor, `${anim}.png`);
        fs.mkdirSync(path.dirname(kept), { recursive: true });
        if (path.resolve(file) !== kept) fs.copyFileSync(file, kept);
        const got = await this.sheetFrames(anim, kept, { grid, pick });
        const entry = { ...(this.armario[armor] || {}), name: name || (this.armario[armor] || {}).name || armor, sheets: { ...((this.armario[armor] || {}).sheets || {}), [anim]: rel(this.root, kept) } };
        delete entry.tint; delete entry.base;
        entry.imported = { ...(entry.imported || {}), [anim]: { ...(grid ? { grid } : {}), ...(pick ? { pick } : {}) } };
        entry.review = { ...(entry.review || {}) };
        if (got.qa.ok) delete entry.review[anim]; else entry.review[anim] = got.qa.problems;
        if (!Object.keys(entry.review).length) delete entry.review;
        this.armario[armor] = entry;
        this.saveArmario();
        const frames = { [anim]: await this.deliver(armor, anim, got.pngs) };
        const shots = await this.previews(armor, frames, sword);
        await this.writeManifest();
        return { entry, qa: got.qa, shots };
    }

    /** Una armadura nueva tiñendo el metal de otra (sin IA). */
    async tint(armor, from, color, { name = armor, sword } = {}) {
        if (!TINTS[color]) throw new Error(`No existe el tinte «${color}». Los hay: ${Object.keys(TINTS).join(', ')}.`);
        if (!this.armario[from]) throw new Error(`No existe la armadura «${from}» en el armario.`);
        const frames = {};
        for (const anim of this.anims()) {
            const n = gridOf(this.config.anims[anim].grid).count, pngs = [];
            for (let i = 1; i <= n; i++) {
                const src = path.join(this.game, from, `${anim}_${i}.webp`);
                if (!fs.existsSync(src)) throw new Error(`Falta ${rel(this.root, src)}: reconstruye antes «${from}».`);
                const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
                pngs.push(await sharp(tintMetal(data, TINTS[color]), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
            }
            frames[anim] = await this.deliver(armor, anim, pngs);
        }
        this.armario[armor] = { name, tint: { from, color } };
        this.saveArmario();
        const shots = await this.previews(armor, frames, sword);
        await this.writeManifest();
        return { entry: this.armario[armor], shots };
    }

    /** Vuelve a montarlo todo desde las hojas guardadas (sin IA): base, vestidas e importadas, y luego los tintes. */
    async rebuild() {
        const report = [];
        const ids = Object.keys(this.armario);
        const order = [...ids.filter(id => this.armario[id].base), ...ids.filter(id => this.armario[id].sheets), ...ids.filter(id => this.armario[id].tint)];
        for (const id of order) {
            const e = this.armario[id];
            if (e.base) { await this.previews(id, await this.buildBase(id)); report.push(`${id}: base`); continue; }
            if (e.tint) { await this.tint(id, e.tint.from, e.tint.color, { name: e.name }); report.push(`${id}: tinte ${e.tint.color} de ${e.tint.from}`); continue; }
            const review = {};
            let outfit = null;
            for (const [anim, sheet] of Object.entries(e.sheets || {})) {
                const file = path.join(this.root, sheet);
                if (!fs.existsSync(file)) { report.push(`${id} · ${anim}: no está su hoja (${sheet}); se dejan los fotogramas que hay`); continue; }
                const imp = (e.imported || {})[anim] || {};
                const got = await this.sheetFrames(anim, file, { ...imp, outfit });
                if (!outfit) outfit = { anim, print: got.print };
                await this.deliver(id, anim, got.pngs);
                if (!got.qa.ok) review[anim] = got.qa.problems;
                report.push(`${id} · ${anim}: ${got.qa.ok ? 'bien' : got.qa.problems.join(' · ')}`);
            }
            if (Object.keys(review).length) e.review = review; else delete e.review;
        }
        this.saveArmario();
        await this.writeManifest();
        return report;
    }

    /** El manifiesto que lee el juego: animaciones (lienzo y mano por fotograma) y armaduras. */
    async writeManifest() {
        const anims = {};
        for (const anim of this.anims()) anims[anim] = await this.animInfo(anim);
        const armors = {};
        for (const [id, e] of Object.entries(this.armario)) {
            const ready = this.anims().every(a => fs.existsSync(path.join(this.game, id, `${a}_1.webp`)));
            if (ready) armors[id] = { name: e.name, dir: `${this.config.paths.game}/${id}`, ...(e.tint ? { tint: e.tint.color, from: e.tint.from } : {}) };
        }
        const { length, grip, fist } = this.config.sword;
        const data = { sword: { length, grip, fist }, idle: this.config.idle && { anim: this.config.idle.anim, frame: this.config.idle.frame }, anims, armors };
        const body = `// Generado por el Sprite Factory (npm run sprite-factory). No editar a mano: se cambia en tools/sprite-factory/.\n`
            + `// anims: por animación, el lienzo (w × h), los pies (cx, baseline), la altura del héroe de pie y la mano en cada\n// fotograma (x, y, giro del arma).\n`
            + `// armors: cada armadura es una carpeta con <anim>_<n>.webp. La espada no está dibujada: se coloca en la mano.\n`
            + `export const HERO_SPRITES = ${JSON.stringify(data, null, 4)};\n`;
        fs.writeFileSync(path.join(this.root, this.config.paths.manifest), body);
        return data;
    }
}
