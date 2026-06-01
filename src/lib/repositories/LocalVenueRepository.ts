import { IVenueRepository } from "./IVenueRepository";
import { Venue, VenueCategory } from "@/core/domain/venue";
import { LOCAL_VENUES } from "@/core/infrastructure/venues-data";

export class LocalVenueRepository implements IVenueRepository {
  async searchByName(query: string, category?: VenueCategory): Promise<Venue[]> {
    const cleanQuery = query.toLowerCase().trim();
    
    return LOCAL_VENUES.filter((venue) => {
      const matchesQuery = venue.name.toLowerCase().includes(cleanQuery) || 
                           venue.address.toLowerCase().includes(cleanQuery);
      const matchesCategory = category ? venue.category === category : true;
      
      return matchesQuery && matchesCategory;
    });
  }

  async getById(id: string): Promise<Venue | null> {
    return LOCAL_VENUES.find((venue) => venue.id === id) || null;
  }
}