import { randomUUID } from "node:crypto";
import type {
  AgentDecisionSummary,
  AnalyzeRequest,
  InvestigationResponse,
  ParsedQuery,
  PlanStep,
  QueryFilters,
} from "@ciphersar/shared";
import { DEFAULT_AML_POLICY } from "@ciphersar/shared";
import { createSampleDataset } from "../data/sample-data";
import { buildExecutionPlan } from "./planner";
import { parseQuery } from "./query-parser";
import { toolRegistry, type AgentContext } from "./tools";
import { getModelMetadata } from "../ml/model";

export class InvestigationAgent {
  async analyze(
    request: AnalyzeRequest,
    now = new Date(),
  ): Promise<InvestigationResponse> {
    const startedAt = performance.now();
    const sample = createSampleDataset(now);
    const sourceTransactions = request.transactions ?? sample.transactions;
    const sourceCustomers = request.customers ?? sample.customers;
    const parsedQuery = parseQuery(request.query, now);
    const plan = buildExecutionPlan(parsedQuery);

    const context: AgentContext = {
      parsed: parsedQuery,
      policy: request.policy ?? DEFAULT_AML_POLICY,
      sourceTransactions,
      sourceCustomers,
      transactions: [],
      customers: [],
      features: [],
      candidates: [],
      scoredCandidates: [],
      findings: [],
    };

    for (const planStep of plan.steps) {
      await this.executeStep(planStep, context);
    }

    const executionTimeMs = Math.round(performance.now() - startedAt);
    const analyzedCustomers = new Set(
      context.transactions.map((item) => item.customerId),
    ).size;
    const highRiskEntities = context.findings.filter(
      (item) => item.riskLevel === "high",
    ).length;

    return {
      investigationId: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      generatedAt: now.toISOString(),
      parsedQuery,
      plan,
      decisionSummary: createDecisionSummary(
        parsedQuery,
        plan,
        sourceTransactions.length,
        sourceCustomers.length,
        context.transactions.length,
        analyzedCustomers,
      ),
      metrics: {
        inputTransactions: sourceTransactions.length,
        analyzedTransactions: context.transactions.length,
        analyzedCustomers,
        flaggedEntities: context.findings.length,
        highRiskEntities,
        executionTimeMs,
      },
      ...(context.eda ? { eda: context.eda } : {}),
      findings: context.findings,
      summary: createSummary(context.findings.length, highRiskEntities, parsedQuery.intent),
      safeguards: {
        humanReviewRequired: true,
        modelRole: "decision_support",
        limitations: [
          "Synthetic demo data and configurable thresholds are used in this build.",
          "A flag is not proof of money laundering and must be reviewed by an authorized analyst.",
          "Production deployment requires institution-specific calibration, validation, access control, and model governance.",
        ],
      },
      policy: context.policy,
      model: getModelMetadata(),
    };
  }

  private async executeStep(
    planStep: PlanStep,
    context: AgentContext,
  ): Promise<void> {
    const executor = toolRegistry[planStep.tool];
    planStep.status = "running";
    const start = performance.now();
    try {
      const result = await executor(context);
      planStep.status = "completed";
      planStep.durationMs = Math.max(1, Math.round(performance.now() - start));
      planStep.outputSummary = result.outputSummary;
    } catch (error) {
      planStep.status = "failed";
      planStep.durationMs = Math.max(1, Math.round(performance.now() - start));
      planStep.outputSummary =
        error instanceof Error ? error.message : "Unknown tool error";
      throw error;
    }
  }
}

function createDecisionSummary(
  parsedQuery: ParsedQuery,
  plan: InvestigationResponse["plan"],
  inputTransactions: number,
  inputCustomers: number,
  analyzedTransactions: number,
  analyzedCustomers: number,
): AgentDecisionSummary {
  const appliedFilters = Object.entries(parsedQuery.filters)
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({
      field: field as keyof QueryFilters,
      value: formatFilterValue(value),
    }));
  const reductionPercent =
    inputTransactions > 0
      ? Math.round(
          (1 - analyzedTransactions / inputTransactions) * 10_000,
        ) / 100
      : 0;

  return {
    userRequest: parsedQuery.raw,
    detectedIntent: parsedQuery.intent,
    ...(parsedQuery.pattern ? { targetPattern: parsedQuery.pattern } : {}),
    ...(parsedQuery.filters.customerId
      ? { targetEntity: parsedQuery.filters.customerId }
      : {}),
    appliedFilters,
    selectedTools: plan.steps.map((step) => step.tool),
    skippedToolCount: plan.skippedTools.length,
    inputScope: {
      transactions: inputTransactions,
      customers: inputCustomers,
    },
    analyzedScope: {
      transactions: analyzedTransactions,
      customers: analyzedCustomers,
      reductionPercent: Math.max(0, reductionPercent),
    },
    strategy: plan.rationale,
  };
}

function formatFilterValue(value: QueryFilters[keyof QueryFilters]): string {
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value).replaceAll("_", " ");
}

function createSummary(
  findingCount: number,
  highRiskCount: number,
  intent: string,
): string {
  if (findingCount === 0) {
    return `The ${intent.replaceAll("_", " ")} completed without finding entities that met the current evidence thresholds.`;
  }
  return `The adaptive ${intent.replaceAll("_", " ")} produced ${findingCount} explainable finding${findingCount === 1 ? "" : "s"}, including ${highRiskCount} high-risk entit${highRiskCount === 1 ? "y" : "ies"}.`;
}
