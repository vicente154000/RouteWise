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
 * Nearest Neighbor heuristic for TSP.
 */
export function nearestNeighbor(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return [...stops];

  const visited = new Set<string>();
  const result: Stop[] = [];
  let current = stops[0];
  result.push(current);
  visited.add(current.id);

  while (visited.size < stops.length) {
    let nearest: Stop | null = null;
    let nearestDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;
      const dist = haversineDistance(current.coordinates, stop.coordinates);
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
 */
export function twoOpt(stops: Stop[]): Stop[] {
  if (stops.length <= 3) return [...stops];

  let improved = true;
  let bestRoute = [...stops];
  let bestDist = totalDistance(bestRoute.map((s) => s.coordinates));

  while (improved) {
    improved = false;

    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        const newRoute = twoOptSwap(bestRoute, i, k);
        const newDist = totalDistance(newRoute.map((s) => s.coordinates));

        if (newDist < bestDist) {
          bestRoute = newRoute;
          bestDist = newDist;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

function twoOptSwap(route: Stop[], i: number, k: number): Stop[] {
  const before = route.slice(0, i);
  const segment = route.slice(i, k);
  const after = route.slice(k);
  return [...before, ...segment.reverse(), ...after];
}

/**
 * Full optimization pipeline: Nearest Neighbor + 2-opt refinement.
 */
export function optimizeRoute(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return [...stops];
  const nnRoute = nearestNeighbor(stops);
  return twoOpt(nnRoute);
}

/**
 * Compute estimated arrival times for each stop in the route.
 * Assumes start time is 08:00 and each stop takes 10 minutes.
 */
export function computeArrivalTimes(
  route: Stop[],
  segments: RouteSegment[],
  startTime: string = "08:00"
): Stop[] {
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
      minutes
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
