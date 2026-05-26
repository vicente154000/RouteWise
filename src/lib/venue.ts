export type Coordinate = { lat: number; lng: number };

export interface TimeWindow {
  /** Estimated arrival time (HH:MM) set after route optimization */
  estimatedArrival?: string;
  /** Deadline time (HH:MM) optionally set by the user */
  deadline?: string;
}

export type VenueCategory = "restaurant" | "bar" | "nightclub";

export const VENUE_CATEGORY_LABELS: Record<VenueCategory, string> = {
  restaurant: "Restaurante",
  bar: "Bar",
  nightclub: "Discoteca",
};

export const VENUE_CATEGORY_ICONS: Record<VenueCategory, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  nightclub: "🪩",
};

export const VENUE_CATEGORY_COLORS: Record<VenueCategory, string> = {
  restaurant: "#22c55e",
  bar: "#3b82f6",
  nightclub: "#a855f7",
};

export interface Venue {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinate;
  category: VenueCategory;
  isFeatured: boolean;
  timeWindow?: TimeWindow;
}

export interface UserPreferences {
  categories: VenueCategory[];
  startTime: string;
}

export interface Itinerary {
  id: string;
  venues: Venue[];
  totalDistance: number;
  totalDuration: number;
  geometry: Coordinate[];
  createdAt: string;
}
