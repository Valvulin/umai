import { db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos del DOM
const formIngrediente = document.getElementById('form-ingrediente');
const ingNombre = document.getElementById('ing-nombre');
const ingUnidad = document.getElementById('ing-unidad');
const ingCantidad = document.getElementById('ing-cantidad');
const ingPrecio = document.getElementById('ing-precio');
const tablaMateriales = document.getElementById('tabla-materiales');

// 1. Escuchar la colección de 'ingredientes' en tiempo real
onSnapshot(collection(db, "ingredientes"), (snapshot) => {
  tablaMateriales.innerHTML = '';

  if (snapshot.empty) {
    tablaMateriales.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay insumos guardados. ¡Agregá el primero arriba!
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const costoUnitario = data.cantidad > 0 ? (data.precio / data.cantidad) : 0;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.nombre}</strong></td>
      <td>${data.cantidad} ${data.unidad}</td>
      <td>$${parseFloat(data.precio).toFixed(2)}</td>
      <td>$${costoUnitario.toFixed(4)} / ${data.unidad}</td>
      <td>
        <button class="btn-delete" data-id="${id}">Eliminar</button>
      </td>
    `;

    // Evento para borrar insumo
    fila.querySelector('.btn-delete').addEventListener('click', () => eliminarInsumo(id, data.nombre));

    tablaMateriales.appendChild(fila);
  });
});

// 2. Guardar un nuevo insumo
formIngrediente.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nuevoInsumo = {
    nombre: ingNombre.value.trim(),
    unidad: ingUnidad.value,
    cantidad: parseFloat(ingCantidad.value),
    precio: parseFloat(ingPrecio.value),
    creadoAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "ingredientes"), nuevoInsumo);
    formIngrediente.reset();
  } catch (error) {
    console.error("Error al guardar el insumo:", error);
    alert("Ocurrió un error al intentar guardar el insumo.");
  }
});

// 3. Eliminar insumo
async function eliminarInsumo(id, nombre) {
  if (confirm(`¿Estás seguro de que querés eliminar "${nombre}"?`)) {
    try {
      await deleteDoc(doc(db, "ingredientes", id));
    } catch (error) {
      console.error("Error al eliminar insumo:", error);
      alert("No se pudo eliminar el insumo.");
    }
  }
}