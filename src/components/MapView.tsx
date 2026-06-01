"use client";

import { useEffect, useRef, useState } from "react";
import maplibre, { Map, Marker, Popup, LngLatBounds } from "maplibre-gl";
import { 
  VENUE_CATEGORY_ICONS, 
  VENUE_CATEGORY_COLORS, 
  VENUE_CATEGORY_LABELS,
  Venue, 
  Coordinate 
} from "@/core/domain/venue";
import { NominatimGeocodingAdapter } from "@/core/infrastructure/NominatimGeocodingAdapter";
import { Loader2 } from "lucide-react";

// Instanciamos el adaptador de infraestructura de forma local para el mapa
const geocodingAdapter = new NominatimGeocodingAdapter();

interface MapViewProps {
  stops: Venue[];
  optimizedRoute: Venue[];
  routeGeometry: Coordinate[];
  onAddStop: (stop: Venue) => void;
}

export default function MapView({
  stops,
  optimizedRoute,
  routeGeometry,
  onAddStop,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Inicializar el mapa interactivo una sola vez al montar el componente
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibre.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty", // Estilo libre y ultra-rápido de OpenFreeMap
      center: [-3.7038, 40.4168], // Ubicación por defecto: Puerta del Sol, Madrid
      zoom: 13,
      attributionControl: false,
    });

    map.current.addControl(new maplibre.NavigationControl(), "top-right");

    // Evento de clic en el mapa para añadir nuevos locales mediante geocodificación inversa
    map.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      
      setIsMapLoading(true);
      try {
        // Llamada limpia usando el nuevo adaptador estructural en lugar del archivo en /lib
        const address = await geocodingAdapter.reverseGeocode(lat, lng);
        
        const newVenue: Venue = {
          id: `click-${Date.now()}`,
          name: `Punto en el mapa`,
          address: address,
          coordinates: { lat, lng },
          category: "restaurant", // Categoría por defecto al clickear directamente
          isFeatured: false,
        };

        onAddStop(newVenue);
      } catch (err) {
        console.error("Error al añadir parada desde el mapa:", err);
      } finally {
        setIsMapLoading(false);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onAddStop]);

  // Actualizar marcadores y capas de ruta cuando cambien los datos
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    // 1. Limpiar marcadores antiguos del mapa
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Determinar qué lista de paradas pintar en el mapa (la optimizada o la lista base)
    const activeRoute = optimizedRoute.length > 0 ? optimizedRoute : stops;

    // 2. Dibujar nuevos marcadores estilizados por categoría
    activeRoute.forEach((venue, index) => {
      const el = document.createElement("div");
      el.className = "flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white cursor-pointer text-base font-bold transition-transform hover:scale-110";
      el.style.backgroundColor = VENUE_CATEGORY_COLORS[venue.category];
      el.innerText = VENUE_CATEGORY_ICONS[venue.category];

      // Popup informativo al hacer clic sobre un marcador
      const popup = new Popup({ offset: 25 }).setHTML(`
        <div style="font-family: sans-serif; padding: 2px;">
          <div style="font-weight: bold; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
            <span>${index + 1}. ${venue.name}</span>
            ${venue.isFeatured ? '<span style="background:#f59e0b; color:white; font-size:9px; padding:1px 4px; border-radius:3px;">⭐</span>' : ""}
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${venue.address}</div>
          <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: ${VENUE_CATEGORY_COLORS[venue.category]};">
            ${VENUE_CATEGORY_LABELS[venue.category]}
          </div>
        </div>
      `);

      const marker = new Marker({ element: el })
        .setLngLat([venue.coordinates.lng, venue.coordinates.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });

    // 3. Ajustar el encuadre (Bounding Box) del mapa automáticamente para contener todas las paradas
    if (activeRoute.length > 0) {
      const bounds = new LngLatBounds();
      activeRoute.forEach((v) => bounds.extend([v.coordinates.lng, v.coordinates.lat]));
      mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }

    // 4. Dibujar la línea de la trayectoria (Geometría de carreteras OSRM o línea recta)
    const updateRouteLayer = () => {
      if (!mapInstance.isStyleLoaded()) return;

      const sourceId = "route-source";
      const layerId = "route-layer";

      // Eliminar capa y fuente previas si existen
      if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
      if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);

      if (routeGeometry.length === 0) return;

      // Transformar coordenadas de la app {lat, lng} a formato geoJSON [lng, lat] de MapLibre
      const coordinatesGeoJson = routeGeometry.map((c) => [c.lng, c.lat]);

      mapInstance.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinatesGeoJson,
          },
        },
      });

      mapInstance.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3b82f6", // Línea azul de ruta
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
    };

    // Asegurar que el estilo esté completamente cargado antes de inyectar las líneas vectoriales
    if (mapInstance.isStyleLoaded()) {
      updateRouteLayer();
    } else {
      mapInstance.once("styledata", updateRouteLayer);
    }
  }, [stops, optimizedRoute, routeGeometry]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Spinner de carga flotante al realizar acciones pesadas de red */}
      {isMapLoading && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-background border border-border p-3 rounded-xl shadow-xl flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-medium">Buscando dirección...</span>
          </div>
        </div>
      )}
    </div>
  );
}