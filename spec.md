# Análisis, comprensión, y especificaciones del sistema "Insurance Contractor CRM"

> **Propósito:** Este documento especifica el MVP del sistema CRM para asesores de seguros,
> creado como parte de la prueba técnica para Agentemotor.
> Se lee **antes** que el código. Refleja el análisis, las decisiones y los trade-offs
> considerados antes de escribir una sola línea.

---

## 1. Entendimiento del problema

### 1.1 El dolor de María (y de 500+ asesores como ella)

María es una asesora de seguros con **280 clientes activos**. Su día a día implica:

- Gestionar renovaciones de pólizas (auto, hogar, vida, etc.)
- Hacer seguimiento manual a fechas de vencimiento
- Registrar contactos con clientes
- Evitar que las pólizas venzan sin que ella se dé cuenta

Actualmente usa **un Excel gigante** donde:

| Problema | Impacto |
|----------|---------|
| El archivo se daña o corrompe | Pérdida de información comercial crítica |
| Se duplican registros | Confusión sobre el estado real de la cartera |
| No hay trazabilidad de gestiones | "No sé qué le ofrecí a quién ni cuándo" |
| Las pólizas vencen sin alerta | **5-10 clientes perdidos al mes** — se van con otro asesor |

Eso son **60-120 clientes al año** que María pierde. En una cartera de 280,
hablamos de hasta un **43% de fuga anual** prevenible.

### 1.2 Contexto regulatorio colombiano (crítico)

La **Circular Externa de la Superintendencia Financiera de Colombia** establece:

> Una póliza de auto vencida puede ser renovada por el **mismo intermediario**
> dentro de los **30 días siguientes** a la fecha de vencimiento, sin que el cliente
> pierda historial ni la aseguradora trate la operación como nueva contratación.

**Después de 30 días**: la renovación se considera nueva contratación y el asesor
compite en igualdad de condiciones con cualquier otro intermediario.

**Consecuencia**: una póliza vencida hace 5 días NO es lo mismo que una vencida
hace 35. La ventana de 30 días es el **factor crítico** que determina la prioridad
de gestión.

### 1.3 Lo que el sistema debe resolver

| Necesidad | Cómo se cubre en el MVP |
|-----------|------------------------|
| Ver qué pólizas están por vencer | Dashboard priorizado con semáforo (crítico, alerta, vigente) |
| Saber hace cuánto venció una póliza | Indicador de días de vencido + badge de ventana de 30 días |
| Registrar gestión comercial | Botón "Contactado" que actualiza `last_contact_date` |
| Procesar renovación | Botón "Renovar" con ingreso de nueva fecha de vencimiento |
| No perder trazabilidad | Cada acción queda registrada en la base de datos con timestamp |
| Accesibilidad visual | Semaforización con colores + iconos (no solo color) |

---

## 2. Decisiones de alcance (MVP)

### 2.1 Qué se construye

| Componente | Decisión | Justificación |
|------------|----------|---------------|
| **Backend** | Python + Flask | Simplicidad, sintaxis clara, mínimas dependencias. La prueba pide stack libre y Flask es lo más directo para una API REST rápida. |
| **API REST** | 3 endpoints | Los justos y necesarios: listar pólizas, marcar contacto, renovar. Sin sobreingeniería. |
| **Frontend** | Vanilla JS + HTML5 + CSS3 puro | Carga instantánea, sin compilación, sin framework. Funciona en cualquier navegador moderno. |
| **Persistencia** | SQLite | Preferido por la prueba. No requiere servidor de base de datos. Portátil. |
| **Dashboard** | Pantalla única priorizada | Una sola vista: lo urgente arriba, lo demás abajo. Sin navegación compleja. |
| **Seed data** | 280 clientes con ~320 pólizas | Datos realistas desde el primer `pip install` + `python seed.py`. |
| **Tests** | 3 tests del caso crítico | Validan la lógica de la ventana de 30 días, el prioritización y la renovación. |
| **Comentarios** | Español colombiano | Código comentado en el idioma del asesor. Facilita el mantenimiento. |

### 2.2 Qué se deja fuera (y por qué)

| Excluido | Justificación |
|----------|---------------|
| **Autenticación / Login** | María es la única usuaria. Implementar auth suma complejidad sin valor para el alcance de la prueba. La prueba explícitamente lo valida como decisión válida. |
| **Docker / Contenerización** | Prohibido explícitamente por las reglas del reto. |
| **Integración con aseguradoras** | Requeriría acceso a APIs de 14 aseguradoras colombianas. Fuera del alcance. María ingresa fechas manualmente. |
| **CRUD completo de clientes** | El MVP arranca con datos precargados. La base de datos lo soporta, pero la interfaz no expone creación de clientes en esta versión. |
| **Notificaciones push / email** | Serían valiosas pero agregarían complejidad de infraestructura. María usa la app activamente. |
| **Historial de renovaciones anteriores** | Se almacena el último contacto, no el histórico completo. Suficiente para el MVP. |
| **Roles y permisos** | Un solo asesor, un solo rol. |
| **Modo offline / PWA** | La app corre localmente, siempre hay conexión a la API local. |
| **Framework CSS** | CSS3 puro. Sin Bootstrap, Tailwind, ni dependencias frontend. |

---

## 3. Supuestos

| Supuesto | Fundamento |
|----------|------------|
| **Foco en autos** | Aunque el modelo soporta múltiples ramos (hogar, vida, etc.), la lógica de los 30 días de gracia se aplica transversalmente en el MVP para simplificar. Agentemotor es principalmente auto. |
| **Python 3.9+ disponible** | El evaluador tiene Python 3.9+ instalado. Si no, el README indica cómo instalarlo. |
| **Entorno local/limpio** | La app se ejecuta en localhost. No se requieren servicios cloud ni credenciales externas. |
| **SQLite sin concurrencia** | Al ser herramienta de un solo usuario, SQLite maneja el volumen sin bloqueos transaccionales pesados. |
| **María ingresa fechas manualmente** | No hay integración automática con aseguradoras. Las renovaciones se registran a mano. |
| **Navegador moderno** | El frontend usa Fetch API, CSS Grid, y ES6+. Compatible con Chrome, Firefox, Edge, Safari (2 versiones recientes). |

---

## 4. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                   NAVEGADOR (Cliente)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Pantalla única (index.html)              │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │  CSS3   │ │ Vanilla  │ │  Iconos SVG      │  │   │
│  │  │ puro    │ │ JS (ES6) │ │  (accesibilidad) │  │   │
│  │  └─────────┘ └──────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                        ↕ Fetch API (HTTP)               │
└─────────────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────────────┐
│              BACKEND (Flask - Puerto 5000)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  app.py  │ │models.py │ │routes.py │ │ seed.py  │   │
│  │(entrada) │ │(modelos) │ │(3 endpoints)│ │(datos)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                        ↕                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SQLite (insurance_crm.db)            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.1 Principios arquitectónicos

- **Separación de responsabilidades**: modelos, rutas, configuración y seed data
  en archivos separados.
- **API RESTful**: endpoints con naming consistente (`/api/v1/...`), métodos HTTP
  semánticos (GET, PATCH, POST).
- **Stateless**: el backend no mantiene estado de sesión. Todo el estado está en
  SQLite.
- **Frontend como estático**: Flask sirve los archivos del frontend desde
  `insurance-crm-frontend/src/`.

---

## 5. Estructura del proyecto

```
InsuranceContractorCRM/                      # Carpeta raíz (a renombrar como manrique_yadin/)
├── spec.md                                  # ← ESTE ARCHIVO
├── README.md                                # Cómo correrlo + decisiones + reflexión
├── code_review.md                           # Review del snippet Flask
├── agents.md                                # Skills para el agente IA
│
├── ai_history/                              # Historial de conversación con IA (OBLIGATORIO)
│   ├── 01_planeacion.md
│   ├── 02_implementacion.md
│   ├── 03_code_review.md
│   └── ...
│
├── insurance-crm-backend/                   # Backend Python + Flask
│   ├── .gitignore
│   ├── LICENSE
│   ├── src/
│   │   ├── __init__.py
│   │   ├── app.py                           # Punto de entrada + config
│   │   ├── models.py                        # Modelos SQLite (clients, policies)
│   │   ├── routes.py                        # Endpoints de la API REST
│   │   ├── seed.py                          # Generación de datos de prueba (~280 clientes)
│   │   └── db.py                            # Conexión e inicialización de BD
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_policies.py                 # Tests del caso crítico (ventana 30 días)
│   │   └── conftest.py                      # Fixtures de prueba
│   └── requirements.txt                     # Flask, pytest
│
└── insurance-crm-frontend/                  # Frontend Vanilla JS + HTML5 + CSS3
    ├── .gitignore
    ├── LICENSE
    ├── src/
    │   ├── index.html                       # Pantalla principal (única)
    │   ├── css/
    │   │   └── styles.css                   # CSS3 puro (semaforización, layout, iconos)
    │   ├── js/
    │   │   └── app.js                       # Vanilla JS (ES6) — lógica de frontend
    │   └── assets/
    │       └── icons/                       # Iconos SVG para accesibilidad visual
    └── tests/
        └── (pruebas de frontend si aplican)
```

---

## 6. Modelo de datos

### 6.1 Diagrama entidad-relación

```
┌─────────────────┐       ┌──────────────────────────┐
│     clients     │       │        policies           │
├─────────────────┤       ├──────────────────────────┤
│ id (PK)         │──┐    │ id (PK)                  │
│ name            │  │    │ client_id (FK) ──────────┤
│ phone           │  └─── │ policy_number             │
│ email           │       │ insurance_company         │
│ advisor_id      │       │ policy_type               │
│ created_at      │       │ expiration_date           │
└─────────────────┘       │ status                    │
                           │ last_contact_date         │
                           │ created_at                │
                           └──────────────────────────┘
```

### 6.2 Tabla: `clients`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER (PK) | Identificador único del cliente |
| `name` | TEXT (NOT NULL) | Nombre completo del cliente |
| `phone` | TEXT | Número de contacto |
| `email` | TEXT | Correo electrónico |
| `advisor_id` | TEXT (NOT NULL) | Identificador del asesor. Para el MVP, siempre `'maria'` |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

### 6.3 Tabla: `policies`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER (PK) | Identificador único de la póliza |
| `client_id` | INTEGER (FK → clients.id) | Cliente propietario de la póliza |
| `policy_number` | TEXT (NOT NULL) | Número de póliza (único por aseguradora) |
| `insurance_company` | TEXT (NOT NULL) | Aseguradora (ej: "Sura", "Bolívar", "Mapfre") |
| `policy_type` | TEXT (NOT NULL) | Tipo: `auto`, `hogar`, `vida`, `salud`, `soat` |
| `expiration_date` | DATE (NOT NULL) | Fecha de vencimiento de la póliza |
| `status` | TEXT (NOT NULL) | Estado: `vigente`, `vencida`, `renovada`, `no_renovo` |
| `last_contact_date` | TIMESTAMP | Última fecha de contacto registrada por el asesor |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

### 6.4 Estados posibles de una póliza

```
                    ┌──────────┐
                    │ vigente  │
                    └────┬─────┘
                         │ (llega la fecha de vencimiento)
                         ▼
                    ┌──────────┐
              ┌─────│ vencida  │─────┐
              │     └──────────┘     │
              ▼                      ▼
     ┌──────────────┐       ┌──────────────┐
     │  renovada    │       │  no_renovo   │
     │(nueva fecha) │       │(se perdió el │
     └──────────────┘       │   cliente)   │
                            └──────────────┘
```

### 6.5 Priorización (lógica de negocio)

La prioridad se calcula **dinámicamente** en cada request, combinando:

| Estado | Prioridad | Color | Icono | Criterio |
|--------|-----------|-------|-------|----------|
| `vencida` + días ≤ 30 | **Crítica** | 🔴 Rojo | ⚠️ | Ventana de 30 días activa. El asesor PUEDE renovar. **URGENTE** |
| `vencida` + días > 30 | **Perdida** | ⚫ Negro | ❌ | Ventana de 30 días vencida. El asesor YA NO PUEDE renovar como tal. |
| `vigente` + vence en ≤ 30 días | **Alerta** | 🟡 Amarillo | 🔔 | Vence pronto. El asesor DEBE contactar. |
| `vigente` + vence en > 30 días | **OK** | 🟢 Verde | ✅ | Vigente. Sin acción urgente. |
| `renovada` | **OK** | 🟢 Verde | ✅ | Gestionada exitosamente. |
| `no_renovo` | **Perdida** | ⚫ Negro | ❌ | Cliente perdido. |

> **Nota de accesibilidad**: La prioridad NUNCA se comunica solo con color.
> Siempre va acompañada de icono SVG + etiqueta de texto, garantizando
> que asesores con daltonismo puedan usar la herramienta sin fricción.

---

## 7. Endpoints de la API REST

### 7.1 `GET /api/v1/policies`

Lista todas las pólizas del asesor, priorizadas por criticidad.

**Query params:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | `todos` | Filtro: `vigente`, `vencida`, `renovada`, `no_renovo` |
| `priority` | string | `todos` | Filtro: `critica`, `alerta`, `ok`, `perdida` |
| `policy_type` | string | `todos` | Filtro: `auto`, `hogar`, `vida`, `salud`, `soat` |
| `advisor_id` | string | `maria` | Asesor (para el MVP solo existe María) |

**Response `200 OK`:**
```json
{
  "total": 320,
  "criticas": 3,
  "alerta": 4,
  "ok": 310,
  "perdidas": 3,
  "policies": [
    {
      "id": 1,
      "client": {
        "name": "Carlos Méndez",
        "phone": "3001234567"
      },
      "policy_number": "AUTO-2026-001",
      "insurance_company": "Sura",
      "policy_type": "auto",
      "expiration_date": "2026-05-15",
      "status": "vencida",
      "priority": "critica",
      "days_overdue": 12,
      "days_remaining_window": 18,
      "last_contact_date": null,
      "recommended_action": "Contactar urgentemente. Ventana de 30 días activa: quedan 18 días."
    }
  ]
}
```

### 7.2 `PATCH /api/v1/policies/{id}/contact`

Registra que el asesor contactó al cliente de esta póliza.

**Request body:**
```json
{
  "notes": "Cliente dice que va a renovar la semana que viene"
}
```

**Response `200 OK`:**
```json
{
  "id": 1,
  "status": "vencida",
  "priority": "critica",
  "last_contact_date": "2026-05-27T14:30:00Z",
  "message": "Contacto registrado exitosamente"
}
```

### 7.3 `POST /api/v1/policies/{id}/renew`

Procesa la renovación de una póliza.

**Request body:**
```json
{
  "new_expiration_date": "2027-05-15"
}
```

**Response `200 OK`:**
```json
{
  "id": 1,
  "status": "renovada",
  "previous_expiration_date": "2026-05-15",
  "new_expiration_date": "2027-05-15",
  "message": "Póliza renovada exitosamente hasta el 2027-05-15"
}
```

**Response `400 Bad Request`:**
```json
{
  "error": "La nueva fecha de vencimiento debe ser posterior a la actual"
}
```

---

## 8. Flujos principales del sistema

### 8.1 Flujo de aterrizaje (al abrir la app)

```
1. Usuario abre http://localhost:5000
2. Flask sirve index.html
3. app.js hace GET /api/v1/policies (sin filtro)
4. Backend calcula prioridades (critica, alerta, ok, perdida)
5. Frontend renderiza tabla ordenada:
   ┌─ CRÍTICAS ─────────────────────────────┐
   │ ⚠️ Póliza vencida - quedan 18 días     │  ← ROJO
   ├─ ALERTA ───────────────────────────────┤
   │ 🔔 Póliza por vencer en 15 días        │  ← AMARILLO
   ├─ VIGENTES ─────────────────────────────┤
   │ ✅ Póliza vigente hasta 2027-01-15     │  ← VERDE
   ├─ PERDIDAS ─────────────────────────────┤
   │ ❌ Póliza vencida - ventana vencida    │  ← NEGRO
   └─────────────────────────────────────────┘
6. María VE de inmediato lo que tiene que hacer
```

### 8.2 Flujo de gestión (contacto telefónico)

```
1. María ve una póliza en estado crítico o alerta
2. Toma el teléfono y llama al cliente (el número está visible)
3. Hace la gestión comercial
4. Hunde clic en botón "📞 Contactado"
5. app.js → PATCH /api/v1/policies/{id}/contact
6. Backend actualiza last_contact_date
7. Frontend refresca y muestra el badge "Contactado hoy"
8. Opcional: escribe notas sobre la gestión
```

### 8.3 Flujo de cierre (renovación)

```
1. El cliente acepta renovar
2. María identifica la póliza en el dashboard
3. Hunde clic en "🔄 Renovar"
4. Aparece un modal/modalito pidiendo la nueva fecha
5. Ingresa la fecha (ej: 2027-05-15 para renovación anual)
6. app.js → POST /api/v1/policies/{id}/renew
7. Backend:
   a. Valida que la nueva fecha sea posterior
   b. Actualiza status = "renovada"
   c. Actualiza expiration_date
   d. Actualiza last_contact_date
8. Frontend refresca: la póliza pasa a estado verde ✅
```

### 8.4 Flujo de "No renovó"

```
1. El cliente dice que no va a renovar
2. María hunde clic en "❌ No renovó"
3. app.js → PATCH /api/v1/policies/{id}/status (status: "no_renovo")
4. Backend actualiza el estado
5. La póliza se mueve a la sección "Perdidas" (negra)
6. María puede enfocarse en las que SÍ se pueden salvar
```

---

## 9. Seed data

### 9.1 Estrategia

Para que la aplicación se vea **realista desde el segundo cero**,
el script `seed.py` genera:

| Tipo | Cantidad | Detalle |
|------|----------|---------|
| Clientes | **280** | Nombres colombianos realistas, teléfonos, emails |
| Pólizas de auto | ~220 | Principal ramo. Varias aseguradoras colombianas |
| Pólizas de hogar | ~40 | Segundas pólizas de algunos clientes |
| Pólizas de vida | ~30 | Clientes con múltiples productos |
| Pólizas SOAT | ~30 | Seguro obligatorio |
| **Total pólizas** | **~320** | Algunos clientes tienen 2+ pólizas |

### 9.2 Distribución de escenarios

| Escenario | Cantidad | Propósito |
|-----------|----------|-----------|
| Vencidas en ventana 30 días (crítica) | 3-5 | Probar que aparecen primero, en rojo |
| Por vencer en ≤ 30 días (alerta) | 5-8 | Probar alerta temprana |
| Vigentes (OK) | ~290 | La mayoría — cartera sana |
| Vencidas +30 días (perdidas) | 2-3 | Probar que se marcan como pérdidas |
| Renovadas recientemente | 5-8 | Probar que se ven en verde |

### 9.3 Aseguradoras incluidas

| Aseguradora | Tipo |
|-------------|------|
| Sura | Auto, Hogar, Vida, SOAT |
| Bolívar | Auto, Hogar, Vida |
| Mapfre | Auto, SOAT |
| Seguros del Estado | Auto, SOAT |
| AXA Colpatria | Auto, Hogar, Vida |
| Liberty | Auto, Hogar |
| Allianz | Auto, Vida |
| La Previsora | SOAT, Auto |
| Equidad | Auto, Hogar |
| Colseguros | Auto, Vida |

---

## 10. Trade-offs y decisiones técnicas

| Decisión | Alternativa considerada | Por qué se eligió esta |
|----------|------------------------|----------------------|
| **Flask vs FastAPI** | FastAPI (async, Pydantic, OpenAPI) | Flask es más simple, menos conceptos. Para un MVP de 3 endpoints, FastAPI agrega complejidad innecesaria. El evaluador puede centrarse en la lógica de negocio. |
| **sqlite3 vs SQLAlchemy** | SQLAlchemy (ORM completo) | sqlite3 es parte de la stdlib de Python. Cero dependencias extra. Para 2 tablas y consultas simples, un ORM es sobreingeniería. |
| **CSS puro vs Bootstrap** | Bootstrap 5 | CSS puro = cero dependencias, cero descargas, cero fricción. El diseño es simple (una tabla + botones). Bootstrap agregaría ~150KB por un layout que se hace en 50 líneas de CSS Grid. |
| **Fetch API vs Axios** | Axios (más ergonómico) | Fetch es nativo del browser. Cero dependencias. Para 3 llamadas GET/PATCH/POST, la ergonomía extra de Axios no justifica agregar una librería. |
| **SVG icons vs Font Awesome** | Font Awesome | Los SVG son inline, no requieren descarga de fuentes, y son totalmente accesibles con etiquetas `<title>` y `role="img"`. |
| **PATCH vs PUT para contacto** | PUT (reemplazo completo) | PATCH es semánticamente correcto: solo actualizamos `last_contact_date`, no reemplazamos todo el recurso. |
| **Datos en español vs inglés** | Tablas y endpoints en inglés | El modelo de datos sigue la convención del snippet de la prueba (inglés). Los comentarios de código van en español colombiano. Mejor práctica: código en inglés, documentación y comentarios en español. |

---

## 11. Tests: casos críticos

Se implementarán **3 tests** que cubren el caso más crítico del negocio:
**la ventana de 30 días para renovación de pólizas vencidas**.

| # | Test | Qué valida | Por qué es crítico |
|---|------|-----------|-------------------|
| 1 | `test_prioridad_critica_dentro_ventana_30_dias` | Una póliza vencida hace 12 días debe tener prioridad `critica` | María DEBE ver esto primero. Si no, pierde clientes. |
| 2 | `test_prioridad_perdida_fuera_ventana_30_dias` | Una póliza vencida hace 35 días debe tener prioridad `perdida` | María no debe perder tiempo en lo que ya no se puede salvar. |
| 3 | `test_renovacion_actualiza_estado_y_fecha` | Renovar cambia `status` a `renovada` y actualiza `expiration_date` | El flujo de cierre debe funcionar correctamente. Si falla, María anota mal las renovaciones. |

---

## 12. Checklist de autoevaluación

Antes de dar por terminado el MVP:

- [ ] `pip install -r requirements.txt` funciona en máquina limpia
- [ ] `python src/app.py` levanta el servidor en puerto 5000
- [ ] `GET /api/v1/policies` retorna datos priorizados
- [ ] `PATCH /api/v1/policies/{id}/contact` registra contacto
- [ ] `POST /api/v1/policies/{id}/renew` procesa renovación
- [ ] Pantalla única muestra semáforo con iconos
- [ ] Seed data genera 280+ clientes y 300+ pólizas
- [ ] 3 tests pasan: `pytest tests/ -v`
- [ ] Código backend comentado en español colombiano
- [ ] `spec.md`, `README.md`, `code_review.md` y `ai_history/` presentes
- [ ] Sin Docker, sin servicios cloud, sin credenciales externas

---

> **Documento versionado:** 1.0
> **Autor:** Yadin Paulo Manrique Márquez + OpenCode
> **Propósito:** Especificación técnica del MVP para prueba técnica Agentemotor
