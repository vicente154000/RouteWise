import type { Venue, VenueCategory } from "./venue";

/**
 * OSM node/way tags used for each venue category.
 */
const CATEGORY_TAGS: Record<VenueCategory, string[]> = {
  restaurant: ['"amenity"="restaurant"'],
  bar: ['"amenity"="bar"'],
  nightclub: ['"amenity"="nightclub"', '"amenity"="club"'],
};

/**
 * Maximum results per category from Overpass.
 */
const MAX_RESULTS_PER_CATEGORY = 10;

/**
 * Overpass API timeout in seconds (reduced from 10 to 5).
 */
const OVERPASS_TIMEOUT = 5;

/**
 * Cache TTL for Overpass results (5 minutes).
 */
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: Venue[];
  timestamp: number;
}

const overpassCache = new Map<string, CacheEntry>();

/**
 * Result interface from the Overpass API.
 */
interface OverpassElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: {
    name?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:city"?: string;
    amenity?: string;
  };
}

/**
 * Search for venues in OpenStreetMap using the Overpass API.
 * Searches within a bounding box around Madrid by default.
 * Results are cached in memory for 5 minutes.
 *
 * @param query - The venue name to search for
 * @param category - Optional category filter
 * @returns Array of venues found via Overpass
 */
export async function searchOverpassVenues(
  query: string,
  category?: VenueCategory,
): Promise<Venue[]> {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `${normalizedQuery}:${category || "all"}`;

  // Check cache first
  const cached = overpassCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Build the Overpass QL query
  // Search in Madrid area (rough bounding box)
  const bbox = "40.300,-3.800,40.500,-3.550"; // Madrid metro area

  // Build tag filters
  const categoriesToSearch = category
    ? [category]
    : (Object.keys(CATEGORY_TAGS) as VenueCategory[]);

  const tagFilters = categoriesToSearch
    .flatMap((cat) => CATEGORY_TAGS[cat])
    .join(",");

  const overpassQuery = `
    [out:json][timeout:${OVERPASS_TIMEOUT}];
    (
      node${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
      way${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
    );
    out center;
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT * 1000);

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: overpassQuery }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass error: ${response.statusText}`);
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    // Filter by name match and map to Venue
    const venues: Venue[] = elements
      .filter((el) => {
        const name = el.tags?.name?.toLowerCase() || "";
        return name.includes(normalizedQuery);
      })
      .slice(0, MAX_RESULTS_PER_CATEGORY * categoriesToSearch.length)
      .map((el) => {
        const lat = el.lat ?? el.center?.lat ?? 0;
        const lng = el.lon ?? el.center?.lon ?? 0;

        // Determine category from tags
        const detectedCategory = categoriesToSearch.find((cat) =>
          CATEGORY_TAGS[cat].some((tag) => {
            const amenity = el.tags?.amenity || "";
            return tag.includes(`"${amenity}"`);
          }),
        );

        const street = el.tags?.["addr:street"] || "";
        const housenumber = el.tags?.["addr:housenumber"] || "";
        const address = [street, housenumber].filter(Boolean).join(", ") ||
          `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        return {
          id: `osm-${el.type}-${el.id}`,
          name: el.tags?.name || "Unknown",
          address,
          coordinates: { lat, lng },
          category: detectedCategory || "restaurant",
          isFeatured: false,
        };
      });

    // Store in cache
    overpassCache.set(cacheKey, { data: venues, timestamp: Date.now() });

    return venues;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("Overpass request timed out");
    } else {
      console.warn("Overpass search failed, falling back:", error);
    }
    return [];
  }
}
