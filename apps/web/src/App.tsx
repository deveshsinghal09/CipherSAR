import type {
  AmlPolicy,
  Customer,
  DatasetResponse,
  InvestigationResponse,
  ModelMetadata,
  RiskFinding,
  ToolName,
  Transaction,
} from "@ciphersar/shared";
import { DEFAULT_AML_POLICY } from "@ciphersar/shared";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  CircleUserRound,
  Command,
  Database,
  FileCheck2,
  FileSearch,
  Fingerprint,
  GitBranch,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Route,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getDataset, getModelMetadata, runInvestigation } from "./api";
import {
  type AuditEvent,
  customersFromTransactions,
  findingReviewKey,
  type ReviewStatus,
  type WorkspaceView,
  WorkspaceViews,
} from "./workspace-views";
import {
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "./components/ui";
import { formatInr, localizeCurrencyText } from "./formatters";

const DEFAULT_QUERY = "Find structuring patterns in the last 30 days";
const EXAMPLES = [
  "Find structuring patterns in the last 30 days",
  "Which customers made 10+ transactions under ₹10,000?",
  "Is customer ID 4521 suspicious?",
  "Analyse this dataset for suspicious activity",
];

export function formatSyncAge(lastSyncedAt: number, now: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - lastSyncedAt) / 1_000));
  if (elapsedSeconds < 60) return "just now";
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"} ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} ago`;
}

const NAV_ITEMS = [
  { id: "command", label: "Command center", icon: LayoutDashboard },
  { id: "investigations", label: "Investigations", icon: FileSearch },
  { id: "review", label: "Review queue", icon: FileCheck2 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "transactions", label: "Transactions", icon: Activity },
  { id: "datasets", label: "Datasets", icon: Database },
  { id: "reports", label: "AI Report Studio", icon: ScrollText },
] satisfies Array<{
  id: WorkspaceView;
  label: string;
  icon: typeof Activity;
}>;

const SYSTEM_NAV_ITEMS = [
  { id: "model", label: "Model intelligence", icon: BrainCircuit },
  { id: "audit", label: "Audit trail", icon: GitBranch },
  { id: "policy", label: "Policy settings", icon: Settings },
] satisfies Array<{
  id: WorkspaceView;
  label: string;
  icon: typeof Activity;
}>;

const TOOL_LABELS: Record<ToolName, string> = {
  load_dataset: "Load dataset",
  filter_transactions: "Apply query filters",
  lookup_customer: "Customer lookup",
  selective_eda: "Selective EDA",
  aggregate_threshold_activity: "Threshold aggregation",
  engineer_structuring_features: "Structuring features",
  engineer_velocity_features: "Velocity features",
  detect_pattern: "Pattern detector",
  detect_general_anomalies: "Hybrid anomaly ensemble",
  score_risk: "Risk calibration",
  explain_findings: "Evidence explanation",
  recommend_action: "Escalation recommendation",
};

export function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<InvestigationResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("command");
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>([]);
  const [importedCustomers, setImportedCustomers] = useState<Customer[]>([]);
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(true);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState("Global retail transactions");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncClock, setSyncClock] = useState(() => Date.now());
  const [history, setHistory] = useState<InvestigationResponse[]>([]);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewStatus>>(
    {},
  );
  const [policy, setPolicy] = useState<AmlPolicy>(DEFAULT_AML_POLICY);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    {
      id: "AUD-BOOT",
      occurredAt: new Date().toISOString(),
      actor: "CipherSAR",
      action: "Workspace initialized",
      detail: "Decision-support controls and the synthetic dataset were activated.",
      category: "system",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceSearchInputRef = useRef<HTMLInputElement>(null);
  const workspaceSearchTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceSearchShellRef = useRef<HTMLDivElement>(null);
  const profileMenuShellRef = useRef<HTMLDivElement>(null);
  const investigationRequestRef = useRef(0);
  const hasBootstrapped = useRef(false);

  const appendAudit = useCallback(
    (event: Omit<AuditEvent, "id" | "occurredAt">) => {
      setAuditEvents((current) => [
        {
          ...event,
          id: `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          occurredAt: new Date().toISOString(),
        },
        ...current,
      ]);
    },
    [],
  );

  const loadDataset = useCallback(async (): Promise<DatasetResponse | null> => {
    setDatasetLoading(true);
    setDatasetError(null);
    try {
      const sample = await getDataset();
      setDataset(sample);
      setDatasetName("Global retail transactions");
      const syncedAt = Date.now();
      setLastSyncedAt(syncedAt);
      setSyncClock(syncedAt);
      appendAudit({
        actor: "CipherSAR",
        action: "Active dataset synchronized",
        detail: `${sample.transactions.length} transactions across ${sample.customers.length} customers were loaded and validated.`,
        category: "dataset",
      });
      return sample;
    } catch (caught) {
      setDataset(null);
      setDatasetError(
        caught instanceof Error
          ? caught.message
          : "The active dataset could not be loaded.",
      );
      return null;
    } finally {
      setDatasetLoading(false);
    }
  }, [appendAudit]);

  const loadModel = useCallback(async (): Promise<ModelMetadata | null> => {
    setModelLoading(true);
    setModelError(null);
    try {
      const metadata = await getModelMetadata();
      setModelMetadata(metadata);
      return metadata;
    } catch (caught) {
      setModelMetadata(null);
      setModelError(
        caught instanceof Error
          ? caught.message
          : "The active model card could not be loaded.",
      );
      return null;
    } finally {
      setModelLoading(false);
    }
  }, []);

  const investigate = useCallback(
    async (
      nextQuery: string,
      transactions: Transaction[] = importedTransactions,
      customers: Customer[] = importedCustomers,
      effectivePolicy: AmlPolicy = policy,
    ) => {
      const requestId = ++investigationRequestRef.current;
      setLoading(true);
      setError(null);
      try {
        const response = await runInvestigation({
          query: nextQuery,
          ...(transactions.length ? { transactions } : {}),
          ...(transactions.length && customers.length ? { customers } : {}),
          policy: effectivePolicy,
        });
        if (requestId !== investigationRequestRef.current) return;
        setResult(response);
        setModelMetadata(response.model);
        setModelError(null);
        setSelectedId(response.findings[0]?.entityId ?? null);
        setHistory((current) => [
          response,
          ...current.filter(
            (item) => item.investigationId !== response.investigationId,
          ),
        ].slice(0, 50));
        setReviewStates((current) => {
          const next = { ...current };
          for (const finding of response.findings) {
            next[findingReviewKey(finding)] ??= "pending";
          }
          return next;
        });
        appendAudit({
          actor: "Compliance analyst",
          action: "Investigation completed",
          detail: `${response.investigationId}: “${nextQuery}” produced ${response.findings.length} explainable findings using ${response.plan.steps.length} tools.`,
          category: "investigation",
        });
      } catch (caught) {
        if (requestId !== investigationRequestRef.current) return;
        setError(caught instanceof Error ? caught.message : "Unexpected error");
      } finally {
        if (requestId === investigationRequestRef.current) setLoading(false);
      }
    },
    [
      appendAudit,
      importedCustomers,
      importedTransactions,
      policy,
    ],
  );

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void loadDataset();
    void loadModel();
  }, [loadDataset, loadModel]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setSyncClock(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const sidebar = sidebarRef.current;
    const focusable = Array.from(
      sidebar?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    const first = sidebarCloseRef.current ?? focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab" || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const updateNavigationMode = () => setCompactNavigation(media.matches);
    updateNavigationMode();
    media.addEventListener("change", updateNavigationMode);
    return () => media.removeEventListener("change", updateNavigationMode);
  }, []);

  useEffect(() => {
    const onWorkspaceShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setProfileMenuOpen(false);
        setWorkspaceSearchOpen(true);
        window.requestAnimationFrame(() => workspaceSearchInputRef.current?.focus());
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setProfileMenuOpen(false);
        setWorkspaceSearchOpen(true);
        window.requestAnimationFrame(() => workspaceSearchInputRef.current?.focus());
      } else if (event.key === "Escape") {
        const searchHadFocus =
          workspaceSearchShellRef.current?.contains(document.activeElement);
        setWorkspaceSearchOpen(false);
        setProfileMenuOpen(false);
        if (searchHadFocus) {
          window.requestAnimationFrame(() =>
            workspaceSearchTriggerRef.current?.focus(),
          );
        }
      }
    };
    document.addEventListener("keydown", onWorkspaceShortcut);
    return () => document.removeEventListener("keydown", onWorkspaceShortcut);
  }, []);

  useEffect(() => {
    if (!workspaceSearchOpen && !profileMenuOpen) return;
    const closeDetachedMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        workspaceSearchOpen &&
        !workspaceSearchShellRef.current?.contains(target)
      ) {
        setWorkspaceSearchOpen(false);
      }
      if (
        profileMenuOpen &&
        !profileMenuShellRef.current?.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeDetachedMenus);
    return () => document.removeEventListener("pointerdown", closeDetachedMenus);
  }, [profileMenuOpen, workspaceSearchOpen]);

  const selected = useMemo(
    () =>
      result?.findings.find((finding) => finding.entityId === selectedId) ??
      result?.findings[0] ??
      null,
    [result, selectedId],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length >= 3) void investigate(query.trim());
  };

  const updatePreparedQuery = (nextQuery: string) => {
    investigationRequestRef.current += 1;
    setLoading(false);
    setQuery(nextQuery);
    setResult(null);
    setSelectedId(null);
    setError(null);
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    investigationRequestRef.current += 1;
    setLoading(false);
    try {
      const transactions = parseTransactionsCsv(await file.text());
      const customers = customersFromTransactions(transactions);
      setImportedTransactions(transactions);
      setImportedCustomers(customers);
      setDataset({
        name: file.name,
        source: "Analyst-imported CSV validated in the browser and API",
        transactions,
        customers,
        knownDemoPatterns: [],
      });
      setDatasetError(null);
      setDatasetLoading(false);
      setDatasetName(file.name);
      const syncedAt = Date.now();
      setLastSyncedAt(syncedAt);
      setSyncClock(syncedAt);
      appendAudit({
        actor: "Compliance analyst",
        action: "Dataset imported",
        detail: `${file.name} activated with ${transactions.length} transactions across ${customers.length} customers.`,
        category: "dataset",
      });
      setResult(null);
      setSelectedId(null);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The CSV could not be imported.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const navigate = (view: WorkspaceView) => {
    setActiveView(view);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  const prepareInvestigation = (nextQuery: string) => {
    updatePreparedQuery(nextQuery);
    navigate("command");
  };

  const openInvestigation = (investigation: InvestigationResponse) => {
    setResult(investigation);
    setSelectedId(investigation.findings[0]?.entityId ?? null);
    setQuery(localizeCurrencyText(investigation.parsedQuery.raw));
    navigate("command");
  };

  const investigateCustomer = (customerId: string) => {
    prepareInvestigation(`Is customer ID ${customerId} suspicious?`);
  };

  const changeReviewStatus = (
    finding: RiskFinding,
    status: ReviewStatus,
  ) => {
    setReviewStates((current) => ({
      ...current,
      [findingReviewKey(finding)]: status,
    }));
    appendAudit({
      actor: "Compliance analyst",
      action: `Review ${status.replaceAll("_", " ")}`,
      detail: `${finding.customerId} (${finding.pattern.replaceAll("_", " ")}) changed to ${status.replaceAll("_", " ")}.`,
      category: "review",
    });
  };

  const resetDataset = async () => {
    try {
      const sample = await loadDataset();
      if (!sample) return;
      setImportedTransactions([]);
      setImportedCustomers([]);
      appendAudit({
        actor: "Compliance analyst",
        action: "Synthetic dataset restored",
        detail: `${sample.transactions.length} transactions and ${sample.customers.length} customers are active.`,
        category: "dataset",
      });
      updatePreparedQuery(DEFAULT_QUERY);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The synthetic dataset could not be restored.",
      );
    }
  };

  const applyPolicy = (nextPolicy: AmlPolicy) => {
    setPolicy(nextPolicy);
    appendAudit({
      actor: "Compliance analyst",
      action: "AML policy updated",
      detail: `Risk bands set to ${nextPolicy.mediumRiskThreshold}/${nextPolicy.highRiskThreshold}; escalation gates set to ${nextPolicy.reviewThreshold}/${nextPolicy.reportThreshold}.`,
      category: "policy",
    });
    setResult(null);
    setSelectedId(null);
    setError(null);
  };

  const reviewFindings = useMemo(() => {
    const unique = new Map<string, RiskFinding>();
    for (const investigation of history) {
      for (const finding of investigation.findings) {
        unique.set(findingReviewKey(finding), finding);
      }
    }
    return [...unique.values()].sort(
      (left, right) => right.riskScore - left.riskScore,
    );
  }, [history]);

  const openReviewCount = reviewFindings.filter(
    (finding) =>
      (reviewStates[findingReviewKey(finding)] ?? "pending") !== "resolved",
  ).length;

  const activeDestination = [...NAV_ITEMS, ...SYSTEM_NAV_ITEMS].find(
    (item) => item.id === activeView,
  );
  const searchableDestinations = [...NAV_ITEMS, ...SYSTEM_NAV_ITEMS].filter(
    (item) =>
      item.label.toLowerCase().includes(workspaceSearch.trim().toLowerCase()),
  );

  const openDestination = (view: WorkspaceView) => {
    navigate(view);
    setWorkspaceSearch("");
    setWorkspaceSearchOpen(false);
    setProfileMenuOpen(false);
  };

  /*
   * THESIS: A high-stakes signal room that refuses the familiar wide-sidebar card dashboard.
   * OWN-WORLD: Chalk workstage, graphite rail, cobalt evidence tape, and ruled white sheets.
   * STORY: Ask a question → inspect the agent plan → review evidence → decide or report.
   * FIRST VIEWPORT: Expandable graphite instrument, searchable context strip, asymmetric command stage, primary Investigate action.
   * FORM: Candidate 6, concept A + C composition, seed 86fadf64.
   */
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "app-shell--rail-collapsed" : ""}`}
    >
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}
        aria-label="Application navigation"
        aria-hidden={compactNavigation && !mobileNavOpen}
        inert={compactNavigation && !mobileNavOpen}
      >
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <img src="/ciphersar-mark.png" alt="" />
          </div>
          <div>
            <strong>CipherSAR</strong>
            <span>AML intelligence</span>
          </div>
          <button
            className="icon-button rail-toggle"
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button
            ref={sidebarCloseRef}
            className="icon-button sidebar__close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Primary navigation">
          <span className="nav-heading">Workspace</span>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${activeView === id ? "nav-item--active" : ""}`}
              key={id}
              type="button"
              title={label}
              aria-current={activeView === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "review" && openReviewCount ? (
                <em>{openReviewCount}</em>
              ) : null}
            </button>
          ))}
          <span className="nav-heading nav-heading--spaced">System</span>
          {SYSTEM_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${activeView === id ? "nav-item--active" : ""}`}
              key={id}
              type="button"
              title={label}
              aria-current={activeView === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="security-card">
          <div className="security-card__icon">
            <LockKeyhole size={17} />
          </div>
          <div>
            <strong>Decision support only</strong>
            <span>Human review is required before escalation.</span>
          </div>
        </div>

      </aside>

      {mobileNavOpen ? (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="workspace">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            className="icon-button menu-button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="topbar__context">
            <span>Workspace</span>
            <strong>{activeDestination?.label ?? "Command center"}</strong>
          </div>
          <div className="workspace-search-shell" ref={workspaceSearchShellRef}>
            <button
              ref={workspaceSearchTriggerRef}
              className="workspace-search-trigger"
              type="button"
              aria-label="Search workspace"
              aria-expanded={workspaceSearchOpen}
              onClick={() => {
                setProfileMenuOpen(false);
                setWorkspaceSearchOpen((current) => !current);
                window.requestAnimationFrame(() => workspaceSearchInputRef.current?.focus());
              }}
            >
              <Search size={15} />
              <span>Search workspace</span>
              <kbd title="Control or Command plus K"><Command size={11} /> K</kbd>
            </button>
            {workspaceSearchOpen ? (
              <div
                className="workspace-search-popover"
                role="dialog"
                aria-label="Workspace search"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  const items = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      '[role="menuitem"]',
                    ),
                  );
                  if (!items.length) return;
                  event.preventDefault();
                  const currentIndex = items.indexOf(
                    document.activeElement as HTMLElement,
                  );
                  const nextIndex =
                    event.key === "ArrowDown"
                      ? currentIndex < items.length - 1
                        ? currentIndex + 1
                        : 0
                      : currentIndex > 0
                        ? currentIndex - 1
                        : items.length - 1;
                  items[nextIndex]?.focus();
                }}
              >
                <label className="workspace-search-input">
                  <Search size={17} />
                  <input
                    ref={workspaceSearchInputRef}
                    value={workspaceSearch}
                    onChange={(event) => setWorkspaceSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchableDestinations[0]) {
                        event.preventDefault();
                        openDestination(searchableDestinations[0].id);
                      }
                    }}
                    placeholder="Find customers, reports, policy…"
                    aria-label="Find a workspace destination"
                  />
                  <kbd>Esc</kbd>
                </label>
                <div className="workspace-search-results" role="menu" aria-label="Destinations">
                  {searchableDestinations.length ? (
                    searchableDestinations.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="menuitem"
                        aria-current={activeView === id ? "page" : undefined}
                        onClick={() => openDestination(id)}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                        {activeView === id ? <em>Current</em> : <ChevronRight size={14} />}
                      </button>
                    ))
                  ) : (
                    <div className="workspace-search-empty">
                      <Search size={18} />
                      <strong>No destination found</strong>
                      <span>Try “customers”, “reports”, or “policy”.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div className="dataset-status">
            <Database size={16} />
            <div>
              <span>Active dataset</span>
              <strong>{datasetName}</strong>
            </div>
            <span
              className={`live-dot ${datasetError ? "live-dot--error" : ""}`}
            >
              {datasetLoading ? "Loading" : datasetError ? "Unavailable" : "Live"}
            </span>
          </div>
          <div className="topbar__actions">
            <span
              className={`sync-status ${datasetError ? "sync-status--error" : ""}`}
              aria-live="polite"
              title={
                lastSyncedAt
                  ? `Last successful sync: ${new Date(lastSyncedAt).toLocaleString("en-IN")}`
                  : "No successful dataset sync in this session"
              }
            >
              <RefreshCw
                className={datasetLoading ? "spin" : undefined}
                size={14}
                aria-hidden="true"
              />
              {datasetLoading
                ? "Syncing"
                : datasetError
                  ? "Sync failed"
                  : lastSyncedAt
                    ? `Synced ${formatSyncAge(lastSyncedAt, syncClock)}`
                    : "Not synced"}
            </span>
            <button
              className="icon-button"
              aria-label="Open review queue"
              onClick={() => navigate("review")}
            >
              <Bell size={18} />
              {openReviewCount ? <i /> : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => void onImport(event)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              leadingIcon={<UploadCloud size={16} />}
            >
              Import data
            </Button>
            <div className="profile-menu-shell" ref={profileMenuShellRef}>
              <button
                className="profile-trigger"
                type="button"
                aria-label="Open analyst profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setWorkspaceSearchOpen(false);
                  setProfileMenuOpen((current) => !current);
                }}
              >
                <span className="profile-trigger__avatar" aria-hidden="true">A</span>
                <span className="profile-trigger__copy">
                  <strong>Analyst</strong>
                  <small>Decision support</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {profileMenuOpen ? (
                <div className="profile-menu" role="menu" aria-label="Analyst workspace menu">
                  <div className="profile-menu__identity">
                    <CircleUserRound size={19} />
                    <div>
                      <strong>Analyst workspace</strong>
                      <span>Human review required</span>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={() => openDestination("policy")}>
                    <Settings size={16} />
                    <span>Policy settings</span>
                    <ChevronRight size={14} />
                  </button>
                  <button type="button" role="menuitem" onClick={() => openDestination("audit")}>
                    <GitBranch size={16} />
                    <span>Audit trail</span>
                    <ChevronRight size={14} />
                  </button>
                  <div className="profile-menu__status">
                    <span><i /> Controls active</span>
                    <small>No autonomous filing</small>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className={
            activeView === "command" && result
              ? "investigation-workspace"
              : undefined
          }
        >
          {activeView === "command" ? (
            <>
          <section className="command-stage" aria-labelledby="command-heading">
            <div className="command-stage__primary">
              <div className="page-intro">
                <div>
                  <span className="eyebrow">
                    <Sparkles size={14} /> Adaptive AML investigation agent
                  </span>
                  <h1>Investigate the signal.<br />Explain every decision.</h1>
                  <p>
                    Ask a compliance question in plain language. CipherSAR interprets
                    the request, selects only the necessary tools, and returns
                    evidence a reviewer can defend.
                  </p>
                </div>
              </div>

              <ol className="agent-path-preview" aria-label="Adaptive agent workflow">
                <li>
                  <span>01</span>
                  <Command size={17} aria-hidden="true" />
                  <div>
                    <strong>Understand the request</strong>
                    <small>Intent, filters, entity, and AML pattern</small>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <Route size={17} aria-hidden="true" />
                  <div>
                    <strong>Select only needed tools</strong>
                    <small>Skip unnecessary EDA, features, or ML</small>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <ShieldCheck size={17} aria-hidden="true" />
                  <div>
                    <strong>Return defensible evidence</strong>
                    <small>Risk, explanation, and human-gated action</small>
                  </div>
                </li>
              </ol>

              <Card className="command-card">
                <div className="command-card__top">
                  <div className="agent-orb" aria-hidden="true">
                    <Network size={22} />
                  </div>
                  <div>
                    <h2 id="command-heading">What should I investigate?</h2>
                    <span>
                      Intent, filters, entities, and AML typologies are parsed automatically.
                    </span>
                  </div>
                  <span className="command-card__mode">
                    <i aria-hidden="true" /> Query-aware planner
                  </span>
                </div>
                <form className="command-form" onSubmit={onSubmit}>
                  <Search size={20} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => updatePreparedQuery(event.target.value)}
                    placeholder="e.g. Find structuring patterns in the last 30 days"
                    aria-label="Investigation query"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={query.trim().length < 3}
                    leadingIcon={<Fingerprint size={17} />}
                  >
                    {loading ? "Investigating" : "Investigate"}
                  </Button>
                </form>
                <div className="query-examples">
                  <span>Try asking</span>
                  {EXAMPLES.slice(0, 3).map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => prepareInvestigation(example)}
                    >
                      {shortenExample(example)}
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <aside className="command-brief" aria-label="Investigation readiness">
              <div className="command-brief__index">Agent status</div>
              <div className="command-brief__mark">
                <Fingerprint size={28} />
              </div>
              <h2>Agent readiness</h2>
              <dl>
                <div>
                  <dt>Intent parser</dt>
                  <dd>Ready</dd>
                </div>
                <div>
                  <dt>Analytical tools</dt>
                  <dd>{Object.keys(TOOL_LABELS).length} available</dd>
                </div>
                <div>
                  <dt>Escalation</dt>
                  <dd>Human gated</dd>
                </div>
                <div>
                  <dt>Model registry</dt>
                  <dd>{modelMetadata ? "Active" : modelLoading ? "Connecting" : "Unavailable"}</dd>
                </div>
              </dl>
              <div className="trust-chip">
                <ShieldCheck size={18} />
                <div>
                  <span>Governance status</span>
                  <strong>Controls active</strong>
                </div>
              </div>
            </aside>
          </section>

          <section className="signal-tape" aria-label="Prepared investigation context">
            <div>
              <span>Prepared intent</span>
              <strong>{result?.parsedQuery.pattern?.replaceAll("_", " ") ?? "Awaiting query"}</strong>
            </div>
            <div>
              <span>Active scope</span>
              <strong>
                {result
                  ? `${result.decisionSummary.analyzedScope.transactions} transactions`
                  : datasetLoading
                    ? "Loading dataset"
                    : `${dataset?.transactions.length ?? 0} transactions ready`}
              </strong>
            </div>
            <div>
              <span>Agent route</span>
              <strong>
                {result ? `${result.plan.steps.length} selected tools` : "Query-aware planning"}
              </strong>
            </div>
            <div>
              <span>Decision control</span>
              <strong>Human review required</strong>
            </div>
          </section>

          {result ? (
            <>
              <AgentDecisionPanel result={result} />
              <ModelPulse model={result.model} onOpen={() => navigate("model")} />
            </>
          ) : null}

          {error ? (
            <section className="error-state" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>Investigation interrupted</strong>
                <span>{error}</span>
              </div>
              <Button
                onClick={() => {
                  if (!dataset) void loadDataset();
                  void investigate(query);
                }}
                leadingIcon={<RefreshCw size={15} />}
              >
                Retry
              </Button>
            </section>
          ) : null}

          {loading && !result ? <DashboardSkeleton /> : null}
          {!loading && !result && !error ? (
            <Card className="ready-state" aria-live="polite">
              <EmptyState
                icon={Fingerprint}
                title="Ready to investigate"
                detail="Review or edit the prepared query, then click Investigate. No analysis runs until you start it."
              />
            </Card>
          ) : null}
          {result ? (
            <>
              <Metrics result={result} />

              <section className="investigation-grid">
                <PlanPanel result={result} loading={loading} />
                <RiskOverview findings={result.findings} />
              </section>

              <section className="results-layout">
                <FindingsTable
                  findings={result.findings}
                  selectedId={selected?.entityId ?? null}
                  onSelect={setSelectedId}
                />
                <EvidencePanel
                  finding={selected}
                  onSendToReview={(finding) => {
                    changeReviewStatus(finding, "in_review");
                    navigate("review");
                  }}
                />
              </section>

              {result.eda ? <EdaPanel result={result} /> : null}
            </>
          ) : null}
            </>
          ) : (
            <WorkspaceViews
              activeView={activeView}
              history={history}
              result={result}
              reviewFindings={reviewFindings}
              dataset={dataset}
              datasetName={datasetName}
              datasetLoading={datasetLoading}
              datasetError={datasetError}
              imported={importedTransactions.length > 0}
              reviewStates={reviewStates}
              policy={policy}
              model={modelMetadata}
              modelLoading={modelLoading}
              modelError={modelError}
              auditEvents={auditEvents}
              onOpenInvestigation={openInvestigation}
              onInvestigateCustomer={investigateCustomer}
              onReviewStatus={changeReviewStatus}
              onImport={() => fileInputRef.current?.click()}
              onResetDataset={() => void resetDataset()}
              onRetryDataset={() => void loadDataset()}
              onRetryModel={() => void loadModel()}
              onApplyPolicy={applyPolicy}
            />
          )}
        </main>

        <footer>
          <div className="footer-brand">
            <ShieldCheck size={17} />
            <strong>CipherSAR</strong>
            <span>Financial Crime Compliance</span>
          </div>
          <div>
            <span>CipherSAR v0.1</span>
            <span>·</span>
            <span>Model governance</span>
            <span>·</span>
            <span>Privacy</span>
            <span>·</span>
            <span>Audit controls</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AgentDecisionPanel({
  result,
}: {
  result: InvestigationResponse;
}) {
  const decision = result.decisionSummary;
  return (
    <section className="panel agent-decision" aria-label="Agent execution summary">
      <header className="agent-decision__header">
        <div>
          <span className="section-kicker">Query-aware execution</span>
          <h2>What the agent decided—and why</h2>
        </div>
        <span className="status-pill">
          <Check size={13} /> {decision.selectedTools.length} tools selected
        </span>
      </header>

      <div className="agent-decision__grid">
        <article className="decision-block decision-block--request">
          <div className="decision-block__icon"><Target size={17} /></div>
          <div>
            <span>User request</span>
            <strong>{localizeCurrencyText(decision.userRequest)}</strong>
            <p>{localizeCurrencyText(decision.strategy)}</p>
          </div>
        </article>

        <article className="decision-block">
          <div className="decision-block__icon"><ListFilter size={17} /></div>
          <div>
            <span>Detected context</span>
            <div className="decision-chips">
              <em>{decision.detectedIntent.replaceAll("_", " ")}</em>
              {decision.targetPattern ? (
                <em>{decision.targetPattern.replaceAll("_", " ")}</em>
              ) : null}
              {decision.targetEntity ? <em>{decision.targetEntity}</em> : null}
              {decision.appliedFilters.map((filter) => (
                <em key={`${filter.field}-${filter.value}`}>
                  {filter.field.replaceAll(/([A-Z])/g, " $1")} ·{" "}
                  {localizeCurrencyText(filter.value)}
                </em>
              ))}
              {!decision.appliedFilters.length ? <em>full dataset scope</em> : null}
            </div>
          </div>
        </article>

        <article className="decision-block">
          <div className="decision-block__icon"><Route size={17} /></div>
          <div>
            <span>Scoped execution</span>
            <strong>
              {decision.inputScope.transactions.toLocaleString()} →{" "}
              {decision.analyzedScope.transactions.toLocaleString()} transactions
            </strong>
            <div className="scope-meter" aria-label={`${decision.analyzedScope.reductionPercent}% scope reduction`}>
              <i
                style={{
                  width: `${Math.max(4, 100 - decision.analyzedScope.reductionPercent)}%`,
                }}
              />
            </div>
            <p>
              {decision.analyzedScope.reductionPercent}% reduced ·{" "}
              {decision.analyzedScope.customers} customers analysed ·{" "}
              {decision.skippedToolCount} tools skipped
            </p>
          </div>
        </article>
      </div>

      <div className="selected-tool-chain" aria-label="Selected tool chain">
        {result.plan.steps.map((step, index) => (
          <div key={step.id}>
            <span>{index + 1}</span>
            <strong>{TOOL_LABELS[step.tool]}</strong>
            {index < result.plan.steps.length - 1 ? <ChevronRight size={13} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelPulse({
  model,
  onOpen,
}: {
  model: ModelMetadata;
  onOpen: () => void;
}) {
  return (
    <section className="model-pulse" aria-label="Active trained model">
      <div className="model-pulse__identity">
        <span className="model-pulse__icon"><BrainCircuit size={18} /></span>
        <div>
          <span>Trained intelligence</span>
          <strong>{model.type}</strong>
        </div>
      </div>
      <div className="model-pulse__metric">
        <span>Test PR-AUC</span>
        <strong>{(model.metrics.prAuc * 100).toFixed(1)}%</strong>
      </div>
      <div className="model-pulse__metric">
        <span>Test precision</span>
        <strong>{(model.metrics.precision * 100).toFixed(1)}%</strong>
      </div>
      <div className="model-pulse__metric">
        <span>Training scale</span>
        <strong>{(model.datasetTransactions / 1_000_000).toFixed(2)}M</strong>
      </div>
      <button className="model-pulse__action" type="button" onClick={onOpen}>
        View model card <ArrowRight size={14} />
      </button>
    </section>
  );
}

function Metrics({ result }: { result: InvestigationResponse }) {
  const items = [
    {
      label: "Transactions scoped",
      value: result.metrics.analyzedTransactions.toLocaleString(),
      note: `${result.metrics.inputTransactions} available`,
      icon: Activity,
      tone: "lime",
    },
    {
      label: "Entities analysed",
      value: result.metrics.analyzedCustomers.toLocaleString(),
      note: "query-specific scope",
      icon: Users,
      tone: "teal",
    },
    {
      label: "High-risk findings",
      value: result.metrics.highRiskEntities.toString(),
      note: `${result.metrics.flaggedEntities} total flagged`,
      icon: AlertTriangle,
      tone: "coral",
    },
    {
      label: "Agent runtime",
      value: `${result.metrics.executionTimeMs}ms`,
      note: `${result.plan.steps.length} tools invoked`,
      icon: Activity,
      tone: "amber",
    },
  ];

  return (
    <section className="metrics" aria-label="Investigation metrics">
      {items.map(({ label, value, note, icon: Icon, tone }) => (
        <article className="metric-card" key={label}>
          <div className={`metric-card__icon tone-${tone}`}>
            <Icon size={18} />
          </div>
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

function PlanPanel({
  result,
  loading,
}: {
  result: InvestigationResponse;
  loading: boolean;
}) {
  return (
    <section className="panel plan-panel">
      <header className="panel__header">
        <div>
          <span className="section-kicker">Agent decision trace</span>
          <h2>Dynamic execution plan</h2>
        </div>
        <span className={`status-pill ${loading ? "status-pill--running" : ""}`}>
          {loading ? <LoaderCircle className="spin" size={13} /> : <Check size={13} />}
          {loading ? "Running" : "Completed"}
        </span>
      </header>
      <div className="interpretation">
        <CircleDot size={16} />
        <div>
          <span>Parsed intent · {result.parsedQuery.intent.replaceAll("_", " ")}</span>
          <strong>{localizeCurrencyText(result.parsedQuery.interpretation)}</strong>
        </div>
        <em>{Math.round(result.parsedQuery.confidence * 100)}%</em>
      </div>
      <p className="plan-rationale">{localizeCurrencyText(result.plan.rationale)}</p>
      <ol className="plan-steps">
        {result.plan.steps.map((step, index) => (
          <li key={step.id}>
            <div className="step-index">
              {step.status === "completed" ? <Check size={13} /> : index + 1}
            </div>
            <div className="step-copy">
              <div>
                <strong>{TOOL_LABELS[step.tool]}</strong>
                <span>{step.durationMs ?? "—"}ms</span>
              </div>
              <p>{localizeCurrencyText(step.reason)}</p>
              <small>
                {localizeCurrencyText(
                  step.outputSummary ?? "No output recorded",
                )}
              </small>
            </div>
          </li>
        ))}
      </ol>
      {result.plan.skippedTools.length ? (
        <details className="skipped-tools">
          <summary>
            {result.plan.skippedTools.length} tools intentionally skipped
          </summary>
          {result.plan.skippedTools.map((item) => (
            <div key={item.tool}>
              <span>{TOOL_LABELS[item.tool]}</span>
              <p>{localizeCurrencyText(item.reason)}</p>
            </div>
          ))}
        </details>
      ) : null}
    </section>
  );
}

function RiskOverview({ findings }: { findings: RiskFinding[] }) {
  const high = findings.filter((finding) => finding.riskLevel === "high").length;
  const medium = findings.filter(
    (finding) => finding.riskLevel === "medium",
  ).length;
  const low = findings.filter((finding) => finding.riskLevel === "low").length;
  const total = Math.max(1, findings.length);
  return (
    <section className="panel risk-overview">
      <header className="panel__header">
        <div>
          <span className="section-kicker">Population view</span>
          <h2>Risk distribution</h2>
        </div>
        <BarChart3 size={19} />
      </header>
      <div className="risk-donut-wrap">
        <div
          className="risk-donut"
          style={{
            background: `conic-gradient(var(--danger) 0 ${(high / total) * 100}%, var(--warning) ${(high / total) * 100}% ${((high + medium) / total) * 100}%, var(--low) ${((high + medium) / total) * 100}% 100%)`,
          }}
        >
          <div>
            <strong>{findings.length}</strong>
            <span>flagged</span>
          </div>
        </div>
        <div className="risk-legend">
          <RiskLegend tone="high" label="High risk" value={high} total={total} />
          <RiskLegend tone="medium" label="Medium risk" value={medium} total={total} />
          <RiskLegend tone="low" label="Low risk" value={low} total={total} />
        </div>
      </div>
      <div className="pattern-list">
        {patternCounts(findings).slice(0, 4).map(([pattern, count]) => (
          <div key={pattern}>
            <span>{pattern.replaceAll("_", " ")}</span>
            <div><i style={{ width: `${Math.max(10, (count / total) * 100)}%` }} /></div>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      {findings.length ? (
        <div className="score-landscape">
          <div className="score-landscape__heading">
            <strong>Risk score landscape</strong>
            <span>Top flagged entities</span>
          </div>
          {findings.slice(0, 5).map((finding) => (
            <div key={finding.entityId}>
              <span>{finding.customerId}</span>
              <div>
                <i
                  className={`risk-fill risk-fill--${finding.riskLevel}`}
                  style={{ width: `${finding.riskScore}%` }}
                />
              </div>
              <strong>{finding.riskScore}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RiskLegend({
  tone,
  label,
  value,
  total,
}: {
  tone: string;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div>
      <i className={`legend-dot legend-dot--${tone}`} />
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{Math.round((value / total) * 100)}%</em>
    </div>
  );
}

function FindingsTable({
  findings,
  selectedId,
  onSelect,
}: {
  findings: RiskFinding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel findings-panel">
      <header className="panel__header">
        <div>
          <span className="section-kicker">Prioritised results</span>
          <h2>Suspicious entities</h2>
        </div>
        <Button
          disabled={!findings.length}
          onClick={() => exportFindings(findings)}
          leadingIcon={<UploadCloud size={15} />}
        >
          Export evidence
        </Button>
      </header>
      {findings.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Risk</th>
                <th>Detected pattern</th>
                <th>Activity</th>
                <th>Action</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr
                  className={selectedId === finding.entityId ? "selected-row" : ""}
                  key={finding.entityId}
                  onClick={() => onSelect(finding.entityId)}
                >
                  <td>
                    <strong>{finding.customerId}</strong>
                    <span>{finding.transactionCount} transactions</span>
                  </td>
                  <td>
                    <span className={`risk-badge risk-badge--${finding.riskLevel}`}>
                      {finding.riskScore} · {finding.riskLevel}
                    </span>
                  </td>
                  <td>
                    <strong className="pattern-name">
                      {finding.pattern.replaceAll("_", " ")}
                    </strong>
                    <span>{Math.round(finding.confidence * 100)}% confidence</span>
                  </td>
                  <td>
                    <strong>{formatInr(finding.aggregateAmount)}</strong>
                    <span>{dateSpan(finding)}</span>
                  </td>
                  <td>
                    <span className="action-label">
                      {finding.recommendedAction}
                    </span>
                  </td>
                  <td><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No entities crossed the current evidence threshold"
          detail="Try broadening the date range or asking for a different pattern."
        />
      )}
    </section>
  );
}

function EvidencePanel({
  finding,
  onSendToReview,
}: {
  finding: RiskFinding | null;
  onSendToReview: (finding: RiskFinding) => void;
}) {
  if (!finding) {
    return (
      <aside className="panel evidence-panel">
        <EmptyState
          icon={FileSearch}
          title="Select a finding"
          detail="Evidence and score contributions will appear here."
        />
      </aside>
    );
  }
  return (
    <aside className="panel evidence-panel">
      <div className="evidence-panel__top">
        <div>
          <span className="section-kicker">Why this was flagged</span>
          <h2>{finding.customerId}</h2>
        </div>
        <div className={`score-orb score-orb--${finding.riskLevel}`}>
          <strong>{finding.riskScore}</strong>
          <span>/100</span>
        </div>
      </div>
      <span className={`risk-banner risk-banner--${finding.riskLevel}`}>
        <AlertTriangle size={15} />
        {finding.riskLevel} risk · {finding.pattern.replaceAll("_", " ")}
      </span>
      <p className="explanation">
        {localizeCurrencyText(finding.explanation)}
      </p>
      <div className="evidence-facts">
        {finding.evidence.map((fact) => (
          <div key={fact}>
            <Check size={14} />
            <span>{localizeCurrencyText(fact)}</span>
          </div>
        ))}
      </div>
      {finding.topTransactions?.length ? (
        <div className="evidence-transactions">
          <div className="evidence-transactions__heading">
            <strong>Top linked transactions</strong>
            <span>Ranked by amount</span>
          </div>
          {finding.topTransactions.map((transaction) => (
            <div className="evidence-transaction" key={transaction.id}>
              <div>
                <strong>{transaction.id}</strong>
                <span>
                  {transaction.type.replaceAll("_", " ")} ·{" "}
                  {formatCompactDate(transaction.timestamp)}
                </span>
              </div>
              <strong>{formatInr(transaction.amount)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="contributions">
        <div className="contributions__heading">
          <strong>Score contribution</strong>
          <span>Evidence weight</span>
        </div>
        {finding.contributions.map((item) => (
          <div className="contribution" key={item.feature}>
            <div>
              <span>{item.feature.replaceAll("_", " ")}</span>
              <strong>+{Math.round(item.contribution)}</strong>
            </div>
            <div className="contribution__bar">
              <i style={{ width: `${Math.min(100, item.contribution * 2.2)}%` }} />
            </div>
            <small>{localizeCurrencyText(item.reason)}</small>
          </div>
        ))}
      </div>
      <div className="evidence-meta">
        <span>Confidence <strong>{Math.round(finding.confidence * 100)}%</strong></span>
        <span>Window <strong>{dateSpan(finding)}</strong></span>
      </div>
      <div className="evidence-actions">
        <Button
          onClick={() => exportFindings([finding])}
          leadingIcon={<UploadCloud size={15} />}
        >
          Export
        </Button>
        <Button
          variant="primary"
          onClick={() => onSendToReview(finding)}
          trailingIcon={<ArrowRight size={16} />}
        >
          Send to review
        </Button>
      </div>
      <p className="human-note">
        <LockKeyhole size={13} /> Recommendation is advisory. Analyst approval is required.
      </p>
    </aside>
  );
}

function EdaPanel({ result }: { result: InvestigationResponse }) {
  if (!result.eda) return null;
  return (
    <section className="panel eda-panel">
      <header className="panel__header">
        <div>
          <span className="section-kicker">Selective EDA</span>
          <h2>Dataset baseline</h2>
        </div>
        <span className="status-pill"><Check size={13} /> Quality checked</span>
      </header>
      <div className="eda-grid">
        <div><span>Total volume</span><strong>{formatInr(result.eda.totalVolume)}</strong></div>
        <div><span>Median amount</span><strong>{formatInr(result.eda.medianAmount)}</strong></div>
        <div><span>Customer count</span><strong>{result.eda.customerCount}</strong></div>
        <div><span>Quality issues</span><strong>{Object.values(result.eda.dataQuality).reduce((a, b) => a + b, 0)}</strong></div>
      </div>
      <div className="eda-charts">
        <DistributionChart
          title="Transaction mix"
          data={result.eda.typeDistribution}
        />
        <DistributionChart
          title="Country distribution"
          data={result.eda.countryDistribution}
        />
      </div>
    </section>
  );
}

function DistributionChart({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((left, right) => right[1] - left[1]);
  const total = Math.max(
    1,
    entries.reduce((sum, [, count]) => sum + count, 0),
  );
  return (
    <article className="distribution-chart">
      <div className="distribution-chart__heading">
        <strong>{title}</strong>
        <span>{total.toLocaleString()} records</span>
      </div>
      <div className="distribution-chart__plot">
        {entries.slice(0, 7).map(([label, count]) => (
          <div key={label}>
            <span>{label.replaceAll("_", " ")}</span>
            <div>
              <i style={{ width: `${Math.max(3, (count / total) * 100)}%` }} />
            </div>
            <strong>{Math.round((count / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading investigation">
      <Skeleton /><Skeleton /><Skeleton /><Skeleton />
      <Skeleton className="dashboard-skeleton__panel" />
      <Skeleton className="dashboard-skeleton__panel" />
    </div>
  );
}

function shortenExample(example: string): string {
  if (example.includes("structuring")) return "Structuring · 30 days";
  if (example.includes("10+")) return "10+ under ₹10k";
  if (example.includes("4521")) return "Customer 4521";
  return example;
}

function dateSpan(finding: RiskFinding): string {
  const start = new Date(finding.windowStart);
  const end = new Date(finding.windowEnd);
  const days = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  return `${days} day${days === 1 ? "" : "s"}`;
}

function formatCompactDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function patternCounts(findings: RiskFinding[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.pattern, (counts.get(finding.pattern) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

const TRANSACTION_TYPES = new Set<Transaction["type"]>([
  "cash_deposit",
  "cash_withdrawal",
  "wire_in",
  "wire_out",
  "card",
  "ach",
]);

function parseTransactionsCsv(source: string): Transaction[] {
  const rows = parseCsv(source);
  if (rows.length < 2) {
    throw new Error("CSV must contain a header and at least one transaction.");
  }
  const headers = (rows[0] ?? []).map((header) =>
    header.trim().toLowerCase().replaceAll(" ", "_"),
  );
  const get = (row: string[], ...names: string[]) => {
    const index = names
      .map((name) => headers.indexOf(name))
      .find((candidate) => candidate >= 0);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };

  const transactions = rows.slice(1).filter((row) => row.some(Boolean)).map(
    (row, index): Transaction => {
      const id = get(row, "id", "transaction_id", "transactionid");
      const customerId = get(row, "customer_id", "customerid");
      const timestampValue = get(row, "timestamp", "date", "transaction_date");
      const amount = Number(get(row, "amount", "transaction_amount"));
      const typeValue = get(row, "type", "transaction_type") as Transaction["type"];
      const timestamp = new Date(timestampValue);

      if (!id || !customerId || !Number.isFinite(amount) || timestamp.toString() === "Invalid Date") {
        throw new Error(
          `CSV row ${index + 2} needs a valid id, customer_id, timestamp, and amount.`,
        );
      }
      if (!TRANSACTION_TYPES.has(typeValue)) {
        throw new Error(
          `CSV row ${index + 2} has unsupported type "${typeValue}".`,
        );
      }

      const segmentValue = get(row, "segment") as Transaction["segment"];
      const channelValue = get(row, "channel") as Transaction["channel"];
      return {
        id,
        customerId,
        timestamp: timestamp.toISOString(),
        amount,
        currency: (get(row, "currency") || "INR").toUpperCase(),
        type: typeValue,
        country: (get(row, "country") || "US").toUpperCase(),
        segment: ["retail", "business", "private"].includes(segmentValue)
          ? segmentValue
          : "retail",
        channel: ["branch", "online", "mobile", "atm"].includes(channelValue)
          ? channelValue
          : "online",
        ...(get(row, "branch_id", "branchid")
          ? { branchId: get(row, "branch_id", "branchid") }
          : {}),
        ...(get(row, "counterparty_id", "counterpartyid")
          ? { counterpartyId: get(row, "counterparty_id", "counterpartyid") }
          : {}),
      };
    },
  );

  if (transactions.length > 100_000) {
    throw new Error("CSV exceeds the 100,000 transaction demo limit.");
  }
  return transactions;
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function exportFindings(findings: RiskFinding[]): void {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          purpose: "Analyst decision-support evidence",
          humanReviewRequired: true,
          findings,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ciphersar-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
