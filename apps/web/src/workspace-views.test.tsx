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
};

describe("workspace sidebar views", () => {
  it.each([
    ["investigations", "Investigations"],
    ["review", "Review queue"],
    ["customers", "Customers"],
    ["transactions", "Transactions"],
    ["datasets", "Datasets"],
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
          imported={false}
          reviewStates={{}}
          policy={DEFAULT_AML_POLICY}
          auditEvents={[]}
          onOpenInvestigation={vi.fn()}
          onInvestigateCustomer={vi.fn()}
          onReviewStatus={vi.fn()}
          onImport={vi.fn()}
          onResetDataset={vi.fn()}
          onApplyPolicy={vi.fn()}
        />,
      );
      expect(markup).toContain(heading);
    },
  );
});
