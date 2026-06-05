// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedItineraries } from "../useSavedItineraries";

const STORAGE_KEY = "routewise-saved-itineraries";

beforeEach(() => {
  localStorage.clear();
});

describe("useSavedItineraries", () => {
  it("should initialize with saved itineraries from localStorage", () => {
    const storedItineraries = [
      {
        id: "1",
        name: "Test",
        venues: [],
        optimizedRoute: [],
        geometry: [],
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedItineraries));

    const { result } = renderHook(() => useSavedItineraries());

    expect(result.current.savedItineraries).toEqual(storedItineraries);
  });

  it("should save and delete itineraries correctly", () => {
    const itinerary = {
      id: "2",
      name: "Guardado",
      venues: [],
      optimizedRoute: [],
      geometry: [],
      createdAt: new Date().toISOString(),
    };

    const { result } = renderHook(() => useSavedItineraries());

    act(() => {
      result.current.saveItinerary(itinerary);
    });

    expect(result.current.savedItineraries).toEqual([itinerary]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([itinerary]));

    act(() => {
      result.current.deleteItinerary(itinerary.id);
    });

    expect(result.current.savedItineraries).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
  });
});
