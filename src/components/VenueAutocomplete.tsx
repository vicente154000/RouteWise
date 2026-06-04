"use client";


import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";


import { Loader2, MapPin, Store, Search, Star } from "lucide-react";
import {
  searchSuggestions,
  type Suggestion,
} from "@/core/infrastructure/geocoding";
import { searchLocalVenues } from "@/core/infrastructure/venues-data";
import { searchOverpassVenues } from "@/core/infrastructure/overpass";
import type { Venue, VenueCategory } from "@/core/domain/venue";
import {
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
} from "@/core/domain/venue";

import CategorySelector from "./CategorySelector"; // <-- IMPORTANTE: Añadir importación

interface VenueSuggestion {
  type: "local" | "overpass" | "nominatim";
  venue?: Venue;
  suggestion?: Suggestion;
  displayName: string;
}

interface VenueAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (venue: Venue) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  selectedCategories: VenueCategory[];
  setSelectedCategories: (categories: VenueCategory[]) => void;
  onlyFeatured: boolean; // <-- CAMBIO: Añadido[cite: 1]

  setOnlyFeatured: (featured: boolean) => void; // <-- CAMBIO: Añadido[cite: 1]



  disabled?: boolean;
}





export default function VenueAutocomplete({
  value,
  onChange,
  onSelect,
  onKeyDown,
  selectedCategories: categoryFilter,
  setSelectedCategories,
  onlyFeatured, // <-- CAMBIO: Añadido[cite: 1]
  setOnlyFeatured, // <-- CAMBIO: Añadido[cite: 1]
    disabled = false,
}: VenueAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // <-- CAMBIO: Actualizar el placeholder del input según filtros activos[cite: 1]
  const placeholderText = useMemo(() => {
    if (categoryFilter.length === 3) {
      return onlyFeatured
        ? "Buscar destacados..."
        : "Busca un restaurante, bar o discoteca...";
    }
    const labels = categoryFilter.map(
      (c) => VENUE_CATEGORY_LABELS[c].toLowerCase() + "s",
    );
    const baseText = labels.join(" o ");
    return onlyFeatured
      ? `Buscar ${baseText} destacados...`
      : `Buscar ${baseText}...`;

    }, [categoryFilter, onlyFeatured]);

  const handleSelect = useCallback(
    (item: VenueSuggestion) => {
      onChange(item.displayName);

      if (item.type === "nominatim" && item.suggestion) {
        const venue: Venue = {
          id: crypto.randomUUID(),
          name: item.suggestion.displayName.split(",")[0].trim(),
          address: item.suggestion.displayName,
          coordinates: item.suggestion.coordinates,
    
          category: categoryFilter[0] || "restaurant", // Usa una de las categorías seleccionadas por el usuario
          isFeatured: false,
        };
        onSelect(venue);
      } else if (item.venue) {
        onSelect(item.venue);
      }

      setShowDropdown(false);
      setSuggestions([]);
    },


    [onChange, onSelect, categoryFilter],
  );

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const results: VenueSuggestion[] = [];

      try {




        // 1. Capa Local: Filtrado combinado simultáneo[cite: 1]
        const localVenues = searchLocalVenues(trimmed);
        localVenues.forEach((v: Venue) => {
          const matchesCategory = categoryFilter.includes(v.category);
          const matchesFeatured = !onlyFeatured || v.isFeatured;

          if (matchesCategory && matchesFeatured) {
            results.push({
              type: "local",
              venue: v,
              displayName: v.name,
            });


          }
        });



        // 2. Capa Overpass (OSM): Filtrado combinado simultáneo[cite: 1]
        if (results.length < 5) {
          const overpassVenues = await searchOverpassVenues(trimmed);
          overpassVenues.forEach((v) => {
            const isDuplicate = results.some(
              (r) => r.displayName.toLowerCase() === v.name.toLowerCase(),
            );
            const matchesCategory = categoryFilter.includes(v.category);
            const matchesFeatured = !onlyFeatured || v.isFeatured;


if (!isDuplicate && matchesCategory && matchesFeatured) {
              results.push({
                type: "overpass",
                venue: v,
                displayName: v.name,
              });
            }
          });
        }

        // 3. Capa Nominatim (Direcciones): Se ignora si se busca exclusivamente destacados[cite: 1]


        if (results.length === 0 && trimmed.length >= 3 && !onlyFeatured) {
          const nominatimResults = await searchSuggestions(trimmed);
          nominatimResults.forEach((s) => {
            results.push({
              type: "nominatim",
              suggestion: s,
              displayName: s.displayName.split(",")[0].trim(),
            });
          });
        }
      } catch {




        // Si falla, el arreglo se queda vacío de forma segura
      } finally {
        setSuggestions(results.slice(0, 8));

        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };

  }, [value, categoryFilter, onlyFeatured]); // <-- CAMBIO: Escuchar de forma combinada[cite: 1]

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDownInternal = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || suggestions.length === 0) {
        onKeyDown(e);
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelect(suggestions[selectedIndex]);
          } else {
            onKeyDown(e);
          }
          break;
        case "Escape":
          setShowDropdown(false);
          break;
        default:
          onKeyDown(e);
      }
    },
    [showDropdown, suggestions, selectedIndex, onKeyDown, handleSelect],
  );

  const getSourceLabel = (type: VenueSuggestion["type"]): string => {
    switch (type) {
      case "local":
        return "Catálogo local";
      case "overpass":
        return "OpenStreetMap";
      case "nominatim":
        return "Dirección";
    }
  };

  const getSourceIcon = (type: VenueSuggestion["type"]) => {
    switch (type) {
      case "local":
        return <Store className="h-3 w-3" />;
      case "overpass":
        return <Search className="h-3 w-3" />;
      case "nominatim":
        return <MapPin className="h-3 w-3" />;
    }
  };

  return (
    <div className="w-full space-y-2.5 flex-1">
      {/* <-- CAMBIO: Integrar el CategorySelector y el toggle "Solo destacados"[cite: 1] */}
      <div className="bg-muted/30 p-2 rounded-lg border border-border/70 space-y-2">
        <CategorySelector
          selected={categoryFilter}
          onChange={setSelectedCategories}
        />

        <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyFeatured}
              onChange={(e) => setOnlyFeatured(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5 accent-primary"
            />
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              Solo destacados
            </span>
          </label>
        </div>
      </div>

      <div className="relative w-full">
        <Input
          ref={inputRef}
          placeholder={placeholderText} // <-- CAMBIO: Usar el hook de texto variable[cite: 1]
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!e.target.value) setShowDropdown(false);
          }}
          onKeyDown={handleKeyDownInternal}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          disabled={disabled}
          className="w-full pr-8"

/>

        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>

)}

        {/* Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-xl max-h-72 overflow-y-auto flex flex-col"
          >
            {/* <-- CAMBIO: Mostrar los badges de los filtros activos encima de los resultados[cite: 1] */}
            <div className="px-3 py-1.5 bg-muted/50 border-b border-border flex flex-wrap gap-1 items-center">
              <span className="text-[10px] font-medium text-muted-foreground mr-1">
                Filtros activos:
              </span>
              {onlyFeatured && (
                <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-semibold shadow-sm">
                  ★ Destacados
                </span>
              )}
              {categoryFilter.length < 3 ? (
                categoryFilter.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium"
                  >
                    {VENUE_CATEGORY_LABELS[c]}
                  </span>
                ))
              ) : (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                  Todas las categorías
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {suggestions.map((item, index) => (
                <button
                  key={`${item.type}-${index}`}
                  className={`w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    index === selectedIndex ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="mt-0.5 shrink-0 text-base leading-none">
                    {item.type === "nominatim"
                      ? "📍"
                      : item.venue
                        ? VENUE_CATEGORY_ICONS[item.venue.category]
                        : "📍"}

                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-foreground font-medium">
                      {item.type === "nominatim" && item.suggestion
                        ? item.suggestion.displayName.split(",")[0]
                        : item.displayName}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate mt-0.5">
                      {item.type === "nominatim" && item.suggestion
                        ? item.suggestion.displayName
                        : item.venue
                          ? `${item.venue.address} · ${VENUE_CATEGORY_LABELS[item.venue.category]}${item.venue.isFeatured ? " · ⭐ Destacado" : ""}`
                          : ""}
                    </span>

                  </div>

                  <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 mt-0.5">
                    {getSourceIcon(item.type)}
                    {getSourceLabel(item.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
