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
import type { Venue } from "../venue"; // Asegúrate de importar RouteSegment de donde corresponda si cambia, o de su propio archivo

describe("TSP Domain Logic", () => {
  // Coordenadas reales aproximadas en Pamplona
  const coordA = { lat: 42.8125, lng: -1.645 }; // Plaza del Castillo
  const coordB = { lat: 42.816, lng: -1.643 }; // Catedral de Pamplona (~0.42 km)
  const coordC = { lat: 42.809, lng: -1.65 }; // Vuelta del Castillo (~0.55 km)

  // Venues ficticios usando las propiedades e interfaces reales de tu dominio
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
    // Forzamos un array desordenado para evaluar que el algoritmo procesa la cercanía
    const mixedStops = [mockVenues[0], mockVenues[2], mockVenues[1]];
    const result = nearestNeighbor(mixedStops);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("1"); // El punto de partida de la heurística se respeta invariable
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
    // Simulamos un segmento de viaje de 10 minutos (600 segundos) entre el punto 1 y el 2
    const mockSegments: RouteSegment[] = [
      { distance: 0.42, duration: 600, geometry: [coordA, coordB] },
    ];

    // Llamamos a la función con hora de inicio a las 08:30
    const routeWithTimes = computeArrivalTimes(
      [mockVenues[0], mockVenues[1]],
      mockSegments,
      "08:30",
    );

    // Primer elemento: llega directo a la hora de salida
    expect(routeWithTimes[0].timeWindow?.estimatedArrival).toBe("08:30");

    // Segundo elemento: llega tras los 10 min de trayecto + 10 min obligatorios de estancia en el primer stop
    // 08:30 + 10m estancia + 10m trayecto = 08:50
    expect(routeWithTimes[1].timeWindow?.estimatedArrival).toBe("08:50");
  });
  it("computeArrivalTimes calcula solo duración acumulada relativa si startTime está vacío", () => {
    const mockSegments = [
      { distance: 0.5, duration: 300, geometry: [] }, // 5 minutos de trayecto
    ];

    // Pasamos un string vacío como startTime
    const route = computeArrivalTimes(
      [mockVenues[0], mockVenues[1]],
      mockSegments,
      "",
    );

    // Parada inicial: sin tiempo acumulado
    expect(route[0].timeWindow?.estimatedArrival).toBe("+0 min");

    // Parada 2: 0 min + 10 min de estancia en Parada 1 + 5 min de viaje = +15 min
    expect(route[1].timeWindow?.estimatedArrival).toBe("+15 min");
  });
});
