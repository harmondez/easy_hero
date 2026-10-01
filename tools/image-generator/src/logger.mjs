// =============================================
// 🪵 Registro de la fábrica: por pantalla y en taller/logs/factory.log (con fecha y hora).
// =============================================
import fs from 'fs';
import path from 'path';

export function createLogger(workshopDir) {
    const file = path.join(workshopDir, 'logs', 'factory.log');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const write = (level, msg) => {
        fs.appendFileSync(file, `${new Date().toISOString()} [${level}] ${msg}\n`);
        (level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log)(msg);
    };
    return {
        file,
        info: m => write('INFO', m),
        warn: m => write('WARN', m),
        error: m => write('ERROR', m)
    };
}
