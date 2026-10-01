// =============================================
// 🖼️ Qué imagen propia tiene cada criatura (puro, sin DOM)
// El manifiesto (src/data/art.js) lo escribe `npm run sprites`. Aquí solo se consulta.
// =============================================

/** «Rata Gigante» → «rata-gigante»: el mismo id que lleva el archivo enemigo_rata-gigante.png. */
export function artSlug(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** La imagen del monstruo por su nombre base («Goblin» → enemigo_goblin), o null si aún no tiene. */
export function monsterArt(art, baseName) {
    const slug = artSlug(baseName);
    return (slug && art && art.sprites && art.sprites[`enemigo_${slug}`]) || null;
}

/** La imagen del héroe: la primera heroe_* por orden alfabético, o null si no hay ninguna. */
export function heroArt(art) {
    const key = Object.keys((art && art.sprites) || {}).filter(k => k.startsWith('heroe_')).sort()[0];
    return key ? art.sprites[key] : null;
}
