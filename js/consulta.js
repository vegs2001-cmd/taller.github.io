/* ============================================================
   consulta.js
   Lógica de la página de Consulta de Expediente (consulta.html)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-consultar").addEventListener("click", consultarExpediente);
  document.getElementById("consulta-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") consultarExpediente();
  });

  // Si se llega desde un código QR con ?folio=VH-2026-000001, se consulta directo
  const parametros = new URLSearchParams(window.location.search);
  const folioURL = parametros.get("folio");
  if (folioURL) {
    document.getElementById("consulta-input").value = folioURL;
    consultarExpediente();
  }
});

async function consultarExpediente() {
  const criterio = document.getElementById("consulta-input").value.trim();
  if (!criterio) return;

  const boton = document.getElementById("btn-consultar");
  boton.disabled = true;
  boton.textContent = "Buscando…";

  try {
    const resultado = await API.buscarExpediente(criterio);

    if (resultado.ok) {
      mostrarExpediente(resultado.expediente);
    } else {
      document.getElementById("resultado-expediente").hidden = true;
      document.getElementById("mensaje-vacio").textContent =
        resultado.mensaje || "No se encontró ningún expediente con ese dato.";
      document.getElementById("mensaje-vacio").hidden = false;
    }
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al consultar el expediente.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Consultar expediente";
  }
}

/**
 * Pinta los datos del expediente en la página.
 * La forma exacta del objeto `expediente` se definirá junto con el
 * backend de Google Apps Script en el siguiente paso del proyecto.
 */
function mostrarExpediente(expediente) {
  document.getElementById("mensaje-vacio").hidden = true;
  document.getElementById("resultado-expediente").hidden = false;

  document.getElementById("res-folio").textContent = expediente.folio;
  document.getElementById("res-estado").textContent = expediente.estado;

  document.getElementById("res-datos").innerHTML = `
    <div class="campo"><label>Cliente</label><span>${expediente.cliente ?? "—"}</span></div>
    <div class="campo"><label>Vehículo</label><span>${expediente.vehiculo ?? "—"}</span></div>
    <div class="campo"><label>Placas</label><span>${expediente.placas ?? "—"}</span></div>
    <div class="campo"><label>Fecha de ingreso</label><span>${expediente.fechaIngreso ?? "—"}</span></div>
  `;

  document.getElementById("res-timeline").innerHTML =
    (expediente.timeline || [])
      .map((paso) => `<div class="fila-semaforo"><span class="nombre-item">${paso}</span></div>`)
      .join("") || `<p class="texto-ayuda">Aún no hay línea de tiempo disponible.</p>`;

  document.getElementById("res-comparador").innerHTML = construirComparador_(
    expediente.fotosIngreso || [],
    expediente.fotosSalida || []
  );
  inicializarComparadores_();

  document.getElementById("res-documentos").innerHTML = `
    ${expediente.pdfIngreso ? `<p><a href="${expediente.pdfIngreso}" target="_blank">Descargar PDF de ingreso</a></p>` : ""}
    ${expediente.pdfSalida ? `<p><a href="${expediente.pdfSalida}" target="_blank">Descargar PDF de salida</a></p>` : ""}
  `;
}

const ETIQUETAS_TIPO_FOTO = {
  frente: "Frente",
  trasera: "Parte trasera",
  "lado-piloto": "Lado piloto",
  "lado-copiloto": "Lado copiloto",
  kilometraje: "Kilometraje",
  gasolina: "Nivel de gasolina",
  cajuela: "Cajuela",
};

/** Arma un slider antes/después por cada tipo de foto que exista en ambos ingresos y salida */
function construirComparador_(fotosIngreso, fotosSalida) {
  const pares = fotosIngreso
    .map((fi) => ({ tipo: fi.tipo, ingreso: fi, salida: fotosSalida.find((fs) => fs.tipo === fi.tipo) }))
    .filter((par) => par.salida);

  if (!pares.length) {
    return `<p class="texto-ayuda">Aún no hay fotos de salida para comparar. Aparecerán aquí en cuanto se registre la orden de salida.</p>`;
  }

  return pares
    .map(
      (par) => `
    <div class="comparador" style="margin-bottom: 22px;">
      <p style="font-size:12.5px; font-weight:600; color: var(--peltre); text-transform:uppercase; letter-spacing:0.04em; margin: 0 0 8px;">
        ${ETIQUETAS_TIPO_FOTO[par.tipo] || par.tipo}
      </p>
      <div class="comparador__marco">
        <img class="comparador__img-antes" src="${par.ingreso.url}" alt="Foto de ingreso">
        <div class="comparador__despues-wrap">
          <img class="comparador__img-despues" src="${par.salida.url}" alt="Foto de salida">
        </div>
        <div class="comparador__manija"></div>
        <input type="range" class="comparador__control" min="0" max="100" value="50" aria-label="Deslizar para comparar ingreso y salida">
      </div>
      <div class="comparador__etiquetas"><span>Ingreso</span><span>Salida</span></div>
    </div>`
    )
    .join("");
}

/** Activa el arrastre de cada slider y ajusta el ancho de la foto "después" al marco */
function inicializarComparadores_() {
  document.querySelectorAll("#res-comparador .comparador__marco").forEach((marco) => {
    const envoltura = marco.querySelector(".comparador__despues-wrap");
    const imgDespues = marco.querySelector(".comparador__img-despues");
    const manija = marco.querySelector(".comparador__manija");
    const control = marco.querySelector(".comparador__control");

    const ajustarAncho = () => {
      imgDespues.style.width = `${marco.clientWidth}px`;
    };
    ajustarAncho();
    window.addEventListener("resize", ajustarAncho);

    control.addEventListener("input", () => {
      envoltura.style.width = `${control.value}%`;
      manija.style.left = `${control.value}%`;
    });
  });
}
