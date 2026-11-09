// ===== Menú móvil =====
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

// ===== Carrusel principal =====
const slides = document.querySelectorAll('.slide');
const dotsBox = document.querySelector('.hero__dots');
let current = 0;
let timer;

slides.forEach((_, i) => {
  const dot = document.createElement('button');
  dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
  dot.addEventListener('click', () => { goTo(i); restart(); });
  dotsBox.appendChild(dot);
});
const dots = dotsBox.querySelectorAll('button');

function goTo(i) {
  slides[current].classList.remove('is-active');
  dots[current].classList.remove('is-active');
  current = (i + slides.length) % slides.length;
  slides[current].classList.add('is-active');
  dots[current].classList.add('is-active');
}
function restart() {
  clearInterval(timer);
  timer = setInterval(() => goTo(current + 1), 6000);
}
document.querySelector('.hero__arrow--prev').addEventListener('click', () => { goTo(current - 1); restart(); });
document.querySelector('.hero__arrow--next').addEventListener('click', () => { goTo(current + 1); restart(); });
dots[0].classList.add('is-active');
restart();

// ===== Cinta de marcas: duplicar logos para que el desplazamiento sea continuo =====
const track = document.querySelector('.brands__track');
track.innerHTML += track.innerHTML;
track.querySelectorAll('img').forEach((img, i, all) => {
  if (i >= all.length / 2) img.setAttribute('aria-hidden', 'true');
});

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
