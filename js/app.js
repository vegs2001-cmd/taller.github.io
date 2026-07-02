/* ============================================================
   app.js
   Lógica de la página de Recepción (index.html)
   ============================================================ */

// Elementos que se revisan con el semáforo al momento del ingreso.
// (Ajustable: agrega o quita elementos según el checklist real del taller.)
const ELEMENTOS_OBSERVACION = [
  "Llantas",
  "Frenos",
  "Luces",
  "Carrocería / pintura",
  "Vidrios y espejos",
  "Interiores",
  "Nivel de aceite",
  "Nivel de refrigerante",
  "Batería",
  "Documentos del vehículo (tarjeta de circulación, póliza)",
];

document.addEventListener("DOMContentLoaded", () => {
  pintarObservaciones();
  activarSlotsDeFoto();
  precargarFolio();

  document.getElementById("form-recepcion").addEventListener("submit", guardarRecepcion);
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFormulario);
});

/** Genera dinámicamente las filas del semáforo de observaciones */
function pintarObservaciones() {
  const contenedor = document.getElementById("lista-observaciones");
  contenedor.innerHTML = ELEMENTOS_OBSERVACION.map((item, i) => `
    <div class="fila-semaforo">
      <span class="nombre-item">${item}</span>
      <div class="semaforo" role="radiogroup" aria-label="${item}">
        <input type="radio" name="obs-${i}" id="obs-${i}-verde" value="verde">
        <label for="obs-${i}-verde" class="verde" title="Recomendable"></label>
        <input type="radio" name="obs-${i}" id="obs-${i}-amarillo" value="amarillo">
        <label for="obs-${i}-amarillo" class="amarillo" title="Precaución"></label>
        <input type="radio" name="obs-${i}" id="obs-${i}-rojo" value="rojo">
        <label for="obs-${i}-rojo" class="rojo" title="Atención inmediata"></label>
      </div>
    </div>
  `).join("");
}

/** Permite tomar/adjuntar foto en cada casilla y mostrar una miniatura */
function activarSlotsDeFoto() {
  document.querySelectorAll(".foto-slot").forEach((slot) => {
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

/** Muestra el próximo folio disponible (lo confirma el backend al guardar) */
async function precargarFolio() {
  try {
    const { folio } = await API.generarFolio();
    document.getElementById("folio-preview").textContent = folio;
  } catch (err) {
    console.error("No se pudo obtener el folio:", err);
  }
}

/** Recolecta los datos del formulario y las fotos capturadas */
function recolectarDatosRecepcion() {
  const form = document.getElementById("form-recepcion");
  const datos = Object.fromEntries(new FormData(form).entries());

  datos.observaciones = ELEMENTOS_OBSERVACION.map((item, i) => ({
    elemento: item,
    estado: form.querySelector(`input[name="obs-${i}"]:checked`)?.value || null,
  }));

  datos.fotos = Array.from(document.querySelectorAll("#grid-fotos-ingreso .foto-slot")).map((slot) => ({
    tipo: slot.dataset.slot,
    archivo: slot.querySelector("input[type=file]").files[0] || null,
  }));

  return datos;
}

async function guardarRecepcion(evento) {
  evento.preventDefault();
  const boton = document.getElementById("btn-guardar");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const datos = recolectarDatosRecepcion();
    const respuesta = await API.guardarIngreso(datos);

    if (respuesta.ok) {
      document.getElementById("folio-preview").textContent = respuesta.folio;
      document.getElementById("sello-estado").textContent = "Recibido";
      const mensajePdf = respuesta.pdf ? `\n\nPDF de ingreso: ${respuesta.pdf}` : "";
      alert(`Vehículo registrado con folio ${respuesta.folio}.${mensajePdf}`);
    } else {
      alert(respuesta.mensaje || "No se pudo guardar el registro.");
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al guardar la recepción.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar y generar PDF de ingreso";
  }
}

function limpiarFormulario() {
  if (!confirm("¿Limpiar todos los campos del formulario?")) return;
  document.getElementById("form-recepcion").reset();
  document.querySelectorAll(".foto-slot img.miniatura").forEach((img) => img.remove());
  document.querySelectorAll(".foto-slot span").forEach((span) => (span.style.display = ""));
}
