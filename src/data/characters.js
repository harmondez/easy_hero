// =============================================
// 🎭 Retratos de los diálogos (solo datos): quién habla → su retrato en ART.portraits (img/portraits/<id>.webp, de
// img/characters/<id>-profile.png con `npm run icons`).
// La clave es el `who` de la línea de diálogo, tal cual («{heroe}» es tu héroe). Quien no está aquí habla sin retrato
// (las líneas de narración, firmadas con el lugar, tampoco lo llevan).
// El héroe sale a la derecha, mirando hacia dentro; los demás, a la izquierda.
// =============================================
export const HERO_WHO = '{heroe}';

export const PORTRAITS = {
    '{heroe}': 'hero',
    'Bram, el herrero': 'tabernero'
};
