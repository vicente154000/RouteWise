"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import type { Venue, Coordinate } from "@/core/domain/venue";

interface MobileSidebarProps {
  stops: Venue[];
  setStops: React.Dispatch<React.SetStateAction<Venue[]>>;
  optimizedRoute: Venue[];
  setOptimizedRoute: React.Dispatch<React.SetStateAction<Venue[]>>;
  setRouteGeometry: React.Dispatch<React.SetStateAction<Coordinate[]>>;
  isOptimized: boolean;
  setIsOptimized: React.Dispatch<React.SetStateAction<boolean>>;
  routeGeometry?: Coordinate[];
}

export default function MobileSidebar({
  stops,
  setStops,
  optimizedRoute,
  setOptimizedRoute,
  setRouteGeometry,
  routeGeometry,
  isOptimized,
  setIsOptimized,
}: MobileSidebarProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [collapsedTranslate, setCollapsedTranslate] = useState(260);
  const [translateY, setTranslateY] = useState(260);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartTranslate, setDragStartTranslate] = useState(0);

  useEffect(() => {
    const height = window.innerHeight;
    const collapsed = Math.min(280, Math.max(180, Math.round(height * 0.55)));
    setCollapsedTranslate(collapsed);
    setTranslateY(collapsed);
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (dragStartY === null) return;
      const deltaY = event.clientY - dragStartY;
      const nextTranslate = Math.min(
        Math.max(0, dragStartTranslate + deltaY),
        collapsedTranslate,
      );
      setTranslateY(nextTranslate);
    };

    const handleUp = () => {
      if (dragStartY === null) return;
      const shouldClose = translateY > collapsedTranslate * 0.55;
      setTranslateY(shouldClose ? collapsedTranslate : 0);
      setDragStartY(null);
      setDragStartTranslate(0);
    };

    if (dragStartY !== null) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [collapsedTranslate, dragStartY, dragStartTranslate, translateY]);

  const toggleSheet = () => {
    setTranslateY((current) => (current === 0 ? collapsedTranslate : 0));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStartY(event.clientY);
    setDragStartTranslate(translateY);
    sheetRef.current?.setPointerCapture(event.pointerId);
  };

  return (
    <div className="md:hidden fixed inset-x-4 bottom-4 z-[1000]">
      <div
        ref={sheetRef}
        className="mx-auto w-full max-w-xl rounded-[28px] border border-border bg-card shadow-2xl"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: dragStartY === null ? "transform 250ms ease-out" : "none",
          maxHeight: "85vh",
          height: "85vh",
        }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex flex-col gap-3 px-4 pt-4 pb-2"
            onPointerDown={handlePointerDown}
          >
            <div className="mx-auto h-1.5 w-14 rounded-full bg-muted/60" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Itinerario</span>
              <button
                type="button"
                onClick={toggleSheet}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted/80"
              >
                {translateY === 0 ? "Cerrar" : "Abrir"}
              </button>
            </div>
          </div>

          <div className="h-full overflow-hidden rounded-b-[28px] border-t border-border">
            <div className="h-full overflow-y-auto px-4 pb-6">
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
        </div>
      </div>
    </div>
  );
}
