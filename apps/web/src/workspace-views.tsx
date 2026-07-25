import {
  type AmlPolicy,
  DEFAULT_AML_POLICY,
  type Customer,
  type DatasetResponse,
  type InvestigationResponse,
  type ModelMetadata,
  type RiskFinding,
  type Transaction,
} from "@ciphersar/shared";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  Clock3,
  Database,
  FileCheck2,
  FileSearch,
  Filter,
  GitBranch,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  UserSearch,
  Users,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

export type WorkspaceView =
  | "command"
  | "investigations"
  | "review"
  | "customers"
  | "transactions"
  | "datasets"
  | "model"
  | "audit"
  | "policy";

export type ReviewStatus = "pending" | "in_review" | "resolved";

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  detail: string;
  category: "investigation" | "review" | "dataset" | "policy" | "system";
}

interface WorkspaceViewsProps {
  activeView: Exclude<WorkspaceView, "command">;
  history: InvestigationResponse[];
  result: InvestigationResponse | null;
  reviewFindings: RiskFinding[];
  dataset: DatasetResponse | null;
  datasetName: string;
  datasetLoading: boolean;
  datasetError: string | null;
  imported: boolean;
  reviewStates: Record<string, ReviewStatus>;
  policy: AmlPolicy;
  auditEvents: AuditEvent[];
  onOpenInvestigation: (investigation: InvestigationResponse) => void;
  onInvestigateCustomer: (customerId: string) => void;
  onReviewStatus: (finding: RiskFinding, status: ReviewStatus) => void;
  onImport: () => void;
  onResetDataset: () => void;
  onRetryDataset: () => void;
  onApplyPolicy: (policy: AmlPolicy) => void;
}

export function WorkspaceViews(props: WorkspaceViewsProps) {
  if (
    !props.dataset &&
    ["customers", "transactions", "datasets"].includes(props.activeView)
  ) {
    return (
      <DatasetDependencyView
        view={props.activeView}
        loading={props.datasetLoading}
        error={props.datasetError}
        onRetry={props.onRetryDataset}
        onImport={props.onImport}
      />
    );
  }
  switch (props.activeView) {
    case "investigations":
      return (
        <InvestigationsView
          history={props.history}
          onOpen={props.onOpenInvestigation}
        />
      );
    case "review":
      return (
        <ReviewQueueView
          findings={props.reviewFindings}
          states={props.reviewStates}
          onStatus={props.onReviewStatus}
        />
      );
    case "customers":
      return (
        <CustomersView
          dataset={props.dataset}
          findings={props.result?.findings ?? []}
          onInvestigate={props.onInvestigateCustomer}
        />
      );
    case "transactions":
      return (
        <TransactionsView
          dataset={props.dataset}
          findings={props.result?.findings ?? []}
          onInvestigate={props.onInvestigateCustomer}
        />
      );
    case "datasets":
      return (
        <DatasetsView
          dataset={props.dataset}
          datasetName={props.datasetName}
          imported={props.imported}
          onImport={props.onImport}
          onReset={props.onResetDataset}
        />
      );
    case "model":
      return <ModelIntelligenceView model={props.result?.model ?? null} />;
    case "audit":
      return <AuditTrailView events={props.auditEvents} />;
    case "policy":
      return (
        <PolicySettingsView
          policy={props.policy}
          onApply={props.onApplyPolicy}
        />
      );
  }
}

function DatasetDependencyView({
  view,
  loading,
  error,
  onRetry,
  onImport,
}: {
  view: Exclude<WorkspaceView, "command">;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onImport: () => void;
}) {
  const labels = {
    customers: ["Entity intelligence", "Customers", Users],
    transactions: ["Transaction explorer", "Transactions", Activity],
    datasets: ["Data operations", "Datasets", Database],
  } as const;
  const [eyebrow, title, Icon] =
    labels[view as keyof typeof labels] ?? labels.datasets;
  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow={eyebrow}
        title={title}
        description="This workspace requires the active customer and transaction dataset."
        icon={Icon}
      />
      <section className="panel dataset-dependency">
        <div className={`dataset-dependency__icon ${error ? "is-error" : ""}`}>
          {loading ? <RefreshCw className="spin" size={24} /> : <Database size={24} />}
        </div>
        <div>
          <span className="section-kicker">
            {loading ? "Connecting" : "Dataset unavailable"}
          </span>
          <h2>{loading ? "Loading the active dataset" : "Reconnect data services"}</h2>
          <p>
            {loading
              ? "Customer and transaction records will appear as soon as the API responds."
              : error ?? "The active dataset could not be loaded."}
          </p>
        </div>
        {!loading ? (
          <div className="dataset-dependency__actions">
            <button className="button button--primary" type="button" onClick={onRetry}>
              <RefreshCw size={15} /> Retry dataset
            </button>
            <button className="button button--quiet" type="button" onClick={onImport}>
              <UploadCloud size={15} /> Import CSV
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ModelIntelligenceView({ model }: { model: ModelMetadata | null }) {
  if (!model) {
    return (
      <div className="workspace-view">
        <ViewHeader
          eyebrow="Hybrid intelligence"
          title="Model intelligence"
          description="Validated model performance, training provenance, and governance controls."
          icon={BrainCircuit}
        />
        <section className="panel">
          <Empty
            icon={BrainCircuit}
            title="Model metadata is loading"
            detail="Run an investigation to load the active model card."
          />
        </section>
      </div>
    );
  }
  const metrics = [
    ["Test precision", model.metrics.precision, "Relevant alerts"],
    ["Test recall", model.metrics.recall, "Detected positives"],
    ["PR-AUC", model.metrics.prAuc, "Imbalanced quality"],
    ["ROC-AUC", model.metrics.rocAuc, "Ranking quality"],
  ] as const;
  const maxImportance = Math.max(
    0.01,
    ...model.topFeatures.map((feature) => feature.importance),
  );
  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Hybrid intelligence"
        title="Model intelligence"
        description="Transparent performance, provenance, and decision-support controls for the active AML model."
        icon={BrainCircuit}
        action={<span className="model-live"><i /> Active · v1</span>}
      />
      <section className="model-hero panel">
        <div className="model-hero__mark"><BrainCircuit size={28} /></div>
        <div>
          <span className="section-kicker">Production artifact</span>
          <h2>{model.type}</h2>
          <p>{model.id}</p>
        </div>
        <div className="model-threshold">
          <span>Decision threshold</span>
          <strong>{Math.round(model.decisionThreshold * 100)}%</strong>
          <small>Validated F1 {Math.round(model.metrics.f1 * 100)}%</small>
        </div>
      </section>
      <section className="model-metric-grid">
        {metrics.map(([label, value, note]) => (
          <article className="panel model-metric" key={label}>
            <span>{label}</span>
            <strong>{(value * 100).toFixed(1)}%</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="model-layout">
        <article className="panel model-features">
          <header className="panel__header">
            <div>
              <span className="section-kicker">Explainability</span>
              <h2>Leading model features</h2>
            </div>
          </header>
          <div className="model-feature-list">
            {model.topFeatures.map((feature, index) => (
              <div key={feature.feature}>
                <em>{String(index + 1).padStart(2, "0")}</em>
                <span>{feature.feature.replaceAll("_", " ")}</span>
                <div><i style={{ width: `${(feature.importance / maxImportance) * 100}%` }} /></div>
                <strong>{(feature.importance * 100).toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel model-governance">
          <header className="panel__header">
            <div>
              <span className="section-kicker">Training provenance</span>
              <h2>Validated and governed</h2>
            </div>
            <ShieldCheck size={20} />
          </header>
          <dl>
            <div><dt>Dataset</dt><dd>{model.dataset}</dd></div>
            <div><dt>Training accounts</dt><dd>{model.datasetAccounts.toLocaleString()}</dd></div>
            <div><dt>Transactions</dt><dd>{model.datasetTransactions.toLocaleString()}</dd></div>
            <div><dt>Model role</dt><dd>Decision support</dd></div>
          </dl>
          <div className="governance-note">
            <AlertTriangle size={16} />
            <p>Synthetic training data cannot establish criminal intent. Every escalation requires analyst review and institution-specific validation.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

function ViewHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Activity;
  action?: React.ReactNode;
}) {
  return (
    <section className="workspace-view__header">
      <div className="workspace-view__icon">
        <Icon size={21} />
      </div>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="workspace-view__action">{action}</div> : null}
    </section>
  );
}

function InvestigationsView({
  history,
  onOpen,
}: {
  history: InvestigationResponse[];
  onOpen: (investigation: InvestigationResponse) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = history.filter((investigation) => {
    const haystack = [
      investigation.investigationId,
      investigation.parsedQuery.raw,
      investigation.parsedQuery.intent,
      investigation.summary,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Case intelligence"
        title="Investigations"
        description="Search completed agent runs, inspect their scope, and reopen the exact evidence and execution trace."
        icon={FileSearch}
      />
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <label className="workspace-search">
            <Search size={16} />
            <input
              aria-label="Search investigations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by query, intent, or investigation ID"
            />
          </label>
          <span>{visible.length} recorded</span>
        </div>
        {visible.length ? (
          <div className="workspace-list">
            {visible.map((investigation) => (
              <article className="workspace-row" key={investigation.investigationId}>
                <div className="workspace-row__icon">
                  <FileSearch size={17} />
                </div>
                <div className="workspace-row__main">
                  <strong>{investigation.parsedQuery.raw}</strong>
                  <span>
                    {investigation.investigationId} ·{" "}
                    {formatDateTime(investigation.generatedAt)}
                  </span>
                  <p>{investigation.summary}</p>
                </div>
                <div className="workspace-row__metrics">
                  <span>
                    <strong>{investigation.metrics.flaggedEntities}</strong> flags
                  </span>
                  <span>
                    <strong>{investigation.plan.steps.length}</strong> tools
                  </span>
                </div>
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => onOpen(investigation)}
                >
                  Open <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={FileSearch}
            title="No matching investigations"
            detail="Run an investigation from the command center or change the search."
          />
        )}
      </section>
    </div>
  );
}

function ReviewQueueView({
  findings,
  states,
  onStatus,
}: {
  findings: RiskFinding[];
  states: Record<string, ReviewStatus>;
  onStatus: (finding: RiskFinding, status: ReviewStatus) => void;
}) {
  const [filter, setFilter] = useState<"open" | ReviewStatus>("open");
  const visible = findings.filter((finding) => {
    const status = states[findingReviewKey(finding)] ?? "pending";
    return filter === "open" ? status !== "resolved" : status === filter;
  });
  const openCount = findings.filter(
    (finding) => (states[findingReviewKey(finding)] ?? "pending") !== "resolved",
  ).length;

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Human decision gate"
        title="Review queue"
        description="Prioritise explainable findings, record analyst review state, and resolve alerts without losing the evidence trail."
        icon={FileCheck2}
        action={
          <span className="queue-count">
            <AlertTriangle size={15} /> {openCount} open
          </span>
        }
      />
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <div className="segmented-control" aria-label="Review queue filters">
            {(["open", "pending", "in_review", "resolved"] as const).map(
              (value) => (
                <button
                  type="button"
                  className={filter === value ? "active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                >
                  {value.replaceAll("_", " ")}
                </button>
              ),
            )}
          </div>
          <span>{visible.length} shown</span>
        </div>
        {visible.length ? (
          <div className="review-grid">
            {visible.map((finding) => {
              const status = states[findingReviewKey(finding)] ?? "pending";
              return (
                <article className="review-card" key={findingReviewKey(finding)}>
                  <div className="review-card__top">
                    <div>
                      <span className="section-kicker">
                        {finding.pattern.replaceAll("_", " ")}
                      </span>
                      <strong>{finding.customerId}</strong>
                    </div>
                    <span
                      className={`risk-badge risk-badge--${finding.riskLevel}`}
                    >
                      {finding.riskScore} · {finding.riskLevel}
                    </span>
                  </div>
                  <p>{finding.explanation}</p>
                  <div className="review-card__facts">
                    <span>{finding.transactionCount} transactions</span>
                    <span>
                      ${finding.aggregateAmount.toLocaleString("en-US")} activity
                    </span>
                    <span>{Math.round(finding.confidence * 100)}% confidence</span>
                  </div>
                  <div className="review-card__footer">
                    <span className={`review-status review-status--${status}`}>
                      {status.replaceAll("_", " ")}
                    </span>
                    <div>
                      {status !== "in_review" && status !== "resolved" ? (
                        <button
                          className="button button--quiet"
                          type="button"
                          onClick={() => onStatus(finding, "in_review")}
                        >
                          Start review
                        </button>
                      ) : null}
                      {status !== "resolved" ? (
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => onStatus(finding, "resolved")}
                        >
                          <Check size={14} /> Resolve
                        </button>
                      ) : (
                        <button
                          className="button button--quiet"
                          type="button"
                          onClick={() => onStatus(finding, "pending")}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={ShieldCheck}
            title="Queue is clear"
            detail="No findings match this review state."
          />
        )}
      </section>
    </div>
  );
}

function CustomersView({
  dataset,
  findings,
  onInvestigate,
}: {
  dataset: DatasetResponse | null;
  findings: RiskFinding[];
  onInvestigate: (customerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const activity = useMemo(
    () => aggregateCustomerActivity(dataset?.transactions ?? []),
    [dataset],
  );
  const findingMap = new Map(findings.map((finding) => [finding.customerId, finding]));
  const visible = (dataset?.customers ?? []).filter((customer) =>
    [customer.id, customer.name, customer.country, customer.segment]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Entity intelligence"
        title="Customers"
        description="Explore the active customer population, compare activity, and start a scoped investigation in one action."
        icon={Users}
      />
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <label className="workspace-search">
            <Search size={16} />
            <input
              aria-label="Search customers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, segment, or country"
            />
          </label>
          <span>{visible.length} customers</span>
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Profile</th>
                  <th>Transactions</th>
                  <th>Volume</th>
                  <th>Current signal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((customer) => {
                  const summary = activity.get(customer.id);
                  const finding = findingMap.get(customer.id);
                  return (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.name}</strong>
                        <span>{customer.id}</span>
                      </td>
                      <td>
                        <strong>{customer.segment}</strong>
                        <span>
                          {customer.country} · {customer.riskRating}
                        </span>
                      </td>
                      <td>
                        <strong>{summary?.count ?? 0}</strong>
                        <span>recorded</span>
                      </td>
                      <td>
                        <strong>
                          ${(summary?.volume ?? 0).toLocaleString("en-US")}
                        </strong>
                        <span>aggregate</span>
                      </td>
                      <td>
                        {finding ? (
                          <span
                            className={`risk-badge risk-badge--${finding.riskLevel}`}
                          >
                            {finding.riskScore} · {finding.pattern.replaceAll("_", " ")}
                          </span>
                        ) : (
                          <span className="status-muted">No active flag</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="button button--quiet"
                          type="button"
                          onClick={() => onInvestigate(customer.id)}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={UserSearch}
            title="No customers found"
            detail="Try a different customer ID, name, country, or segment."
          />
        )}
      </section>
    </div>
  );
}

function TransactionsView({
  dataset,
  findings,
  onInvestigate,
}: {
  dataset: DatasetResponse | null;
  findings: RiskFinding[];
  onInvestigate: (customerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | Transaction["type"]>("all");
  const flaggedIds = new Set(findings.flatMap((finding) => finding.transactionIds));
  const visible = (dataset?.transactions ?? [])
    .filter((transaction) => type === "all" || transaction.type === type)
    .filter((transaction) =>
      [
        transaction.id,
        transaction.customerId,
        transaction.country,
        transaction.type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 500);

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Transaction explorer"
        title="Transactions"
        description="Inspect activity in the active dataset, isolate transaction types, and pivot directly into a customer investigation."
        icon={Activity}
      />
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <label className="workspace-search">
            <Search size={16} />
            <input
              aria-label="Search transactions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transaction or customer ID"
            />
          </label>
          <label className="workspace-select">
            <Filter size={14} />
            <select
              aria-label="Filter transaction type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "all" | Transaction["type"])
              }
            >
              <option value="all">All transaction types</option>
              <option value="cash_deposit">Cash deposits</option>
              <option value="cash_withdrawal">Cash withdrawals</option>
              <option value="wire_in">Inbound wires</option>
              <option value="wire_out">Outbound wires</option>
              <option value="card">Card</option>
              <option value="ach">ACH</option>
            </select>
          </label>
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Location / channel</th>
                  <th>Signal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <strong>{transaction.id}</strong>
                      <span>{formatDateTime(transaction.timestamp)}</span>
                    </td>
                    <td>
                      <strong>{transaction.customerId}</strong>
                    </td>
                    <td>
                      <span className="type-chip">
                        {transaction.type.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {transaction.currency}{" "}
                        {transaction.amount.toLocaleString("en-US")}
                      </strong>
                    </td>
                    <td>
                      <strong>{transaction.country}</strong>
                      <span>{transaction.channel}</span>
                    </td>
                    <td>
                      {flaggedIds.has(transaction.id) ? (
                        <span className="risk-badge risk-badge--high">
                          linked evidence
                        </span>
                      ) : (
                        <span className="status-muted">baseline</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="button button--quiet"
                        type="button"
                        onClick={() => onInvestigate(transaction.customerId)}
                      >
                        Open customer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Activity}
            title="No transactions found"
            detail="Change the search term or transaction type filter."
          />
        )}
        {(dataset?.transactions.length ?? 0) > 500 ? (
          <p className="result-limit">
            Showing the first 500 matching records for responsive review.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function DatasetsView({
  dataset,
  datasetName,
  imported,
  onImport,
  onReset,
}: {
  dataset: DatasetResponse | null;
  datasetName: string;
  imported: boolean;
  onImport: () => void;
  onReset: () => void;
}) {
  const countries = new Set(
    (dataset?.transactions ?? []).map((transaction) => transaction.country),
  ).size;
  const dateValues = (dataset?.transactions ?? [])
    .map((transaction) => transaction.timestamp)
    .sort();

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Data operations"
        title="Datasets"
        description="Manage the active investigation dataset, inspect its coverage, and switch safely between imported and synthetic demonstration data."
        icon={Database}
        action={
          <button className="button button--primary" type="button" onClick={onImport}>
            <UploadCloud size={15} /> Import CSV
          </button>
        }
      />
      <section className="dataset-hero panel">
        <div className="dataset-hero__icon">
          <Database size={27} />
        </div>
        <div>
          <span className="section-kicker">Active dataset</span>
          <h2>{datasetName}</h2>
          <p>{dataset?.source ?? "Loading dataset metadata…"}</p>
        </div>
        <span className="live-dot">Active</span>
      </section>
      <section className="dataset-metrics">
        <article className="panel">
          <span>Transactions</span>
          <strong>{(dataset?.transactions.length ?? 0).toLocaleString()}</strong>
          <small>validated records</small>
        </article>
        <article className="panel">
          <span>Customers</span>
          <strong>{(dataset?.customers.length ?? 0).toLocaleString()}</strong>
          <small>unique entities</small>
        </article>
        <article className="panel">
          <span>Countries</span>
          <strong>{countries}</strong>
          <small>activity locations</small>
        </article>
        <article className="panel">
          <span>Date coverage</span>
          <strong>{dateValues.length ? dateSpanValues(dateValues) : "—"}</strong>
          <small>observed window</small>
        </article>
      </section>
      <section className="panel dataset-controls">
        <header className="panel__header">
          <div>
            <span className="section-kicker">Source controls</span>
            <h2>Dataset operations</h2>
          </div>
        </header>
        <div>
          <article>
            <UploadCloud size={20} />
            <div>
              <strong>Import transaction CSV</strong>
              <span>
                Validates identifiers, timestamps, amounts, transaction types,
                channels, and segments before analysis.
              </span>
            </div>
            <button className="button button--quiet" type="button" onClick={onImport}>
              Choose file
            </button>
          </article>
          <article>
            <RefreshCw size={20} />
            <div>
              <strong>Restore synthetic demo</strong>
              <span>
                Reload the deterministic dataset containing known structuring,
                smurfing, and layering scenarios.
              </span>
            </div>
            <button
              className="button button--quiet"
              type="button"
              disabled={!imported}
              onClick={onReset}
            >
              Restore
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

function AuditTrailView({ events }: { events: AuditEvent[] }) {
  const [category, setCategory] = useState<"all" | AuditEvent["category"]>("all");
  const visible = events.filter(
    (event) => category === "all" || event.category === category,
  );
  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Control evidence"
        title="Audit trail"
        description="Review a local, append-only record of investigations, dataset changes, review decisions, and policy updates."
        icon={GitBranch}
      />
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <div className="segmented-control">
            {(
              [
                "all",
                "investigation",
                "review",
                "dataset",
                "policy",
                "system",
              ] as const
            ).map((value) => (
              <button
                type="button"
                className={category === value ? "active" : ""}
                key={value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <span>{visible.length} events</span>
        </div>
        <div className="audit-list">
          {visible.map((event) => (
            <article key={event.id}>
              <div className={`audit-dot audit-dot--${event.category}`} />
              <div>
                <div>
                  <strong>{event.action}</strong>
                  <span>{formatDateTime(event.occurredAt)}</span>
                </div>
                <p>{event.detail}</p>
                <small>
                  {event.actor} · {event.category}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PolicySettingsView({
  policy,
  onApply,
}: {
  policy: AmlPolicy;
  onApply: (policy: AmlPolicy) => void;
}) {
  const [draft, setDraft] = useState(policy);
  const [saved, setSaved] = useState(false);
  const valid =
    draft.mediumRiskThreshold < draft.highRiskThreshold &&
    draft.reviewThreshold <= draft.reportThreshold;

  const set = (key: keyof AmlPolicy, value: number) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onApply(draft);
    setSaved(true);
  };

  return (
    <div className="workspace-view">
      <ViewHeader
        eyebrow="Model governance"
        title="Policy settings"
        description="Control the advisory risk bands and escalation gates applied by the backend to every new investigation."
        icon={Settings}
      />
      <form className="policy-layout" onSubmit={submit}>
        <section className="panel policy-panel">
          <header className="panel__header">
            <div>
              <span className="section-kicker">Risk calibration</span>
              <h2>Risk bands</h2>
            </div>
          </header>
          <PolicyField
            label="Medium-risk threshold"
            detail="Scores at or above this value become medium risk."
            value={draft.mediumRiskThreshold}
            min={1}
            max={99}
            onChange={(value) => set("mediumRiskThreshold", value)}
          />
          <PolicyField
            label="High-risk threshold"
            detail="Scores at or above this value become high risk."
            value={draft.highRiskThreshold}
            min={1}
            max={100}
            onChange={(value) => set("highRiskThreshold", value)}
          />
        </section>
        <section className="panel policy-panel">
          <header className="panel__header">
            <div>
              <span className="section-kicker">Escalation policy</span>
              <h2>Recommended actions</h2>
            </div>
          </header>
          <PolicyField
            label="Review threshold"
            detail="Scores at or above this value enter analyst review."
            value={draft.reviewThreshold}
            min={1}
            max={100}
            onChange={(value) => set("reviewThreshold", value)}
          />
          <PolicyField
            label="Report threshold"
            detail="Minimum score before a report can be recommended."
            value={draft.reportThreshold}
            min={1}
            max={100}
            onChange={(value) => set("reportThreshold", value)}
          />
          <PolicyField
            label="Minimum report confidence"
            detail="Required detector confidence for a report recommendation."
            value={Math.round(draft.minimumReportConfidence * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => set("minimumReportConfidence", value / 100)}
          />
        </section>
        <section className="panel policy-summary">
          <ShieldCheck size={23} />
          <div>
            <span className="section-kicker">Effective policy</span>
            <h2>Human approval remains mandatory</h2>
            <p>
              These thresholds change risk classification and recommendations,
              but CipherSAR never files a SAR/STR or closes a case autonomously.
            </p>
            {!valid ? (
              <span className="policy-error">
                Lower-severity thresholds must remain below higher-severity
                thresholds.
              </span>
            ) : null}
          </div>
          <div className="policy-summary__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={() => {
                setDraft(DEFAULT_AML_POLICY);
                setSaved(false);
              }}
            >
              Reset defaults
            </button>
            <button className="button button--primary" disabled={!valid}>
              {saved ? <Check size={15} /> : null}
              {saved ? "Policy applied" : "Apply policy"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function PolicyField({
  label,
  detail,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  detail: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="policy-field">
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {value}
        {suffix}
      </output>
    </label>
  );
}

function Empty({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Activity;
  title: string;
  detail: string;
}) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function aggregateCustomerActivity(transactions: Transaction[]) {
  const activity = new Map<string, { count: number; volume: number }>();
  for (const transaction of transactions) {
    const current = activity.get(transaction.customerId) ?? {
      count: 0,
      volume: 0,
    };
    current.count += 1;
    current.volume += transaction.amount;
    activity.set(transaction.customerId, current);
  }
  return activity;
}

export function customersFromTransactions(
  transactions: Transaction[],
): Customer[] {
  const byCustomer = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const current = byCustomer.get(transaction.customerId) ?? [];
    current.push(transaction);
    byCustomer.set(transaction.customerId, current);
  }
  return [...byCustomer.entries()].map(([id, activity]) => {
    const first = [...activity].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    )[0]!;
    return {
      id,
      name: `Imported customer ${id}`,
      segment: first.segment,
      country: first.country,
      riskRating: "standard",
      accountOpenedAt: first.timestamp,
    };
  });
}

export function findingReviewKey(finding: RiskFinding): string {
  return `${finding.customerId}:${finding.pattern}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateSpanValues(values: string[]): string {
  const start = new Date(values[0] ?? 0);
  const end = new Date(values.at(-1) ?? 0);
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  return `${days} days`;
}
