"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  VENUE_CATEGORY_LABELS, 
  VENUE_CATEGORY_ICONS, 
  VENUE_CATEGORY_COLORS, 
  Venue, 
  VenueCategory 
} from "@/core/domain/venue";

// === Importaciones de Repositorios y Servicios exigidos por la Issue ===
import { VenueSearchService } from "@/lib/services/VenueSearchService";
import { LocalVenueRepository } from "@/lib/repositories/LocalVenueRepository";
import { OverpassVenueRepository } from "@/lib/repositories/OverpassVenueRepository";
import { NominatimGeocodingAdapter } from "@/core/infrastructure/NominatimGeocodingAdapter";

// === Inicialización e Inyección de Dependencias ===
const localRepo = new LocalVenueRepository();
const overpassRepo = new OverpassVenueRepository();
const geocodingAdapter = new NominatimGeocodingAdapter();

// El componente utiliza el servicio orquestador desacoplado
const venueSearchService = new VenueSearchService(localRepo, overpassRepo, geocodingAdapter);

interface VenueAutocompleteProps {
  onSelectVenue: (venue: Venue) => void;
  selectedCategories?: VenueCategory[];
}

export function VenueAutocomplete({ onSelectVenue, selectedCategories = [] }: VenueAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Venue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const cleanQuery = query.trim();
      
      if (cleanQuery.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Llamada unificada al servicio orquestador que usa searchByName por debajo
        const results = await venueSearchService.searchVenues(cleanQuery, selectedCategories);
        setSuggestions(results);
        setIsOpen(true);
      } catch (error) {
        console.error("Error al buscar locales:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCategories]);

  const handleSelect = (venue: Venue) => {
    onSelectVenue(venue);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full z-50">
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar restaurante, bar, discoteca o dirección..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="w-full pr-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <Card className="absolute w-full mt-1 max-h-[300px] shadow-lg border border-border bg-popover text-popover-foreground overflow-hidden">
          <ScrollArea className="h-[300px]">
            <div className="p-1 flex flex-col gap-0.5">
              {suggestions.map((venue) => (
                <Button
                  key={venue.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2.5 px-3 flex items-start gap-3 hover:bg-accent rounded-sm"
                  onClick={() => handleSelect(venue)}
                >
                  <span 
                    className="text-xl p-1.5 rounded-md bg-muted flex items-center justify-center shrink-0"
                    style={{ borderLeft: `4px solid ${VENUE_CATEGORY_COLORS[venue.category]}` }}
                  >
                    {VENUE_CATEGORY_ICONS[venue.category]}
                  </span>
                  
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate text-sm">{venue.name}</span>
                      {venue.isFeatured && (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-[10px] h-4 px-1.5 shrink-0 animate-pulse">
                          ⭐ Destacado
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{venue.address}</span>
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5">
                      {VENUE_CATEGORY_LABELS[venue.category]}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {isOpen && query.trim().length >= 2 && suggestions.length === 0 && !isLoading && (
        <Card className="absolute w-full mt-1 p-4 shadow-lg border border-border bg-popover text-muted-foreground text-center text-sm">
          No se encontraron locales ni direcciones.
        </Card>
      )}
    </div>
  );
}