# Insurance Contractor CRM — Skills del Agente IA

> Este archivo define las habilidades, reglas y convenciones que el agente IA
> debe cargar automáticamente al trabajar en este proyecto.
> SIRVE COMO: skill registry + coding standards + architecture rules.

---

## Trigger de activación

Este archivo se activa automáticamente cuando se detecta cualquiera de estos contextos:
- Archivos en `insurance-crm-backend/` (`.py`)
- Archivos en `insurance-crm-frontend/` (`.html`, `.css`, `.js`)
- Archivos de configuración: `requirements.txt`, `spec.md`, `README.md`
- Términos en el prompt: "Flask", "SQLite", "Vanilla JS", "seed data", "CRM", "póliza", "asesor"

---

## Skill 1: Python Backend (Flask + SQLite)

### Stack
- Python 3.9+
- Flask 3.x (microframework)
- sqlite3 (standard library — sin dependencias externas de BD)
- pytest 8.x para tests

### Estructura de archivos
```
insurance-crm-backend/src/
├── app.py          # Punto de entrada: creación de app Flask, registro de rutas
├── models.py       # Modelos de datos (namedtuple o dataclass + SQL puro)
├── routes.py       # Endpoints de la API REST (Blueprints)
├── db.py           # Conexión e inicialización de SQLite
└── seed.py         # Generación de datos de prueba

insurance-crm-backend/tests/
├── conftest.py     # Fixtures (cliente de prueba, BD en memoria)
└── test_policies.py  # Tests del caso crítico (ventana 30 días)
```

### Convenciones de código

| Regla | Estándar |
|-------|----------|
| **Comentarios** | En español latinoamericano de Colombia. Explicar el POR QUÉ, no el qué. |
| **Nombres de variables/funciones** | En inglés (`snake_case`) |
| **Nombres de clases** | En inglés (`PascalCase`) |
| **Nombres de tablas/columnas** | En inglés (`snake_case`) |
| **Endpoints** | `/api/v1/{recurso}` — RESTful |
| **Métodos HTTP** | GET para listar, PATCH para actualizar parcial, POST para crear |
| **Status codes** | 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error |
| **Formato de fechas** | ISO 8601: `YYYY-MM-DD` para fechas, `YYYY-MM-DDThh:mm:ssZ` para timestamps |
| **Máximo de líneas por función** | 30 líneas. Si es más grande, refactorizar. |
| **Type hints** | Obligatorios en todas las funciones y métodos |
| **Docstrings** | En español (formato: `"""Descripción. Args: ... Returns: ..."""`) |

### Formato de comentarios (ejemplo)
```python
# ──────────────────────────────────────────────
# Consulta las pólizas del asesor y calcula la
# prioridad según la ventana regulatoria de 30
# días para renovación en Colombia.
# ──────────────────────────────────────────────
def get_policies_for_advisor(advisor_id: str) -> list[dict]:
    """Retorna las pólizas de un asesor con su prioridad calculada."""
```

### Anti-patterns (NO hacer)
- ❌ NO usar SQLAlchemy para 2 tablas (usar sqlite3 directo)
- ❌ NO poner lógica de negocio en los controladores/rutas
- ❌ NO mezclar capas: modelo, ruta y seed en el mismo archivo
- ❌ NO exponer errores internos en las respuestas API (ej: traceback de SQLite)
- ❌ NO usar `from flask import *`
- ❌ NO dejar el `debug=True` en producción (para el MVP local está bien)

### Patrones permitidos
- ✅ `sqlite3.Row` como row_factory para acceso por nombre de columna
- ✅ `dataclasses` para modelos simples
- ✅ `contextlib.closing` o gestión explícita de conexiones
- ✅ Blueprints de Flask para separar rutas
- ✅ `os.path` para resolución de rutas (portabilidad)

---

## Skill 2: Vanilla JavaScript (ES6+)

### Stack
- JavaScript ES6+ (navegador, sin Node.js)
- Fetch API para comunicación HTTP
- Sin frameworks, sin librerías, sin transpilación

### Estructura de archivos
```
insurance-crm-frontend/src/js/
└── app.js   # Único archivo JS para el MVP
```

### Convenciones de código

| Regla | Estándar |
|-------|----------|
| **Comentarios** | En español colombiano (explicar el POR QUÉ) |
| **Nombres de variables** | `camelCase` en inglés |
| **Nombres de funciones** | `camelCase` en inglés, verbos: `fetchPolicies`, `renderTable`, `handleRenew` |
| **Constantes** | `UPPER_SNAKE_CASE` para valores fijos (ej: `API_BASE_URL`) |
| **Indentación** | 2 espacios |
| **Punto y coma** | Obligatorio al final de cada statement |
| **Módulos** | No usar ES modules (import/export). Un solo archivo con funciones globales. |
| **Async** | `async/await` para llamadas a la API |
| **Manejo de errores** | `try/catch` en cada llamada fetch. Mostrar error en UI. |

### Patrones obligatorios

```javascript
// ──────────────────────────────────────────────
// Constantes de la aplicación
// ──────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:5000/api/v1';

// ──────────────────────────────────────────────
// Obtiene la lista de pólizas desde el backend
// y las renderiza en la tabla del dashboard.
// ──────────────────────────────────────────────
async function fetchPolicies(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE_URL}/policies?${params}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        // Muestra el error en la interfaz para que María sepa qué pasó
        showError('No se pudieron cargar las pólizas. Verificá la conexión con el servidor.');
        console.error('[fetchPolicies]', error);
        return null;
    }
}
```

### Anti-patterns (NO hacer)
- ❌ NO usar `var` (usar `const` y `let`)
- ❌ NO manipular el DOM con `innerHTML` sin sanitizar
- ❌ NO hacer llamadas sincrónicas (`XMLHttpRequest` con `async: false`)
- ❌ NO dejar `console.log` en el código final (solo `console.error` para errores)
- ❌ NO mezclar lógica de negocio en el HTML (usar `app.js`)
- ❌ NO usar `eval()` ni `new Function()`

---

## Skill 3: HTML5

### Stack
- HTML5 semántico
- Sin frameworks de componentes
- Sin librerías de UI

### Estructura de archivos
```
insurance-crm-frontend/src/
└── index.html   # Pantalla única del dashboard
```

### Patrones obligatorios

```html
<!DOCTYPE html>
<html lang="es-CO">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insurance CRM — Dashboard de Cartera</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Cabecera con información del asesor -->
    <header>
        <h1>📋 Cartera de María</h1>
        <div class="resumen" id="resumen-cartera">
            <!-- Poblado por JavaScript con los totales -->
        </div>
    </header>

    <!-- Tabla principal de pólizas -->
    <main>
        <!-- Filtros rápidos -->
        <div class="filtros" id="filtros">
            <!-- Poblado por JavaScript -->
        </div>

        <!-- Listado de pólizas -->
        <section id="lista-politicas">
            <!-- Poblado por JavaScript -->
        </section>
    </main>

    <!-- Modal para confirmar renovación -->
    <dialog id="modal-renovar">
        <!-- Contenido del modal -->
    </dialog>

    <script src="js/app.js"></script>
</body>
</html>
```

### Reglas semánticas

| Elemento | Uso |
|----------|-----|
| `<header>` | Cabecera con título y resumen de cartera |
| `<main>` | Contenido principal (el dashboard) |
| `<section>` | Cada grupo de prioridad (críticas, alerta, vigentes) |
| `<table>` o `<div>` con `role="table"` | Listado de pólizas |
| `<dialog>` | Modal de renovación |
| `<button>` | Todas las acciones (NUNCA `<div>` con onclick) |
| `<form>` | Para ingreso de nueva fecha de renovación |
| `role="img"` + `<title>` | En iconos SVG para accesibilidad |

### Anti-patterns
- ❌ NO usar `<div>` para botones
- ❌ NO usar `<br>` para espaciado (usar CSS)
- ❌ NO usar tablas para layout (usar CSS Grid/Flexbox)
- ❌ NO poner scripts en el `<head>` sin `defer` o al final del `<body>`

---

## Skill 4: CSS3 Puro

### Stack
- CSS3 puro (sin preprocesadores, sin frameworks)
- CSS Grid + Flexbox para layout
- CSS Custom Properties (variables) para el sistema de diseño
- Media queries para responsividad básica

### Estructura de archivos
```
insurance-crm-frontend/src/css/
└── styles.css   # Único archivo CSS
```

### Sistema de diseño

```css
/* ──────────────────────────────────────────────
   Variables del sistema de diseño
   ────────────────────────────────────────────── */
:root {
    /* Colores del semáforo */
    --color-critico: #dc2626;
    --color-alerta:  #f59e0b;
    --color-ok:      #16a34a;
    --color-perdido: #1f2937;

    /* Colores neutros */
    --color-bg:         #f8fafc;
    --color-surface:    #ffffff;
    --color-texto:      #1e293b;
    --color-texto-sec:  #64748b;
    --color-borde:      #e2e8f0;

    /* Tipografía */
    --font-family:    system-ui, -apple-system, 'Segoe UI', sans-serif;
    --font-size-base: 16px;
    --font-size-sm:   0.875rem;
    --font-size-lg:   1.125rem;

    /* Espaciado */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    /* Bordes y sombras */
    --border-radius: 8px;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}
```

### Patrones de layout

- **Cabecera**: Flexbox (logo a izquierda, resumen a derecha)
- **Listado de pólizas**: CSS Grid (cada prioridad es un grupo)
- **Tarjeta de póliza**: Flexbox column (icono, info, acciones)
- **Responsividad**: `@media (max-width: 768px)` → layout de una columna

### Reglas de accesibilidad visual

| Elemento | Regla |
|----------|-------|
| **Prioridad** | NUNCA solo color. Siempre color + icono SVG + etiqueta texto |
| **Contraste** | Ratio mínimo 4.5:1 para texto normal (WCAG AA) |
| **Hover** | Todos los botones con `:hover` y `:focus-visible` |
| **Focus** | `outline: 2px solid var(--color-ok)` |
| **Tamaño de botones** | Mínimo 44x44px (touch target WCAG) |

### Anti-patterns
- ❌ NO usar `!important` (salvo excepciones justificadas)
- ❌ NO usar colores sin variable CSS
- ❌ NO usar `px` para tipografía (usar `rem`)
- ❌ NO usar floats para layout (usar Grid o Flexbox)
- ❌ NO repetir valores mágicos (usar variables CSS)

---

## Skill 5: SQLite

### Stack
- sqlite3 (librería estándar de Python)
- Sin ORM, sin migraciones automáticas

### Patrón de conexión

```python
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'insurance_crm.db')

def get_connection() -> sqlite3.Connection:
    """Retorna una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Permite acceso por nombre de columna
    conn.execute("PRAGMA journal_mode=WAL;")   # Mejor concurrencia
    conn.execute("PRAGMA foreign_keys=ON;")    # Integridad referencial
    return conn
```

### Inicialización de esquema

```python
def init_db():
    """Crea las tablas si no existen. Se ejecuta al arrancar la app."""
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                advisor_id TEXT NOT NULL DEFAULT 'maria',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS policies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                policy_number TEXT NOT NULL,
                insurance_company TEXT NOT NULL,
                policy_type TEXT NOT NULL DEFAULT 'auto',
                expiration_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'vigente',
                last_contact_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );

            CREATE INDEX IF NOT EXISTS idx_policies_status
                ON policies(status);
            CREATE INDEX IF NOT EXISTS idx_policies_expiration
                ON policies(expiration_date);
            CREATE INDEX IF NOT EXISTS idx_policies_advisor
                ON policies(client_id);
        """)
```

### Prácticas SQLite

| Regla | Descripción |
|-------|-------------|
| **WAL mode** | `PRAGMA journal_mode=WAL` — mejora concurrencia lectura/escritura |
| **Foreign keys** | `PRAGMA foreign_keys=ON` — obligatorio en cada conexión |
| **Row factory** | `sqlite3.Row` — acceso por nombre de columna (legibilidad) |
| **Parameterized queries** | Siempre usar `?` placeholders. NUNCA f-strings o format. |
| **Transacciones** | `with conn:` para commit/rollback automático |
| **Fechas** | Almacenar como TEXT en formato ISO `YYYY-MM-DD` |
| **Índices** | Crear índices para columnas usadas en WHERE y ORDER BY |
| **Closed connections** | Siempre cerrar conexión (context manager o try/finally) |

### Anti-patterns
- ❌ NO usar f-strings para construir queries SQL (SQL injection)
- ❌ NO abrir conexiones sin cerrarlas
- ❌ NO crear índices en todas las columnas (solo en las que se filtran)
- ❌ NO usar `SELECT *` en producción (especificar columnas)

---

## Skill 6: Estructura de entrega (Agentemotor)

### Formato de empaquetado
```
manrique_yadin/                                    # ← apellido_nombre
├── spec.md                                        # Este documento
├── README.md                                      # Cómo correr + decisiones
├── code_review.md                                 # Review del snippet Flask
├── agents.md                                      # ← ESTE ARCHIVO
├── ai_history/                                    # Historial de conversación
│   ├── 01_planeacion.md
│   └── 02_implementacion.md
├── insurance-crm-backend/                         # Backend
│   ├── src/                                       # Código fuente
│   │   ├── __init__.py
│   │   ├── app.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── db.py
│   │   └── seed.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   └── test_policies.py
│   └── requirements.txt
└── insurance-crm-frontend/                        # Frontend
    ├── src/
    │   ├── index.html
    │   ├── css/
    │   │   └── styles.css
    │   ├── js/
    │   │   └── app.js
    │   └── assets/
    │       └── icons/
    └── tests/
```

### Reglas de entrega
- README.md debe tener max 3 comandos para ejecutar
- Sin Docker, sin servicios cloud, sin credenciales externas
- Base de datos se crea sola al arrancar
- Seed data precargada

---

## Skill 7: Comentarios en código (estilo colombiano)

### Reglas de estilo

| Regla | Ejemplo |
|-------|---------|
| **Explicar el POR QUÉ, no el qué** | ✅ `# Se resta el año porque la BD guarda YYYY-MM-DD como string` |
| **Tono conversacional** | ✅ `# Acá filtramos las pólizas que ya se pasaron de la ventana de 30 días` |
| **Marcar secciones** | `# ─── Sección: Cálculo de prioridad ───` |
| **Todo los archivos principales** | ✅ Toda función pública tiene docstring en español |
| **Fechas en comentarios** | ✅ `# Actualizado: Mayo 2026 — Se agregó filtro por tipo de póliza` |
| **No comentar lo obvio** | ❌ `# Suma 1 al contador` → `total += 1` (se explica solo) |

---

## Resolución de skill registry

Cuando este `agents.md` esté presente en el proyecto, el agente IA debe:

1. Cargar este archivo al inicio de cada sesión de trabajo
2. Aplicar TODAS las skills relevantes según el contexto del archivo
3. Respetar las convenciones de código, la arquitectura y las reglas de entrega
4. NO desviarse del stack definido (Flask + Vanilla JS + SQLite + CSS3 puro)

---

> **Versión:** 1.0
> **Proyecto:** Insurance Contractor CRM — Prueba técnica Agentemotor
> **Autor:** Yadin Paulo Manrique Márquez
