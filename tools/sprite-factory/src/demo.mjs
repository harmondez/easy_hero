// =============================================
// 🏭 Sprite Factory · la demo: una página para ver al héroe moverse con cualquier armadura y espada del armario.
// Lee el mismo manifiesto y los mismos fotogramas que el juego. Sale en taller/sprite-factory/demo.html (no se sube).
// =============================================
import fs from 'fs';
import path from 'path';

export async function buildDemo(sf) {
    const data = await sf.writeManifest();
    const { ART } = await import('../../../src/data/art.js');
    const { GEAR } = await import('../../../src/data/gear.js');
    const up = '../../';
    const swords = Object.keys(GEAR).filter(id => ART.icons[`objeto-${id}`]).map(id => ({ id, name: GEAR[id].name, src: up + ART.icons[`objeto-${id}`].src, w: ART.icons[`objeto-${id}`].w, h: ART.icons[`objeto-${id}`].h }));
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sprite Factory · el héroe por capas</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 20px; background: #15100c; color: #e9dcc4; font: 15px/1.5 'Work Sans', system-ui, sans-serif; }
  h1 { font: 700 1.3rem Cinzel, Georgia, serif; color: #f0b03c; margin: 0 0 4px; }
  h2 { font: 700 1rem Cinzel, Georgia, serif; color: #f0b03c; margin: 18px 0 6px; }
  p { margin: 0 0 12px; color: #b9a98f; max-width: 78ch; }
  .scene { position: relative; width: min(100%, 960px); overflow: hidden; border: 1px solid #5a4630; border-radius: 6px; background: #2a2018 center / cover; }
  .scene.map { aspect-ratio: 960 / 300; background-image: url('${up}img/zones/zafias-aldea.webp'); background-position: 50% 62%; background-size: 135%; }
  .scene.fight { aspect-ratio: 16 / 8; background-image: url('${up}img/bg/forest.webp'); }
  .ls { position: absolute; transform-origin: 50% 100%; image-rendering: pixelated; }
  .ls-inner { position: absolute; left: 0; bottom: 0; transform-origin: 0 100%; }
  .ls img { position: absolute; left: 0; top: 0; user-select: none; -webkit-user-drag: none; }
  .ls .sword { transform-origin: 50% ${data.sword.grip * 100}%; }
  .ls.is-idle .ls-breath { animation: breathe 2.6s ease-in-out infinite; transform-origin: 50% 100%; }
  .ls-breath { position: absolute; inset: 0; }
  @keyframes breathe { 50% { transform: scaleY(1.018) scaleX(0.994); } }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; align-items: center; }
  .bar b { min-width: 84px; color: #b9a98f; font-weight: 600; }
  button { padding: 7px 12px; font: 700 0.86rem inherit; color: #2a1d12; background: #d8c39a; border: 2px solid #8a6a3e; border-radius: 4px; cursor: pointer; }
  button.on { background: #f0b03c; }
  button.go { background: #d9662c; color: #fff; border-color: #7a3514; }
  label { display: inline-flex; gap: 6px; align-items: center; color: #b9a98f; }
</style></head><body>
<h1>Sprite Factory · el héroe por capas</h1>
<p>El cuerpo de cada armadura son sus fotogramas, <b>sin espada</b>. La espada es un dibujo aparte que se coloca en la mano de cada
fotograma. El reposo no está dibujado: es el héroe de pie respirando por código.</p>
<div class="bar"><b>Armadura</b><span id="armors"></span></div>
<div class="bar"><b>Espada</b><span id="swords"></span></div>
<h2>En el mapa: camina</h2>
<div class="scene map" id="map"></div>
<h2>En el combate: respira y ataca</h2>
<div class="scene fight" id="fight"></div>
<div class="bar"><button class="go" id="attack">⚔ Atacar</button><label><input type="checkbox" id="slow"> a cámara lenta</label></div>
<script>
const S = ${JSON.stringify(data)};
const SWORDS = ${JSON.stringify(swords)};
const UP = '${up}';

/** Un personaje por capas: cuerpo (según la armadura), espada anclada a la mano y el puño por encima. */
class LayeredSprite {
  constructor(host, height) {
    this.height = height;
    this.el = document.createElement('div'); this.el.className = 'ls';
    this.inner = document.createElement('div'); this.inner.className = 'ls-inner';
    this.breath = document.createElement('div'); this.breath.className = 'ls-breath';
    this.body = new Image(); this.sword = new Image(); this.sword.className = 'sword'; this.fist = new Image();
    this.breath.append(this.body, this.sword, this.fist); this.inner.append(this.breath); this.el.append(this.inner); host.append(this.el);
    this.armor = Object.keys(S.armors)[0]; this.weapon = SWORDS[0]; this.anim = 'walk'; this.frame = 0;
  }
  set(anim, frame) { this.anim = anim; this.frame = frame; this.draw(); }
  equip({ armor, weapon }) { if (armor) this.armor = armor; if (weapon) this.weapon = weapon; this.draw(); }
  draw() {
    const A = S.anims[this.anim], f = A.frames[this.frame], k = this.height / A.heroHeight;
    const src = UP + S.armors[this.armor].dir + '/' + this.anim + '_' + (this.frame + 1) + '.webp';
    this.el.style.width = A.w * k + 'px'; this.el.style.height = A.h * k + 'px';
    this.inner.style.width = A.w + 'px'; this.inner.style.height = A.h + 'px'; this.inner.style.scale = k;
    this.body.src = this.fist.src = src;
    const len = A.heroHeight * S.sword.length, w = len * this.weapon.w / this.weapon.h;
    Object.assign(this.sword.style, { width: w + 'px', height: len + 'px', left: (f.x - w / 2) + 'px', top: (f.y - len * S.sword.grip) + 'px', transform: 'rotate(' + (f.angle - 90) + 'deg)' });
    this.sword.src = this.weapon.src;
    this.fist.style.clipPath = 'circle(' + (A.heroHeight * S.sword.fist) + 'px at ' + f.x + 'px ' + f.y + 'px)';
  }
}
for (const [name, A] of Object.entries(S.anims)) for (const a of Object.values(S.armors)) for (let n = 1; n <= A.frames.length; n++) new Image().src = UP + a.dir + '/' + name + '_' + n + '.webp';

// En el mapa: pequeño, anda de un lado a otro (se voltea al dar la vuelta)
const map = document.getElementById('map');
const walker = new LayeredSprite(map, 74);
walker.el.style.bottom = '16%';
let x = 6, dir = 1, step = 0, last = 0, acc = 0;
const W = S.anims.walk;
function tick(t) {
  const dt = Math.min(50, t - (last || t)); last = t; acc += dt;
  x += dir * dt * 0.0075;
  if (x > 86) dir = -1; if (x < 6) dir = 1;
  if (acc > 1000 / W.fps) { acc = 0; step = (step + 1) % W.order.length; walker.set('walk', W.order[step]); }
  walker.el.style.left = x + '%';
  walker.el.style.transform = 'scaleX(' + dir + ')';
  requestAnimationFrame(tick);
}
walker.set('walk', 0); requestAnimationFrame(tick);

// En el combate: grande; reposo (respira) y ataque
const fight = document.getElementById('fight');
const hero = new LayeredSprite(fight, 0);
function fit() { hero.height = fight.clientHeight * 0.5; hero.el.style.left = '20%'; hero.el.style.bottom = '13%'; hero.draw(); }
const idle = () => { hero.set(S.idle.anim, S.idle.frame); hero.el.classList.add('is-idle'); };
let busy = false;
function attack() {
  if (busy) return; busy = true;
  hero.el.classList.remove('is-idle');
  const A = S.anims.attack, k = document.getElementById('slow').checked ? 5 : 1;
  let t = 0;
  A.order.forEach((i, n) => { setTimeout(() => hero.set('attack', i), t); t += (A.hold ? A.hold[n] : 1000 / A.fps) * k; });
  setTimeout(() => { idle(); busy = false; }, t);
}
document.getElementById('attack').onclick = attack;
addEventListener('resize', fit); fit(); idle();

const pick = (host, items, label, on, current) => items.forEach(it => { const b = document.createElement('button'); b.textContent = label(it); if (it === current) b.className = 'on';
  b.onclick = () => { host.querySelectorAll('button').forEach(o => o.classList.toggle('on', o === b)); on(it); }; host.append(b, ' '); });
const start = SWORDS.find(s => s.id === 'espada-de-hierro') || SWORDS[0];
[walker, hero].forEach(s => s.equip({ weapon: start }));
const armors = Object.keys(S.armors);
pick(document.getElementById('armors'), armors, id => S.armors[id].name, id => [walker, hero].forEach(s => s.equip({ armor: id })), armors[0]);
pick(document.getElementById('swords'), SWORDS, s => s.name, w => [walker, hero].forEach(s => s.equip({ weapon: w })), start);
</script></body></html>
`;
    const out = path.join(sf.work, 'demo.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    return out;
}
