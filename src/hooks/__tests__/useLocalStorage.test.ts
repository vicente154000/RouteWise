// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  localStorage.setItem("routewise-schema-version", "2");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLocalStorage", () => {
  it("should return the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("routewise-stops", []));

    expect(result.current[0]).toEqual([]);
  });

  it("should read an existing value from localStorage on mount", () => {
    const stored = [{ id: "1", name: "Test" }];
    localStorage.setItem("routewise-test", JSON.stringify(stored));

    const { result } = renderHook(() => useLocalStorage("routewise-test", []));

    expect(result.current[0]).toEqual(stored);
  });

  it("should update the value optimistically and debounce the localStorage write", async () => {
    vi.useFakeTimers();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { result } = renderHook(() =>
      useLocalStorage("routewise-test", "initial", 500),
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");

    expect(setItemSpy).not.toHaveBeenCalledWith(
      "routewise-test",
      expect.any(String),
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      "routewise-test",
      JSON.stringify("updated"),
    );

    setItemSpy.mockRestore();
  });

  it("should support functional updates", () => {
    const { result } = renderHook(() =>
      useLocalStorage("routewise-count", 0, 0),
    );

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it("should flush pending writes on unmount", () => {
    vi.useFakeTimers();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { result, unmount } = renderHook(() =>
      useLocalStorage("routewise-flush", "before", 1000),
    );

    act(() => {
      result.current[1]("after");
    });

    unmount();

    expect(setItemSpy).toHaveBeenCalledWith(
      "routewise-flush",
      JSON.stringify("after"),
    );

    setItemSpy.mockRestore();
  });

  it("should handle localStorage errors gracefully", () => {
    vi.useFakeTimers();

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLocalStorage("routewise-error", "value", 0),
    );

    // Mock setItem to throw AFTER the hook has mounted (so schema version is set)
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });

    act(() => {
      result.current[1]("new-value");
    });

    // Advance timers to trigger the debounced write
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("should handle JSON parse errors on read gracefully", () => {
    localStorage.setItem("routewise-bad", "{invalid}");

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLocalStorage("routewise-bad", "fallback"),
    );

    expect(result.current[0]).toBe("fallback");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should clear managed keys on schema version mismatch", () => {
    localStorage.setItem("routewise-schema-version", "1");
    localStorage.setItem("routewise-stops", JSON.stringify(["old"]));

    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    renderHook(() => useLocalStorage("routewise-stops", []));

    expect(removeItemSpy).toHaveBeenCalledWith("routewise-stops");
    expect(setItemSpy).toHaveBeenCalledWith("routewise-schema-version", "2");

    removeItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("should debounce rapid successive updates", () => {
    vi.useFakeTimers();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { result } = renderHook(() =>
      useLocalStorage("routewise-rapid", 0, 300),
    );

    act(() => {
      result.current[1](1);
    });
    act(() => {
      result.current[1](2);
    });
    act(() => {
      result.current[1](3);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(
      "routewise-rapid",
      JSON.stringify(3),
    );

    setItemSpy.mockRestore();
  });
});
