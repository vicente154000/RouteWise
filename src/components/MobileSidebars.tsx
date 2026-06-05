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
  const [isDragging, setIsDragging] = useState(false);
  const [isOpenState, setIsOpenState] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isCollapsed = !isOpenState && translateY >= collapsedTranslate - 4;
  const isOpen = isOpenState || translateY <= 4;

  useEffect(() => {
    const height = window.innerHeight;
    const sheetHeight = Math.round(height * 0.85); // sheet uses 85vh
    const handleVisible = 72; // px visible when collapsed (handle area)
    const collapsed = Math.max(120, sheetHeight - handleVisible);
    setCollapsedTranslate(collapsed);
    setTranslateY(collapsed);
  }, []);

  useEffect(() => {
    if (dragStartY === null) return;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const deltaY = event.clientY - dragStartY;
      const nextTranslate = Math.min(
        Math.max(0, dragStartTranslate + deltaY),
        collapsedTranslate,
      );
      setTranslateY(nextTranslate);
    };

    const handleUp = () => {
      const shouldClose = translateY > collapsedTranslate * 0.55;
      setIsOpenState(!shouldClose);
      setDragStartY(null);
      setDragStartTranslate(0);
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [collapsedTranslate, dragStartTranslate, dragStartY, translateY]);

  const toggleSheet = () => {
    setIsOpenState((v) => !v);
  };

  // Sync translateY with isOpenState (controlled open/close)
  useEffect(() => {
    if (isOpenState) {
      // mount then animate open
      setIsMounted(true);
      // ensure start position is collapsed so transition runs
      setTranslateY(collapsedTranslate);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTranslateY(0)),
      );
    } else {
      // animate closed then unmount after transition
      setTranslateY(collapsedTranslate);
      const t = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpenState, collapsedTranslate]);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    // If not mounted (collapsed), mount and prepare to drag open
    if (!isMounted) {
      setIsMounted(true);
      setTranslateY(collapsedTranslate);
      // let mount complete then start drag
      requestAnimationFrame(() => {
        setDragStartY(event.clientY);
        setDragStartTranslate(collapsedTranslate);
        setIsDragging(true);
        sheetRef.current?.setPointerCapture(event.pointerId);
      });
      return;
    }

    setDragStartY(event.clientY);
    setDragStartTranslate(translateY);
    setIsDragging(true);
    sheetRef.current?.setPointerCapture(event.pointerId);
  };

  return (
    <div className="md:hidden fixed inset-x-4 bottom-4 z-[1000]">
      {isMounted && (
        <div
          ref={sheetRef}
          className="mx-auto w-full max-w-xl rounded-[28px] border border-border bg-card shadow-2xl overflow-hidden"
          style={{
            transform: `translateY(${translateY}px)`,
            transition: isDragging
              ? "none"
              : "transform 300ms cubic-bezier(.22,.9,.28,1)",
            touchAction: "none",
            maxHeight: "85vh",
            height: "85vh",
            pointerEvents: isCollapsed ? "none" : "auto",
          }}
        >
          <div className="flex flex-col">
            {/* Inner content hidden when collapsed to keep only handle interactive */}
            <div
              className="rounded-b-[28px] border-t border-border flex-1 min-h-0"
              style={{
                display: isCollapsed ? "none" : "block",
                pointerEvents: isCollapsed ? "none" : "auto",
              }}
            >
              <div className="h-[calc(85vh-72px)] flex flex-col overflow-hidden px-4 pb-6">
                <div className="flex-1 min-h-0 overflow-y-auto">
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
      )}

      {/* External handle (always interactive) positioned above the collapsed sheet */}
      <div
        className="absolute left-0 right-0 bottom-4 flex justify-center z-[1100]"
        style={{ pointerEvents: "auto", transform: `translateY(-12px)` }}
      >
        <button
          onPointerDown={handlePointerDown}
          onClick={toggleSheet}
          className="mx-auto w-full max-w-md flex items-center justify-center gap-3 px-4 py-2 rounded-[28px] bg-card border border-border shadow-md text-sm"
          style={{ maxWidth: 720 }}
          aria-expanded={isOpen}
        >
          <div className="h-1.5 w-14 rounded-full bg-muted/60" />
          <span className="text-xs text-muted-foreground">
            {isOpen ? "Cerrar" : "Abrir"}
          </span>
        </button>
      </div>
    </div>
  );
}
