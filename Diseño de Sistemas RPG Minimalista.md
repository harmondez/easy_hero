# **Arquitectura de Sistemas de Juego: Análisis de Retención, Economía de Progresión y Mecánicas de Combate en Roguelikes y JRPGs por Turnos**

El diseño de videojuegos contemporáneo se encuentra determinado por la capacidad de sus sistemas subyacentes para sostener la atención, la motivación intrínseca y la retención del jugador durante decenas o cientos de horas. Este informe técnico analiza la arquitectura de sistemas en 14 títulos emblemáticos divididos entre dos géneros clave: Roguelikes (*Hades*, *Slay the Spire*, *Dead Cells*, *Rogue Legacy 2*, *Vampire Survivors*, *Loop Hero*, *Darkest Dungeon*) y JRPGs por turnos (*Persona 5 Royal*, *Persona 3 Reload*, *Final Fantasy X*, *Bravely Default 2*, *Octopath Traveler 2*, *Radiant Historia*, *Shin Megami Tensei V*).

## **1\. Bucle Principal de Juego (Core Gameplay Loop)**

La gestión del tiempo lúdico opera en múltiples capas temporales interconectadas. Un diseño robusto garantiza que las acciones inmediatas de micro-decisión (30 segundos) alimenten los objetivos tácticos (5 minutos), valide la viabilidad de la *build* en la sesión (30 minutos) y contribuya a una sensación permanente de avance irreversible en la metaprogresión (varias horas).

| Juego | Bucle de 30 Segundos | Bucle de 5 Minutos | Bucle de 30 Minutos | Meta-Bucle (Varias Horas) |
| :---- | :---- | :---- | :---- | :---- |
| **Hades** | Ejecución de combos, dash-cancel y gestión de posicionamiento1. | Selección de recompensa de sala y elección de bendición divina. | Completado de un intento de huida (*run*) a través de los cuatro biomas. | Inversión de Néctar/Oscuridad, avance de relaciones y desbloqueo del Espejo de la Noche1. |
| **Slay the Spire** | Evaluación de intenciones enemigas y optimización de la mano de cartas2. | Navegación por la red de nodos del mapa, visitas a la tienda y eventos4. | Derrota del jefe de Acto y sinergia final del mazo2. | Escalado de Ascensiones y desbloqueo de cartas/reliquias6. |
| **Dead Cells** | Ejecución cinética, parry, cancelaciones de animación y movimiento fluido7. | Limpieza de bioma, apertura de cofres malditos y depósitos de Células8. | Recorrido completo de ruta hasta el jefe final o muerte por riesgo8. | Inversión en la Forja Legendaria, mutaciones y Células de Jefe9. |
| **Rogue Legacy 2** | Plataformeo de precisión, uso de habilidades de clase y talentos. | Exploración de salas del castillo, recolección de oro y resolución de puzles. | Enfrentamiento a jefes de área (Estigmas) e intento de supervivencia. | Expansión del Castillo Familiar (árbol de talentos) y desbloqueo de clases. |
| **Vampire Survivors** | Movimiento posicional para esquivar hordas y optimización de auto-disparo10. | Elección de mejoras al subir de nivel y apertura de cofres de tesoro12. | Supervivencia durante el límite de 30 minutos frente a la Muerte11. | Compra de mejoras pasivas permanentes y desbloqueo de personajes. |
| **Loop Hero** | Colocación táctica de cartas de terreno y monitoreo del auto-battler11. | Completado de una vuelta al bucle y gestión del inventario de equipo11. | Enfrentamiento al jefe de capítulo o retirada estratégica con recursos12. | Reconstrucción del campamento base, desbloqueo de clases y cartas. |
| **Darkest Dungeon** | Selección de habilidad posicional y cálculo de estrés/daño13. | Tránsito por pasillos de mazmorra, gestión de antorchas y curios15. | Finalización o abandono de misión de mazmorra16. | Reconstrucción del Feudo y subida de nivel de la lista de héroes15. |
| **Persona 5 Royal** | Explotación de debilidad elemental y transferencia de turno con Baton Pass18. | Infiltración de corredores de Palacio o conversación social19. | Secuencia de infiltración en Palacio o avance en la agenda diaria19. | Progresión del calendario escolar anual y maxeo de confidantes19. |
| **Persona 3 Reload** | Ejecución de ataques iniciales y llamados a All-Out Attack. | Exploración de pisos en Tartarus y gestión de cartas de Arcanos. | Ascenso de bloque en Tartarus antes de la llegada de la luna llena. | Avanzar en el calendario académico y desarrollo de Social Links. |
| **Final Fantasy X** | Selección de acción según el pronóstico de la barra de turnos CTB. | Cadena de encuentros aleatorios y rotación activa de miembros de equipo. | Exploración de zona/mazmorra y batalla contra jefe de historia. | Avanzar en el Tablero de Esferas y captura de monstruos en la Arena. |
| **Bravely Default 2** | Gestión del saldo de PB (Brave/Default) para acumular o gastar turnos22. | Limpieza de hordas usando combos de habilidades de trabajo. | Exploración de mazmorra y derrota de portadores de Asterisco. | Subida de nivel de Trabajos secundarios y optimización de habilidades pasivas. |
| **Octopath Traveler 2** | Reducción de Escudos mediante vulnerabilidades y gasto de BP25. | Uso de Path Actions en ciudades o combates territoriales27. | Capítulo narrativo de personaje o exploración de mazmorra opcional27. | Optimización de Trabajos Secundarios, Poderes Latentes y jefe final28. |
| **Radiant Historia** | Manipulación de posiciones enemigas en la cuadrícula 3x3 para combos. | Batallas en cadena optimizadas para maximizar multiplicadores. | Resolución de nodos de la línea temporal y avance en misiones. | Navegación entre líneas temporales alternas en la Crónica Blanca. |
| **Shin Megami Tensei V** | Impacto en debilidades para ganar iconos de Press Turn31. | Exploración de Da'at, recolección de Miman y negociación demoníaca32. | Limpieza de Abcesos y preparación para jefes territoriales32. | Fusión de Demonios, Apotheosis de Esencias y rutas de alineamiento31. |

La interconexión entre estas capas temporales se sostiene mediante un principio de transferencia de valor. En los roguelikes, la micro-ejecución genera recursos directos que alimentan el meta-bucle, reduciendo la fricción percibida tras la derrota1. En los JRPGs por turnos, el tiempo invertido en las capas micro y meso sirve para verificar la eficiencia del diseño de la *build* en las confrontaciones clave del macro-bucle29.

## **2\. Mecánicas de Retención y Gestión de la Frustración**

La retención no se logra mediante la imposición de barreras de dificultad arbitrarias, sino mediante la reducción de la fricción entre la derrota y la reanudación del juego, reconfigurando la pérdida como un estado de aprendizaje o progreso.

### **El Bucle "Una Partida Más" (One More Run / Day)**

En *Hades*, la muerte del personaje no interrumpe la experiencia, sino que actúa como la puerta de acceso al avance narrativo1. Al reaparecer en la Morada de Hades, los personajes reaccionan dinámicamente a la causa de la muerte o al jefe alcanzado en el intento anterior1. La pérdida de la *run* se convierte en el único medio para desbloquear nuevos diálogos, regalos de Néctar y compras en el Espejo de la Noche, erradicando el castigo percibido1.  
En *Slay the Spire*, la decisión de reiniciar la partida responde al principio del "falso error cercano" (*near-miss*)2. Debido a que el juego comunica de forma determinista la intención del enemigo, la derrota se percibe siempre como una falla en la toma de decisiones del jugador o en la construcción del mazo, incitando al jugador a corregir inmediatamente su estrategia en una nueva partida2.  
En *Persona 5 Royal* y *Persona 3 Reload*, el gancho de retención principal reside en la estructura de calendario19. El juego divide cada jornada en franjas discretas (después de clase, noche) donde siempre queda un objetivo pendiente: subir una estadística social, avanzar un nivel de Confidante o explorar un tramo más del Palacio19. Esta atomización del tiempo genera un compromiso continuo apoyado en el deseo de descubrir qué sucederá al día siguiente19.

### **Sistemas Antabandonos y Mitigación del Sesgo de Pérdida**

* *Darkest Dungeon* gestiona la frustración transformando la naturaleza de sus unidades: los héroes no son avatares irremplazables, sino recursos fungibles15. Si una unidad acumula demasiado estrés o colapsa, el jugador puede descartarla y reclutar un sustituto a coste cero en la Diligencia, trasladando el verdadero valor permanente al progreso de la aldea15.  
* *Loop Hero* implementa un sistema de mitigación de pérdida mediante la mecánica de retirada proporcional12. El jugador puede abandonar la expedición en el campamento base conservando el 100% de los recursos obtenidos12. Si decide retirarse en cualquier otra casilla del bucle, conserva el 60%, mientras que morir en combate reduce el botín rescatado al 30%12. Esta regla traslada la responsabilidad del riesgo al jugador, haciendo que el fracaso sea el resultado directo de una mala evaluación personal12.  
* *Dead Cells* reduce la frustración mediante un diseño de ritmo hiperdinámico7. La velocidad de reaparición tras la muerte es prácticamente instantánea8. Además, la inversión de Células entre biomas garantiza que las mejoras en la reserva de armas o la Forja Legendaria permanezcan bloqueadas como progreso definitivo, independientemente de dónde ocurra la muerte8.

## **3\. Psicología del Jugador y Choque de Impulsos**

El nivel de compromiso prolongado surge de la alineación entre las mecánicas del juego y los motores psicológicos de la motivación humana.

### **Curiosidad y Descubrimiento**

Los juegos con alta densidad de sistemas emergentes aprovechan la curiosidad del jugador mediante la combinación de reglas simples. *Loop Hero* presenta un mapa inicialmente vacío donde la colocación de cartas de terreno adyacentes provoca transformaciones inéditas (por ejemplo, colocar una matriz de 3x3 de Rocas y Montañas forma una Cima de Montaña que otorga vida masiva pero genera arpías periódicamente). En *Persona 5 Royal*, la curiosidad se canaliza hacia la vertiente social y narrativa: el jugador busca descubrir los secretos de los Confidantes o las fusiones especiales dentro del Compendio de Personas18.

### **Dominio, Optimización y Fantasía de Poder**

El impulso de maestría se satisface mediante sistemas de combate de alta exigencia táctica. En *Shin Megami Tensei V*, el sistema *Press Turn* castiga severamente la improvisación (un ataque fallado o absorbido consume múltiples iconos de turno propios) mientras recompensa la optimización absoluta del equipo mediante la explotación de debilidades32.  
En *Vampire Survivors*, el bucle psicológico apela a la fantasía de poder y al crecimiento exponencial10. El juego elimina la exigencia de ejecución física para centrarse en la toma de decisiones de optimización pasiva10. Pasar de una situación de vulnerabilidad extrema a un estado de invencibilidad automatizada donde se eliminan miles de enemigos por minuto genera una fuerte descarga de dopamina apoyada por la recompensa audiovisual de los cofres10.

## **4\. Sistemas de Progresión y Escalado**

La progresión en estos géneros se divide en dos enfoques principales: la progresión vertical (incremento numérico directo de estadísticas) y la progresión horizontal (expansión de opciones tácticas y flexibilidad de *builds*).

### **Progresión Horizontal frente a Vertical en Roguelikes**

* *Slay the Spire* es un ejemplo fundamental de progresión casi exclusivamente horizontal en el meta-juego2. Los desbloqueos permanentes no otorgan vida extra ni daño base al personaje, sino que añaden nuevas cartas y reliquias a la reserva de generación (*pool*)2. La verdadera progresión es el conocimiento del jugador35.  
* *Rogue Legacy 2* se apoya en una metaprogresión vertical profunda a través de su árbol de Castillo. Cada run aporta oro que se invierte en subir atributos base (+HP, \+Ataque, \+Armadura) o desbloquear clases. Esto garantiza que incluso los jugadores con menor destreza técnica puedan superar los obstáculos mediante el incremento paulatino de sus estadísticas.  
* *Dead Cells* utiliza una combinación de ambas: desbloquea nuevas armas y habilidades para ampliar la variedad de combinaciones, pero permite invertir Células en la Forja Legendaria para aumentar la probabilidad de que las armas aparezcan con calidad \+, \++ o S en partidas futuras, elevando el techo de poder base8.

### **Ajuste y Escalado de Dificultad Dinámico**

Para sostener la rejugabilidad a largo plazo, los sistemas de dificultad deben ofrecer opciones de personalización modular:

* **Ascensiones (Slay the Spire)**: Un sistema de 20 niveles donde cada escalón añade una restricción específica (enemigos más agresivos, tiendas más costosas, menos espacio de pociones, jefes finales dobles)6.  
* **Células de Jefe (Dead Cells)**: Cambian radicalmente la arquitectura del juego al desactivar las fuentes de curación entre biomas, alterar los tipos de enemigos presentes en zonas tempranas y desbloquear puertas interconectadas que solo abren en niveles de dificultad altos9.  
* **Pacto de Castigo (Hades)**: Permite al jugador seleccionar modificadores individuales (calor) para alcanzar el nivel de exigencia exacto requerido para desbloquear las recompensas de jefes con cada arma.

## **5\. Arquitectura de Aleatoriedad (RNG vs. Skill)**

El equilibrio entre la suerte y la destreza se fundamenta en la distinción teórica entre la Aleatoriedad de Entrada (*Input RNG*) y la Aleatoriedad de Salida (*Output RNG*)2.

\+---------------------------------------------------------------------------------------+  
|                              ARQUITECTURA DE ALEATORIEDAD                             |  
\+---------------------------------------------------------------------------------------+  
| ALEATORIEDAD DE ENTRADA (Input RNG)                                                   |  
| Ocurre ANTES de la decisión del jugador.                                              |  
| Ejemplo: Cartas robadas en Slay the Spire, diseño de mapa, intenciones enemigas.       |  
| Resultado: Promueve la resolución de problemas, adaptación y agencia del jugador.    |  
\+---------------------------------------------------------------------------------------+  
| ALEATORIEDAD DE SALIDA (Output RNG)                                                   |  
| Ocurre DESPUÉS de la decisión del jugador.                                            |  
| Ejemplo: Porcentaje de precisión en Darkest Dungeon, probabilidad de golpe crítico.   |  
| Resultado: Genera cálculo de riesgo, gestión de crisis y tensión dramática.          |  
\+---------------------------------------------------------------------------------------+

### **Gestión de la Aleatoriedad de Entrada**

En *Slay the Spire*, el robo de cartas al inicio del turno es aleatorio, pero las intenciones de los enemigos son 100% deterministas y visibles2. El jugador no adivina qué hará el rival; evalúa la mano que la aleatoriedad de entrada le ha entregado y calcula la combinación óptima de recursos para mitigar la amenaza2. Este enfoque garantiza que el fracaso sea percibido como un error de cálculo táctico y no como mala suerte2.

### **Mitigación de la Aleatoriedad de Salida**

En *Darkest Dungeon*, el combate contiene una aleatoriedad de salida constante (probabilidades de fallo, golpes críticos enemigos, tiradas de infarto)14. Sin embargo, el diseño del sistema proporciona al jugador múltiples herramientas de preparación previa (antorchas para mantener la luz alta, abalorios de precisión, habilidades de aturdimiento con alto porcentaje de éxito)15. La maestría en *Darkest Dungeon* no consiste en ejecutar un plan perfecto, sino en gestionar el riesgo probabilístico y construir redundancias para responder cuando los dados fallen14.

## **6\. Sistemas de Combate y Economía de Turnos**

Los sistemas de combate más efectivos son aquellos que transforman la estructura clásica de turnos alternos en una economía dinámica donde las acciones pueden ser acumuladas, robadas, multiplicadas o interceptadas.

\+---------------------------------------------------------------------------------------+  
|                         SISTEMAS DE MANIPULACIÓN DE TURNOS                            |  
\+---------------------+-----------------------------------+-----------------------------+  
| SISTEMA             | JUEGOS PRINCIPALES                | MECÁNICA CLAVE              |  
\+---------------------+-----------------------------------+-----------------------------+  
| Press Turn          | Shin Megami Tensei V              | Explotar debilidad otorga   |  
|                     | Persona 5 Royal (Baton Pass)      | medio turno extra \[cite: 18, 32, 33\].|  
\+---------------------+-----------------------------------+-----------------------------+  
| Brave / Default     | Bravely Default 2                 | Ahorra turnos (Default) o   |  
|                     |                                   | gasta turnos futuros (Brave)|  
|                     |                                   | en ráfaga. |  
\+---------------------+-----------------------------------+-----------------------------+  
| Break & Boost       | Octopath Traveler 2               | Rompe escudos para stunned  |  
|                     |                                   | y potencia ataques con BP   |  
|                     |                                   | acumulados.   |  
\+---------------------+-----------------------------------+-----------------------------+  
| Manipulación Grid   | Radiant Historia                  | Empuja/arrastra enemigos a  |  
|                     |                                   | la misma casilla para combos|  
|                     |                                   | multiobjetivo masivos.      |  
\+---------------------+-----------------------------------+-----------------------------+

### **Análisis Detallado de Paradigmas de Combate**

#### **Press Turn System (Shin Megami Tensei V)**

El equipo dispone de una cantidad de iconos de turno igual al número de miembros activos32. Impactar en una debilidad elemental o asestar un golpe crítico no consume el icono completo, sino que lo transforma en un icono parpadeante (medio turno), permitiendo al grupo actuar hasta 8 veces en una sola ronda32. Por el contrario, atacar a un elemento que el enemigo absorbe o anula destruye de inmediato múltiples iconos de turno propios32. Este sistema exige un conocimiento exhaustivo de las afinidades y convierte la composición del equipo en la decisión táctica principal33.

#### **Baton Pass (Persona 5 Royal)**

Al golpear una debilidad se activa la mecánica *1-More*, otorgando una acción adicional18. El jugador puede transferir esa acción a un aliado mediante el *Baton Pass*, lo que incrementa progresivamente el daño y la curación del receptor, además de anular el coste de SP de sus habilidades al alcanzar el cuarto relevo de la cadena18. Esto transforma las batallas en secuencias cinemáticas de alta sinergia donde la planificación del orden de actuación es vital.

#### **Brave / Default (Bravely Default 2\)**

Modifica el flujo temporal mediante el saldo de Puntos de Brave (PB)22. Usar *Default* pone al personaje en guardia y almacena 1 PB23. Usar *Brave* permite ejecutar hasta 4 acciones en el mismo turno gastando PB almacenados o incurriendo en un saldo negativo23. Entrar en números rojos de PB deja al personaje completamente inmóvil hasta que el contador vuelva a cero, obligando a calcular si la ráfaga de ataques será suficiente para eliminar al enemigo23.

#### **Break & Boost (Octopath Traveler 2\)**

Los enemigos poseen un escudo con un número determinado de puntos de guardia y una serie de debilidades ocultas25. Cada impacto de su debilidad reduce el escudo en 125. Al llegar a 0, el enemigo sufre un *Break*: pierde el turno actual, el siguiente y sus defensas caen drásticamente25. Los personajes acumulan Puntos de Impulso (BP) cada turno, los cuales pueden gastarse para potenciar la fuerza de una habilidad o multiplicar el número de ataques básicos, permitiendo romper defensas rápidamente o infligir daño masivo durante la ventana de vulnerabilidad del rival25.

## **7\. Economía del Juego y Arquitectura de Recursos**

La economía en estos géneros regula el ritmo de la progresión y dicta el nivel de tensión mediante la gestión de la escasez.

### **Economía Doble: In-Run frente a Meta-Recursos**

Los roguelikes operan mediante una estricta separación de flujos económicos:

* **Recursos In-Run (Volátiles)**: Oro, pociones, llaves, cartas temporales. Su único propósito es permitir la optimización táctica durante la partida actual. Deben consumirse por completo para maximizar las probabilidades de victoria.  
* **Meta-Recursos (Permanentes)**: Oscuridad/Gemas (*Hades*), Células (*Dead Cells*)8, Oro de herencia (*Rogue Legacy 2*), Madera/Piedra (*Loop Hero*)12. Su flujo está diseñado para otorgar un sentido de progreso incremental a largo plazo, reduciendo el impacto psicológico de la derrota1.

### **La Escasez como Motor de Tensión en JRPGs**

En *Persona 5 Royal* y *Persona 3 Reload*, el recurso económico más escaso en las etapas tempranas e intermedias del juego no es el dinero, sino los Puntos de Magia (SP) y el tiempo del calendario19. La incapacidad de curar o usar magia obliga al jugador a decidir si abandonar la exploración del Palacio (gastando un día valioso del calendario) o arriesgarse a continuar utilizando ataques físicos que consumen vida19.  
En *Darkest Dungeon*, la economía está diseñada para simular la escasez en un entorno hostil15. El dinero acumulado en las expediciones debe dividirse entre la compra de provisiones básicas para la siguiente misión (comida, antorchas, palas) y el tratamiento del estrés o las enfermedades de los héroes en el Feudo15. Esto genera un dilema constante entre invertir en la supervivencia inmediata o en la infraestructura a largo plazo15.

## **8\. Densidad de Contenido y Producción Minimalista**

Para los desarrolladores independientes, la creación masiva de contenido visual o narrativo es inviable. Los títulos analizados logran una alta profundidad lúdica mediante el uso de sistemas emergentes y diseño ortogonal.

\+---------------------------------------------------------------------------------------+  
|                            DISEÑO ORTOGONAL DE SISTEMAS                               |  
\+---------------------------------------------------------------------------------------+  
|  DISEÑO NO ORTOGONAL (Superficial):                                                  |  
|  Objeto A: \+5% Daño de Fuego                                                          |  
|  Objeto B: \+10% Daño de Fuego                                                         |  
|  Resultado: Incremento numérico lineal, sin cambios en el comportamiento.             |  
\+---------------------------------------------------------------------------------------+  
|  DISEÑO ORTOGONAL (Emergente):                                                       |  
|  Elemento A: Aplica estado "Moñado" al enemigo.                                       |  
|  Elemento B: Las habilidades eléctricas se propagan a todos los objetivos "Mojados".  |  
|  Elemento C: El hielo congelará instantáneamente a los objetivos "Mojados".           |  
|  Resultado: Interacciones sistémicas exponenciales con un coste de desarrollo mínimo.|  
\+---------------------------------------------------------------------------------------+

### **Estrategias de Generación de Depth sin Bloat Artístico**

* **Sistemas Ortogonales (Slay the Spire)**: En lugar de crear cientos de cartas únicas, las cartas interactúan mediante un conjunto reducido de estados pasivos (Fuerza, Vulnerable, Debilidad, Armadura)2. Añadir una sola reliquia que altere la forma en que se acumula la Armadura cambia automáticamente la utilidad de decenas de cartas existentes, generando una gran variedad de combinaciones con un coste de desarrollo mínimo2.  
* **Construcción Automática por Terrenos (Loop Hero)**: Elimina la necesidad de diseñar niveles manualmente11. La interacción espacial entre casillas en una cuadrícula simplificada 2D genera biomas, enemigos y recompensas de forma emergente a partir de la lógica de adyacencia11.  
* **Modularidad de Esencias y Fusión (SMT V)**: Almacena las habilidades e inmunidades de los enemigos en un formato de consumo (Esencias) que permite personalizar las estadísticas y resistencias del avatar sin necesidad de crear nuevo equipamiento visual o animaciones adicionales33.

## **9\. Lecciones de Diseño y Errores de Clones Fallidos**

El análisis de postmortems y la evaluación del mercado independiente revelan patrones claros sobre qué sistemas sostienen el juego a largo plazo y cuáles generan fricción innecesaria.

### **Mecánicas que Funcionan Excepcionalmente Bien**

> 1. **Comunicación Determinista de Intenciones Enemigas**: Mostrar de forma transparente la acción del rival transforma el combate en un puzle táctico explicativo3.  
> 2. **Recompensas Narrativas o de Progreso en la Muerte**: Integrar la derrota como el canal principal para la conversación o la mejora del avatar elimina la penalización percibida1.  
> 3. **Multiplicación de Acciones por Explotación del Sistema**: Premiar el conocimiento de las vulnerabilidades otorgando turnos adicionales incita a la optimización constante del equipo18.

### **Mecánicas Aparentemente Buenas pero Ineficientes en la Práctica**

* **Sistemas de Escalado Numérico Inflacionario**: Aumentar la vida y el daño de los enemigos sin modificar sus patrones de comportamiento o el número de decisiones disponibles produce combates tediosos y genera grind innecesario.  
* **Aleatoriedad de Salida Pura en Estados Críticos**: Exigir al jugador que formule una estrategia compleja para luego hacer que esta falle por un porcentaje de precisión totalmente aleatorio produce una fuerte sensación de injusticia.

### **Errores Comunes en Clones Fallidos**

* **Falta de Sinergias Ortogonales**: Producir cientos de ítems que otorgan bonificaciones numéricas simples (+5% de daño) en lugar de modificadores cualitativos que alteren las reglas base del juego.  
* **Permadeath Casta sin Metaprogresión ni Aprendizaje**: Replicar la muerte permanente de los roguelikes sin ofrecer sistemas de progreso horizontal o un telegrafiado claro de las causas de la derrota, convirtiendo la experiencia en una pérdida de tiempo sin recompensa psicológica.

## **MECHANICS WORTH STEALING**

Mecánicas validadas en múltiples títulos de éxito que pueden integrarse en nuevos desarrollos indies para maximizar la profundidad y la retención:

> 1. **Intenciones Enemigas Teografiadas (Slay the Spire, Into the Breach)**: Mostrar el daño exacto, la defensa o el estado alterado que aplicará cada rival en el siguiente turno3. Elimina la aleatoriedad de salida arbitraria y potencia la sensación de agencia2.  
> 2. **Sistema Press Turn / Baton Pass (SMT V, Persona 5 Royal)**: Premiar el acierto táctico al explotar debilidades permitiendo prolongar la fase de ataque mediante iconos de turno fraccionados o transferencias a aliados con bonificaciones acumulativas18.  
> 3. **Avance Narrativo Mediante el Fracaso (Hades, Returnal)**: Diseñar los diálogos, arcos de personajes y eventos del Hub para que progresen de forma exclusiva tras la muerte del jugador, recontextualizando el fracaso como un avance en la historia1.  
> 4. **Generación del Entorno Mediante Cartas y Terrenos (Loop Hero, Dorfromantik)**: Delegar la construcción del escenario y la densidad de amenazas al propio jugador mediante el posicionamiento estratégico de tiles de terreno con reglas de adyacencia11.  
> 5. **Mecánica de Extracción con Escalado de Riesgo (Loop Hero, Darkest Dungeon)**: Dar al jugador la opción constante de abortar una expedición en cualquier momento12. Retirarse voluntariamente en una zona segura conserva el 100% de los recursos recopilados; morir en el intento liquida la mayor parte del botín12.  
> 6. **Fusión de Unidades e Herencia de Habilidades (SMT V, Persona 5, Dragon Quest Monsters)**: Un sistema donde la mejora de unidades se basa en sacrificarlas o combinarlas para trasladar habilidades pasivas personalizadas a nuevos personajes, manteniendo el bucle de optimización activo19.

## **BEST DESIGN FOR A MINIMALIST WEB APP RPG**

A continuación se detalla la propuesta de diseño para una aplicación RPG basada en navegador, con un enfoque *systems-first*, gráficos minimalistas e interfaz táctil optimizada para sesiones de 5 a 20 minutos.

### **Concepto y Visión General**

* **Título del Proyecto**: *Chronos Tactics: Minimal Grid*  
* **Plataforma**: Web App (React / Vue \+ Canvas 2D / UI basada en texto e iconos).  
* **Estética**: Interfaz táctica limpia, monocromática con colores de acento funcionales para indicar estados alterados, debilidades e intenciones.  
* **Sesión Objetivo**: 5 a 20 minutos por run o expedición.

### **Bucle de Juego Integrado**

> 1. **Micro-Bucle (30 Segundos)**: El jugador observa las intenciones teografiadas de los enemigos en un tablero de 3x3 y selecciona una combinación de 3 acciones de su mano para mitigar el daño y provocar rupturas de guardia3.  
> 2. **Meso-Bucle (5 Minutos)**: Navegación por una red de 8 a 10 nodos por piso (Combate, Evento, Tienda, Descanso). Decidir si avanzar al siguiente nodo o utilizar el botón de "Extracción" en un punto de descanso12.  
> 3. **Macro-Bucle (20 Minutos)**: Enfrentamiento contra el Guardián del Bioma. Completar el piso o morir, convirtiendo los recursos rescatados en mejoras permanentes para la base.  
> 4. **Meta-Bucle (Semanas)**: Expansión del Asentamiento para desbloquear nuevas clases de origen, modificar el pozo de cartas/habilidades disponibles e incrementar la dificultad mediante un sistema de modulación de riesgo.

### **Sistema de Combate: Break & Slide Grid**

El combate se desarrolla en un grid de 3x3 donde el jugador controla a 2 unidades (Vanguardia y Retaguardia) contra 1 a 4 enemigos:

* **Intención Telegrafiada**: Cada enemigo muestra la casilla exacta a la que atacará y el elemento que utilizará3.  
* **Manipulación de Posición**: Las habilidades del jugador no solo causan daño, sino que empujan o arrastran a los enemigos en la cuadrícula. Desplazar a un enemigo a la casilla de ataque de otro provoca que se dañen entre sí.  
* **Sistema de Break**: Los enemigos poseen una barra de Escudo. Atacarlos con su elemento débil o empujarlos contra los bordes del tablero reduce su Escudo25. Al llegar a cero, el enemigo sufre un *Break*: pierde su turno de ataque telegrafiado y duplica el daño recibido durante la ronda25.

### **Arquitectura Económica y Metaprogresión**

* **Cristales de Tiempo (Meta-Moneda)**: Se obtienen al completar nodos o al extraerse. Se utilizan en el Asentamiento para comprar talentos pasivos en un árbol de desarrollo modular.  
* **Fragmentos de Esencia (In-Run)**: Se caen al derrotar enemigos. Permiten comprar habilidades temporales en los nodos de Tienda o fusionar dos cartas en la mano para combinar sus efectos durante la *run*.  
* **Mecánica de Extracción de Riesgo**: En los nodos de Descanso, el jugador puede elegir "Extraer". Extraerse en la zona de descanso conserva el 100% de los Cristales de Tiempo12. Si el jugador decide continuar y muere en un nodo de combate posterior, solo rescata el 25% de los recursos12.

## **ROI de Mecánicas para Desarrolladores Indie**

La siguiente tabla clasifica las mecánicas analizadas de mayor a menor Retorno de Inversión (ROI) para un desarrollador independiente, evaluando la relación entre el coste de desarrollo (código, arte, UI) y su impacto real en la retención y la rejugabilidad a largo plazo:

| Mecánica | Juegos que la Usan | Coste de Desarrollo | Impacto en Retención | Prioridad (ROI) |
| :---- | :---- | :---- | :---- | :---- |
| **Telegrafiado de Intenciones Enemigas** | *Slay the Spire*, *Into the Breach* \[cite: 3\] | **Muy Bajo** (Lógica de UI pura) | **Crítico** (Elimina la frustración por injusticia)2 | **1 (Máximo ROI)** |
| **Extracción de Riesgo / Retirada Voluntaria** | *Loop Hero*, *Darkest Dungeon* \[cite: 12, 16\] | **Muy Bajo** (Gestión de estados y menú) | **Alto** (Añade tensión y agencia en la decisión)12 | **2** |
| **Combate por Debilidades con Recompensa de Turnos (Press Turn / Break)** | *SMT V*, *Persona 5*, *Octopath Traveler 2* \[cite: 18, 25, 32\] | **Bajo** (Lógica de turnos e indicadores) | **Muy Alto** (Genera alto compromiso táctico)29 | **3** |
| **Sinergias Ortogonales Modulares (Tarjetas/Habilidades)** | *Slay the Spire*, *Vampire Survivors* \[cite: 2, 10\] | **Bajo \- Medio** (Balance de matriz de datos) | **Crítico** (Aporta rejugabilidad emergente)5 | **4** |
| **Desbloqueo Horizontal de Opciones (Pool Progress)** | *Slay the Spire*, *Dead Cells* \[cite: 2, 8\] | **Bajo** (Tablas de loot y persistencia) | **Alto** (Mantiene la variedad sin arruinar el balance)2 | **5** |
| **Banca de Turnos (Brave / Default)** | *Bravely Default 2* \[cite: 22, 23\] | **Bajo** (Contador de PB y reglas de estado)23 | **Medio \- Alto** (Añade dimensión de riesgo/beneficio) | **6** |
| **Manipulación Posicional en Cuadrícula 2D** | *Radiant Historia*, *Into the Breach* | **Medio** (Matriz de posiciones) | **Alto** (Transforma el combate en rompecabezas) | **7** |
| **Fusión e Herencia de Habilidades (Esencias)** | *SMT V*, *Persona 5 Royal* \[cite: 19, 33\] | **Medio** (Interfaz de fusión y herencia)33 | **Alto** (Satisface la optimización de builds)19 | **8** |
| **Generación de Mapa por Adyacencia de Terrenos** | *Loop Hero*, *Dorfromantik* \[cite: 11, 12\] | **Medio** (Algoritmo de reglas de adyacencia) | **Alto** (Sensación de descubrimiento)40 | **9** |
| **Árboles de Metaprogresión Vertical (Atributos Base)** | *Rogue Legacy 2*, *Hades* \[cite: 1\] | **Bajo \- Medio** (Base de datos y balance) | **Medio** (Retiene por acumulación, pero arriesga aburrimiento) | **10** |
| **Avance Narrativo Vinculado a la Muerte** | *Hades* \[cite: 1, 34\] | **Muy Alto** (Volumen masivo de guion e integración)1 | **Muy Alto** (Fidelización emocional)1 | **11** |
| **Estructura de Calendario y Eventos de Tiempo Rígido** | *Persona 5 Royal*, *Persona 3 Reload* \[cite: 19, 20\] | **Alto** (Sistemas interconectados y guion)19 | **Alto** (Inmersivo, pero poco flexible para indies)19 | **12 (Menor ROI)** |

## **Conclusión**

El éxito de los sistemas de retención en roguelikes y JRPGs por turnos reside en la eliminación de la frustración no motivacional y en la creación de dinámicas de juego emergentes. La adopción de la aleatoriedad de entrada, el telegrafiado determinista de las acciones enemigas y la conversión de los turnos en una moneda manipulable constituyen las herramientas más eficientes para cualquier desarrollador. Priorizar las interacciones ortogonales y la profundidad sistémica por encima de la producción masiva de contenido artístico permite a los estudios independientes diseñar experiencias altamente rejugables capaces de competir en la industria actual.

#### **Obras citadas**

> 1. Edge 398 July 2024 \- Calaméo, [https://www.calameo.com/books/007674231adbeba159582](https://www.calameo.com/books/007674231adbeba159582)  
> 2. Design — Development Blog — Brett Alexander Moody, [https://www.brettamoody.com/blog/category/Design](https://www.brettamoody.com/blog/category/Design)  
> 3. Is game design a bunch of experiments / trial and error? : r/gamedev, [https://www.reddit.com/r/gamedev/comments/1no29x0/is\_game\_design\_a\_bunch\_of\_experiments\_trial\_and/](https://www.reddit.com/r/gamedev/comments/1no29x0/is_game_design_a_bunch_of_experiments_trial_and/)  
> 4. A big name in proc gen is Kate Compton who coined the term, [https://news.ycombinator.com/item?id=49628866](https://news.ycombinator.com/item?id=49628866)  
> 5. I suck at math \- balancing is the hardest part for me. Why doesn't, [https://www.reddit.com/r/gamedev/comments/1jeuak5/i\_suck\_at\_math\_balancing\_is\_the\_hardest\_part\_for/](https://www.reddit.com/r/gamedev/comments/1jeuak5/i_suck_at_math_balancing_is_the_hardest_part_for/)  
> 6. GDC (Game Developers Conference) Talk: Slay the Spire \- Metrics, [https://www.classcentral.com/course/youtube-slay-the-spire-metrics-driven-design-and-balance-165888](https://www.classcentral.com/course/youtube-slay-the-spire-metrics-driven-design-and-balance-165888)  
> 7. The Not so Secrets to Success in the Game Industry \- Game Developer, [https://www.gamedeveloper.com/business/the-not-so-secrets-to-success-in-the-game-industry](https://www.gamedeveloper.com/business/the-not-so-secrets-to-success-in-the-game-industry)  
> 8. GDC Vault, [https://gdcvault.com/free/gdc-19/](https://gdcvault.com/free/gdc-19/)  
> 9. The Number One Educational Resource for the Game Industry, [https://gdcvault.com/free/gdc-24/](https://gdcvault.com/free/gdc-24/)  
> 10. Difficulty Modifiers \- Survivors-likes List, [https://survivorslikes.com/game-mode-tags/difficulty-modifiers/](https://survivorslikes.com/game-mode-tags/difficulty-modifiers/)  
> 11. GOG \- Survivors-likes List, [https://survivorslikes.com/platform-compatibility/gog/](https://survivorslikes.com/platform-compatibility/gog/)  
> 12. \[Android\] From game servers to solo development — I made ... \- Reddit, [https://www.reddit.com/r/playmygame/comments/1v7jhqb/android\_from\_game\_servers\_to\_solo\_development\_i/](https://www.reddit.com/r/playmygame/comments/1v7jhqb/android_from_game_servers_to_solo_development_i/)  
> 13. Darkest Dungeon: Affliction Mechanics | PDF | Leisure | Sports \- Scribd, [https://www.scribd.com/document/453760372/DARKEST-DUNGEON](https://www.scribd.com/document/453760372/DARKEST-DUNGEON)  
> 14. The Stress System: AKA Darkest Dungeons and Dragons \- Reddit, [https://www.reddit.com/r/DnDBehindTheScreen/comments/anso0v/the\_stress\_system\_aka\_darkest\_dungeons\_and\_dragons/](https://www.reddit.com/r/DnDBehindTheScreen/comments/anso0v/the_stress_system_aka_darkest_dungeons_and_dragons/)  
> 15. The Dynamics of Stress in Darkest Dungeon \- Nicola Dau, [https://nicolaluigidau.wordpress.com/2024/02/06/the-dynamics-of-stress-in-darkest-dungeon/](https://nicolaluigidau.wordpress.com/2024/02/06/the-dynamics-of-stress-in-darkest-dungeon/)  
> 16. Darkest Dungeon: Designing for despair, and kicking you when you, [https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down](https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down)  
> 17. A Mechanical Critique of Darkest Dungeon \- The Gemsbok, [https://thegemsbok.com/art-reviews-and-articles/darkest-dungeon-red-hook-critique-mechanics-design/](https://thegemsbok.com/art-reviews-and-articles/darkest-dungeon-red-hook-critique-mechanics-design/)  
> 18. Persona 5 Royal Spoiler Free Guide \- ftp.mat-travel.com, [https://ftp.mat-travel.com/manual/bqeSYhoZTK7r/Persona\_5\_Royal\_Spoiler\_Free\_Guide](https://ftp.mat-travel.com/manual/bqeSYhoZTK7r/Persona_5_Royal_Spoiler_Free_Guide)  
> 19. PERSONA 5 CALENDAR GUIDE \- freelancer.imedicina.com.br, [https://freelancer.imedicina.com.br/proceedings/cK12LD0FE008/Persona5CalendarGuide](https://freelancer.imedicina.com.br/proceedings/cK12LD0FE008/Persona5CalendarGuide)  
> 20. PERSONA 5 ROYAL GUIDE DAY BY DAY, [https://freelancer.imedicina.com.br/catalogue/To93ok6FE115/Persona-5-Royal-Guide-Day-By-Day](https://freelancer.imedicina.com.br/catalogue/To93ok6FE115/Persona-5-Royal-Guide-Day-By-Day)  
> 21. PERSONA 5 ROYAL OCTOBER EXAMS \- freelancer.imedicina.com.br, [https://freelancer.imedicina.com.br/fulldisplay/RmiXL6/3FE063/persona\_5\_\_royal-october\_exams.pdf](https://freelancer.imedicina.com.br/fulldisplay/RmiXL6/3FE063/persona_5__royal-october_exams.pdf)  
> 22. Bravely Default Review for 3DS: Don't Judge a Book by It's Cover, [https://gamefaqs.gamespot.com/3ds/729328-bravely-default/reviews/159450](https://gamefaqs.gamespot.com/3ds/729328-bravely-default/reviews/159450)  
> 23. Bravely Default: The Kotaku Review, [https://kotaku.com/bravely-default-the-kotaku-review-1518209522](https://kotaku.com/bravely-default-the-kotaku-review-1518209522)  
> 24. Bravely Default – Review | The Toddhunter Report \- WordPress.com, [https://thetoddhunter.wordpress.com/2014/02/10/bravely-default-review/](https://thetoddhunter.wordpress.com/2014/02/10/bravely-default-review/)  
> 25. octopath traveler ii \- Square Enix, [https://www.square-enix-games.com/tagged/products%3AOCTOPATH%20TRAVELER%20II](https://www.square-enix-games.com/tagged/products%3AOCTOPATH%20TRAVELER%20II)  
> 26. Octopath Traveler 2 Break & Boost Combat System Explained, [https://twinfinite.net/guides/break-and-boost-system-octopath-traveler-2-explained/](https://twinfinite.net/guides/break-and-boost-system-octopath-traveler-2-explained/)  
> 27. Review: Octopath Traveler II \- Hardcore Gamer, [https://hardcoregamer.com/reviews/review-octopath-traveler-ii/437379/](https://hardcoregamer.com/reviews/review-octopath-traveler-ii/437379/)  
> 28. Octopath Traveler 2 review: Eight is a crowd | Shacknews, [https://www.shacknews.com/article/134209/octopath-traveler-2-review-score](https://www.shacknews.com/article/134209/octopath-traveler-2-review-score)  
> 29. Octopath Traveler 2 is the gold standard of JRPG's and I'm tired of, [https://www.reddit.com/r/patientgamers/comments/1mpl2d8/octopath\_traveler\_2\_is\_the\_gold\_standard\_of\_jrpgs/](https://www.reddit.com/r/patientgamers/comments/1mpl2d8/octopath_traveler_2_is_the_gold_standard_of_jrpgs/)  
> 30. 'Octopath Traveler 2' Review: A Retro-Inspired Gem That Feels a Bit, [https://www.inverse.com/gaming/octopath-traveler-2-review](https://www.inverse.com/gaming/octopath-traveler-2-review)  
> 31. Halicor :: Review for Shin Megami Tensei V: Vengeance, [https://steamcommunity.com/profiles/76561198037951083/recommended/1875830/](https://steamcommunity.com/profiles/76561198037951083/recommended/1875830/)  
> 32. Shin Megami Tensei V \- Wikipedia, [https://en.wikipedia.org/wiki/Shin\_Megami\_Tensei\_V](https://en.wikipedia.org/wiki/Shin_Megami_Tensei_V)  
> 33. Shin Megami Tensei V: The Kotaku Review, [https://kotaku.com/shin-megami-tensei-v-the-kotaku-review-1848102235](https://kotaku.com/shin-megami-tensei-v-the-kotaku-review-1848102235)  
> 34. Video Game Design For Dummies 9781394308170 ... \- dokumen.pub, [https://dokumen.pub/video-game-design-for-dummies-9781394308170-9781394308187-9781394308194.html](https://dokumen.pub/video-game-design-for-dummies-9781394308170-9781394308187-9781394308194.html)  
> 35. Gabriel Koenig \- Player Agency in Procedural Generation \- YouTube, [https://www.youtube.com/watch?v=xju91VGh2Ps](https://www.youtube.com/watch?v=xju91VGh2Ps)  
> 36. Review – Shin Megami Tensei V \- Geeks Under Grace, [https://www.geeksundergrace.com/gaming/review-shin-megami-tensei-v/](https://www.geeksundergrace.com/gaming/review-shin-megami-tensei-v/)  
> 37. Why I think the battle system can be a welcoming change \- Reddit, [https://www.reddit.com/r/bravelydefault/comments/kzxoiu/why\_i\_think\_the\_battle\_system\_can\_be\_a\_welcoming/](https://www.reddit.com/r/bravelydefault/comments/kzxoiu/why_i_think_the_battle_system_can_be_a_welcoming/)  
> 38. The Unlimited Rulebook \- Teses USP, [https://teses.usp.br/teses/disponiveis/45/45134/tde-22122021-205515/publico/texto.pdf](https://teses.usp.br/teses/disponiveis/45/45134/tde-22122021-205515/publico/texto.pdf)  
> 39. Bravely Default Review \-- Something old, something new, [https://nikkeivoice.ca/bravely-default-review-something-old-something-new/](https://nikkeivoice.ca/bravely-default-review-something-old-something-new/)  
> 40. GameDev Platform – Telegram, [https://t.me/s/gamedevplatform?before=270](https://t.me/s/gamedevplatform?before=270)