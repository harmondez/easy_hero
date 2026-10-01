// =============================================
// 📝 PromptBuilder: plantilla del tipo + STYLE_BIBLE + reglas obligatorias. Cada prompt reutiliza las mismas reglas,
// así que la coherencia no depende de acordarse de escribirlas cada vez.
// =============================================
import fs from 'fs';
import path from 'path';

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

export class PromptBuilder {
    constructor(dir) {
        this.dir = dir;   // tools/image-generator
        this.style = readJson(path.join(dir, 'config', 'style-bible.json'));
        this.spriteRules = readJson(path.join(dir, 'prompts', 'sprite-rules.json')).isolated_subject;
        const objects = readJson(path.join(dir, 'prompts', 'objects.json'));
        const scenario = readJson(path.join(dir, 'prompts', 'scenario.json'));
        this.templates = {
            enemy: readJson(path.join(dir, 'prompts', 'enemy.json')),
            character: readJson(path.join(dir, 'prompts', 'character.json')),
            boss: readJson(path.join(dir, 'prompts', 'boss.json')),
            npc: readJson(path.join(dir, 'prompts', 'npc.json')),
            prop: objects.prop, obstacle: objects.obstacle, structure: objects.structure,
            ambient: objects.ambient, terrain: objects.terrain,
            background: scenario.background, map: scenario.map
        };
    }

    template(name) {
        const t = this.templates[name];
        if (!t) throw new Error(`No hay plantilla de prompt para «${name}».`);
        return t;
    }

    /** Rutas (existentes) de las imágenes de referencia de estilo para esta plantilla. */
    references(tpl, root, max) {
        const list = (this.style.references && this.style.references[tpl.references]) || [];
        return list.map(p => path.join(root, p)).filter(p => fs.existsSync(p)).slice(0, max);
    }

    /**
     * Construye el prompt. name: lo que se genera («orc», «volcanic temple»…); details: matices opcionales;
     * layout (solo mapas): [{ id, label, cell }] con cell en NW, N, NE, W, C, E, SW, S, SE.
     */
    build(templateName, { name, details = '', layout = null, hasReferences = false }) {
        const tpl = this.template(templateName);
        const s = this.style;
        const human = String(name).replace(/[_-]+/g, ' ').trim();
        const subject = tpl.subject.replace('{name}', human).replace('{details}', details ? `, ${details}` : '');
        // Familia de estilo: sprites (personajes y objetos sueltos), fondos de combate o mapas
        const isCreature = ['character', 'enemy', 'boss', 'npc'].includes(tpl.kind);
        const family = tpl.kind === 'background' ? 'background' : (tpl.kind === 'map' || tpl.kind === 'terrain') ? 'map' : 'sprite';
        const st = s.styles[family];
        const perspective = s.perspective[family === 'sprite' && !isCreature ? 'object' : family];
        const mandatory = [...(tpl.uses_sprite_rules ? this.spriteRules : []), ...(tpl.mandatory || []), ...s.common.rules];

        const lines = [
            `Create ${subject}.`,
            `Pose / composition: ${tpl.pose}.`,
            '',
            `ART STYLE: ${st.art_style}`,
            `PALETTE: ${st.palette}`,
            `LIGHTING: ${s.common.lighting}${st.lighting_extra ? ` ${st.lighting_extra}` : ''}`,
            `PERSPECTIVE: ${perspective}`
        ];
        if (isCreature && st.proportions) lines.push(`PROPORTIONS: ${st.proportions}`);
        lines.push(`DETAIL: ${s.detail_level}`);
        if (st.avoid) lines.push(`AVOID: ${st.avoid}`);
        if (layout && layout.length) {
            const CELL = { NW: 'top-left', N: 'top-centre', NE: 'top-right', W: 'middle-left', C: 'centre', E: 'middle-right', SW: 'bottom-left', S: 'bottom-centre', SE: 'bottom-right' };
            lines.push('', 'LAYOUT (the image is divided into a 3×3 grid; put each point of interest in its area, all connected by roads/terrain):');
            for (const r of layout) lines.push(`- ${CELL[r.cell] || r.cell}: ${r.label}`);
        }
        lines.push('', 'MANDATORY RULES:', ...mandatory.map(r => `- ${r}`));
        if (hasReferences) lines.push('', 'The attached reference image(s) are ONLY a guide for art style, outline weight, palette, lighting and scale. Do not copy their subject, pose or content.');
        // «a orc» → «an orc»
        const text = lines.join('\n').replace(/\b([Aa]) ([aeiouAEIOU])/g, '$1n $2');
        return { template: tpl, text };
    }
}
