import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  weightedDistance,
  nearestNeighbor,
  twoOpt,
  totalDistance,
} from "@/core/domain/tsp";
import type { Coordinate, Venue } from "@/core/domain/venue";

describe("TSP unit tests (core)", () => {
  it("haversineDistance calcula correctamente (approx)", () => {
    const a: Coordinate = { lat: 40.416775, lng: -3.70379 };
    const b: Coordinate = { lat: 40.418056, lng: -3.7025 };
    const d = haversineDistance(a, b);
    expect(d).toBeGreaterThan(0.05);
    expect(d).toBeLessThan(1);
  });

  it("weightedDistance aplica 0.7x a featured", () => {
    const from: Coordinate = { lat: 40.416775, lng: -3.70379 };
    const toVenue: Venue = {
      id: "v1",
      name: "Featured",
      address: "Calle Falsa",
      coordinates: { lat: 40.4175, lng: -3.703 },
      category: "restaurant",
      isFeatured: true,
    };

    const raw = haversineDistance(from, toVenue.coordinates);
    const w = weightedDistance(from, toVenue);
    expect(w).toBeCloseTo(raw * 0.7, 6);
  });

  it("nearestNeighbor ordena correctamente", () => {
    const v1: Venue = {
      id: "a",
      name: "A",
      address: "",
      coordinates: { lat: 0, lng: 0 },
      category: "restaurant",
    };
    const v2: Venue = {
      id: "b",
      name: "B",
      address: "",
      coordinates: { lat: 0, lng: 1 },
      category: "restaurant",
    };
    const v3: Venue = {
      id: "c",
      name: "C",
      address: "",
      coordinates: { lat: 0, lng: 2 },
      category: "restaurant",
    };
    const v4: Venue = {
      id: "d",
      name: "D",
      address: "",
      coordinates: { lat: 0, lng: 3 },
      category: "restaurant",
    };

    const order = nearestNeighbor([v1, v4, v2, v3]);
    expect(order.map((v) => v.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("twoOpt mejora la ruta", () => {
    const A: Venue = {
      id: "A",
      name: "A",
      address: "",
      coordinates: { lat: 0, lng: 0 },
      category: "restaurant",
    };
    const B: Venue = {
      id: "B",
      name: "B",
      address: "",
      coordinates: { lat: 0, lng: 1 },
      category: "restaurant",
    };
    const C: Venue = {
      id: "C",
      name: "C",
      address: "",
      coordinates: { lat: 0, lng: 0.5 },
      category: "restaurant",
    };
    const D: Venue = {
      id: "D",
      name: "D",
      address: "",
      coordinates: { lat: 0, lng: 2 },
      category: "restaurant",
    };

    const bad = [A, C, B, D];
    const before = totalDistance(bad.map((v) => v.coordinates));
    const improved = twoOpt(bad);
    const after = totalDistance(improved.map((v) => v.coordinates));

    expect(after).toBeLessThanOrEqual(before);
  });
});
