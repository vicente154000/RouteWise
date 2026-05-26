"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Store, Search } from "lucide-react";
import { searchSuggestions, type Suggestion } from "@/lib/geocoding";
import { searchLocalVenues } from "@/lib/venues-data";
import { searchOverpassVenues } from "@/lib/overpass";
import type { Venue, VenueCategory } from "@/lib/venue";
import {
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_LABELS,
} from "@/lib/venue";

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
  categoryFilter?: VenueCategory[];
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Autocomplete component that searches venues from three sources:
 * 1. Local catalog (offline, instant)
 * 2. Overpass API (OSM venues by name)
 * 3. Nominatim (address fallback)
 */
export default function VenueAutocomplete({
  value,
  onChange,
  onSelect,
  onKeyDown,
  categoryFilter,
  disabled = false,
  placeholder = "Busca un restaurante, bar o discoteca...",
}: VenueAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (item: VenueSuggestion) => {
      onChange(item.displayName);

      if (item.type === "nominatim" && item.suggestion) {
        // Convert Nominatim suggestion to Venue
        const venue: Venue = {
          id: crypto.randomUUID(),
          name: item.suggestion.displayName.split(",")[0].trim(),
          address: item.suggestion.displayName,
          coordinates: item.suggestion.coordinates,
          category: "restaurant",
          isFeatured: false,
        };
        onSelect(venue);
      } else if (item.venue) {
        onSelect(item.venue);
      }

      setShowDropdown(false);
      setSuggestions([]);
    },
    [onChange, onSelect]
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
        // 1. Search local catalog first (instant, offline)
        const localVenues = searchLocalVenues(trimmed);
        localVenues.forEach((v: Venue) => {
          results.push({
            type: "local",
            venue: v,
            displayName: v.name,
          });
        });

        // 2. Search Overpass API (OSM venues)
        if (results.length < 5) {
          const overpassVenues = await searchOverpassVenues(trimmed);
          overpassVenues.forEach((v) => {
            // Avoid duplicates with local results
            if (!results.some((r) => r.displayName === v.name)) {
              results.push({
                type: "overpass",
                venue: v,
                displayName: v.name,
              });
            }
          });
        }

        // 3. Fallback to Nominatim for address search
        if (results.length === 0 && trimmed.length >= 3) {
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
        // If all fail, show empty
      } finally {
        // Apply category filter if set
        const filtered = categoryFilter && categoryFilter.length > 0 && categoryFilter.length < 3
          ? results.filter((r) => {
              if (r.type === "nominatim") return true; // Nominatim results pass through
              return r.venue && categoryFilter.includes(r.venue.category);
            })
          : results;

        setSuggestions(filtered.slice(0, 8));
        setShowDropdown(filtered.length > 0);
        setSelectedIndex(-1);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, categoryFilter]);

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
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
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
    [showDropdown, suggestions, selectedIndex, onKeyDown, handleSelect]
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
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        placeholder={placeholder}
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
        className="flex-1 pr-8"
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-xl max-h-72 overflow-y-auto"
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.type}-${index}`}
              className={`w-full flex items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* Category icon or map pin */}
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

              {/* Source badge */}
              <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 mt-0.5">
                {getSourceIcon(item.type)}
                {getSourceLabel(item.type)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
