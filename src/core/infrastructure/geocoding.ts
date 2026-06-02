import type { Coordinate } from "../domain/venue";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export interface Suggestion {
  displayName: string;
  coordinates: Coordinate;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Search for address suggestions as the user types.
 * Uses Nominatim's search endpoint with limit=5 for autocomplete.
 */
export async function searchSuggestions(query: string): Promise<Suggestion[]> {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_URL}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "RouteWise/1.0 (route-optimizer-app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data: NominatimResult[] = await response.json();

  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    displayName: item.display_name,
    coordinates: {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    },
  }));
}

/**
 * Geocode an address using OpenStreetMap's Nominatim API.
 * Returns the first result's coordinates, or null if not found.
 */
export async function geocodeAddress(
  address: string,
): Promise<Coordinate | null> {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
  });

  const response = await fetch(`${NOMINATIM_URL}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "RouteWise/1.0 (route-optimizer-app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data: NominatimResult[] = await response.json();

  if (!data || data.length === 0) {
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

/**
 * Reverse geocode coordinates to an address using Nominatim.
 * Returns the display name or null if not found.
 */
export async function reverseGeocode(
  coordinates: Coordinate,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: coordinates.lat.toString(),
    lon: coordinates.lng.toString(),
    format: "json",
  });

  const response = await fetch(
    `${NOMINATIM_URL}/reverse?${params.toString()}`,
    {
      headers: {
        "User-Agent": "RouteWise/1.0 (route-optimizer-app)",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || data.error) {
    return null;
  }

  return data.display_name || null;
}
