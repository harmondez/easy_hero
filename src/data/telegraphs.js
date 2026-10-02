// =============================================
// 🌬️ Telegrafiado sin números: frases que avisan de un golpe fuerte sin decir cuánto hará.
// Estilo DragonFable: el enemigo no anuncia su intención, pero un golpe brutal se ve venir.
// {name} se sustituye por el nombre del enemigo. Se elige por la ronda, no al azar (no gasta el rng).
// =============================================
export const HEAVY_TELLS = [
    '{name} echa el peso atrás y alza el arma por encima de la cabeza…',
    '{name} tensa cada músculo. Lo que viene va a doler.',
    'Los ojos de {name} se clavan en los tuyos. Ha dejado de parpadear.',
    '{name} planta los pies y aprieta los dientes hasta hacerlos crujir…',
    'Un silencio extraño cae sobre el claro. {name} se prepara.',
    '{name} se agacha, gruñendo por lo bajo, como un resorte a punto de saltar.'
];

// A partir de este multiplicador, un ataque cuenta como «golpe fuerte» y se telegrafía
export const HEAVY_TELL_MIN = 1.8;
