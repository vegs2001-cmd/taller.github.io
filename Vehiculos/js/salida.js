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
    <div class="fila-semaforo">
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
  `).join("");
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
    } else {
      alert(resultado.mensaje || "No se encontró el expediente. Verifica el backend en el siguiente paso.");
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al buscar el expediente.");
  }
}

function recolectarDatosSalida() {
  const form = document.getElementById("form-salida");
  const datos = Object.fromEntries(new FormData(form).entries());
  datos.folio = folioActual || document.getElementById("folio-actual").textContent;

  datos.observaciones = ELEMENTOS_OBSERVACION_SALIDA.map((item, i) => ({
    elemento: item,
    estado: form.querySelector(`input[name="obs-salida-${i}"]:checked`)?.value || null,
  }));

  datos.fotos = Array.from(document.querySelectorAll("#grid-fotos-salida .foto-slot")).map((slot) => ({
    tipo: slot.dataset.slot,
    archivo: slot.querySelector("input[type=file]").files[0] || null,
  }));

  return datos;
}

async function guardarSalida(evento) {
  evento.preventDefault();
  const boton = document.getElementById("btn-guardar-salida");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const datos = recolectarDatosSalida();
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
}
