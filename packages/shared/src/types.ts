export type TransactionType =
  | "cash_deposit"
  | "cash_withdrawal"
  | "wire_in"
  | "wire_out"
  | "card"
  | "ach";

export interface Transaction {
  id: string;
  customerId: string;
  timestamp: string;
  amount: number;
  currency: string;
  type: TransactionType;
  country: string;
  branchId?: string | undefined;
  counterpartyId?: string | undefined;
  segment: "retail" | "business" | "private";
  channel: "branch" | "online" | "mobile" | "atm";
}

export interface Customer {
  id: string;
  name: string;
  segment: Transaction["segment"];
  country: string;
  riskRating: "standard" | "elevated";
  accountOpenedAt: string;
}

export type AmlPattern =
  | "structuring"
  | "smurfing"
  | "layering"
  | "rapid_cash_out"
  | "unusual_velocity"
  | "general_anomaly";

export type QueryIntent =
  | "broad_analysis"
  | "pattern_search"
  | "threshold_aggregation"
  | "customer_investigation"
  | "high_risk_ranking";

export interface QueryFilters {
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  lastDays?: number | undefined;
  customerId?: string | undefined;
  country?: string | undefined;
  segment?: Transaction["segment"] | undefined;
  transactionType?: TransactionType | undefined;
  amountBelow?: number | undefined;
  amountAbove?: number | undefined;
  minimumTransactions?: number | undefined;
}

export interface ParsedQuery {
  raw: string;
  intent: QueryIntent;
  pattern?: AmlPattern | undefined;
  filters: QueryFilters;
  confidence: number;
  interpretation: string;
}

export type ToolName =
  | "load_dataset"
  | "filter_transactions"
  | "lookup_customer"
  | "selective_eda"
  | "aggregate_threshold_activity"
  | "engineer_structuring_features"
  | "engineer_velocity_features"
  | "detect_pattern"
  | "detect_general_anomalies"
  | "score_risk"
  | "explain_findings"
  | "recommend_action";

export interface PlanStep {
  id: string;
  tool: ToolName;
  reason: string;
  status: "planned" | "running" | "completed" | "skipped" | "failed";
  inputScope: string;
  durationMs?: number | undefined;
  outputSummary?: string | undefined;
}

export interface ExecutionPlan {
  intent: QueryIntent;
  rationale: string;
  steps: PlanStep[];
  skippedTools: Array<{ tool: ToolName; reason: string }>;
}

export interface FeatureContribution {
  feature: string;
  value: number | string;
  contribution: number;
  reason: string;
}

export interface RiskFinding {
  entityType: "customer" | "transaction";
  entityId: string;
  customerId: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  pattern: AmlPattern;
  confidence: number;
  aggregateAmount: number;
  transactionCount: number;
  windowStart: string;
  windowEnd: string;
  evidence: string[];
  contributions: FeatureContribution[];
  explanation: string;
  recommendedAction: "monitor" | "review" | "report";
  transactionIds: string[];
  topTransactions: Array<{
    id: string;
    timestamp: string;
    amount: number;
    currency: string;
    type: TransactionType;
    country: string;
  }>;
}

export interface EdaSummary {
  rowCount: number;
  customerCount: number;
  totalVolume: number;
  averageAmount: number;
  medianAmount: number;
  dateRange: { from: string; to: string };
  typeDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
  dataQuality: {
    missingCustomerIds: number;
    invalidAmounts: number;
    duplicateTransactionIds: number;
  };
}

export interface InvestigationMetrics {
  inputTransactions: number;
  analyzedTransactions: number;
  analyzedCustomers: number;
  flaggedEntities: number;
  highRiskEntities: number;
  executionTimeMs: number;
}

export interface AmlPolicy {
  mediumRiskThreshold: number;
  highRiskThreshold: number;
  reviewThreshold: number;
  reportThreshold: number;
  minimumReportConfidence: number;
}

export interface AgentDecisionSummary {
  userRequest: string;
  detectedIntent: QueryIntent;
  targetPattern?: AmlPattern | undefined;
  targetEntity?: string | undefined;
  appliedFilters: Array<{
    field: keyof QueryFilters;
    value: string;
  }>;
  selectedTools: ToolName[];
  skippedToolCount: number;
  inputScope: {
    transactions: number;
    customers: number;
  };
  analyzedScope: {
    transactions: number;
    customers: number;
    reductionPercent: number;
  };
  strategy: string;
}

export const DEFAULT_AML_POLICY: AmlPolicy = {
  mediumRiskThreshold: 35,
  highRiskThreshold: 70,
  reviewThreshold: 60,
  reportThreshold: 85,
  minimumReportConfidence: 0.75,
};

export interface InvestigationResponse {
  investigationId: string;
  generatedAt: string;
  parsedQuery: ParsedQuery;
  plan: ExecutionPlan;
  decisionSummary: AgentDecisionSummary;
  metrics: InvestigationMetrics;
  eda?: EdaSummary | undefined;
  findings: RiskFinding[];
  summary: string;
  safeguards: {
    humanReviewRequired: true;
    modelRole: "decision_support";
    limitations: string[];
  };
  policy: AmlPolicy;
  model: ModelMetadata;
}

export interface ModelMetricSummary {
  precision: number;
  recall: number;
  f1: number;
  prAuc: number;
  rocAuc: number;
}

export interface ModelMetadata {
  id: string;
  type: string;
  status: "active";
  trainedAt: string;
  dataset: string;
  datasetAccounts: number;
  datasetTransactions: number;
  decisionThreshold: number;
  metrics: ModelMetricSummary;
  topFeatures: Array<{ feature: string; importance: number }>;
  role: "decision_support";
}

export interface AnalyzeRequest {
  query: string;
  transactions?: Transaction[] | undefined;
  customers?: Customer[] | undefined;
  policy?: AmlPolicy | undefined;
}

export interface DatasetResponse {
  name: string;
  source: string;
  customers: Customer[];
  transactions: Transaction[];
  knownDemoPatterns: AmlPattern[];
}

export type ReportTemplate =
  | "executive_summary"
  | "case_narrative"
  | "sar_review_brief";

export interface GenerateReportRequest {
  investigation: InvestigationResponse;
  template: ReportTemplate;
}

export interface ReportSection {
  heading: string;
  content: string;
}

export interface GeneratedReport {
  reportId: string;
  investigationId: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  executiveSummary: string;
  sections: ReportSection[];
  source: "gemini" | "local";
  model: string;
  disclaimer: string;
  limitations: string[];
}
