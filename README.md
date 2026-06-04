# RouteWise - Tu Ruta de Ocio y Gastronomía

RouteWise es una plataforma web inteligente diseñada para transformar la experiencia turística, optimizando las rutas de ocio y gastronomía de los usuarios mediante algoritmos avanzados de enrutamiento y geolocalización.

## Descripción

RouteWise es una plataforma con un enfoque **B2B2C** dirigida a turistas y ciudadanos que buscan explorar de una manera eficiente y personalizada. La aplicación actúa como un planificador inteligente que permite a los usuarios consolidar sus puntos de interés (restaurantes, monumentos, espectáculos) y generar un itinerario optimizado para maximizar su tiempo de ocio.

## Features (Características)

- **Búsqueda Avanzada de Venues:** Exploración y filtrado inteligente de locales gastronómicos, culturales y de ocio.
- **Resolución del TSP (Traveling Salesperson Problem):** Optimización matemática de la ruta elegida por el usuario para visitar todos los puntos seleccionados en el menor tiempo o distancia posible.
- **Featured Venues:** Descubrimiento de locales destacados y recomendaciones patrocinadas integradas de forma orgánica en el mapa.

## Stack Tecnológico

La arquitectura del proyecto está construida sobre tecnologías robustas y un enfoque de código abierto:

- **Frontend & Framework:** Next.js (App Router) con TypeScript.
- **Mapas y Renderizado:** MapLibre GL por su alto rendimiento y flexibilidad.
- **Motor de Enrutamiento:** OSRM (Open Source Routing Machine) para el cálculo de trayectos óptimos.
- **Extracción de Datos:** Overpass API (OpenStreetMap) para la consulta e integración de puntos de interés locales en tiempo real.

## Quick Start (Inicio Rápido)

Sigue estos pasos para levantar el entorno de desarrollo local:

1.  **Instalar las dependencias del proyecto:**
    npm install

2.  **Iniciar el servidor de desarrollo:**
    npm run dev

3.  **Correr los tests:**
    npm test o npm run test
4.  **Abrir la aplicación:**
    Navega a [http://localhost:3000](http://localhost:3000) con tu navegador para ver el resultado.

## 🗺️ API Keys

**Ninguna necesaria.** Todo el stack de mapas (MapLibre), enrutamiento (OSRM) y extracción de puntos de interés (Overpass API) está basado en tecnologías e infraestructura _open source_ y gratuitas, por lo que el proyecto no requiere de variables de entorno con claves de pago para su funcionamiento básico en desarrollo.

## 📁 Estructura del Proyecto (`src`)

El código fuente está organizado siguiendo principios de **Arquitectura Hexagonal** en la capa del core, y una estructura modular para la interfaz de usuario en Next.js:

```text
src/
├── app/                             # Rutas, páginas y layouts (Next.js App Router)
│   ├── fonts/                       # Fuentes locales del sistema (Geist)
│   ├── globals.css                  # Estilos globales de Tailwind CSS
│   ├── layout.tsx                   # Layout raíz de la aplicación
│   ├── page.tsx                     # Página principal (Dashboard interactivo)
│   └── providers.tsx                # Proveedores de contexto globales
├── components/                      # Componentes de la Interfaz de Usuario
│   ├── ui/                          # Componentes atómicos de diseño (Botones, Inputs, Cards...)
│   ├── AddressAutocomplete.tsx      # Autocompletado de direcciones geográficas
│   ├── CategorySelector.tsx         # Selector de categorías de ocio/gastronomía
│   ├── MapView.tsx                  # Vista interactiva del mapa con MapLibre
│   ├── Sidebar.tsx                  # Panel lateral de control
│   ├── StopList.tsx                 # Lista y orden de paradas de la ruta
│   ├── VenueAutocomplete.tsx        # Buscador predictivo de establecimientos
│   ├── VenueCard.tsx                # Tarjeta visual informativa de un local
│   └── VenueList.tsx                # Listado de venues disponibles
├── hooks/                           # Hooks personalizados de React
│   └── useLocalStorage.ts           # Persistencia local de rutas y favoritos
├── shared/                          # Utilidades y ayudantes compartidos
│   └── utils/                       # Funciones utilitarias generales
└── core/                            # Núcleo de la Aplicación (Arquitectura Hexagonal)
    ├── domain/                      # Modelos de dominio y reglas de negocio puras
    │   ├── tsp.ts                   # Algoritmo de resolución del TSP
    │   └── venue.ts                 # Definición de entidades de establecimientos
    ├── application/                 # Casos de uso y servicios de aplicación
    │   └── services/                # Orquestadores de búsqueda y optimización de rutas
    └── infrastructure/              # Adaptadores de tecnologías externas e infraestructura
        ├── repositories/            # Repositorios de datos (Locales y Overpass API)
        ├── overpass.ts              # Cliente de conexión con Overpass OpenStreetMap
        ├── geocoding.ts             # Adaptador de geolocalización
        └── routing.ts               # Adaptador de enrutamiento con OSRM
```
