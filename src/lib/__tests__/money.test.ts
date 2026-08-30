import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, formatCents, sumCents } from "@/lib/money";

describe("dollarsToCents", () => {
  it("converts dollars to whole cents", () => {
    expect(dollarsToCents(12.5)).toBe(1250);
  });

  it("rounds floating-point noise instead of truncating", () => {
    // 19.99 * 100 === 1998.9999999999998 in IEEE 754
    expect(dollarsToCents(19.99)).toBe(1999);
  });
});

describe("centsToDollars", () => {
  it("converts cents back to dollars", () => {
    expect(centsToDollars(1250)).toBe(12.5);
  });
});

describe("formatCents", () => {
  it("formats cents as a USD currency string", () => {
    expect(formatCents(150000)).toBe("$1,500.00");
  });
});

describe("sumCents", () => {
  it("sums a list of cent amounts", () => {
    expect(sumCents([100, 250, 75])).toBe(425);
  });

  it("returns 0 for an empty list", () => {
    expect(sumCents([])).toBe(0);
  });
});
