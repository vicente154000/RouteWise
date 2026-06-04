import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchSuggestions,
  geocodeAddress,
  reverseGeocode,
} from "../geocoding";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchSuggestions", () => {
  it("should return empty array for queries shorter than 3 characters", async () => {
    const result = await searchSuggestions("ab");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return empty array for empty query", async () => {
    const result = await searchSuggestions("");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return empty array for whitespace-only query", async () => {
    const result = await searchSuggestions("   ");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should fetch suggestions from Nominatim and map them correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: "40.4168",
          lon: "-3.7038",
          display_name: "Madrid, Spain",
        },
        {
          lat: "40.4203",
          lon: "-3.7058",
          display_name: "Plaza Mayor, Madrid, Spain",
        },
      ],
    });

    const result = await searchSuggestions("mad");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({
        headers: { "User-Agent": expect.stringContaining("RouteWise") },
      }),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      displayName: "Madrid, Spain",
      coordinates: { lat: 40.4168, lng: -3.7038 },
    });
    expect(result[1]).toEqual({
      displayName: "Plaza Mayor, Madrid, Spain",
      coordinates: { lat: 40.4203, lng: -3.7058 },
    });
  });

  it("should return empty array when Nominatim returns empty data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await searchSuggestions("xyzxyz");
    expect(result).toEqual([]);
  });

  it("should throw on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Too Many Requests",
    });

    await expect(searchSuggestions("madrid")).rejects.toThrow(
      "Nominatim error: Too Many Requests",
    );
  });
});

describe("geocodeAddress", () => {
  it("should return coordinates for a valid address", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: "40.4168",
          lon: "-3.7038",
          display_name: "Madrid, Spain",
        },
      ],
    });

    const result = await geocodeAddress("Madrid");

    expect(result).toEqual({ lat: 40.4168, lng: -3.7038 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=1"),
      expect.any(Object),
    );
  });

  it("should return null when no results found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await geocodeAddress("Nowhere");
    expect(result).toBeNull();
  });

  it("should throw on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    });

    await expect(geocodeAddress("invalid")).rejects.toThrow(
      "Nominatim error: Not Found",
    );
  });
});

describe("reverseGeocode", () => {
  it("should return display name for valid coordinates", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: "Plaza Mayor, Madrid, Spain",
      }),
    });

    const result = await reverseGeocode({ lat: 40.4168, lng: -3.7038 });

    expect(result).toBe("Plaza Mayor, Madrid, Spain");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/reverse"),
      expect.any(Object),
    );
  });

  it("should return null when API returns an error field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Unable to geocode" }),
    });

    const result = await reverseGeocode({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("should return null when display_name is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await reverseGeocode({ lat: 40.4168, lng: -3.7038 });
    expect(result).toBeNull();
  });

  it("should throw on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
    });

    await expect(reverseGeocode({ lat: 999, lng: 999 })).rejects.toThrow(
      "Nominatim error: Bad Request",
    );
  });
});
