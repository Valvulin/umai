// ==========================================
//    Programa: Umai Recetas                  
//    Programo: Fernando Albornoz             
//     Archivo: js/app.js            
//     Version: 1.3 01-09-2026                
// ==========================================
import { db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. ESTADO GLOBAL & REFERENCIAS DOM
// ==========================================
let listaInsumosBase = [];

// Elementos Insumo Form
const formIngrediente = document.getElementById('form-ingrediente');
const ingNombre = document.getElementById('ing-nombre');
const ingUnidad = document.getElementById('ing-unidad');
const ingCantidad = document.getElementById('ing-cantidad');
const ingPrecio = document.getElementById('ing-precio');

// Elementos Receta Form
const recetaNombre = document.getElementById('receta-nombre');
const contenedorIngredientes = document.getElementById('contenedor-ingredientes-receta');
const btnAgregarIngrediente = document.getElementById('btn-agregar-ingrediente');
const recetaHoras = document.getElementById('receta-horas');
const recetaPrecioHora = document.getElementById('receta-precio-hora');
const recetaOtros = document.getElementById('receta-otros');
const recetaGanancia = document.getElementById('receta-ganancia');
const btnGuardarReceta = document.getElementById('btn-guardar-receta');

// Elementos Resumen Visual
const valCostoInsumos = document.getElementById('val-costo-insumos');
const valCostoManoObra = document.getElementById('val-costo-mano-obra');
const valCostoTotal = document.getElementById('val-costo-total');
const valPrecioVenta = document.getElementById('val-precio-venta');

// ==========================================
// 2. SINCRONIZACIÓN EN TIEMPO REAL CON FIRESTORE
// ==========================================
// Escuchar la colección de 'ingredientes'
onSnapshot(collection(db, "ingredientes"), (snapshot) => {
  listaInsumosBase = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Actualizar los selectores en las filas de la receta si existen
  actualizarSelectsInsumos();
  calcularTotales();
});

// ==========================================
// 3. REGISTRAR INSUMO BASE EN FIRESTORE
// ==========================================
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
    alert("Insumo guardado correctamente");
  } catch (error) {
    console.error("Error al guardar el insumo:", error);
    alert("Ocurrió un error al guardar el insumo.");
  }
});

// ==========================================
// 4. LÓGICA DINÁMICA DE LA RECETA
// ==========================================

// Agregar una fila de insumo a la receta
btnAgregarIngrediente.addEventListener('click', () => {
  agregarFilaInsumo();
});

function agregarFilaInsumo() {
  const fila = document.createElement('div');
  fila.className = 'grid-2-col fila-insumo';
  fila.style.marginBottom = '0.5rem';
  fila.style.alignItems = 'center';

  fila.innerHTML = `
    <div class="form-group">
      <select class="select-insumo-id">
        <option value="">-- Seleccionar Insumo --</option>
        ${generarOpcionesInsumos()}
      </select>
    </div>
    <div class="form-group" style="display: flex; gap: 0.5rem;">
      <input type="number" step="any" class="input-cantidad-usada" placeholder="Cant. a usar" value="0">
      <button type="button" class="btn btn-secondary btn-eliminar-fila" style="padding: 0.5rem 0.75rem; color: #ef4444;">✕</button>
    </div>
  `;

  // Evento para eliminar fila
  fila.querySelector('.btn-eliminar-fila').addEventListener('click', () => {
    fila.remove();
    calcularTotales();
  });

  // Eventos para recalcular al cambiar datos
  fila.querySelector('.select-insumo-id').addEventListener('change', calcularTotales);
  fila.querySelector('.input-cantidad-usada').addEventListener('input', calcularTotales);

  contenedorIngredientes.appendChild(fila);
}

function generarOpcionesInsumos() {
  return listaInsumosBase.map(ing => `
    <option value="${ing.id}">
      ${ing.nombre} (${ing.cantidad}${ing.unidad} - $${ing.precio})
    </option>
  `).join('');
}

function actualizarSelectsInsumos() {
  const selects = document.querySelectorAll('.select-insumo-id');
  selects.forEach(select => {
    const valorSeleccionado = select.value;
    select.innerHTML = `<option value="">-- Seleccionar Insumo --</option>` + generarOpcionesInsumos();
    select.value = valorSeleccionado;
  });
}

// Escuchar cambios en campos de costos adicionales
[recetaHoras, recetaPrecioHora, recetaOtros, recetaGanancia].forEach(input => {
  input.addEventListener('input', calcularTotales);
});

// ==========================================
// 5. CÁLCULO DE COSTOS
// ==========================================
function calcularTotales() {
  let acumuladoInsumos = 0;
  const filas = document.querySelectorAll('.fila-insumo');

  filas.forEach(fila => {
    const insumoId = fila.querySelector('.select-insumo-id').value;
    const cantidadUsada = parseFloat(fila.querySelector('.input-cantidad-usada').value) || 0;

    if (insumoId && cantidadUsada > 0) {
      const insumo = listaInsumosBase.find(i => i.id === insumoId);
      if (insumo && insumo.cantidad > 0) {
        // Costo Unitario por gramo/ml/unidad
        const costoUnitario = insumo.precio / insumo.cantidad;
        acumuladoInsumos += costoUnitario * cantidadUsada;
      }
    }
  });

  const hsManoObra = parseFloat(recetaHoras.value) || 0;
  const precioHora = parseFloat(recetaPrecioHora.value) || 0;
  const totalManoObra = hsManoObra * precioHora;

  const otros = parseFloat(recetaOtros.value) || 0;
// ✅ CORRECTO
  const porcentajeGanancia = parseFloat(recetaGanancia.value) || 0;

  const costoTotalProduccion = acumuladoInsumos + totalManoObra + otros;
  const precioVentaSugerido = costoTotalProduccion * (1 + (porcentajeGanancia / 100));

  // Actualizar UI
  valCostoInsumos.textContent = `$${acumuladoInsumos.toFixed(2)}`;
  valCostoManoObra.textContent = `$${totalManoObra.toFixed(2)}`;
  valCostoTotal.textContent = `$${costoTotalProduccion.toFixed(2)}`;
  valPrecioVenta.textContent = `$${precioVentaSugerido.toFixed(2)}`;

  return {
    acumuladoInsumos,
    totalManoObra,
    costoTotalProduccion,
    precioVentaSugerido
  };
}

// ==========================================
// 6. GUARDAR RECETA COMPLETA EN FIRESTORE
// ==========================================
btnGuardarReceta.addEventListener('click', async () => {
  const nombre = recetaNombre.value.trim();
  if (!nombre) {
    alert("Por favor, ingresá un nombre para la receta.");
    return;
  }

  const filas = document.querySelectorAll('.fila-insumo');
  const insumosReceta = [];

  filas.forEach(fila => {
    const idIngrediente = fila.querySelector('.select-insumo-id').value;
    const cantidadUsada = parseFloat(fila.querySelector('.input-cantidad-usada').value) || 0;

    if (idIngrediente && cantidadUsada > 0) {
      insumosReceta.push({
        idIngrediente,
        cantidadUsada
      });
    }
  });

  if (insumosReceta.length === 0) {
    alert("Agregá al menos un insumo con cantidad válida a la receta.");
    return;
  }

  const totales = calcularTotales();

  const recetaCompleta = {
    nombre,
    insumos: insumosReceta,
    horasManoDeObra: parseFloat(recetaHoras.value) || 0,
    costoHoraManoDeObra: parseFloat(recetaPrecioHora.value) || 0,
    otrosInsumos: parseFloat(recetaOtros.value) || 0,
    porcentajeGanancia: parseFloat(recetaGanancia.value) || 0,
    costoInsumosCalculado: totales.acumuladoInsumos,
    costoTotalProduccion: totales.costoTotalProduccion,
    precioVentaSugerido: totales.precioVentaSugerido,
    creadoAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "recetas"), recetaCompleta);
    alert("¡Receta guardada con éxito en Firestore!");
    
    // Limpiar Formulario de Receta
    recetaNombre.value = '';
    contenedorIngredientes.innerHTML = '';
    recetaHoras.value = '0';
    recetaPrecioHora.value = '0';
    recetaOtros.value = '0';
    recetaGanancia.value = '100';
    calcularTotales();

  } catch (error) {
    console.error("Error al guardar la receta:", error);
    alert("Ocurrió un error al guardar la receta.");
  }
});