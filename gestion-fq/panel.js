// ===== Panel de administración de promociones =====
import { firebaseConfig, FIREBASE_SDK, firebaseListo, DATABASE_ID } from '../js/firebase-config.js';

const $ = sel => document.querySelector(sel);
const msg = (el, texto, tipo = '') => { el.textContent = texto; el.className = `msg ${tipo}`; };

if (!firebaseListo) {
  $('#msg-config').hidden = false;
  throw new Error('Firebase no configurado');
}

const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
const {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, setPersistence, browserSessionPersistence
} = await import(`${FIREBASE_SDK}/firebase-auth.js`);
const {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, writeBatch, serverTimestamp
} = await import(`${FIREBASE_SDK}/firebase-firestore.js`);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'es';
const db = getFirestore(app, DATABASE_ID);
const promosRef = collection(db, 'promos');

// La sesión se cierra al cerrar la pestaña del navegador
await setPersistence(auth, browserSessionPersistence);

// ---------- Mensajes de error en español ----------
const ERRORES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/operation-not-allowed': 'El inicio de sesión con correo y contraseña no está habilitado en Firebase (Authentication > Método de acceso).',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'permission-denied': 'Esta cuenta no tiene permiso para modificar promociones. Revisa que su UID esté en las reglas de Firestore.'
};
const textoError = e => ERRORES[e?.code] || (e?.message === SIN_RESPUESTA ? SIN_RESPUESTA : `Ocurrió un error (${e?.code || e?.message || e}).`);

// Si Firebase no responde en 10 segundos, se muestra un error en vez de quedar cargando
const SIN_RESPUESTA = 'Firebase no responde. Revisa que no haya un bloqueador de anuncios activo en esta página y que el projectId de js/firebase-config.js sea correcto.';
const conLimite = (promesa, ms = 10000) => Promise.race([
  promesa,
  new Promise((_, rej) => setTimeout(() => rej(new Error(SIN_RESPUESTA)), ms))
]);

// ---------- Login / sesión ----------
onAuthStateChanged(auth, user => {
  $('#vista-login').hidden = !!user;
  $('#vista-panel').hidden = !user;
  if (user) {
    $('#usuario').textContent = user.email;
    $('#uid').textContent = user.uid;
    cargarLista();
    reiniciarInactividad();
  }
});

$('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type=submit]');
  btn.disabled = true;
  msg($('#msg-login'), 'Ingresando…');
  try {
    await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    f.reset();
    msg($('#msg-login'), '');
  } catch (err) {
    msg($('#msg-login'), textoError(err), 'error');
  } finally {
    btn.disabled = false;
  }
});

$('#btn-olvide').addEventListener('click', async () => {
  const email = $('#form-login').email.value.trim();
  if (!email) return msg($('#msg-login'), 'Escribe tu correo y vuelve a tocar "¿Olvidaste tu contraseña?".', 'error');
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (_) { /* no revelamos si el correo existe */ }
  msg($('#msg-login'), 'Si el correo corresponde a una cuenta, te llegará un enlace para cambiar la contraseña.', 'ok');
});

$('#btn-salir').addEventListener('click', () => signOut(auth));

// Cierre de sesión automático tras 30 minutos sin actividad
let timerInactividad;
function reiniciarInactividad() {
  clearTimeout(timerInactividad);
  if (auth.currentUser) timerInactividad = setTimeout(() => signOut(auth), 30 * 60 * 1000);
}
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, reiniciarInactividad, { passive: true }));

// ---------- Imagen: se reduce y comprime antes de guardarla ----------
async function comprimirImagen(blob) {
  const bmp = await createImageBitmap(blob);
  let maxLado = 1200;
  for (let intento = 0; intento < 6; intento++) {
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const calidad of [0.85, 0.75, 0.65]) {
      const url = canvas.toDataURL('image/jpeg', calidad);
      if (url.length < 900000) return url;
    }
    maxLado = Math.round(maxLado * 0.8);
  }
  throw new Error('La imagen es demasiado grande. Prueba con una más liviana.');
}

// ---------- Agregar promoción ----------
let imagenNueva = null;
$('#input-imagen').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return msg($('#msg-nueva'), 'Formato no permitido. Usa JPG, PNG o WEBP.', 'error');
  if (file.size > 15 * 1024 * 1024) return msg($('#msg-nueva'), 'La imagen pesa más de 15 MB.', 'error');
  try {
    msg($('#msg-nueva'), 'Preparando imagen…');
    imagenNueva = await comprimirImagen(file);
    $('#drop-preview').src = imagenNueva;
    $('#drop-preview').hidden = false;
    $('#drop-texto').hidden = true;
    msg($('#msg-nueva'), '');
  } catch (err) {
    imagenNueva = null;
    msg($('#msg-nueva'), err.message, 'error');
  }
});

$('#form-nueva').addEventListener('submit', async e => {
  e.preventDefault();
  if (!imagenNueva) return msg($('#msg-nueva'), 'Primero elige la imagen de la promoción.', 'error');
  const btn = $('#btn-guardar');
  btn.disabled = true;
  msg($('#msg-nueva'), 'Publicando…');
  try {
    const primero = promos[0]?.orden ?? 0;
    await conLimite(addDoc(promosRef, {
      imagen: imagenNueva,
      descripcion: $('#input-desc').value.trim().slice(0, 300),
      orden: primero - 1, // las nuevas quedan primero
      activa: true,
      actualizada: serverTimestamp()
    }));
    e.target.reset();
    imagenNueva = null;
    $('#drop-preview').hidden = true;
    $('#drop-texto').hidden = false;
    msg($('#msg-nueva'), '¡Promoción publicada!', 'ok');
    cargarLista();
  } catch (err) {
    msg($('#msg-nueva'), textoError(err), 'error');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Lista de promociones ----------
let promos = [];

async function cargarLista() {
  try {
    const snap = await conLimite(getDocs(query(promosRef, orderBy('orden'))));
    promos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    pintarLista();
  } catch (err) {
    $('#lista').innerHTML = '';
    msg($('#msg-lista'), textoError(err), 'error');
  }
}

function boton(icono, titulo, clase, accion) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `icono ${clase}`;
  b.title = titulo;
  b.setAttribute('aria-label', titulo);
  b.innerHTML = `<i class="fa-solid ${icono}"></i>`;
  b.addEventListener('click', accion);
  return b;
}

function pintarLista() {
  const lista = $('#lista');
  lista.replaceChildren();
  $('#importar').hidden = promos.length > 0;
  if (!promos.length) {
    lista.innerHTML = '<p class="vacio">Aún no hay promociones en el panel. Mientras tanto, la web muestra las que están escritas en el código.</p>';
    return;
  }
  promos.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = `item${p.activa ? '' : ' inactiva'}`;

    const img = document.createElement('img');
    img.src = p.imagen;
    img.alt = '';

    const info = document.createElement('div');
    const ta = document.createElement('textarea');
    ta.maxLength = 300;
    ta.value = p.descripcion || '';
    ta.setAttribute('aria-label', 'Descripción de la promoción');
    ta.addEventListener('change', () => guardar(p.id, { descripcion: ta.value.trim().slice(0, 300) }, 'Descripción guardada.'));
    const estado = document.createElement('p');
    estado.className = `estado ${p.activa ? 'on' : 'off'}`;
    estado.textContent = p.activa ? '● Visible en la web' : '○ Oculta';
    info.append(ta, estado);

    const acc = document.createElement('div');
    acc.className = 'item__acciones';
    acc.append(
      boton('fa-arrow-up', 'Subir', '', () => mover(i, -1)),
      boton('fa-arrow-down', 'Bajar', '', () => mover(i, 1)),
      boton(p.activa ? 'fa-eye' : 'fa-eye-slash', p.activa ? 'Ocultar de la web' : 'Mostrar en la web', p.activa ? 'icono--verde' : '',
        () => guardar(p.id, { activa: !p.activa }, p.activa ? 'Promoción ocultada.' : 'Promoción visible.')),
      boton('fa-trash', 'Eliminar', 'icono--rojo', () => eliminar(p))
    );

    item.append(img, info, acc);
    lista.append(item);
  });
}

async function guardar(id, cambios, textoOk) {
  try {
    await updateDoc(doc(db, 'promos', id), { ...cambios, actualizada: serverTimestamp() });
    msg($('#msg-lista'), textoOk, 'ok');
    cargarLista();
  } catch (err) {
    msg($('#msg-lista'), textoError(err), 'error');
  }
}

async function mover(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= promos.length) return;
  try {
    const batch = writeBatch(db);
    // se renumera todo para evitar órdenes repetidos
    const nueva = [...promos];
    [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
    nueva.forEach((p, k) => batch.update(doc(db, 'promos', p.id), { orden: k, actualizada: serverTimestamp() }));
    await batch.commit();
    msg($('#msg-lista'), 'Orden actualizado.', 'ok');
    cargarLista();
  } catch (err) {
    msg($('#msg-lista'), textoError(err), 'error');
  }
}

async function eliminar(p) {
  if (!confirm('¿Eliminar esta promoción? No se puede deshacer.')) return;
  try {
    await deleteDoc(doc(db, 'promos', p.id));
    msg($('#msg-lista'), 'Promoción eliminada.', 'ok');
    cargarLista();
  } catch (err) {
    msg($('#msg-lista'), textoError(err), 'error');
  }
}

// ---------- Importar las promociones que están hoy en el HTML ----------
$('#btn-importar').addEventListener('click', async () => {
  const btn = $('#btn-importar');
  btn.disabled = true;
  msg($('#msg-lista'), 'Importando…');
  try {
    const html = await (await fetch('../index.html', { cache: 'no-store' })).text();
    const pagina = new DOMParser().parseFromString(html, 'text/html');
    // Las promociones de respaldo están en un <template> (no se descargan si el panel funciona)
    const respaldo = pagina.querySelector('#promos-respaldo');
    const imgs = respaldo ? respaldo.content.querySelectorAll('img') : pagina.querySelectorAll('#promociones .promos img');
    let orden = 0;
    for (const im of imgs) {
      const src = new URL(im.getAttribute('src'), new URL('../', location.href)).href;
      const imagen = await comprimirImagen(await (await fetch(src)).blob());
      await addDoc(promosRef, { imagen, descripcion: (im.alt || '').slice(0, 300), orden: orden++, activa: true, actualizada: serverTimestamp() });
    }
    msg($('#msg-lista'), `Se importaron ${orden} promociones.`, 'ok');
    cargarLista();
  } catch (err) {
    msg($('#msg-lista'), textoError(err), 'error');
  } finally {
    btn.disabled = false;
  }
});
