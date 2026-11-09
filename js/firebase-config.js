// ===== Configuración de Firebase =====
// Pega aquí los datos de tu proyecto (Firebase Console > Configuración del proyecto > Tus apps > Web).
// Estos datos NO son secretos: identifican el proyecto. La seguridad la dan el login
// y las reglas de Firestore (archivo firestore.rules).
export const firebaseConfig = {
  apiKey: 'AIzaSyAmZFf3Atl7JLvkNxMcIo0fqG2KEjbyYoU',
  authDomain: 'ferreteria-quirihue.firebaseapp.com',
  projectId: 'ferreteria-quirihu',
  appId: '1:668589227808:web:8d19c4951958fd1c332145'
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export const firebaseListo = !Object.values(firebaseConfig).some(v => v.includes('PEGA_AQUI'));
