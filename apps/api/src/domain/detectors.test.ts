import { describe, expect, it } from "vitest";
import { createSampleDataset } from "../data/sample-data";
import { engineerCustomerFeatures } from "./features";
import { detectRequestedPattern, scoreCandidates, toFinding } from "./detectors";

describe("hybrid AML detectors", () => {
  const dataset = createSampleDataset(new Date("2026-07-25T00:00:00.000Z"));
  const features = engineerCustomerFeatures(dataset.transactions);

  it("detects the synthetic structuring customer with explainable evidence", () => {
    const candidate = detectRequestedPattern(features, "structuring").find(
      (item) => item.customerId === "CUS-4521",
    );

    expect(candidate).toBeDefined();
    const finding = toFinding(scoreCandidates([candidate!])[0]!);
    expect(finding.riskLevel).toBe("high");
    expect(finding.evidence.join(" ")).toContain("sub-₹10,000");
    expect(finding.contributions.length).toBeGreaterThanOrEqual(3);
  });

  it("detects a smurfing pattern across branches", () => {
    const candidate = detectRequestedPattern(features, "smurfing").find(
      (item) => item.customerId === "CUS-3108",
    );
    expect(candidate?.evidence.join(" ")).toContain("branches");
  });

  it("detects layered inbound and outbound wires", () => {
    const candidate = detectRequestedPattern(features, "layering").find(
      (item) => item.customerId === "CUS-8842",
    );
    expect(candidate?.evidence.join(" ")).toContain("inbound");
  });
});
