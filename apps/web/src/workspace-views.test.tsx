import {
  DEFAULT_AML_POLICY,
  type DatasetResponse,
  type InvestigationResponse,
} from "@ciphersar/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  type WorkspaceView,
  WorkspaceViews,
} from "./workspace-views";

const dataset: DatasetResponse = {
  name: "Test dataset",
  source: "Synthetic test fixture",
  knownDemoPatterns: ["structuring"],
  customers: [
    {
      id: "CUS-1",
      name: "Test Customer",
      segment: "retail",
      country: "US",
      riskRating: "standard",
      accountOpenedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  transactions: [
    {
      id: "TX-1",
      customerId: "CUS-1",
      timestamp: "2026-07-01T10:00:00.000Z",
      amount: 9_500,
      currency: "USD",
      type: "cash_deposit",
      country: "US",
      segment: "retail",
      channel: "branch",
    },
  ],
};

const investigation: InvestigationResponse = {
  investigationId: "INV-TEST",
  generatedAt: "2026-07-25T00:00:00.000Z",
  parsedQuery: {
    raw: "Find structuring",
    intent: "pattern_search",
    pattern: "structuring",
    filters: {},
    confidence: 0.95,
    interpretation: "Search for structuring",
  },
  plan: {
    intent: "pattern_search",
    rationale: "Targeted plan",
    steps: [],
    skippedTools: [],
  },
  metrics: {
    inputTransactions: 1,
    analyzedTransactions: 1,
    analyzedCustomers: 1,
    flaggedEntities: 0,
    highRiskEntities: 0,
    executionTimeMs: 2,
  },
  findings: [],
  summary: "No findings",
  safeguards: {
    humanReviewRequired: true,
    modelRole: "decision_support",
    limitations: [],
  },
  policy: DEFAULT_AML_POLICY,
  model: {
    id: "test-model",
    type: "balanced random forest",
    status: "active",
    trainedAt: "2026-07-25T00:00:00.000Z",
    dataset: "IBM AMLSim Example Dataset",
    datasetAccounts: 10_000,
    datasetTransactions: 1_323_234,
    decisionThreshold: 0.815,
    metrics: {
      precision: 0.9942,
      recall: 0.6786,
      f1: 0.8066,
      prAuc: 0.8922,
      rocAuc: 0.9505,
    },
    topFeatures: [{ feature: "received_count", importance: 0.25 }],
    role: "decision_support",
  },
};

describe("workspace sidebar views", () => {
  it.each([
    ["investigations", "Investigations"],
    ["review", "Review queue"],
    ["customers", "Customers"],
    ["transactions", "Transactions"],
    ["datasets", "Datasets"],
    ["model", "Model intelligence"],
    ["audit", "Audit trail"],
    ["policy", "Policy settings"],
  ] satisfies Array<[Exclude<WorkspaceView, "command">, string]>)(
    "renders the %s workspace",
    (activeView, heading) => {
      const markup = renderToStaticMarkup(
        <WorkspaceViews
          activeView={activeView}
          history={[investigation]}
          result={investigation}
          reviewFindings={[]}
          dataset={dataset}
          datasetName={dataset.name}
          datasetLoading={false}
          datasetError={null}
          imported={false}
          reviewStates={{}}
          policy={DEFAULT_AML_POLICY}
          auditEvents={[]}
          onOpenInvestigation={vi.fn()}
          onInvestigateCustomer={vi.fn()}
          onReviewStatus={vi.fn()}
          onImport={vi.fn()}
          onResetDataset={vi.fn()}
          onRetryDataset={vi.fn()}
          onApplyPolicy={vi.fn()}
        />,
      );
      expect(markup).toContain(heading);
    },
  );

  it("offers dataset recovery instead of rendering empty dependent pages", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceViews
        activeView="customers"
        history={[]}
        result={null}
        reviewFindings={[]}
        dataset={null}
        datasetName="Global retail transactions"
        datasetLoading={false}
        datasetError="The CipherSAR API is unavailable."
        imported={false}
        reviewStates={{}}
        policy={DEFAULT_AML_POLICY}
        auditEvents={[]}
        onOpenInvestigation={vi.fn()}
        onInvestigateCustomer={vi.fn()}
        onReviewStatus={vi.fn()}
        onImport={vi.fn()}
        onResetDataset={vi.fn()}
        onRetryDataset={vi.fn()}
        onApplyPolicy={vi.fn()}
      />,
    );
    expect(markup).toContain("Retry dataset");
    expect(markup).toContain("CipherSAR API is unavailable");
  });
});
