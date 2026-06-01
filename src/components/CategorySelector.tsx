"use client";

import { cn } from "@/lib/utils";
import type { VenueCategory } from "@/core/domain/venue";
import {
  VENUE_CATEGORY_LABELS,
  VENUE_CATEGORY_ICONS,
  VENUE_CATEGORY_COLORS,
} from "@/core/domain/venue";

interface CategorySelectorProps {
  selected: VenueCategory[];
  onChange: (categories: VenueCategory[]) => void;
}

const ALL_CATEGORIES: VenueCategory[] = ["restaurant", "bar", "nightclub"];

/**
 * Category selector for filtering venues by type.
 * Displays toggle buttons for restaurant, bar, and nightclub.
 * At least one category must always be selected.
 */
export default function CategorySelector({
  selected,
  onChange,
}: CategorySelectorProps) {
  const toggleCategory = (category: VenueCategory) => {
    // Prevent deselecting all categories
    if (selected.length === 1 && selected.includes(category)) return;

    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  const selectAll = () => onChange([...ALL_CATEGORIES]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Categorías
        </span>
        {selected.length < ALL_CATEGORIES.length && (
          <button
            type="button"
            onClick={selectAll}
            className="text-[10px] text-primary hover:underline"
          >
            Seleccionar todas
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        {ALL_CATEGORIES.map((category) => {
          const isActive = selected.includes(category);
          const color = VENUE_CATEGORY_COLORS[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border",
                isActive
                  ? "text-white border-transparent shadow-sm"
                  : "text-muted-foreground bg-muted/50 border-border hover:bg-muted hover:text-foreground",
              )}
              style={
                isActive
                  ? { backgroundColor: color, borderColor: color }
                  : undefined
              }
              title={
                isActive
                  ? `Quitar ${VENUE_CATEGORY_LABELS[category]}`
                  : `Añadir ${VENUE_CATEGORY_LABELS[category]}`
              }
            >
              <span className="text-sm">{VENUE_CATEGORY_ICONS[category]}</span>
              <span className="hidden sm:inline">
                {VENUE_CATEGORY_LABELS[category]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
