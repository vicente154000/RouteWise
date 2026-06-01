"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Venue, Coordinate } from "@/lib/venue";
import {
  VENUE_CATEGORY_COLORS,
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
} from "@/lib/venue";
import { reverseGeocode } from "@/lib/geocoding";
import { Loader2 } from "lucide-react";

const STYLE_URLS = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

interface MapViewProps {
  stops: Venue[];
  optimizedRoute: Venue[];
  routeGeometry: Coordinate[];
  onAddStop: (stop: Venue) => void;
}

interface PopupInfo {
  lng: number;
  lat: number;
  venue: Venue;
  index: number;
}

export default function MapView({
  stops,
  optimizedRoute,
  routeGeometry,
  onAddStop,
}: MapViewProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isReversing, setIsReversing] = useState(false);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [viewport, setViewport] = useState({
    longitude: -3.7038,
    latitude: 40.4168,
    zoom: 5,
  });

  const routeToShow = optimizedRoute.length > 0 ? optimizedRoute : stops;
  const mapStyle = mounted 
  ? (theme === "dark" ? STYLE_URLS.dark : STYLE_URLS.light) 
  : STYLE_URLS.light;

  const handleMapClick = async (e: any) => {
    const { lng, lat } = e.lngLat;
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
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border relative">
      <Map
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        mapStyle={mapStyle}
        maplibregl={require("maplibre-gl")}
        onClick={handleMapClick}
        attributionControl={true}
      >
        {/* Route line */}
        {routeGeometry.length > 0 && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {/* Route polyline would be rendered here via canvas/SVG overlay */}
          </svg>
        )}

        {/* Markers */}
        {routeToShow.map((venue, index) => (
          <Marker
            key={venue.id}
            longitude={venue.coordinates.lng}
            latitude={venue.coordinates.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo({
                lng: venue.coordinates.lng,
                lat: venue.coordinates.lat,
                venue,
                index,
              });
            }}
          >
            <div
              style={{
                background: VENUE_CATEGORY_COLORS[venue.category],
                color: "white",
                width: venue.isFeatured ? "32px" : "28px",
                height: venue.isFeatured ? "32px" : "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "bold",
                border: `${venue.isFeatured ? "3px" : "2px"} solid ${venue.isFeatured ? "#fbbf24" : "white"}`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
              title={venue.name}
            >
              {index + 1}
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
            offset={25}
          >
            <div style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: "13px",
              lineHeight: "1.4",
              maxWidth: "220px",
            }}>
              <p style={{ fontWeight: 600, margin: "0 0 2px 0", fontSize: "14px" }}>
                {popupInfo.venue.name}
              </p>
              <p style={{ color: "#6b7280", fontSize: "12px", margin: "0 0 4px 0" }}>
                {VENUE_CATEGORY_ICONS[popupInfo.venue.category]} {VENUE_CATEGORY_LABELS[popupInfo.venue.category]}
                {popupInfo.venue.isFeatured && (
                  <span style={{
                    display: "inline-block",
                    marginLeft: "4px",
                    background: "#fef3c7",
                    color: "#92400e",
                    fontSize: "11px",
                    padding: "0 5px",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}>
                    ⭐ Destacado
                  </span>
                )}
              </p>
              <p style={{ color: "#6b7280", fontSize: "11px", margin: "0 0 4px 0" }}>
                📍 {popupInfo.venue.address}
              </p>
              {popupInfo.venue.timeWindow?.estimatedArrival && (
                <p style={{ color: "#2563eb", fontWeight: 500, margin: 0, fontSize: "12px" }}>
                  🕐 Llegada: {popupInfo.venue.timeWindow.estimatedArrival}
                </p>
              )}
              {popupInfo.venue.timeWindow?.deadline && (
                <p style={{ color: "#dc2626", fontWeight: 500, margin: 0, fontSize: "12px" }}>
                  ⏰ Límite: {popupInfo.venue.timeWindow.deadline}
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>

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