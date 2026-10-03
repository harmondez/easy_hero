// =============================================
// 🎒 Botín de la aventura (solo datos): lo que sueltan los enemigos al caer
//
// MATERIALS — objetos que se guardan en el inventario (aún no se usan para nada: se coleccionan)
//   name, rarity (id de src/data/rarities.js), img (icono de ART.icons, salido de img/items con `npm run icons`), desc
//
// DROPS — tablas de botín. Un enemigo usa una con `drops: '<id>'` (en su criatura o en su parada de la zona)
//   chance   probabilidad de que suelte algo (el resto de las veces, nada)
//   table    qué suelta cuando suelta: [{ w, … }], con `w` el peso (aquí, el tanto por ciento). Cada entrada es
//              { potion: true }        una poción de vida
//              { manaPotion: true }    una poción de maná
//              { material: '<id>' }    un material de MATERIALS
//            Si los pesos no suman 100, se reparten en proporción.
// =============================================
export const MATERIALS = {
    'armadura-oxidada': { name: 'Trozo de armadura oxidada', rarity: 'poco_comun', img: 'material-armadura-oxidada',
        desc: 'Un pedazo de coraza comido por el óxido. Los goblins se lo atan al pecho con cuerdas.' },
    'oreja-goblin': { name: 'Oreja de goblin', rarity: 'poco_comun', img: 'material-oreja-goblin',
        desc: 'Una oreja de goblin, larga y puntiaguda.' },
    'collar-goblin': { name: 'Collar goblin', rarity: 'rara', img: 'material-collar-goblin',
        desc: 'Un collar de huesos y cuentas. Los goblins no se lo quitan ni para dormir.' },
    'diente-lobo': { name: 'Diente de lobo', rarity: 'epica', img: 'material-diente-lobo',
        desc: 'Un colmillo entero, sin una sola grieta. Cuesta sacar uno así.' },
    'piel-lobo': { name: 'Piel de lobo', rarity: 'poco_comun', img: 'material-piel-lobo',
        desc: 'Una piel gris, gruesa y áspera.' },
    'garra-lobo': { name: 'Garra de lobo', rarity: 'poco_comun', img: 'material-garra-lobo',
        desc: 'Una garra negra y curva.' },
    // De misión: el colmillo se lo lleva Bram y las plantas, Amelie
    'colmillo-feronius': { name: 'Colmillo de Feronius', rarity: 'epica', img: 'material-diente-lobo',
        desc: 'El colmillo del lobo alfa de Zafias, más largo que una mano. Bram lo quiere para templar acero.' },
    'planta-medicinal': { name: 'Planta medicinal', rarity: 'comun', img: 'ingrediente-hierba',
        desc: 'Una mata de hojas anchas y flores blancas, con la raíz entera. Amelie hace medicina con ella.' },
    // Con dibujo, pero todavía no lo suelta nadie
    'slime-condensado': { name: 'Slime condensado', rarity: 'epica', img: 'material-slime-condensado',
        desc: 'Una bola de slime dura como la resina.' }
};

export const DROPS = {
    goblin: {
        chance: 0.33,
        table: [
            { w: 30, manaPotion: true },
            { w: 25, material: 'armadura-oxidada' },
            { w: 25, material: 'oreja-goblin' },
            { w: 20, material: 'collar-goblin' }
        ]
    },
    // El jefe de la zona suelta siempre su colmillo (la misión de Bram)
    feronius: { chance: 1, table: [{ w: 100, material: 'colmillo-feronius' }] },
    lobo: {
        chance: 0.33,
        table: [
            { w: 30, potion: true },
            { w: 25, material: 'diente-lobo' },
            { w: 25, material: 'piel-lobo' },
            { w: 10, material: 'garra-lobo' },
            { w: 10, manaPotion: true }
        ]
    }
};
