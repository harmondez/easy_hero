// =============================================
// 🏷️ Sistema de versiones — `npm run release`
//
//   npm run release                       muestra la versión y comprueba que todo está sincronizado
//   npm run release -- patch              1.0.1 → 1.0.2   (ajustes, correcciones, equilibrio)
//   npm run release -- minor              1.0.1 → 1.1.0   (una entrega o contenido nuevo)
//   npm run release -- major              1.0.1 → 2.0.0   (un cambio de fondo del juego)
//   npm run release -- 1.4.2              una versión concreta
//   npm run release -- minor --dry-run    enseña qué cambiaría, sin escribir nada
//
// Una subida de versión actualiza, a la vez: package.json, src/version.js, el código de caché `?v=` de
// index.html y de todos los módulos, la etiqueta de la cabecera, la insignia del README y el CHANGELOG.
// NO hace commit ni etiqueta: te dice los comandos para que revises antes.
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEMVER = /^\d+\.\d+\.\d+$/;
const CACHE_TOKEN = /\?v=[0-9A-Za-z.\-]+/g;

const abs = f => path.join(root, f);
function read(f) {
    const raw = fs.readFileSync(abs(f), 'utf8');
    return { text: raw.replace(/\r\n/g, '\n'), crlf: raw.includes('\r\n') };
}
function write(f, text, crlf) { fs.writeFileSync(abs(f), crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8'); }

/** Archivos con código de caché `?v=`: la página y todos los módulos del juego. */
export function cacheBustedFiles() {
    const out = ['index.html'];
    const walk = dir => {
        for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
            const rel = `${dir}/${e.name}`;
            if (e.isDirectory()) walk(rel);
            else if (e.name.endsWith('.js')) out.push(rel);
        }
    };
    walk('src');
    return out;
}

export function currentVersion() { return JSON.parse(read('package.json').text).version; }

/** Calcula la versión siguiente: 'patch' | 'minor' | 'major' | '1.2.3'. */
export function bumpVersion(current, kind) {
    if (!SEMVER.test(current)) throw new Error(`La versión actual no es válida: ${current}`);
    const [ma, mi, pa] = current.split('.').map(Number);
    if (kind === 'patch') return `${ma}.${mi}.${pa + 1}`;
    if (kind === 'minor') return `${ma}.${mi + 1}.0`;
    if (kind === 'major') return `${ma + 1}.0.0`;
    if (SEMVER.test(kind)) return kind;
    throw new Error(`Indica patch, minor, major o una versión como 1.2.3 (recibido: ${kind})`);
}

const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

/** Comprueba que TODOS los sitios donde aparece la versión coinciden. Devuelve { version, problems }. */
export function checkVersion() {
    const problems = [];
    const version = currentVersion();
    if (!SEMVER.test(version)) problems.push(`package.json: «${version}» no es una versión válida (usa 1.2.3)`);

    const vjs = read('src/version.js').text;
    const gv = (vjs.match(/GAME_VERSION = '([^']+)'/) || [])[1];
    const rd = (vjs.match(/RELEASE_DATE = '([^']+)'/) || [])[1];
    if (gv !== version) problems.push(`src/version.js: GAME_VERSION es ${gv} y package.json dice ${version}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rd || '')) problems.push(`src/version.js: RELEASE_DATE «${rd}» no tiene el formato AAAA-MM-DD`);

    for (const f of cacheBustedFiles()) {
        for (const m of read(f).text.match(CACHE_TOKEN) || []) {
            if (m !== `?v=${version}`) problems.push(`${f}: el código de caché es ${m} y debería ser ?v=${version}`);
        }
    }
    const label = (read('index.html').text.match(/<span class="game-version">v([0-9.]+)/) || [])[1];
    if (label !== version) problems.push(`index.html: la etiqueta de la cabecera dice v${label} y la versión es ${version}`);
    if (!new RegExp(`versi%C3%B3n-${version.replace(/\./g, '\\.')}-`).test(read('README.md').text)) problems.push('README.md: la insignia de versión no coincide');

    const log = read('CHANGELOG.md').text;
    const heads = [...log.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/gm)].map(m => m[1]);
    if (!heads.includes(version)) problems.push(`CHANGELOG.md: no hay una sección «## [${version}] - AAAA-MM-DD»`);
    else if (heads[0] !== version) problems.push(`CHANGELOG.md: la versión más reciente del registro es ${heads[0]} y no ${version}`);
    for (let i = 1; i < heads.length; i++) if (cmp(heads[i - 1], heads[i]) <= 0) problems.push(`CHANGELOG.md: ${heads[i - 1]} y ${heads[i]} no van de más nueva a más antigua`);
    if (new Set(heads).size !== heads.length) problems.push('CHANGELOG.md: hay versiones repetidas');
    if (!/^## \[Sin publicar\]$/m.test(log)) problems.push('CHANGELOG.md: falta la sección «## [Sin publicar]»');
    return { version, problems };
}

/** Prepara la subida de versión: devuelve los archivos con su contenido antes y después (sin escribir). */
export function planRelease(next, date) {
    const current = currentVersion();
    if (!SEMVER.test(next)) throw new Error(`Versión no válida: ${next}`);
    if (cmp(next, current) <= 0) throw new Error(`La versión nueva (${next}) tiene que ser mayor que la actual (${current})`);
    const changes = [];
    const buf = new Map(); // un archivo puede recibir varias `edit()`: se encadenan sobre el mismo texto en memoria
    const edit = (f, fn) => {
        let entry = buf.get(f);
        if (!entry) {
            const { text, crlf } = read(f);
            entry = { file: f, crlf, before: text, after: text };
            buf.set(f, entry);
            changes.push(entry);
        }
        entry.after = fn(entry.after);
    };
    edit('package.json', t => t.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`));
    edit('src/version.js', t => t.replace(/(GAME_VERSION = ')[^']+(')/, `$1${next}$2`).replace(/(RELEASE_DATE = ')[^']+(')/, `$1${date}$2`));
    for (const f of cacheBustedFiles()) edit(f, t => t.replace(CACHE_TOKEN, `?v=${next}`));
    edit('index.html', t => t.replace(/(<span class="game-version">v)[0-9.]+/, `$1${next}`));
    edit('README.md', t => t.replace(/(versi%C3%B3n-)[0-9.]+(-)/, `$1${next}$2`));
    edit('CHANGELOG.md', t => {
        const m = t.match(/(## \[Sin publicar\]\n)([\s\S]*?)(?=\n## \[)/);
        if (!m) throw new Error('CHANGELOG.md: falta la sección «## [Sin publicar]»');
        const pending = m[2].trim() || '_(sin notas: rellena qué ha cambiado en esta versión)_';
        return t.replace(m[0], `## [Sin publicar]\n\n## [${next}] - ${date}\n\n${pending}\n`);
    });
    return { current, next, changes: changes.filter(c => c.after !== c.before) };
}

export function applyPlan(plan) { for (const c of plan.changes) write(c.file, c.after, c.crlf); }

// --------- Línea de comandos ---------
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    const args = process.argv.slice(2);
    const dry = args.includes('--dry-run');
    const kind = args.find(a => !a.startsWith('--'));
    try {
        if (!kind) {
            const { version, problems } = checkVersion();
            console.log(`\n🏷️  Versión del juego: ${version}`);
            if (problems.length) { console.log('\n❌ Hay cosas desincronizadas:'); problems.forEach(p => console.log('   · ' + p)); process.exit(1); }
            console.log('✅ Todo está sincronizado (package.json, src/version.js, código de caché, cabecera, README y CHANGELOG).\n');
        } else {
            const next = bumpVersion(currentVersion(), kind);
            const date = new Date().toISOString().slice(0, 10);
            const plan = planRelease(next, date);
            console.log(`\n🏷️  ${plan.current} → ${plan.next}  (${date})${dry ? '   [simulacro: no se escribe nada]' : ''}\n`);
            plan.changes.forEach(c => console.log(`   ${dry ? '·' : '✏️'} ${c.file}`));
            if (!dry) {
                applyPlan(plan);
                const { problems } = checkVersion();
                if (problems.length) { console.log('\n⚠️ Revisa:'); problems.forEach(p => console.log('   · ' + p)); }
                console.log(`\nSiguiente:
   1. Rellena las notas de la versión en CHANGELOG.md (sección [${plan.next}]) y en el README (\"Novedades\").
   2. npm test
   3. git add -A && git commit -m "Versión ${plan.next}"
   4. git tag -a v${plan.next} -m "Versión ${plan.next}"
   5. git push --follow-tags\n`);
            }
        }
    } catch (e) { console.error('❌ ' + e.message); process.exit(1); }
}
