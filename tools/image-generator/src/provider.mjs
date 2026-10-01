// =============================================
// 🔌 ImageProvider de Gemini (SDK oficial @google/genai, API «interactions»).
// Reintentos con espera exponencial para errores pasajeros (429/5xx/red); los errores de petición (400/401/403/404)
// fallan a la primera con un mensaje claro. La clave sale SOLO de la variable de entorno; nunca se escribe en logs.
// =============================================
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';

sharp.cache(false);   // en Windows la caché de sharp deja archivos bloqueados

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function statusOf(err) {
    return err?.status ?? err?.code ?? err?.response?.status ?? (/\b(4\d\d|5\d\d)\b/.exec(String(err?.message))?.[1] | 0) ?? 0;
}

export class GeminiImageProvider {
    constructor({ model, apiKeyEnv = 'GOOGLE_API_KEY', timeoutMs = 120000, retries = {}, outputMime = 'image/jpeg', log = console }) {
        const apiKey = process.env[apiKeyEnv];
        if (!apiKey) throw new Error(`Falta la variable de entorno ${apiKeyEnv} (ponla en .env; mira .env.example).`);
        this.model = model;
        this.outputMime = outputMime;
        this.timeoutMs = timeoutMs;
        this.retries = { max_attempts: 4, base_delay_ms: 2000, max_delay_ms: 30000, ...retries };
        this.log = log;
        this.ai = new GoogleGenAI({ apiKey });
    }

    /** Prepara las imágenes de referencia: PNG, como mucho 1024 px de lado (menos tokens de entrada). */
    static async referenceParts(paths) {
        const parts = [];
        for (const p of paths) {
            const data = await sharp(fs.readFileSync(p)).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
            parts.push({ type: 'image', mime_type: 'image/png', data: data.toString('base64'), _path: p });
        }
        return parts;
    }

    /**
     * Genera UNA imagen. Devuelve { buffer, mimeType, attempts, ms }.
     * references: rutas de imágenes de referencia de estilo/escala (opcional).
     */
    async generate({ prompt, references = [], aspectRatio, imageSize }) {
        const refParts = await GeminiImageProvider.referenceParts(references);
        const input = refParts.length
            ? [{ type: 'text', text: prompt }, ...refParts.map(({ _path, ...p }) => p)]
            : prompt;
        const response_format = { type: 'image', mime_type: this.outputMime };
        if (aspectRatio) response_format.aspect_ratio = aspectRatio;
        if (imageSize) response_format.image_size = imageSize;

        const { max_attempts, base_delay_ms, max_delay_ms } = this.retries;
        let lastErr;
        for (let attempt = 1; attempt <= max_attempts; attempt++) {
            const t0 = Date.now();
            try {
                const call = this.ai.interactions.create({ model: this.model, input, response_format });
                const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`Tiempo agotado (${this.timeoutMs} ms)`), { status: 408 })), this.timeoutMs));
                const interaction = await Promise.race([call, timeout]);
                const img = interaction?.output_image;
                if (!img?.data) throw Object.assign(new Error('La respuesta no trae imagen (¿la ha bloqueado el filtro de seguridad o el prompt pide algo no admitido?).'), { status: 422 });
                // Se entrega siempre en PNG (sin pérdida a partir de aquí), venga en el formato que venga
                const png = await sharp(Buffer.from(img.data, 'base64')).png().toBuffer();
                return { buffer: png, sourceMime: img.mime_type || this.outputMime, attempts: attempt, ms: Date.now() - t0 };
            } catch (err) {
                lastErr = err;
                const status = Number(statusOf(err)) || 0;
                const retryable = RETRYABLE.has(status) || /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|socket/i.test(String(err?.message));
                this.log.warn(`⚠️ Intento ${attempt}/${max_attempts} fallido (${status || 'red'}): ${String(err?.message).split('\n')[0]}`);
                if (!retryable || attempt === max_attempts) break;
                const delay = Math.min(max_delay_ms, base_delay_ms * 2 ** (attempt - 1)) * (0.75 + Math.random() * 0.5);
                this.log.info(`⏳ Reintento en ${Math.round(delay / 100) / 10} s…`);
                await sleep(delay);
            }
        }
        const status = Number(statusOf(lastErr)) || 0;
        const hint = { 400: 'petición no válida (modelo, tamaño o formato)', 401: 'clave no válida', 403: 'la clave no tiene permiso o la API no está activada', 404: 'el modelo no existe o está retirado', 429: 'cuota o límite de velocidad agotado' }[status];
        throw new Error(`No se pudo generar la imagen${hint ? ` — ${hint}` : ''}: ${String(lastErr?.message).split('\n')[0]}`);
    }
}

/** Carga .env de la raíz del proyecto si existe (Node ≥ 20.12), sin pisar variables ya definidas. */
export function loadDotEnv(root) {
    const f = path.join(root, '.env');
    if (fs.existsSync(f) && typeof process.loadEnvFile === 'function') process.loadEnvFile(f);
}
