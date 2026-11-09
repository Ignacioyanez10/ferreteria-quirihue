// ===== Promociones dinámicas =====
// Lee las promociones activas desde Firestore (panel de administración) y las muestra en:
//   1) el carrusel principal (#inicio), después de la diapositiva de bienvenida
//   2) la sección "Promociones disponibles" (#promociones)
// Usa la versión "lite" de Firestore (peticiones simples, más liviana y compatible con
// bloqueadores de anuncios). Si algo falla o aún no hay promociones cargadas en el panel,
// se mantienen las promociones escritas en el HTML.
import { firebaseConfig, FIREBASE_SDK, firebaseListo, DATABASE_ID } from './firebase-config.js';

const grilla = document.querySelector('#promociones .promos');
const hero = document.querySelector('.hero');

function crearDiapositiva(promo) {
  const slide = document.createElement('div');
  slide.className = 'slide slide--promo';

  const contenido = document.createElement('div');
  contenido.className = 'slide__content';
  const kicker = document.createElement('p');
  kicker.className = 'slide__kicker';
  kicker.textContent = 'Promoción';
  const titulo = document.createElement('h2');
  titulo.innerHTML = 'Oferta <span>especial</span>';
  const texto = document.createElement('p');
  texto.textContent = promo.descripcion || '';
  const boton = document.createElement('a');
  boton.href = '#promociones';
  boton.className = 'btn btn--red';
  boton.textContent = 'Ver promociones';
  contenido.append(kicker, titulo, texto, boton);

  const media = document.createElement('div');
  media.className = 'slide__media';
  const img = document.createElement('img');
  img.src = promo.imagen;
  img.alt = promo.descripcion || 'Promoción Ferretería Quirihue';
  media.append(img);

  slide.append(contenido, media);
  return slide;
}

function crearTarjeta(promo) {
  const fig = document.createElement('figure');
  fig.className = 'promo';
  const img = document.createElement('img');
  img.src = promo.imagen;
  img.alt = promo.descripcion || 'Promoción Ferretería Quirihue';
  img.loading = 'lazy';
  fig.append(img);
  return fig;
}

async function cargarPromos() {
  if (!firebaseListo) return;
  const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
  const { getFirestore, collection, getDocs } = await import(`${FIREBASE_SDK}/firebase-firestore-lite.js`);

  const db = getFirestore(initializeApp(firebaseConfig, 'promos-web'), DATABASE_ID);
  const snap = await getDocs(collection(db, 'promos'));
  if (snap.empty) return; // todavía no se cargan promociones desde el panel

  const activas = snap.docs.map(d => d.data())
    .filter(p => p.activa === true && typeof p.imagen === 'string' && p.imagen.startsWith('data:image/'))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  // 1) Sección de promociones
  if (grilla) {
    grilla.replaceChildren();
    if (activas.length) {
      activas.forEach(p => grilla.append(crearTarjeta(p)));
    } else {
      const aviso = document.createElement('p');
      aviso.className = 'promos__vacio';
      aviso.textContent = 'Pronto tendremos nuevas promociones. ¡Visítanos o escríbenos por WhatsApp!';
      grilla.append(aviso);
    }
  }

  // 2) Carrusel principal: se deja la primera diapositiva (bienvenida) y se reemplazan las de ofertas
  if (hero) {
    const diapositivas = hero.querySelectorAll('.slide');
    diapositivas.forEach((s, i) => { if (i > 0) s.remove(); });
    const flecha = hero.querySelector('.hero__arrow--prev');
    activas.forEach(p => hero.insertBefore(crearDiapositiva(p), flecha));
    if (typeof window.reiniciarCarrusel === 'function') window.reiniciarCarrusel();
  }
}

cargarPromos().catch(err => console.warn('No se pudieron cargar las promociones:', err));
