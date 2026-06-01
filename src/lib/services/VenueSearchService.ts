import { IVenueRepository } from "../repositories/IVenueRepository";
import { Venue, VenueCategory } from "@/core/domain/venue";
import { NominatimGeocodingAdapter } from "@/core/infrastructure/NominatimGeocodingAdapter";

export class VenueSearchService {
  constructor(
    private localRepo: IVenueRepository,
    private overpassRepo: IVenueRepository,
    private geocodingAdapter: NominatimGeocodingAdapter
  ) {}

  async searchVenues(query: string, categories?: VenueCategory[]): Promise<Venue[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const results: Venue[] = [];
    const targetCategory = categories && categories.length === 1 ? categories[0] : undefined;

    // 1. Capa Local
    const localMatches = await this.localRepo.searchByName(trimmed, targetCategory);
    results.push(...localMatches);

    // 2. Capa Overpass
    if (results.length < 5) {
      try {
        const overpassMatches = await this.overpassRepo.searchByName(trimmed, targetCategory);
        for (const venue of overpassMatches) {
          if (!results.some((r) => r.name.toLowerCase() === venue.name.toLowerCase())) {
            results.push(venue);
          }
        }
      } catch (error) {
        console.warn("Overpass API fallback activado:", error);
      }
    }

    // 3. Capa Nominatim (Fallback de direcciones generales)
    if (results.length === 0 && trimmed.length >= 3) {
      const addressMatches = await this.geocodingAdapter.searchSuggestions(trimmed);
      addressMatches.forEach((s) => {
        results.push({
          id: `nominatim-${crypto.randomUUID()}`,
          name: s.displayName.split(",")[0].trim(),
          address: s.displayName,
          coordinates: s.coordinates,
          category: "restaurant",
          isFeatured: false,
        });
      });
    }

    if (categories && categories.length > 0) {
      return results.filter((r) => categories.includes(r.category)).slice(0, 8);
    }

    return results.slice(0, 8);
  }
}