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
const formPresupuesto = document.getElementById('form-presupuesto');
const presCliente = document.getElementById('pres-cliente');
const presFecha = document.getElementById('pres-fecha');
const selectReceta = document.getElementById('select-receta');
const recetaCantidad = document.getElementById('receta-cantidad');
const btnAgregarReceta = document.getElementById('btn-agregar-receta');
const listaRecetasPresupuesto = document.getElementById('lista-recetas-presupuesto');

const presMargen = document.getElementById('pres-margen');
const presExtras = document.getElementById('pres-extras');

const resumenCostoBase = document.getElementById('resumen-costo-base');
const resumenExtras = document.getElementById('resumen-extras');
const resumenPrecioFinal = document.getElementById('resumen-precio-final');
const tablaPresupuestos = document.getElementById('tabla-presupuestos');

let inventarioRecetas = [];
let recetasEnPresupuesto = [];

// 1. Cargar recetas disponibles
onSnapshot(collection(db, "recetas"), (snapshot) => {
  inventarioRecetas = [];
  selectReceta.innerHTML = '<option value="">-- Seleccionar Receta --</option>';

  snapshot.docs.forEach(docSnap => {
    const item = { id: docSnap.id, ...docSnap.data() };
    inventarioRecetas.push(item);

    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.nombre} ($${parseFloat(item.costoTotal || 0).toFixed(2)})`;
    selectReceta.appendChild(option);
  });
});

// 2. Agregar receta a la cotización activa
btnAgregarReceta.addEventListener('click', () => {
  const recetaId = selectReceta.value;
  const cantidad = parseInt(recetaCantidad.value, 10);

  if (!recetaId || isNaN(cantidad) || cantidad <= 0) {
    alert("Seleccioná una receta e indicá una cantidad válida.");
    return;
  }

  const recetaBase = inventarioRecetas.find(r => r.id === recetaId);
  if (!recetaBase) return;

  const costoSubtotal = (recetaBase.costoTotal || 0) * cantidad;

  recetasEnPresupuesto.push({
    recetaId: recetaBase.id,
    nombre: recetaBase.nombre,
    cantidad: cantidad,
    costoUnitario: recetaBase.costoTotal || 0,
    costoSubtotal: costoSubtotal
  });

  selectReceta.value = '';
  recetaCantidad.value = '1';

  calcularYRenderizar();
});

// Recalcular al cambiar margen o extras
presMargen.addEventListener('input', calcularYRenderizar);
presExtras.addEventListener('input', calcularYRenderizar);

function calcularYRenderizar() {
  listaRecetasPresupuesto.innerHTML = '';
  let costoBaseTotal = 0;

  recetasEnPresupuesto.forEach((item, index) => {
    costoBaseTotal += item.costoSubtotal;

    const row = document.createElement('div');
    row.className = 'receta-row';
    row.innerHTML = `
      <span><strong>${item.nombre}</strong> x ${item.cantidad} ($${item.costoSubtotal.toFixed(2)})</span>
      <button type="button" class="btn-delete" style="font-size:0.8rem;">Quitar</button>
    `;

    row.querySelector('.btn-delete').addEventListener('click', () => {
      recetasEnPresupuesto.splice(index, 1);
      calcularYRenderizar();
    });

    listaRecetasPresupuesto.appendChild(row);
  });

  const margenPct = parseFloat(presMargen.value) || 0;
  const extras = parseFloat(presExtras.value) || 0;

  const precioConMargen = costoBaseTotal * (1 + (margenPct / 100));
  const precioFinal = precioConMargen + extras;

  resumenCostoBase.textContent = `$${costoBaseTotal.toFixed(2)}`;
  resumenExtras.textContent = `$${extras.toFixed(2)}`;
  resumenPrecioFinal.textContent = `$${precioFinal.toFixed(2)}`;
}

// 3. Guardar Presupuesto en Firestore
formPresupuesto.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (recetasEnPresupuesto.length === 0) {
    alert("Agregá al menos una receta al presupuesto.");
    return;
  }

  const costoBaseTotal = recetasEnPresupuesto.reduce((acc, curr) => acc + curr.costoSubtotal, 0);
  const margenPct = parseFloat(presMargen.value) || 0;
  const extras = parseFloat(presExtras.value) || 0;
  const precioFinal = (costoBaseTotal * (1 + (margenPct / 100))) + extras;

  const nuevoPresupuesto = {
    cliente: presCliente.value.trim(),
    fechaEvento: presFecha.value,
    recetas: recetasEnPresupuesto,
    costoBase: costoBaseTotal,
    margenAplicado: margenPct,
    extras: extras,
    precioFinal: precioFinal,
    creadoAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "presupuestos"), nuevoPresupuesto);

    formPresupuesto.reset();
    recetasEnPresupuesto = [];
    presMargen.value = '100';
    presExtras.value = '0';
    calcularYRenderizar();
  } catch (error) {
    console.error("Error al guardar presupuesto:", error);
    alert("Ocurrió un error al guardar el presupuesto.");
  }
});

// 4. Escuchar Presupuestos en Firestore
onSnapshot(collection(db, "presupuestos"), (snapshot) => {
  tablaPresupuestos.innerHTML = '';

  if (snapshot.empty) {
    tablaPresupuestos.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay presupuestos generados.
        </td>
      </tr>`;
    return;
  }

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${data.cliente}</strong></td>
      <td>${data.fechaEvento || '-'}</td>
      <td>$${parseFloat(data.costoBase || 0).toFixed(2)}</td>
      <td><strong>$${parseFloat(data.precioFinal || 0).toFixed(2)}</strong></td>
      <td>
        <button class="btn-delete" data-id="${id}">Eliminar</button>
      </td>
    `;

    fila.querySelector('.btn-delete').addEventListener('click', () => eliminarPresupuesto(id, data.cliente));

    tablaPresupuestos.appendChild(fila);
  });
});

// 5. Eliminar Presupuesto
async function eliminarPresupuesto(id, cliente) {
  if (confirm(`¿Estás seguro de borrar el presupuesto de "${cliente}"?`)) {
    try {
      await deleteDoc(doc(db, "presupuestos", id));
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      alert("No se pudo eliminar el presupuesto.");
    }
  }
}