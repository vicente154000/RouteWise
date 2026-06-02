import { LocalVenueRepository } from "./repositories/LocalVenueRepository";
import { OverpassVenueRepository } from "./repositories/OverpassVenueRepository";
import * as routing from "./routing";
import type { IRoutingService } from "./repositories/IRoutingService";
import type { Coordinate } from "../domain/venue";
import VenueSearchService from "../application/services/VenueSearchService";
import RouteOptimizationService from "../application/services/RouteOptimizationService";

/**
 * OSRMRoutingAdapter: adapter that implements `IRoutingService` using
 * the concrete functions from `src/lib/routing.ts`.
 */
class OSRMRoutingAdapter implements IRoutingService {
  async getRoute(from: Coordinate, to: Coordinate) {
    return routing.getRoute(from, to);
  }

  async getFullRoute(stops: Coordinate[]) {
    return routing.getFullRoute(stops);
  }

  // getRouteForVenues and getDistanceMatrix are optional and not required here.
}

// Infrastructure adapters (singletons)
export const localVenueRepository = new LocalVenueRepository();
export const overpassVenueRepository = new OverpassVenueRepository();
export const osrmRoutingAdapter: IRoutingService = new OSRMRoutingAdapter();

// Application services wired with concrete adapters (singletons)
export const venueSearchService = new VenueSearchService(
  localVenueRepository,
  overpassVenueRepository,
);

export const routeOptimizationService = new RouteOptimizationService(
  osrmRoutingAdapter,
);

export default {
  localVenueRepository,
  overpassVenueRepository,
  osrmRoutingAdapter,
  venueSearchService,
  routeOptimizationService,
};
