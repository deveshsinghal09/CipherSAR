import { describe, expect, it } from "vitest";
import { createSampleDataset } from "../data/sample-data";
import { engineerCustomerFeatures } from "./features";

describe("query-aware AML feature engineering", () => {
  const dataset = createSampleDataset(
    new Date("2026-07-25T00:00:00.000Z"),
  );
  const features = engineerCustomerFeatures(dataset.transactions);

  it("creates rolling-window, deviation, velocity, and rapid cash-out features", () => {
    const structuring = features.find(
      (feature) => feature.customerId === "CUS-4521",
    );

    expect(structuring).toBeDefined();
    expect(structuring!.rolling24HourCount).toBeGreaterThan(0);
    expect(structuring!.rolling7DayAmount).toBeGreaterThan(0);
    expect(structuring!.amountDeviationRatio).toBeGreaterThan(0);
    expect(structuring).toHaveProperty("rapidCashOutRatio");
    expect(structuring).toHaveProperty("medianAmountRobustZ");
  });
});
