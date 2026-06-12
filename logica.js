// ════════════════════════════════════════════════════════
// BURGERY GO — LÓGICA
// ════════════════════════════════════════════════════════

// ── STATE ────────────────────────────────────────────────
let state = {
  recetas: [],
  jornadas: [],
  caja: { movimientos: [] }
};

function loadState() {
  try {
    const saved = localStorage.getItem('burgerygo_v1');
    if (saved) state = JSON.parse(saved);
  } catch (e) {}
  if (!state.caja) state.caja = { movimientos: [] };
}

function saveState() {
  localStorage.setItem('burgerygo_v1', JSON.stringify(state));
}

// ── NAVEGACIÓN ───────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const map = { recetas: 0, jornadas: 1, caja: 2, dashboard: 3 };
  document.querySelectorAll('nav button')[map[id]].classList.add('active');
  if (id === 'dashboard') renderDashboard();
  if (id === 'caja') renderCaja();
}

// ── TOAST ────────────────────────────────────────────────
function showToast(msg = '✓ Guardado') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── UTILIDADES ───────────────────────────────────────────
function fmt(n) {
  return '$' + Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ════════════════════════════════════════════════════════
// RECETAS
// ════════════════════════════════════════════════════════
let ingredienteCount = 0;

function addIngrediente(nombre = '', unidad = 'gr', cantidad = '', precio = '') {
  ingredienteCount++;
  const id = `ingr-${ingredienteCount}`;
  const container = document.getElementById('ingredientes-container');
  const div = document.createElement('div');
  div.className = 'ingr-row';
  div.id = id;
  div.innerHTML = `
    <input type="text"   placeholder="Ej: Carne molida"  class="i-nombre"   value="${nombre}" />
    <select class="i-unidad">
      <option ${unidad === 'gr'       ? 'selected' : ''}>gr</option>
      <option ${unidad === 'kg'       ? 'selected' : ''}>kg</option>
      <option ${unidad === 'ml'       ? 'selected' : ''}>ml</option>
      <option ${unidad === 'lt'       ? 'selected' : ''}>lt</option>
      <option ${unidad === 'unidad'   ? 'selected' : ''}>unidad</option>
      <option ${unidad === 'rebanada' ? 'selected' : ''}>rebanada</option>
    </select>
    <input type="number" placeholder="150"  class="i-cantidad" value="${cantidad}" min="0" step="any" />
    <input type="number" placeholder="1200" class="i-precio"   value="${precio}"   min="0" step="any" />
    <button class="del-btn" onclick="removeRow('${id}')">×</button>
  `;
  container.appendChild(div);
}

function removeRow(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function calcularReceta() {
  const rows = document.querySelectorAll('#ingredientes-container .ingr-row');
  let costoTotal = 0;

  rows.forEach(row => {
    const cant   = parseFloat(row.querySelector('.i-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.i-precio').value)   || 0;
    const unidad = row.querySelector('.i-unidad').value;
    let costoPorUnidad = 0;

    if      (unidad === 'gr') costoPorUnidad = (precio / 1000) * cant;
    else if (unidad === 'ml') costoPorUnidad = (precio / 1000) * cant;
    else                      costoPorUnidad = precio * cant;

    costoTotal += costoPorUnidad;
  });

  const margen     = parseFloat(document.getElementById('r-margen').value)  || 60;
  const gastosOp   = parseFloat(document.getElementById('r-gastos').value)  || 15;
  const precioManual = parseFloat(document.getElementById('r-precio').value) || 0;

  const costoConGastos = costoTotal * (1 + gastosOp / 100);
  const precioSugerido = precioManual > 0
    ? precioManual
    : costoConGastos / (1 - margen / 100);

  const ganancia   = precioSugerido - costoTotal;
  const margenReal = precioSugerido > 0
    ? ((ganancia / precioSugerido) * 100).toFixed(1)
    : 0;

  document.getElementById('rr-costo').textContent  = fmt(costoTotal);
  document.getElementById('rr-precio').textContent = fmt(precioSugerido);

  const gEl = document.getElementById('rr-ganancia');
  gEl.textContent = `${fmt(ganancia)} (${margenReal}%)`;
  gEl.className   = 'val ' + (ganancia >= 0 ? 'green' : 'red');

  document.getElementById('r-resultado').style.display = 'block';

  return { costoTotal, precioSugerido, ganancia, margenReal };
}

function getIngredientes() {
  const rows  = document.querySelectorAll('#ingredientes-container .ingr-row');
  const items = [];
  rows.forEach(row => {
    const nombre   = row.querySelector('.i-nombre').value.trim();
    const unidad   = row.querySelector('.i-unidad').value;
    const cantidad = parseFloat(row.querySelector('.i-cantidad').value) || 0;
    const precio   = parseFloat(row.querySelector('.i-precio').value)   || 0;
    if (nombre) items.push({ nombre, unidad, cantidad, precio });
  });
  return items;
}

function guardarReceta() {
  const nombre = document.getElementById('r-nombre').value.trim();
  if (!nombre) { alert('Poné un nombre al producto.'); return; }

  const ingredientes = getIngredientes();
  if (!ingredientes.length) { alert('Agregá al menos un ingrediente.'); return; }

  const calcs  = calcularReceta();
  const receta = {
    id:          uid(),
    nombre,
    categoria:   document.getElementById('r-categoria').value,
    ingredientes,
    margen:      parseFloat(document.getElementById('r-margen').value) || 60,
    gastosOp:    parseFloat(document.getElementById('r-gastos').value) || 15,
    precioVenta: parseFloat(document.getElementById('r-precio').value) || calcs.precioSugerido,
    costo:       calcs.costoTotal,
    ganancia:    calcs.ganancia
  };

  state.recetas.push(receta);
  saveState();
  renderRecipes();
  resetRecetaForm();
  showToast('✓ Receta guardada');
}

function resetRecetaForm() {
  document.getElementById('r-nombre').value = '';
  document.getElementById('r-precio').value = '';
  document.getElementById('ingredientes-container').innerHTML = '';
  document.getElementById('r-resultado').style.display = 'none';
  ingredienteCount = 0;
  addIngrediente();
}

function deleteReceta(id) {
  if (!confirm('¿Eliminar esta receta?')) return;
  state.recetas = state.recetas.filter(r => r.id !== id);
  saveState();
  renderRecipes();
}

function renderRecipes() {
  const container = document.getElementById('recipes-container');
  if (!state.recetas.length) {
    container.innerHTML = '<div class="empty"><span class="emoji">🍔</span>Todavía no hay recetas. ¡Agregá la primera!</div>';
    return;
  }
  container.innerHTML = state.recetas.map(r => {
    const margenPct   = r.precioVenta > 0 ? ((r.ganancia / r.precioVenta) * 100).toFixed(0) : 0;
    const margenClass = margenPct >= 40 ? 'green' : margenPct >= 20 ? 'amber' : 'red';
    return `
      <div class="recipe-card">
        <div>
          <div class="recipe-name">${r.nombre}</div>
          <div class="recipe-meta">${r.categoria} · ${r.ingredientes.length} ingredientes</div>
        </div>
        <div class="recipe-stats">
          <div class="stat-item">
            <div class="s-val" style="color:var(--muted)">${fmt(r.costo)}</div>
            <div class="s-lbl">Costo</div>
          </div>
          <div class="stat-item">
            <div class="s-val">${fmt(r.precioVenta)}</div>
            <div class="s-lbl">Precio venta</div>
          </div>
          <div class="stat-item">
            <div class="s-val" style="color:var(--${margenClass})">${margenPct}%</div>
            <div class="s-lbl">Margen</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="deleteReceta('${r.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════
// JORNADAS
// ════════════════════════════════════════════════════════
let jProductoCount = 0;
let jGastoCount    = 0;

function addProductoJornada(nombre = '', cantidad = '', precio = '') {
  jProductoCount++;
  const id        = `jp-${jProductoCount}`;
  const container = document.getElementById('j-productos-container');
  const div       = document.createElement('div');
  div.className   = 'product-line';
  div.id          = id;

  const opts      = state.recetas.map(r =>
    `<option value="${r.id}" ${r.nombre === nombre ? 'selected' : ''} data-costo="${r.costo}">${r.nombre} (costo: ${fmt(r.costo)})</option>`
  ).join('');
  const hasRecetas = state.recetas.length > 0;

  div.innerHTML = `
    ${hasRecetas
      ? `<select class="jp-nombre" onchange="calcularJornada()">${opts}</select>`
      : `<input type="text" class="jp-nombre" placeholder="Nombre del producto" value="${nombre}" />`
    }
    <input type="number" placeholder="Und." class="jp-cantidad" value="${cantidad}" min="0"
           onchange="calcularJornada()" oninput="calcularJornada()" />
    <input type="number" placeholder="$0"   class="jp-precio"   value="${precio}"   min="0"
           onchange="calcularJornada()" oninput="calcularJornada()" />
    <button class="del-btn" onclick="removeRow('${id}');calcularJornada()">×</button>
  `;
  container.appendChild(div);
}

function addGastoJornada(concepto = '', monto = '') {
  jGastoCount++;
  const id        = `jg-${jGastoCount}`;
  const container = document.getElementById('j-gastos-container');
  const div       = document.createElement('div');
  div.className   = 'ingr-row';
  div.id          = id;
  div.style.gridTemplateColumns = '1fr 1fr 32px';
  div.innerHTML = `
    <input type="text"   placeholder="Ej: Gas, empaques, delivery" class="jg-concepto" value="${concepto}" />
    <input type="number" placeholder="$0" class="jg-monto" value="${monto}" min="0"
           oninput="calcularJornada()" onchange="calcularJornada()" />
    <button class="del-btn" onclick="removeRow('${id}');calcularJornada()">×</button>
  `;
  container.appendChild(div);
}

function calcularJornada() {
  let ingresos = 0;
  let costos   = 0;

  document.querySelectorAll('#j-productos-container .product-line').forEach(row => {
    const cant   = parseFloat(row.querySelector('.jp-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.jp-precio').value)   || 0;
    ingresos += cant * precio;

    const sel = row.querySelector('select.jp-nombre');
    if (sel) {
      const opt            = sel.options[sel.selectedIndex];
      const costoPorUnidad = parseFloat(opt.getAttribute('data-costo')) || 0;
      costos += cant * costoPorUnidad;
    }
  });

  let gastosExtra = 0;
  document.querySelectorAll('#j-gastos-container .ingr-row').forEach(row => {
    const monto = parseFloat(row.querySelector('.jg-monto').value) || 0;
    gastosExtra += monto;
  });

  const neto    = ingresos - costos - gastosExtra;
  const netoEl  = document.getElementById('j-total-neto');

  document.getElementById('j-total-ingresos').textContent     = fmt(ingresos);
  document.getElementById('j-total-costos').textContent       = fmt(costos);
  document.getElementById('j-total-gastos-extra').textContent = fmt(gastosExtra);
  netoEl.textContent  = fmt(neto);
  netoEl.style.color  = neto >= 0 ? 'var(--green)' : 'var(--red)';

  return { ingresos, costos, gastosExtra, neto };
}

function getProductosJornada() {
  const items = [];
  document.querySelectorAll('#j-productos-container .product-line').forEach(row => {
    const sel      = row.querySelector('select.jp-nombre');
    const inp      = row.querySelector('input.jp-nombre');
    const nombre   = sel ? sel.options[sel.selectedIndex].text.split(' (')[0] : (inp ? inp.value.trim() : '');
    const recetaId = sel ? sel.value : null;
    const cant     = parseFloat(row.querySelector('.jp-cantidad').value) || 0;
    const precio   = parseFloat(row.querySelector('.jp-precio').value)   || 0;
    const opt      = sel ? sel.options[sel.selectedIndex] : null;
    const costo    = opt ? parseFloat(opt.getAttribute('data-costo')) || 0 : 0;
    if (nombre) items.push({ nombre, recetaId, cantidad: cant, precioVenta: precio, costoUnitario: costo });
  });
  return items;
}

function getGastosJornada() {
  const items = [];
  document.querySelectorAll('#j-gastos-container .ingr-row').forEach(row => {
    const concepto = row.querySelector('.jg-concepto').value.trim();
    const monto    = parseFloat(row.querySelector('.jg-monto').value) || 0;
    if (concepto) items.push({ concepto, monto });
  });
  return items;
}

function guardarJornada() {
  const fecha = document.getElementById('j-fecha').value;
  if (!fecha) { alert('Seleccioná la fecha de la jornada.'); return; }

  const productos = getProductosJornada();
  if (!productos.length) { alert('Agregá al menos un producto vendido.'); return; }

  const calc    = calcularJornada();
  const jornada = {
    id:       uid(),
    fecha,
    tipo:     document.getElementById('j-tipo').value,
    productos,
    gastos:   getGastosJornada(),
    totales:  calc
  };

  state.jornadas.push(jornada);
  state.jornadas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  saveState();
  renderJornadas();
  resetJornadaForm();
  showToast('✓ Jornada guardada');
}

function deleteJornada(id) {
  if (!confirm('¿Eliminar esta jornada?')) return;
  state.jornadas = state.jornadas.filter(j => j.id !== id);
  saveState();
  renderJornadas();
}

function resetJornadaForm() {
  document.getElementById('j-fecha').value = '';
  document.getElementById('j-productos-container').innerHTML = '';
  document.getElementById('j-gastos-container').innerHTML    = '';
  jProductoCount = 0;
  jGastoCount    = 0;
  addProductoJornada();
  addGastoJornada();
  calcularJornada();
}

function renderJornadas() {
  const container = document.getElementById('jornadas-container');
  if (!state.jornadas.length) {
    container.innerHTML = '<div class="empty"><span class="emoji">📋</span>Todavía no hay jornadas registradas.</div>';
    return;
  }
  container.innerHTML = state.jornadas.map(j => {
    const neto          = j.totales.neto;
    const margen        = j.totales.ingresos > 0 ? ((neto / j.totales.ingresos) * 100).toFixed(0) : 0;
    const badge         = neto >= 0 ? 'badge-green' : 'badge-red';
    const fmtDate       = new Date(j.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    const productosText = j.productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
    return `
      <div class="jornada-card">
        <div class="jornada-header">
          <div>
            <div class="jornada-date">${fmtDate}
              <span style="color:var(--muted);font-weight:400;font-size:13px">· ${j.tipo}</span>
            </div>
            <div class="jornada-items">${productosText}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="badge ${badge}">Margen ${margen}%</span>
            <button class="btn btn-danger btn-sm" onclick="deleteJornada('${j.id}')">Eliminar</button>
          </div>
        </div>
        <div class="jornada-financials">
          <div class="fin-item">
            <div class="f-val" style="color:var(--green)">${fmt(j.totales.ingresos)}</div>
            <div class="f-lbl">Ingresos</div>
          </div>
          <div class="fin-item">
            <div class="f-val" style="color:var(--muted)">${fmt(j.totales.costos)}</div>
            <div class="f-lbl">Costos prod.</div>
          </div>
          <div class="fin-item">
            <div class="f-val" style="color:var(--muted)">${fmt(j.totales.gastosExtra)}</div>
            <div class="f-lbl">Gastos extra</div>
          </div>
          <div class="fin-item">
            <div class="f-val" style="color:${neto >= 0 ? 'var(--amber)' : 'var(--red)'}">${fmt(neto)}</div>
            <div class="f-lbl">Ganancia neta</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════
// CAJA
// ════════════════════════════════════════════════════════
function getCajaTotals() {
  let efectivo = 0;
  let bancario = 0;
  state.caja.movimientos.forEach(m => {
    const signo = m.tipo === 'ingreso' ? 1 : -1;
    if (m.metodo === 'efectivo') efectivo += signo * m.monto;
    else bancario += signo * m.monto;
  });
  return { efectivo, bancario, total: efectivo + bancario };
}

function guardarMovimiento() {
  const tipo   = document.getElementById('m-tipo').value;
  const metodo = document.getElementById('m-metodo').value;
  const monto  = parseFloat(document.getElementById('m-monto').value) || 0;
  const fecha  = document.getElementById('m-fecha').value;
  const razon  = document.getElementById('m-razon').value.trim();

  if (monto <= 0) { alert('Ingresá un monto válido.'); return; }
  if (!fecha)     { alert('Seleccioná una fecha.'); return; }
  if (!razon)     { alert('Escribí una razón o concepto.'); return; }

  if (tipo === 'retiro') {
    const totals     = getCajaTotals();
    const disponible = metodo === 'efectivo' ? totals.efectivo : totals.bancario;
    if (monto > disponible) {
      const metodoTxt = metodo === 'efectivo' ? 'efectivo' : 'la cuenta bancaria';
      if (!confirm(`El retiro (${fmt(monto)}) es mayor al saldo disponible en ${metodoTxt} (${fmt(disponible)}). ¿Registrar igual?`)) return;
    }
  }

  state.caja.movimientos.push({ id: uid(), tipo, metodo, monto, fecha, razon });
  state.caja.movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  saveState();
  renderCaja();
  resetMovimientoForm();
  showToast(tipo === 'ingreso' ? '✓ Ingreso registrado' : '✓ Retiro registrado');
}

function resetMovimientoForm() {
  document.getElementById('m-monto').value = '';
  document.getElementById('m-razon').value = '';
  document.getElementById('m-tipo').value = 'ingreso';
  document.getElementById('m-metodo').value = 'efectivo';
  document.getElementById('m-fecha').value = new Date().toISOString().split('T')[0];
}

function deleteMovimiento(id) {
  if (!confirm('¿Eliminar este movimiento? Esto cambiará el saldo total.')) return;
  state.caja.movimientos = state.caja.movimientos.filter(m => m.id !== id);
  saveState();
  renderCaja();
}

function renderCaja() {
  const { efectivo, bancario, total } = getCajaTotals();

  let pctEf = 0, pctBa = 0;
  if (total > 0) {
    pctEf = (efectivo / total) * 100;
    pctBa = (bancario / total) * 100;
  }

  const totalEl = document.getElementById('caja-total');
  totalEl.textContent = fmt(total);
  totalEl.style.color = total >= 0 ? 'var(--amber)' : 'var(--red)';

  document.getElementById('caja-efectivo').textContent = fmt(efectivo);
  document.getElementById('caja-bancario').textContent = fmt(bancario);
  document.getElementById('caja-efectivo-pct').textContent = `${pctEf.toFixed(0)}% del total`;
  document.getElementById('caja-bancario-pct').textContent = `${pctBa.toFixed(0)}% del total`;

  const visEf = Math.max(0, Math.min(100, pctEf));
  const visBa = Math.max(0, Math.min(100, pctBa));
  document.getElementById('split-bar-efectivo').style.width = visEf + '%';
  document.getElementById('split-bar-bancario').style.width = visBa + '%';

  document.getElementById('legend-efectivo').textContent = `Efectivo · ${pctEf.toFixed(0)}%`;
  document.getElementById('legend-bancario').textContent = `Bancario · ${pctBa.toFixed(0)}%`;

  renderCajaHistorial();
}

function renderCajaHistorial() {
  const container = document.getElementById('caja-historial-container');
  const movs = state.caja.movimientos;

  if (!movs.length) {
    container.innerHTML = '<div class="empty"><span class="emoji">💰</span>Todavía no hay movimientos registrados.</div>';
    return;
  }

  const sorted = [...movs].sort((a, b) => b.fecha.localeCompare(a.fecha));

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table>
        <thead><tr>
          <th>Fecha</th><th>Tipo</th><th>Método</th><th>Concepto</th><th>Monto</th><th></th>
        </tr></thead>
        <tbody>
          ${sorted.map(m => {
            const fmtDate     = new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
            const isIngreso   = m.tipo === 'ingreso';
            const tipoBadge   = isIngreso ? 'badge-green' : 'badge-red';
            const tipoLabel   = isIngreso ? 'Ingreso' : 'Retiro';
            const sign        = isIngreso ? '+' : '−';
            const color       = isIngreso ? 'var(--green)' : 'var(--red)';
            const metodoBadge = m.metodo === 'efectivo' ? 'badge-amber' : 'badge-blue';
            const metodoLabel = m.metodo === 'efectivo' ? 'Efectivo' : 'Bancario';
            return `<tr>
              <td>${fmtDate}</td>
              <td><span class="badge ${tipoBadge}">${tipoLabel}</span></td>
              <td><span class="badge ${metodoBadge}">${metodoLabel}</span></td>
              <td>${m.razon}</td>
              <td class="mono" style="color:${color};font-weight:700">${sign} ${fmt(m.monto)}</td>
              <td><button class="del-btn" onclick="deleteMovimiento('${m.id}')">×</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════
function renderDashboard() {
  const jornadas = state.jornadas;
  let totalIngresos = 0;
  let totalGastos   = 0;

  jornadas.forEach(j => {
    totalIngresos += j.totales.ingresos;
    totalGastos   += j.totales.costos + j.totales.gastosExtra;
  });

  const totalNeto = totalIngresos - totalGastos;
  const margen    = totalIngresos > 0 ? ((totalNeto / totalIngresos) * 100).toFixed(1) : 0;

  document.getElementById('dash-ingresos').textContent       = fmt(totalIngresos);
  document.getElementById('dash-gastos').textContent         = fmt(totalGastos);
  document.getElementById('dash-neto').textContent           = fmt(totalNeto);
  document.getElementById('dash-jornadas-count').textContent = `${jornadas.length} jornada${jornadas.length !== 1 ? 's' : ''}`;
  document.getElementById('dash-margen-pct').textContent     = `Margen: ${margen}%`;
  document.getElementById('dash-neto').style.color           = totalNeto >= 0 ? 'var(--amber)' : 'var(--red)';

  // Tabla historial
  const tablaEl = document.getElementById('dash-tabla-container');
  if (!jornadas.length) {
    tablaEl.innerHTML = '<div class="empty"><span class="emoji">📊</span>Registrá jornadas para ver los datos aquí.</div>';
  } else {
    tablaEl.innerHTML = `
      <table>
        <thead><tr>
          <th>Fecha</th><th>Tipo</th><th>Ingresos</th>
          <th>Costos</th><th>Otros gastos</th><th>Neto</th><th>Margen</th>
        </tr></thead>
        <tbody>
          ${jornadas.map(j => {
            const fmtDate  = new Date(j.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
            const neto     = j.totales.neto;
            const mg       = j.totales.ingresos > 0 ? ((neto / j.totales.ingresos) * 100).toFixed(0) : 0;
            const netoColor = neto >= 0 ? 'var(--green)' : 'var(--red)';
            const mgClass  = mg >= 40 ? 'badge-green' : mg >= 20 ? 'badge-amber' : 'badge-red';
            return `<tr>
              <td>${fmtDate}</td>
              <td>${j.tipo}</td>
              <td class="mono" style="color:var(--green)">${fmt(j.totales.ingresos)}</td>
              <td class="mono" style="color:var(--muted)">${fmt(j.totales.costos)}</td>
              <td class="mono" style="color:var(--muted)">${fmt(j.totales.gastosExtra)}</td>
              <td class="mono" style="color:${netoColor};font-weight:700">${fmt(neto)}</td>
              <td><span class="badge ${mgClass}">${mg}%</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Top productos
  const prodMap = {};
  jornadas.forEach(j => {
    j.productos.forEach(p => {
      if (!prodMap[p.nombre]) prodMap[p.nombre] = { cantidad: 0, ingresos: 0 };
      prodMap[p.nombre].cantidad += p.cantidad;
      prodMap[p.nombre].ingresos += p.cantidad * p.precioVenta;
    });
  });
  const topProds = Object.entries(prodMap).sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 5);
  const topEl    = document.getElementById('dash-top-productos');

  if (!topProds.length) {
    topEl.innerHTML = '<div class="empty" style="padding:20px;"><span class="emoji">🍔</span>Sin datos aún.</div>';
  } else {
    topEl.innerHTML = topProds.map(([nombre, d]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-weight:600">${nombre}</div>
          <div style="font-size:11px;color:var(--muted)">${d.cantidad} unidades</div>
        </div>
        <div class="mono" style="color:var(--green)">${fmt(d.ingresos)}</div>
      </div>
    `).join('');
  }

  // Resumen recetas
  const recEl = document.getElementById('dash-recetas-resumen');
  if (!state.recetas.length) {
    recEl.innerHTML = '<div class="empty" style="padding:20px;"><span class="emoji">📝</span>Sin recetas guardadas.</div>';
  } else {
    recEl.innerHTML = state.recetas.map(r => {
      const mg      = r.precioVenta > 0 ? ((r.ganancia / r.precioVenta) * 100).toFixed(0) : 0;
      const mgClass = mg >= 40 ? 'badge-green' : mg >= 20 ? 'badge-amber' : 'badge-red';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:600">${r.nombre}</div>
            <div style="font-size:11px;color:var(--muted)">Costo: ${fmt(r.costo)}</div>
          </div>
          <div style="text-align:right;">
            <div class="mono" style="font-size:15px">${fmt(r.precioVenta)}</div>
            <span class="badge ${mgClass}">${mg}%</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
loadState();
addIngrediente();
addProductoJornada();
addGastoJornada();
renderRecipes();
renderJornadas();
renderCaja();

document.getElementById('j-fecha').value = new Date().toISOString().split('T')[0];
document.getElementById('m-fecha').value = new Date().toISOString().split('T')[0];
