/* ============================================================
   admin.js
   Lógica del panel de Administración (admin.html): puerta de
   acceso por contraseña, lista de vehículos en el taller y cambio
   de estado en la línea de tiempo.

   La contraseña se guarda en sessionStorage (se pierde al cerrar
   la pestaña) y se envía en cada solicitud protegida; el backend
   la valida de nuevo en Apps Script — el frontend no es la barrera
   de seguridad real, solo evita mostrar el panel por accidente.
   ============================================================ */

const COLOR_ESTADO = {
  "Recibido": "var(--azul)",
  "En diagnóstico": "var(--amarillo)",
  "En reparación": "var(--ambar-osc)",
  "Pendiente de refacciones": "var(--rojo)",
  "Control de calidad": "var(--azul)",
  "Listo para entrega": "var(--verde)",
  "Entregado": "var(--peltre)",
};

const CLAVE_STORAGE_KEY = "admin_clave";

let expedientesActuales = [];
let listaEstados = [];
let claveAdmin = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("form-login").addEventListener("submit", intentarEntrar);
  document.getElementById("btn-cerrar-sesion").addEventListener("click", cerrarSesion);
  document.getElementById("chk-mostrar-entregados").addEventListener("change", cargarExpedientes);
  document.getElementById("filtro-admin").addEventListener("input", pintarTabla);

  const claveGuardada = sessionStorage.getItem(CLAVE_STORAGE_KEY);
  if (claveGuardada) {
    claveAdmin = claveGuardada;
    mostrarPanel();
    cargarExpedientes();
  }
});

async function intentarEntrar(evento) {
  evento.preventDefault();
  const clave = document.getElementById("clave-admin").value;
  const boton = document.getElementById("btn-entrar");
  const error = document.getElementById("error-login");

  boton.disabled = true;
  boton.textContent = "Verificando…";
  error.style.display = "none";

  try {
    const respuesta = await API.verificarAdmin(clave);
    if (respuesta.ok) {
      claveAdmin = clave;
      sessionStorage.setItem(CLAVE_STORAGE_KEY, clave);
      mostrarPanel();
      cargarExpedientes();
    } else {
      error.textContent = "Contraseña incorrecta.";
      error.style.display = "block";
    }
  } catch (err) {
    console.error(err);
    error.textContent = "No se pudo verificar la contraseña. Intenta de nuevo.";
    error.style.display = "block";
  } finally {
    boton.disabled = false;
    boton.textContent = "Entrar";
  }
}

function mostrarPanel() {
  document.getElementById("panel-login").hidden = true;
  document.getElementById("panel-contenido").hidden = false;
}

function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_STORAGE_KEY);
  claveAdmin = null;
  document.getElementById("panel-contenido").hidden = true;
  document.getElementById("panel-login").hidden = false;
  document.getElementById("clave-admin").value = "";
}

/** Si el backend responde que la clave ya no es válida, regresa al login */
function manejarAccesoInvalido_() {
  sessionStorage.removeItem(CLAVE_STORAGE_KEY);
  claveAdmin = null;
  cerrarSesion();
  const error = document.getElementById("error-login");
  error.textContent = "Tu sesión expiró o la contraseña cambió. Entra de nuevo.";
  error.style.display = "block";
}

async function cargarExpedientes() {
  document.getElementById("mensaje-cargando").hidden = false;
  document.getElementById("mensaje-tabla-vacia").hidden = true;

  const soloActivos = !document.getElementById("chk-mostrar-entregados").checked;

  try {
    const respuesta = await API.listarExpedientes(soloActivos, claveAdmin);

    if (respuesta.requiereClave) {
      manejarAccesoInvalido_();
      return;
    }

    if (respuesta.ok) {
      expedientesActuales = respuesta.expedientes || [];
      listaEstados = respuesta.estados || [];
      pintarTabla();
    } else {
      expedientesActuales = [];
      document.getElementById("cuerpo-tabla-admin").innerHTML = "";
      document.getElementById("mensaje-tabla-vacia").textContent = respuesta.mensaje || "No se pudo cargar la lista.";
      document.getElementById("mensaje-tabla-vacia").hidden = false;
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al cargar los expedientes.");
  } finally {
    document.getElementById("mensaje-cargando").hidden = true;
  }
}

function pintarTabla() {
  const filtro = document.getElementById("filtro-admin").value.trim().toLowerCase();

  const filtrados = !filtro
    ? expedientesActuales
    : expedientesActuales.filter((e) =>
        [e.folio, e.cliente, e.placas].some((campo) => (campo || "").toLowerCase().includes(filtro))
      );

  const cuerpo = document.getElementById("cuerpo-tabla-admin");

  if (!filtrados.length) {
    cuerpo.innerHTML = "";
    document.getElementById("mensaje-tabla-vacia").hidden = false;
    return;
  }
  document.getElementById("mensaje-tabla-vacia").hidden = true;

  cuerpo.innerHTML = filtrados.map((exp) => filaHTML(exp)).join("");

  cuerpo.querySelectorAll(".btn-cambiar-estado").forEach((boton) => {
    boton.addEventListener("click", () => cambiarEstado(boton.dataset.folio));
  });

  cuerpo.querySelectorAll(".btn-detalle-reparaciones").forEach((boton) => {
    boton.addEventListener("click", () => {
      const filaDetalle = cuerpo.querySelector(`[data-folio-detalle-fila="${boton.dataset.folioDetalle}"]`);
      if (filaDetalle) filaDetalle.hidden = !filaDetalle.hidden;
    });
  });
}

function filaHTML(exp) {
  const color = COLOR_ESTADO[exp.estado] || "var(--peltre)";
  const opciones = listaEstados
    .map((e) => `<option value="${e}" ${e === exp.estado ? "selected" : ""}>${e}</option>`)
    .join("");

  return `
    <tr style="border-bottom: 1px solid var(--linea);" data-folio="${exp.folio}">
      <td style="padding: 9px 6px; font-family: var(--fuente-dato); font-weight:600;">${exp.folio}</td>
      <td style="padding: 9px 6px;">${exp.cliente || "—"}</td>
      <td style="padding: 9px 6px;">${exp.vehiculo || "—"}</td>
      <td style="padding: 9px 6px; font-family: var(--fuente-dato);">${exp.placas || "—"}</td>
      <td style="padding: 9px 6px; color: var(--peltre); font-size: 12.5px;">${exp.fechaIngreso || "—"}</td>
      <td style="padding: 9px 6px;">
        <span style="display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600;">
          <span style="width:9px; height:9px; border-radius:50%; background:${color}; display:inline-block;"></span>
          ${exp.estado || "—"}
        </span>
      </td>
      <td style="padding: 9px 6px;">
        ${
          exp.bloqueado
            ? `<button type="button" class="btn-detalle-reparaciones" data-folio-detalle="${exp.folio}" style="background:none; border:none; padding:0; font-family: var(--fuente-dato); font-weight:600; color: var(--verde); cursor:pointer; text-decoration: underline;">
                 $${Number(exp.totalAutorizado || 0).toFixed(2)}
               </button>`
            : `<span style="color: var(--peltre); font-size: 12.5px;">Sin autorizar</span>`
        }
      </td>
      <td style="padding: 9px 6px;">
        <select class="select-estado" data-folio-select="${exp.folio}" style="font-size:13px; padding:6px 8px; border:1px solid var(--linea); border-radius: var(--radio); font-family: var(--fuente-cuerpo);">
          ${opciones}
        </select>
      </td>
      <td style="padding: 9px 6px;">
        <button type="button" class="btn btn-secundario btn-cambiar-estado" data-folio="${exp.folio}" style="padding: 7px 12px; font-size: 12.5px;">
          Actualizar
        </button>
      </td>
    </tr>
    <tr class="fila-detalle-reparaciones" data-folio-detalle-fila="${exp.folio}" hidden>
      <td colspan="8" style="padding: 0 6px 16px; background: var(--papel);">
        ${filaDetalleReparacionesHTML(exp)}
      </td>
    </tr>`;
}

function filaDetalleReparacionesHTML(exp) {
  const reparaciones = exp.reparacionesAutorizadas || [];
  const autorizadas = reparaciones.filter((r) => r.autorizada);
  const rechazadas = reparaciones.filter((r) => !r.autorizada);

  const filaReparacion = (r, autorizada) => `
    <tr>
      <td style="padding: 6px 8px; font-size: 13px;">
        ${autorizada ? "✅" : "❌"} ${r.descripcion}
      </td>
      <td style="padding: 6px 8px; font-size: 13px; text-align:right; font-family: var(--fuente-dato);">
        $${Number(r.costo || 0).toFixed(2)}
      </td>
    </tr>`;

  return `
    <div style="border: 1px solid var(--linea); border-radius: var(--radio); background: #fff; padding: 14px 16px; margin-top: 6px;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--peltre); margin: 0 0 8px; font-weight: 600;">
        Detalle de la autorización · ${exp.fechaAutorizacion || ""}
      </p>
      <table style="width: 100%; border-collapse: collapse;">
        ${autorizadas.map((r) => filaReparacion(r, true)).join("")}
        ${rechazadas.map((r) => filaReparacion(r, false)).join("")}
      </table>
      <div style="display:flex; justify-content:space-between; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--linea); font-weight: 600; font-size: 13.5px;">
        <span>Total autorizado</span>
        <span style="font-family: var(--fuente-dato);">$${Number(exp.totalAutorizado || 0).toFixed(2)}</span>
      </div>
      ${
        exp.ineFrenteUrl
          ? `<p style="margin: 10px 0 0;"><a href="${exp.ineFrenteUrl}" target="_blank" style="font-size: 12.5px;">Ver INE (frente)</a>${exp.ineReversoUrl ? ` · <a href="${exp.ineReversoUrl}" target="_blank" style="font-size: 12.5px;">Ver INE (reverso)</a>` : ""}</p>`
          : ""
      }
    </div>`;
}

async function cambiarEstado(folio) {
  const select = document.querySelector(`[data-folio-select="${folio}"]`);
  const nuevoEstado = select.value;
  const fila = document.querySelector(`tr[data-folio="${folio}"]`);
  const boton = fila.querySelector(".btn-cambiar-estado");

  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const respuesta = await API.actualizarEstado(folio, nuevoEstado, claveAdmin);

    if (respuesta.requiereClave) {
      manejarAccesoInvalido_();
      return;
    }

    if (respuesta.ok) {
      const exp = expedientesActuales.find((e) => e.folio === folio);
      if (exp) exp.estado = nuevoEstado;

      // Si pasó a "Entregado" y la vista solo muestra activos, se retira de la lista
      const soloActivos = !document.getElementById("chk-mostrar-entregados").checked;
      if (soloActivos && nuevoEstado === "Entregado") {
        expedientesActuales = expedientesActuales.filter((e) => e.folio !== folio);
      }
      pintarTabla();
    } else {
      alert(respuesta.mensaje || "No se pudo actualizar el estado.");
      boton.disabled = false;
      boton.textContent = "Actualizar";
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al actualizar el estado.");
    boton.disabled = false;
    boton.textContent = "Actualizar";
  }
}
