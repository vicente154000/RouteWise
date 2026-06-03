"use client";

import { useState, useEffect, memo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Venue, Coordinate } from "@/core/domain/venue";
import {
  VENUE_CATEGORY_COLORS,
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
} from "@/core/domain/venue";
import { reverseGeocode } from "@/core/infrastructure/geocoding";
import { Loader2 } from "lucide-react";
import L from "leaflet";

interface MapViewProps {
  stops: Venue[];
  optimizedRoute: Venue[];
  routeGeometry: Coordinate[];
  onAddStop: (stop: Venue) => void;
}

// Fix Leaflet default icon issue (webpack)
function fixLeafletIcon() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Custom marker icon based on venue category
function createCategoryIcon(
  category: Venue["category"],
  isFeatured: boolean,
  index: number,
) {
  const color = VENUE_CATEGORY_COLORS[category];
  const size = isFeatured ? 36 : 30;

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      color: white;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: bold;
      border: ${isFeatured ? "3px" : "2px"} solid ${
        isFeatured ? "#fbbf24" : "white"
      };
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapView({
  stops,
  optimizedRoute,
  routeGeometry,
  onAddStop,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const iconFixedRef = useRef(false);

  // Mark as mounted on first render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize map once the container is in the DOM
  useEffect(() => {
    if (!mounted) return;
    if (!mapContainerRef.current || mapRef.current) return;

    if (!iconFixedRef.current) {
      fixLeafletIcon();
      iconFixedRef.current = true;
    }

    const container = mapContainerRef.current;

    const map = L.map(container, {
      center: [40.4168, -3.7038],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Force size recalculation after mount
    requestAnimationFrame(() => map.invalidateSize());

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setIsReversing(true);

      try {
        const coords: Coordinate = { lat, lng };
        const address = await reverseGeocode(coords);
        const displayAddress =
          address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        const newVenue: Venue = {
          id: crypto.randomUUID(),
          name: displayAddress.split(",")[0].trim(),
          address: displayAddress,
          coordinates: coords,
          category: "restaurant",
          isFeatured: false,
        };

        onAddStop(newVenue);
      } catch {
        const newVenue: Venue = {
          id: crypto.randomUUID(),
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: { lat, lng },
          category: "restaurant",
          isFeatured: false,
        };
        onAddStop(newVenue);
      } finally {
        setIsReversing(false);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mounted, onAddStop]);

  // Update markers and polyline when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const routeToShow = optimizedRoute.length > 0 ? optimizedRoute : stops;

    // Add polyline
    if (routeGeometry.length > 0) {
      const polyline = L.polyline(
        routeGeometry.map((c) => [c.lat, c.lng] as [number, number]),
        {
          color: "#3b82f6",
          weight: 4,
          opacity: 0.8,
        },
      ).addTo(map);
      polylineRef.current = polyline;
    }

    // Add markers
    const markers = routeToShow.map((venue, index) => {
      const marker = L.marker(
        [venue.coordinates.lat, venue.coordinates.lng],
        {
          icon: createCategoryIcon(venue.category, !!venue.isFeatured, index),
        },
      ).addTo(map);

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; max-width: 220px;">
          <p style="font-weight: 600; margin: 0 0 2px 0; font-size: 14px;">${venue.name}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">
            ${VENUE_CATEGORY_ICONS[venue.category]} ${VENUE_CATEGORY_LABELS[venue.category]}
            ${venue.isFeatured ? '<span style="display:inline-block;margin-left:4px;background:#fef3c7;color:#92400e;font-size:11px;padding:0 5px;border-radius:4px;font-weight:600;">⭐ Destacado</span>' : ""}
          </p>
          <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">📍 ${venue.address}</p>
          ${venue.timeWindow?.estimatedArrival ? `<p style="color: #2563eb; font-weight: 500; margin: 0; font-size: 12px;">🕐 Llegada: ${venue.timeWindow.estimatedArrival}</p>` : ""}
          ${venue.timeWindow?.deadline ? `<p style="color: #dc2626; font-weight: 500; margin: 0; font-size: 12px;">⏰ Límite: ${venue.timeWindow.deadline}</p>` : ""}
        </div>
      `;

      marker.bindPopup(popupContent);
      return marker;
    });

    markersRef.current = markers;
  }, [stops, optimizedRoute, routeGeometry]);

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapContainerRef} className="h-full w-full" />

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

export default memo(MapView, (prevProps, nextProps) => {
  if (prevProps.stops !== nextProps.stops) return false;
  if (prevProps.optimizedRoute !== nextProps.optimizedRoute) return false;
  if (prevProps.routeGeometry !== nextProps.routeGeometry) return false;
  if (prevProps.onAddStop !== nextProps.onAddStop) return false;
  return true;
});
