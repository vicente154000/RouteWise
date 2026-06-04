"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Venue, VenueCategory } from "@/core/domain/venue";
import {
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
} from "@/core/domain/venue";

interface ItinerarySummaryProps {
  venues: Venue[];
  totalDistance: number | null;
  totalDuration: number | null;
}

const CATEGORY_DURATION_MINUTES: Record<VenueCategory, number> = {
  restaurant: 90,
  bar: 60,
  nightclub: 180,
};

const DEFAULT_CATEGORY_DURATION_MINUTES = 60;

const formatDistance = (distance: number | null) => {
  if (distance === null) {
    return "-";
  }

  return `${distance.toFixed(1)} km`;
};

const formatDuration = (seconds: number | null) => {
  if (seconds === null) {
    return "-";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

const getCategorySummary = (venues: Venue[]) => {
  const counts: Record<string, number> = {};
  const durations: Record<string, number> = {};

  venues.forEach((venue) => {
    const category = venue.category ?? "default";
    counts[category] = (counts[category] ?? 0) + 1;
    const categoryDuration =
      CATEGORY_DURATION_MINUTES[category as VenueCategory] ??
      DEFAULT_CATEGORY_DURATION_MINUTES;
    durations[category] = (durations[category] ?? 0) + categoryDuration;
  });

  return { counts, durations };
};

export default function ItinerarySummary({
  venues,
  totalDistance,
  totalDuration,
}: ItinerarySummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (venues.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Resumen del itinerario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Añade venues para ver el resumen
          </p>
        </CardContent>
      </Card>
    );
  }

  const { counts, durations } = getCategorySummary(venues);
  const categories = Object.keys(counts) as VenueCategory[];

  return (
    <Card className="w-full">
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={isOpen}
        >
          <CardTitle className="m-0">Resumen del itinerario</CardTitle>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Distancia total
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatDistance(totalDistance)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Duración estimada
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatDuration(totalDuration)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Venues por categoría
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <div
                    key={`count-${category}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>{VENUE_CATEGORY_ICONS[category] ?? "📍"}</span>
                      <span className="text-sm font-medium text-foreground">
                        {VENUE_CATEGORY_LABELS[category] ?? category}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {counts[category]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tiempo estimado por categoría
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <div
                    key={`duration-${category}`}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {VENUE_CATEGORY_LABELS[category] ?? category}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {durations[category]} min
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
