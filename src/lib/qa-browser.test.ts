import { describe, it, expect } from "vitest";
import { findSystemChrome } from "./qa-browser.js";

describe("qa-browser", () => {
  it("finds Chrome on this Mac", () => {
    const chrome = findSystemChrome();
    expect(chrome).toBeTruthy();
  });
});
