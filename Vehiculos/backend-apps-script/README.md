# Backend — Google Apps Script

Backend del sistema: genera el folio automático, guarda los registros en
Google Sheets y las fotografías en Google Drive.

## Archivos

| Archivo | Contenido |
|---|---|
| `Codigo.gs` | Punto de entrada (`doPost`/`doGet`), enruta las acciones |
| `Configuracion.gs` | Constantes y `initSistema()` (instalación) |
| `Folios.gs` | Generación del folio `VH-2026-000001` |
| `Ingreso.gs` | `guardarIngreso()` |
| `Salida.gs` | `guardarSalida()` |
| `Consulta.gs` | `buscarExpediente()` |
| `Estados.gs` | `listarExpedientes()`, `actualizarEstado()` y notificación por correo |
| `PDF.gs` | Comprobantes de ingreso/salida en PDF, con código QR |
| `Utilidades.gs` | Funciones compartidas (Drive, hoja, JSON) |
| `appsscript.json` | Manifiesto del proyecto |

## Despliegue paso a paso

### 1. Crear el proyecto
1. Ve a **[script.google.com](https://script.google.com)** → **Nuevo proyecto**.
2. Nómbralo, por ejemplo, `Backend Vehiculos`.
3. Borra el contenido de `Código.gs` que viene por defecto.
4. Por cada archivo de esta carpeta, crea un archivo con el mismo nombre
   (menú **+** junto a "Archivos" → **Script**) y pega el contenido.
   Para `appsscript.json`, actívalo desde ⚙️ **Configuración del proyecto**
   → "Mostrar archivo de manifiesto `appsscript.json`", y pega su contenido.

### 2. Instalar (crear la hoja y la carpeta de Drive)
1. En el editor, selecciona la función `initSistema` en el menú desplegable
   de funciones (arriba) y presiona **Ejecutar** (▶).
2. Autoriza los permisos que pida Google (es tu propio script pidiendo
   acceso a tu Sheets/Drive).
3. Abre **Ver ▸ Registros de ejecución** para copiar los enlaces de la hoja
   de cálculo y la carpeta de Drive que se acaban de crear.

Es seguro volver a ejecutar `initSistema` — no duplica nada si ya existen.

### 2.1 Configurar la contraseña del panel de administración
Edita `Configuracion.gs` y define una contraseña propia:

```js
const CONTRASENA_ADMIN = "pon-aqui-una-contraseña";
```

Si la dejas vacía, **`admin.html` queda bloqueado por completo** (nadie
puede entrar) — es intencional, para que nunca quede expuesto por
accidente.

### 3. Desplegar como Web App
1. Botón **Implementar ▸ Nueva implementación**.
2. Tipo: **Aplicación web**.
3. "Ejecutar como": **Yo (tu correo)**.
4. "Quién tiene acceso": **Cualquier usuario**.
5. **Implementar**, autoriza de nuevo si lo pide, y copia la **URL de la
   aplicación web** (termina en `/exec`).

### 4. Conectar el frontend
Abre `js/api.js` en el proyecto del frontend y pega la URL en:

```js
const BASE_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Listo — `index.html`, `salida.html` y `consulta.html` ya usarán el backend
real en lugar de las respuestas simuladas.

### 5. (Opcional pero recomendado) Conectar el código QR al portal público
Cada PDF incluye un código QR. Para que abra directamente el expediente en
tu `consulta.html` publicado (por ejemplo en GitHub Pages), edita
`PDF.gs` y pega tu URL:

```js
const URL_PORTAL_CONSULTA = "https://tuusuario.github.io/Vehiculos/consulta.html";
```

Vuelve a implementar una nueva versión (ver abajo). Mientras esto quede
vacío, el QR simplemente codifica el folio como texto plano.

### Cuando hagas cambios al backend
Apps Script congela el código en cada versión desplegada. Después de editar
cualquier `.gs`, vuelve a **Implementar ▸ Gestionar implementaciones ▸ ✏️ ▸
Nueva versión ▸ Implementar** para que los cambios se reflejen en la misma
URL (así no tienes que actualizar `BASE_URL` cada vez).

## Estructura de datos

### Hoja "Registros" (una fila por vehículo/folio)
Folio, FechaIngreso, FechaSalida, Estado, ClienteNombre, ClienteTelefono,
ClienteCorreo, VehMarca, VehModelo, VehAnio, VehPlacas, VehVIN, VehColor,
KmIngreso, KmSalida, GasolinaIngreso, GasolinaSalida, ObservacionesIngreso
(JSON), ObservacionesSalida (JSON), ComentariosIngreso, ComentariosSalida,
FotosIngreso (JSON), FotosSalida (JSON), PdfIngreso, PdfSalida,
CarpetaDriveId, CarpetaDriveUrl.

### Drive
```
Vehiculos/
└── VH-2026-000001/
    ├── ingreso/   (fotos de recepción)
    └── salida/    (fotos de entrega)
```

### Acciones que entiende el backend (`{ accion, datos }`)
- `generarFolio` → vista previa del próximo folio.
- `guardarIngreso` → crea el registro, reserva el folio, sube fotos, genera el PDF de ingreso con QR y notifica por correo (estado "Recibido").
- `guardarSalida` → busca por `datos.folio`, completa el expediente, genera el PDF de salida con QR y notifica por correo (estado "Entregado").
- `buscarExpediente` → busca por `datos.criterio` (folio, placas o VIN).
- `listarExpedientes` → lista para el panel de administración (`datos.soloActivos`, por defecto `true`, oculta los "Entregado").
- `actualizarEstado` → mueve un folio a un nuevo estado de la línea de tiempo y notifica por correo.

### Código QR
Cada PDF (ingreso y salida) incluye un QR generado con el servicio gratuito
`api.qrserver.com`. Si configuraste `URL_PORTAL_CONSULTA` en `PDF.gs`, el QR
abre `consulta.html?folio=VH-2026-000001` directamente; si no, codifica el
folio como texto.

### Notificaciones por correo
Cada vez que el estado de un vehículo cambia (al recibirlo, al moverlo por
la línea de tiempo desde `admin.html`, o al entregarlo) se envía un correo
al `ClienteCorreo` del registro usando `MailApp`, siempre que el cliente lo
haya dejado al ingresar el vehículo. `MailApp` usa tu propia cuenta de
Google como remitente y tiene un límite diario de envíos (100/día en
cuentas gratuitas de Gmail); para volumen alto conviene migrar a la API de
Gmail o a un proveedor externo (SendGrid, etc.).

### Panel de administración (`admin.html`)
Lista los vehículos que siguen en el taller (o todos, con el checkbox
"Mostrar entregados") y permite cambiar el estado de cada uno con un
selector.

**Acceso:** protegido con la contraseña que definas en `CONTRASENA_ADMIN`
(`Configuracion.gs`). El navegador la guarda en `sessionStorage` (se borra
al cerrar la pestaña) y la reenvía en cada solicitud; el backend la vuelve
a validar en cada llamada a `listarExpedientes` y `actualizarEstado` — la
protección real está en Apps Script, no en el navegador. Sigue siendo una
contraseña compartida simple (no cuentas individuales); para varios
usuarios con permisos distintos, el siguiente paso sería Google Sign-In.

## Pendiente para un siguiente paso
- Autenticación por usuario (no solo una contraseña compartida) para el panel de administración.
