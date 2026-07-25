import type {
  ExecutionPlan,
  ParsedQuery,
  PlanStep,
  ToolName,
} from "@ciphersar/shared";

type DraftStep = Omit<PlanStep, "id" | "status">;

const ALL_OPTIONAL_TOOLS: ToolName[] = [
  "filter_transactions",
  "lookup_customer",
  "selective_eda",
  "aggregate_threshold_activity",
  "engineer_structuring_features",
  "engineer_velocity_features",
  "detect_pattern",
  "detect_general_anomalies",
];

function step(
  tool: ToolName,
  reason: string,
  inputScope: string,
): DraftStep {
  return { tool, reason, inputScope };
}

export function buildExecutionPlan(parsed: ParsedQuery): ExecutionPlan {
  const steps: DraftStep[] = [
    step(
      "load_dataset",
      "Access the active transaction and customer records.",
      "active dataset",
    ),
  ];

  const hasFilters = Object.keys(parsed.filters).length > 0;
  if (hasFilters && parsed.intent !== "customer_investigation") {
    steps.push(
      step(
        "filter_transactions",
        "Reduce the working set before feature computation.",
        summarizeFilters(parsed),
      ),
    );
  }

  switch (parsed.intent) {
    case "customer_investigation":
      steps.push(
        step(
          "lookup_customer",
          "The request targets one entity, so scan only that customer's activity.",
          parsed.filters.customerId ?? "requested customer",
        ),
        step(
          "engineer_structuring_features",
          "Check threshold proximity, branch spread, and repeated cash behavior on demand.",
          "single customer",
        ),
        step(
          "engineer_velocity_features",
          "Check bursts and rapid movement without scanning unrelated customers.",
          "single customer",
        ),
        step(
          "detect_general_anomalies",
          "Combine customer-specific behavioral and robust statistical signals.",
          "single customer feature vector",
        ),
      );
      break;
    case "threshold_aggregation":
      steps.push(
        step(
          "aggregate_threshold_activity",
          "The question is answerable with direct grouping and thresholds; ML is unnecessary.",
          summarizeFilters(parsed),
        ),
      );
      break;
    case "pattern_search":
      if (parsed.pattern === "structuring" || parsed.pattern === "smurfing") {
        steps.push(
          step(
            "engineer_structuring_features",
            "Create only features relevant to repeated sub-threshold activity.",
            "filtered transactions",
          ),
        );
      } else {
        steps.push(
          step(
            "engineer_velocity_features",
            "Create timing, flow-through, and burst features for the requested pattern.",
            "filtered transactions",
          ),
        );
      }
      steps.push(
        step(
          "detect_pattern",
          "Run the hybrid detector specialized for the requested AML pattern.",
          parsed.pattern?.replaceAll("_", " ") ?? "requested pattern",
        ),
      );
      break;
    case "high_risk_ranking":
      steps.push(
        step(
          "engineer_structuring_features",
          "Include threshold and cash-fragmentation risk signals.",
          "filtered customer groups",
        ),
        step(
          "engineer_velocity_features",
          "Include burst, flow-through, and amount-deviation signals.",
          "filtered customer groups",
        ),
        step(
          "detect_general_anomalies",
          "Rank entities using the hybrid ensemble rather than one hard-coded rule.",
          "all engineered customer features",
        ),
      );
      break;
    case "broad_analysis":
      steps.push(
        step(
          "selective_eda",
          "A broad request needs baseline distributions and data-quality checks.",
          "active dataset",
        ),
        step(
          "engineer_structuring_features",
          "Assess common cash-fragmentation patterns.",
          "all customer groups",
        ),
        step(
          "engineer_velocity_features",
          "Assess timing, deviation, and rapid flow-through patterns.",
          "all customer groups",
        ),
        step(
          "detect_general_anomalies",
          "Use robust statistics plus AML rules across the broad population.",
          "all engineered customer features",
        ),
      );
      break;
  }

  steps.push(
    step(
      "score_risk",
      "Convert detector signals into a calibrated 0–100 advisory score.",
      "candidate entities",
    ),
    step(
      "explain_findings",
      "Tie every flag to observable facts, thresholds, and feature contributions.",
      "scored candidates",
    ),
    step(
      "recommend_action",
      "Map risk and evidence strength to monitor, review, or report.",
      "explained findings",
    ),
  );

  const used = new Set(steps.map((item) => item.tool));
  const skippedTools = ALL_OPTIONAL_TOOLS.filter((tool) => !used.has(tool)).map(
    (tool) => ({
      tool,
      reason: skippedReason(tool, parsed),
    }),
  );

  return {
    intent: parsed.intent,
    rationale: planRationale(parsed),
    steps: steps.map((item, index) => ({
      ...item,
      id: `step-${index + 1}`,
      status: "planned",
    })),
    skippedTools,
  };
}

function summarizeFilters(parsed: ParsedQuery): string {
  const { filters } = parsed;
  const parts: string[] = [];
  if (filters.lastDays) parts.push(`last ${filters.lastDays} days`);
  if (filters.customerId) parts.push(`customer ${filters.customerId}`);
  if (filters.amountBelow !== undefined) parts.push(`< $${filters.amountBelow}`);
  if (filters.amountAbove !== undefined) parts.push(`> $${filters.amountAbove}`);
  if (filters.minimumTransactions) parts.push(`${filters.minimumTransactions}+ tx`);
  if (filters.transactionType) parts.push(filters.transactionType);
  if (filters.segment) parts.push(filters.segment);
  if (filters.country) parts.push(filters.country);
  return parts.join(" · ") || "full requested scope";
}

function planRationale(parsed: ParsedQuery): string {
  switch (parsed.intent) {
    case "threshold_aggregation":
      return "Use deterministic aggregation only; anomaly detection and full EDA would add cost without answering the threshold question.";
    case "customer_investigation":
      return "Limit computation to one customer and calculate risk on demand from their own behavioral context.";
    case "pattern_search":
      return `Filter first and invoke only ${parsed.pattern?.replaceAll("_", " ") ?? "pattern"}-relevant feature engineering and detection.`;
    case "high_risk_ranking":
      return "Compute complementary AML and statistical signals, then rank the resulting entity risk scores.";
    case "broad_analysis":
      return "Establish the dataset baseline and quality first, then run the full hybrid detection ensemble.";
  }
}

function skippedReason(tool: ToolName, parsed: ParsedQuery): string {
  if (tool === "selective_eda") {
    return "Skipped because the query is targeted and does not require population-wide exploration.";
  }
  if (tool === "detect_general_anomalies") {
    return parsed.intent === "threshold_aggregation"
      ? "Skipped because deterministic aggregation fully answers the question."
      : "Skipped in favor of a pattern-specific detector.";
  }
  if (tool === "detect_pattern") {
    return "Skipped because the query does not name one AML pattern.";
  }
  if (tool === "aggregate_threshold_activity") {
    return "Skipped because the query asks for behavioral risk rather than a direct count threshold.";
  }
  if (tool === "lookup_customer") {
    return "Skipped because no single customer was requested.";
  }
  if (tool === "filter_transactions") {
    return "Skipped because no pre-analysis filters were extracted.";
  }
  return `Skipped because ${tool.replaceAll("_", " ")} is not relevant to this intent.`;
}

