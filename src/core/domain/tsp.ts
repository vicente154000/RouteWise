import { Coordinate, Venue } from "./venue";

export interface TSPConfig {
  featuredWeight: number; // Factor reductor de distancia para patrocinados (ej: 0.7)
}

export const DEFAULT_TSP_CONFIG: Required<TSPConfig> = {
  featuredWeight: 0.7,
};

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

export function calculateWeightedDistance(
  from: Coordinate,
  to: Venue,
  config: TSPConfig = DEFAULT_TSP_CONFIG
): number {
  const rawDistance = haversineDistance(from, to.coordinates);
  return to.isFeatured ? rawDistance * config.featuredWeight : rawDistance;
}

export function nearestNeighbor(stops: Venue[], config?: TSPConfig): Venue[] {
  if (stops.length <= 2) return [...stops];
  const visited = new Set<string>();
  const result: Venue[] = [];
  
  let current = stops[0];
  result.push(current);
  visited.add(current.id);

  while (visited.size < stops.length) {
    let nearest: Venue | null = null;
    let nearestDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;
      const dist = calculateWeightedDistance(current.coordinates, stop, config);
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

export function twoOpt(stops: Venue[], config?: TSPConfig): Venue[] {
  if (stops.length <= 3) return [...stops];
  let improved = true;
  let bestRoute = [...stops];

  const routeCost = (route: Venue[]): number => {
    let cost = 0;
    for (let i = 0; i < route.length - 1; i++) {
      cost += calculateWeightedDistance(route[i].coordinates, route[i + 1], config);
    }
    return cost;
  };

  let bestCost = routeCost(bestRoute);

  while (improved) {
    improved = false;
    for (let i = 1; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        const newRoute = [...bestRoute.slice(0, i), ...bestRoute.slice(i, k).reverse(), ...bestRoute.slice(k)];
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