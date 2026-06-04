// src/core/domain/__tests__/tsp.test.ts
import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  weightedDistance,
  nearestNeighbor,
  twoOpt,
  optimizeRoute,
  computeArrivalTimes,
  type RouteSegment,
} from "../tsp";
import type { Venue } from "../venue";

describe("TSP Domain Logic", () => {
  // Realistic coordinates in Pamplona for testing distance calculations
  const coordA = { lat: 42.8125, lng: -1.645 }; // Plaza del Castillo
  const coordB = { lat: 42.816, lng: -1.643 }; // Catedral de Pamplona (~0.42 km)
  const coordC = { lat: 42.809, lng: -1.65 }; // Vuelta del Castillo (~0.55 km)

  // Mock venues with realistic coordinates and categories for testing route optimization
  const mockVenues: Venue[] = [
    {
      id: "1",
      name: "Café Iruña",
      address: "Plaza del Castillo, 44",
      coordinates: coordA,
      category: "bar",
      isFeatured: false,
    },
    {
      id: "2",
      name: "Restaurante Catedral",
      address: "Calle Curia, 22",
      coordinates: coordB,
      category: "restaurant",
      isFeatured: false,
    },
    {
      id: "3",
      name: "Discoteca Subsuelo",
      address: "Plaza del Castillo, 3",
      coordinates: coordC,
      category: "nightclub",
      isFeatured: false,
    },
  ];

  it("haversineDistance calcula correctamente la distancia geométrica en kilómetros", () => {
    const dist = haversineDistance(coordA, coordB);
    expect(dist).toBeGreaterThan(0.3);
    expect(dist).toBeLessThan(0.6);
  });

  it("weightedDistance aplica un multiplicador de 0.7x (por defecto) a los venues con isFeatured", () => {
    const venueFeatured: Venue = { ...mockVenues[1], isFeatured: true };

    const rawDist = haversineDistance(coordA, venueFeatured.coordinates);
    const wDist = weightedDistance(coordA, venueFeatured);

    expect(wDist).toBeCloseTo(rawDist * 0.7, 5);
  });

  it("nearestNeighbor organiza y prioriza los elementos basándose en la cercanía ponderada", () => {
    // We shuffle the input order to ensure the algorithm is actually sorting based on distance, not just returning the input order
    const mixedStops = [mockVenues[0], mockVenues[2], mockVenues[1]];
    const result = nearestNeighbor(mixedStops);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("1");
  });

  it("twoOpt refina y busca mejoras locales invirtiendo segmentos de ruta", () => {
    const longRoute = [mockVenues[0], mockVenues[2], mockVenues[1]];
    const optimized = twoOpt(longRoute);

    expect(optimized).toHaveLength(3);
    expect(optimized[0].id).toBe("1");
  });

  it("optimizeRoute encadena exitosamente Nearest Neighbor y la optimización de 2-opt", () => {
    const sortedRoute = optimizeRoute(mockVenues);

    expect(sortedRoute).toHaveLength(3);
    expect(sortedRoute[0].id).toBe("1");
  });

  it("computeArrivalTimes inyecta correctamente las horas estimadas de llegada (estimatedArrival)", () => {
    // Simulate segments with realistic durations (10 minutes = 600 seconds) between the venues
    const mockSegments: RouteSegment[] = [
      { distance: 0.42, duration: 600, geometry: [coordA, coordB] },
    ];

    // Cast venues to include timeWindow for testing purposes
    const routeWithTimes = computeArrivalTimes(
      [mockVenues[0], mockVenues[1]],
      mockSegments,
      "08:30",
    );

    // First stop: arrival time should be the start time (08:30)
    expect(routeWithTimes[0].timeWindow?.estimatedArrival).toBe("08:30");

    // Second stop: arrival time should be start time + 10 min travel + 10 min stay = 08:50
    expect(routeWithTimes[1].timeWindow?.estimatedArrival).toBe("08:50");
  });
  it("computeArrivalTimes calcula solo duración acumulada relativa si startTime está vacío", () => {
    const mockSegments = [{ distance: 0.5, duration: 300, geometry: [] }];

    // empty arral of venues with timeWindow for testing purposes
    const route = computeArrivalTimes(
      [mockVenues[0], mockVenues[1]],
      mockSegments,
      "",
    );

    // Initial stop should have +0 min since it's the starting point
    expect(route[0].timeWindow?.estimatedArrival).toBe("+0 min");

    // Second stop should have +5 min (duration of the segment) since we are only calculating relative durations
    expect(route[1].timeWindow?.estimatedArrival).toBe("+15 min");
  });
});
