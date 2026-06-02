"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Current schema version for localStorage data.
 * Increment when breaking changes are made to stored data shapes.
 *
 * - v1: Stop type (old delivery route optimizer)
 * - v2: Venue type (new leisure/gastronomy app)
 */
const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = "routewise-schema-version";

/**
 * Keys that are managed by schema versioning.
 * These will be cleared if the schema version doesn't match.
 */
const MANAGED_KEYS = [
  "routewise-stops",
  "routewise-optimized",
  "routewise-geometry",
  "routewise-isOptimized",
];

/**
 * Check if the stored schema version matches the current one.
 * If not, clear all managed keys and set the new version.
 */
function ensureSchemaVersion(): void {
  try {
    const storedVersion = window.localStorage.getItem(SCHEMA_VERSION_KEY);
    if (storedVersion !== String(SCHEMA_VERSION)) {
      // Schema mismatch — clear old data
      MANAGED_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
      });
      window.localStorage.setItem(
        SCHEMA_VERSION_KEY,
        String(SCHEMA_VERSION)
      );
    }
  } catch {
    // localStorage not available (SSR), ignore
  }
}

/**
 * Hook that syncs state with localStorage.
 * Falls back to initialValue if localStorage is not available (SSR).
 * Automatically handles schema versioning for managed keys.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      // Ensure schema version is up-to-date before reading
      ensureSchemaVersion();

      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Write to localStorage whenever value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.warn(`Error writing localStorage key "${key}":`, error);
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
