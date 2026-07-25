import { describe, expect, it } from "vitest";
import { createSampleDataset } from "../data/sample-data";
import { engineerCustomerFeatures } from "../domain/features";
import { getModelMetadata, scoreCustomerWithModel } from "./model";

describe("portable AML model", () => {
  it("exposes validated training provenance and metrics", () => {
    const metadata = getModelMetadata();
    expect(metadata.type).toBe("balanced random forest");
    expect(metadata.datasetTransactions).toBe(1_323_234);
    expect(metadata.metrics.prAuc).toBeGreaterThan(0.85);
  });

  it("does not apply the transfer model to incompatible retail histories", () => {
    const sample = createSampleDataset(new Date("2026-07-25T00:00:00.000Z"));
    const feature = engineerCustomerFeatures(sample.transactions).find(
      (item) => item.customerId === "CUS-4521",
    );
    expect(feature).toBeDefined();
    expect(scoreCustomerWithModel(feature!).applicable).toBe(false);
    expect(scoreCustomerWithModel(feature!).flagged).toBe(false);
  });
});
