/* ============================================================
   Folios.gs
   Generación del folio automático: VH-2026-000001
   ============================================================ */

/**
 * Calcula el siguiente folio disponible para el año en curso,
 * contando cuántos registros existen ya con ese prefijo.
 * Se usa tanto para la vista previa como, con candado, al guardar.
 */
function siguienteFolio_() {
  const hoja = obtenerHojaRegistros_();
  const anio = new Date().getFullYear();
  const prefijo = `VH-${anio}-`;

  const datos = hoja.getDataRange().getValues();
  const colFolio = COLUMNAS.indexOf("Folio");

  let maximo = 0;
  for (let i = 1; i < datos.length; i++) {
    const folio = String(datos[i][colFolio] || "");
    if (folio.startsWith(prefijo)) {
      const num = parseInt(folio.slice(prefijo.length), 10);
      if (!isNaN(num) && num > maximo) maximo = num;
    }
  }

  const siguiente = maximo + 1;
  return prefijo + String(siguiente).padStart(6, "0");
}

/** Vista previa del folio (no reserva nada, solo informa al frontend) */
function previsualizarFolio() {
  return siguienteFolio_();
}
