// =============================================
// 🎲 Aleatoriedad con semilla (pura, sin DOM)
// Una partida entera sale de UNA semilla: con las mismas decisiones se repite igual.
// El estado del generador se puede leer y restaurar (`rng.state`), que es lo que permite guardar y retomar.
// =============================================

/** mulberry32: rápido, pequeño y con estado de 32 bits. */
export function createRng(seed) {
    let s = (seed | 0) || 1;
    const rng = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    Object.defineProperty(rng, 'state', { get: () => s, set: v => { s = v | 0; } });
    return rng;
}

/** Semilla nueva de 32 bits (sin signo). */
export function newSeed(random = Math.random) {
    return Math.floor(random() * 4294967296) >>> 0;
}

/** Código corto y legible de una semilla: `K3F9-2QA`. */
export function seedToCode(seed) {
    const s = (seed >>> 0).toString(36).toUpperCase().padStart(7, '0');
    return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/**
 * Convierte lo que escribe el jugador en una semilla. Acepta un código como `K3F9-2QA`
 * y cualquier otro texto (se convierte en un número de forma estable).
 */
export function codeToSeed(text) {
    const raw = String(text == null ? '' : text).trim().toUpperCase();
    if (!raw) return null;
    const compact = raw.replace(/[\s-]/g, '');
    if (/^[0-9A-Z]{1,7}$/.test(compact)) {
        const n = parseInt(compact, 36);
        if (n <= 0xFFFFFFFF) return n >>> 0;
    }
    // Cualquier otro texto: se ignoran espacios y guiones para que «mi ruta» y «MI-RUTA» sean la misma semilla
    if (!compact) return null;
    let h = 2166136261; // FNV-1a
    for (let i = 0; i < compact.length; i++) { h ^= compact.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
