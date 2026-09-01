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

const recetaHoras = document.getElementById('receta-horas');
const recetaPrecioHora = document.getElementById('receta-precio-hora');
const recetaPackaging = document.getElementById('receta-packaging');

const resumenCostoInsumos = document.getElementById('resumen-costo-insumos');
const resumenCostoManoObra = document.getElementById('resumen-costo-mano-obra');
const resumenCostoPackaging = document.getElementById('resumen-costo-packaging');
const costoTotalRecetaEl = document.getElementById('costo-total-receta');
const tablaRecetas = document.getElementById('tabla-recetas');

let inventarioInsumos = []; // Copia de los insumos de Firestore
let insumosEnReceta = [];   // Insumos agregados a la receta actual

// 1. Cargar insumos desde Firestore para llenar el selector
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

// 2. Agregar insumo a la receta
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

// Escuchar cambios en los inputs de Mano de Obra y Packaging
recetaHoras.addEventListener('input', calcularTotalesYRenderizar);
recetaPrecioHora.addEventListener('input', calcularTotalesYRenderizar);
recetaPackaging.addEventListener('input', calcularTotalesYRenderizar);

// Recalcular todos los subtotales y total final
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

// 3. Guardar Receta Completa en Firestore
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

  const nuevaReceta = {
    nombre: recetaNombre.value.trim(),
    rendimiento: recetaRendimiento.value.trim(),
    insumos: insumosEnReceta,
    costoInsumos: subtotalInsumos,
    horasTrabajo: horas,
    precioHora: precioHora,
    costoManoObra: costoManoObra,
    costoPackaging: packaging,
    costoTotal: costoTotalCalculado,
    creadoAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "recetas"), nuevaReceta);
    
    // Resetear formulario
    formReceta.reset();
    insumosEnReceta = [];
    recetaHoras.value = '0';
    recetaPrecioHora.value = '0';
    recetaPackaging.value = '0';
    calcularTotalesYRenderizar();
  } catch (error) {
    console.error("Error al guardar la receta:", error);
    alert("Ocurrió un error al guardar la receta.");
  }
});

// 4. Escuchar y mostrar recetas guardadas desde Firestore
onSnapshot(collection(db, "recetas"), (snapshot) => {
  tablaRecetas.innerHTML = '';

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
      await deleteDoc(doc(doc(db, "recetas", id).path));
    } catch (error) {
      // Fallback standard para deleteDoc
      try {
        await deleteDoc(doc(db, "recetas", id));
      } catch (err) {
        console.error("Error al eliminar receta:", err);
        alert("No se pudo eliminar la receta.");
      }
    }
  }
}