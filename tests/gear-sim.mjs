// El equipo de la aventura y la tienda: armas del mercader, cristales de mejora, comida, el frasco de veneno y el
// modo pruebas (todo gratis)
import { GEAR, GEAR_FOR_SALE, ELEMENTS, SLOT_ICONS, WEAPON_UPGRADE, STARTER_GEAR, STARTER_ARMOR } from '../src/data/gear.js';
import { HERO_SPRITES } from '../src/data/hero-sprites.js';
import { SHOPS, SELL_RATE } from '../src/data/shops.js';
import { EFFECTS, ELIXIRS, FOOD } from '../src/data/effects.js';
import { RARITY_BY_ID } from '../src/data/rarities.js';
import { ART } from '../src/data/art.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import * as Meta from '../src/meta.js';
import { createRpgHero, createRpgCombat, rpgCombatAction } from '../src/engine.js';
import { createRng } from '../src/rng.js';

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const freshMeta = gold => { const m = Meta.loadMeta({ getItem: () => null }); m.gold = gold; return m; };

console.log('\n⚔️ Las armas de la aventura (datos)');
const ids = Object.keys(GEAR);
const weapons = ids.filter(id => GEAR[id].slot === 'weapon'), armors = ids.filter(id => GEAR[id].slot === 'armor');
assert('cada pieza tiene rareza, elemento, ranura, nombre y descripción válidos', ids.every(id => {
    const g = GEAR[id];
    return RARITY_BY_ID[g.rarity] && ELEMENTS[g.element] && SLOT_ICONS[g.slot] && g.name && g.desc;
}));
assert('cada arma da ATK', weapons.length === 10 && weapons.every(id => GEAR[id].atq > 0));
assert('cada armadura da vida y tiene su aspecto dibujado por el Sprite Factory (look)', armors.length === 8
    && armors.every(id => GEAR[id].hp >= 0 && HERO_SPRITES.armors[GEAR[id].look]) && new Set(armors.map(id => GEAR[id].look)).size === 8);
assert('la armadura con la que despiertas es la de acero: no da vida ni se vende', GEAR[STARTER_ARMOR].look === 'acero' && GEAR[STARTER_ARMOR].hp === 0 && GEAR[STARTER_ARMOR].price == null);
assert('las armaduras, cuanto más caras, más vida dan', armors.filter(id => GEAR[id].price != null).sort((a, b) => GEAR[a].price - GEAR[b].price)
    .every((id, i, arr) => i === 0 || GEAR[arr[i - 1]].hp < GEAR[id].hp));
assert('sus efectos existen', ids.every(id => [...(GEAR[id].onHit || []), ...(GEAR[id].onStart || [])].every(f => EFFECTS[f.id] && f.turns > 0)));
assert('Bram vende 8 armas y 7 armaduras, ordenadas por precio', GEAR_FOR_SALE.filter(id => GEAR[id].slot === 'weapon').length === 8 && GEAR_FOR_SALE.filter(id => GEAR[id].slot === 'armor').length === 7
    && GEAR_FOR_SALE.every((id, i) => i === 0 || GEAR[GEAR_FOR_SALE[i - 1]].price <= GEAR[id].price));
assert('cada arma tiene su imagen de detalle (objeto-<id>): es la que se le pone en la mano al héroe', weapons.every(id => ART.icons[`objeto-${id}`]));
assert('los iconos de ranura y de elemento existen', Object.values(SLOT_ICONS).every(i => ART.icons[i]) && Object.values(ELEMENTS).every(e => !e.icon || ART.icons[e.icon]));
assert('los consumibles nuevos tienen imagen (frasco, pan, cristal)', ART.icons[ELIXIRS.veneno.img] && ART.icons[FOOD.pan.img] && ART.icons[WEAPON_UPGRADE.img]);

console.log('\n🪙 Comprar');
RPG_BALANCE.freeShop = false;
let m = freshMeta(100);
assert('sin oro suficiente no se compra un arma', !Meta.buyGear(m, 'espada-imperial').ok && !Meta.ownsGear(m, 'espada-imperial'));
m.gold = 1000;
const r = Meta.buyGear(m, 'espada-imperial');
assert('con oro, el arma pasa al inventario y cuesta su precio', r.ok && Meta.ownsGear(m, 'espada-imperial') && m.gold === 1000 - GEAR['espada-imperial'].price);
assert('no se compra dos veces', !Meta.buyGear(m, 'espada-imperial').ok);
assert('lo que no está a la venta no se compra', !Meta.buyGear(m, 'espada-de-zafias').ok);
// El cristal de mejora: se compra (100), se lleva encima y Bram lo gasta al mejorar
m = freshMeta(1000);
assert('sin cristales no se puede mejorar un arma', !Meta.canUpgradeWeapon(m, STARTER_GEAR) && !Meta.upgradeWeapon(m, STARTER_GEAR).ok);
assert('el cristal cuesta 100 de oro y se queda en la mochila', WEAPON_UPGRADE.price === 100 && Meta.buyCrystal(m).ok && Meta.crystalCount(m) === 1 && m.gold === 900);
assert('mejorar gasta un cristal y sube el arma +1', Meta.upgradeWeapon(m, STARTER_GEAR).ok && Meta.crystalCount(m) === 0 && Meta.weaponUpgradeLevel(m, STARTER_GEAR) === 1 && m.gold === 900);
for (let i = 0; i < 5; i++) { Meta.buyCrystal(m); Meta.upgradeWeapon(m, STARTER_GEAR); }
assert(`un arma admite hasta +${WEAPON_UPGRADE.max}: el cristal que sobra no se gasta`, Meta.weaponUpgradeLevel(m, STARTER_GEAR) === WEAPON_UPGRADE.max
    && Meta.crystalCount(m) === 3 && m.gold === 400);
assert('no se mejora un arma que no es tuya', !Meta.canUpgradeWeapon(m, 'espada-imperial'));
m = freshMeta(5000);
for (let i = 0; i < 20; i++) Meta.buyCrystal(m);
assert(`se pueden llevar hasta ${WEAPON_UPGRADE.carry} cristales`, Meta.crystalCount(m) === WEAPON_UPGRADE.carry && m.gold === 5000 - WEAPON_UPGRADE.carry * 100);

console.log('\n💰 Vender al 75 %');
m = freshMeta(1000);
assert('el precio de venta es el 75 % del de compra, redondeado hacia abajo', SELL_RATE === 0.75 && Meta.sellValue(20) === 15 && Meta.sellValue(5) === 3 && Meta.sellValue(650) === 487);
assert('sin nada que vender, no se vende', !Meta.sellItem(m, 'potion').ok && !Meta.sellItem(m, 'crystal').ok && m.gold === 1000);
Meta.buyPotion(m); Meta.buyManaPotion(m); Meta.buyElixir(m, 'veneno'); Meta.buyFood(m, 'pan'); Meta.buyCrystal(m);
let before = m.gold;
assert('se venden pociones, elixires, pan y cristales, de uno en uno',
    ['potion', 'mana_potion', 'elixir:veneno', 'food:pan', 'crystal'].every(k => Meta.sellInfo(m, k).have === 1 && Meta.sellItem(m, k).ok && Meta.sellInfo(m, k).have === 0)
    && m.gold === before + 15 + 18 + 15 + 3 + 75);
m = freshMeta(2000);
Meta.buyGear(m, 'espada-imperial');
assert('la espada de inicio no se vende (no tiene precio)', Meta.sellInfo(m, `gear:${STARTER_GEAR}`).have === 0 && !Meta.sellItem(m, `gear:${STARTER_GEAR}`).ok);
m.advWeapon = 'espada-imperial';
assert('la espada que llevas puesta no se vende', Meta.sellInfo(m, 'gear:espada-imperial').have === 0 && Meta.sellInfo(m, 'gear:espada-imperial').equipped && !Meta.sellItem(m, 'gear:espada-imperial').ok);
m.advWeapon = STARTER_GEAR;
Meta.buyCrystal(m); Meta.upgradeWeapon(m, 'espada-imperial');
before = m.gold;
assert('una espada guardada se vende al 75 % y pierde sus cristales', Meta.sellItem(m, 'gear:espada-imperial').ok && !Meta.ownsGear(m, 'espada-imperial')
    && m.gold === before + Math.floor(GEAR['espada-imperial'].price * 0.75) && Meta.weaponUpgradeLevel(m, 'espada-imperial') === 0);
assert('y se puede volver a comprar', Meta.buyGear(m, 'espada-imperial').ok);
m = freshMeta(3000);
Meta.buyGear(m, 'cota-de-malla');
assert('una armadura comprada no admite cristales (son para espadas)', Meta.ownsGear(m, 'cota-de-malla') && !Meta.canUpgradeWeapon({ ...m, crystals: 3 }, 'cota-de-malla'));
m.advArmor = 'cota-de-malla';
assert('la armadura que llevas puesta no se vende', Meta.sellInfo(m, 'gear:cota-de-malla').equipped && !Meta.sellItem(m, 'gear:cota-de-malla').ok);
m.advArmor = STARTER_ARMOR;
before = m.gold;
assert('guardada, se vende al 75 %', Meta.sellItem(m, 'gear:cota-de-malla').ok && m.gold === before + Math.floor(GEAR['cota-de-malla'].price * 0.75) && !Meta.ownsGear(m, 'cota-de-malla'));
assert('las mejoras permanentes y los materiales no se venden', !Meta.sellItem(m, 'upgrade:filo').ok && !Meta.sellItem(m, 'material:piel-lobo').ok);

console.log('\n🛒 Cada tienda vende lo suyo');
assert('la forja: el equipo (espadas y armaduras) y el cristal', SHOPS.forja.sells.join() === 'gear:*,crystal');
assert('la botica: pociones de vida y de maná, elixir de fuerza, elixir arcano y frasco de veneno',
    SHOPS.botica.sells.join() === 'potion,mana_potion,elixir:fuerza,elixir:arcano,elixir:veneno');
assert('la posada: pan', SHOPS.posada.sells.join() === 'food:pan');
assert('las lecciones de Odo: las mejoras permanentes que sirven en la aventura',
    SHOPS.instructor.sells.every(k => k.startsWith('upgrade:') && Meta.UPGRADES_BY_ID[k.slice(8)]) && SHOPS.instructor.sells.length === 4);
assert('todo lo que se vende existe', Object.values(SHOPS).flatMap(s => s.sells).every(k => k === 'gear:*' || k === 'crystal' || k === 'potion' || k === 'mana_potion'
    || (k.startsWith('elixir:') && ELIXIRS[k.slice(7)]) || (k.startsWith('food:') && FOOD[k.slice(5)]) || (k.startsWith('upgrade:') && Meta.UPGRADES_BY_ID[k.slice(8)])));
m = freshMeta(1000);
Meta.buyFood(m, 'pan');
assert('el pan se compra y se come una vez', Meta.foodCount(m, 'pan') === 1 && Meta.eatFood(m, 'pan') && !Meta.eatFood(m, 'pan'));

RPG_BALANCE.freeShop = true;
m = freshMeta(0);
assert('modo pruebas: con 0 de oro se compra todo gratis', Meta.buyGear(m, 'quebrantaamaneceres').ok && Meta.buyPotion(m).ok
    && Meta.buyElixir(m, 'veneno').ok && Meta.buyFood(m, 'pan').ok && Meta.buyCrystal(m).ok && m.gold === 0);
assert('…y en modo pruebas vender no da oro (si no, sería oro infinito)', Meta.sellItem(m, 'potion').ok && m.gold === 0);
assert('…y las mejoras de La Forja también salen a 0 (salvo las ya al máximo)', Meta.nextUpgradeCost(m, Meta.UPGRADES[0].id) === 0);
RPG_BALANCE.freeShop = false;

console.log('\n🧪 El frasco de veneno se lanza al enemigo');
{
    const c = createRpgCombat(createRpgHero(), { type: 'monster', floor: 1, name: 'Muñeco', icon: '🪆', atq: 1, hp: 40, maxHp: 40, pattern: [{ k: 'rest' }] }, createRng(3));
    c.elixirs = { veneno: 1 };
    const res = rpgCombatAction(c, 'elixir', 'veneno');
    assert('el veneno es para el enemigo, no para ti', res.ok && !!c.monster.effects.veneno && !c.hero.effects.veneno && c.elixirs.veneno === 0
        && c.monster.hp === 40 - ELIXIRS.veneno.effect.power);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);
