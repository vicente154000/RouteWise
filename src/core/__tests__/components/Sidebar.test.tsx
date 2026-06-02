import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

// Mock dependencies
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock the composition root routeOptimizationService
vi.mock("@/core/infrastructure/dependencies", () => ({
  routeOptimizationService: {
    optimize: vi
      .fn()
      .mockResolvedValue({
        venues: [],
        geometry: [],
        totalDistance: 1.2,
        totalDuration: 60,
      }),
    computeTotalDistance: vi.fn().mockReturnValue(0.5),
  },
}));

import Sidebar from "@/components/Sidebar";
import type { Venue, Coordinate } from "@/core/domain/venue";

describe("Sidebar component (unit)", () => {
  it("muestra título y botones, optimizar deshabilitado con <2 paradas", () => {
    const setStops = vi.fn();
    const setOptimizedRoute = vi.fn();
    const setRouteGeometry = vi.fn();
    const setIsOptimized = vi.fn();

    render(
      <Sidebar
        stops={[] as Venue[]}
        setStops={setStops}
        optimizedRoute={[] as Venue[]}
        setOptimizedRoute={setOptimizedRoute}
        setRouteGeometry={setRouteGeometry}
        isOptimized={false}
        setIsOptimized={setIsOptimized}
      />,
    );

    expect(screen.getByText("RouteWise")).toBeInTheDocument();
    const optimizeBtn = screen.getByRole("button", { name: /Optimizar ruta/i });
    expect(optimizeBtn).toBeDisabled();
  });

  it("cuando hay 2 paradas, al pulsar Optimizar llama a routeOptimizationService.optimize", async () => {
    const setStops = vi.fn();
    const setOptimizedRoute = vi.fn();
    const setRouteGeometry = vi.fn();
    const setIsOptimized = vi.fn();

    const v: Venue = {
      id: "1",
      name: "A",
      address: "x",
      coordinates: { lat: 0, lng: 0 },
      category: "restaurant",
    };
    const w: Venue = {
      id: "2",
      name: "B",
      address: "y",
      coordinates: { lat: 0, lng: 1 },
      category: "restaurant",
    };

    render(
      <Sidebar
        stops={[v, w]}
        setStops={setStops}
        optimizedRoute={[] as Venue[]}
        setOptimizedRoute={setOptimizedRoute}
        setRouteGeometry={setRouteGeometry}
        isOptimized={false}
        setIsOptimized={setIsOptimized}
      />,
    );

    const optimizeBtn = screen.getByRole("button", { name: /Optimizar ruta/i });
    expect(optimizeBtn).toBeEnabled();
    fireEvent.click(optimizeBtn);

    // wait a tick for async handler
    await Promise.resolve();

    const deps = await import("@/core/infrastructure/dependencies");
    expect(deps.routeOptimizationService.optimize).toHaveBeenCalled();
  });
});
