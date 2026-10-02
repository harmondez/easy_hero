// =============================================
// 🧪 Taller de iconos — deja listos para el juego los PNG de img/items/ e img/icons/ (incluida img/icons/effects/)
// Uso: npm run icons
//
// También las piezas de equipo de img/weapons/weapon_<tipo>-<Nombre>.png (la hoja sola, sin fondo): salen más grandes
// (≤ 256 px, para el detalle del inventario) como img/ui/objeto-<id>.webp, con <id> = el nombre en minúsculas y con
// guiones (weapon_sword-espada_negra → objeto-espada-negra). El id del objeto en src/data/gear.js es el mismo <id>.
//
// Cada PNG se recorta a su contorno, baja a ≤ 128 px (se ve nítido a 64 px en pantallas densas) y sale en WebP sin
// pérdida a img/ui/<id>.webp. Queda registrado en src/data/art.js → ART.icons[id] = { src, w, h }.
// El id sale de la tabla NOMBRES (el nombre del archivo del director → un id claro en español); si un archivo no está
// en la tabla, su nombre limpio (sin «_t», en minúsculas y con guiones). Los PNG originales no se suben.
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { readManifest, manifestText } from './sprites.mjs';

sharp.cache(false);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = ['img/items', 'img/icons', 'img/icons/effects'];
const OUT = 'img/ui';
const MAX = 128;

// Archivo original → id en el juego, agrupados por para qué sirven
export const NOMBRES = {
    // Objetos
    pocion_vida_t: 'pocion-vida', pocion_mana_t: 'pocion-mana', pocion_veneno_t: 'pocion-veneno',
    comida_vida_2_t: 'comida', upgrade_mejora_arma: 'mejora-arma', ingrediente_pocion_vida_t: 'ingrediente-hierba',
    misc_bolsa_oro_t: 'bolsa-oro', misc_gold_coin_t: 'moneda',
    // Interfaz
    icon_mochila_inventory_t: 'inventario', icon_book_spell_t: 'libro-hechizos', icon_map_t: 'mapa',
    // Ranuras de equipo
    gear_icon_weapon: 'ranura-arma', gear_icon_armor: 'ranura-armadura', gear_icon_helmet: 'ranura-casco',
    gear_icon_gauntlet: 'ranura-guantes', gear_icon_boots: 'ranura-botas', gear_icon_belt: 'ranura-cinturon',
    gear_icon_necklace: 'ranura-collar', gear_icon_ring: 'ranura-anillo',
    // Estadísticas y elementos
    icon_hp: 'vida', icon_sp: 'mana', icon_def: 'defensa', icon_agi: 'agilidad',
    icon_element_fire: 'fuego', icon_element_ice: 'hielo', icon_element_thunder: 'rayo',
    // Efectos
    icon_negative_effects_quemadura: 'efecto-quemadura', icon_negative_effects_envenenado: 'efecto-veneno',
    icon_negative_effects_sangrado: 'efecto-sangrado', icon_negative_effects_aturdimiento: 'efecto-aturdido',
    icon_positive_effects_aumento_ataque: 'efecto-mas-ataque', icon_positive_effects_aumento_poder_magia: 'efecto-mas-ph',
    icon_positive_effects_regeneracion_vida: 'efecto-regeneracion',
    // Menú, paradas del mapa, combate y mejoras de La Forja
    icon_bestiario: 'menu-bestiario', icon_coleccion: 'menu-coleccion', icon_logros: 'menu-logros', icon_opciones: 'menu-opciones',
    stop_hablar: 'parada-hablar', stop_posada: 'parada-posada', stop_mirar: 'parada-mirar', stop_salida: 'parada-salida',
    skill_grito: 'habilidad-grito', icon_victoria: 'victoria', icon_derrota: 'derrota',
    forja_filo: 'forja-filo', forja_estudio: 'forja-estudio', forja_herencia: 'forja-herencia', forja_linterna: 'forja-linterna',
    forja_suerte: 'forja-suerte'
};
const idFor = base => NOMBRES[base] || base.replace(/_t$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const manifestFile = path.join(root, 'src', 'data', 'art.js');
const art = await readManifest(manifestFile);
art.icons = art.icons || {};
fs.mkdirSync(path.join(root, OUT), { recursive: true });
const done = [];
for (const dir of SOURCES) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs).filter(f => /\.png$/i.test(f)).sort()) {
        const id = idFor(file.replace(/\.png$/i, ''));
        const outRel = `${OUT}/${id}.webp`;
        const trimmed = await sharp(path.join(abs, file)).trim({ threshold: 1 }).toBuffer();
        const info = await sharp(trimmed).resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
            .webp({ lossless: true, effort: 6 }).toFile(path.join(root, outRel));
        art.icons[id] = { src: outRel, w: info.width, h: info.height };
        done.push(`${dir}/${file} → ${outRel}`);
    }
}
// Piezas de equipo: la hoja tal cual se verá en el detalle
const GEAR_DIR = path.join(root, 'img/weapons');
const GEAR_MAX = 256;
if (fs.existsSync(GEAR_DIR)) {
    for (const file of fs.readdirSync(GEAR_DIR).filter(f => /^weapon_[a-z]+-.+\.png$/i.test(f)).sort()) {
        const name = file.replace(/^weapon_[a-z]+-/i, '').replace(/\.png$/i, '');
        const id = 'objeto-' + name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const outRel = `${OUT}/${id}.webp`;
        const trimmed = await sharp(path.join(GEAR_DIR, file)).trim({ threshold: 1 }).toBuffer();
        const info = await sharp(trimmed).resize(GEAR_MAX, GEAR_MAX, { fit: 'inside', withoutEnlargement: true })
            .webp({ lossless: true, effort: 6 }).toFile(path.join(root, outRel));
        art.icons[id] = { src: outRel, w: info.width, h: info.height };
        done.push(`img/weapons/${file} → ${outRel}`);
    }
}
// Marcos y barras de la interfaz: recortes de la hoja img/icons/buttons-ui/ui_1.png (cada caja, con margen, se recorta
// luego a su contorno) y las piezas que el director ya recortó en esa carpeta. Salen a tamaño natural (para usarlos
// como border-image en CSS): img/ui/<id>.webp
const UI_DIR = path.join(root, 'img/icons/buttons-ui');
const UI_SHEET_CROPS = {
    'marco-boton':          [245, 978, 665, 1095],    // barra de piedra clara: botón
    'marco-boton-luz':      [742, 976, 1166, 1096],   // la misma, con brillo dorado: botón activo / encima
    'marco-boton-oscuro':   [1245, 978, 1665, 1095],  // oscura: botón deshabilitado
    'marco-mini':           [375, 855, 505, 975],     // ranura pequeña: el icono de cada fila
    'marco-mini-luz':       [618, 848, 765, 975],
    'marco-ranura-luz':     [470, 640, 700, 865],     // ranura grande con brillo dorado (legendaria)
    'marco-ranura-epica':   [1590, 640, 1815, 868],   // con brillo violeta (épica)
    'marco-ranura-cerrada': [1230, 645, 1445, 860]    // tapiada (sin nada)
};
const UI_FILES = { 'ranura_desbloqueada': 'marco-ranura', 'ranura_bloqueada': 'marco-ranura-bloqueada',
    'bar-hp': 'barra-vida', 'bar-sp': 'barra-mana', 'hp-sp-bar': 'barra-vacia' };
if (fs.existsSync(UI_DIR)) {
    const save = async (input, id) => {
        const outRel = `${OUT}/${id}.webp`;
        const trimmed = await sharp(input).trim({ threshold: 1 }).toBuffer();
        const info = await sharp(trimmed).webp({ lossless: true, effort: 6 }).toFile(path.join(root, outRel));
        art.icons[id] = { src: outRel, w: info.width, h: info.height };
        done.push(`buttons-ui → ${outRel} (${info.width}×${info.height})`);
    };
    const sheet = path.join(UI_DIR, 'ui_1.png');
    if (fs.existsSync(sheet)) {
        for (const [id, [x0, y0, x1, y1]] of Object.entries(UI_SHEET_CROPS)) {
            await save(await sharp(sheet).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toBuffer(), id);
        }
    }
    for (const [base, id] of Object.entries(UI_FILES)) {
        const file = path.join(UI_DIR, `${base}.png`);
        if (fs.existsSync(file)) await save(file, id);
    }
}
// Retratos para los diálogos (novela visual): img/characters/<id>-profile.png → img/portraits/<id>.webp (recortados a su
// contorno, ≤ 640 px de alto) en ART.portraits[id]. Quién lleva cada retrato: src/data/characters.js
const CHAR_DIR = path.join(root, 'img/characters');
const PORTRAIT_OUT = 'img/portraits';
const PORTRAIT_MAX_H = 640;
if (fs.existsSync(CHAR_DIR)) {
    art.portraits = art.portraits || {};
    fs.mkdirSync(path.join(root, PORTRAIT_OUT), { recursive: true });
    for (const file of fs.readdirSync(CHAR_DIR).filter(f => /-profile\.png$/i.test(f)).sort()) {
        const id = file.replace(/-profile\.png$/i, '').toLowerCase();
        const outRel = `${PORTRAIT_OUT}/${id}.webp`;
        const trimmed = await sharp(path.join(CHAR_DIR, file)).trim({ threshold: 1 }).toBuffer();
        const info = await sharp(trimmed).resize({ height: PORTRAIT_MAX_H, withoutEnlargement: true })
            .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(root, outRel));
        art.portraits[id] = { src: outRel, w: info.width, h: info.height };
        done.push(`img/characters/${file} → ${outRel} (${info.width}×${info.height})`);
    }
}
fs.writeFileSync(manifestFile, manifestText(art), 'utf8');
console.log(done.join('\n'));
console.log(`\n🧪 ${done.length} icono(s) listos y registrados en src/data/art.js (ART.icons)`);
