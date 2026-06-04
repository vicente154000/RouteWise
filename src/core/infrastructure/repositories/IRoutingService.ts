import type { Coordinate } from "../../domain/venue";
import type { RouteSegment, RouteResult } from "../../domain/tsp";

/**
 * Abstract routing port for the application (hexagonal architecture).
 * Implementations may call OSRM, a self-hosted router, or a mock for tests.
 */
export interface IRoutingService {
  /**
   * Get a single road segment between two coordinates.
   * Returns `null` when a road route cannot be obtained and a fallback
   * (e.g. straight line) is used by callers.
   */
  getRoute(from: Coordinate, to: Coordinate): Promise<RouteSegment | null>;

  /**
   * Get the full route (ordered) for a sequence of coordinates.
   * Returns `null` if no road route could be obtained.
   */
  getFullRoute(stops: Coordinate[]): Promise<RouteResult | null>;
}
