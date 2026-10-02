// El equipo de la aventura y la tienda: armas del mercader, cristales de mejora, comida, el frasco de veneno y el
// modo pruebas (todo gratis)
import { GEAR, GEAR_FOR_SALE, ELEMENTS, SLOT_ICONS, WEAPON_UPGRADE, STARTER_GEAR } from '../src/data/gear.js';
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
assert('cada arma tiene rareza, elemento, ranura y ATK válidos', ids.every(id => {
    const g = GEAR[id];
    return RARITY_BY_ID[g.rarity] && ELEMENTS[g.element] && SLOT_ICONS[g.slot] && g.atq > 0 && g.name && g.desc;
}));
assert('sus efectos existen', ids.every(id => [...(GEAR[id].onHit || []), ...(GEAR[id].onStart || [])].every(f => EFFECTS[f.id] && f.turns > 0)));
assert('el mercader vende 8 armas, ordenadas por precio', GEAR_FOR_SALE.length === 8
    && GEAR_FOR_SALE.every((id, i) => i === 0 || GEAR[GEAR_FOR_SALE[i - 1]].price <= GEAR[id].price));
assert('cada arma que no es la inicial tiene su imagen de detalle (objeto-<id>)', ids.filter(id => id !== STARTER_GEAR).every(id => ART.icons[`objeto-${id}`]));
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
m = freshMeta(1000);
for (let i = 0; i < 5; i++) Meta.buyWeaponUpgrade(m, STARTER_GEAR);
assert(`el cristal de mejora sube el arma hasta +${WEAPON_UPGRADE.max}`, Meta.weaponUpgradeLevel(m, STARTER_GEAR) === WEAPON_UPGRADE.max
    && m.gold === 1000 - WEAPON_UPGRADE.max * WEAPON_UPGRADE.price);
m = freshMeta(1000);
Meta.buyFood(m, 'pan');
assert('el pan se compra y se come una vez', Meta.foodCount(m, 'pan') === 1 && Meta.eatFood(m, 'pan') && !Meta.eatFood(m, 'pan'));

RPG_BALANCE.freeShop = true;
m = freshMeta(0);
assert('modo pruebas: con 0 de oro se compra todo gratis', Meta.buyGear(m, 'quebrantaamaneceres').ok && Meta.buyPotion(m).ok
    && Meta.buyElixir(m, 'veneno').ok && Meta.buyFood(m, 'pan').ok && Meta.buyWeaponUpgrade(m, STARTER_GEAR).ok && m.gold === 0);
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
