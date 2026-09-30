// =============================================
// 🌬️ Telegrafiado sin números: frases que avisan de un golpe fuerte sin decir cuánto hará.
// Estilo DragonFable: el enemigo no anuncia su intención, pero un golpe brutal se ve venir.
// {name} se sustituye por el nombre del enemigo. Se elige por la ronda, no al azar (no gasta el rng).
// =============================================
export const HEAVY_TELLS = [
    '{name} respira hondo y alza el arma por encima de la cabeza…',
    '{name} tensa todo el cuerpo. Algo gordo se avecina.',
    'Los ojos de {name} se clavan en ti. No parpadea.',
    '{name} planta los pies en el suelo y aprieta los dientes…',
    'El aire alrededor de {name} se vuelve pesado.'
];

// A partir de este multiplicador, un ataque cuenta como «golpe fuerte» y se telegrafía
export const HEAVY_TELL_MIN = 1.8;
