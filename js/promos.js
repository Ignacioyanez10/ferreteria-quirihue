// ===== Promociones dinámicas =====
// Lee las promociones activas desde Firestore y las muestra en la sección #promociones.
// Si Firebase no está configurado, no hay conexión o aún no hay promociones cargadas,
// se mantienen las promociones escritas en el HTML.
import { firebaseConfig, FIREBASE_SDK, firebaseListo } from './firebase-config.js';

const contenedor = document.querySelector('#promociones .promos');

async function cargarPromos() {
  if (!firebaseListo || !contenedor) return;
  const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
  const { getFirestore, collection, getDocs, query, orderBy } = await import(`${FIREBASE_SDK}/firebase-firestore.js`);

  const db = getFirestore(initializeApp(firebaseConfig));
  const snap = await getDocs(query(collection(db, 'promos'), orderBy('orden')));
  if (snap.empty) return; // todavía no se cargan promociones desde el panel

  const activas = snap.docs.map(d => d.data())
    .filter(p => p.activa && typeof p.imagen === 'string' && p.imagen.startsWith('data:image/'));

  contenedor.replaceChildren();
  if (!activas.length) {
    const p = document.createElement('p');
    p.className = 'promos__vacio';
    p.textContent = 'Pronto tendremos nuevas promociones. ¡Visítanos o escríbenos por WhatsApp!';
    contenedor.append(p);
    return;
  }
  for (const promo of activas) {
    const fig = document.createElement('figure');
    fig.className = 'promo';
    const img = document.createElement('img');
    img.src = promo.imagen;
    img.alt = promo.descripcion || 'Promoción Ferretería Quirihue';
    img.loading = 'lazy';
    fig.append(img);
    contenedor.append(fig);
  }
}

cargarPromos().catch(err => console.warn('No se pudieron cargar las promociones:', err));
