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
const formPresupuesto = document.getElementById('form-presupuesto');
const formTitulo = document.getElementById('form-titulo');
const presupuestoIdHidden = document.getElementById('presupuesto-id');
const presupuestoCliente = document.getElementById('presupuesto-cliente');
const presupuestoReceta = document.getElementById('presupuesto-receta');
const presupuestoCantidad = document.getElementById('presupuesto-cantidad');
const presupuestoMargen = document.getElementById('presupuesto-margen');

const resumenCostoProduccion = document.getElementById('resumen-costo-produccion');
const resumenGanancia = document.getElementById('resumen-ganancia');
const presupuestoPrecioFinal = document.getElementById('presupuesto-precio-final');

const btnSubmitPresupuesto = document.getElementById('btn-submit-presupuesto');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const tablaPresupuestos = document.getElementById('tabla-presupuestos');

// Modal
const modalDetalle = document.getElementById('modal-detalle');
const modalTitulo = document.getElementById('modal-titulo');
const modalBody = document.getElementById('modal-body');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

let listaRecetas = [];

// 1. Cargar recetas disponibles en el <select>
onSnapshot(collection(db, "recetas"), (snapshot) => {
  listaRecetas = [];
  presupuestoReceta.innerHTML = '<option value="">-- Seleccionar Receta --</option>';

  snapshot.docs.forEach(docSnap => {
    const item = { id: docSnap.id, ...docSnap.data() };
    listaRecetas.push(item);

    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.nombre} ($${parseFloat(item.costoTotal || 0).toFixed(2)})`;
    presupuestoReceta.appendChild(option);
  });
});

// 2. Eventos de cálculo dinámico
presupuestoReceta.addEventListener('change', calcularPresupuesto);
presupuestoCantidad.addEventListener('input', calcularPresupuesto);
presupuestoMargen.addEventListener('input', calcularPresupuesto);

function calcularPresupuesto() {
  const recetaId = presupuestoReceta.value;
  const multiplicador = parseFloat(presupuestoCantidad.value) || 0;
  const margen = parseFloat(presupuestoMargen.value) || 0;

  const recetaBase = listaRecetas.find(r => r.id === recetaId);
  if (!recetaBase) {
    resumenCostoProduccion.textContent = "$0.00";
    resumenGanancia.textContent = "$0.00";
    presupuestoPrecioFinal.textContent = "$0.00";
    return { costoProduccion: 0, ganancia: 0, precioFinal: 0, nombreReceta: '' };
  }

  const costoUnitarioReceta = parseFloat(recetaBase.costoTotal) || 0;
  const costoProduccion = costoUnitarioReceta * multiplicador;
  const ganancia = costoProduccion * (margen / 100);
  const precioFinal = costoProduccion + ganancia;

  resumenCostoProduccion.textContent = `$${costoProduccion.toFixed(2)}`;
  resumenGanancia.textContent = `$${ganancia.toFixed(2)}`;
  presupuestoPrecioFinal.textContent = `$${precioFinal.toFixed(2)}`;

  return {
    costoProduccion,
    ganancia,
    precioFinal,
    nombreReceta: recetaBase.nombre
  };
}

// 3. Guardar / Actualizar Presupuesto
formPresupuesto.addEventListener('submit', async (e) => {
  e.preventDefault();

  const calculos = calcularPresupuesto();
  if (!presupuestoReceta.value || calculos.costoProduccion <= 0) {
    alert("Por favor elegí una receta e ingresá una cantidad válida.");
    return;
  }

  const payload = {
    cliente: presupuestoCliente.value.trim(),
    recetaId: presupuestoReceta.value,
    recetaNombre: calculos.nombreReceta,
    cantidad: parseFloat(presupuestoCantidad.value) || 1,
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
  presupuestoCantidad.value = '1';
  presupuestoMargen.value = '100';

  formTitulo.textContent = '💼 Generar Nuevo Presupuesto';
  btnSubmitPresupuesto.textContent = 'Guardar Presupuesto';
  btnCancelarEdicion.style.display = 'none';

  calcularPresupuesto();
}

btnCancelarEdicion.addEventListener('click', resetFormulario);

// 4. Cargar Tabla de Presupuestos
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

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.cliente}</strong></td>
      <td>${data.recetaNombre || 'N/A'}</td>
      <td>${data.cantidad}</td>
      <td>$${parseFloat(data.costoProduccion || 0).toFixed(2)}</td>
      <td><strong>$${parseFloat(data.precioFinal || 0).toFixed(2)}</strong></td>
      <td>
        <div class="action-btns">
          <button class="btn-action btn-ver" title="Ver detalle">👁️</button>
          <button class="btn-action btn-editar" title="Editar">✏️</button>
          <button class="btn-action btn-eliminar" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;

    fila.querySelector('.btn-ver').addEventListener('click', () => verPresupuesto(item));
    fila.querySelector('.btn-editar').addEventListener('click', () => editarPresupuesto(item));
    fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarPresupuesto(id, data.cliente));

    tablaPresupuestos.appendChild(fila);
  });
});

// 5. Ver Presupuesto (Modal)
function verPresupuesto(item) {
  modalTitulo.textContent = `Presupuesto: ${item.cliente}`;
  modalBody.innerHTML = `
    <p style="margin-bottom: 0.5rem;"><strong>Cliente:</strong> ${item.cliente}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Receta:</strong> ${item.recetaNombre}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Cantidad / Unidades:</strong> ${item.cantidad}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Margen Aplicado:</strong> ${item.margen}%</p>
    <hr style="margin: 0.5rem 0;">
    <p style="margin-bottom: 0.5rem;"><strong>Costo de Producción:</strong> $${parseFloat(item.costoProduccion).toFixed(2)}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Ganancia Calculada:</strong> $${parseFloat(item.ganancia).toFixed(2)}</p>
    <p style="font-size: 1.1rem; font-weight: bold; margin-top: 0.5rem; color: #166534;">
      Precio Final Sugerido: $${parseFloat(item.precioFinal).toFixed(2)}
    </p>
  `;
  modalDetalle.style.display = 'flex';
}

btnCerrarModal.addEventListener('click', () => modalDetalle.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modalDetalle) modalDetalle.style.display = 'none'; });

// 6. Editar Presupuesto
function editarPresupuesto(item) {
  presupuestoIdHidden.value = item.id;
  presupuestoCliente.value = item.cliente;
  presupuestoReceta.value = item.recetaId;
  presupuestoCantidad.value = item.cantidad;
  presupuestoMargen.value = item.margen;

  formTitulo.textContent = '✏️ Editar Presupuesto';
  btnSubmitPresupuesto.textContent = 'Actualizar Presupuesto';
  btnCancelarEdicion.style.display = 'block';

  calcularPresupuesto();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 7. Eliminar Presupuesto
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