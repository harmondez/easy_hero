// =============================================
// 🌬️ Telegrafiado sin números: frases que avisan de un golpe fuerte sin decir cuánto hará.
// Estilo DragonFable: el enemigo no anuncia su intención, pero un golpe brutal se ve venir.
// {name} se sustituye por el nombre del enemigo. Se elige por la ronda, no al azar (no gasta el rng).
// =============================================
export const HEAVY_TELLS = [
    '{name} echa el peso atrás y levanta el arma por encima de la cabeza…',
    '{name} se prepara para un golpe fuerte.',
    '{name} te mira fijo y no parpadea.',
    '{name} planta los pies y aprieta los dientes…',
    '{name} se agacha y gruñe, listo para saltar.'
];

// A partir de este multiplicador, un ataque cuenta como «golpe fuerte» y se telegrafía
export const HEAVY_TELL_MIN = 1.8;
