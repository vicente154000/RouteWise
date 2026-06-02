import type { IVenueRepository } from "../../infrastructure/repositories/IVenueRepository";
import type { Venue, VenueCategory } from "../../domain/venue";
// Concrete repositories must be provided by the composition root.

/**
 * VenueSearchService orchestrates searching venues: local catalog first,
 * then Overpass as fallback. It uses repository interfaces so it can be
 * composed with different implementations (hexagonal architecture).
 */
export class VenueSearchService {
  private localRepo: IVenueRepository;
  private overpassRepo: IVenueRepository;

  constructor(localRepo: IVenueRepository, overpassRepo: IVenueRepository) {
    if (!localRepo || !overpassRepo) {
      throw new Error(
        "VenueSearchService requires both localRepo and overpassRepo implementations",
      );
    }
    this.localRepo = localRepo;
    this.overpassRepo = overpassRepo;
  }

  async search(query: string, category?: VenueCategory): Promise<Venue[]> {
    if (!query || query.trim().length === 0) return [];

    // 1. local catalog
    const local = await this.localRepo.searchByName(query, category);
    if (local && local.length > 0) return local;

    // 2. overpass
    const overpass = await this.overpassRepo.searchByName(query, category);
    return overpass;
  }

  async getById(id: string): Promise<Venue | null> {
    const local = await this.localRepo.getById(id);
    if (local) return local;
    return this.overpassRepo.getById(id);
  }
}

export default VenueSearchService;
