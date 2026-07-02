/* ============================================================
   Consulta.gs
   Búsqueda de expediente por folio, placas o VIN, y construcción
   del objeto que consume consulta.html / consulta.js.
   ============================================================ */

const ORDEN_LINEA_TIEMPO = [
  "Recibido",
  "En diagnóstico",
  "En reparación",
  "Pendiente de refacciones",
  "Control de calidad",
  "Listo para entrega",
  "Entregado",
];

function buscarExpediente(criterio) {
  if (!criterio) return { ok: false, mensaje: "Escribe un folio, placas o VIN." };

  const hoja = obtenerHojaRegistros_();
  const datos = hoja.getDataRange().getValues();
  const busqueda = String(criterio).trim().toUpperCase();

  const colFolio = COLUMNAS.indexOf("Folio");
  const colPlacas = COLUMNAS.indexOf("VehPlacas");
  const colVIN = COLUMNAS.indexOf("VehVIN");

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const coincide =
      String(fila[colFolio]).toUpperCase() === busqueda ||
      String(fila[colPlacas]).toUpperCase() === busqueda ||
      (fila[colVIN] && String(fila[colVIN]).toUpperCase() === busqueda);

    if (coincide) {
      return { ok: true, expediente: construirExpediente_(fila) };
    }
  }

  return { ok: false, mensaje: `No se encontró ningún expediente para "${criterio}".` };
}

function construirExpediente_(fila) {
  const r = filaAObjeto_(fila);
  const indiceEstado = ORDEN_LINEA_TIEMPO.indexOf(r.Estado);

  return {
    folio: r.Folio,
    estado: r.Estado,
    cliente: r.ClienteNombre,
    vehiculo: [r.VehMarca, r.VehModelo, r.VehAnio].filter(Boolean).join(" "),
    placas: r.VehPlacas,
    vin: r.VehVIN,
    fechaIngreso: r.FechaIngreso,
    fechaSalida: r.FechaSalida,
    kmIngreso: r.KmIngreso,
    kmSalida: r.KmSalida,
    observacionesIngreso: jsonSeguro_(r.ObservacionesIngreso),
    observacionesSalida: jsonSeguro_(r.ObservacionesSalida),
    fotosIngreso: jsonSeguro_(r.FotosIngreso),
    fotosSalida: jsonSeguro_(r.FotosSalida),
    pdfIngreso: r.PdfIngreso || null,
    pdfSalida: r.PdfSalida || null,
    timeline: indiceEstado === -1 ? [r.Estado].filter(Boolean) : ORDEN_LINEA_TIEMPO.slice(0, indiceEstado + 1),
  };
}
