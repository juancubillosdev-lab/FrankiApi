# Franki AI — Gestión de Tareas

API REST desarrollada en **Node.js** con persistencia en archivo JSON, que permite crear, consultar, editar y eliminar tareas con validaciones estrictas.

---

## Tabla de contenidos

1. [Tecnologías](#tecnologías)
2. [Requisitos previos](#requisitos-previos)
3. [Instalación y ejecución local](#instalación-y-ejecución-local)
4. [Variables de entorno](#variables-de-entorno)
5. [Endpoints disponibles](#endpoints-disponibles)
6. [Historias de usuario](#historias-de-usuario)
7. [Estrategia de ramas](#estrategia-de-ramas)
8. [CI/CD con GitHub Actions](#cicd-con-github-actions)

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Validación | Joi |
| Logging | Pino + pino-http |
| Seguridad | Helmet, CORS, express-rate-limit |
| Testing | Jest + Supertest |
| Linting | ESLint (flat config) + Prettier |
| Base de datos | `database.json` (archivo local) |

---

## Requisitos previos

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`

Verificar versiones instaladas:

```bash
node --version
npm --version
```

---

## Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/juancubillosdev-lab/FrankiApi.git
cd FrankiApi
```

### 2. Instalar dependencias del backend

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

El archivo `.env.example` ya trae valores por defecto listos para desarrollo local. No es obligatorio modificarlos.

### 4. Iniciar el servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`.

| Endpoint base | URL |
|---------------|-----|
| Health check | `http://localhost:3000/health` |
| API de tareas | `http://localhost:3000/api/v1/tasks` |

### 5. Ejecutar los tests

```bash
# Solo tests
npm test

# Tests con reporte de cobertura
npm run test:coverage
```

Cobertura actual: **99 % statements · 97 % branches · 59 tests.**

### 6. Iniciar el frontend

```bash
cd ../FrankiFronted
npm install
npm run dev
```

> El frontend estará disponible en `http://localhost:5173` y se comunica con el backend en el puerto 3000.

---

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `LOG_LEVEL` | `info` | Nivel de logging (silent/debug/info/warn/error) |
| `DB_PATH` | `./database.json` | Ruta al archivo de persistencia |
| `CORS_ORIGIN` | `*` | Origen(es) permitidos por CORS |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de tiempo para el rate limit (ms) |
| `RATE_LIMIT_MAX` | `100` | Máximo de requests por ventana |

---

## Endpoints disponibles

### `GET /health`
Verifica que el servidor esté activo.

```json
{ "status": "ok", "uptime": 12.3, "timestamp": "2026-03-18T00:00:00.000Z" }
```

### `GET /api/v1/tasks`
Retorna todas las tareas con paginación.

| Query param | Tipo | Por defecto | Descripción |
|-------------|------|-------------|-------------|
| `page` | number | 1 | Página actual |
| `limit` | number | 20 | Tareas por página (máx. 100) |

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Diseñar base de datos",
      "description": "Crear el esquema ERD",
      "status": "pending",
      "createdAt": "2026-03-18T00:00:00.000Z",
      "updatedAt": "2026-03-18T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
}
```

### `POST /api/v1/tasks`
Crea una nueva tarea.

```json
// Body
{ "title": "Mi tarea", "description": "Descripción opcional", "status": "pending" }

// Respuesta 201
{ "data": { "id": "uuid", "title": "Mi tarea", "status": "pending", ... } }
```

### `PUT /api/v1/tasks/:id`
Actualiza título, descripción y/o estado de una tarea existente.

```json
// Body (al menos un campo — status: "pending" | "progress" | "completed")
{ "title": "Nuevo título", "status": "progress" }

// Respuesta 200
{ "data": { "id": "uuid", "title": "Nuevo título", "status": "progress", ... } }
```

### `DELETE /api/v1/tasks/:id`
Elimina una tarea. Retorna `204 No Content`.

### Errores comunes

| Código | Descripción |
|--------|-------------|
| `400` | Validación fallida — el body incluye `details[]` con los mensajes |
| `404` | Tarea no encontrada |
| `413` | Body supera el límite de 10 kb |
| `429` | Demasiadas requests — rate limit alcanzado |
| `500` | Error interno del servidor |

---

## Historias de usuario

---

### HU-01 · Ver lista de tareas

> **Como** usuario,
> **quiero** ver todas mis tareas al cargar la página,
> **para** tener una visión general de mis pendientes.

#### Criterios de aceptación

- [ ] Al abrir la aplicación se realiza una petición automática y se muestran todas las tareas existentes.
- [ ] Cada tarea muestra su **título** y su **descripción** (si existe).
- [ ] Si no existen tareas, se muestra el mensaje *"No tienes tareas aún. ¡Crea la primera!"*.
- [ ] Si la carga falla, se muestra un mensaje de error visible al usuario.

---

### HU-02 · Crear tarea

> **Como** usuario,
> **quiero** crear una nueva tarea con un título y una descripción opcional,
> **para** registrar mis pendientes de forma rápida.

#### Criterios de aceptación

- [ ] El formulario tiene un campo **Título** (obligatorio) y un campo **Descripción** (opcional).
- [ ] El título debe tener entre **1 y 100 caracteres**; de lo contrario se muestra un error inline.
- [ ] La descripción, si se completa, debe tener entre **1 y 200 caracteres**.
- [ ] No es posible enviar el formulario con el título vacío o que exceda los límites.
- [ ] Al crear la tarea exitosamente, aparece inmediatamente en la lista sin recargar la página.
- [ ] El formulario se limpia tras una creación exitosa.

---

### HU-03 · Editar tarea

> **Como** usuario,
> **quiero** editar el título y la descripción de una tarea existente,
> **para** mantener la información actualizada.

#### Criterios de aceptación

- [ ] Cada tarea tiene un botón **Editar** visible.
- [ ] Al hacer clic en Editar, se muestra un formulario con los datos actuales de la tarea.
- [ ] Se aplican las mismas reglas de validación que en la creación (título 1–100, descripción 1–200).
- [ ] Al guardar, la tarea se actualiza en la lista de forma inmediata.
- [ ] Existe un botón **Cancelar** que descarta los cambios y restaura la vista original.
- [ ] No es posible dejar el título vacío al guardar.

---

### HU-04 · Eliminar tarea con confirmación

> **Como** usuario,
> **quiero** que al eliminar una tarea se me pida confirmación,
> **para** evitar borrados accidentales.

#### Criterios de aceptación

- [ ] Cada tarea tiene un botón **Eliminar** visible.
- [ ] Al hacer clic en Eliminar, aparece un **modal de confirmación** con el mensaje *"¿Estás seguro de que deseas eliminar esta tarea?"* y los botones **Cancelar** y **Confirmar**.
- [ ] Al hacer clic en **Cancelar**, el modal se cierra y la tarea permanece en la lista.
- [ ] Al hacer clic en **Confirmar**, la tarea se elimina de forma permanente y desaparece de la lista.
- [ ] Mientras se procesa la eliminación, los botones del modal quedan deshabilitados para evitar doble envío.

---

## Estrategia de ramas

El proyecto sigue una versión simplificada de **GitFlow** adaptada a equipos pequeños, con tres ramas permanentes:

```
main ◄──── tester ◄──── develop ◄──── feature/*
                                  └──── hotfix/*
```

### Ramas permanentes

| Rama | Propósito |
|------|-----------|
| `main` | Código estable listo para producción. Solo recibe merges desde `tester` aprobados. |
| `tester` | Rama de QA. Aquí se valida cada entregable antes de subir a `main`. Nunca se desarrolla directamente en ella. |
| `develop` | Rama de integración continua. Todas las features se integran aquí primero. |

### Ramas temporales

| Prefijo | Ejemplo | Sale de | Merge hacia |
|---------|---------|---------|-------------|
| `feature/` | `feature/backend-api` | `develop` | `develop` |
| `feature/` | `feature/frontend-react` | `develop` | `develop` |
| `hotfix/` | `hotfix/fix-delete-404` | `main` | `main` + `develop` |

### Flujo de trabajo

```
1. Crear rama feature desde develop
   git checkout develop && git checkout -b feature/nombre-feature

2. Desarrollar y commitear
   git commit -m "feat: descripción del cambio"

3. Merge a develop (Pull Request)
   → Revisión de código antes de aprobar

4. Cuando develop está estable, merge a tester
   → Ejecución de tests y validación funcional

5. Si pasa QA, merge de tester a main
   → Versión lista para entregar / desplegar
```

### Convención de commits

Se utiliza **Conventional Commits**:

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de error |
| `test:` | Añadir o modificar tests |
| `docs:` | Cambios en documentación |
| `refactor:` | Refactorización sin cambio funcional |
| `chore:` | Tareas de mantenimiento (deps, config) |

---

---

## CI/CD con GitHub Actions

> **Opcional** — la estructura de ramas está diseñada para conectarse directamente con un pipeline de integración y despliegue continuo.

### Flujo general

```
feature/*  →  develop  →  tester  →  main
                ↓            ↓          ↓
            Lint +        Tests      Deploy a
            Tests          E2E      Producción
```

### Pipeline por rama

| Rama | Qué ejecuta automáticamente |
|------|-----------------------------|
| `develop` | Lint (`eslint`) + Tests con cobertura mínima del 90 % |
| `tester` | Lint + Tests + Tests E2E (Playwright / Cypress) + reporte de cobertura |
| `main` | Todo lo anterior + build de producción + deploy automático al servidor |

Un Pull Request solo puede mergearse si **todos los checks pasan**. Esto garantiza que ningún código roto llega a producción.

### Archivos de workflow

#### `.github/workflows/ci.yml` — Lint y tests (develop / tester)

```yaml
name: CI

on:
  push:
    branches: [develop, tester]
  pull_request:
    branches: [develop, tester]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Instalar dependencias
        run: npm ci

      - name: Ejecutar lint
        run: npm run lint

      - name: Ejecutar tests con cobertura
        run: npm run test:coverage

      - name: Publicar reporte de cobertura
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

#### `.github/workflows/deploy.yml` — Deploy automático (main)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage

  deploy:
    needs: lint-and-test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Instalar dependencias de producción
        run: npm ci --omit=dev

      - name: Deploy al servidor
        # Ejemplo con SSH — adaptar según proveedor (Railway, Render, EC2, etc.)
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /app/franki-ai
            git pull origin main
            npm ci --omit=dev
            pm2 restart franki-ai
```

### Secrets requeridos en GitHub

Para que el deploy funcione, configurar en **Settings → Secrets and variables → Actions**:

| Secret | Descripción |
|--------|-------------|
| `SERVER_HOST` | IP o dominio del servidor de producción |
| `SERVER_USER` | Usuario SSH del servidor |
| `SERVER_SSH_KEY` | Clave privada SSH para autenticación |

### Resultado visual en cada Pull Request

```
✅ CI / lint-and-test (develop)    — pasó en 45s
✅ CI / lint-and-test (tester)     — pasó en 52s
✅ Deploy / lint-and-test (main)   — pasó en 48s
✅ Deploy / deploy (main)          — desplegado en 1m 20s
```

---

*Desarrollado por **Juan Cubillos** para el reto técnico de **Franki AI**.*
