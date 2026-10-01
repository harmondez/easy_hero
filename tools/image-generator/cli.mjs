#!/usr/bin/env node
// =============================================
// 🏭 Asset Factory de Easy Hero — línea de comandos
//
//   npm run generate -- <tipo> <nombre> [opciones]
//
//   Tipos: character · enemy · npc · boss · prop · obstacle · structure · ambient · terrain · background · map
//   Ejemplos:
//     npm run generate -- enemy orc
//     npm run generate -- enemy goblin --variant plague --details "green toxic boils"
//     npm run generate -- background volcanic_temple
//     npm run generate -- map volcanic_world
//     npm run generate -- map my_island --regions "beach:S:sandy beach,peak:N:snowy peak"
//
//   Opciones:
//     --dry-run         enseña el prompt, las referencias, las rutas y el coste estimado; NO llama a la API
//     --force           rehace un asset que ya existe (lo anterior se aparta con fecha, no se borra)
//     --variant <v>     otra versión del mismo asset (nombre distinto, no sobrescribe)
//     --details <txt>   matices para el prompt
//     --regions <lista> (mapas) zonas «id:CASILLA:descripción» con CASILLA en NW N NE W C E SW S SE
//     --model <id>      usa otro modelo solo esta vez (por defecto, el de config/factory.json)
//     --no-game         no lo entrega al juego (se queda en taller/)
//     fix <tipo> <nombre> [--flip] [--game-id id]   arregla uno ya generado sin pagar: voltearlo y/o reentregarlo con otro id
//     list              lista lo que ya ha generado la fábrica
// =============================================
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDotEnv } from './src/provider.mjs';
import { createLogger } from './src/logger.mjs';
import { AssetFactory } from './src/factory.mjs';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolDir, '..', '..');

function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) { out._.push(a); continue; }
        const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const next = argv[i + 1];
        if (['dryRun', 'force', 'noGame', 'help', 'flip'].includes(key)) out[key] = true;
        else { out[key] = next; i++; }
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));
if (args._[0] === 'generate') args._.shift();   // admite «generate enemy orc» y «enemy orc»
const [type, ...nameParts] = args._;
const name = nameParts.join(' ');

loadDotEnv(root);
const factory = new AssetFactory({ root, toolDir, log: createLogger(path.join(root, 'taller')), model: args.model });
const log = factory.log;

if (!type || args.help) {
    console.log('Uso: npm run generate -- <tipo> <nombre> [--dry-run] [--force] [--variant v] [--details "…"] [--regions "…"] [--model id] [--no-game]');
    console.log('Tipos:', Object.keys(factory.config.types).filter(k => !k.startsWith('_')).join(', '), '· list');
    process.exit(type ? 0 : 1);
}

try {
    if (type === 'list') {
        const assets = factory.manifest.data.assets;
        for (const [k, a] of Object.entries(assets)) console.log(`${a.valid === false ? '❌' : '✅'} ${k} → ${a.file}${a.game ? ` · juego: ${a.game}` : ''}`);
        if (!Object.keys(assets).length) console.log('📭 La fábrica aún no ha generado nada.');
        process.exit(0);
    }
    if (type === 'fix') {
        // npm run generate -- fix <tipo> <nombre> [--flip] [--game-id <id>]   (no llama a la API)
        const [fixType, ...rest] = nameParts;
        const r = await factory.fixAsset(fixType, rest.join(' '), { flip: !!args.flip, gameId: args.gameId || '' });
        log.info(`🛠️ Arreglado · juego: ${r.meta.game ? r.meta.game.result.join(', ') : '(no entra al juego)'}`);
        process.exit(0);
    }
    if (!name) throw new Error('Falta el nombre: p. ej. «npm run generate -- enemy orc».');
    const opts = { dryRun: !!args.dryRun, force: !!args.force, variant: args.variant || '', details: args.details || '', regions: args.regions, noGame: !!args.noGame };
    const result = type === 'map' ? await factory.generateMap(name, opts)
        : type === 'background' ? await factory.generateBackground(name, opts)
        : await factory.generateAsset(type, name, opts);

    if (result.dryRun) {
        const p = result.plan;
        console.log(`\n🧪 DRY-RUN · ${p.key} (no se llama a la API ni se escribe nada)`);
        console.log(`Modelo: ${p.settings.model} · ${p.settings.aspect_ratio} · ${p.settings.image_size} · coste estimado: ${p.estimatedUsd ?? '?'} $`);
        console.log(`Huella: ${p.fingerprint}`);
        console.log(`Referencias: ${p.references.map(r => path.relative(root, r)).join(', ') || 'ninguna'}`);
        console.log('Archivos:', Object.fromEntries(Object.entries(p.files).map(([k, f]) => [k, path.relative(root, f)])));
        if (result.layout) console.log('Regiones:', result.layout.map(r => `${r.id}@${r.cell}`).join(', '));
        console.log(`\n--- PROMPT ---\n${p.prompt}\n`);
    } else {
        const m = result.meta;
        log.info(`\n🏁 ${m.key} listo · validación: ${m.validation.ok ? 'OK' : 'CON ERRORES'}`);
        log.info(`   Taller: ${m.files ? m.files.final : result.plan.files.final}`);
        if (result.manifest) log.info(`   Regiones: ${result.manifest.regions.map(r => r.id).join(', ')}`);
        if (m.game) log.info(`   Juego: ${m.game.result.join(', ') || '(sin cambios)'}`);
        process.exitCode = m.validation.ok ? 0 : 2;
    }
} catch (e) {
    log.error(`❌ ${e.message}`);
    process.exitCode = 1;
}
