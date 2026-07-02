/* ============================================================
   PDF.gs
   Genera los comprobantes de ingreso y salida en PDF, cada uno con
   un código QR que abre el expediente en el portal de consulta.
   ============================================================ */

/**
 * Pega aquí la URL pública de consulta.html una vez que despliegues
 * el frontend en GitHub Pages, por ejemplo:
 *   "https://tuusuario.github.io/Vehiculos/consulta.html"
 * Mientras esté vacío, el QR codifica solo el folio como texto.
 */
const URL_PORTAL_CONSULTA = "";

/** Genera el comprobante (tipo: "ingreso" | "salida") y devuelve su URL en Drive */
function generarComprobantePdf_(tipo, contexto, carpetaFolio) {
  contexto.qrBase64 = obtenerQrBase64_(urlConsulta_(contexto.folio));

  const html = construirHtmlComprobante_(tipo, contexto);
  const blobPdf = Utilities.newBlob(html, "text/html", `comprobante-${tipo}.html`).getAs("application/pdf");
  blobPdf.setName(`${contexto.folio}-${tipo}.pdf`);

  const archivo = carpetaFolio.createFile(blobPdf);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

/** Descarga el PNG del QR (servicio gratuito api.qrserver.com) como base64 */
function obtenerQrBase64_(texto) {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(texto)}`;
    const respuesta = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (respuesta.getResponseCode() !== 200) return "";
    return Utilities.base64Encode(respuesta.getContent());
  } catch (err) {
    return "";
  }
}

function urlConsulta_(folio) {
  return URL_PORTAL_CONSULTA ? `${URL_PORTAL_CONSULTA}?folio=${encodeURIComponent(folio)}` : folio;
}

function colorEstadoSemaforo_(estado) {
  return { verde: "#3E8E4F", amarillo: "#E0A526", rojo: "#C0392B" }[estado] || "#D8D3C6";
}

function etiquetaEstadoSemaforo_(estado) {
  return { verde: "Recomendable", amarillo: "Precaución", rojo: "Atención inmediata" }[estado] || "Sin evaluar";
}

/**
 * Construye el HTML del comprobante. Se usa maquetación con tablas
 * (en vez de flexbox/grid) porque el convertidor de PDF de Apps
 * Script tiene mejor soporte para ese estilo de maquetación.
 */
function construirHtmlComprobante_(tipo, c) {
  const titulo = tipo === "ingreso" ? "Comprobante de Ingreso" : "Comprobante de Entrega";

  const filasObs = (c.observaciones || [])
    .map(
      (o) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #D8D3C6;font-size:12px;">${o.elemento}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #D8D3C6;text-align:left;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${colorEstadoSemaforo_(o.estado)};"></span>
        <span style="font-size:11px;color:#4B5563;margin-left:6px;">${etiquetaEstadoSemaforo_(o.estado)}</span>
      </td>
    </tr>`
    )
    .join("");

  const qr = c.qrBase64
    ? `<img src="data:image/png;base64,${c.qrBase64}" width="110" height="110" />`
    : "";

  return `<html><body style="font-family:Helvetica,Arial,sans-serif;color:#171B21;margin:0;padding:0;">

    <table width="100%" style="border-collapse:collapse;">
      <tr><td style="background:#171B21;padding:22px 28px;">
        <div style="color:#F2A93B;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Taller · Control digital</div>
        <div style="color:#EDEAE1;font-size:20px;font-weight:bold;text-transform:uppercase;margin-top:4px;">${titulo}</div>
      </td></tr>
    </table>

    <table width="100%" style="border-collapse:collapse;margin-top:20px;">
      <tr>
        <td width="62%" valign="top" style="padding:0 28px;">

          <table style="border:1px solid #D8D3C6;border-radius:4px;margin-bottom:16px;" width="100%">
            <tr><td style="padding:12px 16px;">
              <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#4B5563;">Folio</div>
              <div style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;">${c.folio}</div>
            </td></tr>
          </table>

          <table width="100%" style="font-size:13px;margin-bottom:16px;">
            <tr><td style="color:#4B5563;padding:3px 0;" width="38%">Cliente</td><td style="padding:3px 0;">${c.cliente || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">Vehículo</td><td style="padding:3px 0;">${c.vehiculo || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">Placas</td><td style="padding:3px 0;font-family:'Courier New',monospace;">${c.placas || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">VIN</td><td style="padding:3px 0;font-family:'Courier New',monospace;">${c.vin || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">Fecha</td><td style="padding:3px 0;">${c.fecha || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">Kilometraje</td><td style="padding:3px 0;">${c.km || "—"}</td></tr>
            <tr><td style="color:#4B5563;padding:3px 0;">Gasolina</td><td style="padding:3px 0;">${c.gasolina || "—"}</td></tr>
          </table>

          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#4B5563;margin-bottom:6px;">Observaciones</div>
          <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">${filasObs}</table>

          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#4B5563;margin-bottom:4px;">Comentarios</div>
          <div style="font-size:12.5px;">${c.comentarios || "—"}</div>

        </td>
        <td width="38%" valign="top" style="padding:0 28px;text-align:center;">
          ${qr}
          <div style="font-size:10px;color:#4B5563;margin-top:8px;">Escanea para consultar<br>el expediente completo</div>
        </td>
      </tr>
    </table>

    <table width="100%" style="margin-top:26px;"><tr><td style="padding:16px 28px;border-top:1px solid #D8D3C6;font-size:10.5px;color:#4B5563;text-align:center;">
      Sistema de Recepción y Entrega de Vehículos
    </td></tr></table>

  </body></html>`;
}
