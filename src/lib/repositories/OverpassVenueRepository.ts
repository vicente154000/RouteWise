import { IVenueRepository } from "./IVenueRepository";
import { Venue, VenueCategory } from "@/core/domain/venue";

export class OverpassVenueRepository implements IVenueRepository {
  private categoryTags: Record<VenueCategory, string[]> = {
    restaurant: ['"amenity"="restaurant"'],
    bar: ['"amenity"="bar"'],
    nightclub: ['"amenity"="nightclub"', '"amenity"="club"'],
  };

  async searchByName(query: string, category?: VenueCategory): Promise<Venue[]> {
    const bbox = "40.300,-3.800,40.500,-3.550"; // Área metropolitana de Madrid
    const categoriesToSearch = category ? [category] : (Object.keys(this.categoryTags) as VenueCategory[]);
    const tagFilters = categoriesToSearch.flatMap((cat) => this.categoryTags[cat]).join(",");

    const overpassQuery = `
      [out:json][timeout:10];
      (
        node${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
        way${tagFilters ? `[${tagFilters}]` : ""}(${bbox});
      );
      out center;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: overpassQuery }),
    });

    if (!response.ok) throw new Error(`Overpass HTTP Error: ${response.statusText}`);
    const data = await response.json();
    const elements = data.elements || [];

    return elements
      .filter((el: any) => el.tags?.name?.toLowerCase().includes(query.toLowerCase()))
      .map((el: any) => {
        const lat = el.lat ?? el.center?.lat ?? 0;
        const lng = el.lon ?? el.center?.lon ?? 0;
        const detectedCategory = categoriesToSearch.find((cat) =>
          this.categoryTags[cat].some((tag) => tag.includes(`"${el.tags?.amenity || ""}"`))
        ) || "restaurant";

        return {
          id: `osm-${el.type}-${el.id}`,
          name: el.tags?.name || "Establecimiento desconocido",
          address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"]].filter(Boolean).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: { lat, lng },
          category: detectedCategory,
          isFeatured: false,
        };
      });
  }

  async getById(id: string): Promise<Venue | null> {
    return null;
  }
}