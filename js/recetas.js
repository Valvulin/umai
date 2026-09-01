/* ========================================== */
/*    Programa: Umai Recetas                  */
/*    Programo: Fernando Albornoz             */
/*     Archivo: js/recetas.js                 */
/*     Version: 1.2 01-09-2026                */
/* ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  let recetas = JSON.parse(localStorage.getItem('umai_recetas')) || [];
  let ingredientes = JSON.parse(localStorage.getItem('umai_ingredientes')) || [];
  let ingredientesSeleccionados = [];

  const formReceta = document.getElementById('form-receta');
  const inputId = document.getElementById('receta-id');
  const inputNombre = document.getElementById('receta-nombre');
  const inputRendimiento = document.getElementById('receta-rendimiento');
  const selectIngrediente = document.getElementById('select-ingrediente');
  const inputCantidad = document.getElementById('ingrediente-cantidad');
  const btnAgregarIngrediente = document.getElementById('btn-agregar-ingrediente');
  const listaIngredientesDiv = document.getElementById('lista-ingredientes-receta');
  const btnCancelar = document.getElementById('btn-cancelar-receta');
  const tablaRecetas = document.getElementById('tabla-recetas');
  const resumenCosto = document.getElementById('resumen-costo-receta');

  const modal = document.getElementById('modal-receta');
  const modalBody = document.getElementById('modal-body-receta');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal-receta');

  // Cargar selector de ingredientes
  function cargarSelectorIngredientes() {
    selectIngrediente.innerHTML = '<option value="">Seleccione un ingrediente...</option>';
    ingredientes.forEach(ing => {
      const option = document.createElement('option');
      option.value = ing.id;
      option.textContent = `${ing.nombre} ($${parseFloat(ing.precio || 0).toFixed(2)} / ${ing.unidad})`;
      selectIngrediente.appendChild(option);
    });
  }

  // Agregar ingrediente
  btnAgregarIngrediente.addEventListener('click', () => {
    const ingId = selectIngrediente.value;
    const cantidad = parseFloat(inputCantidad.value) || 0;

    if (!ingId || cantidad <= 0) {
      alert('Seleccione un ingrediente e ingrese una cantidad válida.');
      return;
    }

    const ingObj = ingredientes.find(i => i.id == ingId);
    if (!ingObj) return;

    const costoCalculado = (parseFloat(ingObj.precio) / parseFloat(ingObj.cantidad)) * cantidad;

    ingredientesSeleccionados.push({
      ingredienteId: ingObj.id,
      nombre: ingObj.nombre,
      unidad: ingObj.unidad,
      cantidadUsada: cantidad,
      costoCalculado: costoCalculado
    });

    inputCantidad.value = '';
    selectIngrediente.value = '';
    renderListaIngredientes();
  });

  function renderListaIngredientes() {
    listaIngredientesDiv.innerHTML = '';
    if (ingredientesSeleccionados.length === 0) {
      listaIngredientesDiv.innerHTML = '<p style="font-size: 0.85rem; color: #64748b; text-align: center;">No hay ingredientes agregados.</p>';
      calcularCostoTotal();
      return;
    }

    ingredientesSeleccionados.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'ingrediente-row';
      row.innerHTML = `
        <div>
          <strong>${item.nombre}</strong>: ${item.cantidadUsada} ${item.unidad}
          <div style="font-size: 0.8rem; color: #64748b;">Costo: $${item.costoCalculado.toFixed(2)}</div>
        </div>
        <button type="button" class="btn-delete" onclick="eliminarIngredienteItem(${index})">✕</button>
      `;
      listaIngredientesDiv.appendChild(row);
    });

    calcularCostoTotal();
  }

  window.eliminarIngredienteItem = function(index) {
    ingredientesSeleccionados.splice(index, 1);
    renderListaIngredientes();
  };

  function calcularCostoTotal() {
    const total = ingredientesSeleccionados.reduce((acc, item) => acc + item.costoCalculado, 0);
    resumenCosto.textContent = `$${total.toFixed(2)}`;
    return total;
  }

  // Guardar Receta
  formReceta.addEventListener('submit', (e) => {
    e.preventDefault();

    if (ingredientesSeleccionados.length === 0) {
      alert('Debe agregar al menos un ingrediente a la receta.');
      return;
    }

    const id = inputId.value ? parseInt(inputId.value) : Date.now();
    const nombre = inputNombre.value.trim();
    const rendimiento = parseInt(inputRendimiento.value) || 1;
    const costoTotal = calcularCostoTotal();

    const nuevaReceta = {
      id,
      nombre,
      rendimiento,
      ingredientes: [...ingredientesSeleccionados],
      costoTotal
    };

    if (inputId.value) {
      const index = recetas.findIndex(r => r.id == id);
      if (index >= 0) recetas[index] = nuevaReceta;
    } else {
      recetas.push(nuevaReceta);
    }

    localStorage.setItem('umai_recetas', JSON.stringify(recetas));
    resetFormulario();
    cargarTablaRecetas();
  });

  function resetFormulario() {
    formReceta.reset();
    inputId.value = '';
    ingredientesSeleccionados = [];
    inputRendimiento.value = 1;
    btnCancelar.style.display = 'none';
    renderListaIngredientes();
  }

  btnCancelar.addEventListener('click', resetFormulario);

  // Cargar Tabla de Recetas
  function cargarTablaRecetas() {
    tablaRecetas.innerHTML = '';

    if (recetas.length === 0) {
      tablaRecetas.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No hay recetas guardadas.</td></tr>';
      return;
    }

    recetas.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${r.nombre}</strong></td>
        <td>${r.rendimiento} porciones</td>
        <td>$${parseFloat(r.costoTotal || 0).toFixed(2)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-action btn-ver" onclick="verReceta(${r.id})" title="Ver Detalle">👁️</button>
            <button class="btn-action btn-editar" onclick="descargarPDFReceta(${r.id})" title="Descargar PDF" style="background-color: #f0fdf4; border-color: #bbf7d0; color: #166534;">📄</button>
            <button class="btn-action btn-editar" onclick="editarReceta(${r.id})" title="Editar">✏️</button>
            <button class="btn-action btn-borrar" onclick="eliminarReceta(${r.id})" title="Borrar">🗑️</button>
          </div>
        </td>
      `;
      tablaRecetas.appendChild(tr);
    });
  }

  // Modales
  window.verReceta = function(id) {
    const r = recetas.find(item => item.id == id);
    if (!r) return;

    let itemsHtml = r.ingredientes.map(i => `
      <li style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px dashed #e2e8f0;">
        <span>${i.nombre} (${i.cantidadUsada} ${i.unidad})</span>
        <span>$${parseFloat(i.costoCalculado).toFixed(2)}</span>
      </li>
    `).join('');

    const costoPorcion = r.costoTotal / r.rendimiento;

    modalBody.innerHTML = `
      <h3 style="margin-bottom: 0.5rem; color: #5247e6;">${r.nombre}</h3>
      <p style="margin-bottom: 1rem; color: #64748b;">Rendimiento: <strong>${r.rendimiento} porciones</strong></p>
      <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Ingredientes:</h4>
      <ul style="list-style: none; padding: 0; margin-bottom: 1rem;">
        ${itemsHtml}
      </ul>
      <div style="background-color: #f8fafc; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between;">
          <span>Costo Total:</span> <span>$${parseFloat(r.costoTotal).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-top: 0.25rem; border-top: 1px solid #cbd5e1; padding-top: 0.25rem;">
          <span>Costo por Porción:</span> <span>$${costoPorcion.toFixed(2)}</span>
        </div>
      </div>
      <div style="margin-top: 1rem; text-align: right;">
        <button class="btn" onclick="descargarPDFReceta(${r.id})" style="background-color: #10b981;">📄 Descargar PDF</button>
      </div>
    `;

    modal.style.display = 'flex';
  };

  btnCerrarModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  window.editarReceta = function(id) {
    const r = recetas.find(item => item.id == id);
    if (!r) return;

    inputId.value = r.id;
    inputNombre.value = r.nombre;
    inputRendimiento.value = r.rendimiento;
    ingredientesSeleccionados = [...r.ingredientes];

    btnCancelar.style.display = 'block';
    renderListaIngredientes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.eliminarReceta = function(id) {
    if (confirm('¿Está seguro de eliminar esta receta?')) {
      recetas = recetas.filter(r => r.id != id);
      localStorage.setItem('umai_recetas', JSON.stringify(recetas));
      cargarTablaRecetas();
    }
  };

  // Descarga PDF de la Receta
  window.descargarPDFReceta = function(id) {
    const r = recetas.find(item => item.id == id);
    if (!r) return;

    const filasTabla = r.ingredientes.map(i => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${i.nombre}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px;">${i.cantidadUsada} ${i.unidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px;">$${parseFloat(i.costoCalculado).toFixed(2)}</td>
      </tr>
    `).join('');

    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '30px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.color = '#1e293b';

    pdfContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #5247e6; padding-bottom: 15px; margin-bottom: 25px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="icon-192.png" alt="Logo" style="width: 60px; height: 60px; object-fit: contain;" />
          <div>
            <h1 style="margin: 0; color: #5247e6; font-size: 24px;">RECETA: ${r.nombre.toUpperCase()}</h1>
            <span style="font-size: 13px; color: #64748b;">Umai Recetas</span>
          </div>
        </div>
      </div>

      <p style="font-size: 15px; margin-bottom: 20px;"><strong>Rendimiento:</strong> ${r.rendimiento} porciones</p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #475569;">
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left;">INGREDIENTE</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: center;">CANTIDAD</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right;">COSTO</th>
          </tr>
        </thead>
        <tbody>
          ${filasTabla}
        </tbody>
      </table>

      <div style="text-align: right; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 5px 0; font-size: 14px;">Costo Total Receta: <strong>$${parseFloat(r.costoTotal).toFixed(2)}</strong></p>
        <p style="margin: 0; font-size: 16px; color: #5247e6;">Costo por Porción: <strong>$${(r.costoTotal / r.rendimiento).toFixed(2)}</strong></p>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `Receta_${r.nombre.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save();
  };

  // Inicialización
  cargarSelectorIngredientes();
  cargarTablaRecetas();
});