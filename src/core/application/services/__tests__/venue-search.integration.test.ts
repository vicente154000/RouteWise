// src/core/application/services/__tests__/venue-search.integration.test.ts
import { describe, it, expect, vi } from "vitest";
import { VenueSearchService } from "../VenueSearchService";
import { RouteOptimizationService } from "../RouteOptimizationService";
import type { IVenueRepository } from "../../../infrastructure/repositories/IVenueRepository";
import type { IRoutingService } from "../../../infrastructure/repositories/IRoutingService";
import type { Coordinate, Venue } from "../../../domain/venue";
import type { RouteResult, RouteSegment } from "../../../domain/tsp";

describe("VenueSearchService Integration", () => {
  // Mock individual usando valores válidos del dominio real
  const mockVenue: Venue = {
    id: "local-1",
    name: "Café Iruña",
    address: "Plaza del Castillo, 44",
    coordinates: { lat: 42.8166, lng: -1.6431 },
    category: "bar", // Modificado a una categoría real
    isFeatured: false,
  };

  it("debe buscar en el catálogo local primero y retornar si hay coincidencia", async () => {
    // Definición explícita con vi.fn() para cumplir la interfaz IVenueRepository
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);
    const result = await service.search("Café Iruña");

    expect(localRepoMock.searchByName).toHaveBeenCalledWith(
      "Café Iruña",
      undefined,
    );
    expect(overpassRepoMock.searchByName).not.toHaveBeenCalled();
    expect(result).toEqual([mockVenue]);
  });

  it("debe recurrir a Overpass como fallback si el repositorio local no encuentra resultados", async () => {
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([]), // Vacío localmente
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]), // Coincidencia en Overpass
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);
    const result = await service.search("Bar Desconocido");

    expect(localRepoMock.searchByName).toHaveBeenCalledWith(
      "Bar Desconocido",
      undefined,
    );
    expect(overpassRepoMock.searchByName).toHaveBeenCalledWith(
      "Bar Desconocido",
      undefined,
    );
    expect(result).toEqual([mockVenue]);
  });
});

describe("RouteOptimizationService Integration", () => {
  it("debe integrar TSP y mapear la geometría completa usando el IRoutingService", async () => {
    const venues: Venue[] = [
      {
        id: "1",
        name: "Origen",
        address: "Calle Mayor, 1",
        coordinates: { lat: 42.8125, lng: -1.645 },
        category: "bar",
      },
      {
        id: "2",
        name: "Destino Destacado",
        address: "Calle Estafeta, 10",
        coordinates: { lat: 42.816, lng: -1.643 },
        category: "restaurant",
        isFeatured: true,
      },
    ];

    // Mock estructural tipado de IRoutingService para evitar castings peligrosos
    const routingServiceMock: IRoutingService = {
      getFullRoute: vi.fn().mockResolvedValue({
        segments: [{ distance: 15, duration: 900, geometry: [] }],
        totalDistance: 15,
        totalDuration: 900,
        fullGeometry: [
          { lat: 42.8125, lng: -1.645 },
          { lat: 42.816, lng: -1.643 },
        ],
      }),
      getRoute: function (
        from: Coordinate,
        to: Coordinate,
      ): Promise<RouteSegment | null> {
        throw new Error("Function not implemented.");
      },
    };

    const service = new RouteOptimizationService(routingServiceMock);
    const result = await service.optimize(venues, "08:00");

    expect(routingServiceMock.getFullRoute).toHaveBeenCalled();
    expect(result.totalDistance).toBe(15);
    // Valida que RouteOptimizationService use el dominio para calcular e inyectar los tiempos automáticamente
    expect(result.venues[0].timeWindow?.estimatedArrival).toBe("08:00");
  });
});
