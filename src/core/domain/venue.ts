export type Coordinate = { lat: number; lng: number };

export interface TimeWindow {
  estimatedArrival?: string;
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