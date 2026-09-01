// ==========================================
//    Programa: Umai Recetas                  
//    Programo: Fernando Albornoz             
//     Archivo: js/presupuestos.js            
//     Version: 1.3 01-09-2026                
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

// DOM - Formulario
const formPresupuesto = document.getElementById('form-presupuesto');
const formTitulo = document.getElementById('form-titulo');
const presupuestoIdHidden = document.getElementById('presupuesto-id');
const presupuestoFecha = document.getElementById('presupuesto-fecha');
const presupuestoCliente = document.getElementById('presupuesto-cliente');

// Selector de recetas
const selectReceta = document.getElementById('select-receta') || document.getElementById('presupuesto-receta');
const recetaCantidad = document.getElementById('receta-cantidad') || document.getElementById('presupuesto-cantidad');
const btnAgregarReceta = document.getElementById('btn-agregar-receta');
const listaRecetasContainer = document.getElementById('lista-recetas-presupuesto');

const presupuestoMargen = document.getElementById('presupuesto-margen');

// DOM - Resumen de Costos
const resumenCostoProduccion = document.getElementById('resumen-costo-produccion');
const resumenGanancia = document.getElementById('resumen-ganancia');
const presupuestoPrecioFinal = document.getElementById('presupuesto-precio-final');

// DOM - Botones y Tabla
const btnSubmitPresupuesto = document.getElementById('btn-submit-presupuesto');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const tablaPresupuestos = document.getElementById('tabla-presupuestos');

// DOM - Modal
const modalDetalle = document.getElementById('modal-detalle');
const modalTitulo = document.getElementById('modal-titulo');
const modalBody = document.getElementById('modal-body');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// Variables Globales
let listaRecetasBase = []; // Recetas cargadas desde Firestore
let recetasAgregadas = []; // Recetas agregadas al presupuesto actual

// 1. Cargar recetas disponibles desde Firestore
onSnapshot(collection(db, "recetas"), (snapshot) => {
  listaRecetasBase = [];
  if (selectReceta) {
    selectReceta.innerHTML = '<option value="">-- Seleccionar Receta --</option>';

    snapshot.docs.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      listaRecetasBase.push(item);

      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.nombre} ($${parseFloat(item.costoTotal || 0).toFixed(2)})`;
      selectReceta.appendChild(option);
    });
  }
});

// 2. Agregar Receta a la lista del Presupuesto
if (btnAgregarReceta) {
  btnAgregarReceta.addEventListener('click', () => {
    const recetaId = selectReceta.value;
    const multiplicador = parseFloat(recetaCantidad.value) || 1;

    if (!recetaId) {
      alert("Por favor elegí una receta de la lista.");
      return;
    }

    const recetaEncontrada = listaRecetasBase.find(r => r.id === recetaId);
    if (!recetaEncontrada) return;

    // Verificar si la receta ya fue agregada
    const existe = recetasAgregadas.find(r => r.recetaId === recetaId);
    if (existe) {
      existe.cantidad += multiplicador;
    } else {
      recetasAgregadas.push({
        recetaId: recetaEncontrada.id,
        nombre: recetaEncontrada.nombre,
        costoUnitario: parseFloat(recetaEncontrada.costoTotal || 0),
        cantidad: multiplicador
      });
    }

    renderListaRecetas();
    calcularPresupuesto();

    // Limpiar select
    selectReceta.value = '';
    recetaCantidad.value = '1';
  });
}

// Renderizar las recetas sumadas
function renderListaRecetas() {
  if (!listaRecetasContainer) return;
  listaRecetasContainer.innerHTML = '';

  if (recetasAgregadas.length === 0) {
    listaRecetasContainer.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">No hay recetas agregadas al presupuesto.</p>`;
    return;
  }

  recetasAgregadas.forEach((item, index) => {
    const subtotal = item.costoUnitario * item.cantidad;
    const div = document.createElement('div');
    div.className = 'costo-row';
    div.style.cssText = 'background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; margin-bottom:0.4rem; font-size:0.9rem; border:1px solid #e2e8f0;';
    div.innerHTML = `
      <span><strong>${item.nombre}</strong> (${item.cantidad} x $${item.costoUnitario.toFixed(2)})</span>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <strong>$${subtotal.toFixed(2)}</strong>
        <button type="button" class="btn-action btn-quitar" style="color:var(--danger); cursor:pointer;" title="Quitar">❌</button>
      </div>
    `;

    div.querySelector('.btn-quitar').addEventListener('click', () => {
      recetasAgregadas.splice(index, 1);
      renderListaRecetas();
      calcularPresupuesto();
    });

    listaRecetasContainer.appendChild(div);
  });
}

// 3. Cálculo dinámico
if (presupuestoMargen) {
  presupuestoMargen.addEventListener('input', calcularPresupuesto);
}

function calcularPresupuesto() {
  let costoProduccion = 0;

  // Si hay lista dinámica de recetas
  if (recetasAgregadas.length > 0) {
    costoProduccion = recetasAgregadas.reduce((acc, r) => acc + (r.costoUnitario * r.cantidad), 0);
  } else if (selectReceta && selectReceta.value) {
    // Compatibilidad en caso de selección simple
    const recetaBase = listaRecetasBase.find(r => r.id === selectReceta.value);
    if (recetaBase) {
      const mult = parseFloat(recetaCantidad.value) || 1;
      costoProduccion = (parseFloat(recetaBase.costoTotal) || 0) * mult;
    }
  }

  const margen = parseFloat(presupuestoMargen ? presupuestoMargen.value : 100) || 0;
  const ganancia = costoProduccion * (margen / 100);
  const precioFinal = costoProduccion + ganancia;

  if (resumenCostoProduccion) resumenCostoProduccion.textContent = `$${costoProduccion.toFixed(2)}`;
  if (resumenGanancia) resumenGanancia.textContent = `$${ganancia.toFixed(2)}`;
  if (presupuestoPrecioFinal) presupuestoPrecioFinal.textContent = `$${precioFinal.toFixed(2)}`;

  return { costoProduccion, ganancia, precioFinal };
}

// 4. Guardar / Actualizar Presupuesto
formPresupuesto.addEventListener('submit', async (e) => {
  e.preventDefault();

  const calculos = calcularPresupuesto();
  if (recetasAgregadas.length === 0 && (!selectReceta || !selectReceta.value)) {
    alert("Por favor agregá al menos una receta al presupuesto.");
    return;
  }

  const payload = {
    fecha: presupuestoFecha ? presupuestoFecha.value : new Date().toISOString().split('T')[0],
    cliente: presupuestoCliente.value.trim(),
    recetas: recetasAgregadas.length > 0 ? recetasAgregadas : [{
      recetaId: selectReceta.value,
      nombre: selectReceta.options[selectReceta.selectedIndex].text.split(' ($')[0],
      costoUnitario: calculos.costoProduccion / (parseFloat(recetaCantidad.value) || 1),
      cantidad: parseFloat(recetaCantidad.value) || 1
    }],
    margen: parseFloat(presupuestoMargen.value) || 0,
    costoProduccion: calculos.costoProduccion,
    ganancia: calculos.ganancia,
    precioFinal: calculos.precioFinal,
    actualizadoAt: serverTimestamp()
  };

  const currentId = presupuestoIdHidden.value;

  try {
    if (currentId) {
      await updateDoc(doc(db, "presupuestos", currentId), payload);
    } else {
      payload.creadoAt = serverTimestamp();
      await addDoc(collection(db, "presupuestos"), payload);
    }

    resetFormulario();
  } catch (error) {
    console.error("Error al procesar el presupuesto:", error);
    alert("Ocurrió un error al guardar/actualizar el presupuesto.");
  }
});

function resetFormulario() {
  formPresupuesto.reset();
  presupuestoIdHidden.value = '';
  recetasAgregadas = [];

  if (presupuestoFecha) presupuestoFecha.value = new Date().toISOString().split('T')[0];
  if (recetaCantidad) recetaCantidad.value = '1';
  if (presupuestoMargen) presupuestoMargen.value = '100';

  formTitulo.textContent = '💼 Generar Nuevo Presupuesto';
  btnSubmitPresupuesto.textContent = 'Guardar Presupuesto';
  btnCancelarEdicion.style.display = 'none';

  renderListaRecetas();
  calcularPresupuesto();
}

btnCancelarEdicion.addEventListener('click', resetFormulario);

// 5. Cargar Tabla de Presupuestos
onSnapshot(collection(db, "presupuestos"), (snapshot) => {
  tablaPresupuestos.innerHTML = '';

  if (snapshot.empty) {
    tablaPresupuestos.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No se generaron presupuestos aún.
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const item = { id, ...data };

    // Formatear texto de recetas
    let resumenRecetas = '';
    if (Array.isArray(data.recetas) && data.recetas.length > 0) {
      resumenRecetas = data.recetas.map(r => `${r.nombre} (${r.cantidad})`).join(', ');
    } else if (data.recetaNombre) {
      resumenRecetas = `${data.recetaNombre} (${data.cantidad || 1})`;
    } else {
      resumenRecetas = 'N/A';
    }

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${data.fecha || 'N/A'}</td>
      <td><strong>${data.cliente}</strong></td>
      <td>${resumenRecetas}</td>
      <td>$${parseFloat(data.costoProduccion || 0).toFixed(2)}</td>
      <td><strong>$${parseFloat(data.precioFinal || 0).toFixed(2)}</strong></td>
      <td style="text-align: center;">
        <div class="action-btns" style="justify-content: center;">
          <button class="btn-action btn-ver" title="Mirar">👁️</button>
          <button class="btn-action btn-editar" title="Editar">✏️</button>
          <button class="btn-action btn-eliminar" title="Borrar">🗑️</button>
        </div>
      </td>
    `;

    fila.querySelector('.btn-ver').addEventListener('click', () => verPresupuesto(item));
    fila.querySelector('.btn-editar').addEventListener('click', () => editarPresupuesto(item));
    fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarPresupuesto(id, data.cliente));

    tablaPresupuestos.appendChild(fila);
  });
});

// 6. Ver Presupuesto (Modal)
function verPresupuesto(item) {
  modalTitulo.textContent = `Presupuesto: ${item.cliente}`;

  let listaHTML = '';
  if (Array.isArray(item.recetas) && item.recetas.length > 0) {
    listaHTML = '<ul style="margin: 0.5rem 0; padding-left: 1.2rem;">' +
      item.recetas.map(r => `<li>${r.nombre} - Cant: ${r.cantidad} ($${(r.costoUnitario * r.cantidad).toFixed(2)})</li>`).join('') +
      '</ul>';
  } else {
    listaHTML = `<p style="margin-bottom: 0.5rem;"><strong>Receta:</strong> ${item.recetaNombre || 'N/A'}</p>`;
  }

  modalBody.innerHTML = `
    <p style="margin-bottom: 0.5rem;"><strong>Fecha:</strong> ${item.fecha || 'N/A'}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Cliente:</strong> ${item.cliente}</p>
    <hr style="margin: 0.5rem 0;">
    <p style="margin-bottom: 0.2rem;"><strong>Recetas Incluidas:</strong></p>
    ${listaHTML}
    <p style="margin-bottom: 0.5rem;"><strong>Margen Aplicado:</strong> ${item.margen}%</p>
    <hr style="margin: 0.5rem 0;">
    <p style="margin-bottom: 0.5rem;"><strong>Costo de Producción:</strong> $${parseFloat(item.costoProduccion || 0).toFixed(2)}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Ganancia Calculada:</strong> $${parseFloat(item.ganancia || 0).toFixed(2)}</p>
    <p style="font-size: 1.1rem; font-weight: bold; margin-top: 0.5rem; color: #166534;">
      Precio Final Sugerido: $${parseFloat(item.precioFinal || 0).toFixed(2)}
    </p>
  `;
  modalDetalle.style.display = 'flex';
}

btnCerrarModal.addEventListener('click', () => modalDetalle.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modalDetalle) modalDetalle.style.display = 'none'; });

// 7. Editar Presupuesto
function editarPresupuesto(item) {
  presupuestoIdHidden.value = item.id;
  if (presupuestoFecha) presupuestoFecha.value = item.fecha || new Date().toISOString().split('T')[0];
  presupuestoCliente.value = item.cliente;
  presupuestoMargen.value = item.margen;

  if (Array.isArray(item.recetas)) {
    recetasAgregadas = [...item.recetas];
  } else if (item.recetaId) {
    recetasAgregadas = [{
      recetaId: item.recetaId,
      nombre: item.recetaNombre,
      costoUnitario: item.costoProduccion / item.cantidad,
      cantidad: item.cantidad
    }];
  } else {
    recetasAgregadas = [];
  }

  formTitulo.textContent = '✏️ Editar Presupuesto';
  btnSubmitPresupuesto.textContent = 'Actualizar Presupuesto';
  btnCancelarEdicion.style.display = 'block';

  renderListaRecetas();
  calcularPresupuesto();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 8. Eliminar Presupuesto
async function eliminarPresupuesto(id, cliente) {
  if (confirm(`¿Estás seguro de eliminar el presupuesto para "${cliente}"?`)) {
    try {
      await deleteDoc(doc(db, "presupuestos", id));
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      alert("No se pudo eliminar el presupuesto.");
    }
  }
}