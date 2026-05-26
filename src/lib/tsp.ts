export interface Coordinate {
  lat: number;
  lng: number;
}

export interface TimeWindow {
  /** Estimated arrival time (HH:MM) - computed after optimization */
  estimatedArrival?: string;
  /** Deadline time (HH:MM) - user can set a latest arrival time */
  deadline?: string;
}

export interface Stop {
  id: string;
  address: string;
  coordinates: Coordinate;
  timeWindow?: TimeWindow;
}

export interface RouteSegment {
  distance: number; // km
  duration: number; // seconds
  geometry: Coordinate[]; // polyline points along the road
}

export interface RouteResult {
  segments: RouteSegment[];
  totalDistance: number; // km
  totalDuration: number; // seconds
  fullGeometry: Coordinate[]; // all points concatenated
}

/**
 * Configuration for the TSP optimizer.
 * @param featuredWeight - Multiplier applied to distance for featured venues (default: 0.7).
 *   Values < 1 make featured venues "closer" (more likely to be prioritized).
 *   Values > 1 make featured venues "farther" (less likely to be prioritized).
 */
export interface TSPConfig {
  featuredWeight?: number;
}

/**
 * A stop that may include an `isFeatured` flag for weighted TSP optimization.
 * This is a superset of `Stop` used when venues have featured status.
 */
export interface FeaturedStop extends Stop {
  isFeatured?: boolean;
}

/**
 * Default TSP configuration.
 */
const DEFAULT_TSP_CONFIG: Required<TSPConfig> = {
  featuredWeight: 0.7,
};

/**
 * Calculate the Haversine distance between two coordinates in kilometers.
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

/**
 * Calculate total straight-line distance of a route (array of coordinates).
 */
export function totalDistance(coords: Coordinate[]): number {
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += haversineDistance(coords[i], coords[i + 1]);
  }
  return dist;
}

/**
 * Calculate weighted distance between two stops.
 * If the destination stop is featured, the distance is multiplied by `featuredWeight`
 * (default 0.7), making it more likely to be visited sooner by the TSP algorithm.
 *
 * @param from - Origin coordinate
 * @param to - Destination stop (may include isFeatured flag)
 * @param config - TSP configuration (optional)
 */
export function weightedDistance(
  from: Coordinate,
  to: FeaturedStop,
  config?: TSPConfig,
): number {
  const rawDist = haversineDistance(from, to.coordinates);
  const { featuredWeight } = { ...DEFAULT_TSP_CONFIG, ...config };

  if (to.isFeatured) {
    return rawDist * featuredWeight;
  }
  return rawDist;
}

/**
 * Nearest Neighbor heuristic for TSP.
 * Supports weighted distance for featured venues via TSPConfig.
 */
export function nearestNeighbor(
  stops: FeaturedStop[],
  config?: TSPConfig,
): FeaturedStop[] {
  if (stops.length <= 2) return [...stops];

  const visited = new Set<string>();
  const result: FeaturedStop[] = [];
  let current = stops[0];
  result.push(current);
  visited.add(current.id);

  while (visited.size < stops.length) {
    let nearest: FeaturedStop | null = null;
    let nearestDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;
      const dist = weightedDistance(current.coordinates, stop, config);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = stop;
      }
    }

    if (nearest) {
      result.push(nearest);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  return result;
}

/**
 * 2-opt local search improvement for TSP.
 * Supports weighted distance for featured venues via TSPConfig.
 */
export function twoOpt(
  stops: FeaturedStop[],
  config?: TSPConfig,
): FeaturedStop[] {
  if (stops.length <= 3) return [...stops];

  let improved = true;
  let bestRoute = [...stops];

  // Use weighted distance for total route cost
  const routeCost = (route: FeaturedStop[]): number => {
    let cost = 0;
    for (let i = 0; i < route.length - 1; i++) {
      cost += weightedDistance(route[i].coordinates, route[i + 1], config);
    }
    return cost;
  };

  let bestCost = routeCost(bestRoute);

  while (improved) {
    improved = false;

    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        const newRoute = twoOptSwap(bestRoute, i, k);
        const newCost = routeCost(newRoute);

        if (newCost < bestCost) {
          bestRoute = newRoute;
          bestCost = newCost;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

function twoOptSwap(route: FeaturedStop[], i: number, k: number): FeaturedStop[] {
  const before = route.slice(0, i);
  const segment = route.slice(i, k);
  const after = route.slice(k);
  return [...before, ...segment.reverse(), ...after];
}

/**
 * Full optimization pipeline: Nearest Neighbor + 2-opt refinement.
 * Supports weighted distance for featured venues via TSPConfig.
 */
export function optimizeRoute(
  stops: FeaturedStop[],
  config?: TSPConfig,
): FeaturedStop[] {
  if (stops.length <= 2) return [...stops];
  const nnRoute = nearestNeighbor(stops, config);
  return twoOpt(nnRoute, config);
}

/**
 * Compute estimated arrival times for each stop in the route.
 * Assumes start time is 08:00 and each stop takes 10 minutes.
 */
export function computeArrivalTimes(
  route: FeaturedStop[],
  segments: RouteSegment[],
  startTime: string = "08:00",
): FeaturedStop[] {
  if (route.length === 0) return route;

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  let currentSeconds = startHours * 3600 + startMinutes * 60;
  const STOP_DURATION_SECONDS = 10 * 60; // 10 min per stop

  return route.map((stop, index) => {
    if (index > 0 && segments[index - 1]) {
      currentSeconds += segments[index - 1].duration;
    }

    const hours = Math.floor(currentSeconds / 3600);
    const minutes = Math.floor((currentSeconds % 3600) / 60);
    const estimatedArrival = `${String(hours).padStart(2, "0")}:${String(
      minutes,
    ).padStart(2, "0")}`;

    // Add stop duration (except for last stop)
    if (index < route.length - 1) {
      currentSeconds += STOP_DURATION_SECONDS;
    }

    return {
      ...stop,
      timeWindow: {
        ...stop.timeWindow,
        estimatedArrival,
      },
    };
  });
}
