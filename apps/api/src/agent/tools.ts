import type {
  AmlPolicy,
  Customer,
  EdaSummary,
  ParsedQuery,
  RiskFinding,
  ToolName,
  Transaction,
} from "@ciphersar/shared";
import {
  detectHybridAnomalies,
  detectRequestedPattern,
  scoreCandidates,
  toFinding,
  type DetectorCandidate,
} from "../domain/detectors";
import {
  engineerCustomerFeatures,
  groupByCustomer,
  type CustomerFeatures,
} from "../domain/features";
import { mean, median, round, sum } from "../domain/statistics";

export interface AgentContext {
  parsed: ParsedQuery;
  policy: AmlPolicy;
  sourceTransactions: Transaction[];
  sourceCustomers: Customer[];
  transactions: Transaction[];
  customers: Customer[];
  features: CustomerFeatures[];
  candidates: DetectorCandidate[];
  scoredCandidates: Array<DetectorCandidate & { riskScore: number }>;
  findings: RiskFinding[];
  eda?: EdaSummary;
}

export interface ToolResult {
  outputSummary: string;
}

type ToolExecutor = (context: AgentContext) => Promise<ToolResult>;

export const toolRegistry: Record<ToolName, ToolExecutor> = {
  load_dataset: async (context) => {
    context.transactions = [...context.sourceTransactions];
    context.customers = [...context.sourceCustomers];
    return {
      outputSummary: `${context.transactions.length} transactions and ${context.customers.length} customers loaded`,
    };
  },
  filter_transactions: async (context) => {
    context.transactions = applyFilters(context.transactions, context.parsed);
    const customerIds = new Set(context.transactions.map((item) => item.customerId));
    context.customers = context.customers.filter((item) => customerIds.has(item.id));
    return {
      outputSummary: `${context.transactions.length} transactions remain after query filters`,
    };
  },
  lookup_customer: async (context) => {
    const requested = context.parsed.filters.customerId ?? "";
    const customer = context.customers.find(
      (item) =>
        item.id.toUpperCase() === requested.toUpperCase() ||
        item.id.toUpperCase().endsWith(`-${requested.toUpperCase()}`),
    );
    if (!customer) {
      context.transactions = [];
      context.customers = [];
      return { outputSummary: `No customer matched ${requested}` };
    }
    context.customers = [customer];
    context.transactions = context.transactions.filter(
      (item) => item.customerId === customer.id,
    );
    return {
      outputSummary: `${customer.id} found with ${context.transactions.length} transactions`,
    };
  },
  selective_eda: async (context) => {
    context.eda = createEda(context.transactions);
    return {
      outputSummary: `Baseline built across ${context.eda.customerCount} customers; ${context.eda.dataQuality.invalidAmounts + context.eda.dataQuality.missingCustomerIds} quality issues`,
    };
  },
  aggregate_threshold_activity: async (context) => {
    const minimum = context.parsed.filters.minimumTransactions ?? 1;
    context.candidates = [...groupByCustomer(context.transactions)]
      .filter(([, transactions]) => transactions.length >= minimum)
      .map(([customerId, transactions]) => {
        const total = sum(transactions.map((item) => item.amount));
        return {
          customerId,
          pattern: "general_anomaly",
          confidence: 0.99,
          aggregateAmount: total,
          transactions,
          evidence: [
            `${transactions.length} transactions matched the requested threshold`,
            `$${round(total, 2).toLocaleString("en-US")} aggregate matched value`,
          ],
          contributions: [
            {
              feature: "matching_transaction_count",
              value: transactions.length,
              contribution: Math.min(55, 18 + transactions.length * 3),
              reason: `${transactions.length} transactions met the explicit query conditions.`,
            },
            {
              feature: "deterministic_threshold_match",
              value: "true",
              contribution: 12,
              reason: "This result is based on direct aggregation, not an ML inference.",
            },
          ],
        };
      });
    return {
      outputSummary: `${context.candidates.length} customers met the direct threshold`,
    };
  },
  engineer_structuring_features: async (context) => {
    context.features = engineerCustomerFeatures(context.transactions);
    return {
      outputSummary: `Threshold proximity, cash frequency, branch spread, and window features created for ${context.features.length} customers`,
    };
  },
  engineer_velocity_features: async (context) => {
    context.features =
      context.features.length > 0
        ? context.features
        : engineerCustomerFeatures(context.transactions);
    return {
      outputSummary: `Daily velocity, robust deviation, counterparty, and flow-through features available for ${context.features.length} customers`,
    };
  },
  detect_pattern: async (context) => {
    const pattern = context.parsed.pattern ?? "general_anomaly";
    context.candidates = detectRequestedPattern(context.features, pattern);
    return {
      outputSummary: `${context.candidates.length} ${pattern.replaceAll("_", " ")} candidates detected`,
    };
  },
  detect_general_anomalies: async (context) => {
    context.candidates = detectHybridAnomalies(context.features);
    return {
      outputSummary: `${context.candidates.length} candidates produced by the hybrid ensemble`,
    };
  },
  score_risk: async (context) => {
    context.scoredCandidates = scoreCandidates(context.candidates);
    context.scoredCandidates.sort((left, right) => right.riskScore - left.riskScore);
    return {
      outputSummary: `${context.scoredCandidates.length} advisory risk scores calibrated`,
    };
  },
  explain_findings: async (context) => {
    context.findings = context.scoredCandidates.map((candidate) =>
      toFinding(candidate, context.policy),
    );
    return {
      outputSummary: `${context.findings.length} evidence-linked explanations generated`,
    };
  },
  recommend_action: async (context) => {
    const counts = context.findings.reduce<Record<string, number>>(
      (accumulator, finding) => {
        accumulator[finding.recommendedAction] =
          (accumulator[finding.recommendedAction] ?? 0) + 1;
        return accumulator;
      },
      {},
    );
    return {
      outputSummary: `Actions: ${Object.entries(counts)
        .map(([name, count]) => `${count} ${name}`)
        .join(", ") || "none"}`,
    };
  },
};

function applyFilters(
  transactions: Transaction[],
  parsed: ParsedQuery,
): Transaction[] {
  const filters = parsed.filters;
  return transactions.filter((item) => {
    if (filters.dateFrom && item.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && item.timestamp > filters.dateTo) return false;
    if (filters.country && item.country.toLowerCase() !== filters.country.toLowerCase()) {
      return false;
    }
    if (filters.segment && item.segment !== filters.segment) return false;
    if (filters.transactionType && item.type !== filters.transactionType) return false;
    if (filters.amountBelow !== undefined && item.amount >= filters.amountBelow) {
      return false;
    }
    if (filters.amountAbove !== undefined && item.amount <= filters.amountAbove) {
      return false;
    }
    return true;
  });
}

function createEda(transactions: Transaction[]): EdaSummary {
  const amounts = transactions
    .map((item) => item.amount)
    .filter((amount) => Number.isFinite(amount) && amount >= 0);
  const timestamps = transactions.map((item) => item.timestamp).sort();
  const typeDistribution: Record<string, number> = {};
  const countryDistribution: Record<string, number> = {};
  const ids = new Set<string>();
  let duplicateTransactionIds = 0;

  for (const item of transactions) {
    typeDistribution[item.type] = (typeDistribution[item.type] ?? 0) + 1;
    countryDistribution[item.country] =
      (countryDistribution[item.country] ?? 0) + 1;
    if (ids.has(item.id)) duplicateTransactionIds += 1;
    ids.add(item.id);
  }

  return {
    rowCount: transactions.length,
    customerCount: new Set(transactions.map((item) => item.customerId)).size,
    totalVolume: round(sum(amounts), 2),
    averageAmount: round(mean(amounts), 2),
    medianAmount: round(median(amounts), 2),
    dateRange: {
      from: timestamps[0] ?? "",
      to: timestamps.at(-1) ?? "",
    },
    typeDistribution,
    countryDistribution,
    dataQuality: {
      missingCustomerIds: transactions.filter((item) => !item.customerId).length,
      invalidAmounts: transactions.filter(
        (item) => !Number.isFinite(item.amount) || item.amount < 0,
      ).length,
      duplicateTransactionIds,
    },
  };
}
