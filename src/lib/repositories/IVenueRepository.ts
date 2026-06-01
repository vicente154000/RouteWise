import { Venue, VenueCategory } from "@/core/domain/venue";

export interface IVenueRepository {
  searchByName(query: string, category?: VenueCategory): Promise<Venue[]>;
  getById(id: string): Promise<Venue | null>;
}