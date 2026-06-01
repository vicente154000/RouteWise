// src/core/infrastructure/NominatimGeocodingAdapter.ts

export interface NominatimSuggestion {
  displayName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export class NominatimGeocodingAdapter {
  /**
   * Busca sugerencias de direcciones utilizando la API pública de Nominatim (OpenStreetMap).
   */
  async searchSuggestions(query: string): Promise<NominatimSuggestion[]> {
    if (!query || query.trim().length < 3) return [];

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&viewbox=-3.800,40.500,-3.550,40.300&bounded=1&addressdetails=1&limit=5`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RouteWise-App-Gastronomia-B2B2C",
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim HTTP Error: ${response.statusText}`);
      }

      const data = await response.json();

      return data.map((item: any) => ({
        displayName: item.display_name,
        coordinates: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      }));
    } catch (error) {
      console.error("Error en el adaptador de Nominatim Geocoding:", error);
      return [];
    }
  }

  /**
   * NUEVO MÉTODO: Convierte coordenadas [lat, lng] en una dirección de texto legible (Geocodificación Inversa).
   * Reemplaza la funcionalidad que estaba en src/lib/geocoding.ts.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RouteWise-App-Gastronomia-B2B2C",
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim Reverse HTTP Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error("Error en reverseGeocode del adaptador Nominatim:", error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
}