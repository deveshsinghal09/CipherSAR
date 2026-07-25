# Architecture and decision record

## Core principle

CipherSAR is an agent-driven system, not a fixed ETL pipeline. The parser creates a normalized representation of the analyst's request. The planner uses that representation to choose tools, their order, and their input scope. Only the resulting steps are executed.

## Request lifecycle

1. `parseQuery` extracts intent, AML pattern, customer ID, time range, amount thresholds, count thresholds, country, segment, and transaction type.
2. `buildExecutionPlan` selects required tools and records why other tools were skipped.
3. `InvestigationAgent` executes the plan against a shared, request-local context.
4. Feature tools create only the statistics needed by the selected detector.
5. Detectors emit candidates with evidence and individual score contributions.
6. Risk calibration, explanations, and action recommendations are returned with the executed plan trace.

## Tool registry

| Tool | Responsibility |
| --- | --- |
| `load_dataset` | Creates a request-local data scope. |
| `filter_transactions` | Applies parsed dates, amount, geography, segment, and type filters. |
| `lookup_customer` | Resolves and scopes a single customer. |
| `selective_eda` | Builds a baseline only for broad exploration requests. |
| `aggregate_threshold_activity` | Answers deterministic count/amount questions directly. |
| `engineer_structuring_features` | Creates threshold proximity, cash, branch, and window features. |
| `engineer_velocity_features` | Creates velocity, deviation, counterparty, and flow-through features. |
| `detect_pattern` | Runs one requested typology detector. |
| `detect_general_anomalies` | Runs the hybrid ensemble. |
| `score_risk` | Calibrates advisory scores. |
| `explain_findings` | Converts detector evidence into analyst-readable findings. |
| `recommend_action` | Summarizes policy recommendations. |

## Why robust statistics

Financial transaction amounts are skewed and heavy-tailed. Mean and standard deviation can be distorted by the same extreme values being detected. CipherSAR therefore uses the median and median absolute deviation where population-relative anomaly signals are needed.

The application is training-free by design:

- no labelled AML data is required;
- baseline calculations adapt to the supplied dataset;
- deterministic rules remain transparent;
- demo behavior is repeatable;
- judges can inspect every score contribution.

An optional Isolation Forest or autoencoder can be added behind `detect_general_anomalies` later, but should be validated independently and must not replace clear typology evidence.

## Risk model

Each candidate contains feature contributions with:

- feature name;
- observed value;
- bounded contribution;
- human-readable reason.

The final score is capped at 100. Risk bands are:

- low: monitor;
- medium: analyst review;
- high: report recommendation after authorized review.

Exact thresholds are demo defaults and are intentionally centralized in detector logic for later institution-specific configuration.

## Safety properties

- Schema validation rejects malformed requests before analysis.
- Request bodies are capped at 15 MB and collections at 100,000 records.
- Analysis state is isolated per request.
- No raw dataset is persisted.
- API technology headers are disabled.
- Every response states that human review is required.
- No automated SAR/STR filing integration exists.

## Production hardening

Before production use:

1. Add SSO, role-based access, and case-level authorization.
2. Encrypt data in transit and at rest with managed keys.
3. Store immutable audit events and model/configuration versions.
4. Add jurisdiction-aware policy packs and configurable thresholds.
5. Add entity resolution, sanctions/PEP context, and graph features.
6. Calibrate with historical reviewed alerts and measure precision, recall, alert reduction, and segment drift.
7. Add maker-checker approval for escalation and report filing.
8. Complete independent model validation, privacy assessment, threat modeling, and regulatory review.

## Key source files

- `apps/api/src/agent/query-parser.ts`
- `apps/api/src/agent/planner.ts`
- `apps/api/src/agent/tools.ts`
- `apps/api/src/agent/engine.ts`
- `apps/api/src/domain/features.ts`
- `apps/api/src/domain/detectors.ts`
- `packages/shared/src/types.ts`
