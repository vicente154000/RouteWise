import { describe, it, expect } from "vitest";
import { RouteOptimizationService } from "@/core/application/services/RouteOptimizationService";
import type { IRoutingService } from "@/core/infrastructure/repositories/IRoutingService";
import { haversineDistance } from "@/core/domain/tsp";
import type { Coordinate, Venue } from "@/core/domain/venue";

class StubRouting implements IRoutingService {
  async getRoute() {
    return null;
  }
  async getFullRoute(stops: Coordinate[]) {
    if (stops.length <= 1) return null;
    const segments = [] as any[];
    let totalDistance = 0;
    let totalDuration = 0;
    const fullGeometry: Coordinate[] = [];

    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      const d = haversineDistance(a, b);
      const duration = Math.round((d / 50) * 3600); // assume 50 km/h average
      segments.push({ distance: d, duration, geometry: [a, b] });
      totalDistance += d;
      totalDuration += duration;
      fullGeometry.push(a);
    }
    fullGeometry.push(stops[stops.length - 1]);

    return {
      segments,
      totalDistance,
      totalDuration,
      fullGeometry,
    };
  }
}

describe("RouteOptimizationService (core)", () => {
  it("computeTotalDistance devuelve número", () => {
    const routing = new StubRouting();
    const svc = new RouteOptimizationService(routing as IRoutingService);
    const coords: Coordinate[] = [
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4175, lng: -3.703 },
    ];
    const d = svc.computeTotalDistance(coords);
    expect(typeof d).toBe("number");
  });
});
