import type { IVenueRepository } from "./IVenueRepository";
import type { Venue, VenueCategory } from "../../domain/venue";
import { searchOverpassVenues } from "../overpass";

export class OverpassVenueRepository implements IVenueRepository {
  async searchByName(
    query: string,
    category?: VenueCategory,
  ): Promise<Venue[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const results = await searchOverpassVenues(query, category);
      return results;
    } catch (err) {
      console.warn("Overpass search failed:", err);
      return [];
    }
  }

  async getById(_id: string): Promise<Venue | null> {
    // Overpass does not provide a convenient global ID lookup in this repo abstraction.
    void _id;
    return null;
  }
}
