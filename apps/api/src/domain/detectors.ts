import type {
  AmlPolicy,
  AmlPattern,
  FeatureContribution,
  ParsedQuery,
  RiskFinding,
  Transaction,
} from "@ciphersar/shared";
import { DEFAULT_AML_POLICY } from "@ciphersar/shared";
import type { CustomerFeatures } from "./features";
import { scoreCustomerWithModel } from "../ml/model";
import { clamp, round } from "./statistics";

export interface DetectorCandidate {
  customerId: string;
  pattern: AmlPattern;
  confidence: number;
  aggregateAmount: number;
  transactions: Transaction[];
  evidence: string[];
  contributions: FeatureContribution[];
}

export function detectRequestedPattern(
  features: CustomerFeatures[],
  pattern: AmlPattern,
): DetectorCandidate[] {
  return features.flatMap((feature) => {
    const candidate = detectOne(feature, pattern);
    return candidate ? [candidate] : [];
  });
}

export function detectHybridAnomalies(
  features: CustomerFeatures[],
): DetectorCandidate[] {
  const candidates = features.flatMap((feature) => {
    const ruleCandidates = (
      [
        "structuring",
        "smurfing",
        "layering",
        "rapid_cash_out",
        "unusual_velocity",
        "general_anomaly",
      ] as AmlPattern[]
    ).flatMap((pattern) => {
      const candidate = detectOne(feature, pattern);
      return candidate ? [candidate] : [];
    });
    const modelCandidate = detectTrainedModelAnomaly(feature);
    return modelCandidate ? [...ruleCandidates, modelCandidate] : ruleCandidates;
  });

  const strongest = new Map<string, DetectorCandidate>();
  for (const candidate of candidates) {
    const current = strongest.get(candidate.customerId);
    if (
      !current ||
      contributionTotal(candidate) > contributionTotal(current)
    ) {
      strongest.set(candidate.customerId, candidate);
    }
  }
  return [...strongest.values()];
}

function detectTrainedModelAnomaly(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  const model = scoreCustomerWithModel(feature);
  if (!model.applicable || !model.flagged) return undefined;
  const probabilityPercent = round(model.probability * 100, 1);
  return {
    customerId: feature.customerId,
    pattern: "general_anomaly",
    confidence: model.probability,
    aggregateAmount: feature.totalAmount,
    transactions: feature.transactions,
    evidence: [
      `${probabilityPercent}% probability from the trained AMLSim account model`,
      `${feature.transactionCount} transactions across ${feature.counterpartyCount} counterparties`,
      `model threshold ${round(model.threshold * 100, 1)}%`,
    ],
    contributions: model.contributions,
  };
}

function detectOne(
  feature: CustomerFeatures,
  pattern: AmlPattern,
): DetectorCandidate | undefined {
  switch (pattern) {
    case "structuring":
      return detectStructuring(feature);
    case "smurfing":
      return detectSmurfing(feature);
    case "layering":
      return detectLayering(feature);
    case "rapid_cash_out":
      return detectRapidCashOut(feature);
    case "unusual_velocity":
      return detectVelocity(feature);
    case "general_anomaly":
      return detectGeneralAnomaly(feature);
  }
}

function detectStructuring(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  if (feature.nearThresholdCount < 5) return undefined;
  const contributions: FeatureContribution[] = [
    {
      feature: "near_threshold_cash_count",
      value: feature.nearThresholdCount,
      contribution: Math.min(42, 20 + feature.nearThresholdCount * 2),
      reason: `${feature.nearThresholdCount} cash deposits fell between ₹8,000 and ₹9,999.`,
    },
    {
      feature: "branch_spread",
      value: feature.branchCount,
      contribution: Math.min(18, feature.branchCount * 4.5),
      reason: `Activity was distributed across ${feature.branchCount} branches.`,
    },
    {
      feature: "compressed_window",
      value: `${feature.activeSpanDays} days`,
      contribution: feature.activeSpanDays <= 7 ? 20 : feature.activeSpanDays <= 30 ? 10 : 0,
      reason: `The observed activity occurred within ${feature.activeSpanDays} days.`,
    },
  ];
  return candidate(feature, "structuring", contributions, [
    `${feature.nearThresholdCount} repeated sub-₹10,000 cash deposits`,
    `${feature.branchCount} branches used`,
    `₹${round(feature.cashDepositAmount, 2).toLocaleString("en-IN")} deposited in ${feature.activeSpanDays} days`,
  ]);
}

function detectSmurfing(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  if (feature.smallCashCount < 8 || feature.branchCount < 3) return undefined;
  const contributions: FeatureContribution[] = [
    {
      feature: "small_cash_deposit_count",
      value: feature.smallCashCount,
      contribution: Math.min(38, 18 + feature.smallCashCount * 2),
      reason: `${feature.smallCashCount} small cash deposits formed a fragmented pattern.`,
    },
    {
      feature: "branch_spread",
      value: feature.branchCount,
      contribution: Math.min(20, feature.branchCount * 4),
      reason: `Deposits were spread across ${feature.branchCount} branches.`,
    },
    {
      feature: "velocity",
      value: feature.maxDailyCount,
      contribution: Math.min(18, feature.maxDailyCount * 3),
      reason: `As many as ${feature.maxDailyCount} transactions occurred in one day.`,
    },
  ];
  return candidate(feature, "smurfing", contributions, [
    `${feature.smallCashCount} cash deposits below ₹3,000`,
    `${feature.branchCount} branches used`,
    `peak daily activity of ${feature.maxDailyCount} transactions`,
  ]);
}

function detectLayering(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  if (
    feature.wireInCount < 2 ||
    feature.wireOutCount < 2 ||
    feature.counterpartyCount < 3 ||
    feature.rapidFlowRatio < 0.65
  ) {
    return undefined;
  }
  const contributions: FeatureContribution[] = [
    {
      feature: "wire_turnover",
      value: round(feature.rapidFlowRatio, 2),
      contribution: Math.min(35, feature.rapidFlowRatio * 28),
      reason: "Outbound value closely followed inbound value.",
    },
    {
      feature: "counterparty_spread",
      value: feature.counterpartyCount,
      contribution: Math.min(24, feature.counterpartyCount * 4),
      reason: `${feature.counterpartyCount} counterparties increased transaction-chain complexity.`,
    },
    {
      feature: "compressed_window",
      value: `${feature.activeSpanDays} days`,
      contribution: feature.activeSpanDays <= 7 ? 20 : 8,
      reason: `Funds moved through the account within ${feature.activeSpanDays} days.`,
    },
  ];
  return candidate(feature, "layering", contributions, [
    `${feature.wireInCount} inbound and ${feature.wireOutCount} outbound wires`,
    `${feature.counterpartyCount} counterparties`,
    `${round(feature.rapidFlowRatio * 100)}% flow-through ratio`,
  ]);
}

function detectRapidCashOut(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  if (
    feature.cashDepositAmount < 5_000 ||
    feature.rapidCashOutRatio < 0.72 ||
    feature.activeSpanDays > 14
  ) {
    return undefined;
  }
  const contributions: FeatureContribution[] = [
    {
      feature: "cash_out_ratio",
      value: `${round(feature.rapidCashOutRatio * 100)}%`,
      contribution: Math.min(42, feature.rapidCashOutRatio * 35),
      reason:
        "A high share of deposited cash left the account within 48 hours.",
    },
    {
      feature: "compressed_window",
      value: `${feature.activeSpanDays} days`,
      contribution: feature.activeSpanDays <= 3 ? 25 : 14,
      reason:
        "Cash-in and cash-out activity occurred in a verified rolling window.",
    },
  ];
  return candidate(feature, "rapid_cash_out", contributions, [
    `₹${round(feature.cashDepositAmount).toLocaleString("en-IN")} cash deposited`,
    `₹${round(feature.rapidCashOutAmount).toLocaleString("en-IN")} moved out within 48 hours`,
    `${round(feature.rapidCashOutRatio * 100)}% rapid cash-out ratio`,
  ]);
}

function detectVelocity(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  if (feature.rolling24HourCount < 6 && feature.countRobustZ < 3) {
    return undefined;
  }
  const contributions: FeatureContribution[] = [
    {
      feature: "rolling_24h_transaction_count",
      value: feature.rolling24HourCount,
      contribution: Math.min(35, feature.rolling24HourCount * 4),
      reason: `${feature.rolling24HourCount} transactions occurred within a rolling 24-hour window.`,
    },
    {
      feature: "count_robust_z",
      value: round(feature.countRobustZ, 2),
      contribution: Math.min(25, Math.max(0, feature.countRobustZ) * 6),
      reason: "Transaction frequency is high relative to the population median.",
    },
  ];
  return candidate(feature, "unusual_velocity", contributions, [
    `peak of ${feature.rolling24HourCount} transactions in a rolling 24-hour window`,
    `₹${round(feature.rolling7DayAmount).toLocaleString("en-IN")} maximum rolling 7-day volume`,
    `frequency robust z-score ${round(feature.countRobustZ, 2)}`,
  ]);
}

function detectGeneralAnomaly(
  feature: CustomerFeatures,
): DetectorCandidate | undefined {
  const strongestZ = Math.max(
    Math.abs(feature.countRobustZ),
    Math.abs(feature.volumeRobustZ),
    Math.abs(feature.medianAmountRobustZ),
  );
  if (strongestZ < 3) return undefined;
  const contributions: FeatureContribution[] = [
    {
      feature: "transaction_count_deviation",
      value: round(feature.countRobustZ, 2),
      contribution: Math.min(24, Math.abs(feature.countRobustZ) * 5),
      reason: "Frequency differs materially from the robust population baseline.",
    },
    {
      feature: "volume_deviation",
      value: round(feature.volumeRobustZ, 2),
      contribution: Math.min(26, Math.abs(feature.volumeRobustZ) * 5),
      reason: "Aggregate value differs materially from the robust population baseline.",
    },
    {
      feature: "amount_deviation",
      value: round(feature.medianAmountRobustZ, 2),
      contribution: Math.min(22, Math.abs(feature.medianAmountRobustZ) * 4),
      reason: "Typical transaction size differs from comparable customers.",
    },
  ];
  return candidate(feature, "general_anomaly", contributions, [
    `frequency z-score ${round(feature.countRobustZ, 2)}`,
    `volume z-score ${round(feature.volumeRobustZ, 2)}`,
    `median amount z-score ${round(feature.medianAmountRobustZ, 2)}`,
  ]);
}

function candidate(
  feature: CustomerFeatures,
  pattern: AmlPattern,
  contributions: FeatureContribution[],
  evidence: string[],
): DetectorCandidate {
  const strength = contributionTotal({ contributions });
  return {
    customerId: feature.customerId,
    pattern,
    confidence: round(clamp(0.58 + strength / 220, 0.58, 0.97), 2),
    aggregateAmount: feature.totalAmount,
    transactions: feature.transactions,
    evidence,
    contributions,
  };
}

function contributionTotal(candidateValue: Pick<DetectorCandidate, "contributions">): number {
  return candidateValue.contributions.reduce(
    (total, contribution) => total + contribution.contribution,
    0,
  );
}

export function scoreCandidates(
  candidates: DetectorCandidate[],
): Array<DetectorCandidate & { riskScore: number }> {
  return candidates.map((item) => ({
    ...item,
    riskScore: Math.round(clamp(12 + contributionTotal(item))),
  }));
}

export function toFinding(
  candidateValue: DetectorCandidate & { riskScore: number },
  policy: AmlPolicy = DEFAULT_AML_POLICY,
  parsedQuery?: ParsedQuery,
): RiskFinding {
  const sorted = [...candidateValue.transactions].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const first = sorted[0]?.timestamp ?? new Date(0).toISOString();
  const last = sorted.at(-1)?.timestamp ?? first;
  const riskLevel =
    candidateValue.riskScore >= policy.highRiskThreshold
      ? "high"
      : candidateValue.riskScore >= policy.mediumRiskThreshold
        ? "medium"
        : "low";
  const action =
    candidateValue.riskScore >= policy.reportThreshold &&
    candidateValue.confidence >= policy.minimumReportConfidence
      ? "report"
      : candidateValue.riskScore >= policy.reviewThreshold
        ? "review"
        : "monitor";
  const patternLabel = candidateValue.pattern.replaceAll("_", " ");
  const queryContext = parsedQuery
    ? `For the request "${parsedQuery.raw}", `
    : "";
  const topTransactions = [...candidateValue.transactions]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5)
    .map((transaction) => ({
      id: transaction.id,
      timestamp: transaction.timestamp,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      country: transaction.country,
    }));

  return {
    entityType: "customer",
    entityId: candidateValue.customerId,
    customerId: candidateValue.customerId,
    riskScore: candidateValue.riskScore,
    riskLevel,
    pattern: candidateValue.pattern,
    confidence: candidateValue.confidence,
    aggregateAmount: round(candidateValue.aggregateAmount, 2),
    transactionCount: candidateValue.transactions.length,
    windowStart: first,
    windowEnd: last,
    evidence: candidateValue.evidence,
    contributions: candidateValue.contributions,
    explanation: `${queryContext}the detector flagged ${candidateValue.customerId} for ${patternLabel}. ${candidateValue.evidence.join("; ")}. The score is advisory and requires analyst validation.`,
    recommendedAction: action,
    transactionIds: candidateValue.transactions.map((item) => item.id),
    topTransactions,
  };
}
