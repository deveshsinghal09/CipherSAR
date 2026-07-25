import { describe, expect, it } from "vitest";
import { formatInr, localizeCurrencyText } from "./formatters";

describe("currency presentation", () => {
  it("formats amounts using the Indian rupee and lakh grouping", () => {
    expect(formatInr(114_700)).toBe("₹1,14,700");
    expect(formatInr(9_250.5)).toBe("₹9,250.5");
  });

  it("localizes currency references returned by the investigation API", () => {
    expect(
      localizeCurrencyText(
        "12 repeated sub-$10,000 deposits totalling USD 114,700",
      ),
    ).toBe("12 repeated sub-₹10,000 deposits totalling INR 114,700");

    expect(localizeCurrencyText("$114,700 deposited")).toBe(
      "₹1,14,700 deposited",
    );
  });
});
