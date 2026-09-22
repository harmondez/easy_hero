// =============================================
// ⚔️ Bases de objeto — el catálogo hecho a mano (122)
//
// Un objeto empieza en una base. La base define SU ranura, su estadística principal y, en armaduras,
// accesorios y secundarias, un rasgo fijo. Las armas primarias definen además el TIPO DE DAÑO del ataque.
//
//   { id, name, icon, slot, damaged?, main, trait?, desc, fam? }
//
//     slot     → weapon | secondary | armor | accessory          (persistir, ver ITEM_SLOTS)
//     damaged  → SOLO armas: uno de los 6 DAMAGE_TYPES
//     main     → estadística principal en el PISO 0: { atq } | { hp } | { guard }
//     trait    → rasgo fijo { k, v, ... }; si no lo lleva, la base es solo números
//     fam      → hacia qué familia empuja la afinidad (B2): guerrero | picaro | elementalista | neutra
//
// Los números de aquí son valores de PISO 0: escalan con valor = base × (1 + 0,08 × piso) × rareza.power.
// El nivel de rareza ⚪ Común (0 afijos) deja ver la base tal cual: por eso todas son jugables "standard".
// =============================================

export const ITEM_SLOTS = {
    weapon:    { id: 'weapon',    name: 'Arma principal', icon: '⚔️', desc: 'Tu fuerza y el tipo de daño de tus golpes.' },
    secondary: { id: 'secondary', name: 'Secundaria',     icon: '🛡️', desc: 'Escudo, daga o foco: cambiar cómo juegas.' },
    armor:     { id: 'armor',     name: 'Armadura',       icon: '🧥', desc: 'Más vida y un efecto especial.' },
    accessory: { id: 'accessory', name: 'Accesorio',      icon: '💍', desc: 'Un rasgo pasivo, casi sin números.' }
};

export const DAMAGE_TYPES = {
    filo:        { id: 'filo',        icon: '🗡️', name: 'Filo' },
    contundente: { id: 'contundente', icon: '🔨', name: 'Contundente' },
    perforante:  { id: 'perforante',  icon: '🏹', name: 'Perforante' },
    veneno:      { id: 'veneno',      icon: '☠️', name: 'Veneno' },
    fuego:       { id: 'fuego',       icon: '🔥', name: 'Fuego' },
    rayo:        { id: 'rayo',        icon: '⚡', name: 'Rayo' }
};

export const ITEM_BASES = [

    // ════════════════════════════ ⚔️ ARMAS PRIMARIAS (24) — 4 por tipo de daño ════════════════════════════
    // ---- Filo (4) ----
    { id: 'espada_sendero', name: 'Espada del sendero', icon: '🗡️', slot: 'weapon', damaged: 'filo', main: { atq: 1 },
      desc: 'La hoja con la que empieza toda ruta. Confiable y sin pretensiones.', fam: 'guerrero' },
    { id: 'gladio_corto', name: 'Gladio corto', icon: '🗡️', slot: 'weapon', damaged: 'filo', main: { atq: 2 },
      desc: 'Un filo recto, equilibrado y sin secretos.', fam: 'guerrero' },
    { id: 'mandoble_lobo', name: 'Mandoble del lobo', icon: '⚔️', slot: 'weapon', damaged: 'filo', main: { atq: 3 },
      desc: 'Pesa, pero cuando cae, lo decide todo.', fam: 'guerrero' },
    { id: 'sable_luna', name: 'Sable de luna', icon: '🗡️', slot: 'weapon', damaged: 'filo', main: { atq: 2 },
      trait: { k: 'first_attack_double', v: 2 }, desc: 'Desenfundar ya es la mitad del combate.', fam: 'picaro' },

    // ---- Contundente (4) ----
    { id: 'maza_coloso', name: 'Maza del coloso', icon: '🔨', slot: 'weapon', damaged: 'contundente', main: { atq: 2 },
      desc: 'Su peso rompe lo que el filo no muerde. Lenta, pero decisiva.', fam: 'guerrero' },
    { id: 'martillo_piquero', name: 'Martillo piquero', icon: '🔨', slot: 'weapon', damaged: 'contundente', main: { atq: 3 },
      desc: 'El martillo que despierta a las montañas.', fam: 'guerrero' },
    { id: 'vara_hierro', name: 'Vara de hierro', icon: '🏏', slot: 'weapon', damaged: 'contundente', main: { atq: 2 },
      desc: 'Una barra de hierro sin adornos que dice lo que piensa.', fam: 'guerrero' },
    { id: 'hacha_verdugo', name: 'Hacha del verdugo', icon: '🪓', slot: 'weapon', damaged: 'contundente', main: { atq: 3 },
      desc: 'Solo necesita una oportunidad.', fam: 'guerrero' },

    // ---- Perforante (4) ----
    { id: 'arco_cazador', name: 'Arco de cazador', icon: '🏹', slot: 'weapon', damaged: 'perforante', main: { atq: 2 },
      desc: 'Alcanza donde las espadas no llegan. Discreto y mortal.', fam: 'picaro' },
    { id: 'lanza_larga', name: 'Lanza larga', icon: '🔱', slot: 'weapon', damaged: 'perforante', main: { atq: 3 },
      desc: 'Aguanta la línea más lejos de lo que crees.', fam: 'picaro' },
    { id: 'ballesta_pesada', name: 'Ballesta pesada', icon: '🏹', slot: 'weapon', damaged: 'perforante', main: { atq: 3 },
      trait: { k: 'first_attack_double', v: 2 }, desc: 'Lenta de cargar, decisiva al disparar.', fam: 'picaro' },
    { id: 'jabalina_cazadora', name: 'Jabalina de caza', icon: '🎯', slot: 'weapon', damaged: 'perforante', main: { atq: 2 },
      desc: 'Silba al separarse de la mano y no pregunta adónde va.', fam: 'picaro' },

    // ---- Veneno (4) ----
    { id: 'daga_envenenada', name: 'Daga envenenada', icon: '☠️', slot: 'weapon', damaged: 'veneno', main: { atq: 1 },
      desc: 'Un rasguño basta cuando el veneno hace el resto.', fam: 'picaro' },
    { id: 'colmillo_serpiente', name: 'Colmillo de serpiente', icon: '🐍', slot: 'weapon', damaged: 'veneno', main: { atq: 2 },
      trait: { k: 'poison_on_hit', v: 1 }, desc: 'El veneno del colmillo nunca se sacia.', fam: 'picaro' },
    { id: 'hoja_escorpion', name: 'Hoja de escorpión', icon: '🦂', slot: 'weapon', damaged: 'veneno', main: { atq: 2 },
      trait: { k: 'poison_on_hit', v: 1 }, desc: 'Un escozor… y después, el olvido.', fam: 'picaro' },
    { id: 'cimitarra_verde', name: 'Cimitarra verde', icon: '⚔️', slot: 'weapon', damaged: 'veneno', main: { atq: 3 },
      desc: 'Curva, afilada y sumergida en veneno seco.', fam: 'picaro' },

    // ---- Fuego (4) ----
    { id: 'baston_brasas', name: 'Bastón de brasas', icon: '🔥', slot: 'weapon', damaged: 'fuego', main: { atq: 2 },
      desc: 'Arde con tu furia y responde a tu voluntad.', fam: 'elementalista' },
    { id: 'baston_llamas', name: 'Bastón de llamas', icon: '🔥', slot: 'weapon', damaged: 'fuego', main: { atq: 2 },
      trait: { k: 'skill_dmg', v: 2 }, desc: 'El fuego aprende a obedecer.', fam: 'elementalista' },
    { id: 'maza_incandescente', name: 'Maza incandescente', icon: '🔨', slot: 'weapon', damaged: 'fuego', main: { atq: 3 },
      trait: { k: 'burn_on_hit', v: 1 }, desc: 'Rojas de tanto arder.', fam: 'elementalista' },
    { id: 'varita_ceniza', name: 'Varita de ceniza', icon: '🪄', slot: 'weapon', damaged: 'fuego', main: { atq: 1 },
      trait: { k: 'skill_cd', v: -1 }, desc: 'Ligera como la ceniza, rápida como el olvido.', fam: 'elementalista' },

    // ---- Rayo (4) ----
    { id: 'vara_tormenta', name: 'Vara de la tormenta', icon: '⚡', slot: 'weapon', damaged: 'rayo', main: { atq: 2 },
      desc: 'La electricidad no avisa. Solo cae.', fam: 'elementalista' },
    { id: 'cetro_fulgor', name: 'Cetro de fulgor', icon: '⚡', slot: 'weapon', damaged: 'rayo', main: { atq: 3 },
      desc: 'Un rayo que se quedó a vivir.', fam: 'elementalista' },
    { id: 'baston_chispa', name: 'Bastón de chispa', icon: '✨', slot: 'weapon', damaged: 'rayo', main: { atq: 2 },
      trait: { k: 'skill_dmg', v: 2 }, desc: 'Crepita entre tus dedos antes de cada golpe.', fam: 'elementalista' },
    { id: 'tridente_tormenta', name: 'Tridente de tormenta', icon: '🔱', slot: 'weapon', damaged: 'rayo', main: { atq: 3 },
      desc: 'Huele a ozono cuando se acerca.', fam: 'elementalista' },

    // ════════════════════════════ 🛡️ SECUNDARIA (30) — 10 escudos, 10 dagas, 10 focos ════════════════════════════
    // ---- Escudos (10): mejoran Defender ----
    { id: 'escudo_avellano', name: 'Escudo de avellano', icon: '🛡️', slot: 'secondary', main: { guard: 1 },
      desc: 'Un escudo ligero que perdona los fallos del defensor.', fam: 'guerrero' },
    { id: 'escudo_torre', name: 'Escudo de torre', icon: '🛡️', slot: 'secondary', main: { guard: 2 },
      desc: 'Pesado y sólido. Cuando te cubre, no falla.', fam: 'guerrero' },
    { id: 'rodela_liviana', name: 'Rodela liviana', icon: '🛡️', slot: 'secondary', main: { guard: 1 },
      trait: { k: 'flee_safe', v: 1 }, desc: 'Tan ligera que ni al huir te estorba.', fam: 'picaro' },
    { id: 'broquel_campeon', name: 'Broquel de campeón', icon: '🛡️', slot: 'secondary', main: { guard: 2 },
      trait: { k: 'defend_heal', v: 1 }, desc: 'Los aplausos se recuerdan mejor con salud.', fam: 'guerrero' },
    { id: 'paves_recio', name: 'Pavés recio', icon: '🛡️', slot: 'secondary', main: { guard: 2 },
      desc: 'Un muro portátil con mejores modales.', fam: 'guerrero' },
    { id: 'escudo_escarabajo', name: 'Escudo escarabajo', icon: '🛡️', slot: 'secondary', main: { guard: 2 },
      trait: { k: 'thorns', v: 1 }, desc: 'Su caparazón también sabe defenderse.', fam: 'guerrero' },
    { id: 'escudo_dragon', name: 'Escudo de dragón', icon: '🛡️', slot: 'secondary', main: { guard: 3 },
      trait: { k: 'defend_heal', v: 1 }, desc: 'Piel de dragón, orgullo de quien lo empuña.', fam: 'guerrero' },
    { id: 'escudo_ancla', name: 'Escudo de ancla', icon: '⚓', slot: 'secondary', main: { guard: 3 },
      trait: { k: 'victory_heal', v: 2 }, desc: 'Nada lo mueve hasta que la batalla acaba.', fam: 'guerrero' },
    { id: 'escudo_estela', name: 'Escudo de estela', icon: '🛡️', slot: 'secondary', main: { guard: 1 },
      trait: { k: 'combat_start_heal', v: 1 }, desc: 'Brilla un instante al empezar cada pelea.', fam: 'guerrero' },
    { id: 'escudo_espejo', name: 'Escudo espejo', icon: '🪞', slot: 'secondary', main: { guard: 2 },
      trait: { k: 'thorns', v: 2 }, desc: 'Devuelve parte de lo que le lanzan.', fam: 'guerrero' },

    // ---- Dagas y cuchillos (10): golpe extra, veneno, sorpresa ----
    { id: 'daga_errante', name: 'Daga errante', icon: '🗡️', slot: 'secondary', trait: { k: 'extra_strike', v: 1 },
      desc: 'Golpeas una vez más en tu primer turno de cada combate.', fam: 'picaro' },
    { id: 'daga_cortavenas', name: 'Daga cortavenas', icon: '🔪', slot: 'secondary', trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Envenenas al golpear (1 por ronda, se acumula).', fam: 'picaro' },
    { id: 'daga_retirada', name: 'Daga de retirada', icon: '🗡️', slot: 'secondary', trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir, cubre tu espalda y no pagas peaje.', fam: 'picaro' },
    { id: 'cuchillo_ritual', name: 'Cuchillo ritual', icon: '🔪', slot: 'secondary', trait: { k: 'first_attack_double', v: 2 },
      desc: 'El primer corte de la ceremonia decide el resto.', fam: 'picaro' },
    { id: 'espada_corta', name: 'Espada corta', icon: '🗡️', slot: 'secondary', trait: { k: 'extra_strike', v: 1 },
      desc: 'Pequeña, rápida y siempre en movimiento.', fam: 'picaro' },
    { id: 'cuchilla_eco', name: 'Cuchilla del eco', icon: '🔪', slot: 'secondary', trait: { k: 'extra_strike', v: 1 },
      desc: 'Cada corte recuerda al anterior.', fam: 'picaro' },
    { id: 'bisturi_cirujano', name: 'Bisturí del cirujano', icon: '🔪', slot: 'secondary', trait: { k: 'extra_strike', v: 1 },
      desc: 'Preciso hasta la crueldad.', fam: 'picaro' },
    { id: 'navaja_caminante', name: 'Navaja del caminante', icon: '🔪', slot: 'secondary', trait: { k: 'flee_safe', v: 1 },
      desc: 'Compañera de rutas que nunca se queda atrás.', fam: 'picaro' },
    { id: 'daga_sangre_dulce', name: 'Daga de sangre dulce', icon: '🗡️', slot: 'secondary', trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Su veneno baja por el filo como el rocío.', fam: 'picaro' },
    { id: 'daga_duelo', name: 'Daga de duelo', icon: '🔪', slot: 'secondary', trait: { k: 'first_attack_double', v: 2 },
      desc: 'La que abre la pelea suele cerrarla.', fam: 'picaro' },

    // ---- Focos (10): potencian habilidades ----
    { id: 'grimorio_brasas', name: 'Grimorio de brasas', icon: '📖', slot: 'secondary', trait: { k: 'skill_dmg', v: 3 },
      desc: 'Golpe de Fuego hace +3 de daño.', fam: 'elementalista' },
    { id: 'grimorio_hex', name: 'Grimorio del hex', icon: '📖', slot: 'secondary', trait: { k: 'skill_cd', v: -1 },
      desc: 'Tus habilidades se enfrían 1 ronda antes.', fam: 'elementalista' },
    { id: 'orbe_fugaz', name: 'Orbe fugaz', icon: '🔮', slot: 'secondary', trait: { k: 'first_turn_focus', v: 3 },
      desc: 'En tu primer turno, Golpe de Fuego hace +3.', fam: 'elementalista' },
    { id: 'varita_guardiana', name: 'Varita guardiana', icon: '🪄', slot: 'secondary', trait: { k: 'skill_dmg', v: 2 },
      desc: 'Vigila tus manos durante todo el ritual.', fam: 'elementalista' },
    { id: 'libro_cenizas', name: 'Libro de cenizas', icon: '📖', slot: 'secondary', trait: { k: 'skill_burn', v: 2 },
      desc: 'Golpe de Fuego quema al enemigo 2 rondas.', fam: 'elementalista' },
    { id: 'cristal_enfoque', name: 'Cristal de enfoque', icon: '🔮', slot: 'secondary', trait: { k: 'skill_dmg', v: 2 },
      desc: 'Reúne la luz dispersa y la convierte en llama.', fam: 'elementalista' },
    { id: 'vela_precisa', name: 'Vela precisa', icon: '🕯️', slot: 'secondary', trait: { k: 'first_turn_focus', v: 4 },
      desc: 'Quema recta y fuerte los primeros segundos.', fam: 'elementalista' },
    { id: 'amuleto_ecos', name: 'Amuleto de ecos', icon: '📿', slot: 'secondary', trait: { k: 'skill_cd', v: -1 },
      desc: 'Repite el hechizo antes de que se lo olvide el aire.', fam: 'elementalista' },
    { id: 'gema_eco', name: 'Gema del eco', icon: '💎', slot: 'secondary', trait: { k: 'skill_dmg', v: 3 },
      desc: 'Guarda un recuerdo ardiente de cada lanzamiento.', fam: 'elementalista' },
    { id: 'sosten_ardiente', name: 'Sostén ardiente', icon: '🔥', slot: 'secondary', trait: { k: 'skill_burn', v: 1 },
      desc: 'Golpe de Fuego quema al enemigo 1 ronda.', fam: 'elementalista' },

    // ════════════════════════════ 🧥 ARMADURA (34) — HP máx + un rasgo (sin DEF) ════════════════════════════
    { id: 'cota_caminante', name: 'Cota de la caminante', icon: '🧥', slot: 'armor', main: { hp: 6 }, trait: { k: 'defend_heal', v: 2 },
      desc: 'Al Defender, curas 2 de vida.', fam: 'guerrero' },
    { id: 'capa_acechador', name: 'Capa del acechador', icon: '🧥', slot: 'armor', main: { hp: 4 }, trait: { k: 'first_attack_double', v: 2 },
      desc: 'Tu primer ataque de cada combate hace el doble.', fam: 'picaro' },
    { id: 'coraza_coloso', name: 'Coraza del coloso', icon: '🧥', slot: 'armor', main: { hp: 10 }, trait: { k: 'revenge', v: 3 },
      desc: 'Al recibir daño, tu siguiente ataque hace +3.', fam: 'guerrero' },
    { id: 'tunica_viajero', name: 'Túnica del viajero', icon: '🧥', slot: 'armor', main: { hp: 6 }, trait: { k: 'combat_start_heal', v: 3 },
      desc: 'Curas 3 al empezar cada combate.', fam: 'neutra' },
    { id: 'manto_luna', name: 'Manto de la luna', icon: '🧥', slot: 'armor', main: { hp: 5 }, trait: { k: 'victory_heal', v: 4 },
      desc: 'Al vencer un combate, curas 4 de vida.', fam: 'neutra' },

    { id: 'cota_mazmorra', name: 'Cota de mazmorra', icon: '🧥', slot: 'armor', main: { hp: 4 }, trait: { k: 'defend_heal', v: 1 },
      desc: 'Trabajada a golpes y remiendos.', fam: 'guerrero' },
    { id: 'jubon_marcha', name: 'Jubón de la marcha', icon: '🦺', slot: 'armor', main: { hp: 5 }, trait: { k: 'combat_start_heal', v: 1 },
      desc: 'Te recuerda que el día solo acaba de empezar.', fam: 'guerrero' },
    { id: 'coraza_cobre', name: 'Coraza de cobre', icon: '🦺', slot: 'armor', main: { hp: 8 }, trait: { k: 'thorns', v: 1 },
      desc: 'Se pica con el roce de quien se atreve.', fam: 'guerrero' },
    { id: 'chal_viajero', name: 'Chal del viajero', icon: '🧣', slot: 'armor', main: { hp: 3 }, trait: { k: 'victory_heal', v: 2 },
      desc: 'Guarda el calor de las victorias pequeñas.', fam: 'neutra' },
    { id: 'correas_guardabosque', name: 'Correas del guardabosque', icon: '🎽', slot: 'armor', main: { hp: 5 }, trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Recubiertas de un unto que no cura nada bueno.', fam: 'picaro' },
    { id: 'capa_nocturna', name: 'Capa nocturna', icon: '🧣', slot: 'armor', main: { hp: 4 }, trait: { k: 'first_attack_double', v: 2 },
      desc: 'Tu primer ataque de cada combate hace el doble.', fam: 'picaro' },
    { id: 'tunica_llama', name: 'Túnica de la llama', icon: '👘', slot: 'armor', main: { hp: 5 }, trait: { k: 'burn_on_hit', v: 1 },
      desc: 'Prende al enemigo en cuanto lo tocas.', fam: 'elementalista' },
    { id: 'cota_malla', name: 'Cota de malla', icon: '🥋', slot: 'armor', main: { hp: 8 }, trait: { k: 'revenge', v: 2 },
      desc: 'Al recibir daño, tu siguiente ataque hace +2.', fam: 'guerrero' },
    { id: 'pechera_piedra', name: 'Pechera de piedra', icon: '🦺', slot: 'armor', main: { hp: 12 }, trait: { k: 'thorns', v: 2 },
      desc: 'Devuelve esquirlas a quien la golpea.', fam: 'guerrero' },
    { id: 'tunica_arcana', name: 'Túnica arcana', icon: '👘', slot: 'armor', main: { hp: 5 }, trait: { k: 'combat_start_heal', v: 2 },
      desc: 'Sus runas se encienden al sonar la campana.', fam: 'elementalista' },
    { id: 'capa_sombras', name: 'Capa de sombras', icon: '🧣', slot: 'armor', main: { hp: 4 }, trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir, la oscuridad te escamotea.', fam: 'picaro' },
    { id: 'jubon_herrero', name: 'Jubón del herrero', icon: '🦺', slot: 'armor', main: { hp: 6 }, trait: { k: 'victory_heal', v: 2 },
      desc: 'Al vencer un combate, curas 2.', fam: 'guerrero' },
    { id: 'armadura_estandarte', name: 'Armadura del estandarte', icon: '🥋', slot: 'armor', main: { hp: 9 }, trait: { k: 'defend_heal', v: 2 },
      desc: 'Al Defender, curas 2 de vida.', fam: 'guerrero' },
    { id: 'cota_espinas', name: 'Cota de espinas', icon: '🧥', slot: 'armor', main: { hp: 6 }, trait: { k: 'thorns', v: 2 },
      desc: 'Devuelves 2 de daño a quien te golpea mientras defiendes.', fam: 'guerrero' },
    { id: 'habito_novicio', name: 'Hábito de novicio', icon: '👘', slot: 'armor', main: { hp: 5 }, trait: { k: 'combat_start_heal', v: 2 },
      desc: 'Curas 2 al empezar cada combate.', fam: 'neutra' },
    { id: 'manto_invierno', name: 'Manto de invierno', icon: '🧣', slot: 'armor', main: { hp: 6 }, trait: { k: 'revenge', v: 2 },
      desc: 'Al recibir daño, tu siguiente ataque hace +2.', fam: 'neutra' },
    { id: 'coraza_reluciente', name: 'Coraza reluciente', icon: '🦺', slot: 'armor', main: { hp: 11 }, trait: { k: 'defend_heal', v: 2 },
      desc: 'Al Defender, curas 2 de vida.', fam: 'guerrero' },
    { id: 'capa_cuervo', name: 'Capa del cuervo', icon: '🧣', slot: 'armor', main: { hp: 6 }, trait: { k: 'victory_heal', v: 3 },
      desc: 'Al vencer un combate, curas 3.', fam: 'picaro' },
    { id: 'coleto_lobo', name: 'Coleto del lobo', icon: '🎽', slot: 'armor', main: { hp: 6 }, trait: { k: 'thorns', v: 1 },
      desc: 'Sus colmillos se afilan con tus espinas.', fam: 'guerrero' },
    { id: 'vestiduras_fuego', name: 'Vestiduras de fuego', icon: '👘', slot: 'armor', main: { hp: 6 }, trait: { k: 'burn_on_hit', v: 1 },
      desc: 'Quemas a quien cruza la línea.', fam: 'elementalista' },
    { id: 'coraza_ancla', name: 'Coraza de ancla', icon: '🦺', slot: 'armor', main: { hp: 13 }, trait: { k: 'revenge', v: 3 },
      desc: 'Lenta pero eterna: cada golpe se le parece.', fam: 'guerrero' },
    { id: 'manto_estelar', name: 'Manto estelar', icon: '🧣', slot: 'armor', main: { hp: 5 }, trait: { k: 'combat_start_heal', v: 2 },
      desc: 'Curas 2 al empezar cada combate.', fam: 'neutra' },
    { id: 'tunica_ceniza', name: 'Túnica de ceniza', icon: '👘', slot: 'armor', main: { hp: 4 }, trait: { k: 'burn_on_hit', v: 1 },
      desc: 'Su tacto deja brasa en tus golpes.', fam: 'elementalista' },
    { id: 'cota_dragon', name: 'Cota de dragón', icon: '🥋', slot: 'armor', main: { hp: 12 }, trait: { k: 'thorns', v: 2 },
      desc: 'Devuelves 2 de daño a quien te golpea mientras defiendes.', fam: 'guerrero' },
    { id: 'capa_recuerdo', name: 'Capa del recuerdo', icon: '🧣', slot: 'armor', main: { hp: 5 }, trait: { k: 'victory_heal', v: 3 },
      desc: 'Al vencer un combate, curas 3.', fam: 'neutra' },
    { id: 'coraza_jade', name: 'Coraza de jade', icon: '🦺', slot: 'armor', main: { hp: 10 }, trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Sus vetas rezuman veneno al roto el punto.', fam: 'picaro' },
    { id: 'sayo_caminante', name: 'Sayo del caminante', icon: '👘', slot: 'armor', main: { hp: 4 }, trait: { k: 'combat_start_heal', v: 1 },
      desc: 'Curas 1 al empezar cada combate.', fam: 'neutra' },
    { id: 'peto_trueno', name: 'Peto de trueno', icon: '🦺', slot: 'armor', main: { hp: 8 }, trait: { k: 'revenge', v: 2 },
      desc: 'Al recibir daño, tu siguiente ataque hace +2.', fam: 'elementalista' },
    { id: 'manto_berserker', name: 'Manto del berserker', icon: '🧥', slot: 'armor', main: { hp: 3 }, trait: { k: 'first_attack_double', v: 2 },
      desc: 'Tu primer ataque de cada combate hace el doble.', fam: 'guerrero' },

    // ════════════════════════════ 💍 ACCESORIO (34) — un rasgo pasivo, casi sin números ════════════════════════════
    { id: 'anillo_filo', name: 'Anillo del filo', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'filo', v: 1 },
      desc: 'Tus ataques de Filo hacen +1 de daño.', fam: 'guerrero' },
    { id: 'amuleto_reciclador', name: 'Amuleto del reciclador', icon: '💍', slot: 'accessory', trait: { k: 'discard_heal', v: 2 },
      desc: 'Al descartar un objeto, curas 2 más.', fam: 'neutra' },
    { id: 'colgante_veneno', name: 'Colgante del veneno', icon: '💍', slot: 'accessory', trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Envenenas al golpear (1 por ronda, se acumula).', fam: 'picaro' },
    { id: 'pendulo_llama', name: 'Péndulo de la llama', icon: '💍', slot: 'accessory', trait: { k: 'skill_burn', v: 2 },
      desc: 'Golpe de Fuego quema al enemigo 2 rondas.', fam: 'elementalista' },
    { id: 'pluma_viento', name: 'Pluma de viento', icon: '💍', slot: 'accessory', trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir de un combate, no recibes daño.', fam: 'picaro' },

    { id: 'anillo_yunque', name: 'Anillo del yunque', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'contundente', v: 1 },
      desc: 'Tus ataques Contundentes hacen +1 de daño.', fam: 'guerrero' },
    { id: 'anillo_arquero', name: 'Anillo del arquero', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'perforante', v: 1 },
      desc: 'Tus ataques Perforantes hacen +1 de daño.', fam: 'picaro' },
    { id: 'anillo_alacran', name: 'Anillo del alacrán', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'veneno', v: 1 },
      desc: 'Tus ataques de Veneno hacen +1 de daño.', fam: 'picaro' },
    { id: 'anillo_horno', name: 'Anillo del horno', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'fuego', v: 1 },
      desc: 'Tus ataques de Fuego hacen +1 de daño.', fam: 'elementalista' },
    { id: 'anillo_rayo', name: 'Anillo del rayo', icon: '💍', slot: 'accessory', trait: { k: 'damage_type_bonus', type: 'rayo', v: 1 },
      desc: 'Tus ataques de Rayo hacen +1 de daño.', fam: 'elementalista' },

    { id: 'talisman_calma', name: 'Talismán de la calma', icon: '🧿', slot: 'accessory', trait: { k: 'reader_shield', v: 1 },
      desc: 'El Lector no castiga que repitas tu acción.', fam: 'neutra' },
    { id: 'ojo_pacifico', name: 'Ojo pacífico', icon: '🧿', slot: 'accessory', trait: { k: 'reader_shield', v: 1 },
      desc: 'Desvia las miradas que te estudian.', fam: 'neutra' },
    { id: 'runa_silencio', name: 'Runa del silencio', icon: '📿', slot: 'accessory', trait: { k: 'reader_shield', v: 1 },
      desc: 'Tu rutina deja de ser un libro abierto.', fam: 'neutra' },

    { id: 'moneda_vieja', name: 'Moneda vieja', icon: '🪙', slot: 'accessory', trait: { k: 'discard_heal', v: 1 },
      desc: 'Al descartar un objeto, curas 1 más.', fam: 'neutra' },
    { id: 'zarron_zurdo', name: 'Zurrón del zurdo', icon: '🎒', slot: 'accessory', trait: { k: 'discard_heal', v: 3 },
      desc: 'Al descartar un objeto, curas 3 más.', fam: 'neutra' },

    { id: 'botas_ligeras', name: 'Botas ligeras', icon: '🥾', slot: 'accessory', trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir de un combate, no recibes daño.', fam: 'picaro' },
    { id: 'medallon_paso', name: 'Medallón del paso', icon: '📿', slot: 'accessory', trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir de un combate, no recibes daño.', fam: 'neutra' },

    { id: 'espiritu_serpiente', name: 'Espíritu de serpiente', icon: '🐍', slot: 'accessory', trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Envenenas al golpear (1 por ronda, se acumula).', fam: 'picaro' },
    { id: 'colmillo_colgante', name: 'Colmillo colgante', icon: '🦷', slot: 'accessory', trait: { k: 'poison_on_hit', v: 1 },
      desc: 'Envenenas al golpear (1 por ronda, se acumula).', fam: 'picaro' },

    { id: 'cadena_brasa', name: 'Cadena de brasa', icon: '⛓️', slot: 'accessory', trait: { k: 'skill_burn', v: 1 },
      desc: 'Golpe de Fuego quema al enemigo 1 ronda.', fam: 'elementalista' },
    { id: 'carbonculo', name: 'Carbúnculo', icon: '🔥', slot: 'accessory', trait: { k: 'skill_burn', v: 1 },
      desc: 'Un guijarro que arde mientras le miras.', fam: 'elementalista' },

    { id: 'ofrenda_altar', name: 'Ofrenda de altar', icon: '🏺', slot: 'accessory', trait: { k: 'victory_heal', v: 2 },
      desc: 'Al vencer un combate, curas 2.', fam: 'neutra' },
    { id: 'relicario_cosecha', name: 'Relicario de la cosecha', icon: '📿', slot: 'accessory', trait: { k: 'victory_heal', v: 2 },
      desc: 'Al vencer un combate, curas 2.', fam: 'neutra' },
    { id: 'semilla_vida', name: 'Semilla de vida', icon: '🌱', slot: 'accessory', trait: { k: 'victory_heal', v: 3 },
      desc: 'Al vencer un combate, curas 3.', fam: 'neutra' },

    { id: 'brote_aurora', name: 'Brote de aurora', icon: '🌱', slot: 'accessory', trait: { k: 'combat_start_heal', v: 2 },
      desc: 'Curas 2 al empezar cada combate.', fam: 'neutra' },
    { id: 'gota_cristal', name: 'Gota de cristal', icon: '💧', slot: 'accessory', trait: { k: 'combat_start_heal', v: 2 },
      desc: 'Condensa un aliento de calma al empezar.', fam: 'neutra' },
    { id: 'amuleto_amanecer', name: 'Amuleto del amanecer', icon: '📿', slot: 'accessory', trait: { k: 'combat_start_heal', v: 1 },
      desc: 'Curas 1 al empezar cada combate.', fam: 'neutra' },

    { id: 'cinturon_protector', name: 'Cinturón protector', icon: '🧷', slot: 'accessory', trait: { k: 'defend_heal', v: 1 },
      desc: 'Al Defender, curas 1.', fam: 'guerrero' },
    { id: 'munequeras_ancla', name: 'Muñequeras de ancla', icon: '🧷', slot: 'accessory', trait: { k: 'defend_heal', v: 1 },
      desc: 'Firmes como el suelo al que se agarran.', fam: 'guerrero' },

    { id: 'caracola_mar', name: 'Caracola del mar', icon: '🐚', slot: 'accessory', trait: { k: 'combat_start_heal', v: 1 },
      desc: 'Susurra marea alta dentro de tus sienes.', fam: 'neutra' },
    { id: 'diente_trofeo', name: 'Diente trofeo', icon: '🦷', slot: 'accessory', trait: { k: 'thorns', v: 1 },
      desc: 'Devuelves 1 de daño a quien te golpea mientras defiendes.', fam: 'guerrero' },
    { id: 'garra_oso', name: 'Garra de oso', icon: '🐾', slot: 'accessory', trait: { k: 'first_attack_double', v: 2 },
      desc: 'Tu primer ataque de cada combate hace el doble.', fam: 'guerrero' },
    { id: 'rama_vida', name: 'Rama de vida', icon: '🌿', slot: 'accessory', trait: { k: 'victory_heal', v: 2 },
      desc: 'Al vencer un combate, curas 2.', fam: 'neutra' },
    { id: 'bruma_matinal', name: 'Bruma matinal', icon: '🌫️', slot: 'accessory', trait: { k: 'flee_safe', v: 1 },
      desc: 'Al huir de un combate, no recibes daño.', fam: 'picaro' }
];

/** La espada con la que empieza toda ruta: 🗡️ Filo, 0 afijos, 3 ranuras vacías. */
export const BASIC_WEAPON_ID = 'espada_sendero';

export const ITEM_BASE_BY_ID = Object.fromEntries(ITEM_BASES.map(b => [b.id, b]));

/** Todas las bases de una ranura. */
export function basesBySlot(slot) {
    return ITEM_BASES.filter(b => b.slot === slot);
}

/** Un objeto hecho solo de su base (equipo inicial y comparaciones rápidas). */
export function basicItem(baseId) {
    const base = ITEM_BASE_BY_ID[baseId];
    if (!base) return null;
    return {
        id: base.id, name: base.name, icon: base.icon, slot: base.slot,
        damaged: base.damaged || null, rarity: 'comun',
        floor: 0, main: { ...base.main }, trait: base.trait ? { ...base.trait } : null,
        affixes: [], power: 1, desc: base.desc
    };
}