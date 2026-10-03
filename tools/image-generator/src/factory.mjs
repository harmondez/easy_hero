// =============================================
// 🏭 ASSET FACTORY: Concept → Generation → Validation → Post-processing → Game-ready asset → Manifest
//
//   AssetGenerator      personajes, enemigos, NPC, jefes, props, obstáculos, estructuras, ambiente, terreno
//   ScenarioGenerator
//   ├── BackgroundGenerator   fondo de combate de lado
//   └── MapGenerator          mapa maestro → regiones literales (MAP CUTTER) → manifiesto
//
// Todo lo intermedio (crudos, metadatos, mapas maestros) va a taller/ (no se sube). Lo que entra al juego pasa por
// el taller de sprites del proyecto (tools/sprites.mjs): WebP en img/sprites|bg|zones y registro en src/data/art.js.
// =============================================
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GeminiImageProvider } from './provider.mjs';
import { PromptBuilder } from './prompt-builder.mjs';
import { removeWhiteBackground } from './remove-bg.mjs';
import { validateImage, validateSprite } from './validate.mjs';
import { cutMap, verifyCuts } from './map-cutter.mjs';
import { FactoryManifest, writeMeta, slug, fingerprint } from './manifest.mjs';
import { processSprites, readManifest, manifestText } from '../../sprites.mjs';
import { processPortrait, PORTRAIT_SRC } from '../../portraits.mjs';

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export class AssetFactory {
    constructor({ root, toolDir, log, model = null }) {
        this.root = root;
        this.toolDir = toolDir;
        this.log = log;
        this.config = readJson(path.join(toolDir, 'config', 'factory.json'));
        if (model) this.config.provider.model = model;
        this.prompts = new PromptBuilder(toolDir);
        this.mapThemes = readJson(path.join(toolDir, 'prompts', 'map-themes.json'));
        this.workshop = path.join(root, this.config.paths.workshop);
        this.manifest = new FactoryManifest(path.join(this.workshop, 'manifest.json'));
        this._provider = null;
    }

    get provider() {
        // Se crea al primer uso real: un --dry-run no necesita clave
        if (!this._provider) {
            const p = this.config.provider;
            this._provider = new GeminiImageProvider({ model: p.model, apiKeyEnv: p.api_key_env, timeoutMs: p.timeout_ms, retries: p.retries, outputMime: p.output_mime, log: this.log });
        }
        return this._provider;
    }

    typeConfig(type) {
        const t = this.config.types[type];
        if (!t || type.startsWith('_')) throw new Error(`Tipo desconocido «${type}». Tipos: ${Object.keys(this.config.types).filter(k => !k.startsWith('_')).join(', ')}`);
        return t;
    }

    costOf(n = 1) {
        const per = this.config.budget.usd_per_image[this.config.provider.model];
        return per == null ? null : +(per * n).toFixed(4);
    }

    /** Plan de una generación (lo que haría), sin llamar a la API. */
    plan(type, name, { details = '', variant = '', layout = null } = {}) {
        const tc = this.typeConfig(type);
        const id = slug(variant ? `${name}-${variant}` : name);
        if (!id) throw new Error('Falta el nombre del asset (p. ej. «orc»).');
        const refsMax = this.config.provider.max_reference_images;
        const tplName = tc.prompt;
        const references = this.prompts.references(this.prompts.template(tplName), this.root, refsMax);
        const fullDetails = [details, variant && `variant: ${variant.replace(/[_-]+/g, ' ')}`].filter(Boolean).join(', ');
        const { text } = this.prompts.build(tplName, { name, details: fullDetails, layout, hasReferences: references.length > 0 });
        const dir = path.join(this.workshop, tc.category, id);
        const settings = { model: this.config.provider.model, aspect_ratio: tc.aspect_ratio, image_size: tc.image_size };
        const fp = fingerprint({ prompt: text, references: references.map(r => path.relative(this.root, r)), ...settings });
        return {
            type, id, key: `${type}:${id}`, typeConfig: tc, prompt: text, references, settings, fingerprint: fp, dir,
            files: {
                raw: path.join(dir, `${id}_raw.png`),
                final: path.join(dir, `${id}.png`),
                meta: path.join(dir, `${id}.meta.json`)
            },
            estimatedUsd: this.costOf(1)
        };
    }

    /** Evita sobrescribir: si ya existe el asset final, solo se rehace con --force. */
    guardOverwrite(plan, force) {
        const exists = fs.existsSync(plan.files.final) || fs.existsSync(plan.files.raw);
        if (exists && !force) throw new Error(`Ya existe «${plan.key}» en ${path.relative(this.root, plan.dir)}. Usa --force para rehacerlo o --variant para otra versión.`);
        if (exists && force) {
            // No se pierde lo anterior: se aparta con fecha
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            for (const f of Object.values(plan.files)) if (fs.existsSync(f)) fs.renameSync(f, f.replace(/(\.[a-z.]+)$/i, `.${stamp}$1`));
            this.log.info(`📦 Versión anterior apartada con fecha ${stamp}`);
        }
    }

    async _generate(plan) {
        const { aspect_ratio, image_size } = plan.settings;
        this.log.info(`🎨 Generando ${plan.key} con ${plan.settings.model} (${aspect_ratio}, ${image_size}) · ~${plan.estimatedUsd ?? '?'} $ · ${plan.references.length} referencia(s)`);
        const res = await this.provider.generate({ prompt: plan.prompt, references: plan.references, aspectRatio: aspect_ratio, imageSize: image_size });
        this.log.info(`✅ Imagen recibida en ${(res.ms / 1000).toFixed(1)} s (intento ${res.attempts})`);
        return res;
    }

    /** Entrega un PNG final al juego por el taller de sprites (WebP + registro en src/data/art.js). */
    async _toGame(plan, pngFile) {
        // Retrato de novela visual: a img/characters/<id>-profile.png (el original) y a img/portraits/<id>.webp
        if (plan.typeConfig.deliver === 'portrait') return this._toPortrait(plan, pngFile);
        // Pieza de equipo: el original a img/weapons (lo recoge `npm run icons` → img/ui/objeto-<id>.webp)
        if (plan.typeConfig.deliver === 'gear') {
            const rel = `img/weapons/weapon_sword-${slug(plan.gameId || plan.id).replace(/-/g, '_')}.png`;
            fs.mkdirSync(path.join(this.root, 'img/weapons'), { recursive: true });
            fs.copyFileSync(pngFile, path.join(this.root, rel));
            this.log.info(`🗡️ Pieza lista: ${rel}. Pásala al juego con: npm run icons`);
            return { intake: rel, result: [rel] };
        }
        const prefix = plan.typeConfig.game_prefix;
        if (!prefix) return null;
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrica-'));
        // El id con el que lo busca el juego (p. ej. el nombre base del monstruo en español); por defecto, el del asset
        const intakeName = `${prefix}_${slug(plan.gameId || plan.id)}.png`;
        fs.copyFileSync(pngFile, path.join(tmp, intakeName));
        try {
            const res = await processSprites({ root: this.root, inDir: tmp });
            for (const sk of (res && res.skipped) || []) this.log.warn(`⚠️ El taller de sprites no lo aceptó: ${sk.file}: ${sk.why}`);
            return { intake: intakeName, result: (res && res.done) || [] };
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }

    /** Retrato de novela visual: copia el PNG a img/characters y lo convierte en retrato del juego (ART.portraits). */
    async _toPortrait(plan, pngFile) {
        const id = slug(plan.gameId || plan.id);
        const srcRel = `${PORTRAIT_SRC}/${id}-profile.png`;
        fs.mkdirSync(path.join(this.root, PORTRAIT_SRC), { recursive: true });
        fs.copyFileSync(pngFile, path.join(this.root, srcRel));
        const manifestFile = path.join(this.root, 'src', 'data', 'art.js');
        const art = await readManifest(manifestFile);
        const p = await processPortrait(this.root, path.join(this.root, srcRel), id, art);
        fs.writeFileSync(manifestFile, manifestText(art), 'utf8');
        this.log.info(`🎭 Retrato listo: ${p.src} (${p.w}×${p.h}). Asígnalo a quien hable: npm run vn -- nuevo …`);
        return { intake: srcRel, result: [p.src] };
    }

    // ---------- AssetGenerator: personajes, enemigos, NPC, jefes, props… ----------
    async generateAsset(type, name, opts = {}) {
        // Las escenas (aldeas, caseríos) admiten --regions como los mapas: dónde va cada edificio
        const layout = type === 'scene' && opts.regions ? this.mapLayout(name, opts.regions) : null;
        const plan = this.plan(type, name, { ...opts, layout });
        plan.gameId = opts.gameId || '';
        if (opts.dryRun) return { dryRun: true, plan };
        this.guardOverwrite(plan, opts.force);
        fs.mkdirSync(plan.dir, { recursive: true });

        const res = await this._generate(plan);
        const rawCheck = await validateImage(res.buffer);
        if (!rawCheck.ok) throw new Error(`La imagen generada no es válida: ${rawCheck.errors.join('; ')}`);
        fs.writeFileSync(plan.files.raw, res.buffer);

        let finalFile = plan.files.raw, check = rawCheck, removed = null;
        if (plan.typeConfig.remove_background) {
            const rb = await removeWhiteBackground(res.buffer, this.config.background_removal);
            fs.writeFileSync(plan.files.final, rb.png);
            removed = +rb.removedRatio.toFixed(4);
            check = await validateSprite(rb.png, this.config.background_removal);
            finalFile = plan.files.final;
        } else {
            fs.copyFileSync(plan.files.raw, plan.files.final);
            finalFile = plan.files.final;
        }
        for (const w of check.warnings) this.log.warn(`⚠️ ${w}`);
        if (!check.ok) this.log.error(`❌ Validación: ${check.errors.join('; ')}`);

        const game = check.ok && !opts.noGame ? await this._toGame(plan, finalFile) : null;
        const meta = {
            key: plan.key, type, name, id: plan.id, createdAt: new Date().toISOString(),
            provider: 'gemini', ...plan.settings, fingerprint: plan.fingerprint,
            prompt: plan.prompt, references: plan.references.map(r => path.relative(this.root, r).replace(/\\/g, '/')),
            seed: null, _seed_doc: 'La API de imagen de Gemini no admite semilla: la reproducibilidad se basa en guardar prompt, modelo y configuración (fingerprint).',
            pipeline: plan.typeConfig.remove_background ? ['generate', 'white-background', 'remove-background', 'transparent-png', 'validate', 'game'] : ['generate', 'validate', 'game'],
            files: Object.fromEntries(Object.entries(plan.files).map(([k, f]) => [k, path.relative(this.root, f).replace(/\\/g, '/')])),
            backgroundRemovedRatio: removed, validation: check, game, estimatedUsd: plan.estimatedUsd
        };
        writeMeta(plan.files.meta, meta);
        this.manifest.set(plan.key, { type, id: plan.id, file: meta.files.final, raw: meta.files.raw, meta: meta.files.meta, valid: check.ok, game: game && game.intake, createdAt: meta.createdAt, model: plan.settings.model });
        return { plan, meta };
    }

    /**
     * Arreglar un asset ya generado SIN volver a llamar a la API: voltearlo (--flip) si salió mirando al lado
     * contrario, y/o volver a entregarlo al juego con otro id (--game-id, p. ej. el nombre en español del monstruo).
     */
    async fixAsset(type, name, { flip = false, gameId = '' } = {}) {
        const tc = this.typeConfig(type);
        const id = slug(name);
        const dir = path.join(this.workshop, tc.category, id);
        const final = path.join(dir, `${id}.png`), metaFile = path.join(dir, `${id}.meta.json`);
        if (!fs.existsSync(final)) throw new Error(`No existe ${path.relative(this.root, final)}: genera antes el asset.`);
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
        const sharp = (await import('sharp')).default;
        sharp.cache(false);
        if (flip) {
            const flipped = await sharp(final).flop().png().toBuffer();
            fs.writeFileSync(final, flipped);
            meta.flipped = !meta.flipped;
            this.log.info(`↔️ Volteado: ${path.relative(this.root, final)}`);
        }
        const check = tc.remove_background ? await validateSprite(fs.readFileSync(final), this.config.background_removal) : await validateImage(fs.readFileSync(final));
        if (!check.ok) throw new Error(`Tras el arreglo no pasa la validación: ${check.errors.join('; ')}`);
        const plan = { id, gameId, typeConfig: tc };
        const game = await this._toGame(plan, final);
        Object.assign(meta, { validation: check, game, fixedAt: new Date().toISOString() });
        writeMeta(metaFile, meta);
        const key = `${type}:${id}`;
        this.manifest.set(key, { ...(this.manifest.get(key) || {}), valid: check.ok, game: game && game.intake, flipped: !!meta.flipped });
        return { meta };
    }

    // ---------- ScenarioGenerator → BackgroundGenerator ----------
    async generateBackground(name, opts = {}) {
        return this.generateAsset('background', name, opts);
    }

    // ---------- ScenarioGenerator → MapGenerator: maestro → regiones → manifiesto ----------
    mapLayout(name, regionsArg) {
        if (regionsArg) {
            return regionsArg.split(',').map(s => s.trim()).filter(Boolean).map(s => {
                const [id, cell, ...label] = s.split(':');
                return { id: slug(id).replace(/-/g, '_'), cell: (cell || 'C').toUpperCase(), label: label.join(':') || id.replace(/[_-]+/g, ' ') };
            });
        }
        const theme = this.mapThemes[name];
        if (!theme) throw new Error(`No hay layout para el mapa «${name}». Añádelo a prompts/map-themes.json o pásalo con --regions "id:CASILLA:descripción,…".`);
        return theme.layout;
    }

    async generateMap(name, opts = {}) {
        const theme = this.mapThemes[name] || {};
        const layout = this.mapLayout(name, opts.regions);
        const plan = this.plan('map', name, { ...opts, details: opts.details || theme.details || '', layout });
        plan.gameId = opts.gameId || '';
        // Archivos con los nombres del contrato del MAP: <map>_full.png, regions/, manifest.json
        plan.files = { raw: path.join(plan.dir, `${plan.id.replace(/-/g, '_')}_full.png`), final: path.join(plan.dir, `${plan.id.replace(/-/g, '_')}_full.png`), meta: path.join(plan.dir, `${plan.id}.meta.json`) };
        if (opts.dryRun) return { dryRun: true, plan, layout };
        this.guardOverwrite(plan, opts.force);
        fs.mkdirSync(plan.dir, { recursive: true });

        const res = await this._generate(plan);
        const check = await validateImage(res.buffer, { minSide: 512 });
        if (!check.ok) throw new Error(`El mapa generado no es válido: ${check.errors.join('; ')}`);
        fs.writeFileSync(plan.files.final, res.buffer);   // el maestro NUNCA se borra

        const mapId = plan.id.replace(/-/g, '_');
        const manifest = await cutMap({ mapId, masterFile: plan.files.final, dir: plan.dir, layout });
        const verified = await verifyCuts(plan.dir, manifest);
        if (!verified.ok) throw new Error(`Los recortes no coinciden con el mapa maestro: ${verified.problems.join(', ')}`);
        this.log.info(`✂️ ${manifest.regions.length} regiones recortadas y verificadas píxel a píxel`);

        const game = !opts.noGame ? await this._toGame(plan, plan.files.final) : null;
        const meta = {
            key: plan.key, type: 'map', name, id: mapId, createdAt: new Date().toISOString(), provider: 'gemini', ...plan.settings,
            fingerprint: plan.fingerprint, prompt: plan.prompt, references: plan.references.map(r => path.relative(this.root, r).replace(/\\/g, '/')),
            seed: null, layout, validation: check, cutsVerified: verified.ok, regions: manifest.regions.length, game, estimatedUsd: plan.estimatedUsd
        };
        writeMeta(plan.files.meta, meta);
        this.manifest.set(plan.key, { type: 'map', id: mapId, file: path.relative(this.root, plan.files.final).replace(/\\/g, '/'), manifest: path.relative(this.root, path.join(plan.dir, 'manifest.json')).replace(/\\/g, '/'), regions: manifest.regions.map(r => r.id), game: game && game.intake, createdAt: meta.createdAt, model: plan.settings.model });
        return { plan, meta, manifest };
    }
}
