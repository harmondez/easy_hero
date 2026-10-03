// Sprite Factory: de las hojas de ejemplo a los fotogramas del juego (sin IA ni navegador: todo determinista).
// Mira que la hoja se corta bien, que el palo magenta da la mano y el giro, que teñir solo toca el metal, que la
// revisión caza lo que debe y que el manifiesto del juego cuadra con los archivos entregados.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { readSheet, layoutBase, layoutOnBase, colorDrift, sheetPrint, printGap, tintMetal, TINTS } from '../tools/sprite-factory/src/sheet.mjs';
import { SpriteFactory } from '../tools/sprite-factory/src/factory.mjs';
import { HERO_SPRITES } from '../src/data/hero-sprites.js';

let passed = 0, failed = 0;
const assert = (name, ok, extra = '') => { if (ok) { passed++; console.log(`✅ ${name}`); } else { failed++; console.log(`❌ ${name} ${extra}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sf = new SpriteFactory({ root, log: () => {} });
const EX = f => path.join(root, 'tools/sprite-factory/ejemplos', f);

// --- La hoja: figuras, mano y giro ---
const walk = await readSheet(EX('base-walk.png'), { frames: 4, rows: 2 });
const attack = await readSheet(EX('base-attack.png'), { frames: 4, rows: 2 });
const cast = await readSheet(EX('base-cast.png'), { frames: 4, rows: 2 });
assert('cada hoja de ejemplo da sus 4 figuras', walk.length === 4 && attack.length === 4 && cast.length === 4);
assert('en las 12 se encuentra el palo magenta (la mano y el giro del arma)', [...walk, ...attack, ...cast].every(f => f.hand && Number.isFinite(f.angle)));
assert('al caminar, el arma apunta siempre igual: hacia delante y algo hacia abajo (~20°)', walk.every(f => f.angle > 12 && f.angle < 28), walk.map(f => f.angle.toFixed(0)).join());
assert('al atacar: baja, se alza por detrás de la cabeza, golpea hacia delante y remata hacia el suelo',
    attack[0].angle > 0 && attack[0].angle < 30 && Math.abs(attack[1].angle) > 110 && attack[2].angle > 5 && attack[2].angle < 45 && attack[3].angle > attack[2].angle);
assert('al lanzar una habilidad: el arma sube recta (~-90°) y luego apunta al frente (~0°)', Math.abs(cast[1].angle + 90) < 12 && Math.abs(cast[2].angle) < 12, cast.map(f => f.angle.toFixed(0)).join());
assert('del palo no queda ni un píxel magenta en el cuerpo', [...walk, ...attack, ...cast].every(f => {
    for (let i = 0; i < f.rgba.length; i += 4) if (f.rgba[i + 3] > 40 && f.rgba[i] - f.rgba[i + 1] > 70 && f.rgba[i + 2] - f.rgba[i + 1] > 70 && f.rgba[i] > 140 && f.rgba[i + 2] > 140) return false;
    return true;
}));
assert('una hoja con las rayas de la cuadrícula dibujadas (la de lanzar) se lee igual: las rayas se borran', cast.every(f => f.body.x1 - f.body.x0 < 420 && f.body.y1 - f.body.y0 < 480));
let threw = false;
try { await readSheet(EX('ancla.png'), { frames: 4, rows: 2 }); } catch { threw = true; }
assert('una imagen que no trae 4 figuras se rechaza', threw);

// --- Colocar: mismos pies, mismo lienzo ---
const L = layoutBase(walk, { align: 'torso', standing: 1 });
assert('todos los fotogramas caben en el lienzo, con los pies en la misma línea',
    walk.every((f, i) => L.place[i].top + f.body.y1 === L.baseline && L.place[i].left + f.body.x0 >= 0 && L.place[i].left + f.body.x1 < L.w && L.place[i].top + f.body.y0 >= 0));
assert('al caminar la mano casi no se mueve de fotograma a fotograma (el torso no baila)',
    Math.max(...L.frames.map(a => a.x)) - Math.min(...L.frames.map(a => a.x)) < L.heroHeight * 0.06 && Math.max(...L.frames.map(a => a.y)) - Math.min(...L.frames.map(a => a.y)) < L.heroHeight * 0.03);
const on = layoutOnBase(walk, L, { align: 'torso', standing: 1 });
assert('una hoja colocada sobre su propia base cae exactamente en el mismo sitio', on.scale === 1 && on.place.every((p, i) => Math.abs(p.left - L.place[i].left) <= 1 && Math.abs(p.top - L.place[i].top) <= 1));

// --- Teñir: solo el metal ---
{
    const buf = Buffer.from([150, 152, 149, 255,   40, 60, 140, 255,   20, 20, 22, 255,   150, 150, 150, 0,   200, 150, 110, 255]);
    const before = Buffer.from(buf);
    tintMetal(buf, TINTS.negra);
    assert('el tinte negro oscurece el gris del acero', buf[0] < 90 && buf[1] < 90 && buf[2] < 100);
    assert('y no toca la capa azul, el contorno negro, lo transparente ni la piel', [4, 8, 12, 16].every(o => buf.subarray(o, o + 4).equals(before.subarray(o, o + 4))));
    const gold = Buffer.from([150, 152, 149, 255]);
    tintMetal(gold, TINTS.oro);
    assert('el tinte dorado da un amarillo (rojo y verde por encima del azul)', gold[0] > gold[2] + 60 && gold[1] > gold[2] + 40);
}

// --- La revisión ---
assert('en una hoja buena, ningún fotograma desentona de color', colorDrift(walk).every(d => d < 0.08), colorDrift(walk).map(d => d.toFixed(2)).join());
{
    // Un fotograma con la capa de otro color (se le sube el verde al azul de la capa): la revisión lo caza
    const odd = walk.map((f, i) => (i === 1 ? { ...f, rgba: Buffer.from(f.rgba) } : f));
    for (let i = 0; i < odd[1].rgba.length; i += 4) { const [r, g, b] = [odd[1].rgba[i], odd[1].rgba[i + 1], odd[1].rgba[i + 2]]; if (b > r + 25 && b > g + 10) { odd[1].rgba[i + 1] = b; odd[1].rgba[i + 2] = g; } }
    const d = colorDrift(odd);
    assert('un fotograma con la capa de otro color se detecta, y solo ese', d[1] > 0.08 && d[0] < 0.08 && d[2] < 0.08 && d[3] < 0.08, d.map(v => v.toFixed(2)).join());
}
assert('caminar y atacar de la misma armadura llevan los mismos colores', printGap(sheetPrint(walk), sheetPrint(attack)) < sf.config.qa.outfit);
{
    const qa = await sf.qa('walk', walk);
    assert('la hoja base pasa su propia revisión', qa.ok && qa.marker, qa.problems.join(' · '));
    const swapped = await sf.qa('attack', [attack[1], attack[0], attack[2], attack[3]]);
    assert('una hoja con dos poses cambiadas de sitio no la pasa (el arma no gira como en la base)', !swapped.ok && swapped.problems.some(p => /el arma gira/.test(p)));
}

// --- El armario y el manifiesto del juego ---
const armors = Object.keys(sf.armario);
assert('el armario tiene una armadura base y varias más', armors.filter(id => sf.armario[id].base).length === 1 && armors.length >= 5, armors.join());
assert('cada armadura dice de dónde sale: la base, un tinte de otra o sus hojas', armors.every(id => { const e = sf.armario[id]; return e.name && (e.base || (e.tint && sf.armario[e.tint.from] && TINTS[e.tint.color]) || e.sheets); }));
assert('ninguna armadura del armario está marcada para revisar', armors.every(id => !sf.armario[id].review), armors.filter(id => sf.armario[id].review).join());
assert('el manifiesto del juego trae las mismas armaduras y animaciones', Object.keys(HERO_SPRITES.armors).join() === armors.join()
    && Object.keys(HERO_SPRITES.anims).join() === sf.anims().join());
assert('cada fotograma del manifiesto existe en el juego', Object.values(HERO_SPRITES.armors).every(a => Object.entries(HERO_SPRITES.anims).every(([name, A]) =>
    A.frames.every((_, i) => fs.existsSync(path.join(root, a.dir, `${name}_${i + 1}.webp`))))));
{
    const a = HERO_SPRITES.anims.walk, file = path.join(root, HERO_SPRITES.armors[armors[1]].dir, 'walk_1.webp');
    const m = await sharp(file).metadata();
    assert('los fotogramas de cualquier armadura miden lo que dice el manifiesto (comparten lienzo y mano con la base)', m.width === a.w && m.height === a.h);
}
assert('cada animación dice su lienzo, la altura del héroe y la mano en cada fotograma, dentro del lienzo',
    Object.values(HERO_SPRITES.anims).every(A => A.w > 0 && A.h > 0 && A.heroHeight > 0 && A.frames.length === 4 && A.frames.every(f => f.x >= 0 && f.x < A.w && f.y >= 0 && f.y < A.h && Number.isFinite(f.angle))));
assert('el manifiesto es el que saldría ahora de las hojas de ejemplo (no se ha quedado atrás)',
    JSON.stringify((await sf.animInfo('walk')).frames) === JSON.stringify(HERO_SPRITES.anims.walk.frames)
    && JSON.stringify((await sf.animInfo('attack')).frames) === JSON.stringify(HERO_SPRITES.anims.attack.frames));
assert('el reposo es un fotograma que existe (de pie) y la espada tiene sus medidas', HERO_SPRITES.anims[HERO_SPRITES.idle.anim].frames[HERO_SPRITES.idle.frame]
    && HERO_SPRITES.sword.length > 0.3 && HERO_SPRITES.sword.grip > 0 && HERO_SPRITES.sword.fist > 0);

console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
