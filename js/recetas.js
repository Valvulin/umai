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
const formReceta = document.getElementById('form-receta');
const recetaNombre = document.getElementById('receta-nombre');
const recetaRendimiento = document.getElementById('receta-rendimiento');
const selectInsumo = document.getElementById('select-insumo');
const insumoCantidad = document.getElementById('insumo-cantidad');
const btnAgregarInsumo = document.getElementById('btn-agregar-insumo');
const listaInsumosReceta = document.getElementById('lista-insumos-receta');
const costoTotalRecetaEl = document.getElementById('costo-total-receta');
const tablaRecetas = document.getElementById('tabla-recetas');

let inventarioInsumos = []; // Guardará copia del inventario de Firestore
let insumosEnReceta = [];   // Array local para la receta que se está armando

// 1. Cargar insumos desde Firestore para llenar el select
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

// 2. Agregar insumo a la lista temporal de la receta actual
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

  // Limpiar selección breve
  selectInsumo.value = '';
  insumoCantidad.value = '';

  renderInsumosRecetaTemporal();
});

// Renderizar la lista previa de insumos dentro del formulario
function renderInsumosRecetaTemporal() {
  listaInsumosReceta.innerHTML = '';
  let costoTotal = 0;

  insumosEnReceta.forEach((item, index) => {
    costoTotal += item.costoCalculado;

    const row = document.createElement('div');
    row.className = 'ingrediente-row';
    row.innerHTML = `
      <span><strong>${item.nombre}</strong> - ${item.cantidad} ${item.unidad} ($${item.costoCalculado.toFixed(2)})</span>
      <button type="button" class="btn-delete" style="font-size:0.8rem;">Quitar</button>
    `;

    row.querySelector('.btn-delete').addEventListener('click', () => {
      insumosEnReceta.splice(index, 1);
      renderInsumosRecetaTemporal();
    });

    listaInsumosReceta.appendChild(row);
  });

  costoTotalRecetaEl.textContent = `$${costoTotal.toFixed(2)}`;
}

// 3. Guardar la Receta en Firestore
formReceta.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (insumosEnReceta.length === 0) {
    alert("Agregá al menos un insumo a la receta antes de guardar.");
    return;
  }

  const costoTotalCalculado = insumosEnReceta.reduce((acc, curr) => acc + curr.costoCalculado, 0);

  const nuevaReceta = {
    nombre: recetaNombre.value.trim(),
    rendimiento: recetaRendimiento.value.trim(),
    insumos: insumosEnReceta,
    costoTotal: costoTotalCalculado,
    creadoAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "recetas"), nuevaReceta);
    
    // Resetear todo
    formReceta.reset();
    insumosEnReceta = [];
    renderInsumosRecetaTemporal();
  } catch (error) {
    console.error("Error al guardar la receta:", error);
    alert("Ocurrió un error al guardar la receta.");
  }
});

// 4. Escuchar y mostrar recetas desde Firestore
onSnapshot(collection(db, "recetas"), (snapshot) => {
  tablaRecetas.innerHTML = '';

  if (snapshot.empty) {
    tablaRecetas.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay recetas guardadas aún.
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const cantidadInsumos = data.insumos ? data.insumos.length : 0;
    const costo = data.costoTotal ? parseFloat(data.costoTotal).toFixed(2) : '0.00';

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.nombre}</strong></td>
      <td>${data.rendimiento}</td>
      <td>${cantidadInsumos} ítem(s)</td>
      <td><strong>$${costo}</strong></td>
      <td>
        <button class="btn-delete" data-id="${id}">Eliminar</button>
      </td>
    `;

    fila.querySelector('.btn-delete').addEventListener('click', () => eliminarReceta(id, data.nombre));

    tablaRecetas.appendChild(fila);
  });
});

// 5. Eliminar receta
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