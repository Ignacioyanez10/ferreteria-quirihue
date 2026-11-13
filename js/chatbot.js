// =========================================================
// Asistente virtual de Ferretería Quirihue (preguntas frecuentes)
// Funciona 100 % en el navegador: no necesita servidor ni tiene costo.
// Responde horarios, sucursales, cómo cotizar, categorías y promociones.
// Lo que no sabe (precios, stock, despacho, medios de pago…) lo deriva a
// WhatsApp con la consulta del cliente ya escrita.
//
// >>> Para cambiar respuestas, edita solo el bloque DATOS de abajo. <<<
// =========================================================
(() => {
  const DATOS = {
    nombreBot: 'Asistente Ferretería Quirihue',
    whatsapp: '56962044623',             // código de país + número, sin + ni espacios
    whatsappVisible: '+56 9 6204 4623',

    // Horario por día de la semana (0 = domingo … 6 = sábado). null = cerrado.
    // IMPORTANTE: confirmar con el cliente (en la web todavía aparecen como provisorios).
    horario: {
      0: null,
      1: ['09:00', '19:00'], 2: ['09:00', '19:00'], 3: ['09:00', '19:00'],
      4: ['09:00', '19:00'], 5: ['09:00', '19:00'],
      6: ['09:00', '14:00']
    },
    horarioTexto: 'Lunes a viernes: 9:00 a 19:00\nSábados: 9:00 a 14:00\nDomingos: cerrado',

    sucursales: [
      {
        clave: 'quirihue',
        nombre: 'Casa Matriz · Quirihue',
        direccion: 'José Joaquín Pérez 429, Quirihue',
        mapa: 'https://www.google.com/maps/search/?api=1&query=Jos%C3%A9+Joaqu%C3%ADn+P%C3%A9rez+429+Quirihue+Chile'
      },
      {
        clave: 'chillan',
        nombre: 'Sucursal · Chillán',
        direccion: 'Sargento Aldea 913, Chillán (cerca del mercado y del terminal La Merced)',
        mapa: 'https://www.google.com/maps/search/?api=1&query=Sargento+Aldea+913+Chill%C3%A1n+Chile'
      }
    ],

    categorias: [
      'Herramientas manuales', 'Herramientas eléctricas', 'Pinturas y accesorios',
      'Materiales de construcción', 'Gasfitería y baño', 'Electricidad',
      'Adhesivos y selladores', 'Fijaciones'
    ],

    // Segundos antes de mostrar el globito "¿Necesitas ayuda?" (0 = nunca)
    saludoTrasSegundos: 10
  };

  // ---------- Utilidades ----------
  const ZONA = 'America/Santiago';
  const normalizar = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const contiene = (t, palabras) => palabras.some(p => t.includes(p));
  const enlaceWsp = texto => `https://wa.me/${DATOS.whatsapp}?text=${encodeURIComponent(texto)}`;
  const aMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  function ahoraEnChile() {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[partes.weekday], minutos: Number(partes.hour) * 60 + Number(partes.minute) };
  }

  function estadoAtencion() {
    const { dia, minutos } = ahoraEnChile();
    const hoy = DATOS.horario[dia];
    if (hoy && minutos >= aMin(hoy[0]) && minutos < aMin(hoy[1])) {
      return { abierto: true, texto: `Ahora estamos **abiertos** (hoy hasta las ${hoy[1]}).` };
    }
    // Próxima apertura
    for (let i = 0; i < 7; i++) {
      const d = (dia + i) % 7;
      const h = DATOS.horario[d];
      if (!h || (i === 0 && minutos >= aMin(h[0]))) continue;
      const cuando = i === 0 ? 'hoy' : i === 1 ? 'mañana' : ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'][d];
      return { abierto: false, texto: `En este momento estamos **cerrados**. Abrimos ${cuando} a las ${h[0]}.` };
    }
    return { abierto: false, texto: 'En este momento estamos **cerrados**.' };
  }

  // ---------- Botones reutilizables ----------
  const BTN = {
    vendedor: (consulta) => ({
      texto: 'Hablar con un vendedor', icono: 'fa-brands fa-whatsapp', wsp: true,
      href: enlaceWsp(consulta
        ? `Hola, vengo de la página web. Mi consulta es: ${consulta}`
        : 'Hola, vengo de la página web y necesito ayuda.')
    }),
    horarios: { texto: 'Horarios', icono: 'fa-solid fa-clock', enviar: 'Horarios' },
    sucursales: { texto: 'Sucursales', icono: 'fa-solid fa-location-dot', enviar: 'Dónde están' },
    cotizar: { texto: 'Cotizar', icono: 'fa-solid fa-tags', enviar: 'Quiero cotizar' },
    promos: { texto: 'Promociones', icono: 'fa-solid fa-store', enviar: 'Promociones' },
    categorias: { texto: '¿Qué venden?', icono: 'fa-solid fa-hammer', enviar: '¿Qué productos venden?' },
    formulario: { texto: 'Usar el formulario', icono: 'fa-regular fa-envelope', ir: '#contacto' }
  };
  const MENU = [BTN.horarios, BTN.sucursales, BTN.cotizar, BTN.promos, BTN.categorias];

  // ---------- Intenciones (se revisan en este orden) ----------
  // Cada una recibe el texto normalizado y el original, y devuelve { texto, acciones } o null.
  const INTENCIONES = [
    { // Temas que el bot NO puede confirmar: se derivan a un vendedor
      si: t => contiene(t, ['despacho', 'despachan', 'envio', 'envian', 'domicilio', 'reparto', 'flete', 'delivery',
        'pago', 'pagar', 'tarjeta', 'transferencia', 'efectivo', 'credito', 'debito', 'cuotas', 'factura', 'boleta',
        'garantia', 'devolucion', 'cambio', 'feriado', 'arriendo', 'arrienda', 'trabajo', 'empleo', 'curriculum']),
      responder: (t, original) => ({
        texto: 'Esa consulta prefiero que te la confirme directamente un vendedor, así te damos la información correcta y actualizada. Te dejo el mensaje listo para WhatsApp:',
        acciones: [BTN.vendedor(original), BTN.formulario]
      })
    },
    { // Precios, stock, cotizaciones
      si: t => contiene(t, ['precio', 'cuanto', 'cuesta', 'vale ', 'valor', 'cotiz', 'presupuesto', 'stock', 'disponib', 'quedan']),
      responder: (t, original) => {
        const esCotizar = contiene(t, ['cotiz', 'presupuesto']) && t.trim().split(' ').length <= 4;
        return {
          texto: esCotizar
            ? 'Puedes cotizar de dos formas:\n• **Por WhatsApp:** nos escribes la lista de productos y te respondemos.\n• **Con el formulario** de la página, eligiendo si te contestamos por WhatsApp o por correo.'
            : 'Los precios y el stock cambian seguido, así que un vendedor te los confirma al momento. Te dejo tu consulta lista para enviarla por WhatsApp:',
          acciones: [BTN.vendedor(esCotizar ? '' : original), BTN.formulario]
        };
      }
    },
    { // Promociones (se leen de la propia página, así siempre coinciden con el panel)
      si: t => contiene(t, ['promo', 'oferta', 'descuento', 'liquidacion', 'rebaja']),
      responder: () => {
        const promos = [...document.querySelectorAll('#promociones .promo:not(.promo--skeleton) img:not(.promo__fondo)')]
          .map(img => img.alt).filter(Boolean).slice(0, 5);
        return {
          texto: promos.length
            ? `Estas son nuestras promociones vigentes:\n${promos.map(p => `• ${p}`).join('\n')}`
            : 'En este momento estamos preparando nuevas promociones. ¡Escríbenos y te contamos las ofertas del día!',
          acciones: [{ texto: 'Ver promociones', icono: 'fa-solid fa-tags', ir: '#promociones' }, BTN.vendedor('Quiero información sobre las promociones')]
        };
      }
    },
    { // Horarios / ¿están abiertos?
      si: t => contiene(t, ['horario', 'hora', 'abren', 'abierto', 'abre ', 'cierran', 'cerrado', 'cierra', 'atienden', 'atencion', 'domingo', 'sabado', 'hoy']),
      responder: () => ({
        texto: `${estadoAtencion().texto}\n\n**Horario de atención** (ambas sucursales):\n${DATOS.horarioTexto}`,
        acciones: [BTN.sucursales, BTN.vendedor()]
      })
    },
    { // Sucursales / direcciones
      si: t => contiene(t, ['donde', 'direccion', 'ubica', 'sucursal', 'local', 'tienda', 'llegar', 'mapa', 'quirihue', 'chillan', 'calle']),
      responder: t => {
        const filtro = DATOS.sucursales.filter(s => t.includes(s.clave));
        const lista = filtro.length ? filtro : DATOS.sucursales;
        return {
          texto: (lista.length > 1 ? 'Tenemos **2 sucursales** en Ñuble:\n' : '') +
            lista.map(s => `📍 **${s.nombre}**\n${s.direccion}`).join('\n\n'),
          acciones: [
            ...lista.map(s => ({ texto: `Cómo llegar (${s.clave === 'chillan' ? 'Chillán' : 'Quirihue'})`, icono: 'fa-solid fa-diamond-turn-right', href: s.mapa })),
            BTN.horarios
          ]
        };
      }
    },
    { // Categorías / qué venden
      si: t => contiene(t, ['producto', 'catalogo', 'categoria', 'que venden', 'venden', 'herramienta', 'pintura', 'material', 'marca']),
      responder: () => ({
        texto: `Trabajamos con:\n${DATOS.categorias.map(c => `• ${c}`).join('\n')}\n\nSi buscas algo en particular, escríbeme qué necesitas y te conecto con un vendedor.`,
        acciones: [{ texto: 'Ver catálogo', icono: 'fa-solid fa-store', ir: '#catalogo' }, BTN.cotizar]
      })
    },
    { // Contacto / teléfono
      si: t => contiene(t, ['contacto', 'telefono', 'numero', 'whatsapp', 'wsp', 'llamar', 'correo', 'mail', 'vendedor', 'persona', 'humano', 'ejecutivo']),
      responder: () => ({
        texto: `Puedes hablar con nosotros por WhatsApp al **${DATOS.whatsappVisible}** o usar el formulario de contacto de la página.`,
        acciones: [BTN.vendedor(), BTN.formulario]
      })
    },
    { // Quiénes son
      si: t => contiene(t, ['quienes', 'historia', 'desde cuando', 'empresa', 'familia', 'fundad']),
      responder: () => ({
        texto: 'Somos una empresa familiar fundada en **Quirihue en 1978**. En 1993 abrimos nuestra sucursal en **Chillán**. Nos enfocamos en atención cercana y buenos precios.',
        acciones: [{ texto: 'Quiénes somos', icono: 'fa-solid fa-store', ir: '#quienes-somos' }, ...MENU.slice(0, 2)]
      })
    },
    { // "¿Tienen cemento?", "necesito tornillos": consulta por un producto puntual
      si: t => contiene(t, ['tienen ', 'tiene ', 'hay ', 'venden ', 'comprar', 'necesito', 'busco', 'quiero ']),
      responder: (t, original) => ({
        texto: 'Para confirmarte si lo tenemos y a qué precio, te atiende un vendedor. Te dejo tu consulta lista para WhatsApp:',
        acciones: [BTN.vendedor(original), BTN.formulario]
      })
    },
    { // Saludo simple
      si: t => /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|alo|hey|que tal)( .*)?$/.test(t.trim()) && t.trim().split(' ').length <= 4,
      responder: () => ({
        texto: '¡Hola! 👋 ¿En qué te puedo ayudar?',
        acciones: MENU
      })
    },
    { // Agradecimiento / despedida
      si: t => contiene(t, ['gracias', 'chao', 'adios', 'hasta luego', 'muy amable', 'perfecto', 'excelente']) && t.trim().split(' ').length <= 6,
      responder: () => ({
        texto: '¡De nada! Gracias por preferir Ferretería Quirihue, construyendo junto a usted. 🧱',
        acciones: [BTN.vendedor()]
      })
    },
  ];

  function responder(original) {
    const t = normalizar(original) + ' '; // espacio final para comparar palabras completas
    for (const intencion of INTENCIONES) {
      if (intencion.si(t)) return intencion.responder(t, original);
    }
    // Si escribió algo largo que no entendimos, probablemente es una consulta por un producto
    return {
      texto: t.trim().split(' ').length >= 3
        ? 'No estoy seguro de poder responder eso, pero un vendedor sí. Te dejo tu consulta lista para WhatsApp:'
        : 'Disculpa, no te entendí bien. Puedo ayudarte con estas consultas:',
      acciones: t.trim().split(' ').length >= 3 ? [BTN.vendedor(original), ...MENU.slice(0, 3)] : [...MENU, BTN.vendedor()]
    };
  }

  // ---------- Interfaz ----------
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memoria = {
    leer(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    guardar(k, v) { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }
  };

  const lanzador = document.createElement('button');
  lanzador.type = 'button';
  lanzador.className = 'chatbot-lanzador';
  lanzador.setAttribute('aria-label', 'Abrir asistente virtual');
  lanzador.setAttribute('aria-expanded', 'false');
  lanzador.setAttribute('aria-controls', 'chatbot');
  lanzador.innerHTML = '<i class="fa-solid fa-comments" aria-hidden="true"></i><i class="fa-solid fa-xmark" aria-hidden="true"></i><span class="chatbot-lanzador__aviso" aria-hidden="true"></span>';

  const ventana = document.createElement('section');
  ventana.className = 'chatbot';
  ventana.id = 'chatbot';
  ventana.hidden = true;
  ventana.setAttribute('role', 'dialog');
  ventana.setAttribute('aria-label', DATOS.nombreBot);
  ventana.innerHTML = `
    <header class="chatbot__cabecera">
      <span class="chatbot__avatar" aria-hidden="true"><i class="fa-solid fa-headset"></i></span>
      <div class="chatbot__titulo"><strong></strong><span></span></div>
      <button type="button" class="chatbot__cerrar" aria-label="Cerrar asistente"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </header>
    <div class="chatbot__mensajes" role="log" aria-live="polite" aria-relevant="additions"></div>
    <form class="chatbot__form" autocomplete="off">
      <label class="sr-only" for="chatbot-input">Escribe tu consulta</label>
      <input id="chatbot-input" type="text" maxlength="300" placeholder="Escribe tu consulta…">
      <button type="submit" aria-label="Enviar"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
    </form>
    <p class="chatbot__nota">Asistente automático · Para precios y stock te atiende un vendedor</p>`;
  ventana.querySelector('.chatbot__titulo strong').textContent = DATOS.nombreBot;

  const caja = ventana.querySelector('.chatbot__mensajes');
  const form = ventana.querySelector('.chatbot__form');
  const input = ventana.querySelector('#chatbot-input');
  const estadoEl = ventana.querySelector('.chatbot__titulo span');

  document.body.append(ventana, lanzador);
  document.documentElement.classList.add('chat-listo');

  // Convierte **negrita** en <strong> sin usar innerHTML con texto del usuario
  function textoConFormato(el, texto) {
    texto.split(/(\*\*[^*]+\*\*)/).forEach(parte => {
      if (parte.startsWith('**') && parte.endsWith('**')) {
        const b = document.createElement('strong');
        b.textContent = parte.slice(2, -2);
        el.append(b);
      } else if (parte) {
        el.append(parte);
      }
    });
  }

  const historial = [];
  function guardarHistorial() { memoria.guardar('fq-chat', JSON.stringify(historial.slice(-30))); }

  function agregarMensaje(quien, texto, acciones = [], guardar = true) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${quien}`;
    textoConFormato(msg, texto);
    caja.append(msg);
    if (acciones.length) caja.append(crearAcciones(acciones));
    caja.scrollTop = caja.scrollHeight;
    if (guardar) { historial.push({ quien, texto, acciones }); guardarHistorial(); }
  }

  function crearAcciones(acciones) {
    const fila = document.createElement('div');
    fila.className = 'chat-acciones';
    acciones.forEach(a => {
      const el = document.createElement(a.href ? 'a' : 'button');
      el.className = `chat-accion${a.wsp ? ' chat-accion--wsp' : ''}`;
      if (a.href) { el.href = a.href; el.target = '_blank'; el.rel = 'noopener'; }
      else el.type = 'button';
      if (a.icono) {
        const i = document.createElement('i');
        i.className = a.icono;
        i.setAttribute('aria-hidden', 'true');
        el.append(i);
      }
      el.append(a.texto);
      el.addEventListener('click', () => {
        if (a.enviar) enviar(a.enviar);
        if (a.ir) { cerrar(); document.querySelector(a.ir)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' }); }
      });
      fila.append(el);
    });
    return fila;
  }

  let ocupado = false;
  function enviar(texto) {
    texto = texto.trim();
    if (!texto || ocupado) return;
    ocupado = true;
    agregarMensaje('usuario', texto);
    const escribiendo = document.createElement('div');
    escribiendo.className = 'chat-msg chat-msg--bot chat-escribiendo';
    escribiendo.setAttribute('aria-label', 'El asistente está escribiendo');
    escribiendo.innerHTML = '<i></i><i></i><i></i>';
    caja.append(escribiendo);
    caja.scrollTop = caja.scrollHeight;
    setTimeout(() => {
      escribiendo.remove();
      const r = responder(texto);
      agregarMensaje('bot', r.texto, r.acciones || []);
      ocupado = false;
    }, reducir ? 150 : 550 + Math.min(texto.length * 8, 500));
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    enviar(input.value);
    input.value = '';
  });

  function actualizarEstado() {
    const { abierto } = estadoAtencion();
    estadoEl.textContent = abierto ? 'En línea · Tienda abierta' : 'En línea · Tienda cerrada ahora';
    estadoEl.classList.toggle('is-cerrado', !abierto);
  }

  let iniciado = false;
  function abrir() {
    quitarSaludo();
    memoria.guardar('fq-chat-visto', '1');
    actualizarEstado();
    ventana.hidden = false;
    document.documentElement.classList.add('chatbot-abierto');
    lanzador.setAttribute('aria-expanded', 'true');
    lanzador.setAttribute('aria-label', 'Cerrar asistente virtual');
    if (!iniciado) {
      iniciado = true;
      if (!historial.length) {
        agregarMensaje('bot', `¡Hola! Soy el asistente virtual de Ferretería Quirihue. 🔧\n${estadoAtencion().texto}\n\n¿En qué te puedo ayudar?`, [...MENU, BTN.vendedor()]);
      }
    }
    caja.scrollTop = caja.scrollHeight;
    // En celular no se abre el teclado automáticamente (taparía las respuestas)
    if (window.matchMedia('(min-width: 640px)').matches) input.focus();
  }
  function cerrar() {
    ventana.hidden = true;
    document.documentElement.classList.remove('chatbot-abierto');
    lanzador.setAttribute('aria-expanded', 'false');
    lanzador.setAttribute('aria-label', 'Abrir asistente virtual');
  }

  lanzador.addEventListener('click', () => (ventana.hidden ? abrir() : (cerrar(), lanzador.focus())));
  ventana.querySelector('.chatbot__cerrar').addEventListener('click', () => { cerrar(); lanzador.focus(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !ventana.hidden) { cerrar(); lanzador.focus(); }
  });

  // Restaurar la conversación si el cliente navega o recarga la página en la misma visita
  try {
    const previo = JSON.parse(memoria.leer('fq-chat') || '[]');
    if (Array.isArray(previo)) previo.forEach(m => { historial.push(m); agregarMensaje(m.quien, m.texto, m.acciones || [], false); });
  } catch { /* conversación previa ilegible: se ignora */ }

  // Globito de bienvenida, una sola vez por visita
  let saludo;
  function quitarSaludo() { saludo?.remove(); saludo = null; }
  if (DATOS.saludoTrasSegundos > 0 && !memoria.leer('fq-chat-visto')) {
    setTimeout(() => {
      if (!ventana.hidden || memoria.leer('fq-chat-visto')) return;
      saludo = document.createElement('div');
      saludo.className = 'chatbot-saludo';
      saludo.innerHTML = '¿Necesitas ayuda? 👋<br>Pregúntame por horarios, sucursales o cotizaciones.<button type="button" aria-label="Cerrar mensaje">&times;</button>';
      saludo.addEventListener('click', e => {
        if (e.target.closest('button')) { memoria.guardar('fq-chat-visto', '1'); quitarSaludo(); }
        else abrir();
      });
      document.body.append(saludo);
    }, DATOS.saludoTrasSegundos * 1000);
  }
})();
