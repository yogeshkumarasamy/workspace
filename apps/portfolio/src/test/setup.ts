import "@testing-library/jest-dom/vitest";

// Ensure localStorage and sessionStorage exist in test environment
function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

if (typeof window !== "undefined") {
  if (!window.localStorage) {
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      writable: true,
    });
  }
  if (!window.sessionStorage) {
    Object.defineProperty(window, "sessionStorage", {
      value: createStorageMock(),
      writable: true,
    });
  }
}

// Ensure globalThis localStorage
if (typeof globalThis !== "undefined") {
  if (!globalThis.localStorage) {
    (globalThis as unknown as { localStorage: unknown }).localStorage =
      typeof window !== "undefined" && window.localStorage
        ? window.localStorage
        : createStorageMock();
  }
  if (!globalThis.sessionStorage) {
    (globalThis as unknown as { sessionStorage: unknown }).sessionStorage =
      typeof window !== "undefined" && window.sessionStorage
        ? window.sessionStorage
        : createStorageMock();
  }
}

// Ensure matchMedia exists in test environment
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
