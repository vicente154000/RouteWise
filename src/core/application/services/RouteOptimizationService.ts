import type { Venue, Coordinate } from "../../domain/venue";
import {
  optimizeRoute,
  computeArrivalTimes,
  totalDistance,
} from "../../domain/tsp";
import type { IRoutingService } from "../../infrastructure/repositories/IRoutingService";

export interface OptimizationResult {
  venues: Venue[];
  geometry: { lat: number; lng: number }[];
  totalDistance?: number | null;
  totalDuration?: number | null;
}

export class RouteOptimizationService {
  private routing: IRoutingService;

  constructor(routing: IRoutingService) {
    if (!routing)
      throw new Error("RouteOptimizationService requires IRoutingService");
    this.routing = routing;
  }

  async optimize(
    venues: Venue[],
    startTime?: string,
  ): Promise<OptimizationResult> {
    if (venues.length <= 1) {
      return { venues, geometry: venues.map((v) => v.coordinates) };
    }

    const optimized = optimizeRoute(venues);
    const coords = optimized.map((v) => v.coordinates);
    let routeResult;
    try {
      routeResult = await this.routing.getFullRoute(coords);
    } catch {
      routeResult = null;
    }

    if (routeResult) {
      const withTimes = computeArrivalTimes(
        optimized,
        routeResult.segments,
        startTime,
      );
      return {
        venues: withTimes,
        geometry: routeResult.fullGeometry,
        totalDistance: routeResult.totalDistance,
        totalDuration: routeResult.totalDuration,
      };
    }

    return {
      venues: optimized,
      geometry: coords,
      totalDistance: null,
      totalDuration: null,
    };
  }

  computeTotalDistance(coords: Coordinate[]): number {
    return totalDistance(coords);
  }
}

export default RouteOptimizationService;
