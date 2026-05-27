# Análisis, Comprensión y Especificaciones del Sistema "Insurance Contractor CRM"

> **Versión:** 0.1.0-SNAPSHOT | **Fecha:** 2026-05-26 | **Autor:** Yadin Paulo Manrique Márquez
> **Estado:** Borrador en revisión

---

## Tabla de Contenidos

1. [Entendimiento del Problema](#1-entendimiento-del-problema)
2. [Contexto Regulatorio](#2-contexto-regulatorio)
3. [Decisiones de Alcance (MVP)](#3-decisiones-de-alcance-mvp)
4. [Supuestos](#4-supuestos)
5. [Arquitectura General](#5-arquitectura-general)
6. [Modelo de Datos](#6-modelo-de-datos)
7. [Flujos Principales del Sistema](#7-flujos-principales-del-sistema)
8. [Estados del Ciclo de Vida de una Póliza](#8-estados-del-ciclo-de-vida-de-una-póliza)
9. [Contratos de API REST](#9-contratos-de-api-rest)
10. [Especificaciones del Front-end](#10-especificaciones-del-front-end)
11. [Accesibilidad (WCAG 2.1 AA)](#11-accesibilidad-wcag-21-aa)
12. [Estrategia Offline-First](#12-estrategia-offline-first)
13. [Datos Semilla (Seed Data)](#13-datos-semilla-seed-data)
14. [Stack Tecnológico](#14-stack-tecnológico)
15. [Estructura de Proyecto](#15-estructura-de-proyecto)
16. [Quick Start (Sin Docker)](#16-quick-start-sin-docker)
17. [Decisiones Técnicas y Trade-offs](#17-decisiones-técnicas-y-trade-offs)
18. [Fuera de Alcance MVP](#18-fuera-de-alcance-mvp)
19. [Historias de Usuario](#19-historias-de-usuario)
20. [Criterios de Aceptación (Definition of Done)](#20-criterios-de-aceptación-definition-of-done)
21. [GitFlow](#21-gitflow)

---

## 1. Entendimiento del Problema

### 1.1 Persona Principal

**María** — Asesora de seguros independiente con **280 clientes activos**, cartera mixta (auto, hogar, vida, motos, otros).

### 1.2 Flujo de Trabajo Actual (Problema)

```
Excel gigante
  → Lunes: filtrar pólizas que vencen ese mes
  → Llamar cliente por cliente
  → Marcar columna "gestionado" con una X
  → Si renueva: actualizar fecha manualmente
```

### 1.3 Puntos de Dolor Identificados

| # | Dolor | Impacto Cuantificado |
|---|-------|----------------------|
| 1 | El Excel se daña, duplica y pierde contexto | Tiempo perdido rearmando el archivo |
| 2 | Sin visibilidad de criticidad (todas las pólizas se ven igual) | Priorización inexistente |
| 3 | Póliza vence sin que María se dé cuenta | **5–10 clientes perdidos por mes** |
| 4 | No queda registro de qué se ofreció a quién | Cero historial de gestión |
| 5 | No diferencia póliza vencida hace 5 días vs. 35 días | Pérdida de ventana legal de renovación |

### 1.4 Propuesta de Valor

Reemplazar el Excel con una herramienta que:

- **Muestre** qué pólizas necesitan atención hoy, ordenadas por urgencia
- **Registre** cada acción de contacto con fecha y contexto
- **Actualice** las pólizas renovadas en segundos
- **Proteja** la ventana crítica de 30 días de gracia

---

## 2. Contexto Regulatorio

> **Jurisdicción:** Colombia — SOAT y seguros de intermediación

### 2.1 Ventana de Gracia (Regla de Negocio Crítica)

```
Vencimiento
    │
    ├─── 0 días ──────── Vencimiento exacto
    │
    ├─── +30 días ─────── VENTANA DE GRACIA
    │                    ↳ El mismo intermediario puede renovar
    │                    ↳ El cliente NO pierde historial
    │                    ↳ La aseguradora NO trata la op. como nueva contratación
    │
    └─── +31 días ─────── NUEVA CONTRATACIÓN
                         ↳ El asesor compite con cualquier otro intermediario
                         ↳ Pérdida efectiva del cliente
```

**Una póliza vencida hace 5 días ≠ una póliza vencida hace 35 días.**
Esta distinción debe ser el eje central de la experiencia de usuario.

### 2.2 Aplicación en el MVP

La lógica de los 30 días calendario de gracia se aplicará como **regla de negocio general** para todos los tipos de póliza en este MVP (auto, moto, hogar, vida, etc.), con el propósito de simplificar sin perder el valor principal.

---

## 3. Decisiones de Alcance (MVP)

### 3.1 Qué se construye

**Foco único:** Visibilidad y gestión de renovaciones dentro de la ventana crítica de 30 días.

| Módulo | Descripción |
|--------|-------------|
| Dashboard de priorización | Vista única con pólizas ordenadas por criticidad, colores semáforo accesibles |
| Acciones rápidas | One-click: Contactado, Renovado (solicita nueva fecha), No Renovó |
| API RESTful | Back-end Java 21 con Virtual Threads para las operaciones del front-end |
| Persistencia local | SQLite sin Docker — portabilidad máxima |
| Offline-first | Guarda confirmaciones de renovación y reintenta cuando hay conexión |
| Datos semilla | Seed data preconfigurada para demostración inmediata |
| CRUD básico de clientes | Formulario de creación de nuevo cliente (si queda tiempo, incluido como historia de usuario) |

### 3.2 Qué NO se construye en MVP (y por qué)

| Funcionalidad | Razón de exclusión |
|---------------|--------------------|
| Autenticación JWT / OAuth 2 | Alcance es validar solución para un usuario único. Login suma complejidad sin valor para el evaluador. Es la siguiente historia de usuario. |
| Integración con APIs de aseguradoras | Requiere credenciales de terceros no disponibles. Se diseña el módulo pero no se implementa. |
| Reportes y estadísticas avanzadas | No es el dolor principal. Puede derivarse de los datos ya almacenados. |
| Notificaciones push / email automáticos | La herramienta es activa (María decide cuándo actúa). Push es siguiente fase. |
| Multi-tenancy (varios asesores) | MVP valida el modelo con un asesor. La arquitectura debe soportar escalar después. |

---

## 4. Supuestos

1. **Foco en regla de los 30 días:** Aplica para todos los tipos de póliza del MVP.
2. **Ejecución local:** El evaluador tiene Java 21 y Node.js instalados, o puede instalarlos. La asesora, una vez desplegada la app, no necesita tenerlos.
3. **Sin concurrencia masiva:** Un asesor por ahora. SQLite lo maneja bien por defecto en este volumen.
4. **Renovación manual:** La asesora confirma la renovación manualmente. El sistema no conecta en tiempo real con la aseguradora.
5. **Idioma back-end:** Todo en inglés — código, comentarios, logs técnicos — pensando en potencial venta a inversores extranjeros.
6. **Idioma front-end / mensajes funcionales:** En español, ya que la asesora y sus clientes son hispanohablantes.
7. **Zona horaria:** Colombia (UTC-5). El cálculo de vencimiento y ventana de gracia usa la fecha local colombiana.

---

## 5. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONT-END (React 19)                     │
│                                                             │
│  Dashboard ──► PolicyCard ──► ActionButtons                 │
│  (priorización)   (semáforo)    (Contactar / Renovar / ...)  │
│                                                             │
│  OfflineQueue  ──► sync cuando hay conexión                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST (JSON)
                           │ /api/v1/...
┌──────────────────────────▼──────────────────────────────────┐
│                   BACK-END (Java 21)                        │
│                                                             │
│  PolicyController ──► PolicyService ──► PolicyRepository    │
│  ClientController ──► ClientService ──► ClientRepository    │
│                                                             │
│  Virtual Threads (spring.threads.virtual.enabled=true)      │
│  Clean Architecture: api / application / domain / infra     │
└──────────────────────────┬──────────────────────────────────┘
                           │ JDBC
┌──────────────────────────▼──────────────────────────────────┐
│                    SQLite (archivo local)                   │
│           tractor_insurance_crm.db                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 Capas (Clean Architecture)

```
com.insurance-crm/
├── api/              ← Controllers, DTOs de entrada/salida, GlobalExceptionHandler
├── application/      ← Use cases / Services (lógica de orquestación)
├── domain/           ← Entities, Value Objects, reglas de negocio puras (sin Spring)
│   ├── model/        ← Policy, Client, PolicyStatus
│   └── service/      ← PolicyExpirationService (cálculo de ventana de gracia)
└── infrastructure/   ← Repositories (JPA/SQLite), Config, Seeders
```

---

## 6. Modelo de Datos

### 6.1 Tabla `clients`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador único |
| `name` | `TEXT NOT NULL` | Nombre completo del cliente |
| `phone` | `TEXT` | Teléfono de contacto principal |
| `email` | `TEXT` | Correo electrónico |
| `notes` | `TEXT` | Observaciones generales del asesor |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Fecha de creación |
| `updated_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Última modificación |

### 6.2 Tabla `policies`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador único |
| `client_id` | `INTEGER NOT NULL REFERENCES clients(id)` | Relación con el cliente |
| `policy_number` | `TEXT NOT NULL` | Número de póliza de la aseguradora |
| `insurance_company` | `TEXT NOT NULL` | Nombre de la aseguradora |
| `policy_type` | `TEXT NOT NULL` | AUTO, MOTO, HOGAR, VIDA, OTRO |
| `expiration_date` | `DATE NOT NULL` | Fecha de vencimiento vigente |
| `status` | `TEXT NOT NULL DEFAULT 'PENDING'` | Ver sección 8 — Estados |
| `last_contact_date` | `DATETIME` | Última vez que María llamó |
| `contact_notes` | `TEXT` | Qué se habló en el último contacto |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Creación del registro |
| `updated_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Última modificación |

> **Nota sobre `status`:** El estado "calculado" (si vence pronto, si está en gracia, etc.) se deriva dinámicamente en el dominio comparando `expiration_date` vs. `LocalDate.now()`. El campo `status` almacena el estado de **gestión** de María (PENDING, CONTACTED, RENEWED, LOST), no el estado temporal de la póliza. Esta separación permite hacer queries eficientes y mantener el historial.

### 6.3 Tabla `renewal_sync_queue` (Offline-First)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador |
| `policy_id` | `INTEGER NOT NULL` | Póliza afectada |
| `action` | `TEXT NOT NULL` | RENEW, CONTACT, LOST |
| `payload` | `TEXT` | JSON con los datos de la acción |
| `sync_status` | `TEXT DEFAULT 'PENDING'` | PENDING, SYNCED, FAILED |
| `attempts` | `INTEGER DEFAULT 0` | Intentos de sincronización |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Cuándo se creó |
| `synced_at` | `DATETIME` | Cuándo se sincronizó exitosamente |

---

## 7. Flujos Principales del Sistema

### 7.1 Flujo de Descubrimiento (Carga Inicial)

```
María abre la app
        │
        ▼
GET /api/v1/policies?sort=priority
        │
        ▼
Back-end calcula criticidad por póliza:
  1. VENCIDAS EN GRACIA (0-30 días vencida) → ROJO     ← Prioridad máxima
  2. POR VENCER (0-30 días para vencer)     → AMARILLO
  3. VIGENTES (>30 días para vencer)        → VERDE
  4. PERDIDAS (>30 días vencida)            → GRIS
        │
        ▼
Dashboard renderiza lista ordenada con colores semáforo
```

### 7.2 Flujo de Gestión (Marcar Contactado)

```
María llama al cliente
        │
        ▼
Clic en "Marcar Contactado" en la PolicyCard
        │
        ▼
PATCH /api/v1/policies/{id}/contact
  body: { contactNotes: "Interesado, llama mañana" }
        │
        ▼
Back-end actualiza:
  - last_contact_date = now()
  - status = CONTACTED
  - contact_notes = payload
        │
        ▼
Card actualiza visualmente (badge "Contactado" + timestamp)
```

### 7.3 Flujo de Renovación

```
Cliente acepta renovar
        │
        ▼
Clic en "Registrar Renovación"
        │
        ▼
Modal solicita: nueva fecha de vencimiento
  (default: expiration_date + 1 año, editable)
        │
        ▼
POST /api/v1/policies/{id}/renew
  body: { newExpirationDate: "2027-05-26" }
        │
        ┌──── ¿Hay conexión? ────┐
        │ SÍ                     │ NO
        ▼                        ▼
Back-end actualiza:       Guarda en renewal_sync_queue
  - expiration_date       Muestra badge "Pendiente de sync"
  - status = RENEWED      Reintenta en background
  - last_contact_date
        │
        ▼
Póliza regresa a estado VERDE en el dashboard
```

### 7.4 Flujo "No Renovó"

```
Clic en "No Renovó"
        │
        ▼
Confirmación rápida: "¿Confirmas que el cliente no renovará?"
        │
        ▼
PATCH /api/v1/policies/{id}/lost
  body: { contactNotes: "Razón opcional" }
        │
        ▼
Back-end actualiza: status = LOST
Card pasa a sección inferior / estado PERDIDO
```

---

## 8. Estados del Ciclo de Vida de una Póliza

### 8.1 Estados de Gestión (campo `status`)

| Estado | Código BE | Descripción | Transiciones posibles |
|--------|-----------|-------------|----------------------|
| Sin gestión | `PENDING` | Estado inicial. María no ha actuado aún. | → CONTACTED, RENEWED, LOST |
| Contactado | `CONTACTED` | María llamó. En espera de decisión del cliente. | → RENEWED, LOST, PENDING |
| Renovado | `RENEWED` | Éxito. Nueva fecha registrada. | → PENDING (si se crea nueva póliza) |
| No renovó | `LOST` | El cliente decidió no renovar. | — (terminal en este ciclo) |

### 8.2 Estados Calculados (derivados de `expiration_date` vs. fecha actual)

Estos estados **no se almacenan** en base de datos; se computan en `PolicyExpirationService`.

| Estado Calculado | Condición | Prioridad | Color UI | Icono WCAG |
|------------------|-----------|-----------|----------|------------|
| `EXPIRING_SOON` | `0 <= días_para_vencer <= 30` | Alta | `#B45309` (amarillo oscuro AA) | ⏰ reloj |
| `IN_GRACE_WINDOW` | `0 < días_vencida <= 30` | **Máxima** | `#B91C1C` (rojo oscuro AA) | 🔴 círculo + número de días |
| `ACTIVE` | `días_para_vencer > 30` | Normal | `#15803D` (verde oscuro AA) | ✓ check |
| `LOST` | `días_vencida > 30` | Archivada | `#6B7280` (gris neutro) | 🔒 candado |

> **Nota WCAG 2.1 AA:** Los colores indicados superan relación de contraste ≥ 4.5:1 sobre fondo blanco (`#FFFFFF`) y fondo gris claro (`#F9FAFB`). El color nunca es el único indicador — siempre hay icono y texto descriptivo (no depender únicamente del semáforo para daltonismo).

---

## 9. Contratos de API REST

Base URL: `http://localhost:8080/api/v1`

### 9.1 `GET /policies`

Retorna lista de pólizas enriquecida con datos del cliente, ordenada por criticidad.

**Query params opcionales:**

| Param | Valores | Descripción |
|-------|---------|-------------|
| `calculatedStatus` | `IN_GRACE_WINDOW`, `EXPIRING_SOON`, `ACTIVE`, `EXPIRED_LOST` | Filtrar por estado calculado |
| `status` | `PENDING`, `CONTACTED`, `RENEWED`, `LOST` | Filtrar por estado de gestión |
| `sort` | `priority` (default), `expiration_date`, `client_name` | Ordenamiento |

**Response 200:**
```json
{
  "content": [
    {
      "id": 1,
      "policyNumber": "AUTO-2024-001234",
      "insuranceCompany": "Seguros Bolívar",
      "policyType": "AUTO",
      "expirationDate": "2026-05-20",
      "status": "PENDING",
      "calculatedStatus": "IN_GRACE_WINDOW",
      "daysUntilExpiration": -6,
      "daysInGraceWindow": 6,
      "lastContactDate": null,
      "contactNotes": null,
      "client": {
        "id": 42,
        "name": "Carlos Ramírez",
        "phone": "+57 310 555 0001",
        "email": "carlos.ramirez@email.com"
      }
    }
  ],
  "totalElements": 28,
  "page": 0,
  "size": 20
}
```

### 9.2 `PATCH /policies/{id}/contact`

Registra que María realizó contacto.

**Request body:**
```json
{
  "contactNotes": "Interesado, llama el viernes"
}
```

**Response 200:** Póliza actualizada completa.

**Response 404:** `{ "code": "POLICY_NOT_FOUND", "message": "Policy with id {id} not found" }`

### 9.3 `POST /policies/{id}/renew`

Renueva la póliza con nueva fecha de vencimiento.

**Request body:**
```json
{
  "newExpirationDate": "2027-05-26",
  "contactNotes": "Renovó por un año más. Pago en efectivo."
}
```

**Validaciones:**
- `newExpirationDate` requerido, formato `YYYY-MM-DD`
- `newExpirationDate` debe ser posterior a `LocalDate.now()`
- La póliza no debe estar en estado `EXPIRED_LOST` (>30 días vencida) sin confirmación explícita

**Response 200:** Póliza actualizada.
**Response 400:** `{ "code": "INVALID_EXPIRATION_DATE", "message": "New expiration date must be in the future" }`

### 9.4 `PATCH /policies/{id}/lost`

Registra que el cliente decidió no renovar.

**Request body:**
```json
{
  "contactNotes": "Se fue con AXA. Dice que fue por precio."
}
```

**Response 200:** Póliza actualizada.

### 9.5 `GET /policies/{id}`

Detalle completo de una póliza con historial resumido.

### 9.6 `GET /clients`

Lista de clientes (para futura funcionalidad de CRUD).

### 9.7 `POST /clients`

Crear nuevo cliente (incluido si queda tiempo en MVP).

**Request body:**
```json
{
  "name": "Laura Gómez",
  "phone": "+57 320 555 0099",
  "email": "laura.gomez@email.com",
  "notes": "Referida por Carlos Ramírez"
}
```

### 9.8 Manejo de Errores (Global)

```json
{
  "timestamp": "2026-05-26T14:30:00",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "New expiration date must be in the future",
  "path": "/api/v1/policies/1/renew"
}
```

Códigos de error de dominio:
- `POLICY_NOT_FOUND`
- `CLIENT_NOT_FOUND`
- `INVALID_EXPIRATION_DATE`
- `POLICY_ALREADY_RENEWED`
- `VALIDATION_ERROR`

---

## 10. Especificaciones del Front-end

### 10.1 Stack

| Tecnología | Versión | Justificación |
|-----------|---------|---------------|
| React | 19 | Nuevo modelo de reactividad, compilador que elimina `useMemo`/`useCallback` innecesarios |
| Vite | 6.x | Build ultrarrápido, DX superior para MVP |
| TypeScript | 5.x | Tipado estricto, contratos claros con el back-end |
| TailwindCSS | 4.x | Utilidades CSS, diseño responsive rápido |
| Axios | 1.x | Cliente HTTP con interceptors para el offline-queue |
| React Query | 5.x | Cache, revalidación y estados de carga/error |

> **Nota Ionic/Capacitor:** La arquitectura React + Vite es compatible con Ionic 8 / Capacitor 6 para empaquetado móvil (iOS, Android, PWA) en una siguiente fase. No se implementa en el MVP pero el proyecto se estructura para soportarlo.

### 10.2 Pantalla Principal — Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  🚜 Insurance CRM    [Buscar cliente...]    [+ Nuevo]   │
├─────────────────────────────────────────────────────────┤
│  FILTROS: [Todas] [En Gracia 🔴 6] [Por Vencer 🟡 12]  │
│          [Vigentes ✓ 241] [Archivadas 21]               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔴 EN VENTANA DE GRACIA — 6 pólizas                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Carlos Ramírez           AUTO-2024-001234        │   │
│  │ Seguros Bolívar · AUTO   Vencida hace 6 días    │   │
│  │ 📞 +57 310 555 0001                              │   │
│  │ [Contactar]  [Renovar]  [No Renovó]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🟡 VENCEN ESTE MES — 12 pólizas                        │
│  ...                                                    │
│                                                         │
│  ✓ VIGENTES — 241 pólizas                              │
│  ...                                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 10.3 Componentes Principales

| Componente | Responsabilidad |
|-----------|----------------|
| `Dashboard` | Orquestador principal, maneja filtros y ordenamiento |
| `PolicyCard` | Tarjeta de póliza con estado visual y acciones |
| `PolicyStatusBadge` | Badge de estado calculado (semáforo accesible) |
| `ContactModal` | Modal para registrar contacto con notas |
| `RenewModal` | Modal para registrar renovación con nueva fecha |
| `OfflineBanner` | Banner de advertencia cuando no hay conexión |
| `SyncStatusIndicator` | Indicador de sincronización pendiente |
| `ClientForm` | Formulario de creación de cliente (si aplica) |

### 10.4 Manejo de Estado

```
PolicyCard → onClick "Contactar"
  → abre ContactModal
  → onConfirm → useMutation (React Query)
    → PATCH /api/v1/policies/{id}/contact
    → onSuccess → invalidate query policies → re-render automático
    → onError → mostrar toast de error
```

---

## 11. Accesibilidad (WCAG 2.1 AA)

> El estándar vigente es **WCAG 2.1 AA** (no 2.0). La próxima versión es WCAG 2.2 (2023), que añade criterios de focus y targets — implementar donde sea posible.

### 11.1 Reglas Críticas

1. **Color no es el único indicador:** Cada estado lleva icono + texto descriptivo además del color.
2. **Contraste mínimo 4.5:1** para texto normal, 3:1 para texto grande (≥18pt o ≥14pt bold).
3. **Targets táctiles ≥ 44×44 px** en botones de acción (WCAG 2.2 criterio 2.5.8).
4. **Navegación por teclado completa:** Tab, Enter, Esc en modales.
5. **ARIA labels** en botones con solo iconos.
6. **Focus visible** con outline de al menos 2px de contraste.
7. **Mensajes de estado** anunciados a lectores de pantalla con `role="status"` o `aria-live`.

### 11.2 Paleta de Colores Accesible

| Estado | Color HEX | Contraste sobre #FFFFFF | Contraste sobre #F9FAFB |
|--------|-----------|------------------------|------------------------|
| Rojo (gracia) | `#B91C1C` | 7.0:1 ✅ | 6.8:1 ✅ |
| Amarillo (por vencer) | `#B45309` | 4.7:1 ✅ | 4.6:1 ✅ |
| Verde (vigente) | `#15803D` | 5.1:1 ✅ | 5.0:1 ✅ |
| Gris (archivada) | `#374151` | 9.7:1 ✅ | 9.5:1 ✅ |

> Verificar con [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) antes de producción.

---

## 12. Estrategia Offline-First

### 12.1 Problema

Si el endpoint del asesor no tiene acceso a internet, la confirmación de renovación no debe perderse.

### 12.2 Solución: Cola de Sincronización Local

```
Acción del usuario (Renovar/Contactar)
        │
        ├─── navigator.onLine === true ──► API Call directo
        │                                   │ OK → actualiza UI
        │                                   │ Error red → guarda en cola
        │
        └─── navigator.onLine === false ──► Guarda en localStorage queue
                                            Badge "Pendiente de sync"
                                            
window.addEventListener('online')
        │
        ▼
SyncService.processQueue()
  → Itera cola, reintenta cada operación pendiente
  → onSuccess → elimina de cola, marca SYNCED
  → onError (500) → incrementa attempts, marca FAILED tras 3 intentos
  → notifica al usuario resultado del sync
```

### 12.3 Back-end

El back-end también persiste la cola en `renewal_sync_queue` para tener registro auditable. El front-end puede consultar `GET /api/v1/sync-queue/pending` para reconciliar estado si hay discrepancia.

---

## 13. Datos Semilla (Seed Data)

### 13.1 Distribución de Muestra

Para que el evaluador vea valor inmediato al abrir la app:

| Categoría | Cantidad | Propósito |
|-----------|----------|-----------|
| Pólizas EN ventana de gracia | 6 | Ver el rojo, probar Renovar |
| Pólizas que vencen en ≤ 30 días | 12 | Ver el amarillo, probar Contactar |
| Pólizas vigentes | 15 | Ver el verde |
| Pólizas archivadas (> 30 días vencidas) | 3 | Ver estado final |
| Clientes | 10 | Varios clientes con múltiples pólizas |

### 13.2 Configuración

```java
// DataSeeder.java — @Component que verifica si ya hay datos antes de insertar
@PostConstruct
public void seed() {
    if (clientRepository.count() == 0) {
        insertSampleData();
        log.info("[DataSeeder] Sample data loaded successfully — {} clients, {} policies",
                 CLIENT_COUNT, POLICY_COUNT);
    }
}
```

---

## 14. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Back-end runtime | Java | 21 (LTS) |
| Back-end framework | Spring Boot | 3.5.12 |
| Virtual Threads | Proyecto Loom | Java 21 (habilitado por config) |
| Persistencia | SQLite + Spring Data JPA | sqlite-jdbc 3.46.x |
| Migraciones | Flyway | 10.x (SQLite dialect) |
| Mapeo | MapStruct | 1.5.5 |
| Boilerplate | Lombok | 1.18.30 |
| Documentación API | SpringDoc OpenAPI | 2.6.0 |
| Build | Maven Wrapper | 3.9.x |
| Testing BE | JUnit 5, Mockito, AssertJ | Spring Boot test slice |
| Front-end framework | React | 19 |
| Build front-end | Vite | 6.x |
| Lenguaje FE | TypeScript | 5.x |
| Estilos | TailwindCSS | 4.x |
| HTTP client | Axios | 1.x |
| Estado servidor | React Query (TanStack) | 5.x |
| Testing FE | Vitest + React Testing Library | — |

---

## 15. Estructura de Proyecto

```
insurance-crm/
├── back-end/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/insurancecrm/
│   │   │   │   ├── InsuranceCrmApplication.java
│   │   │   │   ├── api/
│   │   │   │   │   ├── controller/
│   │   │   │   │   │   ├── PolicyController.java
│   │   │   │   │   │   └── ClientController.java
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── PolicyResponse.java   ← record
│   │   │   │   │   │   ├── RenewRequest.java     ← record
│   │   │   │   │   │   └── ContactRequest.java   ← record
│   │   │   │   │   └── exception/
│   │   │   │   │       └── GlobalExceptionHandler.java
│   │   │   │   ├── application/
│   │   │   │   │   └── service/
│   │   │   │   │       ├── PolicyService.java
│   │   │   │   │       └── ClientService.java
│   │   │   │   ├── domain/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── Policy.java
│   │   │   │   │   │   ├── Client.java
│   │   │   │   │   │   └── PolicyStatus.java    ← enum
│   │   │   │   │   └── service/
│   │   │   │   │       └── PolicyExpirationService.java
│   │   │   │   └── infrastructure/
│   │   │   │       ├── persistence/
│   │   │   │       │   ├── entity/
│   │   │   │       │   │   ├── PolicyEntity.java
│   │   │   │       │   │   └── ClientEntity.java
│   │   │   │       │   └── repository/
│   │   │   │       │       ├── PolicyJpaRepository.java
│   │   │   │       │       └── ClientJpaRepository.java
│   │   │   │       ├── mapper/
│   │   │   │       │   └── PolicyMapper.java    ← MapStruct
│   │   │   │       └── seeder/
│   │   │   │           └── DataSeeder.java
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/
│   │   │           ├── V1__create_clients_table.sql
│   │   │           ├── V2__create_policies_table.sql
│   │   │           └── V3__seed_sample_data.sql
│   │   └── test/
│   │       └── java/com/insurancecrm/
│   │           ├── api/controller/
│   │           │   └── PolicyControllerTest.java
│   │           ├── application/service/
│   │           │   └── PolicyServiceTest.java
│   │           └── domain/service/
│   │               └── PolicyExpirationServiceTest.java
│   └── pom.xml
│
├── front-end/
│   ├── src/
│   │   ├── api/
│   │   │   ├── policiesApi.ts
│   │   │   └── clientsApi.ts
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── PolicyCard/
│   │   │   ├── PolicyStatusBadge/
│   │   │   ├── ContactModal/
│   │   │   ├── RenewModal/
│   │   │   └── OfflineBanner/
│   │   ├── hooks/
│   │   │   ├── usePolicies.ts
│   │   │   └── useSyncQueue.ts
│   │   ├── services/
│   │   │   └── syncService.ts
│   │   ├── types/
│   │   │   └── policy.types.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 16. Quick Start (Sin Docker)

### Requisitos

- Java 21 JDK ([Adoptium Temurin](https://adoptium.net/))
- Node.js 22 LTS + npm

### Pasos

```bash
# 1. Clonar
git clone <repo-url> insurance-contractor-crm
cd insurance-contractor-crm

# 2. Back-end (inicia en puerto 8080)
cd back-end
./mvnw spring-boot:run
# SQLite se crea automáticamente en ./data/insurance_crm.db
# Seed data se carga al primer inicio

# 3. Front-end (inicia en puerto 5173)
cd ../front-end
npm install
npm run dev

# 4. Abrir en el navegador
open http://localhost:5173
```

### Configuración `application.yml`

```yaml
spring:
  datasource:
    url: jdbc:sqlite:./data/insurance_crm.db
    driver-class-name: org.sqlite.JDBC
  jpa:
    database-platform: org.hibernate.community.dialect.SQLiteDialect
    hibernate:
      ddl-auto: validate        # Flyway maneja el schema
  flyway:
    enabled: true
  threads:
    virtual:
      enabled: true             # Java 21 Virtual Threads

server:
  port: 8080

logging:
  level:
    com.insurancecrm: DEBUG
```

---

## 17. Decisiones Técnicas y Trade-offs

| Decisión | Alternativa considerada | Por qué esta |
|----------|------------------------|--------------|
| **SQLite** en vez de PostgreSQL | PostgreSQL local, H2 | Portabilidad máxima — corre sin Docker. Un archivo = toda la base de datos. Suficiente para 280 clientes. |
| **Virtual Threads** (Java 21) | Reactive WebFlux | Más simple, Spring MVC estándar. Misma eficiencia para I/O-bound sin cambiar el modelo de programación. |
| **React 19 + Vite** en vez de Angular | Angular 19 | El evaluador/asesor solo ve una pantalla. React es más liviano para un MVP de una sola vista. Angular es la elección correcta si el proyecto escala. |
| **React Query** en vez de Redux | Zustand, Context API | El estado es principalmente "datos del servidor". React Query elimina el boilerplate de loading/error/cache. |
| **Sin auth** | JWT básico | El MVP valida la solución de negocio, no la seguridad. Auth es la siguiente historia de usuario documentada. |
| **Records Java** para DTOs | Clases con Lombok | Inmutabilidad, equals/hashCode/toString gratis, más expresivos. |
| **MapStruct** para mapeos | ModelMapper, manual | Type-safe, performance en compile-time, sin reflection. |
| **Flyway** para migraciones | Liquibase | Más simple para proyectos pequeños. Configuración mínima. |

---

## 18. Fuera de Alcance MVP

```
┌─────────────────────────────────────────────────────────────┐
│  FUTURAS HISTORIAS DE USUARIO (post-MVP)                    │
├─────────────────────────────────────────────────────────────┤
│  US-02  │ Autenticación JWT (multi-asesor)                  │
│  US-03  │ Notificaciones push / email automáticos           │
│  US-04  │ Integración con APIs de aseguradoras              │
│  US-05  │ Reportes de gestión (tasa de renovación, etc.)    │
│  US-06  │ App móvil con Ionic + Capacitor                   │
│  US-07  │ Multi-tenancy (agencia con N asesores)            │
│  US-08  │ Historial completo de gestión por póliza          │
│  US-09  │ Importación desde Excel (migración de datos)      │
│  US-10  │ Módulo de consumo de API de aseguradora + login   │
└─────────────────────────────────────────────────────────────┘
```

---

## 19. Historias de Usuario

### US-01 (MVP) — Dashboard de Renovaciones

**Como** asesora de seguros,
**quiero** ver mis pólizas ordenadas por urgencia en una pantalla,
**para** saber exactamente a quién llamar hoy sin buscar en Excel.

**Criterios de aceptación:**
- [ ] Las pólizas se muestran agrupadas: En gracia / Por vencer / Vigentes / Archivadas
- [ ] Los colores son accesibles (WCAG 2.1 AA), no dependen solo del color
- [ ] El número de días restantes/vencidos es visible en cada tarjeta
- [ ] La lista carga en menos de 1 segundo para 280 pólizas

### US-01b (MVP) — Registrar Contacto

**Como** asesora,
**quiero** marcar en un clic que llamé a un cliente,
**para** no perder el registro de qué hice y cuándo.

**Criterios de aceptación:**
- [ ] El botón "Contactar" abre un modal con campo de notas opcional
- [ ] Tras confirmar, la tarjeta muestra "Contactado + fecha/hora"
- [ ] La acción se guarda aunque no haya internet

### US-01c (MVP) — Registrar Renovación

**Como** asesora,
**quiero** registrar la nueva fecha de vencimiento cuando un cliente renueva,
**para** que la póliza pase a estado verde y salga de la lista de urgentes.

**Criterios de aceptación:**
- [ ] El campo de nueva fecha tiene default en `+1 año` editable
- [ ] La fecha no puede ser en el pasado
- [ ] La póliza regresa a estado VERDE tras renovar
- [ ] Si no hay internet, la renovación se guarda y sincroniza al reconectar

---

## 20. Criterios de Aceptación (Definition of Done)

- [ ] `./mvnw clean verify` pasa sin errores
- [ ] `npm run build` pasa sin errores
- [ ] Cobertura de tests back-end ≥ 80% en paquetes de dominio y servicio
- [ ] API documentada en `/swagger-ui.html`
- [ ] Seed data visible al primer inicio sin configuración manual
- [ ] Funciona con `./mvnw spring-boot:run` + `npm run dev` (sin Docker)
- [ ] Colores verificados con WebAIM Contrast Checker
- [ ] Navegación por teclado funcional en dashboard y modales
- [ ] Offline: renovación guardada y sincronizada al reconectar
- [ ] Sin datos sensibles en logs
- [ ] Commits en formato `<tipo>(<scope>): <descripción>` (Conventional Commits)

---

## 21. GitFlow

```
main
  └─ release/0.1.0
       └─ develop
            ├─ feature/ymanrique/backend-mvp-implementation
            └─ feature/ymanrique/frontend-mvp-implementation
```

**Reglas:**
- No commits directos en `main` ni `develop`
- PRs con checklist cumplida antes de merge
- Un PR por historia de usuario o módulo significativo
- Mensajes de commit: `feat(policy): agregar endpoint de renovación`

---

*Este documento es un artefacto vivo. Actualizar a medida que el desarrollo avanza.*

*MIT © 2026 Yadin Paulo Manrique Márquez*
