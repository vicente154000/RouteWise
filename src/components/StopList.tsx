"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  MapPin,
  GripVertical,
  Clock,
  Timer,
} from "lucide-react";
import type { Stop } from "@/lib/tsp";

interface StopListProps {
  stops: Stop[];
  optimizedRoute: Stop[];
  onRemove: (id: string) => void;
  onUpdateDeadline: (id: string, deadline: string) => void;
  isOptimized: boolean;
}

export default function StopList({
  stops,
  optimizedRoute,
  onRemove,
  onUpdateDeadline,
  isOptimized,
}: StopListProps) {
  const displayStops = isOptimized ? optimizedRoute : stops;

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <MapPin className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No hay paradas añadidas</p>
        <p className="text-xs mt-1">
          Añade direcciones en el formulario o haz clic en el mapa
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {isOptimized ? "Ruta optimizada" : "Paradas"}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {displayStops.length}
          </Badge>
        </div>
        {isOptimized && (
          <Badge variant="outline" className="text-xs text-emerald-600">
            ✓ Optimizada
          </Badge>
        )}
      </div>

      <Separator className="mb-2" />

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 pr-2">
          {displayStops.map((stop, index) => {
            const isStart = index === 0;
            const isEnd = index === displayStops.length - 1;

            return (
              <div
                key={stop.id}
                className="group flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                        isStart
                          ? "bg-emerald-500"
                          : isEnd
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">
                        {stop.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stop.coordinates.lat.toFixed(4)},{" "}
                        {stop.coordinates.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  {!isOptimized && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onRemove(stop.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                </div>

                {/* Time info row */}
                <div className="flex items-center gap-3 pl-8">
                  {/* Estimated arrival */}
                  {stop.timeWindow?.estimatedArrival && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Clock className="h-3 w-3" />
                      <span>Llegada: {stop.timeWindow.estimatedArrival}</span>
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
                        value={stop.timeWindow?.deadline || ""}
                        onChange={(e) =>
                          onUpdateDeadline(stop.id, e.target.value)
                        }
                        placeholder="--:--"
                      />
                    </div>
                  )}

                  {/* Show deadline on optimized route */}
                  {isOptimized && stop.timeWindow?.deadline && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <Timer className="h-3 w-3" />
                      <span>Límite: {stop.timeWindow.deadline}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
