// =============================================
// 🏷️ RPG-pack — sistema de versiones (tools/version.mjs + src/version.js)
// Comprueba que la versión está sincronizada en todos los sitios y que el script de publicación funciona,
// sin escribir nada en el proyecto.
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkVersion, bumpVersion, planRelease, currentVersion, cacheBustedFiles, SEMVER } from '../tools/version.mjs';
import { GAME_VERSION, RELEASE_DATE } from '../src/version.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const throws = fn => { try { fn(); return false; } catch { return true; } };
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');

console.log('\n🏷️ La versión está sincronizada en todos los sitios');
{
    const { version, problems } = checkVersion();
    if (problems.length) problems.forEach(p => console.log('     ·', p));
    assert('package.json, src/version.js, caché, cabecera, README y CHANGELOG dicen lo mismo', problems.length === 0);
    assert('la versión tiene el formato MAJOR.MINOR.PATCH', SEMVER.test(version));
    assert('el juego lee la misma versión que package.json', GAME_VERSION === version && currentVersion() === version);
    assert('la fecha de publicación tiene el formato AAAA-MM-DD y no es del futuro',
        /^\d{4}-\d{2}-\d{2}$/.test(RELEASE_DATE) && new Date(RELEASE_DATE) <= new Date(Date.now() + 86400000));
    assert('la versión no es una prueba: es al menos la 1.0.1', version.split('.').map(Number).reduce((a, n, i) => a + n * [1e6, 1e3, 1][i], 0) >= 1000001);
}

console.log('\n🧊 Código de caché: ningún módulo se queda sin él');
{
    const files = cacheBustedFiles();
    assert('se revisan la página y todos los módulos (más de 10 archivos)', files.includes('index.html') && files.includes('src/main.js') && files.length > 10);
    // Un import relativo sin `?v=` haría que el navegador siguiera usando la copia antigua tras publicar
    const missing = [];
    for (const f of files.filter(x => x.endsWith('.js'))) {
        for (const m of read(f).matchAll(/from\s+'(\.\/[^']+\.js)(\?v=[^']*)?'/g)) if (!m[2]) missing.push(`${f} → ${m[1]}`);
    }
    if (missing.length) missing.forEach(m => console.log('     ·', m));
    assert('todos los `import` relativos de src/ llevan `?v=`', missing.length === 0);
    assert('index.html carga la hoja de estilos y el juego con el código de caché',
        new RegExp(`style\\.css\\?v=${GAME_VERSION.replace(/\./g, '\\.')}`).test(read('index.html'))
        && new RegExp(`src/main\\.js\\?v=${GAME_VERSION.replace(/\./g, '\\.')}`).test(read('index.html')));
}

console.log('\n➕ Cómo se calcula la versión siguiente');
{
    assert('patch: 1.0.1 → 1.0.2', bumpVersion('1.0.1', 'patch') === '1.0.2');
    assert('minor: 1.0.1 → 1.1.0 (los PATCH se reinician)', bumpVersion('1.0.1', 'minor') === '1.1.0');
    assert('major: 1.4.7 → 2.0.0 (MINOR y PATCH se reinician)', bumpVersion('1.4.7', 'major') === '2.0.0');
    assert('una versión concreta se respeta', bumpVersion('1.0.1', '1.4.2') === '1.4.2');
    assert('las cifras de dos dígitos funcionan (1.9.9 → 1.9.10)', bumpVersion('1.9.9', 'patch') === '1.9.10');
    assert('una orden desconocida se rechaza', throws(() => bumpVersion('1.0.1', 'gigante')) && throws(() => bumpVersion('1.0.1', '1.2')));
    assert('una versión actual inválida se rechaza', throws(() => bumpVersion('uno.dos', 'patch')));
}

console.log('\n📦 Preparar una publicación (simulacro: no se escribe nada)');
{
    const before = { pkg: read('package.json'), log: read('CHANGELOG.md'), vjs: read('src/version.js') };
    const plan = planRelease('9.9.9', '2030-01-02');
    const files = plan.changes.map(c => c.file);
    assert('cambia package.json, la versión, la cabecera, el README y el CHANGELOG',
        ['package.json', 'src/version.js', 'index.html', 'README.md', 'CHANGELOG.md'].every(f => files.includes(f)));
    assert('actualiza el código de caché de TODOS los módulos que lo llevan',
        cacheBustedFiles().filter(f => /\?v=[0-9]/.test(read(f))).every(f => files.includes(f)));
    assert('el código de caché nuevo es el de la versión', plan.changes.filter(c => c.file.startsWith('src/') && c.file !== 'src/version.js').every(c => !/\?v=(?!9\.9\.9)/.test(c.after)));
    const log = plan.changes.find(c => c.file === 'CHANGELOG.md').after;
    const heads = [...log.matchAll(/^## \[([^\]]+)\]/gm)].map(m => m[1]);
    assert('el CHANGELOG conserva «Sin publicar» arriba y añade la versión nueva justo debajo', heads[0] === 'Sin publicar' && heads[1] === '9.9.9' && heads[2] === GAME_VERSION);
    assert('la versión nueva lleva la fecha dada', /## \[9\.9\.9\] - 2030-01-02/.test(log));
    assert('lo que había en «Sin publicar» pasa a la versión nueva (no se pierde ninguna nota)', (() => {
        const old = before.log.match(/## \[Sin publicar\]\n([\s\S]*?)(?=\n## \[)/)[1].trim();
        return old === '' || log.includes(old);
    })());
    assert('el simulacro no ha tocado nada: package.json, CHANGELOG y version.js siguen igual',
        read('package.json') === before.pkg && read('CHANGELOG.md') === before.log && read('src/version.js') === before.vjs);
    assert('no se puede «publicar» la misma versión ni una anterior', throws(() => planRelease(GAME_VERSION, '2030-01-01')) && throws(() => planRelease('0.9.0', '2030-01-01')));
    assert('una versión mal escrita se rechaza', throws(() => planRelease('1.2', '2030-01-01')));
}

console.log('\n📜 El registro de cambios');
{
    const log = read('CHANGELOG.md');
    assert('cuenta la 1.0.0 y la 1.0.1', /## \[1\.0\.0\] - \d{4}-\d{2}-\d{2}/.test(log) && /## \[1\.0\.1\] - \d{4}-\d{2}-\d{2}/.test(log));
    assert('la versión actual tiene notas (Novedades)', (() => { const sec = log.match(new RegExp(`## \\[${GAME_VERSION.replace(/\./g, '\\.')}\\][\\s\\S]*?(?=\\n## \\[|$)`)); return !!sec && /### ✨ Novedades/.test(sec[0]) && sec[0].length > 400; })());
    assert('enlaza a la explicación del sistema de versiones', log.includes('docs/versiones.md') && fs.existsSync(path.join(root, 'docs/versiones.md')));
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);
