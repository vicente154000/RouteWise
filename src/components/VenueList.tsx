"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import type { Venue } from "@/core/domain/venue";
import VenueCard from "./VenueCard";

interface VenueListProps {
  venues: Venue[];
  optimizedRoute: Venue[];
  onRemove: (id: string) => void;
  onUpdateDeadline: (id: string, deadline: string) => void;
  isOptimized: boolean;
  isOptimizing?: boolean;
  onShowDetail?: (venue: Venue) => void;
}

/**
 * List of venues with drag handles, position numbers, category icons,
 * featured badges, and time window controls.
 * Shows skeleton loaders during optimization.
 */
export default function VenueList({
  venues,
  optimizedRoute,
  onRemove,
  onUpdateDeadline,
  isOptimized,
  isOptimizing = false,
  onShowDetail,
}: VenueListProps) {
  const displayVenues = isOptimized ? optimizedRoute : venues;

  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <MapPin className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No hay venues añadidos</p>
        <p className="text-xs mt-1">
          Añade restaurantes, bares o discotecas desde el buscador
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {isOptimized ? "Itinerario optimizado" : "Mis venues"}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {displayVenues.length}
          </Badge>
        </div>
        {isOptimized && (
          <Badge variant="outline" className="text-xs text-emerald-600">
            ✓ Optimizado
          </Badge>
        )}
      </div>

      <Separator className="mb-2" />

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 pr-2">
          {isOptimizing ? (
            // Skeleton loaders during optimization
            <>
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </>
          ) : (
            // Actual venue cards
            displayVenues.map((venue, index) => {
              const isStart = index === 0;
              const isEnd = index === displayVenues.length - 1;

              return (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  index={index}
                  isStart={isStart}
                  isEnd={isEnd}
                  isOptimized={isOptimized}
                  onRemove={onRemove}
                  onUpdateDeadline={onUpdateDeadline}
                  onShowDetail={onShowDetail}
                />
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
