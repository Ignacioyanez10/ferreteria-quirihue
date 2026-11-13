// ===== Skeleton loader de la página =====
// Se oculta cuando el contenido principal está listo: HTML procesado + imagen del carrusel
// + fuentes. Nunca espera más de MAX_SKELETON_MS (mapas, marcas y promociones siguen
// cargando por detrás sin bloquear). Si este archivo no cargara, el CSS lo oculta solo a los 8 s.
const MAX_SKELETON_MS = 2500;
(() => {
  const sk = document.getElementById('page-skeleton');
  if (!sk) return;
  const ocultar = () => {
    if (sk.classList.contains('is-hidden')) return;
    sk.classList.add('is-hidden');
    sk.addEventListener('transitionend', () => sk.remove(), { once: true });
    setTimeout(() => sk.remove(), 600);
  };
  const imgHero = document.querySelector('.hero .slide.is-active img');
  const imagenLista = !imgHero || imgHero.complete ? Promise.resolve()
    : (imgHero.decode ? imgHero.decode() : new Promise(r => imgHero.addEventListener('load', r, { once: true }))).catch(() => {});
  const fuentes = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([
    Promise.all([imagenLista, fuentes]),
    new Promise(r => setTimeout(r, MAX_SKELETON_MS))
  ]).then(() => requestAnimationFrame(ocultar));
})();


// ===== Menú móvil =====
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

// ===== Carrusel principal =====
// Se puede reiniciar con window.reiniciarCarrusel() cuando se agregan diapositivas
// (lo usa js/promos.js para mostrar las promociones del panel de administración).
const heroEl = document.querySelector('.hero');
const dotsBox = document.querySelector('.hero__dots');
let slides = [];
let dots = [];
let current = 0;
let timer;

function goTo(i) {
  if (slides.length < 2) return;
  slides[current].classList.remove('is-active');
  dots[current].classList.remove('is-active');
  current = (i + slides.length) % slides.length;
  slides[current].classList.add('is-active');
  dots[current].classList.add('is-active');
}
function restart() {
  clearInterval(timer);
  // Avance automático cada 6 s (se pausa solo mientras la pestaña está en segundo plano)
  if (slides.length < 2 || document.hidden) return;
  timer = setInterval(() => goTo(current + 1), 6000);
}
document.addEventListener('visibilitychange', restart);
function initCarrusel() {
  slides = [...document.querySelectorAll('.hero .slide')];
  dotsBox.replaceChildren();
  slides.forEach((slide, i) => {
    slide.classList.toggle('is-active', i === 0);
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
    dot.addEventListener('click', () => { goTo(i); restart(); });
    dotsBox.appendChild(dot);
  });
  dots = [...dotsBox.children];
  heroEl.dataset.slides = slides.length;
  current = 0;
  dots[0].classList.add('is-active');
  restart();
}
document.querySelector('.hero__arrow--prev').addEventListener('click', () => { goTo(current - 1); restart(); });
document.querySelector('.hero__arrow--next').addEventListener('click', () => { goTo(current + 1); restart(); });
initCarrusel();
window.reiniciarCarrusel = initCarrusel;

// ===== Carrusel de "Promociones disponibles" (deslizable + botones + puntos) =====
(() => {
  const carrusel = document.querySelector('.promos-carousel');
  if (!carrusel) return;
  const pista = carrusel.querySelector('.promos');
  const prev = carrusel.querySelector('.promos-carousel__btn--prev');
  const next = carrusel.querySelector('.promos-carousel__btn--next');
  const puntos = carrusel.querySelector('.promos-carousel__dots');

  const tarjetas = () => [...pista.querySelectorAll('.promo')];
  const paso = () => {
    const t = tarjetas();
    return t.length > 1 ? t[1].offsetLeft - t[0].offsetLeft : pista.clientWidth;
  };
  const paginas = () => {
    const t = tarjetas();
    if (!t.length) return 0;
    const visibles = Math.max(1, Math.round(pista.clientWidth / paso()));
    return Math.max(1, t.length - visibles + 1);
  };

  // Fondo difuminado para imágenes que no son cuadradas (rellena la tarjeta sin recortar la imagen)
  function ponerFondos() {
    tarjetas().forEach(f => {
      const img = f.querySelector('img:not(.promo__fondo)');
      if (!img || f.querySelector('.promo__fondo')) return;
      const fondo = img.cloneNode();
      fondo.className = 'promo__fondo';
      fondo.alt = '';
      fondo.setAttribute('aria-hidden', 'true');
      f.prepend(fondo);
    });
  }

  function actualizar() {
    const max = pista.scrollWidth - pista.clientWidth - 2;
    prev.disabled = pista.scrollLeft <= 2;
    next.disabled = pista.scrollLeft >= max;
    const total = paginas();
    if (puntos.children.length !== total) {
      puntos.replaceChildren(...Array.from({ length: total }, (_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1;
        b.addEventListener('click', () => irA(i));
        return b;
      }));
    }
    const actual = Math.min(total - 1, Math.round(pista.scrollLeft / paso()));
    [...puntos.children].forEach((b, i) => b.classList.toggle('is-active', i === actual));
    puntos.hidden = total <= 1;
  }

  // Los botones avanzan exactamente una tarjeta (se calcula la tarjeta de destino en vez de
  // desplazar "un poco", porque algunos celulares se pasaban de largo hasta la última)
  const indiceActual = () => Math.round(pista.scrollLeft / paso());
  function irA(indice) {
    const t = tarjetas();
    if (!t.length) return;
    const destino = Math.max(0, Math.min(indice, t.length - 1));
    pista.scrollTo({ left: t[destino].offsetLeft - t[0].offsetLeft, behavior: 'smooth' });
  }
  prev.addEventListener('click', () => irA(indiceActual() - 1));
  next.addEventListener('click', () => irA(indiceActual() + 1));
  pista.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
  let resizePendiente = false;
  window.addEventListener('resize', () => {
    if (resizePendiente) return;
    resizePendiente = true;
    requestAnimationFrame(() => { resizePendiente = false; actualizar(); });
  }, { passive: true });
  // Se actualiza cuando js/promos.js carga las promociones del panel o cuando cargan las imágenes
  new MutationObserver(() => { pista.scrollLeft = 0; ponerFondos(); actualizar(); }).observe(pista, { childList: true });
  pista.addEventListener('load', actualizar, true);
  ponerFondos();
  actualizar();
})();

// ===== Cinta de marcas: duplicar logos para que el desplazamiento sea continuo =====
// (se clonan los nodos en vez de usar innerHTML +=, así no se vuelve a procesar todo el HTML)
const track = document.querySelector('.brands__track');
{
  const copia = document.createDocumentFragment();
  track.querySelectorAll('.brand').forEach(b => {
    const c = b.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    copia.append(c);
  });
  track.append(copia);
}

// ===== Pestañas de sucursales =====
document.querySelectorAll('.branch-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.branch-tab').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll('.branch').forEach(b => b.classList.remove('is-active'));
    tab.classList.add('is-active');
    document.getElementById(`branch-${tab.dataset.branch}`).classList.add('is-active');
  });
});

// ===== Resaltar enlace activo del menú según la sección visible =====
const links = nav.querySelectorAll('a');
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach(s => observer.observe(s));

// ===== Formulario de cotización -> WhatsApp o Correo (el cliente elige) =====
// Número de WhatsApp que recibe las cotizaciones (código de país + número, sin + ni espacios)
const WHATSAPP_NUMBER = '56962044623';

// Correo que recibe las cotizaciones (se envía mediante el servicio gratuito FormSubmit.co)
const EMAIL_DESTINO = 'ignacioyz.perez@gmail.com';

// Asunto del correo que recibes. {nombre} y {sucursal} se reemplazan con los datos del cliente.
const EMAIL_ASUNTO = 'Nueva cotización de {nombre} - Sucursal {sucursal} | Ferretería Quirihue';

// Diseño del correo que recibes: 'box' (recuadros), 'table' (tabla) o 'basic' (texto simple)
const EMAIL_DISENO = 'box';

// Respuesta automática que recibe el cliente en su correo al enviar la cotización
// ({nombre} se reemplaza por su nombre). Deja '' para no enviar respuesta automática.
const RESPUESTA_AUTOMATICA =
`Hola {nombre}, gracias por escribirnos.

Recibimos tu solicitud de cotización en Ferretería Quirihue. La revisaremos y te responderemos a este correo a la brevedad.

Si necesitas una respuesta más rápida, escríbenos por WhatsApp al +56 9 6204 4623.

Saludos,
Ferretería Quirihue - construyendo junto a usted`;

// Plantilla del mensaje (se usa para WhatsApp y para el correo). Puedes editar el texto;
// {nombre}, {correo}, {telefono}, {sucursal} y {mensaje} se reemplazan con lo que escribe el cliente.
const MENSAJE_TEMPLATE =
`Hola, quiero solicitar una cotización.

*Nombre:* {nombre}
*Correo:* {correo}
*Teléfono:* {telefono}
*Sucursal:* {sucursal}

*Productos que necesito:*
{mensaje}`;

const quoteForm = document.getElementById('contact-form');
const quoteBtn = document.getElementById('quote-submit');
const quoteStatus = quoteForm.querySelector('.form__status');
const BTN_TEXT = {
  whatsapp: '<i class="fa-brands fa-whatsapp"></i> Enviar cotización por WhatsApp',
  correo: '<i class="fa-solid fa-envelope"></i> Enviar cotización por correo'
};
// Duración del mensaje de confirmación y del pop-up (milisegundos)
const DURACION_CONFIRMACION = 5000;

let statusTimer;
const setStatus = (txt, error = false, autoBorrar = false) => {
  clearTimeout(statusTimer);
  quoteStatus.textContent = txt;
  quoteStatus.classList.toggle('is-error', error);
  if (autoBorrar) statusTimer = setTimeout(() => { quoteStatus.textContent = ''; }, DURACION_CONFIRMACION);
};

// Arma el correo que se envía con FormSubmit (el orden de los campos es el orden en que aparecen en el correo)
const rellenar = (plantilla, datos) => plantilla.replace(/\{(\w+)\}/g, (_, k) => datos[k] ?? '');
const cuerpoCorreo = datos => {
  const ahora = new Date().toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' });
  const cuerpo = {
    _subject: rellenar(EMAIL_ASUNTO, datos),
    _template: EMAIL_DISENO,
    _replyto: datos.correo,
    'Cliente': datos.nombre,
    'Teléfono': datos.telefono,
    'email': datos.correo,
    'Sucursal': datos.sucursal,
    'Mensaje': datos.mensaje,
    'Fecha de la solicitud': ahora
  };
  if (RESPUESTA_AUTOMATICA) cuerpo._autoresponse = rellenar(RESPUESTA_AUTOMATICA, datos);
  return cuerpo;
};

// Pop-up de confirmación (se cierra solo a los 5 segundos o con la X / clic fuera / Esc)
const popup = document.getElementById('quote-popup');
let popupTimer;
const cerrarPopup = () => { clearTimeout(popupTimer); popup.classList.remove('is-open'); popup.hidden = true; };
const mostrarPopup = (titulo, texto) => {
  popup.querySelector('#quote-popup-title').textContent = titulo;
  popup.querySelector('#quote-popup-text').textContent = texto;
  popup.style.setProperty('--toast-ms', `${DURACION_CONFIRMACION}ms`);
  popup.hidden = false;
  popup.classList.remove('is-open'); void popup.offsetWidth; popup.classList.add('is-open');
  popup.querySelector('.toast-modal__close').focus();
  clearTimeout(popupTimer);
  popupTimer = setTimeout(cerrarPopup, DURACION_CONFIRMACION);
};
popup.querySelector('.toast-modal__close').addEventListener('click', cerrarPopup);
popup.addEventListener('click', e => { if (e.target === popup) cerrarPopup(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup.hidden) cerrarPopup(); });

quoteForm.querySelectorAll('input[name="via"]').forEach(r =>
  r.addEventListener('change', () => { quoteBtn.innerHTML = BTN_TEXT[quoteForm.via.value]; setStatus(''); })
);

quoteForm.addEventListener('submit', async e => {
  e.preventDefault();
  const f = quoteForm;
  const datos = {
    nombre: f.nombre.value.trim(),
    correo: f.email.value.trim(),
    telefono: f.telefono.value.trim() || 'No indicado',
    sucursal: f.sucursal.value,
    mensaje: f.mensaje.value.trim()
  };
  const texto = MENSAJE_TEMPLATE.replace(/\{(\w+)\}/g, (_, k) => datos[k] ?? '');

  if (f.via.value === 'whatsapp') {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    setStatus('Te estamos redirigiendo a WhatsApp para enviar tu cotización…', false, true);
    f.reset();
    quoteBtn.innerHTML = BTN_TEXT.whatsapp;
    return;
  }

  // Envío por correo
  quoteBtn.disabled = true;
  setStatus('Enviando tu cotización…');
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${EMAIL_DESTINO}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(cuerpoCorreo(datos))
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) === 'false') throw new Error(json.message || res.status);
    setStatus('¡Gracias! Recibimos tu cotización y te responderemos a tu correo pronto.', false, true);
    mostrarPopup('¡Cotización enviada!', `Gracias ${datos.nombre}, recibimos tu cotización y te responderemos a ${datos.correo} a la brevedad.`);
    f.reset();
    quoteBtn.innerHTML = BTN_TEXT.whatsapp;
  } catch (err) {
    console.error('Error al enviar cotización:', err);
    setStatus('No pudimos enviar el correo. Intenta de nuevo o envíala por WhatsApp.', true);
  } finally {
    quoteBtn.disabled = false;
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
