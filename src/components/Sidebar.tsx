"use client";
import { Input } from "./ui/input";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Route,
  Copy,
  Share2,
  Loader2,
  Navigation,
  Trash2,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import VenueAutocomplete from "./VenueAutocomplete";
import VenueList from "./VenueList";
import VenueDetailModal from "./VenueDetailModal";
import ItinerarySummary from "./ItinerarySummary";
import type { Venue, Coordinate, VenueCategory } from "@/core/domain/venue";
import type { Suggestion } from "@/core/infrastructure/geocoding";
import { routeOptimizationService } from "@/core/infrastructure/dependencies";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSavedItineraries } from "@/lib/useSavedItineraries";
import type { SavedItinerary } from "@/core/domain/venue";

interface SidebarProps {
  stops: Venue[];
  setStops: React.Dispatch<React.SetStateAction<Venue[]>>;
  optimizedRoute: Venue[];
  setOptimizedRoute: React.Dispatch<React.SetStateAction<Venue[]>>;
  setRouteGeometry: React.Dispatch<React.SetStateAction<Coordinate[]>>;
  isOptimized: boolean;
  setIsOptimized: React.Dispatch<React.SetStateAction<boolean>>;
  routeGeometry?: Coordinate[];
}

export default function Sidebar({
  stops,
  setStops,
  optimizedRoute,
  setOptimizedRoute,
  setRouteGeometry,
  isOptimized,
  setIsOptimized,
  routeGeometry,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [address, setAddress] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [roadDuration, setRoadDuration] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [itineraryName, setItineraryName] = useState("");
  const [startTime, setStartTime] = useLocalStorage<string>(
    "routewise-start-time",
    "08:00",
  );
  const { savedItineraries, saveItinerary, deleteItinerary } =
    useSavedItineraries();

  // <-- NUEVOS ESTADOS: Control de filtros en el estado del Sidebar (no localStorage)
  const [selectedCategories, setSelectedCategories] = useState<VenueCategory[]>(
    ["restaurant", "bar", "nightclub"],
  );
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);

  // Venue detail modal state
  const [detailVenue, setDetailVenue] = useState<Venue | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);

  const handleSaveCurrentItinerary = () => {
    if (stops.length === 0) {
      toast.error("Añade paradas antes de guardar un itinerario.");
      return;
    }
    // En lugar de usar prompt(), abrimos nuestra propia cajita de texto
    setIsSaving(true);
  };

  const confirmSaveItinerary = () => {
    if (!itineraryName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    const itinerary: SavedItinerary = {
      id: crypto.randomUUID(),
      name: itineraryName.trim(),
      venues: stops,
      optimizedRoute,
      geometry: routeGeometry,
      createdAt: new Date().toISOString(),
    };

    saveItinerary(itinerary);
    toast.success("Itinerario guardado");

    // Limpiamos y cerramos
    setItineraryName("");
    setIsSaving(false);
  };

  const handleLoadItinerary = (itinerary: SavedItinerary) => {
    const loadedGeometry = itinerary.geometry ?? [];

    setStops(itinerary.venues);
    setOptimizedRoute(itinerary.optimizedRoute);
    setRouteGeometry(loadedGeometry);
    setIsOptimized(itinerary.optimizedRoute.length > 0);
    setRoadDistance(
      itinerary.optimizedRoute.length > 0
        ? routeOptimizationService.computeTotalDistance(
            loadedGeometry.length > 0
              ? loadedGeometry
              : itinerary.optimizedRoute.map((venue) => venue.coordinates),
          )
        : null,
    );
    setRoadDuration(null);

    toast.success(`Itinerario cargado: ${itinerary.name}`);
  };

  const handleShowDetail = useCallback(
    (venue: Venue) => {
      const displayVenues = isOptimized ? optimizedRoute : stops;
      const idx = displayVenues.findIndex((v) => v.id === venue.id);
      setDetailVenue(venue);
      setDetailIndex(idx >= 0 ? idx : 0);
    },
    [isOptimized, optimizedRoute, stops],
  );

  const handleCloseDetail = useCallback(() => {
    setDetailVenue(null);
  }, []);

  const handleSelectSuggestion = (suggestion: Suggestion | Venue) => {
    if ((suggestion as Venue).id && (suggestion as Venue).name) {
      setStops((prev) => [...prev, suggestion as Venue]);
    } else {
      const s = suggestion as Suggestion;
      const newVenue: Venue = {
        id: crypto.randomUUID(),
        name: s.displayName.split(",")[0].trim(),
        address: s.displayName,
        coordinates: s.coordinates,
        category: selectedCategories[0] || "restaurant", // Usa una seleccionada por defecto si aplica
        isFeatured: false,
      };

      setStops((prev) => [...prev, newVenue]);
    }
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
          ? {
              ...s,
              timeWindow: { ...s.timeWindow, deadline: deadline || undefined },
            }
          : s,
      ),
    );
  };

  const handleOptimize = async () => {
    if (stops.length < 2) {
      toast.error("Añade al menos 2 paradas para optimizar la ruta.");
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const result = await routeOptimizationService.optimize(stops, startTime);

      if (result) {
        setOptimizedRoute(result.venues);
        setRouteGeometry(result.geometry);
        setRoadDistance(result.totalDistance ?? null);
        setRoadDuration(result.totalDuration ?? null);
      } else {
        const coords = stops.map((s) => s.coordinates);
        setOptimizedRoute(stops);
        setRouteGeometry(coords);
        setRoadDistance(routeOptimizationService.computeTotalDistance(coords));
        setRoadDuration(null);
      }

      setIsOptimized(true);
      toast.success("Ruta optimizada correctamente");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al optimizar la ruta";
      setError(errorMessage);
      toast.error(errorMessage);
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
    toast.success("Ruta copiada al portapapeles");
  };

  const handleShareRoute = async () => {
    const routeToShare = isOptimized ? optimizedRoute : stops;

    const venueData = routeToShare.map((v) => [
      v.name,
      v.address,
      v.coordinates.lat.toFixed(6),
      v.coordinates.lng.toFixed(6),
      v.category,
      v.isFeatured ? 1 : 0,
    ]);
    const encoded = encodeURIComponent(JSON.stringify(venueData));
    const url = `${window.location.origin}${window.location.pathname}?venues=${encoded}`;

    await navigator.clipboard.writeText(url);
    toast.success("URL del itinerario copiada al portapapeles");
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
            title={
              theme === "dark"
                ? "Cambiar a modo claro"
                : "Cambiar a modo oscuro"
            }
            className="h-8 w-8"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Itinerarios de ocio y gastronomía
        </p>
      </div>

      <Separator />
      <div className="px-4 py-3 border-b bg-muted/30 space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Hora de inicio del recorrido
        </label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full cursor-pointer font-mono text-center text-sm tracking-wide h-9 bg-background focus-visible:ring-1"
        />
      </div>

      {/* Formulario de búsqueda con Autocomplete unificado */}
      <div className="p-4 space-y-2">
        <div className="flex items-end gap-2">
          <VenueAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={handleSelectSuggestion}
            onKeyDown={handleKeyDown}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            onlyFeatured={onlyFeatured}
            setOnlyFeatured={setOnlyFeatured}
          />
          <Button
            size="icon"
            disabled={isOptimizing}
            className="opacity-50 shrink-0 mb-[1px]"
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

      {/* Lista de paradas u Onboarding */}
      <div className="flex-1 px-4 pb-2 min-h-0 overflow-hidden">
        {stops.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-primary font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-foreground">Busca lugares</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Escribe el nombre de un restaurante, bar, discoteca o dirección.
              </p>
            </div>

            <div className="text-muted-foreground/40">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-primary font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-foreground">Añade paradas</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                También puedes hacer clic directamente en el mapa para añadir
                una parada.
              </p>
            </div>

            <div className="text-muted-foreground/40">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-primary font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-foreground">
                Optimiza tu ruta
              </h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Con al menos 2 paradas, pulsa Optimizar ruta para calcular el
                mejor recorrido.
              </p>
            </div>
          </div>
        ) : (
          <VenueList
            venues={stops}
            optimizedRoute={optimizedRoute}
            onRemove={handleRemoveStop}
            onUpdateDeadline={handleUpdateDeadline}
            isOptimized={isOptimized}
            isOptimizing={isOptimizing}
            onShowDetail={handleShowDetail}
          />
        )}
      </div>

      {/* Itinerary Summary */}
      <div className="px-4 pb-2">
        <ItinerarySummary
          venues={isOptimized ? optimizedRoute : stops}
          totalDistance={
            isOptimized && roadDistance !== null
              ? roadDistance
              : routeOptimizationService.computeTotalDistance(
                  stops.map((s) => s.coordinates),
                )
          }
          totalDuration={roadDuration}
        />
      </div>

      {/* Itinerary save*/}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Itinerarios guardados
            </p>
            <p className="text-xs text-muted-foreground">
              Guarda y recupera tus rutas más usadas.
            </p>
          </div>

          {isSaving ? (
            <div className="flex items-center gap-2">
              <Input
                value={itineraryName}
                onChange={(e) => setItineraryName(e.target.value)}
                placeholder="Nombre del itinerario..."
                className="h-8 text-xs w-40"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && confirmSaveItinerary()}
              />
              <Button size="sm" onClick={confirmSaveItinerary}>
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsSaving(false);
                  setItineraryName("");
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveCurrentItinerary}
              disabled={stops.length === 0 || isOptimizing}
            >
              Guardar itinerario
            </Button>
          )}
        </div>

        {savedItineraries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay itinerarios guardados aún.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {savedItineraries.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {item.venues.length} lugares
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleLoadItinerary(item)}
                      title="Cargar itinerario"
                    >
                      <Route className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => deleteItinerary(item.id)}
                      title="Borrar itinerario"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botones de acción */}
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
            disabled={stops.length === 0 || isOptimizing}
          >
            <Copy className="h-4 w-4" />
            Copiar ruta
          </Button>

          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleShareRoute}
            disabled={stops.length === 0 || isOptimizing}
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleClearAll}
            disabled={stops.length === 0 || isOptimizing}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <VenueDetailModal
        venue={detailVenue}
        index={detailIndex}
        total={isOptimized ? optimizedRoute.length : stops.length}
        isOpen={detailVenue !== null}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
