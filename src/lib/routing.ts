import type { Coordinate, RouteResult, RouteSegment } from "./tsp";

const OSRM_URL = "https://router.project-osrm.org";

/**
 * Decode an OSRM polyline (encoded polyline5 format) into an array of coordinates.
 */
function decodePolyline(encoded: string): Coordinate[] {
  const coords: Coordinate[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coords;
}

/**
 * Fetch the road route between two coordinates using OSRM.
 * Returns the route geometry, distance (km), and duration (seconds).
 */
export async function getRoute(
  from: Coordinate,
  to: Coordinate
): Promise<RouteSegment | null> {
  const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline&steps=false`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`OSRM error: ${response.statusText}, falling back to straight line`);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const geometry = decodePolyline(route.geometry);

    return {
      distance: route.distance / 1000, // convert meters to km
      duration: route.duration,
      geometry,
    };
  } catch (err) {
    console.warn("OSRM request failed, falling back to straight line:", err);
    return null;
  }
}

/**
 * Get the full road route for a sequence of ordered stops.
 * Fetches each segment sequentially and returns the combined result.
 */
export async function getFullRoute(stops: Coordinate[]): Promise<RouteResult | null> {
  if (stops.length < 2) return null;

  const segments: RouteSegment[] = [];
  let totalDistance = 0;
  let totalDuration = 0;
  const fullGeometry: Coordinate[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const segment = await getRoute(stops[i], stops[i + 1]);

    if (segment) {
      segments.push(segment);
      totalDistance += segment.distance;
      totalDuration += segment.duration;

      // Add geometry, avoiding duplicate points at junctions
      if (fullGeometry.length > 0 && segment.geometry.length > 0) {
        fullGeometry.push(...segment.geometry.slice(1));
      } else {
        fullGeometry.push(...segment.geometry);
      }
    } else {
      // Fallback: straight line between points
      const fallbackGeo = [stops[i], stops[i + 1]];
      const fallbackDist = haversineDistance(stops[i], stops[i + 1]);

      segments.push({
        distance: fallbackDist,
        duration: fallbackDist * 60, // estimate ~1 min per km
        geometry: fallbackGeo,
      });

      totalDistance += fallbackDist;
      totalDuration += fallbackDist * 60;

      if (fullGeometry.length > 0) {
        fullGeometry.push(stops[i + 1]);
      } else {
        fullGeometry.push(stops[i], stops[i + 1]);
      }
    }
  }

  return {
    segments,
    totalDistance,
    totalDuration,
    fullGeometry,
  };
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
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
