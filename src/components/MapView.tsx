"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Stop, Coordinate } from "@/lib/tsp";
import { reverseGeocode } from "@/lib/geocoding";
import { Loader2 } from "lucide-react";

// Free tile source: OpenFreeMap - vector tiles, fast and free
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

interface MapViewProps {
  stops: Stop[];
  optimizedRoute: Stop[];
  routeGeometry: Coordinate[];
  onAddStop: (stop: Stop) => void;
}

export default function MapView({
  stops,
  optimizedRoute,
  routeGeometry,
  onAddStop,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isReversing, setIsReversing] = useState(false);
  const routeLineRef = useRef<maplibregl.GeoJSONSource | null>(null);

  const routeToShow = optimizedRoute.length > 0 ? optimizedRoute : stops;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: [-3.7038, 40.4168], // [lng, lat] - MapLibre uses [lng, lat]
      zoom: 5,
      attributionControl: {
        compact: true,
      },
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");

    m.on("load", () => {
      // Add route line source and layer
      m.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      m.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });

      routeLineRef.current = m.getSource("route-line") as maplibregl.GeoJSONSource;
    });

    // Click handler
    m.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      setIsReversing(true);

      try {
        const coords: Coordinate = { lat, lng };
        const address = await reverseGeocode(coords);
        const displayAddress =
          address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const newStop: Stop = {
          id: crypto.randomUUID(),
          address: displayAddress,
          coordinates: coords,
        };

        onAddStop(newStop);
      } catch {
        const newStop: Stop = {
          id: crypto.randomUUID(),
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: { lat, lng },
        };
        onAddStop(newStop);
      } finally {
        setIsReversing(false);
      }
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, [onAddStop]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    routeToShow.forEach((stop, index) => {
      const isStart = index === 0;
      const isEnd = index === routeToShow.length - 1;
      const color = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#3b82f6";

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.innerHTML = `<div style="
        background: ${color};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      ">${index + 1}</div>`;

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
          <p style="font-weight: 600; margin: 0 0 2px 0;">
            <span style="color: #6b7280;">Parada #${index + 1}</span>
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">
            ${stop.address}
          </p>
          ${
            stop.timeWindow?.estimatedArrival
              ? `<p style="color: #2563eb; font-weight: 500; margin: 0; font-size: 12px;">🕐 Llegada: ${stop.timeWindow.estimatedArrival}</p>`
              : ""
          }
          ${
            stop.timeWindow?.deadline
              ? `<p style="color: #dc2626; font-weight: 500; margin: 0; font-size: 12px;">⏰ Límite: ${stop.timeWindow.deadline}</p>`
              : ""
          }
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.coordinates.lng, stop.coordinates.lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (routeToShow.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      routeToShow.forEach((s) =>
        bounds.extend([s.coordinates.lng, s.coordinates.lat])
      );

      if (routeToShow.length === 1) {
        map.current.flyTo({
          center: [routeToShow[0].coordinates.lng, routeToShow[0].coordinates.lat],
          zoom: 13,
        });
      } else {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  }, [routeToShow]);

  // Update route polyline
  useEffect(() => {
    if (!routeLineRef.current) return;

    const coords =
      routeGeometry.length > 0
        ? routeGeometry.map((c) => [c.lng, c.lat])
        : routeToShow.map((s) => [s.coordinates.lng, s.coordinates.lat]);

    routeLineRef.current.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });
  }, [routeGeometry, routeToShow]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Loading overlay when clicking on map */}
      {isReversing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-foreground">
            Obteniendo dirección...
          </span>
        </div>
      )}

      {/* Hint for click-to-add */}
      {stops.length === 0 && !isReversing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg px-4 py-2">
          <p className="text-sm text-muted-foreground">
            👆 Haz clic en el mapa para añadir una parada
          </p>
        </div>
      )}
    </div>
  );
}
