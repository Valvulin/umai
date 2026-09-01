// ==========================================
//    Programa: Umai Recetas                  
//    Programo: Fernando Albornoz             
//     Archivo: js/materiales.js            
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

// DOM
const formIngrediente = document.getElementById('form-ingrediente');
const formTitulo = document.getElementById('form-titulo');
const ingIdHidden = document.getElementById('ing-id');
const ingNombre = document.getElementById('ing-nombre');
const ingUnidad = document.getElementById('ing-unidad');
const ingCantidad = document.getElementById('ing-cantidad');
const ingPrecio = document.getElementById('ing-precio');

const btnSubmitIngrediente = document.getElementById('btn-submit-ingrediente');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const tablaMateriales = document.getElementById('tabla-materiales');

// Modal
const modalDetalle = document.getElementById('modal-detalle');
const modalTitulo = document.getElementById('modal-titulo');
const modalBody = document.getElementById('modal-body');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// 1. Guardar o Actualizar Insumo
formIngrediente.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cantidad = parseFloat(ingCantidad.value);
  const precio = parseFloat(ingPrecio.value);

  if (isNaN(cantidad) || cantidad <= 0 || isNaN(precio) || precio < 0) {
    alert("Por favor ingresá valores numéricos válidos.");
    return;
  }

  const payload = {
    nombre: ingNombre.value.trim(),
    unidad: ingUnidad.value,
    cantidad: cantidad,
    precio: precio,
    actualizadoAt: serverTimestamp()
  };

  const currentId = ingIdHidden.value;

  try {
    if (currentId) {
      await updateDoc(doc(db, "ingredientes", currentId), payload);
    } else {
      payload.creadoAt = serverTimestamp();
      await addDoc(collection(db, "ingredientes"), payload);
    }

    resetFormulario();
  } catch (error) {
    console.error("Error al procesar el insumo:", error);
    alert("Ocurrió un error al guardar/actualizar el insumo.");
  }
});

function resetFormulario() {
  formIngrediente.reset();
  ingIdHidden.value = '';
  formTitulo.textContent = '🥄 Cargar Nuevo Material / Insumo';
  btnSubmitIngrediente.textContent = 'Guardar Insumo';
  btnCancelarEdicion.style.display = 'none';
}

btnCancelarEdicion.addEventListener('click', resetFormulario);

// 2. Escuchar cambios en tiempo real desde Firestore
onSnapshot(collection(db, "ingredientes"), (snapshot) => {
  tablaMateriales.innerHTML = '';

  if (snapshot.empty) {
    tablaMateriales.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay materiales registrados.
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const item = { id, ...data };

    const costoUnitario = data.cantidad > 0 ? (data.precio / data.cantidad) : 0;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.nombre}</strong></td>
      <td>${data.cantidad} ${data.unidad}</td>
      <td>$${parseFloat(data.precio).toFixed(2)}</td>
      <td>$${costoUnitario.toFixed(4)} / ${data.unidad}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action btn-ver" title="Ver detalle">👁️</button>
          <button class="btn-action btn-editar" title="Editar">✏️</button>
          <button class="btn-action btn-eliminar" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;

    fila.querySelector('.btn-ver').addEventListener('click', () => verInsumo(item, costoUnitario));
    fila.querySelector('.btn-editar').addEventListener('click', () => editarInsumo(item));
    fila.querySelector('.btn-eliminar').addEventListener('click', () => eliminarInsumo(id, data.nombre));

    tablaMateriales.appendChild(fila);
  });
});

// 3. Ver Insumo (Modal)
function verInsumo(item, costoUnitario) {
  modalTitulo.textContent = item.nombre;
  modalBody.innerHTML = `
    <p style="margin-bottom: 0.5rem;"><strong>Presentación:</strong> ${item.cantidad} ${item.unidad}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Precio Pagado:</strong> $${parseFloat(item.precio).toFixed(2)}</p>
    <p style="margin-bottom: 0.5rem;"><strong>Costo Unitario Base:</strong> $${costoUnitario.toFixed(4)} por ${item.unidad}</p>
  `;
  modalDetalle.style.display = 'flex';
}

btnCerrarModal.addEventListener('click', () => modalDetalle.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modalDetalle) modalDetalle.style.display = 'none'; });

// 4. Editar Insumo
function editarInsumo(item) {
  ingIdHidden.value = item.id;
  ingNombre.value = item.nombre;
  ingUnidad.value = item.unidad;
  ingCantidad.value = item.cantidad;
  ingPrecio.value = item.precio;

  formTitulo.textContent = '✏️ Editar Material / Insumo';
  btnSubmitIngrediente.textContent = 'Actualizar Insumo';
  btnCancelarEdicion.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. Eliminar Insumo
async function eliminarInsumo(id, nombre) {
  if (confirm(`¿Estás seguro de eliminar el insumo "${nombre}"?`)) {
    try {
      await deleteDoc(doc(db, "ingredientes", id));
    } catch (error) {
      console.error("Error al eliminar el insumo:", error);
      alert("No se pudo eliminar el insumo.");
    }
  }
}