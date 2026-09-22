# 📨 Solicitudes de Itemizer al PM

Documento de trabajo. **Itemizer escribe aquí las peticiones de cambios que deben hacerse FUERA de `item-world`**
(motor, UI, guardado, tests, docs del juego). Todo lo demás se produce dentro del taller.

**Estado por solicitud:** 🟡 pendiente · ✅ aprobada/hecha · ❌ rechazada · 🔁 en revisión.

---

## Solicitud 1 · Aprobar el contrato de ganchos del motor ✅ hecho (con cambios, ver respuesta)

**Qué.** Bloquear la lista de **ganchos** que consumirán los afijos y rasgos del sistema de items. Es la interfaz entre mi
contenido y el motor; si cambian los nombres, el contenido cambia también.

**Ganchos (v1):** `onCombatStart` · `onAttack` · `onDefend` · `onDamaged` · `onVictory` · `onSkill` · `global`.
Están documentados en [docs/diseno.md](docs/diseno.md) y ya los usan 12 reglas + 6 únicos + 9 rasgos de base.

**Qué os pido.**
- Confirmar (o proponer cambios) a la lista de ganchos.
- Confirmar la **escala de reglas**: el valor `v` de las reglas también escala con `(1 + 0,08 × piso) × rareza` (mi
  decisión, coherente con el plan).
- Confirmar que los **decimales** de la fabricación los redondea el motor al usarlos (la fabricación guarda el valor
  matemático).

**Para cuándo.** Antes de abrir la Entrega B1.

> **Respuesta del PM (1.0.2).** Ganchos confirmados, con un matiz: **`onSkill` no existe como gancho aparte** en el motor.
> Se resolvió de otra forma: `skill_dmg`/`skill_cd` suman directamente a `skillMods.fire_strike` (números, no reglas), y
> `skill_burn`/`pyre`/`first_turn_focus` se leen en `rpgSkillInfo`/`rpgCombatAction` cuando se usa la habilidad. El efecto es
> el mismo que pedías, solo que sin un hook literal `onSkill` en `rules`. El resto de ganchos (`onCombatStart`, `onAttack`,
> `onDefend`, `onDamaged`, `onVictory`, `global`) se implementaron tal cual. **Escala confirmada**, con una excepción: los
> multiplicadores, interruptores y duraciones (golpe furtivo, gracia, frenesí, golpe extra, huir sin daño, Lector, robavida,
> última defensa, Pira, veneno, enfriamientos, guardia) **no escalan con el piso** — solo los números que suman HP/ATK/daño.
> Se decidió al ver que un ×2 o un «3 rondas» ya son fuertes en el piso 1 y absurdos en el 15. Los decimales se redondean
> a enteros en `src/items.js` al fabricar el objeto (no al leerlo), para que lo que se guarda ya sea el número final.

---

## Solicitud 2 · Abrir la Entrega B1 y mover mi contenido al juego ✅ hecho (1.0.2)

**Qué.** El taller ya tiene el catálogo completo del sistema de items (P5) validado:

- `item-world/src/rarities.js` → la tabla única de rarezas (⚪🟢🔵🟣🟠).
- `item-world/src/items.js` → 4 ranuras, 6 tipos de daño y **122 bases** (24 armas, 30 secundarias, 34 armaduras, 34 accesorios).
- `item-world/src/affixes.js` → **24 afijos** (6 números, 12 reglas, 6 únicos).
- `item-world/src/fabrication.js` → fabricar objetos: rareza + afijos + escalado por piso, con invariantes.

**Qué os pido cuando se abra B1.**
1. Copiar los ficheros de `item-world/src/` a `src/data/` (con un `?v=` de caché como los demás).
2. Implementar en `src/engine.js` los **ganchos** de la Solicitud 1 y que `rpgCombatAction`/`createRpgHero` los consuman.
3. **Reemplazar el botín provisional**: cofre (`+1 ATK`/`+5 HP`), victorias (`+1 ATK`/`+4 HP`) y hoguera (`Afilar +1 ATK`)
   por las 3 fuentes cerradas (cofre 1 de 3 · hoguera 1 de 3 mín. 🟢 · sub-jefe 1 de 3 mín. 🔵) + regla de descartar (cura 3 HP).
4. Avisadme si la integración cambiará los números del motor para que ajuste el contenido y el banco de equilibrio.

**Para cuándo.** No urgente desde el taller: mi contenido ya no depende de más código. La fecha la fija el PM.

> **Respuesta del PM (1.0.2).** Los 4 puntos, hechos:
> 1. Copiado a `src/data/rarities.js`, `items.js`, `affixes.js` (con `?v=1.0.2`). La lógica de fabricar/equipar/descartar/botín
>    vive en un archivo nuevo, `src/items.js` (fuera de `src/data/`, porque no es solo datos: fabrica, aplica y resume).
> 2. Ganchos implementados en `src/engine.js` (ver respuesta a la Solicitud 1 para el matiz de `onSkill`).
> 3. Botín provisional reemplazado del todo: cofre y hoguera «1 de 3», sub-jefe deja botín ≥ 🔵, descartar cura (3 + 1 por
>    escalón de rareza, algo más generoso que el «cura 3» fijo que proponías, para que descartar un épico no se sienta igual
>    que descartar un común).
> 4. **Sí cambió el equilibrio, bastante:** al quitar el crecimiento automático por victoria (ver más abajo) y subir el ATK/HP
>    de los monstruos (`atkPerFloor` 0,28→0,4, `hpPerFloor` 3→3,6) para que el equipo se note. Con 1000 partidas/bot: sensato
>    22,3 %, experto 37,8 %, torpe 0,7 %. Detalle en [docs/equilibrio.md](../docs/equilibrio.md).
>
> **Dos decisiones que no estaban en tu petición, tomadas al implementar:**
> - **Se quitó el crecimiento automático por victoria** (antes daba +1 ATK/+4 HP por combate). El plan decía que se mantendría
>   «hasta la entrega B», pero con equipo Y crecimiento a la vez el sensato ganaba el 85 %: demasiado. Ahora toda la fuerza
>   viene del equipo, como en Slay the Spire.
> - **El piso 1 es siempre un cofre** (antes era un monstruo). Sin un primer objeto, muchas partidas morían en el piso 5
>   antes de encontrar nada que equipar.

---

## Solicitud 3 · Preservar invariantes mientras dure el trabajo 🟡

**Qué.** Pedir al equipo que **no borre ni renombre** campos de mi contenido por su cuenta (por ejemplo `atq` no `atk`,
`damaged`, `trait.k`, `affixes[].hook`). Si hace falta un cambio, llegará por esta vía y lo propago yo en `item-world`.

**Por qué.** El contenido se consume por contrato (ver `docs/diseno.md`); un cambio silencioso romperá la integración.

---

*Última actualización: fabricación validada (6000 objetos · distribución 50/28/14/6/2 · escalado monótono · sin afijos
repetidos · único solo en legendarias).*