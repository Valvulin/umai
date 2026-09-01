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
          <button class="btn-action btn-editar" title="Editar">✏️</button>
          <button class="btn-action btn-eliminar" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;

    fila.querySelector('.btn-ver').addEventListener('click', () => verReceta(receta));
    fila.querySelector('.btn-editar').addEventListener('click', () => editarReceta(receta));
    fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarReceta(id, data.nombre));

    tablaRecetas.appendChild(fila);
  });
});

// Modal Actions
function verReceta(receta) {
  modalTitulo.textContent = receta.nombre;
  
  let htmlInsumos = receta.insumos.map(i => 
    `<li>${i.nombre}: ${i.cantidad} ${i.unidad} ($${parseFloat(i.costoCalculado).toFixed(2)})</li>`
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
      Costo Total: $${parseFloat(receta.costoTotal).toFixed(2)}
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