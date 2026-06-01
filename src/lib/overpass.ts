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
    [out:json][timeout:10];
    (
      node${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
      way${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
    );
    out center;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: overpassQuery }),
    });

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

    return venues;
  } catch (error) {
    console.warn("Overpass search failed, falling back:", error);
    return [];
  }
}
