// 🎭 Novela visual rápida: la revisión de diálogos y retratos (tools/vn.mjs) y el retrato de la fábrica de arte
import path from 'path';
import { fileURLToPath } from 'url';
import { checkVN } from '../tools/vn.mjs';
import { PromptBuilder } from '../tools/image-generator/src/prompt-builder.mjs';
import { portraitIdOf } from '../tools/portraits.mjs';

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n🎭 npm run vn -- revisar');
const { errors, warnings, speakers } = await checkVN();
if (errors.length) console.log(errors);
assert('Diálogos y retratos sin errores (paradas, marcadores, retratos que existen)', errors.length === 0);
assert('Ningún diálogo queda con texto de plantilla', !warnings.some(w => /plantilla/.test(w)));
assert('Ningún retrato está sin dueño ni nadie con retrato se queda callado', !warnings.some(w => /no lo lleva nadie|no habla en ningún/.test(w)));
assert('Maela, Bram, Grask y tu héroe hablan (y se cuentan sus líneas)', ['Maela, la posadera', 'Bram, el herrero', 'Grask, jefe goblin', '{heroe}'].every(w => speakers[w] && speakers[w].lines > 0));

console.log('\n🏭 Retratos en la fábrica de arte');
const pb = new PromptBuilder(path.join(root, 'tools/image-generator'));
const { text } = pb.build('portrait', { name: 'old village woman', details: 'wool shawl', hasReferences: true });
assert('El tipo «portrait» pide medio cuerpo, de frente y sobre blanco', /mid-thigh/.test(text) && /facing the viewer/.test(text) && /#FFFFFF/.test(text));
assert('…con el estilo de pixel art de los retratos y sin bocadillos', /visual novel/.test(text) && /no speech bubbles/i.test(text));
assert('…sin las reglas de «cuerpo entero» de los sprites', !/Full body/.test(text));
assert('El id del retrato sale del nombre del archivo', portraitIdOf('tabernera-Maela-profile.png') === 'tabernera-maela');

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);
