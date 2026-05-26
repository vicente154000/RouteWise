import type { Venue } from "./venue";

/**
 * Local catalog of ~15 example venues in Madrid for demo/offline use.
 * Includes restaurants, bars, and nightclubs — some marked as featured.
 */
export const LOCAL_VENUES: Venue[] = [
  // ==========================================
  // 🍽️ RESTAURANTES (5)
  // ==========================================
  {
    id: "rest-001",
    name: "Sobrino de Botín",
    address: "C. de Cuchilleros, 17, Centro",
    coordinates: { lat: 40.4142, lng: -3.7085 },
    category: "restaurant",
    isFeatured: true,
  },
  {
    id: "rest-002",
    name: "DiverXO",
    address: "C. del Padre Damián, 23, Chamartín",
    coordinates: { lat: 40.4525, lng: -3.6863 },
    category: "restaurant",
    isFeatured: true,
  },
  {
    id: "rest-003",
    name: "Casa Lucio",
    address: "C. de la Cava Baja, 35, Centro",
    coordinates: { lat: 40.4129, lng: -3.7092 },
    category: "restaurant",
    isFeatured: false,
  },
  {
    id: "rest-004",
    name: "Santceloni",
    address: "P.º de la Castellana, 57, Salamanca",
    coordinates: { lat: 40.4283, lng: -3.6895 },
    category: "restaurant",
    isFeatured: true,
  },
  {
    id: "rest-005",
    name: "La Tasquita de Enfrente",
    address: "C. de la Ballesta, 6, Centro",
    coordinates: { lat: 40.4195, lng: -3.7042 },
    category: "restaurant",
    isFeatured: false,
  },

  // ==========================================
  // 🍺 BARES (5)
  // ==========================================
  {
    id: "bar-001",
    name: "El Tigre",
    address: "C. de las Infantas, 30, Centro",
    coordinates: { lat: 40.4218, lng: -3.6978 },
    category: "bar",
    isFeatured: true,
  },
  {
    id: "bar-002",
    name: "La Venencia",
    address: "C. de la Echegaray, 7, Centro",
    coordinates: { lat: 40.4172, lng: -3.6985 },
    category: "bar",
    isFeatured: false,
  },
  {
    id: "bar-003",
    name: "Museo Chicote",
    address: "Gran Vía, 12, Centro",
    coordinates: { lat: 40.4199, lng: -3.7031 },
    category: "bar",
    isFeatured: true,
  },
  {
    id: "bar-004",
    name: "Cervecería La Sureña",
    address: "C. de la Princesa, 40, Moncloa",
    coordinates: { lat: 40.4308, lng: -3.7145 },
    category: "bar",
    isFeatured: false,
  },
  {
    id: "bar-005",
    name: "1862 Dry Bar",
    address: "C. del Pez, 27, Centro",
    coordinates: { lat: 40.4231, lng: -3.7039 },
    category: "bar",
    isFeatured: false,
  },

  // ==========================================
  // 🌙 DISCOTECAS / NIGHTCLUBS (5)
  // ==========================================
  {
    id: "club-001",
    name: "Kapital",
    address: "C. de Atocha, 125, Centro",
    coordinates: { lat: 40.4089, lng: -3.6936 },
    category: "nightclub",
    isFeatured: true,
  },
  {
    id: "club-002",
    name: "Joy Eslava",
    address: "C. del Arenal, 11, Centro",
    coordinates: { lat: 40.4175, lng: -3.7078 },
    category: "nightclub",
    isFeatured: false,
  },
  {
    id: "club-003",
    name: "Teatro Barceló",
    address: "C. de Barceló, 11, Centro",
    coordinates: { lat: 40.4258, lng: -3.6995 },
    category: "nightclub",
    isFeatured: false,
  },
  {
    id: "club-004",
    name: "Sala Cool",
    address: "C. de Isabel la Católica, 6, Centro",
    coordinates: { lat: 40.4205, lng: -3.7081 },
    category: "nightclub",
    isFeatured: false,
  },
  {
    id: "club-005",
    name: "Gabana 1800",
    address: "C. de Velázquez, 6, Salamanca",
    coordinates: { lat: 40.4261, lng: -3.6872 },
    category: "nightclub",
    isFeatured: false,
  },
];

/**
 * Search venues in the local catalog by name and optional category.
 * Performs a case-insensitive substring match on the venue name.
 */
export function searchLocalVenues(
  query: string,
  category?: Venue["category"],
): Venue[] {
  const normalizedQuery = query.toLowerCase().trim();

  return LOCAL_VENUES.filter((venue) => {
    const matchesQuery = venue.name.toLowerCase().includes(normalizedQuery);
    const matchesCategory = category ? venue.category === category : true;
    return matchesQuery && matchesCategory;
  });
}

/**
 * Get a venue by its ID from the local catalog.
 */
export function getLocalVenueById(id: string): Venue | undefined {
  return LOCAL_VENUES.find((venue) => venue.id === id);
}
