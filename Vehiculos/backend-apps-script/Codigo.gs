/* ============================================================
   Codigo.gs
   Punto de entrada de la Web App. El frontend (js/api.js) envía
   solicitudes POST con { accion, datos } y este enrutador llama
   a la función correspondiente.
   ============================================================ */

function doPost(e) {
  try {
    const cuerpo = JSON.parse(e.postData.contents);
    const accion = cuerpo.accion;
    const datos = cuerpo.datos || {};

    let resultado;
    switch (accion) {
      case "generarFolio":
        resultado = { folio: previsualizarFolio() };
        break;
      case "guardarIngreso":
        resultado = guardarIngreso(datos);
        break;
      case "guardarSalida":
        resultado = guardarSalida(datos);
        break;
      case "buscarExpediente":
        resultado = buscarExpediente(datos.criterio);
        break;
      case "verificarAdmin":
        resultado = { ok: verificarClaveAdmin_(datos) };
        break;
      case "listarExpedientes":
        resultado = verificarClaveAdmin_(datos)
          ? listarExpedientes(datos)
          : { ok: false, mensaje: "Acceso no autorizado.", requiereClave: true };
        break;
      case "actualizarEstado":
        resultado = verificarClaveAdmin_(datos)
          ? actualizarEstado(datos)
          : { ok: false, mensaje: "Acceso no autorizado.", requiereClave: true };
        break;
      default:
        resultado = { ok: false, mensaje: `Acción no reconocida: ${accion}` };
    }

    return responderJSON_(resultado);
  } catch (err) {
    return responderJSON_({ ok: false, mensaje: "Error del servidor: " + err.message });
  }
}

/** Permite abrir la URL de la Web App en el navegador para verificar que está viva */
function doGet() {
  return responderJSON_({ ok: true, mensaje: "Backend del Sistema de Vehículos activo." });
}
