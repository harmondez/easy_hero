// =============================================
// 🧪 Harness — corre las 6 fases en escalera (la más barata primero) y para en la
// primera que falle, para no gastar tiempo en fases caras si algo básico ya está roto.
//
//   node tools/harness/run-all.mjs
//
// Cada fase es un script independiente en tools/harness/0N-*.mjs; el detalle de cada
// hallazgo (con su fecha) vive en docs/harness-hallazgos.md.
// =============================================
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const phases = readdirSync(dir).filter(f => /^0\d-.*\.mjs$/.test(f)).sort();

let totalChecks = 0, totalBugs = 0;
for (const file of phases) {
    console.log(`\n▶ ${file}`);
    const r = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
    process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    const m = r.stdout.match(/SUMMARY \S+: (\d+) comprobaciones, (\d+) bugs/);
    if (m) { totalChecks += Number(m[1]); totalBugs += Number(m[2]); }
    if (r.status !== 0) {
        console.log(`\n⛔ ${file} falló (código ${r.status}). Se para la escalera aquí — arregla esto antes de seguir.`);
        process.exit(1);
    }
}
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🧪 HARNESS: ${totalChecks} comprobaciones en total, ${totalBugs} bugs\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
