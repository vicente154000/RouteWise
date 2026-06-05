"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedItinerary } from "@/core/domain/venue";

const STORAGE_KEY = "routewise-saved-itineraries";

function readSavedItineraries(): SavedItinerary[] {
  if (typeof window === "undefined") return [];
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (!item) return [];
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedItineraries(itineraries: SavedItinerary[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraries));
  } catch {
    // Ignore write errors
  }
}

export function useSavedItineraries() {
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>(
    [],
  );

  useEffect(() => {
    setSavedItineraries(readSavedItineraries());
  }, []);

  const saveItinerary = useCallback((itinerary: SavedItinerary) => {
    setSavedItineraries((prev) => {
      const next = [
        itinerary,
        ...prev.filter((item) => item.id !== itinerary.id),
      ];
      writeSavedItineraries(next);
      return next;
    });
  }, []);

  const deleteItinerary = useCallback((id: string) => {
    setSavedItineraries((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeSavedItineraries(next);
      return next;
    });
  }, []);

  const getItinerary = useCallback(
    (id: string) => savedItineraries.find((item) => item.id === id) ?? null,
    [savedItineraries],
  );

  const clearItineraries = useCallback(() => {
    setSavedItineraries([]);
    writeSavedItineraries([]);
  }, []);

  return {
    savedItineraries,
    saveItinerary,
    deleteItinerary,
    getItinerary,
    clearItineraries,
  };
}
