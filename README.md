# Sistema de Recepción y Entrega de Vehículos

Estructura base del frontend (HTML/CSS/JS vanilla), lista para desplegarse en
GitHub Pages y conectarse a un backend en Google Apps Script.

## Estado actual

✅ Estructura de carpetas
✅ `index.html` — Recepción de vehículos (datos de cliente, vehículo, 7 fotos
   obligatorias/opcionales, semáforo de observaciones, folio)
✅ `salida.html` — Orden de salida (búsqueda de expediente, fotos finales,
   semáforo, kilometraje/gasolina final)
✅ `consulta.html` — Consulta pública de expediente por folio/placas/VIN
✅ `css/estilos.css` — Sistema de diseño compartido
✅ `js/api.js` — Interfaz hacia el backend (se simula sola mientras `BASE_URL`
   esté vacío; en cuanto lo despliegues, empieza a usarlo de verdad)
✅ `js/app.js`, `js/salida.js`, `js/consulta.js` — Lógica de cada página
✅ `admin.html` — Panel de administración **con acceso por contraseña**:
   lista de vehículos en el taller y cambio de estado, con notificación
   por correo
✅ `consulta.html` — **Comparador antes/después** con slider por cada foto
   que tenga versión de ingreso y de salida
✅ `backend-apps-script/` — Backend completo en Google Apps Script: folio
   automático, registro en Sheets, fotos en Drive, búsqueda de expediente,
   PDF de ingreso/salida con código QR, cambio de estado y notificaciones,
   contraseña de administración

⬜ Autenticación por usuario individual (hoy es una contraseña compartida — ver `backend-apps-script/README.md`)

## Cómo probarlo ahora

**Frontend aislado:** con `BASE_URL` vacío en `js/api.js`, puedes abrir
`index.html` en el navegador y probar todo con datos simulados: formulario,
fotos (miniatura), semáforo.

**Con backend real:** sigue `backend-apps-script/README.md` para desplegar
la Web App de Apps Script, pega la URL en `js/api.js`, y el sistema completo
queda funcional: folio real, fila en Google Sheets y fotos en Google Drive.

## Estructura

```
Vehiculos/
├── index.html        Recepción
├── consulta.html      Consulta de expediente
├── salida.html        Orden de salida
├── admin.html         Panel de administración (cambio de estado)
├── css/
│   └── estilos.css
├── js/
│   ├── app.js          Lógica de recepción
│   ├── consulta.js     Lógica de consulta
│   ├── salida.js        Lógica de salida
│   ├── admin.js         Lógica del panel de administración
│   └── api.js          Interfaz con el backend (Apps Script)
├── img/
└── backend-apps-script/  Backend en Google Apps Script (ver su propio README)
```

## Siguiente paso sugerido

El sistema ya cubre todos los objetivos del documento original. Como
mejora futura: autenticación por usuario individual en vez de contraseña
compartida, o migrar las notificaciones a un proveedor con mayor volumen
de envío que el límite diario de Gmail.
