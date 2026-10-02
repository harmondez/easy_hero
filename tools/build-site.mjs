// =============================================
// 🏗️ Monta la web publicable en _site/: solo lo que el juego necesita (página, estilo, código e imágenes).
// Lo usan GitHub Actions (publicación en Pages) y Cloudflare (vistas previas de cada PR), para que las dos webs
// sean idénticas. Uso: npm run build:site
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_site');
const PARTS = ['index.html', 'style.css', 'src', 'img'];
// Los originales del director (PNG grandes en img/ y la carpeta de entrada) no se publican
// Material de trabajo que no se sube (ver .gitignore): piezas del mapa y originales de las armas
const SKIP = new Set(['entrantes', 'map-divided', 'map-divided-upscaled', 'weapons'].map(d => path.join(root, 'img', d)));
const isRootOriginal = p => path.dirname(p) === path.join(root, 'img') && p.toLowerCase().endsWith('.png');

fs.rmSync(out, { recursive: true, force: true });
let files = 0;
function copy(src, dst) {
    if (SKIP.has(src) || isRootOriginal(src)) return;
    const st = fs.statSync(src);
    if (st.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        for (const name of fs.readdirSync(src)) copy(path.join(src, name), path.join(dst, name));
    } else {
        fs.copyFileSync(src, dst);
        files++;
    }
}
fs.mkdirSync(out, { recursive: true });
for (const part of PARTS) copy(path.join(root, part), path.join(out, part));
console.log(`✅ _site/ lista: ${files} archivos`);
