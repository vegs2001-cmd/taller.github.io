/* ============================================================
   Utilidades.gs
   Funciones compartidas: acceso a la hoja, manejo de carpetas de
   Drive, guardado de fotos en base64 y respuestas JSON.
   ============================================================ */

function obtenerHojaRegistros_() {
  return SpreadsheetApp.openById(idHojaCalculo_()).getSheetByName(NOMBRE_HOJA_REGISTROS);
}

function obtenerCarpetaRaiz_() {
  return DriveApp.getFolderById(idCarpetaRaiz_());
}

/** Devuelve una subcarpeta por nombre dentro de `padre`; la crea si no existe. */
function obtenerOCrearCarpeta_(padre, nombre) {
  const existentes = padre.getFoldersByName(nombre);
  if (existentes.hasNext()) return existentes.next();
  return padre.createFolder(nombre);
}

/**
 * Guarda un arreglo de fotos { tipo, nombre, mimeType, base64 } dentro
 * de una carpeta de Drive y devuelve [{ tipo, nombre, url }].
 * Las fotos sin contenido (base64 vacío) se ignoran.
 */
function guardarFotos_(fotos, carpeta) {
  if (!fotos || !fotos.length) return [];

  return fotos
    .filter((foto) => foto && foto.base64)
    .map((foto) => {
      const blob = Utilities.newBlob(
        Utilities.base64Decode(foto.base64),
        foto.mimeType || "image/jpeg",
        `${foto.tipo}.jpg`
      );
      const archivo = carpeta.createFile(blob);
      archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return { tipo: foto.tipo, nombre: foto.nombre || archivo.getName(), url: archivo.getUrl() };
    });
}

/** Convierte la fila de la hoja (array) a un objeto { columna: valor } */
function filaAObjeto_(fila) {
  const objeto = {};
  COLUMNAS.forEach((nombreCol, i) => (objeto[nombreCol] = fila[i]));
  return objeto;
}

/** Busca el número de fila (1-index) cuyo Folio coincide; -1 si no existe */
function buscarFilaPorFolio_(hoja, folio) {
  const datos = hoja.getDataRange().getValues();
  const colFolio = COLUMNAS.indexOf("Folio");
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colFolio]).trim() === String(folio).trim()) return i + 1; // +1: 1-index de hoja
  }
  return -1;
}

function fechaISO_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Mexico_City", "yyyy-MM-dd HH:mm");
}

function jsonSeguro_(valor) {
  try {
    return valor ? JSON.parse(valor) : [];
  } catch (e) {
    return [];
  }
}

function responderJSON_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
