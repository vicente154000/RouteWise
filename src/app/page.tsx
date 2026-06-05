"use client";

import { Suspense, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import type { Venue, Coordinate } from "@/core/domain/venue";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { routeOptimizationService } from "@/core/infrastructure/dependencies";

// Dynamic import of MapView with SSR disabled (Leaflet needs window)
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  ),
});

function Home() {
  const [stops, setStops] = useLocalStorage<Venue[]>("routewise-stops", []);
  const [optimizedRoute, setOptimizedRoute] = useLocalStorage<Venue[]>(
    "routewise-optimized",
    [],
  );
  const [routeGeometry, setRouteGeometry] = useLocalStorage<Coordinate[]>(
    "routewise-geometry",
    [],
  );
  const [isOptimized, setIsOptimized] = useLocalStorage<boolean>(
    "routewise-isOptimized",
    false,
  );
  const searchParams = useSearchParams();

  // Load itinerary from shared URL
  useEffect(() => {
    const venuesParam = searchParams.get("venues");
    if (!venuesParam) return;

    const loadFromUrl = async () => {
      try {
        const venueData: unknown[][] = JSON.parse(
          decodeURIComponent(venuesParam),
        );

        if (!Array.isArray(venueData) || venueData.length === 0) return;

        // Clear previous route state first
        setOptimizedRoute([]);
        setRouteGeometry([]);
        setIsOptimized(false);

        const venues: Venue[] = venueData.map((v: unknown[]) => ({
          id: crypto.randomUUID(),
          name: String(v[0] ?? "Unknown"),
          address: String(v[1] ?? ""),
          coordinates: {
            lat: parseFloat(String(v[2])),
            lng: parseFloat(String(v[3])),
          },
          category: (["restaurant", "bar", "nightclub"].includes(String(v[4]))
            ? String(v[4])
            : "restaurant") as Venue["category"],
          isFeatured: Number(v[5]) === 1,
        }));

        setStops(venues);
        toast.success(`Itinerario cargado (${venues.length} paradas)`);

        // Auto-optimize if 2+ venues
        if (venues.length >= 2) {
          try {
            const result = await routeOptimizationService.optimize(venues);
            if (result) {
              setOptimizedRoute(result.venues);
              setRouteGeometry(result.geometry);
              setIsOptimized(true);
              toast.success("Ruta optimizada automáticamente");
            }
          } catch {
            // If optimization fails, venues are already set as stops
          }
        }
      } catch {
        toast.error("Error al cargar el itinerario compartido");
      }

      // Clean URL params after loading
      const url = new URL(window.location.href);
      url.searchParams.delete("venues");
      window.history.replaceState({}, "", url.toString());
    };

    loadFromUrl();
  }, [
    searchParams,
    setStops,
    setOptimizedRoute,
    setRouteGeometry,
    setIsOptimized,
  ]);

  const handleAddStop = useCallback(
    (stop: Venue) => {
      setStops((prev) => [...prev, stop]);
      if (isOptimized) {
        setOptimizedRoute([]);
        setRouteGeometry([]);
        setIsOptimized(false);
      }
    },
    [
      isOptimized,
      setStops,
      setOptimizedRoute,
      setRouteGeometry,
      setIsOptimized,
    ],
  );

  return (
    <main className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Sidebar - fixed width on desktop */}
      <aside className="w-full max-w-[380px] min-w-[320px] h-full flex-shrink-0 hidden md:block">
        <Sidebar
          stops={stops}
          setStops={setStops}
          optimizedRoute={optimizedRoute}
          setOptimizedRoute={setOptimizedRoute}
          setRouteGeometry={setRouteGeometry}
          routeGeometry={routeGeometry}
          isOptimized={isOptimized}
          setIsOptimized={setIsOptimized}
        />
      </aside>

      {/* Mobile sidebar - bottom sheet */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-[1000]">
        <div className="bg-card border border-border rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto">
          <Sidebar
            stops={stops}
            setStops={setStops}
            optimizedRoute={optimizedRoute}
            setOptimizedRoute={setOptimizedRoute}
            setRouteGeometry={setRouteGeometry}
            routeGeometry={routeGeometry}
            isOptimized={isOptimized}
            setIsOptimized={setIsOptimized}
          />
        </div>
      </div>

      {/* Map area */}
      <section className="flex-1 h-full relative">
        <MapView
          stops={stops}
          optimizedRoute={optimizedRoute}
          routeGeometry={routeGeometry}
          onAddStop={handleAddStop}
        />
      </section>
    </main>
  );
}

/**
 * Wrapper component that provides the Suspense boundary required by useSearchParams().
 * The actual page logic is in HomeContent.
 */
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}
