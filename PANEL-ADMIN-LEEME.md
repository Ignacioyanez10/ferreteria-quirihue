# Panel de administración de promociones

**Dirección del panel:** `https://TU-DOMINIO/gestion-fq/`.
No hay ningún enlace hacia el panel desde la web y los buscadores no lo indexan. Si quieres otra dirección, cambia el nombre de la carpeta `gestion-fq`.
La seguridad no viene de que la dirección esté oculta. Viene del login de Firebase y de las reglas de `firestore.rules`: aunque alguien encuentre la página, sin la cuenta autorizada no puede modificar nada.

## Configuración (una sola vez, unos 15 minutos)

1. Entra a https://console.firebase.google.com con una cuenta de Google y crea un proyecto llamado, por ejemplo, `ferreteria-quirihue`. Google Analytics no es necesario.
2. **Agregar app web:** en la página del proyecto, presiona el ícono `</>`, ponle un nombre y copia los valores `apiKey`, `authDomain`, `projectId` y `appId` en `js/firebase-config.js`.
3. **Authentication > Comenzar > Correo electrónico/contraseña:** habilítalo.
   - En **Usuarios > Agregar usuario**, crea la cuenta del administrador con una contraseña larga.
   - En **Configuración > Acciones del usuario**, desmarca *Habilitar creación (registro)* para que nadie pueda crearse una cuenta por su cuenta.
   - En **Configuración > Dominios autorizados**, agrega el dominio de la web (por ejemplo `ferreteriaquirihue.cl` y el `*.pages.dev` de Cloudflare).
4. **Firestore Database > Crear base de datos:** elige la ubicación `southamerica-east1 (São Paulo)` y el *modo de producción*.
5. Copia el **UID** del usuario que aparece en Authentication > Usuarios. Pégalo en `firestore.rules` en lugar de `PEGA_AQUI_TU_UID`, copia todo el archivo en **Firestore > Reglas** y presiona **Publicar**.
6. Sube los cambios a GitHub, entra a `/gestion-fq/`, inicia sesión y presiona **"Importar las promociones que hoy están en la web"**.

## Uso diario
- **Agregar:** elige la imagen, escribe la descripción y presiona *Publicar promoción*. Las promociones nuevas quedan primeras.
- **Ordenar:** usa las flechas. **Ocultar o mostrar:** usa el ojo, que sirve para promociones vencidas que quieras reutilizar después. **Eliminar:** usa el basurero.
- Los cambios se ven en la web al recargarla, sin tener que subir nada a GitHub.
- La sesión se cierra al cerrar la pestaña o después de 30 minutos sin actividad.

## Notas
- Las imágenes se reducen automáticamente a un máximo de 1200 px y se guardan en Firestore. Así funciona con el plan gratuito de Firebase (Spark), que no pide tarjeta.
- Si Firebase no responde, la web muestra las promociones escritas en `index.html`.
- Para probar en el computador hay que abrir la web con un servidor local, por ejemplo la extensión *Live Server* de VS Code. Abriendo el `index.html` con doble clic, el panel no funciona.

## Rendimiento (optimización 13-11-2026)
- **Imágenes:** la web usa las versiones `.webp` (logos, marcas y promociones). Los `.jpg`/`.png` originales se conservan solo como respaldo. Si agregas una marca nueva, súbela en WebP de unos 330×190 px como máximo.
- **Íconos:** ya no se usa el CSS de Font Awesome del CDN; `css/iconos.css` + `fonts/` contienen solo los 26 íconos que usa la web. Para agregar uno, regenera las fuentes con `pyftsubset` (fontTools) incluyendo su código Unicode y agrega su línea `.fa-nombre::before` en `css/iconos.css`. El panel `/gestion-fq/` sigue usando el CDN.
- **Skeleton loader:** el CSS está en línea en el `<head>` de `index.html` y se oculta desde `js/main.js` (máximo 2,5 s). Las tarjetas skeleton de promociones se reemplazan cuando responde Firebase (máximo 6 s; después se usan las promociones de respaldo).
- **Promociones de respaldo:** están dentro de `<template id="promos-respaldo">` y `<template id="hero-respaldo">` en `index.html`. El botón *Importar* del panel lee de ahí.
- **No subir a la web:** las carpetas `src/`, `Claude outputs/` y `_respaldo_2026-11-13/` (copia de los archivos antes de optimizar).
