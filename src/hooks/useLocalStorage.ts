"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
 * Default debounce delay for localStorage writes (in milliseconds).
 */
const DEFAULT_DEBOUNCE_MS = 500;

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
      window.localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
    }
  } catch {
    // localStorage not available (SSR), ignore
  }
}

/**
 * Write a value to localStorage, catching and warning on errors.
 */
function writeToStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
}

/**
 * Hook that syncs state with localStorage with debounced writes.
 *
 * - React state updates **immediately** for a responsive UI.
 * - The actual `localStorage.setItem` call is debounced to avoid
 *   layout thrashing during rapid changes (e.g. typing a deadline,
 *   adding multiple stops in quick succession).
 * - The pending write is flushed on unmount so no data is lost.
 *
 * Falls back to initialValue if localStorage is not available (SSR).
 * Automatically handles schema versioning for managed keys.
 *
 * @param key - localStorage key
 * @param initialValue - fallback value when nothing is stored
 * @param debounceMs - debounce delay in ms (default: 500)
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Keep the latest value in a ref so the debounced callback can read it
  const latestValueRef = useRef<T>(initialValue);

  // Track the pending timeout for debouncing
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      // Ensure schema version is up-to-date before reading
      ensureSchemaVersion();

      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
        latestValueRef.current = parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Flush any pending debounced write on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current);
        // Flush the last known value to localStorage
        writeToStorage(key, latestValueRef.current);
      }
    };
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        latestValueRef.current = newValue;

        // Debounce the localStorage write
        if (debounceTimeoutRef.current !== null) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          writeToStorage(key, latestValueRef.current);
          debounceTimeoutRef.current = null;
        }, debounceMs);

        return newValue;
      });
    },
    [key, debounceMs],
  );

  return [storedValue, setValue];
}
