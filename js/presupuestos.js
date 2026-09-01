/* ========================================== */
/*    Programa: Umai Recetas                  */
/*    Programo: Fernando Albornoz             */
/*     Archivo: js/presupuestos.js            */
/*     Version: 1.2 01-09-2026                */
/* ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  let presupuestos = JSON.parse(localStorage.getItem('umai_presupuestos')) || [];
  let recetas = JSON.parse(localStorage.getItem('umai_recetas')) || [];
  let recetasSeleccionadas = [];

  const formPresupuesto = document.getElementById('form-presupuesto');
  const inputId = document.getElementById('presupuesto-id');
  const inputCliente = document.getElementById('cliente-nombre');
  const inputFecha = document.getElementById('presupuesto-fecha');
  const selectReceta = document.getElementById('select-receta');
  const inputCantidad = document.getElementById('receta-cantidad');
  const btnAgregarReceta = document.getElementById('btn-agregar-receta');
  const listaRecetasDiv = document.getElementById('lista-recetas-presupuesto');
  const inputMargen = document.getElementById('margen-ganancia');
  const btnCancelar = document.getElementById('btn-cancelar');
  const tablaPresupuestos = document.getElementById('tabla-presupuestos');

  const resumenCostoBase = document.getElementById('resumen-costo-base');
  const resumenGanancia = document.getElementById('resumen-ganancia');
  const resumenPrecioFinal = document.getElementById('resumen-precio-final');

  const modal = document.getElementById('modal-presupuesto');
  const modalBody = document.getElementById('modal-body');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal');

  // Establecer fecha de hoy por defecto
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }

  // Cargar selector de recetas
  function cargarSelectorRecetas() {
    selectReceta.innerHTML = '<option value="">Seleccione una receta...</option>';
    recetas.forEach(rec => {
      const option = document.createElement('option');
      option.value = rec.id;
      option.textContent = `${rec.nombre} ($${parseFloat(rec.costoTotal || 0).toFixed(2)})`;
      selectReceta.appendChild(option);
    });
  }

  // Agregar Receta a la lista actual
  btnAgregarReceta.addEventListener('click', () => {
    const recetaId = selectReceta.value;
    const cantidad = parseFloat(inputCantidad.value) || 1;

    if (!recetaId) {
      alert('Por favor seleccione una receta.');
      return;
    }

    const recetaObj = recetas.find(r => r.id == recetaId);
    if (!recetaObj) return;

    // Verificar si ya existe en la lista
    const existeIndex = recetasSeleccionadas.findIndex(r => r.recetaId == recetaId);
    if (existeIndex >= 0) {
      recetasSeleccionadas[existeIndex].cantidad += cantidad;
    } else {
      recetasSeleccionadas.push({
        recetaId: recetaObj.id,
        nombre: recetaObj.nombre,
        costoUnitario: parseFloat(recetaObj.costoTotal || 0),
        cantidad: cantidad
      });
    }

    inputCantidad.value = 1;
    selectReceta.value = '';
    renderListaRecetas();
  });

  function renderListaRecetas() {
    listaRecetasDiv.innerHTML = '';
    if (recetasSeleccionadas.length === 0) {
      listaRecetasDiv.innerHTML = '<p style="font-size: 0.85rem; color: #64748b; text-align: center;">No hay recetas agregadas a este presupuesto.</p>';
      calcularTotales();
      return;
    }

    recetasSeleccionadas.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'receta-row';
      const subtotal = item.costoUnitario * item.cantidad;

      row.innerHTML = `
        <div>
          <strong>${item.nombre}</strong> x ${item.cantidad}
          <div style="font-size: 0.8rem; color: #64748b;">Subtotal costo: $${subtotal.toFixed(2)}</div>
        </div>
        <button type="button" class="btn-delete" onclick="eliminarRecetaItem(${index})">✕</button>
      `;
      listaRecetasDiv.appendChild(row);
    });

    calcularTotales();
  }

  window.eliminarRecetaItem = function(index) {
    recetasSeleccionadas.splice(index, 1);
    renderListaRecetas();
  };

  function calcularTotales() {
    const costoBase = recetasSeleccionadas.reduce((acc, item) => acc + (item.costoUnitario * item.cantidad), 0);
    const porcentajeGanancia = parseFloat(inputMargen.value) || 0;
    const ganancia = costoBase * (porcentajeGanancia / 100);
    const precioFinal = costoBase + ganancia;

    resumenCostoBase.textContent = `$${costoBase.toFixed(2)}`;
    resumenGanancia.textContent = `$${ganancia.toFixed(2)}`;
    resumenPrecioFinal.textContent = `$${precioFinal.toFixed(2)}`;

    return { costoBase, ganancia, precioFinal, porcentajeGanancia };
  }

  inputMargen.addEventListener('input', calcularTotales);

  // Guardar Presupuesto
  formPresupuesto.addEventListener('submit', (e) => {
    e.preventDefault();

    if (recetasSeleccionadas.length === 0) {
      alert('Debe agregar al menos una receta al presupuesto.');
      return;
    }

    const id = inputId.value ? parseInt(inputId.value) : Date.now();
    const cliente = inputCliente.value.trim();
    const fecha = inputFecha.value;
    const totales = calcularTotales();

    const nuevoPresupuesto = {
      id,
      cliente,
      fecha,
      recetas: [...recetasSeleccionadas],
      costoBase: totales.costoBase,
      porcentajeGanancia: totales.porcentajeGanancia,
      ganancia: totales.ganancia,
      precioFinal: totales.precioFinal
    };

    if (inputId.value) {
      const index = presupuestos.findIndex(p => p.id == id);
      if (index >= 0) presupuestos[index] = nuevoPresupuesto;
    } else {
      presupuestos.push(nuevoPresupuesto);
    }

    localStorage.setItem('umai_presupuestos', JSON.stringify(presupuestos));
    resetFormulario();
    cargarTablaPresupuestos();
  });

  function resetFormulario() {
    formPresupuesto.reset();
    inputId.value = '';
    recetasSeleccionadas = [];
    inputFecha.value = new Date().toISOString().split('T')[0];
    inputMargen.value = 50;
    btnCancelar.style.display = 'none';
    renderListaRecetas();
  }

  btnCancelar.addEventListener('click', resetFormulario);

  // Cargar Tabla de Presupuestos
  function cargarTablaPresupuestos() {
    tablaPresupuestos.innerHTML = '';

    if (presupuestos.length === 0) {
      tablaPresupuestos.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No hay presupuestos guardados.</td></tr>';
      return;
    }

    presupuestos.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.fecha}</td>
        <td><strong>${p.cliente}</strong></td>
        <td>$${parseFloat(p.precioFinal || 0).toFixed(2)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-action btn-ver" onclick="verPresupuesto(${p.id})" title="Ver Detalle">👁️</button>
            <button class="btn-action btn-editar" onclick="descargarPDF(${p.id})" title="Descargar PDF" style="background-color: #f0fdf4; border-color: #bbf7d0; color: #166534;">📄</button>
            <button class="btn-action btn-editar" onclick="editarPresupuesto(${p.id})" title="Editar">✏️</button>
            <button class="btn-action btn-borrar" onclick="eliminarPresupuesto(${p.id})" title="Borrar">🗑️</button>
          </div>
        </td>
      `;
      tablaPresupuestos.appendChild(tr);
    });
  }

  // Modales
  window.verPresupuesto = function(id) {
    const p = presupuestos.find(item => item.id == id);
    if (!p) return;

    let itemsHtml = p.recetas.map(r => `
      <li style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px dashed #e2e8f0;">
        <span><strong>${r.nombre}</strong> (x${r.cantidad})</span>
        <span>$${(r.costoUnitario * r.cantidad).toFixed(2)}</span>
      </li>
    `).join('');

    modalBody.innerHTML = `
      <p style="margin-bottom: 0.5rem;"><strong>Cliente:</strong> ${p.cliente}</p>
      <p style="margin-bottom: 1rem;"><strong>Fecha:</strong> ${p.fecha}</p>
      <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Detalle de Recetas:</h4>
      <ul style="list-style: none; padding: 0; margin-bottom: 1rem;">
        ${itemsHtml}
      </ul>
      <div style="background-color: #f8fafc; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between;">
          <span>Costo Base:</span> <span>$${parseFloat(p.costoBase).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Ganancia (${p.porcentajeGanancia}%):</span> <span>$${parseFloat(p.ganancia).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-top: 0.5rem; border-top: 1px solid #cbd5e1; padding-top: 0.5rem;">
          <span>Precio Final:</span> <span>$${parseFloat(p.precioFinal).toFixed(2)}</span>
        </div>
      </div>
      <div style="margin-top: 1rem; text-align: right;">
        <button class="btn" onclick="descargarPDF(${p.id})" style="background-color: #10b981;">📄 Descargar PDF</button>
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

  window.editarPresupuesto = function(id) {
    const p = presupuestos.find(item => item.id == id);
    if (!p) return;

    inputId.value = p.id;
    inputCliente.value = p.cliente;
    inputFecha.value = p.fecha;
    inputMargen.value = p.porcentajeGanancia;
    recetasSeleccionadas = [...p.recetas];

    btnCancelar.style.display = 'block';
    renderListaRecetas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.eliminarPresupuesto = function(id) {
    if (confirm('¿Está seguro de eliminar este presupuesto?')) {
      presupuestos = presupuestos.filter(p => p.id != id);
      localStorage.setItem('umai_presupuestos', JSON.stringify(presupuestos));
      cargarTablaPresupuestos();
    }
  };

  // ==========================================
  // GENERACIÓN DE PDF PROFESIONAL
  // ==========================================
  window.descargarPDF = function(id) {
    const p = presupuestos.find(item => item.id == id);
    if (!p) return;

    const factorGanancia = 1 + ((parseFloat(p.porcentajeGanancia) || 0) / 100);

    // Filas del PDF con precio venta público (incluyendo la ganancia implícita)
    const filasTabla = p.recetas.map(r => {
      const precioUnitarioVenta = r.costoUnitario * factorGanancia;
      const subtotalVenta = precioUnitarioVenta * r.cantidad;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${r.nombre}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px;">${r.cantidad}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px;">$${precioUnitarioVenta.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 600;">$${subtotalVenta.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Plantilla HTML del documento a exportar
    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '30px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.color = '#1e293b';
    pdfContainer.style.backgroundColor = '#ffffff';

    pdfContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #5247e6; padding-bottom: 15px; margin-bottom: 25px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="icon-192.png" alt="Logo" style="width: 60px; height: 60px; object-fit: contain;" />
          <div>
            <h1 style="margin: 0; color: #5247e6; font-size: 26px; text-transform: uppercase; letter-spacing: 1px;">PRESUPUESTO</h1>
            <span style="font-size: 13px; color: #64748b;">Umai Recetas</span>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 14px;"><strong>Fecha:</strong> ${p.fecha}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Presupuesto N°:</strong> #${p.id.toString().slice(-5)}</p>
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 15px;"><strong>Cliente:</strong> ${p.cliente}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #475569; text-align: left;">
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 13px;">DESCRIPCIÓN</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: center; font-size: 13px;">CANT.</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right; font-size: 13px;">PRECIO UNIT.</th>
            <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right; font-size: 13px;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${filasTabla}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <div style="width: 250px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: right;">
          <span style="font-size: 13px; color: #166534; display: block; margin-bottom: 5px;">TOTAL A PAGAR</span>
          <span style="font-size: 22px; font-weight: 700; color: #15803d;">$${parseFloat(p.precioFinal).toFixed(2)}</span>
        </div>
      </div>

      <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #94a3b8;">
        Gracias por su confianza. Presupuesto válido por 15 días.
      </div>
    `;

    // Opciones de configuración de html2pdf
    const opt = {
      margin:       10,
      filename:     `Presupuesto_${p.cliente.replace(/\s+/g, '_')}_${p.fecha}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save();
  };

  // Inicialización
  cargarSelectorRecetas();
  cargarTablaPresupuestos();
});