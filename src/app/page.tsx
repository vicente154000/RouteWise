"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import { Venue, Coordinate } from "@/core/domain/venue";
import { useLocalStorage } from "@/lib/useLocalStorage";

// Importación dinámica de MapView para evitar problemas de SSR con librerías de mapas en el navegador
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

export default function Home() {
  const [stops, setStops] = useLocalStorage<Venue[]>("routewise-stops", []);
  const [optimizedRoute, setOptimizedRoute] = useLocalStorage<Venue[]>(
    "routewise-optimized",
    []
  );
  const [routeGeometry, setRouteGeometry] = useLocalStorage<Coordinate[]>(
    "routewise-geometry",
    []
  );
  const [isOptimized, setIsOptimized] = useLocalStorage<boolean>(
    "routewise-isOptimized",
    false
  );

  const handleAddStop = useCallback(
    (stop: Venue) => {
      setStops((prev) => [...prev, stop]);
      if (isOptimized) {
        setOptimizedRoute([]);
        setRouteGeometry([]);
        setIsOptimized(false);
      }
    },
    [isOptimized, setStops, setOptimizedRoute, setRouteGeometry, setIsOptimized]
  );

  return (
    <main className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Sidebar - Panel de control lateral en Desktop */}
      <aside className="w-full max-w-[380px] min-w-[320px] h-full flex-shrink-0 hidden md:block">
        <Sidebar
          stops={stops}
          setStops={setStops}
          optimizedRoute={optimizedRoute}
          setOptimizedRoute={setOptimizedRoute}
          setRouteGeometry={setRouteGeometry}
          isOptimized={isOptimized}
          setIsOptimized={setIsOptimized}
        />
      </aside>

      {/* Mobile Sidebar - Panel flotante para pantallas táctiles/móviles */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-[1000]">
        <div className="bg-card border border-border rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto">
          <Sidebar
            stops={stops}
            setStops={setStops}
            optimizedRoute={optimizedRoute}
            setOptimizedRoute={setOptimizedRoute}
            setRouteGeometry={setRouteGeometry}
            isOptimized={isOptimized}
            setIsOptimized={setIsOptimized}
          />
        </div>
      </div>

      {/* Sección del visor de mapas interactivo */}
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