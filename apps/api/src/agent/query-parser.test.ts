import { describe, expect, it } from "vitest";
import { parseQuery } from "./query-parser";

const NOW = new Date("2026-07-25T00:00:00.000Z");

describe("parseQuery", () => {
  it("extracts a targeted structuring search and time filter", () => {
    const result = parseQuery("Find structuring patterns in the last 30 days", NOW);

    expect(result.intent).toBe("pattern_search");
    expect(result.pattern).toBe("structuring");
    expect(result.filters.lastDays).toBe(30);
    expect(result.filters.dateTo).toBe(NOW.toISOString());
  });

  it("routes direct count questions to deterministic aggregation", () => {
    const result = parseQuery(
      "Which customers made 10+ transactions under $10,000?",
      NOW,
    );

    expect(result.intent).toBe("threshold_aggregation");
    expect(result.filters.minimumTransactions).toBe(10);
    expect(result.filters.amountBelow).toBe(10_000);
  });

  it("extracts a single customer lookup", () => {
    const result = parseQuery("Is customer ID 4521 suspicious?", NOW);

    expect(result.intent).toBe("customer_investigation");
    expect(result.filters.customerId).toBe("4521");
  });
});

