/* ============================================================
   autorizacion.js
   Lógica de la página de Autorización (autorizacion.html): el
   cliente elige qué reparaciones recomendadas autoriza (además del
   precio base del servicio, que no es rechazable), ve el total,
   adjunta su INE y confirma. Una vez confirmado, el expediente
   queda bloqueado y esta misma página muestra la vista de solo
   lectura.
   ============================================================ */

let folioActualAutorizacion = null;
let reparacionesDisponibles = [];
let precioBaseAutorizacion = 0;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-buscar-folio-autorizacion").addEventListener("click", buscarFolioAutorizacion);
  document.getElementById("form-autorizacion").addEventListener("submit", confirmarAutorizacion);

  activarSlotFotoIne("ine-frente");
  activarSlotFotoIne("ine-reverso");

  // Si se llega desde el QR del PDF con ?folio=..., se busca directo
  const parametros = new URLSearchParams(window.location.search);
  const folioURL = parametros.get("folio");
  if (folioURL) {
    document.getElementById("buscar-folio-autorizacion").value = folioURL;
    buscarFolioAutorizacion();
  }
});

function formatoMoneda(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

async function buscarFolioAutorizacion() {
  const criterio = document.getElementById("buscar-folio-autorizacion").value.trim();
  if (!criterio) return;

  try {
    const resultado = await API.buscarExpediente(criterio);
    if (!resultado.ok) {
      alert(resultado.mensaje || "No se encontró el expediente.");
      return;
    }

    const exp = resultado.expediente;
    folioActualAutorizacion = exp.folio;

    document.getElementById("folio-autorizacion").textContent = exp.folio;
    document.getElementById("sello-estado-autorizacion").textContent = exp.estado || "";
    document.getElementById("panel-autorizacion").hidden = false;

    document.getElementById("mensaje-sin-reparaciones").hidden = true;
    document.getElementById("vista-bloqueada").hidden = true;
    document.getElementById("form-autorizacion").hidden = true;

    const hayAlgoQueAutorizar = (exp.reparaciones && exp.reparaciones.length) || Number(exp.totalEstimado) > 0;

    if (exp.bloqueado) {
      mostrarVistaBloqueada(exp);
    } else if (!hayAlgoQueAutorizar) {
      document.getElementById("mensaje-sin-reparaciones").hidden = false;
    } else {
      mostrarFormularioAutorizacion(exp);
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al buscar el expediente.");
  }
}

function mostrarVistaBloqueada(exp) {
  document.getElementById("vista-bloqueada").hidden = false;
  document.getElementById("fecha-autorizacion").textContent = exp.fechaAutorizacion || "—";

  const autorizadas = (exp.reparacionesAutorizadas || []).filter((r) => r.autorizada);

  const filaBase = `<tr><td>Servicio base (no rechazable)</td><td class="col-costo">${formatoMoneda(exp.totalEstimado)}</td></tr>`;
  const filasReparaciones = autorizadas
    .map((r) => `<tr><td>${r.descripcion}</td><td class="col-costo">${formatoMoneda(r.costo)}</td></tr>`)
    .join("");

  document.getElementById("cuerpo-tabla-bloqueada").innerHTML = filaBase + filasReparaciones;
  document.getElementById("total-bloqueado").textContent = formatoMoneda(exp.totalAutorizado);
}

function mostrarFormularioAutorizacion(exp) {
  reparacionesDisponibles = exp.reparaciones || [];
  precioBaseAutorizacion = Number(exp.totalEstimado) || 0;

  document.getElementById("form-autorizacion").hidden = false;
  document.getElementById("form-autorizacion").reset();
  document.getElementById("precio-base-autorizacion").textContent = formatoMoneda(precioBaseAutorizacion);

  const cuerpo = document.getElementById("cuerpo-tabla-autorizacion");
  cuerpo.innerHTML = reparacionesDisponibles.length
    ? reparacionesDisponibles
        .map(
          (r) => `
    <tr>
      <td><input type="checkbox" class="chk-reparacion" data-id="${r.id}" data-costo="${r.costo}"></td>
      <td>${r.descripcion}</td>
      <td class="col-costo">${formatoMoneda(r.costo)}</td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="3" style="color:var(--peltre); font-size: 13px;">El taller no registró reparaciones adicionales recomendadas.</td></tr>`;

  cuerpo.querySelectorAll(".chk-reparacion").forEach((chk) => chk.addEventListener("change", recalcularTotalAutorizado));
  recalcularTotalAutorizado();

  // Limpiar miniaturas de INE de una búsqueda anterior
  document.querySelectorAll('[data-slot^="ine-"] img.miniatura').forEach((img) => img.remove());
  document.querySelectorAll('[data-slot^="ine-"] span').forEach((span) => (span.style.display = ""));
}

function recalcularTotalAutorizado() {
  const totalReparaciones = Array.from(document.querySelectorAll(".chk-reparacion:checked")).reduce(
    (suma, chk) => suma + (parseFloat(chk.dataset.costo) || 0),
    0
  );
  document.getElementById("total-autorizado").textContent = formatoMoneda(precioBaseAutorizacion + totalReparaciones);
}

function activarSlotFotoIne(nombreSlot) {
  const slot = document.querySelector(`[data-slot="${nombreSlot}"]`);
  const input = slot.querySelector("input[type=file]");
  input.addEventListener("change", () => {
    const archivo = input.files[0];
    if (!archivo) return;
    let img = slot.querySelector("img.miniatura");
    if (!img) {
      img = document.createElement("img");
      img.className = "miniatura";
      slot.prepend(img);
    }
    img.src = URL.createObjectURL(archivo);
    slot.querySelectorAll("span").forEach((span) => (span.style.display = "none"));
  });
}

async function confirmarAutorizacion(evento) {
  evento.preventDefault();

  const ineFrenteInput = document.querySelector('[data-slot="ine-frente"] input[type=file]');
  const ineReversoInput = document.querySelector('[data-slot="ine-reverso"] input[type=file]');
  const ineFrente = ineFrenteInput.files[0] || null;
  const ineReverso = ineReversoInput.files[0] || null;

  if (!ineFrente) {
    alert("Falta la fotografía del frente del INE.");
    return;
  }

  const seleccion = Array.from(document.querySelectorAll(".chk-reparacion")).map((chk) => ({
    id: chk.dataset.id,
    autorizada: chk.checked,
  }));

  const totalReparaciones = Array.from(document.querySelectorAll(".chk-reparacion:checked")).reduce(
    (suma, chk) => suma + (parseFloat(chk.dataset.costo) || 0),
    0
  );
  const totalAutorizado = precioBaseAutorizacion + totalReparaciones;

  if (
    !confirm(
      `¿Confirmas la autorización por un total de ${formatoMoneda(totalAutorizado)} ` +
      `(incluye el servicio base de ${formatoMoneda(precioBaseAutorizacion)}, no rechazable)? ` +
      `Ya no podrás modificarla después.`
    )
  ) {
    return;
  }

  const boton = document.getElementById("btn-confirmar-autorizacion");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const respuesta = await API.autorizarReparaciones({
      folio: folioActualAutorizacion,
      reparaciones: seleccion,
      totalAutorizado: totalAutorizado,
      ineFrente: ineFrente,
      ineReverso: ineReverso,
    });

    if (respuesta.ok) {
      alert("Autorización confirmada. Gracias.");
      buscarFolioAutorizacion(); // recarga en modo de solo lectura
    } else {
      alert(respuesta.mensaje || "No se pudo guardar la autorización.");
      boton.disabled = false;
      boton.textContent = "Confirmar autorización";
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al guardar la autorización.");
    boton.disabled = false;
    boton.textContent = "Confirmar autorización";
  }
}
