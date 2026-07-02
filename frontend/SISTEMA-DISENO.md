SISTEMA DE DISEÑO — Comercial Brich
COLOR
Verde corporativo: #16B24D
- Rol: color de acento principal. Botones, títulos de sección, indicadores activos, fondos de componentes destacados.
Verde oscuro: #438D2F
- Rol: estado hover del verde principal. Nunca se usa como color base.
Azul corporativo: #386FD5
- Rol: color de acento secundario. Se alterna con el verde, nunca compiten en el mismo elemento.
Gris texto principal: #313B4A
- Rol: color de texto para títulos y cuerpo. Reemplaza al negro puro.
Gris texto secundario: #666666
- Rol: descripciones, texto de menor jerarquía.
Gris superficie: #FAFBFC
- Rol: fondo de secciones o bloques alternos.
Gris borde: #D6D6D6
- Rol: bordes sutiles, separadores.
Blanco: #FFFFFF
- Rol: fondo base, tarjetas.
Regla de opacidad: Los colores corporativos rara vez se usan al 100%. En fondos, decoraciones y blobs se usan al 5–20% de opacidad para dar profundidad sin saturar.
TIPOGRAFÍA
Montserrat — Exclusiva para títulos y encabezados. Sans-serif geométrica.
- ExtraBold (800): títulos principales, títulos de sección.
- Bold (700): títulos de tarjetas o bloques.
- SemiBold (600): subtítulos pequeños sobre fondos oscuros.
Fira Sans — Exclusiva para cuerpo, botones y etiquetas.
- SemiBold (600): botones, navegación, etiquetas destacadas.
- Bold (700): títulos de grupos pequeños (ej. columnas).
- Regular (400): párrafos, descripciones, texto corrido.
Regla: Montserrat solo titula. Fira Sans solo acompaña. Dos pesos activos por familia. Sin excepciones.
ESPACIO
- Padding de bloque / sección: 80px vertical en móvil, 112px en desktop (proporción generosa).
- Separación título↔contenido: 64px.
- Padding de contenedor: 16px móvil → 24px tablet → 32px desktop.
- Padding de tarjeta: 24px–48px según jerarquía.
- Gap entre tarjetas en grid: 24–32px.
- Gap entre ícono y texto en features: 16px.
- Ancho máximo de párrafo introductorio: ~670px, centrado.
FORMA
- Botones: esquinas redondeadas de 24px (bien redondeados, no píldora).
- Tarjetas: esquinas de 16–24px.
- Componentes circulares: círculo perfecto, 96px móvil / 160px desktop.
- Dropdowns / inputs: esquinas de 10–16px.
- Contenedores de sección: esquinas de 32px cuando aplica.
SOMBRAS
Todas las sombras son suaves, sin negro puro, opacidad máxima 0.12:
- Sutil: 0 1px 3px rgba(0,0,0,0.08) — tarjetas pasivas, header.
- Media: 0 4px 12px rgba(0,0,0,0.08) — tarjetas con hover leve, dropdowns.
- Marcada: 0 8px 24px rgba(0,0,0,0.10) — botones CTA, tarjetas destacadas.
- Intensa: 0 12px 36px rgba(0,0,0,0.12) — hover lift de tarjetas.
- Brillo verde: 0 0 40px rgba(22,178,77,0.15) — halo para elementos activos.
MOVIMIENTO
Fade-in-up (entrada por scroll):
- Los elementos aparecen con opacidad 0 → 1 y translateY 30px → 0 al entrar al viewport.
- Duración: 600ms, curva ease-out.
- Elementos hermanos tienen retraso escalonado (stagger): 0.1s, 0.2s, 0.3s, 0.4s.
Hover universal:
- Tarjetas y botones se elevan 4px (translateY: -4px) acompañado de intensificación de sombra.
- Íconos dentro de componentes escalan al 110%.
- Imágenes hacen zoom in suave al 105%.
- Flechas y cursores se desplazan 4px en dirección de lectura.
Animaciones continuas:
- Flotación: desplazamiento vertical suave de 0 a -10px. Ciclo: 4s. Para logos e íconos decorativos.
- Blob: cambio orgánico de forma (border-radius asimétrico rotante). Ciclo: 8s. Para manchas decorativas de fondo.
- Pulso: escala 1 → 1.02 → 1. Ciclo: 3s. Solo en el botón CTA de mayor jerarquía.
Duración de transiciones:
- Interacciones rápidas (hover simple): 200ms.
- Elevaciones y cambios de color: 300ms.
- Carruseles y slides: 500ms.
Curvas de animación: ease-in-out para transiciones, ease-out para entradas.
Regla: ningún cambio de estado es instantáneo. Todo se anima.
DECORACIÓN
Blobs (manchas orgánicas):
- Formas grandes (200–400px), redondeadas asimétricamente.
- Color corporativo al 5–10% de opacidad con desenfoque intenso.
- Animación continua de cambio de forma.
- Posición: esquinas o bordes del bloque.
- Solo en viewports grandes (desktop).
Círculos de borde:
- Solo contorno (1–4px), sin relleno.
- Color corporativo al 10–20% de opacidad. Sobre fondos oscuros: blanco al 10%.
- Tamaños variados (32–192px).
Líneas gradiente:
- Líneas finas (1px) con gradiente horizontal: transparente → color corporativo al 10–20% → transparente.
- Posición: bordes asimétricos de secciones.
Patrón de puntos:
- Puntos de 1px en verde al 4% de opacidad.
- Espaciado: 32px.
- Textura sutil de fondo.
Puntos decorativos:
- Círculos pequeños (2–8px) en color corporativo al 30–50% de opacidad.
- Dispersión asimétrica.
Regla: Toda decoración es asimétrica y de baja opacidad. Nada decorativo compite con el contenido.
FONDOS DE SECCIÓN
Las secciones alternan entre tres tratamientos de fondo:
1. Blanco — Limpio, máxima legibilidad para contenido denso.
2. Gris superficie (#FAFBFC) — Separación sutil entre secciones sin borde explícito.
3. Verde corporativo — Gradiente diagonal verde→verde oscuro. Texto blanco. Para secciones de alto impacto.
Los cambios de sección se marcan con cambio de color de fondo, nunca con líneas separadoras.
OVERLAYS SOBRE IMÁGENES
Cuando una sección tiene imagen de fondo:
- Sobre fondo claro: gradiente vertical blanco (opacidad 90% → 70% → 95%) que "lava" la imagen.
- Sobre tarjeta con imagen: gradiente vertical negro semitransparente en la mitad inferior (50% → 0%) para alojar texto blanco superpuesto.
COMPONENTES — ARQUETIPOS VISUALES
Botón primario (CTA sólido)
- Fondo verde, texto blanco, Fira Sans SemiBold.
- Esquinas 24px, sombra media.
- Ícono de flecha a la derecha.
- Hover: se eleva 4px, sombra intensa, fondo vira a verde oscuro, leve pulso.
Botón secundario (CTA outline)
- Fondo blanco, texto verde, borde verde al 20%.
- Sin ícono.
- Hover: borde se vuelve verde sólido, se eleva, gana sombra.
Tarjeta blanca
- Fondo blanco, esquinas 16–24px, sombra sutil.
- Hover: se eleva 4px, sombra intensa.
- Si contiene imagen: zoom in 105% en hover.
Feature en tarjeta oscura
- Fondo blanco translúcido al 10–15%, esquinas redondeadas, padding moderado.
- Layout: ícono izquierdo (48px) + texto derecho (título + descripción apilados).
- Título: Montserrat SemiBold, blanco.
- Hover: fondo se aclara al 15–20%, ícono escala al 110%.
Tarjeta de producto / descarga
- Fondo blanco, esquinas 24px, sombra marcada.
- Layout vertical: imagen/ícono → etiqueta → selector/acción → botón.
- Dropdowns: borde gris, focus con anillo de brillo verde de 2px.
- Botón: verde sólido, ancho completo dentro de la tarjeta, esquinas 10–16px.
Logo / imagen en grid
- Contenedor blanco, esquinas 16px, sombra muy sutil, padding.
- Imagen centrada, altura máxima ~160px, mantiene proporción.
- Hover: elevación 4px, sombra media, escala 105%.
Chip / tag circular
- Círculo con fondo verde sólido, contenido centrado (ícono + texto).
- Hover: elevación, sombra, el ícono escala.
Navegación de carrusel
- Botones circulares (48px) con borde y flecha.
- Hover: se rellenan de verde, la flecha se vuelve blanca, escala 110%.
- Indicador de posición: dots. Activo = verde, inactivo = gris claro.
PRINCIPIOS RECTORES
1. Opacidad sobre saturación — Los colores fuertes se usan al 5–20% en fondos; al 100% solo en acentos.
2. Animación con propósito — Todo se mueve, nada es gratuito. Cada transición tiene intención funcional.
3. Tipografía binaria — Montserrat títulos, Fira Sans cuerpo. Sin mezcla.
4. Asimetría en decoración — Blobs, líneas, puntos y círculos siempre en posiciones asimétricas, nunca centrados.
5. Separación por fondo — Las secciones se distinguen por cambio de color de fondo, no por bordes ni líneas.
6. Sombra suave — Máximo de opacidad en sombras: 0.12. Sin negros duros.
7. Densidad progresiva — Las secciones van de más aireadas a más densas a medida que se avanza.
8. Feedback inmediato — Todo elemento interactivo responde visualmente en hover (elevación, escala, color).
Este es el lenguaje visual de Comercial Brich. Aplicalo tal cual al catálogo: mismos colores, mismas fuentes, mismos espaciados, mismas formas, mismas animaciones, mismo ADN visual.
