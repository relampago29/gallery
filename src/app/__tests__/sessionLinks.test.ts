import { describe, it, expect } from "vitest";
import { clampHours } from "@/lib/sessions/share";

describe("clampHours", () => {
  it("keeps regular values untouched", () => {
    expect(clampHours(24)).toBe(24);
    expect(clampHours(72)).toBe(72);
  });

  it("never returns below 1 hour", () => {
    expect(clampHours(0)).toBe(1);
    expect(clampHours(-10)).toBe(1);
  });

  it("caps values above the 168h (7d) window", () => {
    expect(clampHours(200)).toBe(168);
    expect(clampHours(999)).toBe(168);
  });

  it("defaults to 48h when the input is invalid", () => {
    expect(clampHours(Number.NaN)).toBe(48);
    expect(clampHours(Number.POSITIVE_INFINITY)).toBe(48);
  });
});
