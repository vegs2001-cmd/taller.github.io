/* ============================================================
   trabajos.js
   Lógica de la página de Trabajos (trabajos.html): trabajos
   realizados, fallos encontrados (con fotos) y reparaciones
   recomendadas con costo, que después ve el cliente en
   autorizacion.html.
   ============================================================ */

let folioActualTrabajos = null;
let contadorFallo = 0;
let contadorReparacion = 0;
let expedienteBloqueadoTrabajos = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-buscar-folio-trabajos").addEventListener("click", buscarFolioTrabajos);
  document.getElementById("btn-agregar-fallo").addEventListener("click", () => agregarFallo());
  document.getElementById("btn-agregar-reparacion").addEventListener("click", () => agregarReparacion());
  document.getElementById("form-trabajos").addEventListener("submit", guardarTrabajosForm);
});

function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function buscarFolioTrabajos() {
  const criterio = document.getElementById("buscar-folio-trabajos").value.trim();
  if (!criterio) return;

  try {
    const resultado = await API.buscarExpediente(criterio);
    if (!resultado.ok) {
      alert(resultado.mensaje || "No se encontró el expediente.");
      return;
    }

    const exp = resultado.expediente;
    folioActualTrabajos = exp.folio;
    expedienteBloqueadoTrabajos = Boolean(exp.bloqueado);

    document.getElementById("folio-trabajos").textContent = exp.folio;
    document.getElementById("sello-estado-trabajos").textContent = exp.estado || "";
    document.getElementById("panel-trabajos").hidden = false;
    document.getElementById("trabajos-realizados").value = exp.trabajosRealizados || "";

    document.getElementById("lista-fallos").innerHTML = "";
    document.getElementById("lista-reparaciones").innerHTML = "";
    contadorFallo = 0;
    contadorReparacion = 0;

    (exp.fallos || []).forEach((f) => agregarFallo(f));
    (exp.reparaciones || []).forEach((r) => agregarReparacion(r));

    aplicarBloqueoTrabajos();
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al buscar el expediente.");
  }
}

/** Activa el input de una casilla de foto individual (miniatura al elegir archivo) */
function activarSlotFotoIndividual(slot) {
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
    const span = slot.querySelector("span.nombre");
    if (span) span.style.display = "none";
  });
}

function agregarSlotFotoFallo(divFallo) {
  const grid = divFallo.querySelector(".fallo-fotos");
  const n = grid.children.length + 1;
  const label = document.createElement("label");
  label.className = "foto-slot";
  label.style.aspectRatio = "1";
  label.innerHTML = `<input type="file" accept="image/*" capture="environment" hidden><span class="nombre">Foto ${n}</span>`;
  grid.appendChild(label);
  activarSlotFotoIndividual(label);
}

function agregarFallo(datosPrevios) {
  contadorFallo++;
  const id = contadorFallo;
  const div = document.createElement("div");
  div.className = "lista-dinamica-item";
  div.dataset.falloId = id;

  const fotosExistentes = (datosPrevios && datosPrevios.fotos) || [];
  const slotsIniciales = fotosExistentes.length ? fotosExistentes : [null];

  div.innerHTML = `
    <div class="lista-dinamica-item__cabecera">
      <span style="font-weight:600; font-size:13px; color:var(--peltre);">Fallo #${id}</span>
      <button type="button" class="btn-quitar" data-quitar-fallo="${id}">Quitar</button>
    </div>
    <div class="campo" style="margin-bottom:10px;">
      <label>Descripción del fallo</label>
      <textarea rows="2" class="fallo-descripcion">${escaparHTML(datosPrevios ? datosPrevios.descripcion : "")}</textarea>
    </div>
    <div class="grid-fotos fallo-fotos" style="grid-template-columns: repeat(auto-fit, minmax(110px,1fr));">
      ${slotsIniciales
        .map(
          (foto, i) => `
        <label class="foto-slot" style="aspect-ratio: 1;">
          <input type="file" accept="image/*" capture="environment" hidden>
          ${foto && foto.url ? `<img class="miniatura" src="${foto.url}">` : `<span class="nombre">Foto ${i + 1}</span>`}
        </label>`
        )
        .join("")}
    </div>
    <button type="button" class="btn-agregar btn-agregar-foto-fallo" style="margin-top:8px; padding:8px; font-size:12px;">+ Agregar otra foto</button>
  `;

  document.getElementById("lista-fallos").appendChild(div);

  div.querySelector(`[data-quitar-fallo="${id}"]`).addEventListener("click", () => div.remove());
  div.querySelector(".btn-agregar-foto-fallo").addEventListener("click", () => agregarSlotFotoFallo(div));
  div.querySelectorAll(".foto-slot").forEach(activarSlotFotoIndividual);
}

function agregarReparacion(datosPrevios) {
  contadorReparacion++;
  const id = contadorReparacion;
  const div = document.createElement("div");
  div.className = "fila-reparacion";
  div.dataset.reparacionId = id;
  div.dataset.idOriginal = datosPrevios && datosPrevios.id ? datosPrevios.id : "";

  div.innerHTML = `
    <input type="text" class="reparacion-descripcion" placeholder="Descripción de la reparación" value="${escaparHTML(datosPrevios ? datosPrevios.descripcion : "")}">
    <input type="number" class="reparacion-costo" placeholder="Costo (MXN)" min="0" step="0.01" value="${datosPrevios && datosPrevios.costo != null ? datosPrevios.costo : ""}">
    <button type="button" class="btn-quitar" data-quitar-reparacion="${id}">Quitar</button>
  `;

  document.getElementById("lista-reparaciones").appendChild(div);
  div.querySelector(`[data-quitar-reparacion="${id}"]`).addEventListener("click", () => div.remove());
}

function recolectarFallos() {
  return Array.from(document.querySelectorAll("#lista-fallos .lista-dinamica-item")).map((div) => ({
    descripcion: div.querySelector(".fallo-descripcion").value,
    fotos: Array.from(div.querySelectorAll(".foto-slot input[type=file]"))
      .map((input) => input.files[0] || null)
      .filter(Boolean),
  }));
}

function recolectarReparaciones() {
  return Array.from(document.querySelectorAll("#lista-reparaciones .fila-reparacion"))
    .map((div) => ({
      id: div.dataset.idOriginal || null,
      descripcion: div.querySelector(".reparacion-descripcion").value.trim(),
      costo: parseFloat(div.querySelector(".reparacion-costo").value) || 0,
    }))
    .filter((r) => r.descripcion);
}

async function guardarTrabajosForm(evento) {
  evento.preventDefault();

  if (!folioActualTrabajos) {
    alert("Primero busca un folio.");
    return;
  }
  if (expedienteBloqueadoTrabajos) {
    alert("Este expediente ya fue autorizado por el cliente y no puede modificarse.");
    return;
  }

  const datos = {
    folio: folioActualTrabajos,
    trabajosRealizados: document.getElementById("trabajos-realizados").value,
    fallos: recolectarFallos(),
    reparaciones: recolectarReparaciones(),
  };

  const boton = document.getElementById("btn-guardar-trabajos");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  try {
    const respuesta = await API.guardarTrabajos(datos);
    if (respuesta.ok) {
      alert("Trabajos y reparaciones guardados. Ya puedes generar la autorización con el cliente en la página de Autorización.");
    } else {
      alert(respuesta.mensaje || "No se pudo guardar.");
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al guardar los trabajos.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar trabajos y reparaciones";
  }
}

function aplicarBloqueoTrabajos() {
  document.getElementById("banner-bloqueado-trabajos").hidden = !expedienteBloqueadoTrabajos;
  document.querySelectorAll("#form-trabajos input, #form-trabajos textarea, #form-trabajos button").forEach((el) => {
    el.disabled = expedienteBloqueadoTrabajos;
  });
}
