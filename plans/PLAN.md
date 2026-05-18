# PLAN MAESTRO: RouteWise → App de Ocio y Gastronomía (B2B2C)

> **Versión:** 1.0  
> **Fecha:** 2026-05-18  
> **Modo:** Arquitecto  
> **Siguiente paso:** Implementación en modo Code

---

## Índice

1. [Definición de Producto (40%)](#1-definición-de-producto-40)
2. [Arquitectura Técnica (40%)](#2-arquitectura-técnica-40)
3. [Integración de IA (20%)](#3-integración-de-ia-20)
4. [Criterios de Evaluación del Profesor](#4-criterios-de-evaluación-del-profesor-adaptados)
5. [Organización GitHub](#5-organización-github-actualizada)
6. [Plan de Implementación](#6-plan-de-implementación)

---

## 1. DEFINICIÓN DE PRODUCTO (40%)

### 1.1 Visión

**RouteWise** es una plataforma web interactiva que elimina la *fatiga de decisión* del turista. En lugar de saltar entre Google Maps, TripAdvisor y Google para planificar una salida nocturna, el turista selecciona sus preferencias y la app genera un **itinerario inteligente y optimizado** en un mapa, combinando restaurantes, bares y discotecas en la ruta más eficiente mediante algoritmos TSP.

### 1.2 Modelo de Negocio (B2B2C)

- **B2C (Turista):** App gratuita. Genera rutas de ocio personalizadas.
- **B2B (Hostelero):** Suscripción "Destacado" para aparecer con prioridad en las rutas. El algoritmo TSP aplica un peso reducido a los locales destacados, haciendo que sean seleccionados antes en la ruta óptima.

### 1.3 User Personas

| Persona | Problema | Solución RouteWise |
|---|---|---|
| **Turista** (18-40 años) | "No sé por dónde empezar. ¿Dónde cenar, luego copas, luego discoteca? Tengo que mirar 3 apps distintas." | Un solo clic → ruta completa optimizada con hora estimada de llegada a cada local. |
| **Hostelero** (dueño de restaurante/bar/discoteca) | "Mi local está en una zona turística pero no destaco frente a la competencia." | Suscripción mensual para aparecer como "Destacado" con prioridad en las rutas generadas cerca de su local. |

### 1.4 User Flow (Turista)

```mermaid
flowchart TD
    A["🏠 Landing Page"] --> B["Selecciona preferencias:<br/>🍽️ Restaurante<br/>🍺 Bar<br/>🪩 Discoteca"]
    B --> C["Elige hora de inicio<br/>(ej: 20:00)"]
    C --> D["Busca locales por nombre<br/>o haz clic en el mapa"]
    D --> E["Cada local muestra:<br/>Nombre, Categoría, ⭐ Destacado"]
    E --> F["🚀 Optimizar Ruta Gastronómica"]
    F --> G["Itinerario generado:<br/>1. 🍽️ La Tasquita 20:00-21:30<br/>2. 🍺 El Tigre 21:45-23:00<br/>3. 🪩 Kapital 23:15-..."]
    G --> H["Compartir / Guardar<br/>itinerario en localStorage"]
    
    style F stroke:#22c55e,stroke-width:3px
```

### 1.5 User Flow (Hostelero — Futuro)

```mermaid
flowchart TD
    A["🔐 Login Google OAuth"] --> B["Panel de Gestión"]
    B --> C["Registrar / Editar mi local"]
    C --> D["Nombre, dirección,<br/>categoría, horario"]
    D --> E["💎 Activar 'Destacado'<br/>(suscripción)"]
    E --> F["✅ El local aparece con<br/>prioridad en rutas<br/>de la zona"]
    
    style E stroke:#f59e0b,stroke-width:3px
```

### 1.6 Modelo de Datos

#### Archivo: `src/lib/venue.ts`

```typescript
// === Tipos base (compartidos con tsp.ts) ===
export type Coordinate = { lat: number; lng: number };

export interface TimeWindow {
  estimatedArrival?: string;  // HH:MM - calculado tras optimizar
  deadline?: string;          // HH:MM - límite fijado por el usuario
}

// === Categorías de ocio ===
export type VenueCategory = "restaurant" | "bar" | "nightclub";

export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  restaurant: "Restaurante",
  bar: "Bar",
  nightclub: "Discoteca",
};

export const VENUE_CATEGORY_ICONS: Record<VenueCategory, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  nightclub: "🪩",
};

export const VENUE_CATEGORY_COLORS: Record<VenueCategory, string> = {
  restaurant: "#22c55e",  // verde
  bar: "#3b82f6",         // azul
  nightclub: "#a855f7",   // púrpura
};

// === Local comercial ===
export interface Venue {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinate;
  category: VenueCategory;
  isFeatured: boolean;       // Destacado (B2B)
  timeWindow?: TimeWindow;
}

// === Preferencias del turista ===
export interface UserPreferences {
  categories: VenueCategory[];  // Filtros activos
  startTime: string;            // "20:00"
}

// === Itinerario generado ===
export interface Itinerary {
  id: string;
  venues: Venue[];
  totalDistance: number;        // km
  totalDuration: number;        // segundos
  geometry: Coordinate[];
  createdAt: string;
}
```

---

## 2. ARQUITECTURA TÉCNICA (40%)

### 2.1 Stack Tecnológico

| Tecnología | Versión | Propósito | Justificación |
|---|---|---|---|
| **Next.js 14** (App Router) | 14.2.35 | Framework frontend | SSR/SSG, routing basado en archivos, ya configurado |
| **TypeScript** | 5.x | Lenguaje | Tipado estricto (`strict: true`), ya configurado |
| **Tailwind CSS** | 3.4 | Estilos | Utility-first, ya integrado con Shadcn |
| **Shadcn/ui** | latest | Componentes UI | Headless + estilizados (Card, Badge, Button, ScrollArea) |
| **MapLibre GL** | 5.24 | Mapas vectoriales | **Gratuito**, sin API key, vector tiles rápidos |
| **OSRM** | — | Routing por carretera | **Gratuito**, self-hostable, API REST simple |
| **Nominatim** | — | Geocoding | **Gratuito** (OpenStreetMap), 1 req/s |
| **Overpass API** | — | Búsqueda de locales | **Gratuito** (OSM), busca por nombre y categoría |
| **TSP Algorithm** | propio | Optimización de rutas | Nearest Neighbor + 2-opt, O(n²), sin dependencias |
| **Catálogo local** | JSON | Datos de ejemplo | 15 locales ficticios en Madrid para demo offline |

### 2.2 Arquitectura de Componentes

```mermaid
flowchart TD
    subgraph Pages["📄 Páginas (App Router)"]
        P1["page.tsx<br/>Home - Mapa + Sidebar"]
        P2["/dashboard/page.tsx<br/>Panel hostelero (futuro)"]
    end
    
    subgraph Components["🧩 Componentes"]
        C1["Sidebar.tsx<br/>Panel lateral"]
        C2["VenueList.tsx<br/>Lista de locales<br/>(refactor StopList)"]
        C3["MapView.tsx<br/>Mapa interactivo"]
        C4["VenueAutocomplete.tsx<br/>Buscador de locales<br/>(refactor AddressAutocomplete)"]
        C5["CategorySelector.tsx<br/>NUEVO: Filtro categorías"]
        C6["VenueCard.tsx<br/>NUEVO: Card de local"]
    end
    
    subgraph Lib["📚 Librerías"]
        L1["tsp.ts<br/>TSP + peso isFeatured"]
        L2["routing.ts<br/>OSRM routing"]
        L3["geocoding.ts<br/>Nominatim"]
        L4["venue.ts<br/>NUEVO: Tipos Venue"]
        L5["venues-data.ts<br/>NUEVO: Catálogo local"]
        L6["overpass.ts<br/>NUEVO: Overpass API"]
        L7["useLocalStorage.ts<br/>Persistencia"]
    end
    
    P1 --> C1 & C3
    C1 --> C2 & C4 & C5
    C2 --> C6
    C3 --> L2 & L3
    C1 --> L1
    L1 --> L4
    C4 --> L5 & L6
```

### 2.3 Decisiones Técnicas Justificadas

| Decisión | Alternativa descartada | Por qué esta opción |
|---|---|---|
| **TSP con Nearest Neighbor + 2-opt** | Google OR-Tools, algoritmo genético | Sin dependencias externas, O(n²) aceptable para <50 venues |
| **MapLibre GL** (vector tiles) | Google Maps API, Leaflet | **Gratuito 100%**, sin API key |
| **OSRM para routing** | Google Directions API | Gratuito, self-hostable |
| **Nominatim para geocoding** | Google Geocoding API | Gratuito |
| **Overpass para búsqueda de locales** | Google Places API | Gratuito, datos estructurados de OSM |
| **Catálogo local + Overpass** | Solo Overpass | Demo funciona offline, fallback si Overpass falla |
| **LocalStorage** | IndexedDB, Zustand | Simple, suficiente para MVP |
| **Shadcn/ui** | Material UI, Chakra UI | Bundle pequeño, Tailwind nativo |
| **Sin BD en MVP** | PostgreSQL, Supabase | 100% client-side hasta fase B2B |

### 2.4 Algoritmo TSP con Peso de Destacados

El corazón matemático se modifica para dar prioridad a locales con `isFeatured = true`:

```typescript
// src/lib/tsp.ts

export interface TSPConfig {
  featuredWeight: number;  // 0.7 = 30% descuento en distancia
}

const DEFAULT_CONFIG: TSPConfig = { featuredWeight: 0.7 };

function weightedDistance(from: Venue, to: Venue, config: TSPConfig): number {
  const baseDist = haversineDistance(from.coordinates, to.coordinates);
  if (to.isFeatured) {
    return baseDist * config.featuredWeight;
  }
  return baseDist;
}
```

**Efecto:** Un local destacado a 2.5 km se comporta como si estuviera a 1.75 km, haciendo que el TSP lo prefiera sobre uno no destacado a 2.0 km.

### 2.5 Búsqueda de Locales (Catálogo Local + Overpass)

Estrategia en 2 capas:

```mermaid
flowchart TD
    A["Usuario escribe 'La Tasquita'"] --> B["Buscar en<br/>catálogo local"]
    B --> C{"¿Encontrado?"}
    C -->|"Sí"| D["Mostrar resultado<br/>con categoría"]
    C -->|"No"| E["Consultar Overpass API<br/>(OSM)"]
    E --> F{"¿Resultados?"}
    F -->|"Sí"| G["Mostrar resultados<br/>con categoría inferida"]
    F -->|"No"| H["Fallback a Nominatim<br/>(dirección genérica)"]
    H --> I["Usuario asigna<br/>categoría manualmente"]
```

### 2.6 Migración de localStorage

El cambio de `Stop` → `Venue` es rompedor. Estrategia:

```typescript
// En page.tsx
const STORAGE_VERSION = 2;

function migrateStorage(): void {
  const version = localStorage.getItem("routewise-schema-version");
  if (version === null || Number(version) < STORAGE_VERSION) {
    // Limpiar datos del schema anterior (Stop)
    localStorage.removeItem("routewise-stops");
    localStorage.removeItem("routewise-optimized");
    localStorage.removeItem("routewise-geometry");
    localStorage.removeItem("routewise-isOptimized");
    localStorage.setItem("routewise-schema-version", String(STORAGE_VERSION));
  }
}
```

### 2.7 Estructura de Archivos Final

```
src/
├── app/
│   ├── layout.tsx                    # Metadata actualizada
│   ├── page.tsx                      # Home refactorizado (Venue)
│   ├── globals.css                   # Sin cambios
│   └── fonts/
├── components/
│   ├── Sidebar.tsx                   # Refactorizado: Stop → Venue
│   ├── VenueList.tsx                 # Renombrado desde StopList.tsx
│   ├── MapView.tsx                   # Actualizado: colores por categoría
│   ├── VenueAutocomplete.tsx         # Refactorizado desde AddressAutocomplete
│   ├── CategorySelector.tsx          # NUEVO
│   ├── VenueCard.tsx                 # NUEVO
│   └── ui/                           # Shadcn (sin cambios)
├── lib/
│   ├── tsp.ts                        # MODIFICADO: peso isFeatured
│   ├── routing.ts                    # SIN CAMBIOS
│   ├── geocoding.ts                  # SIN CAMBIOS
│   ├── venue.ts                      # NUEVO
│   ├── venues-data.ts                # NUEVO: catálogo local
│   ├── overpass.ts                   # NUEVO: Overpass API
│   ├── useLocalStorage.ts            # SIN CAMBIOS
│   └── utils.ts                      # SIN CAMBIOS
```

---

## 3. INTEGRACIÓN DE IA (20%)

### 3.1 Flujo Multi-Agente

Cada tarea de desarrollo sigue este proceso, documentado en el chat:

```mermaid
flowchart LR
    A["📋 Tarea"] --> B["🏗️ Arquitecto<br/>Diseña interfaces y UX"]
    B --> C["💻 Programador<br/>Genera código modular"]
    C --> D["🔍 Auditor Crítico<br/>Revisa bugs y tipado"]
    D --> E{"¿Todo OK?"}
    E -->|"Sí"| F["✅ Merge a develop"]
    E -->|"No"| B
```

### 3.2 Checklist de Validación del Auditor

| # | Check | Descripción |
|---|---|---|
| 1 | ✅ `'use client'` | Componentes interactivos tienen la directiva correcta |
| 2 | ✅ TypeScript strict | Sin `any`, sin `@ts-ignore`, tipos exportados |
| 3 | ✅ Shadcn imports | Importaciones desde `@/components/ui/` |
| 4 | ✅ Tailwind classes | Sin clases inline de estilo raw |
| 5 | ✅ TSP intacto | El algoritmo base no se rompe, solo se añade peso |
| 6 | ✅ localStorage migration | Datos antiguos no rompen la app |
| 7 | ✅ MapLibre compat | Coordenadas en formato `[lng, lat]` |
| 8 | ✅ Overpass rate limit | 1 req/s, con debounce |
| 9 | ✅ Responsive | Sidebar funciona en desktop y mobile |
| 10 | ✅ Sin API keys hardcodeadas | Claves en `.env.local` si se usan |

### 3.3 Template de Prompt para cada Tarea

```
## Tarea: [nombre]
## Rol: [Arquitecto | Programador | Auditor]

### Contexto
- Proyecto: RouteWise (App de Ocio/Gastronomía)
- Stack: Next.js 14, TypeScript, Tailwind, Shadcn, MapLibre
- Archivos relevantes: [lista]

### Requisitos
[lista de requisitos]

### Restricciones
- TypeScript strict mode
- No modificar routing.ts ni geocoding.ts
- Reutilizar componentes Shadcn existentes (Card, Badge, Button, ScrollArea)
- Coordenadas en formato [lng, lat] para MapLibre
- Overpass API con debounce de 300ms
```

---

## 4. CRITERIOS DE EVALUACIÓN DEL PROFESOR (ADAPTADOS)

> Los siguientes criterios fueron proporcionados para un proyecto Lumen/PHP anterior. Se han adaptado a Next.js 14 + TypeScript manteniendo el espíritu de cada requisito.

### 4.1 Arquitectura Hexagonal y Patrón Repositorio

**Objetivo:** Organizar el código en capas con responsabilidades bien definidas, usando interfaces e implementaciones separadas.

**Adaptación a Next.js:**

```mermaid
flowchart TD
    subgraph Domain["🏛️ Capa de Dominio domain/"]
        D1["venue.ts<br/>Interfaces: Venue, VenueCategory<br/>Value Objects: Coordinate, TimeWindow"]
        D2["tsp.ts<br/>Algoritmo TSP puro<br/>Sin dependencias externas"]
    end

    subgraph Application["⚙️ Capa de Aplicación lib/"]
        A1["repositories/<br/>IVenueRepository.ts<br/>(interfaz)"]
        A2["repositories/<br/>LocalVenueRepository.ts<br/>(implementación: catálogo local)"]
        A3["repositories/<br/>OverpassVenueRepository.ts<br/>(implementación: Overpass API)"]
        A4["services/<br/>VenueSearchService.ts<br/>(orquestador: local → Overpass → Nominatim)"]
        A5["services/<br/>RouteOptimizationService.ts<br/>(TSP + featured weight)"]
    end

    subgraph Infrastructure["🔧 Capa de Infraestructura"]
        I1["overpass.ts<br/>Cliente HTTP Overpass"]
        I2["geocoding.ts<br/>Cliente HTTP Nominatim"]
        I3["routing.ts<br/>Cliente HTTP OSRM"]
        I4["useLocalStorage.ts<br/>Persistencia localStorage"]
    end

    subgraph Presentation["🎨 Capa de Presentación components/"]
        P1["Sidebar.tsx, VenueList.tsx<br/>VenueCard.tsx, CategorySelector.tsx"]
        P2["VenueAutocomplete.tsx<br/>MapView.tsx"]
        P3["page.tsx, layout.tsx"]
    end

    D1 --> A1
    A1 --> A2 & A3
    A2 & A3 --> A4
    D1 & D2 --> A5
    A4 --> I1 & I2
    A5 --> I3
    A4 & A5 --> P1 & P2 & P3
```

**Estructura de repositorios:**

```typescript
// src/lib/repositories/IVenueRepository.ts
export interface IVenueRepository {
  searchByName(query: string, category?: VenueCategory): Promise<Venue[]>;
  getById(id: string): Promise<Venue | null>;
}

// src/lib/repositories/LocalVenueRepository.ts
export class LocalVenueRepository implements IVenueRepository {
  async searchByName(query: string, category?: VenueCategory): Promise<Venue[]> {
    return searchLocalVenues(query, category);
  }
  async getById(id: string): Promise<Venue | null> {
    return LOCAL_VENUES.find(v => v.id === id) ?? null;
  }
}

// src/lib/repositories/OverpassVenueRepository.ts
export class OverpassVenueRepository implements IVenueRepository {
  async searchByName(query: string, category?: VenueCategory): Promise<Venue[]> {
    return searchVenues(query, category);
  }
  async getById(id: string): Promise<Venue | null> {
    // Overpass no soporta búsqueda por ID de forma eficiente
    return null;
  }
}
```

### 4.2 Testing (Unitarios, Integración, E2E)

**Objetivo:** Tests a tres niveles siguiendo los estándares vistos en clase.

| Nivel | Framework | Qué testear | Ejemplos |
|---|---|---|---|
| **Unitarios** | Vitest | Lógica de negocio aislada | `tsp.ts`: nearestNeighbor, twoOpt, weightedDistance, haversineDistance |
| **Integración** | Vitest + MSW | Flujo completo contra APIs mock | `VenueSearchService`: local → Overpass → Nominatim |
| **E2E** | Playwright | Flujo completo del usuario en navegador | Buscar venue, añadirlo, optimizar ruta, ver mapa |

**Tests unitarios (TSP):**

```typescript
// src/lib/__tests__/tsp.test.ts
describe("weightedDistance", () => {
  it("aplica 0.7x a venues destacados", () => {
    const featured: Venue = { /* ... */ isFeatured: true };
    const normal: Venue = { /* ... */ isFeatured: false };
    const config: TSPConfig = { featuredWeight: 0.7 };
    
    const distFeatured = weightedDistance(origin, featured, config);
    const distNormal = weightedDistance(origin, normal, config);
    
    expect(distFeatured).toBeLessThan(distNormal);
    expect(distFeatured).toBeCloseTo(distNormal * 0.7);
  });
  
  it("no modifica distancia si isFeatured es false", () => {
    const venue: Venue = { /* ... */ isFeatured: false };
    const dist = weightedDistance(origin, venue, DEFAULT_CONFIG);
    expect(dist).toBe(haversineDistance(origin.coordinates, venue.coordinates));
  });
});
```

**Tests de integración (VenueSearchService):**

```typescript
// src/lib/__tests__/venue-search.integration.test.ts
describe("VenueSearchService", () => {
  it("busca primero en catálogo local, luego en Overpass", async () => {
    const service = new VenueSearchService();
    const results = await service.search("Botín");
    expect(results[0].name).toContain("Botín");
    expect(results[0].category).toBe("restaurant");
  });
});
```

**Colección Postman:**

Exportar colección `RouteWise.postman_collection.json` en la raíz del proyecto cubriendo:
- `GET /api/venues?q=Botín` — Búsqueda de venues
- `GET /api/venues?q=...&category=restaurant` — Búsqueda filtrada
- `POST /api/optimize` — Optimizar ruta con venues
- `GET /api/route?coords=...` — Obtener ruta OSRM

### 4.3 CI/CD con Husky + GitHub Actions

**Objetivo:** Pre-commit hooks y pipeline de CI que ejecuten lint, type-check y tests.

**Adaptación:** GrumPHP es de PHP. En Next.js usamos:

| Herramienta | Propósito | Equivalente a GrumPHP |
|---|---|---|
| **Husky** | Git hooks (pre-commit, pre-push) | ✅ Misma función |
| **lint-staged** | Ejecutar lint solo en archivos staged | ✅ Misma función |
| **GitHub Actions** | CI pipeline en cada push/PR | ✅ Misma función |

**Configuración de Husky (`.husky/pre-commit`):**

```bash
npx lint-staged
```

**Configuración de lint-staged (`package.json`):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

**Pipeline de CI (`.github/workflows/ci.yml`):**

```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint          # ESLint
      - run: npm run type-check    # tsc --noEmit
      - run: npm run test          # Vitest
      - run: npm run build         # next build
```

### 4.4 Dockerización

**Objetivo:** Containerizar la app con Docker + docker-compose para que cualquiera la levante con un solo comando.

**Estructura:**

```
RouteWise/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── nginx.conf              # Opcional: reverse proxy
```

**`Dockerfile`:**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

**`docker-compose.yml`:**

```yaml
version: "3.8"
services:
  routewise:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  osrm:
    image: ghcr.io/project-osrm/osrm-backend
    ports:
      - "5000:5000"
    volumes:
      - osrm-data:/data
    command: >
      sh -c "osrm-routed --algorithm mld /data/madrid.osrm"
    restart: unless-stopped

volumes:
  osrm-data:
```

### 4.5 Clean Code

**Objetivo:** Aplicar buenas prácticas: mismo idioma, nomenclatura consistente, sin código muerto, sin lógica duplicada, sin credenciales hardcodeadas, HTTP codes coherentes.

| Práctica | Cómo se aplica en RouteWise |
|---|---|
| **Mismo idioma** | Código en inglés (variables, funciones, tipos). UI/UX en español (labels, mensajes al usuario). |
| **Nomenclatura consistente** | `camelCase` para variables/funciones, `PascalCase` para interfaces/types/components, `UPPER_CASE` para constantes. |
| **Sin código muerto** | Eliminar `Stop`, `Suggestion` antiguos. No dejar props sin usar. |
| **Sin lógica duplicada** | Extraer `weightedDistance` en lugar de duplicar la lógica en nearestNeighbor y twoOpt. |
| **Sin credenciales hardcodeadas** | Usar `.env.local` para API keys si se añaden en futuro. Nunca en el código. |
| **HTTP codes coherentes** | Las APIs externas (OSRM, Nominatim, Overpass) se envuelven con manejo de errores consistente. |
| **Código como prosa** | Nombres descriptivos: `searchLocalVenues` en vez de `searchLoc`, `isFeatured` en vez de `feat`. |

### 4.6 Documentación y Repositorio

**Objetivo:** README claro, PDF de entrega, commits estandarizados, repo limpio.

| Elemento | Formato | Ubicación |
|---|---|---|
| **README** | Markdown con instrucciones de instalación, Docker, tests | `README.md` |
| **PDF entrega** | Decisiones técnicas, problemas encontrados, distribución del trabajo | `docs/entrega.pdf` |
| **Commits** | `[#issue] - Verbo [scope]: mensaje` | Git log |
| **Issues** | Issues de GitHub con descripción, AC, archivos afectados | GitHub Issues |
| **PRs** | Pull requests de feature/* → develop → main | GitHub PRs |
| **Colección Postman** | Exportada en el repo | `RouteWise.postman_collection.json` |

---

## 5. ORGANIZACIÓN GITHUB (ACTUALIZADA)

### 5.1 Estructura de Branches

```
main                        # Producción (protegida)
├── develop                 # Integración continua
│   ├── feature/domain-model          # venue.ts + tipos
│   ├── feature/venue-list            # VenueList + VenueCard
│   ├── feature/category-selector     # CategorySelector
│   ├── feature/venue-autocomplete    # VenueAutocomplete + Overpass
│   ├── feature/tsp-weighted          # Peso isFeatured en TSP
│   ├── feature/map-categories        # Colores por categoría en mapa
│   ├── feature/local-catalog         # Catálogo local de ejemplo
│   ├── feature/storage-migration     # Migración localStorage
│   └── feature/readme-update         # Documentación
├── release/v1.0.0
└── hotfix/*
```

### 5.2 Flujo de Trabajo

```mermaid
flowchart LR
    subgraph Develop["🌿 develop"]
        D1["feature/domain-model"] --> D2["feature/venue-list"]
        D2 --> D3["feature/category-selector"]
        D3 --> D4["feature/venue-autocomplete"]
        D4 --> D5["feature/tsp-weighted"]
        D5 --> D6["feature/map-categories"]
        D6 --> D7["feature/local-catalog"]
        D7 --> D8["feature/storage-migration"]
    end
    
    D8 --> RC["🔀 release/v1.0.0"]
    RC --> MAIN["✅ main (v1.0.0)"]
```

### 5.3 Convención de Commits

Formato: `[#issue] - Verbo [scope]: mensaje`

```
[#1] - Crear Venue type y VenueCategory enum
[#2] - Crear VenueList y VenueCard components
[#3] - Añadir CategorySelector con restaurant/bar/nightclub
[#4] - Implementar VenueAutocomplete con Overpass API
[#5] - Añadir weighted distance para featured venues en TSP
[#6] - Colorear marcadores del mapa por categoría de venue
[#7] - Añadir catálogo local de venues para demo
[#8] - Migrar localStorage de Stop a Venue schema
[#9] - Actualizar README con descripción de gastro/leisure app
```

---

## 6. PLAN DE IMPLEMENTACIÓN

### Fase 1: Modelo de Datos y Tipos

| # | Tarea | Archivos | Dependencias |
|---|---|---|---|
| 1.1 | Crear `venue.ts` con tipos del dominio | `src/lib/venue.ts` (nuevo) | — |
| 1.2 | Crear `venues-data.ts` con catálogo local | `src/lib/venues-data.ts` (nuevo) | 1.1 |
| 1.3 | Crear `overpass.ts` con cliente Overpass API | `src/lib/overpass.ts` (nuevo) | 1.1 |

### Fase 2: Refactor de Componentes

| # | Tarea | Archivos | Dependencias |
|---|---|---|---|
| 2.1 | Refactor `tsp.ts`: añadir `weightedDistance` y `TSPConfig` | `src/lib/tsp.ts` | 1.1 |
| 2.2 | Refactor `Sidebar.tsx`: `Stop` → `Venue` | `src/components/Sidebar.tsx` | 1.1, 2.1 |
| 2.3 | Renombrar `StopList.tsx` → `VenueList.tsx` con categorías | `src/components/VenueList.tsx` | 1.1 |
| 2.4 | Crear `VenueCard.tsx` con badge `isFeatured` | `src/components/VenueCard.tsx` | 1.1 |
| 2.5 | Crear `CategorySelector.tsx` | `src/components/CategorySelector.tsx` | 1.1 |
| 2.6 | Refactor `AddressAutocomplete` → `VenueAutocomplete` | `src/components/VenueAutocomplete.tsx` | 1.1, 1.2, 1.3 |
| 2.7 | Refactor `MapView.tsx`: colores por categoría | `src/components/MapView.tsx` | 1.1 |
| 2.8 | Refactor `page.tsx`: migración localStorage + tipos | `src/app/page.tsx` | 1.1, 2.2 |

### Fase 3: Pulido y Documentación

| # | Tarea | Archivos | Dependencias |
|---|---|---|---|
| 3.1 | Actualizar `layout.tsx` metadata | `src/app/layout.tsx` | — |
| 3.2 | Actualizar `README.md` | `README.md` | — |
| 3.3 | Verificar build y lint | — | Todas |

### Orden de Implementación Recomendado

```mermaid
flowchart LR
    F1["Fase 1<br/>Modelo de datos"] --> F2A["Fase 2A<br/>TSP + Sidebar"]
    F2A --> F2B["Fase 2B<br/>VenueList + VenueCard"]
    F2B --> F2C["Fase 2C<br/>CategorySelector + VenueAutocomplete"]
    F2C --> F2D["Fase 2D<br/>MapView + page.tsx"]
    F2D --> F3["Fase 3<br/>Documentación"]
```

---

## RESUMEN DE ARCHIVOS A MODIFICAR/CREAR

| Acción | Archivo | Descripción |
|---|---|---|
| **CREAR** | `src/lib/venue.ts` | Tipos del dominio (Venue, VenueCategory, etc.) |
| **CREAR** | `src/lib/venues-data.ts` | Catálogo local de 15 locales de ejemplo |
| **CREAR** | `src/lib/overpass.ts` | Cliente Overpass API para búsqueda de locales |
| **CREAR** | `src/components/CategorySelector.tsx` | Selector de categorías (Restaurante/Bar/Discoteca) |
| **CREAR** | `src/components/VenueCard.tsx` | Card individual de local con badge destacado |
| **MODIFICAR** | `src/lib/tsp.ts` | Añadir `weightedDistance` y `TSPConfig` |
| **RENOMBRAR** | `src/components/StopList.tsx` → `VenueList.tsx` | Refactor con categorías |
| **RENOMBRAR** | `src/components/AddressAutocomplete.tsx` → `VenueAutocomplete.tsx` | Búsqueda de locales |
| **MODIFICAR** | `src/components/Sidebar.tsx` | `Stop` → `Venue`, añadir CategorySelector |
| **MODIFICAR** | `src/components/MapView.tsx` | Colores por categoría, popups con iconos |
| **MODIFICAR** | `src/app/page.tsx` | Migración localStorage, tipos Venue |
| **MODIFICAR** | `src/app/layout.tsx` | Metadata actualizada |
| **MODIFICAR** | `README.md` | Documentación del proyecto |
