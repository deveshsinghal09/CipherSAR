import { describe, expect, it } from "vitest";
import { buildExecutionPlan } from "./planner";
import { parseQuery } from "./query-parser";

describe("buildExecutionPlan", () => {
  it("skips EDA and general ML for a direct threshold query", () => {
    const plan = buildExecutionPlan(
      parseQuery("Which customers made 10+ transactions under $10,000?"),
    );
    const tools = plan.steps.map((step) => step.tool);

    expect(tools).toContain("aggregate_threshold_activity");
    expect(tools).not.toContain("selective_eda");
    expect(tools).not.toContain("detect_general_anomalies");
  });

  it("uses structuring-only features for a targeted pattern query", () => {
    const plan = buildExecutionPlan(
      parseQuery("Find structuring patterns in the last 30 days"),
    );
    const tools = plan.steps.map((step) => step.tool);

    expect(tools).toContain("engineer_structuring_features");
    expect(tools).toContain("detect_pattern");
    expect(tools).not.toContain("selective_eda");
    expect(tools).not.toContain("engineer_velocity_features");
  });

  it("uses lookup and on-demand features for one customer", () => {
    const plan = buildExecutionPlan(parseQuery("Is customer ID 4521 suspicious?"));
    const tools = plan.steps.map((step) => step.tool);

    expect(tools).toContain("lookup_customer");
    expect(tools).not.toContain("selective_eda");
  });

  it("filters a targeted customer subset before feature engineering", () => {
    const plan = buildExecutionPlan(
      parseQuery(
        "Is customer ID 4521 suspicious in the last 7 days with cash deposits?",
      ),
    );
    const tools = plan.steps.map((step) => step.tool);

    expect(tools.indexOf("lookup_customer")).toBeLessThan(
      tools.indexOf("filter_transactions"),
    );
    expect(tools.indexOf("filter_transactions")).toBeLessThan(
      tools.indexOf("engineer_structuring_features"),
    );
  });
});
