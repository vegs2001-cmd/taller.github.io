/* ============================================================
   Salida.gs
   Actualiza un expediente existente con los datos de entrega:
   fotos finales, observaciones, kilometraje/gasolina final.
   ============================================================ */

function guardarSalida(datos) {
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);

  try {
    const hoja = obtenerHojaRegistros_();
    const folio = (datos.folio || "").trim();
    const fila = buscarFilaPorFolio_(hoja, folio);

    if (fila === -1) {
      return { ok: false, mensaje: `No se encontró el folio ${folio}.` };
    }

    const colCarpetaId = COLUMNAS.indexOf("CarpetaDriveId") + 1;
    const idCarpetaFolio = hoja.getRange(fila, colCarpetaId).getValue();
    const carpetaFolio = idCarpetaFolio ? DriveApp.getFolderById(idCarpetaFolio) : obtenerOCrearCarpeta_(obtenerCarpetaRaiz_(), folio);
    const carpetaSalida = obtenerOCrearCarpeta_(carpetaFolio, "salida");
    const fotos = guardarFotos_(datos.fotos, carpetaSalida);

    // Datos ya guardados en el ingreso, para completar el comprobante de salida
    const filaActual = hoja.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0];
    const registro = filaAObjeto_(filaActual);

    const actualizar = (col, valor) => {
      hoja.getRange(fila, COLUMNAS.indexOf(col) + 1).setValue(valor ?? "");
    };

    const fechaSalida = fechaISO_();
    actualizar("FechaSalida", fechaSalida);
    actualizar("Estado", "Entregado");
    actualizar("KmSalida", datos.km_final);
    actualizar("GasolinaSalida", datos.gasolina_final);
    actualizar("ObservacionesSalida", JSON.stringify(datos.observaciones || []));
    actualizar("ComentariosSalida", datos.comentarios_salida);
    actualizar("FotosSalida", JSON.stringify(fotos));

    const urlPdf = generarComprobantePdf_("salida", {
      folio: folio,
      fecha: fechaSalida,
      cliente: registro.ClienteNombre,
      vehiculo: [registro.VehMarca, registro.VehModelo, registro.VehAnio].filter(Boolean).join(" "),
      placas: registro.VehPlacas,
      vin: registro.VehVIN,
      km: datos.km_final,
      gasolina: datos.gasolina_final,
      observaciones: datos.observaciones || [],
      comentarios: datos.comentarios_salida,
    }, carpetaFolio);
    actualizar("PdfSalida", urlPdf);

    enviarNotificacionEstado_(filaAObjeto_(hoja.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0]));

    return { ok: true, folio: folio, pdf: urlPdf };
  } catch (err) {
    return { ok: false, mensaje: "No se pudo guardar la salida: " + err.message };
  } finally {
    candado.releaseLock();
  }
}
