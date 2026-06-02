import "@testing-library/jest-dom";

// global mocks for browser APIs used in components
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  },
});
