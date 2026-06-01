"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  Trash2,
  Clock,
  Timer,
  Star,
  MapPin,
} from "lucide-react";
import type { Venue } from "@/lib/venue";
import {
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
  VENUE_CATEGORY_COLORS,
} from "@/lib/venue";

interface VenueCardProps {
  venue: Venue;
  index: number;
  isStart: boolean;
  isEnd: boolean;
  isOptimized: boolean;
  onRemove: (id: string) => void;
  onUpdateDeadline: (id: string, deadline: string) => void;
}

/**
 * Individual venue card displayed in the venue list.
 * Shows category icon, featured badge, name, address, and time info.
 * The left border color indicates the venue category (green=restaurant, blue=bar, purple=nightclub).
 * Smooth animations on position changes via transition-all.
 */
export default function VenueCard({
  venue,
  index,
  isStart,
  isEnd,
  isOptimized,
  onRemove,
  onUpdateDeadline,
}: VenueCardProps) {
  const categoryColor = VENUE_CATEGORY_COLORS[venue.category];
  const categoryIcon = VENUE_CATEGORY_ICONS[venue.category];
  const categoryLabel = VENUE_CATEGORY_LABELS[venue.category];

  return (
    <div
      className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 hover:bg-accent/50 transition-all duration-300"
      style={{ borderLeftColor: categoryColor, borderLeftWidth: 3 }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />

        {/* Position number */}
        <span
          className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white transition-all duration-300 ${
            isStart
              ? "bg-emerald-500"
              : isEnd
              ? "bg-red-500"
              : "bg-blue-500"
          }`}
        >
          {index + 1}
        </span>

        {/* Venue info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm" title={categoryLabel}>
              {categoryIcon}
            </span>
            <p className="text-sm font-medium truncate text-foreground">
              {venue.name}
            </p>
            {venue.isFeatured && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 gap-0.5 shrink-0"
              >
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                Destacado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {venue.address}
          </p>
        </div>

        {/* Remove button (only when not optimized) */}
        {!isOptimized && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
            onClick={() => onRemove(venue.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        )}
      </div>

      {/* Time info row */}
      <div className="flex items-center gap-3 pl-8">
        {/* Estimated arrival */}
        {venue.timeWindow?.estimatedArrival && (
          <div className="flex items-center gap-1 text-xs text-blue-600 transition-all duration-300">
            <Clock className="h-3 w-3" />
            <span>Llegada: {venue.timeWindow.estimatedArrival}</span>
          </div>
        )}

        {/* Deadline input (only when not optimized) */}
        {!isOptimized && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            <span className="text-[10px]">Límite:</span>
            <Input
              type="time"
              className="h-5 w-20 text-[10px] px-1 py-0 border-border"
              value={venue.timeWindow?.deadline || ""}
              onChange={(e) => onUpdateDeadline(venue.id, e.target.value)}
              placeholder="--:--"
            />
          </div>
        )}

        {/* Show deadline on optimized route */}
        {isOptimized && venue.timeWindow?.deadline && (
          <div className="flex items-center gap-1 text-xs text-red-600 transition-all duration-300">
            <Timer className="h-3 w-3" />
            <span>Límite: {venue.timeWindow.deadline}</span>
          </div>
        )}
      </div>
    </div>
  );
}