"use client";

import { useState , useEffect} from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Route,
  Copy,
  Check,
  Loader2,
  Navigation,
  Trash2,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";
import VenueList from "./VenueList";
import type { Venue, Coordinate } from "@/lib/venue";
import type { Suggestion } from "@/lib/geocoding";
import { optimizeRoute, totalDistance, computeArrivalTimes } from "@/lib/tsp";
import { getFullRoute } from "@/lib/routing";

interface SidebarProps {
  stops: Venue[];
  setStops: React.Dispatch<React.SetStateAction<Venue[]>>;
  optimizedRoute: Venue[];
  setOptimizedRoute: React.Dispatch<React.SetStateAction<Venue[]>>;
  setRouteGeometry: React.Dispatch<React.SetStateAction<Coordinate[]>>;
  isOptimized: boolean;
  setIsOptimized: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({
  stops,
  setStops,
  optimizedRoute,
  setOptimizedRoute,
  setRouteGeometry,
  isOptimized,
  setIsOptimized,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [roadDuration, setRoadDuration] = useState<number | null>(null);

 useEffect(() => {
    setMounted(true);
  }, []);
  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const newVenue: Venue = {
      id: crypto.randomUUID(),
      name: suggestion.displayName.split(",")[0].trim(),
      address: suggestion.displayName,
      coordinates: suggestion.coordinates,
      category: "restaurant",
      isFeatured: false,
    };

    setStops((prev) => [...prev, newVenue]);
    setAddress("");

    if (isOptimized) {
      setOptimizedRoute([]);
      setRouteGeometry([]);
      setIsOptimized(false);
      setRoadDistance(null);
      setRoadDuration(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && address.trim()) {
      setError("Selecciona una dirección de las sugerencias");
    }
  };

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (isOptimized) {
      setOptimizedRoute([]);
      setRouteGeometry([]);
      setIsOptimized(false);
      setRoadDistance(null);
      setRoadDuration(null);
    }
  };

  const handleUpdateDeadline = (id: string, deadline: string) => {
    setStops((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, timeWindow: { ...s.timeWindow, deadline: deadline || undefined } }
          : s
      )
    );
  };

  const handleOptimize = async () => {
    if (stops.length < 2) {
      setError("Añade al menos 2 paradas para optimizar la ruta.");
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const optimized = optimizeRoute(stops) as Venue[];
      const coords = optimized.map((s) => s.coordinates);
      const routeResult = await getFullRoute(coords);

      if (routeResult) {
        const routeWithTimes = computeArrivalTimes(
          optimized,
          routeResult.segments
        ) as Venue[];

        setOptimizedRoute(routeWithTimes);
        setRouteGeometry(routeResult.fullGeometry);
        setRoadDistance(routeResult.totalDistance);
        setRoadDuration(routeResult.totalDuration);
      } else {
        setOptimizedRoute(optimized);
        setRouteGeometry(coords);
        setRoadDistance(totalDistance(coords));
        setRoadDuration(null);
      }

      setIsOptimized(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al optimizar la ruta"
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearAll = () => {
    setStops([]);
    setOptimizedRoute([]);
    setRouteGeometry([]);
    setIsOptimized(false);
    setRoadDistance(null);
    setRoadDuration(null);
    setError(null);
  };

  const handleCopyRoute = async () => {
    const routeToCopy = isOptimized ? optimizedRoute : stops;
    const text = routeToCopy
      .map((s, i) => {
        const arrival = s.timeWindow?.estimatedArrival
          ? ` [${s.timeWindow.estimatedArrival}]`
          : "";
        const deadline = s.timeWindow?.deadline
          ? ` (límite: ${s.timeWindow.deadline})`
          : "";
        return `${i + 1}. ${s.name} - ${s.address}${arrival}${deadline}`;
      })
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">RouteWise</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="h-8 w-8"
          >
            {/* NUEVO: Comprobamos si está montado */}
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="h-4 w-4" /> // Placeholder vacío para evitar el error
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Itinerarios de ocio y gastronomía
        </p>
      </div>

      <Separator />

      {/* Add stop form with autocomplete */}
      <div className="p-4 space-y-2">
        <div className="flex gap-2">
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={handleSelectSuggestion}
            onKeyDown={handleKeyDown}
            placeholder="Dirección o lugar (ej: Avenida de Madrid, Madrid)"
          />
          <Button
            size="icon"
            disabled
            className="opacity-50"
            title="Selecciona una dirección de las sugerencias"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded">
            {error}
          </p>
        )}
      </div>

      {/* Venue list */}
      <div className="flex-1 px-4 pb-2 min-h-0 overflow-hidden">
        <VenueList
          venues={stops}
          optimizedRoute={optimizedRoute}
          onRemove={handleRemoveStop}
          onUpdateDeadline={handleUpdateDeadline}
          isOptimized={isOptimized}
        />
      </div>

      {/* Metrics */}
      {stops.length > 0 && (
        <div className="px-4 pb-2">
          <Card className="bg-muted/50">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {isOptimized ? "Distancia por carretera" : "Distancia total"}
                </span>
                <span className="text-sm font-bold text-foreground">
                  {isOptimized && roadDistance !== null
                    ? `${roadDistance.toFixed(1)} km`
                    : `${totalDistance(
                        stops.map((s) => s.coordinates)
                      ).toFixed(1)} km`}
                </span>
              </div>

              {isOptimized && roadDuration !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duración estimada
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatDuration(roadDuration)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Paradas</span>
                <span className="text-sm font-bold text-foreground">
                  {stops.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 pt-2 space-y-2">
        <Button
          className="w-full gap-2"
          onClick={handleOptimize}
          disabled={stops.length < 2 || isOptimizing}
        >
          {isOptimizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Route className="h-4 w-4" />
          )}
          {isOptimizing ? "Calculando ruta..." : "Optimizar ruta"}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCopyRoute}
            disabled={stops.length === 0}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copiado" : "Copiar ruta"}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClearAll}
            disabled={stops.length === 0}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}