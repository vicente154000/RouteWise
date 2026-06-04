import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoute, getFullRoute } from "../routing";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRoute", () => {
  it("should return null when OSRM returns no routes", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [],
      }),
    });

    const result = await getRoute(
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    );

    expect(result).toBeNull();
  });

  it("should return null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getRoute(
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should return null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getRoute(
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should construct the correct OSRM URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            geometry: "abc",
            distance: 1000,
            duration: 120,
          },
        ],
      }),
    });

    await getRoute(
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "route/v1/driving/-3.7038,40.4168;-3.7058,40.4203",
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("overview=full"),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("geometries=polyline"),
    );
  });

  it("should decode polyline geometry and return route segment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            geometry: "_gfjH~q}JQz@",
            distance: 500,
            duration: 60,
          },
        ],
      }),
    });

    const result = await getRoute(
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    );

    expect(result).not.toBeNull();
    expect(result!.geometry.length).toBeGreaterThan(0);
    expect(result!.distance).toBe(0.5);
    expect(result!.duration).toBe(60);
  });
});

describe("getFullRoute", () => {
  it("should return null for fewer than 2 stops", async () => {
    const result = await getFullRoute([{ lat: 40.4168, lng: -3.7038 }]);
    expect(result).toBeNull();
  });

  it("should return null for empty array", async () => {
    const result = await getFullRoute([]);
    expect(result).toBeNull();
  });

  it("should fetch all segments in parallel and combine results", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            geometry: "abc",
            distance: 500,
            duration: 60,
          },
        ],
      }),
    });

    const stops = [
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
      { lat: 40.425, lng: -3.71 },
    ];

    const result = await getFullRoute(stops);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(2);
    expect(result!.totalDistance).toBe(1.0);
    expect(result!.totalDuration).toBe(120);
    expect(result!.fullGeometry.length).toBeGreaterThan(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should fall back to straight-line distance when a segment fails", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              geometry: "abc",
              distance: 500,
              duration: 60,
            },
          ],
        }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const stops = [
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
      { lat: 40.425, lng: -3.71 },
    ];

    const result = await getFullRoute(stops);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(2);
    expect(result!.segments[0].distance).toBe(0.5);
    expect(result!.segments[1].distance).toBeGreaterThan(0);
    expect(result!.segments[1].duration).toBe(
      result!.segments[1].distance * 60,
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle all segments failing gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const stops = [
      { lat: 40.4168, lng: -3.7038 },
      { lat: 40.4203, lng: -3.7058 },
    ];

    const result = await getFullRoute(stops);

    expect(result).not.toBeNull();
    expect(result!.segments).toHaveLength(1);
    expect(result!.segments[0].distance).toBeGreaterThan(0);
    expect(result!.segments[0].duration).toBeGreaterThan(0);
    expect(result!.fullGeometry).toHaveLength(2);
    consoleSpy.mockRestore();
  });
});
