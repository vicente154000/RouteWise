import type { Coordinate } from "../../domain/venue";
import type {
  RouteSegment,
  RouteResult,
  OptimizationProgress,
} from "../../domain/tsp";

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
   * Fetches segments sequentially with progress tracking and cancellation support.
   * Returns `null` if no road route could be obtained.
   *
   * @param stops - Array of coordinates representing the route stops
   * @param abortSignal - Optional AbortSignal to cancel the operation
   * @param onProgress - Optional callback fired after each segment completes
   */
  getFullRoute(
    stops: Coordinate[],
    abortSignal?: AbortSignal,
    onProgress?: (progress: OptimizationProgress) => void,
  ): Promise<RouteResult | null>;
}
