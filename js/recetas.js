// ==========================================
//    Programa: Umai Recetas                  
//    Programo: Fernando Albornoz             
//     Archivo: js/recetas.js            
//     Version: 1.4 01-09-2026                
// ==========================================
import { db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM
const formReceta = document.getElementById('form-receta');
const formTitulo = document.getElementById('form-titulo');
const recetaIdHidden = document.getElementById('receta-id');
const recetaNombre = document.getElementById('receta-nombre');
const recetaRendimiento = document.getElementById('receta-rendimiento');

const selectInsumo = document.getElementById('select-insumo');
const insumoCantidad = document.getElementById('insumo-cantidad');
const btnAgregarInsumo = document.getElementById('btn-agregar-insumo');
const listaInsumosReceta = document.getElementById('lista-insumos-receta');

const recetaHoras = document.getElementById('receta-horas');
const recetaPrecioHora = document.getElementById('receta-precio-hora');
const recetaPackaging = document.getElementById('receta-packaging');

const resumenCostoInsumos = document.getElementById('resumen-costo-insumos');
const resumenCostoManoObra = document.getElementById('resumen-costo-mano-obra');
const resumenCostoPackaging = document.getElementById('resumen-costo-packaging');
const costoTotalRecetaEl = document.getElementById('costo-total-receta');

const btnSubmitReceta = document.getElementById('btn-submit-receta');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const tablaRecetas = document.getElementById('tabla-recetas');

// Modal
const modalDetalle = document.getElementById('modal-detalle');
const modalTitulo = document.getElementById('modal-titulo');
const modalBody = document.getElementById('modal-body');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

let inventarioInsumos = [];
let insumosEnReceta = [];
let listaRecetasLocales = [];

// 1. Cargar Insumos
onSnapshot(collection(db, "ingredientes"), (snapshot) => {
  inventarioInsumos = [];
  selectInsumo.innerHTML = '<option value="">-- Seleccionar Insumo --</option>';

  snapshot.docs.forEach(docSnap => {
    const item = { id: docSnap.id, ...docSnap.data() };
    inventarioInsumos.push(item);

    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.nombre} (${item.unidad})`;
    selectInsumo.appendChild(option);
  });
});

// 2. Agregar Insumo temporal
btnAgregarInsumo.addEventListener('click', () => {
  const insumoId = selectInsumo.value;
  const cantidad = parseFloat(insumoCantidad.value);

  if (!insumoId || isNaN(cantidad) || cantidad <= 0) {
    alert("Por favor elegí un insumo e ingresá una cantidad válida.");
    return;
  }

  const insumoBase = inventarioInsumos.find(i => i.id === insumoId);
  if (!insumoBase) return;

  const costoUnitario = insumoBase.cantidad > 0 ? (insumoBase.precio / insumoBase.cantidad) : 0;
  const costoTotalItem = costoUnitario * cantidad;

  insumosEnReceta.push({
    insumoId: insumoBase.id,
    nombre: insumoBase.nombre,
    unidad: insumoBase.unidad,
    cantidad: cantidad,
    costoCalculado: costoTotalItem
  });

  selectInsumo.value = '';
  insumoCantidad.value = '';

  calcularTotalesYRenderizar();
});

recetaHoras.addEventListener('input', calcularTotalesYRenderizar);
recetaPrecioHora.addEventListener('input', calcularTotalesYRenderizar);
recetaPackaging.addEventListener('input', calcularTotalesYRenderizar);

function calcularTotalesYRenderizar() {
  listaInsumosReceta.innerHTML = '';
  let subtotalInsumos = 0;

  insumosEnReceta.forEach((item, index) => {
    subtotalInsumos += item.costoCalculado;

    const row = document.createElement('div');
    row.className = 'ingrediente-row';
    row.innerHTML = `
      <span><strong>${item.nombre}</strong> - ${item.cantidad} ${item.unidad} ($${item.costoCalculado.toFixed(2)})</span>
      <button type="button" class="btn-delete" style="font-size:0.8rem;">Quitar</button>
    `;

    row.querySelector('.btn-delete').addEventListener('click', () => {
      insumosEnReceta.splice(index, 1);
      calcularTotalesYRenderizar();
    });

    listaInsumosReceta.appendChild(row);
  });

  const horas = parseFloat(recetaHoras.value) || 0;
  const precioHora = parseFloat(recetaPrecioHora.value) || 0;
  const packaging = parseFloat(recetaPackaging.value) || 0;

  const costoManoObra = horas * precioHora;
  const costoTotal = subtotalInsumos + costoManoObra + packaging;

  resumenCostoInsumos.textContent = `$${subtotalInsumos.toFixed(2)}`;
  resumenCostoManoObra.textContent = `$${costoManoObra.toFixed(2)}`;
  resumenCostoPackaging.textContent = `$${packaging.toFixed(2)}`;
  costoTotalRecetaEl.textContent = `$${costoTotal.toFixed(2)}`;
}

// 3. Guardar / Actualizar Receta
formReceta.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (insumosEnReceta.length === 0) {
    alert("Agregá al menos un insumo a la receta antes de guardar.");
    return;
  }

  const subtotalInsumos = insumosEnReceta.reduce((acc, curr) => acc + curr.costoCalculado, 0);
  const horas = parseFloat(recetaHoras.value) || 0;
  const precioHora = parseFloat(recetaPrecioHora.value) || 0;
  const packaging = parseFloat(recetaPackaging.value) || 0;

  const costoManoObra = horas * precioHora;
  const costoTotalCalculado = subtotalInsumos + costoManoObra + packaging;

  const payload = {
    nombre: recetaNombre.value.trim(),
    rendimiento: recetaRendimiento.value.trim(),
    insumos: insumosEnReceta,
    costoInsumos: subtotalInsumos,
    horasTrabajo: horas,
    precioHora: precioHora,
    costoManoObra: costoManoObra,
    costoPackaging: packaging,
    costoTotal: costoTotalCalculado,
    actualizadoAt: serverTimestamp()
  };

  const currentId = recetaIdHidden.value;

  try {
    if (currentId) {
      await updateDoc(doc(db, "recetas", currentId), payload);
    } else {
      payload.creadoAt = serverTimestamp();
      await addDoc(collection(db, "recetas"), payload);
    }
    
    resetFormulario();
  } catch (error) {
    console.error("Error al procesar la receta:", error);
    alert("Ocurrió un error al guardar/actualizar.");
  }
});

function resetFormulario() {
  formReceta.reset();
  recetaIdHidden.value = '';
  insumosEnReceta = [];
  recetaHoras.value = '0';
  recetaPrecioHora.value = '0';
  recetaPackaging.value = '0';
  
  formTitulo.textContent = '📖 Nueva Receta Base';
  btnSubmitReceta.textContent = 'Guardar Receta';
  btnCancelarEdicion.style.display = 'none';

  calcularTotalesYRenderizar();
}

btnCancelarEdicion.addEventListener('click', resetFormulario);

// 4. Renderizar Lista de Recetas
onSnapshot(collection(db, "recetas"), (snapshot) => {
  tablaRecetas.innerHTML = '';
  listaRecetasLocales = [];

  if (snapshot.empty) {
    tablaRecetas.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay recetas guardadas aún.
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const receta = { id, ...data };
    listaRecetasLocales.push(receta);

    const cantidadInsumos = data.insumos ? data.insumos.length : 0;
    const costo = data.costoTotal ? parseFloat(data.costoTotal).toFixed(2) : '0.00';
    const hs = data.horasTrabajo || 0;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.nombre}</strong></td>
      <td>${data.rendimiento}</td>
      <td>${hs} hs</td>
      <td>${cantidadInsumos} ítem(s)</td>
      <td><strong>$${costo}</strong></td>
      <td>
        <div class="action-btns">
          <button class="btn-action btn-ver" title="Ver detalle">👁️</button>
          <button class="btn-action btn-pdf" title="Descargar PDF" style="background-color: #f0fdf4; border-color: #bbf7d0; color: #166534;">📄</button>
          <button class="btn-action btn-editar" title="Editar">✏️</button>
          <button class="btn-action btn-eliminar" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;

    fila.querySelector('.btn-ver').addEventListener('click', () => verReceta(receta));
    fila.querySelector('.btn-pdf').addEventListener('click', () => descargarPDF(receta));
    fila.querySelector('.btn-editar').addEventListener('click', () => editarReceta(receta));
    fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarReceta(id, data.nombre));

    tablaRecetas.appendChild(fila);
  });
});

// Modal Actions
function verReceta(receta) {
  modalTitulo.textContent = receta.nombre;
  
  let htmlInsumos = (receta.insumos || []).map(i => 
    `<li>${i.nombre}: ${i.cantidad} ${i.unidad} ($${parseFloat(i.costoCalculado || 0).toFixed(2)})</li>`
  ).join('');

  modalBody.innerHTML = `
    <p><strong>Rendimiento:</strong> ${receta.rendimiento}</p>
    <hr style="margin: 0.5rem 0;">
    <p><strong>Ingredientes:</strong></p>
    <ul style="padding-left: 1.2rem; margin-bottom: 0.5rem;">${htmlInsumos}</ul>
    <hr style="margin: 0.5rem 0;">
    <p><strong>Tiempo:</strong> ${receta.horasTrabajo || 0} hs ($${parseFloat(receta.costoManoObra || 0).toFixed(2)})</p>
    <p><strong>Packaging / Varios:</strong> $${parseFloat(receta.costoPackaging || 0).toFixed(2)}</p>
    <p style="font-size: 1.1rem; font-weight: bold; margin-top: 0.5rem; color: #166534;">
      Costo Total: $${parseFloat(receta.costoTotal || 0).toFixed(2)}
    </p>
  `;

  modalDetalle.style.display = 'flex';
}

btnCerrarModal.addEventListener('click', () => modalDetalle.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modalDetalle) modalDetalle.style.display = 'none'; });

// Editar
function editarReceta(receta) {
  recetaIdHidden.value = receta.id;
  recetaNombre.value = receta.nombre;
  recetaRendimiento.value = receta.rendimiento;
  recetaHoras.value = receta.horasTrabajo || 0;
  recetaPrecioHora.value = receta.precioHora || 0;
  recetaPackaging.value = receta.costoPackaging || 0;

  insumosEnReceta = [...(receta.insumos || [])];

  formTitulo.textContent = '✏️ Editar Receta';
  btnSubmitReceta.textContent = 'Actualizar Receta';
  btnCancelarEdicion.style.display = 'block';

  calcularTotalesYRenderizar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Eliminar
async function eliminarReceta(id, nombre) {
  if (confirm(`¿Estás seguro de eliminar la receta "${nombre}"?`)) {
    try {
      await deleteDoc(doc(db, "recetas", id));
    } catch (error) {
      console.error("Error al eliminar la receta:", error);
      alert("No se pudo eliminar la receta.");
    }
  }
}

// 5. Descargar PDF
function descargarPDF(receta) {
  if (typeof html2pdf === 'undefined') {
    alert("La librería html2pdf no se ha cargado correctamente.");
    return;
  }

  const container = document.createElement('div');
  container.style.padding = '30px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#1e293b';

  let insumosHTML = '';
  if (Array.isArray(receta.insumos)) {
    insumosHTML = receta.insumos.map(i => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.nombre}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i.cantidad} ${i.unidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${parseFloat(i.costoCalculado || 0).toFixed(2)}</td>
      </tr>
    `).join('');
  }

  container.innerHTML = `
    <div style="border-bottom: 3px solid #5247e6; padding-bottom: 10px; margin-bottom: 20px;">
      <h1 style="color: #5247e6; margin: 0; font-size: 24px;">RECETA BASE: ${receta.nombre.toUpperCase()}</h1>
      <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;"><strong>Rendimiento:</strong> ${receta.rendimiento}</p>
    </div>

    <h3 style="color: #334155; margin-bottom: 10px;">Ingredientes / Insumos</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f1f5f9; text-align: left;">
          <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Insumo</th>
          <th style="padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: center;">Cantidad</th>
          <th style="padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: right;">Costo</th>
        </tr>
      </thead>
      <tbody>
        ${insumosHTML}
      </tbody>
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: #334155; margin-top: 0; margin-bottom: 10px; font-size: 16px;">Desglose de Costos</h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>Subtotal Insumos:</span>
        <strong>$${parseFloat(receta.costoInsumos || 0).toFixed(2)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>Mano de Obra (${receta.horasTrabajo || 0} hs @ $${parseFloat(receta.precioHora || 0).toFixed(2)}/h):</span>
        <strong>$${parseFloat(receta.costoManoObra || 0).toFixed(2)}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>Packaging / Varios:</span>
        <strong>$${parseFloat(receta.costoPackaging || 0).toFixed(2)}</strong>
      </div>
    </div>

    <div style="text-align: right; font-size: 20px; font-weight: bold; color: #166534; border-top: 2px solid #cbd5e1; padding-top: 10px;">
      Costo Total Receta: $${parseFloat(receta.costoTotal || 0).toFixed(2)}
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `Receta_${receta.nombre.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save();
}

// Exponer al ámbito global
window.descargarPDF = descargarPDF;