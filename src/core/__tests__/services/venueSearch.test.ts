import { describe, it, expect } from "vitest";
import { VenueSearchService } from "@/core/application/services/VenueSearchService";
import type { IVenueRepository } from "@/core/infrastructure/repositories/IVenueRepository";
import type { Venue, VenueCategory } from "@/core/domain/venue";

class StubRepo implements IVenueRepository {
  constructor(private items: Venue[]) {}
  async searchByName(query: string, category?: VenueCategory) {
    const q = query.trim().toLowerCase();
    return this.items.filter((v) => v.name.toLowerCase().includes(q));
  }
  async getById(id: string) {
    return this.items.find((v) => v.id === id) ?? null;
  }
}

describe("VenueSearchService (core)", () => {
  it("usa el repositorio local cuando hay datos", async () => {
    const localItems: Venue[] = [
      {
        id: "1",
        name: "Local One",
        address: "x",
        coordinates: { lat: 0, lng: 0 },
        category: "restaurant",
      },
    ];

    const local = new StubRepo(localItems);
    const overpass = new StubRepo([]);
    const svc = new VenueSearchService(local, overpass);

    const results = await svc.search("Local");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("1");
  });
});
