"use client";

import { useEffect, useCallback } from "react";
import {
  X,
  MapPin,
  Star,
  Clock,
  Timer,
  Navigation,
  ExternalLink,
} from "lucide-react";
import type { Venue } from "@/core/domain/venue";
import {
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
  VENUE_CATEGORY_COLORS,
} from "@/core/domain/venue";
import { Button } from "@/components/ui/button";

interface VenueDetailModalProps {
  venue: Venue | null;
  index: number;
  total: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal that displays detailed information about a venue.
 * Shows name, address, category, featured status, coordinates,
 * time window info, and links to open in Google Maps / OpenStreetMap.
 * Closes on Escape key or clicking the backdrop.
 */
export default function VenueDetailModal({
  venue,
  index,
  total,
  isOpen,
  onClose,
}: VenueDetailModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !venue) return null;

  const categoryColor = VENUE_CATEGORY_COLORS[venue.category];
  const categoryIcon = VENUE_CATEGORY_ICONS[venue.category];
  const categoryLabel = VENUE_CATEGORY_LABELS[venue.category];
  const { lat, lng } = venue.coordinates;

  // Search by name + address so Google Maps can find the actual place,
  // with coordinates as fallback for precision
  const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(venue.name + ", " + venue.address)}/@${lat},${lng},17z`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${venue.name}`}
      >
        {/* Header with category color accent */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Close button */}
        <button
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors z-10"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="p-6 space-y-5">
          {/* Category badge + position */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {categoryIcon} {categoryLabel}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {index + 1} / {total}
            </span>
          </div>

          {/* Name + featured */}
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              {venue.name}
              {venue.isFeatured && (
                <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </h2>
          </div>

          {/* Details grid */}
          <div className="space-y-3">
            {/* Address */}
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Dirección
                </p>
                <p className="text-foreground">{venue.address}</p>
              </div>
            </div>

            {/* Coordinates */}
            <div className="flex items-start gap-3 text-sm">
              <Navigation className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Coordenadas
                </p>
                <p className="text-foreground font-mono text-xs">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Estimated arrival (optimized route) */}
            {venue.timeWindow?.estimatedArrival && (
              <div className="flex items-start gap-3 text-sm">
                <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Hora estimada de llegada
                  </p>
                  <p className="text-blue-600 font-mono font-medium">
                    {venue.timeWindow.estimatedArrival}
                  </p>
                </div>
              </div>
            )}

            {/* Deadline */}
            {venue.timeWindow?.deadline && (
              <div className="flex items-start gap-3 text-sm">
                <Timer className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Límite de tiempo
                  </p>
                  <p className="text-red-600 font-mono font-medium">
                    {venue.timeWindow.deadline}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() =>
                window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Google Maps
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={() =>
                window.open(osmUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              OpenStreetMap
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
