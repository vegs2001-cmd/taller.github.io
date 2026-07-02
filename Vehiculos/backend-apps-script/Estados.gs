/* ============================================================
   Estados.gs
   Soporte para el panel de administración: listar expedientes y
   mover un vehículo por la línea de tiempo de estados. Cada cambio
   de estado notifica por correo al cliente (si dejó su correo).
   ============================================================ */

/**
 * Devuelve los expedientes para el panel de administración.
 * datos.soloActivos === false → incluye también los "Entregado".
 * Por defecto solo trae los vehículos que siguen en el taller.
 */
function listarExpedientes(datos) {
  const hoja = obtenerHojaRegistros_();
  const valores = hoja.getDataRange().getValues();
  const colFolio = COLUMNAS.indexOf("Folio");
  const colEstado = COLUMNAS.indexOf("Estado");
  const soloActivos = !(datos && datos.soloActivos === false);

  const filas = valores.slice(1).filter((f) => f[colFolio]);
  const filtradas = soloActivos ? filas.filter((f) => f[colEstado] !== "Entregado") : filas;

  const expedientes = filtradas.map((f) => {
    const r = filaAObjeto_(f);
    return {
      folio: r.Folio,
      cliente: r.ClienteNombre,
      vehiculo: [r.VehMarca, r.VehModelo, r.VehAnio].filter(Boolean).join(" "),
      placas: r.VehPlacas,
      estado: r.Estado,
      fechaIngreso: r.FechaIngreso,
    };
  });

  expedientes.sort((a, b) => String(b.fechaIngreso).localeCompare(String(a.fechaIngreso)));
  return { ok: true, expedientes: expedientes, estados: ORDEN_LINEA_TIEMPO };
}

/** Mueve un folio a un nuevo estado de la línea de tiempo y notifica al cliente */
function actualizarEstado(datos) {
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);

  try {
    const folio = (datos.folio || "").trim();
    const nuevoEstado = (datos.estado || "").trim();

    if (ORDEN_LINEA_TIEMPO.indexOf(nuevoEstado) === -1) {
      return { ok: false, mensaje: `Estado no válido: "${nuevoEstado}".` };
    }

    const hoja = obtenerHojaRegistros_();
    const fila = buscarFilaPorFolio_(hoja, folio);
    if (fila === -1) {
      return { ok: false, mensaje: `No se encontró el folio ${folio}.` };
    }

    hoja.getRange(fila, COLUMNAS.indexOf("Estado") + 1).setValue(nuevoEstado);

    const registro = filaAObjeto_(hoja.getRange(fila, 1, 1, COLUMNAS.length).getValues()[0]);
    enviarNotificacionEstado_(registro);

    return { ok: true, folio: folio, estado: nuevoEstado };
  } catch (err) {
    return { ok: false, mensaje: "No se pudo actualizar el estado: " + err.message };
  } finally {
    candado.releaseLock();
  }
}

/** Envía un correo al cliente avisando el nuevo estado (si dejó su correo) */
function enviarNotificacionEstado_(registro) {
  if (!registro.ClienteCorreo) return;

  try {
    MailApp.sendEmail({
      to: registro.ClienteCorreo,
      subject: `Tu vehículo ${registro.VehPlacas || ""} — ${registro.Estado}`,
      htmlBody: construirCorreoEstado_(registro),
    });
  } catch (err) {
    Logger.log("No se pudo enviar la notificación de estado: " + err.message);
  }
}

function construirCorreoEstado_(registro) {
  const enlace = URL_PORTAL_CONSULTA
    ? `<p><a href="${urlConsulta_(registro.Folio)}">Consultar expediente completo</a></p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#171B21;">
      <p>Hola ${registro.ClienteNombre || ""},</p>
      <p>El estado de tu vehículo <strong>${registro.VehMarca || ""} ${registro.VehModelo || ""}</strong>
         (placas ${registro.VehPlacas || "—"}) cambió a:</p>
      <p style="font-size:18px;font-weight:bold;color:#C9821F;margin:14px 0;">${registro.Estado}</p>
      <p style="color:#4B5563;">Folio: <strong>${registro.Folio}</strong></p>
      ${enlace}
      <p style="font-size:12px;color:#4B5563;margin-top:24px;">Sistema de Recepción y Entrega de Vehículos</p>
    </div>`;
}
