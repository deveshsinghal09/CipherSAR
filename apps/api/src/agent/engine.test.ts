import { describe, expect, it } from "vitest";
import { InvestigationAgent } from "./engine";

describe("InvestigationAgent", () => {
  const agent = new InvestigationAgent();
  const now = new Date("2026-07-25T00:00:00.000Z");

  it("runs a targeted structuring plan without EDA", async () => {
    const result = await agent.analyze(
      { query: "Find structuring patterns in the last 30 days" },
      now,
    );

    expect(result.eda).toBeUndefined();
    expect(result.plan.steps.some((step) => step.tool === "selective_eda")).toBe(
      false,
    );
    expect(result.findings.some((item) => item.customerId === "CUS-4521")).toBe(
      true,
    );
    expect(result.plan.steps.every((step) => step.status === "completed")).toBe(
      true,
    );
    expect(result.decisionSummary.userRequest).toBe(
      "Find structuring patterns in the last 30 days",
    );
    expect(result.decisionSummary.selectedTools).toEqual(
      result.plan.steps.map((step) => step.tool),
    );
    expect(result.decisionSummary.appliedFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "lastDays", value: "30" }),
      ]),
    );
    expect(result.findings[0]?.explanation).toContain("For the request");
    expect(result.findings[0]?.topTransactions.length).toBeGreaterThan(0);
  });

  it("answers direct threshold queries without anomaly detection", async () => {
    const result = await agent.analyze(
      { query: "Which customers made 10+ transactions under $10,000?" },
      now,
    );

    expect(
      result.plan.steps.some(
        (step) => step.tool === "aggregate_threshold_activity",
      ),
    ).toBe(true);
    expect(
      result.plan.steps.some(
        (step) => step.tool === "detect_general_anomalies",
      ),
    ).toBe(false);
  });

  it("investigates one customer on demand", async () => {
    const result = await agent.analyze(
      { query: "Is customer ID 4521 suspicious?" },
      now,
    );

    expect(result.metrics.analyzedCustomers).toBe(1);
    expect(result.findings[0]?.customerId).toBe("CUS-4521");
  });
});
