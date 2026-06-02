import type { IVenueRepository } from "./IVenueRepository";
import type { Venue, VenueCategory } from "../../domain/venue";
import { LOCAL_VENUES } from "../venues-data";

export class LocalVenueRepository implements IVenueRepository {
  async searchByName(
    query: string,
    category?: VenueCategory,
  ): Promise<Venue[]> {
    const q = query.trim().toLowerCase();
    let results = LOCAL_VENUES.filter(
      (v: Venue) =>
        v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q),
    );
    if (category) {
      results = results.filter((v: Venue) => v.category === category);
    }
    return results;
  }

  async getById(id: string): Promise<Venue | null> {
    return LOCAL_VENUES.find((v: Venue) => v.id === id) ?? null;
  }
}
