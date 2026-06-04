import { describe, it, expect, beforeEach } from "vitest";
import { LocalVenueRepository } from "../LocalVenueRepository";

describe("LocalVenueRepository", () => {
  let repository: LocalVenueRepository;

  beforeEach(() => {
    repository = new LocalVenueRepository();
  });

  describe("searchByName", () => {
    it("should find venues by name (case-insensitive)", async () => {
      const results = await repository.searchByName("botín");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain("botín".toLowerCase());
    });

    it("should find venues by address (case-insensitive)", async () => {
      const results = await repository.searchByName("cuchilleros");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].address.toLowerCase()).toContain("cuchilleros");
    });

    it("should filter by category when specified", async () => {
      const results = await repository.searchByName("", "bar");

      expect(results.every((v) => v.category === "bar")).toBe(true);
    });

    it("should return empty array when no match found", async () => {
      const results = await repository.searchByName("NonExistentVenueXYZ123");
      expect(results).toEqual([]);
    });

    it("should return all venues matching query without category filter", async () => {
      const results = await repository.searchByName("la");

      expect(results.length).toBeGreaterThan(0);
      results.forEach((v) => {
        const match =
          v.name.toLowerCase().includes("la") ||
          v.address.toLowerCase().includes("la");
        expect(match).toBe(true);
      });
    });

    it("should combine name/address search with category filter", async () => {
      const results = await repository.searchByName("la", "restaurant");

      expect(results.length).toBeGreaterThan(0);
      results.forEach((v) => {
        expect(v.category).toBe("restaurant");
        const match =
          v.name.toLowerCase().includes("la") ||
          v.address.toLowerCase().includes("la");
        expect(match).toBe(true);
      });
    });

    it("should trim the query before searching", async () => {
      const resultsUntrimmed = await repository.searchByName("  botín  ");
      const resultsTrimmed = await repository.searchByName("botín");

      expect(resultsUntrimmed).toEqual(resultsTrimmed);
    });
  });

  describe("getById", () => {
    it("should return a venue by its ID", async () => {
      const venue = await repository.getById("rest-001");

      expect(venue).not.toBeNull();
      expect(venue!.id).toBe("rest-001");
      expect(venue!.name).toBe("Sobrino de Botín");
    });

    it("should return null for non-existent ID", async () => {
      const venue = await repository.getById("non-existent-id");
      expect(venue).toBeNull();
    });

    it("should return a bar venue correctly", async () => {
      const venue = await repository.getById("bar-001");
      expect(venue).not.toBeNull();
      expect(venue!.category).toBe("bar");
    });

    it("should return a nightclub venue correctly", async () => {
      const venue = await repository.getById("club-001");
      expect(venue).not.toBeNull();
      expect(venue!.category).toBe("nightclub");
    });
  });
});
