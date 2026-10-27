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

// ===== Formulario de contacto (sin backend aún) =====
// TODO: conectar con un servicio de envío (PHP, Formspree, EmailJS, etc.)
document.getElementById('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  e.target.querySelector('.form__status').textContent = '¡Gracias! Hemos recibido tu mensaje y te contactaremos pronto.';
  e.target.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
