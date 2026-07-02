/* ============================================================
   Configuracion.gs
   Constantes del sistema y rutina de instalación (se ejecuta UNA
   sola vez desde el editor de Apps Script).
   ============================================================ */

const NOMBRE_HOJA_REGISTROS = "Registros";
const NOMBRE_CARPETA_RAIZ = "Vehiculos";

/**
 * Contraseña compartida para entrar al panel de administración
 * (admin.html). Cámbiala por una propia antes de desplegar.
 * Si la dejas vacía, el panel de administración queda BLOQUEADO
 * por completo (nadie puede entrar) — es intencional, para que no
 * quede expuesto por accidente.
 */
const CONTRASENA_ADMIN = "";

/** Verifica la contraseña que manda admin.html en cada solicitud protegida */
function verificarClaveAdmin_(datos) {
  return Boolean(CONTRASENA_ADMIN) && Boolean(datos) && datos.clave === CONTRASENA_ADMIN;
}

// Orden de columnas de la hoja "Registros". Si agregas una columna,
// agrégala aquí también (al final, para no romper filas existentes).
const COLUMNAS = [
  "Folio", "FechaIngreso", "FechaSalida", "Estado",
  "ClienteNombre", "ClienteTelefono", "ClienteCorreo",
  "VehMarca", "VehModelo", "VehAnio", "VehPlacas", "VehVIN", "VehColor",
  "KmIngreso", "KmSalida", "GasolinaIngreso", "GasolinaSalida",
  "ObservacionesIngreso", "ObservacionesSalida",
  "ComentariosIngreso", "ComentariosSalida",
  "FotosIngreso", "FotosSalida",
  "PdfIngreso", "PdfSalida",
  "CarpetaDriveId", "CarpetaDriveUrl",
];

/**
 * Ejecuta esta función UNA sola vez desde el editor de Apps Script
 * (menú de funciones ▸ initSistema ▸ Ejecutar). Crea la hoja de
 * cálculo y la carpeta raíz de Drive, y guarda sus IDs en las
 * Propiedades del proyecto para que el resto del backend los use.
 *
 * Es seguro volver a ejecutarla: si ya existen, no las duplica.
 */
function initSistema() {
  const propiedades = PropertiesService.getScriptProperties();

  // --- Google Sheets ---
  let idHoja = propiedades.getProperty("SPREADSHEET_ID");
  let libro;
  if (idHoja) {
    libro = SpreadsheetApp.openById(idHoja);
  } else {
    libro = SpreadsheetApp.create("Vehiculos - Base de datos");
    idHoja = libro.getId();
    propiedades.setProperty("SPREADSHEET_ID", idHoja);
  }

  let hoja = libro.getSheetByName(NOMBRE_HOJA_REGISTROS);
  if (!hoja) {
    hoja = libro.getSheets()[0];
    hoja.setName(NOMBRE_HOJA_REGISTROS);
  }
  if (hoja.getRange(1, 1).getValue() !== "Folio") {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]);
    hoja.setFrozenRows(1);
  }

  // --- Google Drive ---
  let idCarpeta = propiedades.getProperty("DRIVE_ROOT_ID");
  let carpeta;
  if (idCarpeta) {
    carpeta = DriveApp.getFolderById(idCarpeta);
  } else {
    carpeta = DriveApp.createFolder(NOMBRE_CARPETA_RAIZ);
    idCarpeta = carpeta.getId();
    propiedades.setProperty("DRIVE_ROOT_ID", idCarpeta);
  }

  Logger.log("Sistema listo.");
  Logger.log("Hoja de cálculo: " + libro.getUrl());
  Logger.log("Carpeta de Drive: " + carpeta.getUrl());
  Logger.log("Ahora despliega este proyecto como Web App (ver README).");
}

function idHojaCalculo_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Falta ejecutar initSistema() primero.");
  return id;
}

function idCarpetaRaiz_() {
  const id = PropertiesService.getScriptProperties().getProperty("DRIVE_ROOT_ID");
  if (!id) throw new Error("Falta ejecutar initSistema() primero.");
  return id;
}
