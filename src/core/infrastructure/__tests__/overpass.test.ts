import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchOverpassVenues } from "../overpass";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("searchOverpassVenues", () => {
  it("should return empty array for queries shorter than 2 characters", async () => {
    const result = await searchOverpassVenues("a");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return empty array for empty query", async () => {
    const result = await searchOverpassVenues("");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return empty array for whitespace-only query", async () => {
    const result = await searchOverpassVenues("  ");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should fetch from Overpass API and return mapped venues", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 12345,
            lat: 40.4168,
            lon: -3.7038,
            tags: {
              name: "Test Restaurant Madrid",
              amenity: "restaurant",
              "addr:street": "Calle Mayor",
              "addr:housenumber": "10",
            },
          },
          {
            type: "way",
            id: 67890,
            center: { lat: 40.4203, lon: -3.7058 },
            tags: {
              name: "Test Bar Madrid",
              amenity: "bar",
            },
          },
        ],
      }),
    });

    const result = await searchOverpassVenues("Test");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://overpass-api.de/api/interpreter",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "osm-node-12345",
      name: "Test Restaurant Madrid",
      address: "Calle Mayor, 10",
      category: "restaurant",
      isFeatured: false,
    });
    expect(result[0].coordinates).toEqual({ lat: 40.4168, lng: -3.7038 });

    expect(result[1]).toMatchObject({
      id: "osm-way-67890",
      name: "Test Bar Madrid",
      address: expect.stringContaining("40.4203"),
      category: "bar",
      isFeatured: false,
    });
    expect(result[1].coordinates).toEqual({ lat: 40.4203, lng: -3.7058 });
  });

  it("should filter by category when specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 1,
            lat: 40.41,
            lon: -3.7,
            tags: { name: "Nightclub Madrid", amenity: "nightclub" },
          },
        ],
      }),
    });

    const result = await searchOverpassVenues("Nightclub", "nightclub");

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("nightclub");
  });

  it("should filter elements that do not match the query name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 1,
            lat: 40.41,
            lon: -3.7,
            tags: { name: "Completely Different", amenity: "restaurant" },
          },
        ],
      }),
    });

    const result = await searchOverpassVenues("TestQuery");

    expect(result).toHaveLength(0);
  });

  it("should use cached results within TTL", async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 1,
            lat: 40.41,
            lon: -3.7,
            tags: { name: "Cached Venue", amenity: "restaurant" },
          },
        ],
      }),
    });

    const firstResult = await searchOverpassVenues("Cached");
    expect(firstResult).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const secondResult = await searchOverpassVenues("Cached");
    expect(secondResult).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("should return empty array on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await searchOverpassVenues("NetworkErrorTest");

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should return empty array on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Gateway",
    });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await searchOverpassVenues("NonOkTest");

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle elements with no name tag gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          {
            type: "node",
            id: 99,
            lat: 40.41,
            lon: -3.7,
            tags: { amenity: "restaurant" },
          },
        ],
      }),
    });

    const result = await searchOverpassVenues("unknown");

    expect(result).toHaveLength(0);
  });

  it("should handle AbortError (timeout) gracefully", async () => {
    mockFetch.mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await searchOverpassVenues("AbortErrorTest");

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
