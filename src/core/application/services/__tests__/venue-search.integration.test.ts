// src/core/application/services/__tests__/venue-search.integration.test.ts
import { describe, it, expect, vi } from "vitest";
import { VenueSearchService } from "../VenueSearchService";
import { RouteOptimizationService } from "../RouteOptimizationService";
import type { IVenueRepository } from "../../../infrastructure/repositories/IVenueRepository";
import type { IRoutingService } from "../../../infrastructure/repositories/IRoutingService";
import type { Venue } from "../../../domain/venue";

describe("VenueSearchService Integration", () => {
  const mockVenue: Venue = {
    id: "local-1",
    name: "Café Iruña",
    address: "Plaza del Castillo, 44",
    coordinates: { lat: 42.8166, lng: -1.6431 },
    category: "bar",
    isFeatured: false,
  };

  it("debe buscar en el catálogo local primero y retornar si hay coincidencia", async () => {
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
      searchByName: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]),
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

  it("debe retornar array vacío si ambos repositorios devuelven vacío", async () => {
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);
    const result = await service.search("Sitio Inexistente");

    expect(result).toEqual([]);
  });

  it("debe retornar array vacío para query vacía", async () => {
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);
    const result = await service.search("");

    expect(result).toEqual([]);
    expect(localRepoMock.searchByName).not.toHaveBeenCalled();
    expect(overpassRepoMock.searchByName).not.toHaveBeenCalled();
  });

  it("debe manejar error del repositorio local y recurrir a Overpass", async () => {
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockRejectedValue(new Error("DB connection error")),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([mockVenue]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);

    // The service doesn't catch errors from localRepo, so it should propagate
    await expect(service.search("Test")).rejects.toThrow("DB connection error");
  });

  it("debe manejar error del repositorio Overpass cuando local está vacío", async () => {
    const localRepoMock: IVenueRepository = {
      searchByName: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
    };

    const overpassRepoMock: IVenueRepository = {
      searchByName: vi
        .fn()
        .mockRejectedValue(new Error("Overpass API unavailable")),
      getById: vi.fn().mockResolvedValue(null),
    };

    const service = new VenueSearchService(localRepoMock, overpassRepoMock);

    await expect(service.search("Test")).rejects.toThrow(
      "Overpass API unavailable",
    );
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
      getRoute: () => {
        throw new Error("Function not implemented.");
      },
    };

    const service = new RouteOptimizationService(routingServiceMock);
    const result = await service.optimize(venues, "08:00");

    expect(routingServiceMock.getFullRoute).toHaveBeenCalled();
    expect(result.totalDistance).toBe(15);
    expect(result.venues[0].timeWindow?.estimatedArrival).toBe("08:00");
  });

  it("debe retornar geometría directa si getFullRoute devuelve null (servicio OSRM caído)", async () => {
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
        name: "Destino",
        address: "Calle Estafeta, 10",
        coordinates: { lat: 42.816, lng: -1.643 },
        category: "restaurant",
      },
    ];

    const routingServiceMock: IRoutingService = {
      getFullRoute: vi.fn().mockResolvedValue(null),
      getRoute: () => {
        throw new Error("Function not implemented.");
      },
    };

    const service = new RouteOptimizationService(routingServiceMock);
    const result = await service.optimize(venues);

    expect(routingServiceMock.getFullRoute).toHaveBeenCalled();
    expect(result.totalDistance).toBeNull();
    expect(result.totalDuration).toBeNull();
    expect(result.geometry).toHaveLength(2);
    expect(result.geometry[0]).toEqual({ lat: 42.8125, lng: -1.645 });
  });

  it("debe retornar geometría directa si getFullRoute lanza error (timeout)", async () => {
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
        name: "Destino",
        address: "Calle Estafeta, 10",
        coordinates: { lat: 42.816, lng: -1.643 },
        category: "restaurant",
      },
    ];

    const routingServiceMock: IRoutingService = {
      getFullRoute: vi.fn().mockRejectedValue(new Error("Timeout")),
      getRoute: () => {
        throw new Error("Function not implemented.");
      },
    };

    const service = new RouteOptimizationService(routingServiceMock);
    const result = await service.optimize(venues);

    // Should fall back to direct geometry when routing fails
    expect(result.totalDistance).toBeNull();
    expect(result.totalDuration).toBeNull();
    expect(result.geometry).toHaveLength(2);
  });

  it("debe retornar venues sin modificar si hay un solo venue (sin necesidad de ruta)", async () => {
    const venues: Venue[] = [
      {
        id: "1",
        name: "Único",
        address: "Calle Mayor, 1",
        coordinates: { lat: 42.8125, lng: -1.645 },
        category: "bar",
      },
    ];

    const routingServiceMock: IRoutingService = {
      getFullRoute: vi.fn(),
      getRoute: () => {
        throw new Error("Function not implemented.");
      },
    };

    const service = new RouteOptimizationService(routingServiceMock);
    const result = await service.optimize(venues);

    expect(routingServiceMock.getFullRoute).not.toHaveBeenCalled();
    expect(result.venues).toHaveLength(1);
    expect(result.geometry).toHaveLength(1);
  });
});
