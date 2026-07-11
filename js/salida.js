/* ============================================================
   salida.js
   Lógica de la página de Orden de Salida (salida.html)
   ============================================================ */

const ELEMENTOS_OBSERVACION_SALIDA = [
  "Llantas",
  "Frenos",
  "Luces",
  "Carrocería / pintura",
  "Vidrios y espejos",
  "Interiores",
  "Limpieza general",
];

let folioActual = null;

document.addEventListener("DOMContentLoaded", () => {
  pintarObservacionesSalida();
  activarSlotsDeFotoSalida();

  document.getElementById("btn-buscar-folio").addEventListener("click", buscarExpedienteParaSalida);
  document.getElementById("form-salida").addEventListener("submit", guardarSalida);
  document.getElementById("btn-limpiar-salida").addEventListener("click", limpiarFormularioSalida);
});

function pintarObservacionesSalida() {
  const contenedor = document.getElementById("lista-observaciones-salida");
  contenedor.innerHTML = ELEMENTOS_OBSERVACION_SALIDA.map((item, i) => `
    <div class="fila-semaforo" data-indice="${i}">
      <div class="fila-semaforo__principal">
        <span class="nombre-item">${item}</span>
        <div class="semaforo" role="radiogroup" aria-label="${item}">
          <input type="radio" name="obs-salida-${i}" id="obs-salida-${i}-verde" value="verde">
          <label for="obs-salida-${i}-verde" class="verde" title="Recomendable"></label>
          <input type="radio" name="obs-salida-${i}" id="obs-salida-${i}-amarillo" value="amarillo">
          <label for="obs-salida-${i}-amarillo" class="amarillo" title="Precaución"></label>
          <input type="radio" name="obs-salida-${i}" id="obs-salida-${i}-rojo" value="rojo">
          <label for="obs-salida-${i}-rojo" class="rojo" title="Atención inmediata"></label>
        </div>
      </div>
      <div class="fila-semaforo__evidencia" id="evidencia-salida-${i}" hidden>
        <label class="foto-slot-mini">
          <input type="file" accept="image/*" capture="environment" hidden data-foto-obs-salida="${i}">
          <span class="texto-slot">📷 Agregar foto de evidencia (obligatoria)</span>
        </label>
      </div>
    </div>
  `).join("");

  activarEvidenciasDeSemaforoSalida();
}

/** Muestra/oculta la casilla de foto según el color elegido, y previsualiza la foto adjuntada */
function activarEvidenciasDeSemaforoSalida() {
  document.querySelectorAll("#lista-observaciones-salida .fila-semaforo").forEach((fila) => {
    const indice = fila.dataset.indice;
    const evidencia = fila.querySelector(`#evidencia-salida-${indice}`);

    fila.querySelectorAll(`input[name="obs-salida-${indice}"]`).forEach((radio) => {
      radio.addEventListener("change", () => {
        evidencia.hidden = !(radio.checked && (radio.value === "amarillo" || radio.value === "rojo"));
      });
    });

    const inputFoto = fila.querySelector(`input[data-foto-obs-salida="${indice}"]`);
    inputFoto.addEventListener("change", () => {
      const archivo = inputFoto.files[0];
      if (!archivo) return;
      const etiqueta = inputFoto.closest(".foto-slot-mini");
      let img = etiqueta.querySelector("img.miniatura-mini");
      if (!img) {
        img = document.createElement("img");
        img.className = "miniatura-mini";
        etiqueta.prepend(img);
      }
      img.src = URL.createObjectURL(archivo);
      etiqueta.querySelector(".texto-slot").textContent = "Foto adjuntada ✓ (toca para cambiarla)";
    });
  });
}

function activarSlotsDeFotoSalida() {
  document.querySelectorAll("#grid-fotos-salida .foto-slot").forEach((slot) => {
    const input = slot.querySelector("input[type=file]");
    input.addEventListener("change", () => {
      const archivo = input.files[0];
      if (!archivo) return;

      const url = URL.createObjectURL(archivo);
      let img = slot.querySelector("img.miniatura");
      if (!img) {
        img = document.createElement("img");
        img.className = "miniatura";
        slot.prepend(img);
      }
      img.src = url;
      slot.querySelector("span.nombre").style.display = "none";
      const req = slot.querySelector("span.req");
      if (req) req.style.display = "none";
    });
  });
}

async function buscarExpedienteParaSalida() {
  const criterio = document.getElementById("buscar-folio").value.trim();
  if (!criterio) return;

  try {
    const resultado = await API.buscarExpediente(criterio);
    if (resultado.ok) {
      folioActual = resultado.expediente.folio;
      document.getElementById("folio-actual").textContent = folioActual;
      document.getElementById("sello-estado-salida").textContent = resultado.expediente.estado || "En proceso";
      pintarDesglose(resultado.expediente);
    } else {
      alert(resultado.mensaje || "No se encontró el expediente. Verifica el backend en el siguiente paso.");
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al buscar el expediente.");
  }
}

function formatoMonedaSalida(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

/** Muestra, de solo lectura, los trabajos realizados y las reparaciones que autorizó el cliente */
function pintarDesglose(exp) {
  const autorizadas = (exp.reparacionesAutorizadas || []).filter((r) => r.autorizada);

  const filasReparaciones = autorizadas.length
    ? autorizadas
        .map(
          (r) => `
      <tr style="border-bottom:1px solid var(--linea);">
        <td style="padding:8px 6px;">${r.descripcion}</td>
        <td style="padding:8px 6px; text-align:right; font-family:var(--fuente-dato);">${formatoMonedaSalida(r.costo)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding:8px 6px; color:var(--peltre);">El cliente no autorizó reparaciones adicionales.</td></tr>`;

  document.getElementById("contenido-desglose").innerHTML = `
    <p style="font-size:12.5px; color:var(--peltre); text-transform:uppercase; letter-spacing:0.05em; margin:0 0 6px;">Trabajos realizados</p>
    <p style="font-size:14px; margin:0 0 18px;">${exp.trabajosRealizados ? exp.trabajosRealizados : "— No se registraron trabajos —"}</p>

    <p style="font-size:12.5px; color:var(--peltre); text-transform:uppercase; letter-spacing:0.05em; margin:0 0 6px;">Reparaciones autorizadas</p>
    <table style="width:100%; border-collapse:collapse; font-size:13.5px; margin-bottom: 14px;">${filasReparaciones}</table>

    <div style="display:flex; justify-content:space-between; padding-top:10px; border-top:2px solid var(--asfalto); font-family:var(--fuente-display); font-weight:600; font-size:16px;">
      <span>Total autorizado</span><span style="font-family:var(--fuente-dato);">${formatoMonedaSalida(exp.totalAutorizado)}</span>
    </div>
    <p class="texto-ayuda" style="margin-top:6px;">Total estimado en recepción: ${formatoMonedaSalida(exp.totalEstimado)}</p>
  `;

  document.getElementById("tarjeta-desglose").hidden = false;
}

function recolectarDatosSalida() {
  const form = document.getElementById("form-salida");
  const datos = Object.fromEntries(new FormData(form).entries());
  datos.folio = folioActual || document.getElementById("folio-actual").textContent;

  datos.observaciones = ELEMENTOS_OBSERVACION_SALIDA.map((item, i) => ({
    elemento: item,
    estado: form.querySelector(`input[name="obs-salida-${i}"]:checked`)?.value || null,
    archivo: document.querySelector(`input[data-foto-obs-salida="${i}"]`)?.files[0] || null,
  }));

  datos.fotos = Array.from(document.querySelectorAll("#grid-fotos-salida .foto-slot")).map((slot) => ({
    tipo: slot.dataset.slot,
    archivo: slot.querySelector("input[type=file]").files[0] || null,
  }));

  return datos;
}

async function guardarSalida(evento) {
  evento.preventDefault();

  const datos = recolectarDatosSalida();
  const faltantes = datos.observaciones.filter(
    (o) => (o.estado === "amarillo" || o.estado === "rojo") && !o.archivo
  );

  if (faltantes.length) {
    alert(
      "Falta la foto de evidencia para: " +
      faltantes.map((f) => f.elemento).join(", ")
    );
    return;
  }

  const boton = document.getElementById("btn-guardar-salida");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const respuesta = await API.guardarSalida(datos);

    if (respuesta.ok) {
      document.getElementById("sello-estado-salida").textContent = "Entregado";
      const mensajePdf = respuesta.pdf ? `\n\nPDF de salida: ${respuesta.pdf}` : "";
      alert(`Orden de salida guardada para el folio ${respuesta.folio}.${mensajePdf}`);
    } else {
      alert(respuesta.mensaje || "No se pudo guardar la orden de salida.");
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al guardar la salida.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar y generar PDF de salida";
  }
}

function limpiarFormularioSalida() {
  if (!confirm("¿Limpiar todos los campos del formulario?")) return;
  document.getElementById("form-salida").reset();
  document.querySelectorAll("#grid-fotos-salida .foto-slot img.miniatura").forEach((img) => img.remove());
  document.querySelectorAll("#grid-fotos-salida .foto-slot span").forEach((span) => (span.style.display = ""));
  document.querySelectorAll("#lista-observaciones-salida .foto-slot-mini img.miniatura-mini").forEach((img) => img.remove());
  document.querySelectorAll("#lista-observaciones-salida .fila-semaforo__evidencia").forEach((div) => (div.hidden = true));
  document.querySelectorAll("#lista-observaciones-salida .texto-slot").forEach((span) => (span.textContent = "📷 Agregar foto de evidencia (obligatoria)"));
}
