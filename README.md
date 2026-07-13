# Servicio Integral V&V — Sistema de Recepción y Entrega de Vehículos

Estructura completa del frontend (HTML/CSS/JS vanilla), lista para
desplegarse en GitHub Pages, conectada a un backend en Google Apps Script.

## Estado actual

✅ Estructura de carpetas
✅ `index.html` — Recepción de vehículos (datos de cliente, vehículo, 7 fotos
   obligatorias/opcionales, semáforo de observaciones, **total estimado**, folio)
✅ `trabajos.html` — Módulo de trabajos: descripción de trabajos realizados,
   fallos encontrados (con una o varias fotos cada uno) y lista de
   reparaciones recomendadas con costo individual
✅ `autorizacion.html` — El cliente ve las reparaciones recomendadas con su
   costo, elige cuáles autoriza (el total se calcula solo), adjunta la foto
   de su INE y confirma; a partir de ahí el expediente queda **bloqueado**
   y no se puede modificar. Su navegación **no da acceso al resto del
   sistema** (solo enlaza con `consulta.html`)
✅ `salida.html` — Orden de salida (búsqueda de expediente, fotos finales,
   semáforo, kilometraje/gasolina final) + **desglose de trabajos y
   reparaciones autorizadas** de solo lectura
✅ `consulta.html` — Consulta pública de expediente por folio/placas/VIN,
   con **comparador antes/después** (slider) por cada foto que tenga
   versión de ingreso y de salida. Igual que `autorizacion.html`, su
   navegación es cerrada: no expone enlaces a las páginas internas del
   taller (recepción, trabajos, salida, administración)
✅ `admin.html` — Panel de administración **con acceso por contraseña**:
   lista de vehículos en el taller, cambio de estado con notificación por
   correo, y detalle expandible con las reparaciones que autorizó cada
   cliente **y la foto de su INE mostrada directamente** (no solo un
   enlace)
✅ **Evidencia fotográfica obligatoria en el semáforo**: al marcar
   amarillo o rojo en cualquier observación (ingreso o salida), el sistema
   pide una foto antes de dejar guardar; se sube a Drive y aparece en el
   PDF junto a esa observación
✅ **Leyenda del semáforo** en las secciones de observaciones (ingreso y
   salida) y en el PDF, para que se entienda de un vistazo qué significa
   cada color
✅ **Precio base no rechazable**: el "Total estimado" de recepción aparece
   en el PDF de ingreso y, en la autorización del cliente, se suma siempre
   al total (no se puede desmarcar)
✅ **Correos con PDF adjunto** en cada notificación de ingreso/salida, más
   una herramienta de "Prueba de notificaciones por correo" en
   `admin.html` para diagnosticar si algo no está llegando
✅ **Estado "Pendiente de actualización"**: al moverlo desde `admin.html`,
   el correo automático invita al cliente, con un botón directo, a entrar
   a `autorizacion.html` con su folio para revisar y autorizar las
   reparaciones recomendadas
✅ `css/estilos.css` — Sistema de diseño compartido
✅ `js/api.js` — Interfaz hacia el backend (se simula sola mientras `BASE_URL`
   esté vacío; en cuanto lo despliegues, empieza a usarlo de verdad)
✅ `backend-apps-script/` — Backend completo en Google Apps Script: folio
   automático, registro en Sheets, fotos en Drive, búsqueda de expediente,
   PDF de ingreso/salida con código QR y desglose de reparaciones, cambio
   de estado y notificaciones, contraseña de administración, módulo
   completo de trabajos/reparaciones/autorización

⬜ Autenticación por usuario individual (hoy es una contraseña compartida — ver `backend-apps-script/README.md`)
⬜ Firma electrónica del cliente en `autorizacion.html` (hoy solo se pide la foto del INE)

## El flujo completo, de principio a fin

1. **Recepción** (`index.html`) — se registra el vehículo, se capturan las
   fotos y observaciones, y se anota un **total estimado** preliminar.
2. **Trabajos** (`trabajos.html`) — el taller busca el folio y registra los
   trabajos realizados, los fallos encontrados (con fotos) y una lista de
   reparaciones recomendadas con su costo. Luego, en `admin.html`, se
   cambia el estado a **"Pendiente de actualización"**: esto le manda un
   correo al cliente con un botón directo a `autorizacion.html?folio=...`.
3. **Autorización** (`autorizacion.html`) — el cliente busca el mismo folio,
   ve la lista de reparaciones con su costo, marca las que autoriza, ve el
   total, adjunta su INE y confirma. **A partir de aquí el expediente queda
   bloqueado.**
4. **Administración** (`admin.html`) — el taller mueve el vehículo por la
   línea de tiempo de estados y puede consultar, para cualquier folio ya
   autorizado, el detalle de qué se autorizó y por cuánto.
5. **Salida** (`salida.html`) — al buscar el folio se ve, de solo lectura,
   el desglose de trabajos realizados y reparaciones autorizadas con su
   total; se capturan las fotos finales y se genera el PDF de salida (que
   incluye ese mismo desglose).
6. **Consulta** (`consulta.html`) — el cliente puede repasar su expediente
   completo en cualquier momento, con el comparador de fotos antes/después.

## Cómo probarlo ahora

**Frontend aislado:** con `BASE_URL` vacío en `js/api.js`, puedes abrir
`index.html` en el navegador y probar todo con datos simulados: formulario,
fotos (miniatura), semáforo, total estimado.

**Con backend real:** sigue `backend-apps-script/README.md` para desplegar
la Web App de Apps Script, pega la URL en `js/api.js`, y el sistema completo
queda funcional: folio real, fila en Google Sheets y fotos en Google Drive.

## Estructura

```
Vehiculos/
├── index.html          Recepción
├── trabajos.html         Trabajos, fallos y reparaciones recomendadas
├── autorizacion.html     Autorización del cliente (reparaciones + INE)
├── salida.html           Orden de salida (con desglose de reparaciones)
├── consulta.html          Consulta de expediente
├── admin.html             Panel de administración (estados + autorizaciones)
├── css/
│   └── estilos.css
├── js/
│   ├── app.js            Lógica de recepción
│   ├── trabajos.js        Lógica del módulo de trabajos
│   ├── autorizacion.js    Lógica de autorización del cliente
│   ├── salida.js           Lógica de salida
│   ├── consulta.js         Lógica de consulta
│   ├── admin.js            Lógica del panel de administración
│   └── api.js             Interfaz con el backend (Apps Script)
├── img/
└── backend-apps-script/    Backend en Google Apps Script (ver su propio README)
```

## Siguiente paso sugerido

Como mejora futura: autenticación por usuario individual en vez de
contraseña compartida para `admin.html`, firma electrónica del cliente
además de la foto del INE, o migrar las notificaciones a un proveedor con
mayor volumen de envío que el límite diario de Gmail.
