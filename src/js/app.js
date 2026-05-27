/* ══════════════════════════════════════════════════════════════
   app.js — Lógica del frontend del Insurance Contractor CRM
   
   Vanilla JavaScript (ES6+). Sin frameworks, sin librerías,
   sin transpilación. Funciona en cualquier navegador moderno.
   
   Responsabilidades:
     1. Obtener pólizas desde la API REST (Fetch API)
     2. Renderizar el dashboard priorizado (críticas → alerta → ok → perdidas)
     3. Manejar acciones: contactar, renovar, no renovó
     4. Gestionar filtros por prioridad, estado y ramo
     5. Mostrar resumen numérico actualizado
   ══════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────
// CONSTANTES DE LA APLICACIÓN
// ──────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:5000/api/v1';

// Mapa de emojis/iconos para cada prioridad.
// Se usan en lugar de solo colores para cumplir con accesibilidad
// visual (WCAG: no comunicar información solo con color).
const ICONOS_PRIORIDAD = {
    critica: '⚠️',
    alerta:  '🔔',
    ok:      '✅',
    perdida: '❌',
};

// Títulos en español para cada grupo de prioridad
const TITULOS_PRIORIDAD = {
    critica: 'Críticas — Ventana de 30 días activa',
    alerta:  'Alerta — Vencen pronto',
    ok:      'Vigentes — Sin acción urgente',
    perdida: 'Perdidas — Ventana de 30 días vencida',
};

// Etiquetas de estado en español
const ETIQUETAS_ESTADO = {
    vigente:   'Vigente',
    vencida:   'Vencida',
    renovada:  'Renovada ✅',
    no_renovo: 'No renovó ❌',
};

// Orden de las prioridades en el dashboard
const ORDEN_PRIORIDAD = ['critica', 'alerta', 'ok', 'perdida'];


// ──────────────────────────────────────────────────────────────
// REFERENCIAS AL DOM
// Las guardamos al inicio para no estar consultando el DOM
// constantemente. Mejora rendimiento y legibilidad.
// ──────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    listaPoliticas:  $('#lista-politicas'),
    estadoCarga:     $('#estado-carga'),
    estadoError:     $('#estado-error'),
    resumenTotal:    $('#total-politicas'),
    resumenCriticas: $('#total-criticas'),
    resumenAlerta:   $('#total-alerta'),
    resumenOk:       $('#total-ok'),
    resumenPerdidas: $('#total-perdidas'),
    filtroPrioridad: $('#filtro-prioridad'),
    filtroEstado:    $('#filtro-estado'),
    filtroTipo:      $('#filtro-tipo'),
    btnAplicar:      $('#btn-aplicar-filtros'),
    btnReintentar:   $('#btn-reintentar'),
    modal:           $('#modal-renovar'),
    modalInfo:       $('#modal-politica-info'),
    formRenovar:     $('#form-renovar'),
    nuevaFecha:      $('#nueva-fecha'),
    btnCancelar:     $('#btn-cancelar-renovar'),
};

// Estado de la aplicación: almacena la data actual para
// evitar llamadas repetitivas a la API.
let estadoApp = {
    policies: [],
    filtroActivo: {},
};


// ──────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: CARGA INICIAL
// Se ejecuta cuando el DOM está listo.
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    cargarPoliticas();
    configurarEventos();
});


// ──────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE EVENTOS
// Vincula los listeners a los elementos del DOM.
// ──────────────────────────────────────────────────────────────
function configurarEventos() {
    // Botón "Aplicar filtros"
    dom.btnAplicar.addEventListener('click', () => {
        aplicarFiltros();
    });

    // Botón "Reintentar" (cuando hay error)
    dom.btnReintentar.addEventListener('click', () => {
        ocultarError();
        cargarPoliticas();
    });

    // Modal: cancelar
    dom.btnCancelar.addEventListener('click', () => {
        dom.modal.close();
    });

    // Modal: submit del formulario de renovación
    dom.formRenovar.addEventListener('submit', (event) => {
        event.preventDefault();
        confirmarRenovacion();
    });

    // Cerrar modal con Escape (nativo de <dialog>)
    dom.modal.addEventListener('close', () => {
        dom.formRenovar.reset();
    });

    // Tecla Enter en los selects de filtro
    $$('.filtro-select').forEach((sel) => {
        sel.addEventListener('change', () => {
            aplicarFiltros();
        });
    });
}


// ──────────────────────────────────────────────────────────────
// LLAMADAS A LA API
// ──────────────────────────────────────────────────────────────

/**
 * Obtiene la lista de pólizas desde el backend.
 * Aplica los filtros activos como query params.
 */
async function cargarPoliticas(filtros = {}) {
    mostrarCarga(true);
    ocultarError();

    try {
        // Construimos los query params según los filtros activos
        const params = new URLSearchParams();
        if (filtros.prioridad && filtros.prioridad !== 'todos') {
            params.set('priority', filtros.prioridad);
        }
        if (filtros.estado && filtros.estado !== 'todos') {
            params.set('status', filtros.estado);
        }
        if (filtros.tipo && filtros.tipo !== 'todos') {
            params.set('policy_type', filtros.tipo);
        }

        const url = `${API_BASE_URL}/policies?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Guardamos en el estado de la app
        estadoApp.policies = data.policies || [];
        estadoApp.filtroActivo = filtros;

        // Actualizamos la UI
        actualizarResumen(data);
        renderizarPoliticas(estadoApp.policies);
        mostrarCarga(false);

    } catch (error) {
        console.error('[cargarPoliticas] Error:', error.message);
        mostrarCarga(false);
        mostrarError();
    }
}


/**
 * Aplica los filtros seleccionados en los <select> del dashboard.
 */
function aplicarFiltros() {
    const filtros = {
        prioridad: dom.filtroPrioridad.value,
        estado:    dom.filtroEstado.value,
        tipo:      dom.filtroTipo.value,
    };
    cargarPoliticas(filtros);
}


// ──────────────────────────────────────────────────────────────
// RENDERIZADO DEL DASHBOARD
// ──────────────────────────────────────────────────────────────

/**
 * Renderiza las pólizas agrupadas por prioridad en el dashboard.
 *
 * Cada grupo (crítica, alerta, ok, perdida) se muestra como una
 * sección visual separada con su color característico.
 */
function renderizarPoliticas(policies) {
    if (!policies || policies.length === 0) {
        dom.listaPoliticas.innerHTML = `
            <div class="grupo-prioridad" style="padding: 3rem; text-align: center; color: var(--color-texto-sec);">
                <p style="font-size: 1.25rem;">📭 No se encontraron pólizas con los filtros seleccionados.</p>
                <button class="btn btn-secundario" style="margin-top: 1rem;" onclick="aplicarFiltros()">
                    🔄 Mostrar todas
                </button>
            </div>
        `;
        return;
    }

    // Agrupamos las pólizas por prioridad, manteniendo el orden
    const grupos = {};
    ORDEN_PRIORIDAD.forEach((p) => { grupos[p] = []; });

    policies.forEach((p) => {
        if (grupos[p.priority]) {
            grupos[p.priority].push(p);
        }
    });

    // Construimos el HTML de cada grupo
    let html = '';

    ORDEN_PRIORIDAD.forEach((prioridad) => {
        const items = grupos[prioridad];
        if (items.length === 0) return;

        html += `
            <div class="grupo-prioridad grupo-${prioridad}">
                <div class="grupo-header">
                    <span>${ICONOS_PRIORIDAD[prioridad]}</span>
                    <span>${TITULOS_PRIORIDAD[prioridad]}</span>
                    <span class="grupo-conteo">${items.length} póliza(s)</span>
                </div>
                ${items.map(renderPolizaCard).join('')}
            </div>
        `;
    });

    dom.listaPoliticas.innerHTML = html;
}


/**
 * Renderiza una tarjeta individual de póliza.
 * Cada tarjeta muestra: cliente, datos de la póliza, badge de fecha,
 * última gestión, y botones de acción.
 */
function renderPolizaCard(p) {
    const cliente = p.client || {};
    const nombreCliente = escaparHTML(cliente.name || 'Sin nombre');
    const telefono = escaparHTML(cliente.phone || '');
    const aseguradora = escaparHTML(p.insurance_company || '');
    const tipo = escaparHTML(p.policy_type || '');
    const numPoliza = escaparHTML(p.policy_number || '');
    const statusLabel = ETIQUETAS_ESTADO[p.status] || p.status;

    // Badge según los días
    const badge = renderBadge(p);
    const ultimoContacto = renderUltimoContacto(p);
    const acciones = renderAcciones(p);

    // Mostramos el teléfono como enlace si existe
    const telefonoHtml = telefono
        ? `<a href="tel:${telefono}" class="poliza-telefono" title="Llamar a ${nombreCliente}">📞 ${telefono}</a>`
        : '';

    return `
        <div class="poliza-card poliza-${p.priority}" data-policy-id="${p.id}">
            <div class="poliza-icono" aria-hidden="true">
                ${ICONOS_PRIORIDAD[p.priority]}
            </div>

            <div class="poliza-info">
                <div class="poliza-cliente">
                    ${nombreCliente}
                    ${telefonoHtml}
                </div>

                <div class="poliza-detalles">
                    <span class="poliza-detalle-item">
                        🏦 <strong>${aseguradora}</strong>
                    </span>
                    <span class="poliza-detalle-item">
                        📄 ${tipo.toUpperCase()} · ${numPoliza}
                    </span>
                    <span class="poliza-detalle-item">
                        ${badge}
                    </span>
                </div>

                <div class="poliza-detalles">
                    <span class="poliza-detalle-item">
                        📌 ${statusLabel}
                    </span>
                </div>

                ${ultimoContacto}

                <div class="poliza-accion-rec">
                    ${escaparHTML(p.recommended_action || '')}
                </div>
            </div>

            <div class="poliza-acciones">
                ${acciones}
            </div>
        </div>
    `;
}


/**
 * Renderiza el badge de fecha según la prioridad.
 * Muestra días de vencido/restantes + días de ventana si aplica.
 */
function renderBadge(p) {
    const diff = p.days_diff;
    let texto = '';
    let clase = '';

    if (p.priority === 'critica') {
        // Vencida dentro de ventana de 30 días
        texto = `⚠️ Vencida hace ${Math.abs(diff)} día(s) · Quedan ${p.days_remaining_window} día(s)`;
        clase = 'badge-critico';
    } else if (p.priority === 'alerta') {
        // Por vencer pronto
        texto = `🔔 Vence en ${Math.abs(diff)} día(s)`;
        clase = 'badge-alerta';
    } else if (p.priority === 'perdida') {
        // Fuera de ventana
        texto = `❌ Vencida hace ${Math.abs(diff)} día(s) · Ventana vencida`;
        clase = 'badge-perdido';
    } else {
        // Vigente o renovada
        if (p.status === 'renovada') {
            texto = `🔄 Renovada · ${p.expiration_date}`;
        } else {
            texto = `✅ Vigente hasta ${p.expiration_date}`;
        }
        clase = 'badge-ok';
    }

    return `<span class="poliza-fecha-badge ${clase}">${texto}</span>`;
}


/**
 * Muestra la información del último contacto registrado.
 * Si se contactó hoy, lo resalta en verde.
 */
function renderUltimoContacto(p) {
    if (!p.last_contact_date) return '';

    const fechaContacto = new Date(p.last_contact_date);
    const hoy = new Date();
    const esHoy = fechaContacto.toDateString() === hoy.toDateString();

    const fechaFormateada = fechaContacto.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const clase = esHoy ? 'contacto-reciente' : '';
    const icono = esHoy ? '🟢' : '📞';

    return `
        <div class="poliza-contacto ${clase}">
            ${icono} Contactado: ${fechaFormateada}
        </div>
    `;
}


/**
 * Renderiza los botones de acción disponibles para una póliza.
 * Las acciones dependen del estado de la póliza:
 *   - Vencida/Próxima a vencer → Contactar, Renovar, No renovó
 *   - Renovada/No renovó → Solo ver (sin acciones)
 */
function renderAcciones(p) {
    const id = p.id;
    const puedeGestionar = p.status === 'vencida' || p.status === 'vigente';

    if (!puedeGestionar) {
        // Póliza ya gestionada (renovada o no renovó)
        return `
            <span class="btn btn-deshabilitado" style="font-size: var(--font-size-sm);">
                ${p.status === 'renovada' ? '✅ Gestionada' : '❌ Cerrada'}
            </span>
        `;
    }

    return `
        <button class="btn btn-contactar" onclick="marcarContactado(${id})" title="Registrar contacto">
            📞 Contactar
        </button>
        <button class="btn btn-renovar" onclick="abrirModalRenovar(${id})" title="Renovar póliza">
            🔄 Renovar
        </button>
        <button class="btn btn-no-renovo" onclick="marcarNoRenovo(${id})" title="Cliente no renovó">
            ❌ No renovó
        </button>
    `;
}


// ──────────────────────────────────────────────────────────────
// ACCIONES: CONTACTAR
// ──────────────────────────────────────────────────────────────

/**
 * Marca una póliza como contactada.
 * Hace PATCH /api/v1/policies/{id}/contact y refresca.
 */
async function marcarContactado(policyId) {
    // Deshabilitamos visualmente el botón para evitar doble clic
    const botones = document.querySelectorAll(
        `.poliza-card[data-policy-id="${policyId}"] .btn-contactar`
    );
    botones.forEach((btn) => { btn.disabled = true; btn.textContent = '⏳...'; });

    try {
        const response = await fetch(`${API_BASE_URL}/policies/${policyId}/contact`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: 'Contacto registrado desde el dashboard' }),
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[marcarContactado] Póliza ${policyId}:`, data.message);

        // Refrescamos la lista completa para ver el cambio
        await cargarPoliticas(estadoApp.filtroActivo);

    } catch (error) {
        console.error('[marcarContactado] Error:', error.message);
        // Restauramos el botón
        botones.forEach((btn) => {
            btn.disabled = false;
            btn.textContent = '📞 Contactar';
        });
        alert('❌ No se pudo registrar el contacto. Verificá que el servidor esté corriendo.');
    }
}


// ──────────────────────────────────────────────────────────────
// ACCIONES: RENOVAR (modal + confirmación)
// ──────────────────────────────────────────────────────────────

let policyIdRenovar = null;  // Guardamos el ID de la póliza a renovar

/**
 * Abre el modal de renovación y configura la fecha mínima.
 */
function abrirModalRenovar(policyId) {
    policyIdRenovar = policyId;

    // Buscamos la póliza en los datos actuales
    const policy = estadoApp.policies.find((p) => p.id === policyId);
    if (!policy) {
        alert('Error: no se encontró la póliza seleccionada.');
        return;
    }

    const cliente = policy.client || {};
    const nombre = cliente.name || 'Desconocido';

    // Mostramos info de la póliza en el modal
    dom.modalInfo.textContent = `Cliente: ${nombre} · ${policy.insurance_company} · Vencimiento actual: ${policy.expiration_date}`;

    // Configuramos la fecha mínima: mañana
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    dom.nuevaFecha.min = manana.toISOString().split('T')[0];

    // Sugerimos un año después como default
    const añoProximo = new Date();
    añoProximo.setFullYear(añoProximo.getFullYear() + 1);
    dom.nuevaFecha.value = añoProximo.toISOString().split('T')[0];

    // Abrimos el modal
    dom.modal.showModal();
}


/**
 * Confirma la renovación de la póliza.
 * Hace POST /api/v1/policies/{id}/renew y refresca.
 */
async function confirmarRenovacion() {
    if (!policyIdRenovar) return;

    const nuevaFecha = dom.nuevaFecha.value;
    if (!nuevaFecha) {
        alert('Por favor seleccioná una fecha de vencimiento.');
        return;
    }

    // Deshabilitamos el botón de confirmar
    dom.btnConfirmar = dom.btnConfirmar || $('#btn-confirmar-renovar');
    if (dom.btnConfirmar) {
        dom.btnConfirmar.disabled = true;
        dom.btnConfirmar.textContent = '⏳ Procesando...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/policies/${policyIdRenovar}/renew`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_expiration_date: nuevaFecha }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Error HTTP: ${response.status}`);
        }

        console.log(`[renovar] Póliza ${policyIdRenovar}:`, data.message);

        // Cerramos el modal
        dom.modal.close();

        // Refrescamos la lista
        await cargarPoliticas(estadoApp.filtroActivo);

        // Feedback visual: mostramos un toast o alert breve
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 16px 24px;
            background: var(--color-ok, #16a34a); color: white;
            border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000; animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = `✅ Póliza renovada exitosamente`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

    } catch (error) {
        console.error('[renovar] Error:', error.message);
        alert(`❌ Error al renovar: ${error.message}`);
    } finally {
        if (dom.btnConfirmar) {
            dom.btnConfirmar.disabled = false;
            dom.btnConfirmar.textContent = '✅ Confirmar renovación';
        }
    }
}


// ──────────────────────────────────────────────────────────────
// ACCIONES: NO RENOVÓ (marcar como perdido)
// ──────────────────────────────────────────────────────────────

/**
 * Marca una póliza como "no renovó".
 * Hace PATCH /api/v1/policies/{id}/status con status='no_renovo'.
 */
async function marcarNoRenovo(policyId) {
    // Confirmación: le preguntamos a María si está segura
    if (!confirm('¿Estás segura de marcar esta póliza como "No renovó"?\nEsta acción mueve la póliza a la sección de Perdidas.')) {
        return;
    }

    // Deshabilitamos botones visualmente
    const botones = document.querySelectorAll(
        `.poliza-card[data-policy-id="${policyId}"] .btn-no-renovo`
    );
    botones.forEach((btn) => { btn.disabled = true; btn.textContent = '⏳...'; });

    try {
        const response = await fetch(`${API_BASE_URL}/policies/${policyId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'no_renovo' }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Error HTTP: ${response.status}`);
        }

        // Refrescamos la lista
        await cargarPoliticas(estadoApp.filtroActivo);

    } catch (error) {
        console.error('[marcarNoRenovo] Error:', error.message);
        botones.forEach((btn) => {
            btn.disabled = false;
            btn.textContent = '❌ No renovó';
        });
        alert(`❌ Error: ${error.message}`);
    }
}


// ──────────────────────────────────────────────────────────────
// ACTUALIZACIÓN DEL RESUMEN
// ──────────────────────────────────────────────────────────────

/**
 * Actualiza los números del resumen en la cabecera.
 */
function actualizarResumen(data) {
    dom.resumenTotal.textContent = data.total || 0;
    dom.resumenCriticas.textContent = data.criticas || 0;
    dom.resumenAlerta.textContent = data.alerta || 0;
    dom.resumenOk.textContent = data.ok || 0;
    dom.resumenPerdidas.textContent = data.perdidas || 0;
}


// ──────────────────────────────────────────────────────────────
// CONTROL DE ESTADOS: CARGA / ERROR
// ──────────────────────────────────────────────────────────────

function mostrarCarga(visible) {
    dom.estadoCarga.hidden = !visible;
    if (!visible) dom.estadoCarga.textContent = 'Cargando cartera de María...';
}

function mostrarError() {
    dom.estadoError.hidden = false;
    dom.listaPoliticas.innerHTML = '';
}

function ocultarError() {
    dom.estadoError.hidden = true;
}


// ──────────────────────────────────────────────────────────────
// UTILIDADES
// ──────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS.
 * Útil cuando renderizamos datos del backend que podrían
 * contener caracteres especiales.
 */
function escaparHTML(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}


// ──────────────────────────────────────────────────────────────
// ANIMACIONES (definidas en CSS via keyframes)
// ──────────────────────────────────────────────────────────────
(function injectAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
})();
