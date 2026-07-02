/* ============================================================
   api.js
   Capa de comunicación con el backend en Google Apps Script.

   Mientras BASE_URL esté vacío, las llamadas se SIMULAN para poder
   probar el frontend de forma aislada. En cuanto despliegues el
   backend (ver backend-apps-script/README.md) y pegues aquí la URL
   de la Web App, este mismo archivo empieza a usarlo de verdad sin
   que app.js, salida.js ni consulta.js tengan que cambiar.
   ============================================================ */

const API = (() => {

  // URL de la Web App de Google Apps Script, termina en "/exec".
  // Ejemplo: "https://script.google.com/macros/s/AKfycb.../exec"
  const BASE_URL = "https://script.google.com/macros/s/AKfycbx-_lkuowvLXKlYnPFuSriktCj8-8_dANbf98BCn6Z7ZnVA7Me7OJbW9hAV4lySVbxHUg/exec";

  /**
   * Envuelve las llamadas al backend.
   * Nota: se usa "text/plain" (no "application/json") a propósito:
   * así el navegador NO manda una solicitud OPTIONS de preflight,
   * que Apps Script Web Apps no maneja bien. Apps Script igual lee
   * el cuerpo como JSON con JSON.parse(e.postData.contents).
   */
  async function llamar(accion, datos = {}) {
    if (!BASE_URL) {
      console.warn(`[API stub] acción "${accion}" — backend aún no conectado.`, datos);
      return simular(accion, datos);
    }

    const respuesta = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ accion, datos }),
    });

    if (!respuesta.ok) {
      throw new Error(`Error del backend (${respuesta.status})`);
    }

    return respuesta.json();
  }

  /** Convierte un File del navegador a base64 puro (sin el prefijo "data:...") */
  function archivoABase64(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result.split(",")[1]);
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  /**
   * Convierte el arreglo de fotos { tipo, archivo: File } que arman
   * app.js/salida.js en { tipo, nombre, mimeType, base64 }, listo
   * para viajar como JSON hacia Apps Script.
   */
  async function prepararFotos(fotos = []) {
    const conArchivo = (fotos || []).filter((f) => f && f.archivo);
    return Promise.all(
      conArchivo.map(async (f) => ({
        tipo: f.tipo,
        nombre: f.archivo.name,
        mimeType: f.archivo.type || "image/jpeg",
        base64: await archivoABase64(f.archivo),
      }))
    );
  }

  /** Respuestas simuladas mientras no exista backend real */
  function simular(accion, datos) {
    switch (accion) {
      case "generarFolio":
        return Promise.resolve({ folio: "VH-2026-000001" });
      case "guardarIngreso":
        return Promise.resolve({ ok: true, folio: datos.folio || "VH-2026-000001" });
      case "guardarSalida":
        return Promise.resolve({ ok: true, folio: datos.folio || "VH-2026-000001" });
      case "buscarExpediente":
        return Promise.resolve({ ok: false, mensaje: "Backend no conectado todavía." });
      case "listarExpedientes":
        return Promise.resolve({
          ok: true,
          estados: [
            "Recibido", "En diagnóstico", "En reparación", "Pendiente de refacciones",
            "Control de calidad", "Listo para entrega", "Entregado",
          ],
          expedientes: [
            { folio: "VH-2026-000001", cliente: "Cliente de prueba", vehiculo: "Nissan Versa 2022", placas: "ABC-123", estado: "En reparación", fechaIngreso: "2026-07-01 10:00" },
          ],
        });
      case "actualizarEstado":
        return Promise.resolve({ ok: true, folio: datos.folio, estado: datos.estado });
      case "verificarAdmin":
        console.warn("[API stub] backend no conectado: se acepta cualquier clave no vacía para poder probar admin.html.");
        return Promise.resolve({ ok: Boolean(datos.clave) });
      default:
        return Promise.resolve({ ok: false, mensaje: "Acción no reconocida." });
    }
  }

  return {
    generarFolio: () => llamar("generarFolio"),

    guardarIngreso: async (datos) => {
      const fotos = await prepararFotos(datos.fotos);
      return llamar("guardarIngreso", { ...datos, fotos });
    },

    guardarSalida: async (datos) => {
      const fotos = await prepararFotos(datos.fotos);
      return llamar("guardarSalida", { ...datos, fotos });
    },

    buscarExpediente: (criterio) => llamar("buscarExpediente", { criterio }),
    verificarAdmin: (clave) => llamar("verificarAdmin", { clave }),
    listarExpedientes: (soloActivos = true, clave) => llamar("listarExpedientes", { soloActivos, clave }),
    actualizarEstado: (folio, estado, clave) => llamar("actualizarEstado", { folio, estado, clave }),
  };

})();
