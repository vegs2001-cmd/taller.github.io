/* ============================================================
   Ingreso.gs
   Guarda un nuevo registro de recepción: reserva folio, crea la
   carpeta del vehículo en Drive, sube las fotos y escribe la fila
   en Google Sheets.
   ============================================================ */

function guardarIngreso(datos) {
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);

  try {
    const hoja = obtenerHojaRegistros_();
    const folio = siguienteFolio_(); // se reserva bajo candado: es único

    const carpetaFolio = obtenerOCrearCarpeta_(obtenerCarpetaRaiz_(), folio);
    const carpetaIngreso = obtenerOCrearCarpeta_(carpetaFolio, "ingreso");
    const fotos = guardarFotos_(datos.fotos, carpetaIngreso);

    const fila = COLUMNAS.map((col) => "");
    const asignar = (col, valor) => (fila[COLUMNAS.indexOf(col)] = valor ?? "");

    asignar("Folio", folio);
    asignar("FechaIngreso", fechaISO_());
    asignar("Estado", "Recibido");
    asignar("ClienteNombre", datos.cliente_nombre);
    asignar("ClienteTelefono", datos.cliente_telefono);
    asignar("ClienteCorreo", datos.cliente_correo);
    asignar("VehMarca", datos.veh_marca);
    asignar("VehModelo", datos.veh_modelo);
    asignar("VehAnio", datos.veh_anio);
    asignar("VehPlacas", (datos.veh_placas || "").toUpperCase().trim());
    asignar("VehVIN", (datos.veh_vin || "").toUpperCase().trim());
    asignar("VehColor", datos.veh_color);
    asignar("KmIngreso", datos.veh_km);
    asignar("GasolinaIngreso", datos.veh_gasolina);
    asignar("ObservacionesIngreso", JSON.stringify(datos.observaciones || []));
    asignar("ComentariosIngreso", datos.comentarios);
    asignar("FotosIngreso", JSON.stringify(fotos));
    asignar("CarpetaDriveId", carpetaFolio.getId());
    asignar("CarpetaDriveUrl", carpetaFolio.getUrl());

    const urlPdf = generarComprobantePdf_("ingreso", {
      folio: folio,
      fecha: fila[COLUMNAS.indexOf("FechaIngreso")],
      cliente: datos.cliente_nombre,
      vehiculo: [datos.veh_marca, datos.veh_modelo, datos.veh_anio].filter(Boolean).join(" "),
      placas: (datos.veh_placas || "").toUpperCase().trim(),
      vin: (datos.veh_vin || "").toUpperCase().trim(),
      km: datos.veh_km,
      gasolina: datos.veh_gasolina,
      observaciones: datos.observaciones || [],
      comentarios: datos.comentarios,
    }, carpetaFolio);
    asignar("PdfIngreso", urlPdf);

    hoja.appendRow(fila);

    enviarNotificacionEstado_(filaAObjeto_(fila));

    return { ok: true, folio: folio, carpeta: carpetaFolio.getUrl(), pdf: urlPdf };
  } catch (err) {
    return { ok: false, mensaje: "No se pudo guardar la recepción: " + err.message };
  } finally {
    candado.releaseLock();
  }
}
