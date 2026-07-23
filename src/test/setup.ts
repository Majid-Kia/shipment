import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/mocks/server";
import { shipmentRepository } from "@/mocks/database";
import { resetRequestCounter } from "@/mocks/handlers";
import { resetMutationScenarios } from "@/mocks/scenarios";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
  writable: true,
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  shipmentRepository.reset();
  resetMutationScenarios();
  resetRequestCounter();
});

afterAll(() => {
  server.close();
});
