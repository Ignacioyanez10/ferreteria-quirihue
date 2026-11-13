// ===== Promociones dinámicas =====
// Lee las promociones activas desde Firestore (panel de administración) y las muestra en:
//   1) el carrusel principal (#inicio), después de la diapositiva de bienvenida
//   2) la sección "Promociones disponibles" (#promociones)
// Mientras se cargan, la sección muestra tarjetas "skeleton" (ver index.html).
// Usa la versión "lite" de Firestore (peticiones simples, más liviana y compatible con
// bloqueadores de anuncios). Si algo falla, tarda demasiado o aún no hay promociones
// cargadas en el panel, se usan las promociones de respaldo (<template> en index.html).
import { firebaseConfig, FIREBASE_SDK, firebaseListo, DATABASE_ID } from './firebase-config.js';

// Si Firebase no responde en este tiempo se muestran las promociones de respaldo
// (si la respuesta llega después, igual se reemplazan por las del panel).
const ESPERA_MAXIMA_MS = 6000;

const grilla = document.querySelector('#promociones .promos');
const hero = document.querySelector('.hero');
const respaldoHero = document.getElementById('hero-respaldo');
const respaldoPromos = document.getElementById('promos-respaldo');

let mostroPanel = false;   // ya se mostraron las promociones de Firestore
let mostroRespaldo = false;

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
  img.decoding = 'async';
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
  img.decoding = 'async';
  img.loading = 'lazy';
  img.src = promo.imagen;
  img.alt = promo.descripcion || 'Promoción Ferretería Quirihue';
  fig.append(img);
  return fig;
}

// Reemplaza las diapositivas de oferta del carrusel (se conserva la de bienvenida)
function ponerDiapositivas(nodos) {
  if (!hero) return;
  hero.querySelectorAll('.slide').forEach((s, i) => { if (i > 0) s.remove(); });
  const flecha = hero.querySelector('.hero__arrow--prev');
  nodos.forEach(n => hero.insertBefore(n, flecha));
  if (typeof window.reiniciarCarrusel === 'function') window.reiniciarCarrusel();
}

function ponerTarjetas(nodos) {
  if (!grilla) return;
  grilla.replaceChildren(...nodos);
  grilla.removeAttribute('aria-busy');
}

function usarRespaldo() {
  if (mostroPanel || mostroRespaldo) return;
  mostroRespaldo = true;
  if (respaldoPromos) ponerTarjetas([...respaldoPromos.content.cloneNode(true).children]);
  if (respaldoHero) ponerDiapositivas([...respaldoHero.content.cloneNode(true).children]);
}

function mostrarPanel(activas) {
  mostroPanel = true;
  if (activas.length) {
    ponerTarjetas(activas.map(crearTarjeta));
  } else {
    const aviso = document.createElement('p');
    aviso.className = 'promos__vacio';
    aviso.textContent = 'Pronto tendremos nuevas promociones. ¡Visítanos o escríbenos por WhatsApp!';
    ponerTarjetas([aviso]);
  }
  ponerDiapositivas(activas.map(crearDiapositiva));
}

async function cargarPromos() {
  if (!firebaseListo) return usarRespaldo();
  const [{ initializeApp }, { getFirestore, collection, query, where, limit, getDocs }] = await Promise.all([
    import(`${FIREBASE_SDK}/firebase-app.js`),
    import(`${FIREBASE_SDK}/firebase-firestore-lite.js`)
  ]);

  const db = getFirestore(initializeApp(firebaseConfig, 'promos-web'), DATABASE_ID);
  const promosRef = collection(db, 'promos');

  // Solo se descargan las promociones activas: las ocultas (con su imagen) no viajan al visitante.
  const snap = await getDocs(query(promosRef, where('activa', '==', true)));

  const activas = snap.docs.map(d => d.data())
    .filter(p => typeof p.imagen === 'string' && p.imagen.startsWith('data:image/'))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  if (!activas.length) {
    // ¿No hay activas o el panel todavía no tiene ninguna promoción?
    const alguna = await getDocs(query(promosRef, limit(1)));
    if (alguna.empty) return usarRespaldo();
  }
  mostrarPanel(activas);
}

const limite = setTimeout(usarRespaldo, ESPERA_MAXIMA_MS);
cargarPromos()
  .catch(err => { console.warn('No se pudieron cargar las promociones:', err); usarRespaldo(); })
  .finally(() => clearTimeout(limite));
