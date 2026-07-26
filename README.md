# CipherSAR

> An adaptive, explainable AML investigation agent for financial institutions.

CipherSAR turns a compliance analyst's natural-language question into a query-specific investigation plan. It selects only the tools needed for that request, detects suspicious activity with a hybrid rule/statistical ensemble, and returns defensible evidence, risk, confidence, and an escalation recommendation.

The interface is presented as a bank-neutral internal Financial Crime Compliance workspace. CipherSAR is decision-support software: every escalation requires human review.

## Live deployment

- **Frontend:** https://ciphersar.vercel.app
- **Backend health:** https://ciphersar-api.onrender.com/api/health
- **Backend platform:** Render free web service in Singapore
- **Frontend platform:** Vercel production deployment

The frontend receives `VITE_API_BASE_URL` at build time and communicates with the Render API over HTTPS. The free Render service can take up to approximately 50 seconds to wake after a period of inactivity.

## Operational workspace

The sidebar modules are fully functional:

- **Command center** runs natural-language AML investigations and exposes the dynamic tool trace.
- **Investigations** records completed runs and reopens their exact findings and plans.
- **Review queue** tracks pending, in-review, resolved, and reopened findings with audit events.
- **Customers** searches the active population and starts single-entity investigations.
- **Transactions** searches and filters activity, highlights linked evidence, and pivots to customer review.
- **Datasets** imports validated CSV data, reports coverage, and restores the deterministic demo dataset.
- **Model intelligence** exposes the active model, holdout metrics, leading features, dataset provenance, and governance limitations.
- **Audit trail** records investigation, review, dataset, policy, and system events.
- **Policy settings** changes the backend risk bands, escalation thresholds, and minimum report confidence for subsequent analysis.

## Why it exists

Traditional AML systems often create large alert volumes through static rules. Investigators then spend time dismissing false positives while sophisticated structuring, smurfing, layering, velocity, and rapid cash-out behavior can cross multiple rules or channels.

CipherSAR addresses that problem with:

- natural-language intent, entity, threshold, date, geography, segment, and transaction-type extraction;
- a dynamic planner that skips irrelevant work instead of running a fixed pipeline;
- on-demand AML feature engineering;
- hybrid deterministic, robust statistical, and trained-model detection;
- explainable 0–100 advisory risk scoring;
- evidence-linked `monitor`, `review`, or `report` recommendations;
- a visible execution trace showing what the agent ran, skipped, and why.

## Adaptive behavior

| Query | Plan chosen by CipherSAR |
| --- | --- |
| `Find structuring patterns in the last 30 days` | Filter by date, build structuring-only features, run the structuring detector, score, explain, recommend. Full EDA and unrelated velocity tools are skipped. |
| `Which customers made 10+ transactions under ₹10,000?` | Apply amount filters and direct aggregation. No ML/anomaly detector is invoked. |
| `Is customer ID 4521 suspicious?` | Resolve the entity, analyse only that customer's history, and explain its current evidence. Full-population EDA is skipped. |
| `Analyse this dataset for suspicious activity` | Run selective EDA, broad AML feature engineering, and the hybrid anomaly ensemble. |

Every API response contains `decisionSummary`, `parsedQuery`, `plan.steps`, `plan.skippedTools`, `metrics`, `findings`, top linked transactions, and model-governance safeguards.

## Requirement coverage

| Required capability | CipherSAR implementation |
| --- | --- |
| Intent, filters, entity, and AML pattern extraction | `parseQuery` extracts date ranges, relative dates, segment, country, transaction type, amount thresholds, customer IDs, and six AML pattern families. |
| Dynamic execution planning | `buildExecutionPlan` selects and orders only relevant tools and records why unused tools were skipped. |
| Query-relevant loading and preprocessing | Dataset loading is followed by filter-first or entity-first subsetting before any feature computation. |
| Selective EDA | Broad analysis invokes `selective_eda`; targeted, threshold, and single-customer paths skip it. |
| On-demand AML features | Customer features include frequency, rolling 24-hour count, rolling 7-day amount, robust amount deviation, branch/country spread, velocity, flow-through, and 48-hour rapid cash-out signals. |
| Hybrid anomaly detection | Pattern rules, robust MAD-based statistics, deterministic aggregation, and the trained balanced random forest are invoked according to query intent. |
| Risk classification | Evidence contributions are calibrated to 0–100 and classified with configurable low, medium, and high thresholds. |
| Query-tied explanations | Each finding cites the original request, detected pattern, observed evidence, confidence, and feature contributions. |
| Escalation recommendation | Configurable policy maps evidence to `monitor`, `review`, or `report`; human approval always remains mandatory. |
| Judge-inspectable structured output | `decisionSummary`, parsed filters, selected/skipped tools, scope reduction, top transactions, findings, charts, metrics, safeguards, and the full tool trace are returned or displayed. |

The investigation agent does not require Gemini or another hosted LLM to function. Deterministic orchestration keeps detection reproducible, explainable, and available offline. Gemini is used only as an optional server-side writing layer in Report Studio; without a key, CipherSAR creates a deterministic local report draft. Gemini never controls detection, scoring, or escalation.

## Detection approach

CipherSAR uses a hybrid approach. Targeted rules remain the best tool for explicit typology or threshold questions, while broad investigations can invoke a trained account-risk model alongside robust population statistics.

1. **Rules** identify known AML typologies:
   - structuring near a reporting threshold;
   - distributed small deposits / smurfing;
   - rapid in/out wire flow / layering;
   - unusual transaction velocity;
   - rapid cash-out after incoming funds.
2. **Robust statistics** use median and median absolute deviation (MAD) to detect population-relative outliers without assuming a normal distribution.
3. **Supervised ML** uses a balanced random forest trained on IBM AMLSim account labels. The selected model is exported as portable JSON and evaluated directly by the Node.js API.
4. **Risk calibration** combines independent evidence contributions into a capped 0–100 score.
5. **Explanation** preserves observed feature values, model probability, and reasons that contributed to the score.
6. **Action policy** maps the evidence to `monitor`, `review`, or `report`, while retaining mandatory human approval.

Model selection used validation PR-AUC to compare a class-weighted logistic baseline with a balanced random forest. The untouched 1,500-account test set produced 99.4% precision, 67.9% recall, 80.7% F1, 89.2% PR-AUC, and 95.1% ROC-AUC. These are synthetic-dataset results, not claims about production performance.

To control domain shift, trained inference is gated to histories with at least 20 transactions and an 80% wire-transfer share. Incompatible mixed retail data remains with the rule/statistical layers instead of receiving a misleading model score.

## Architecture

```mermaid
flowchart LR
    A["Analyst query + optional CSV"] --> B["Intent and filter parser"]
    B --> C["Dynamic planner"]
    C --> D{"Query scope"}
    D -->|"Threshold"| E["Direct aggregation"]
    D -->|"Pattern"| F["On-demand AML features"]
    D -->|"Customer"| G["Single-entity lookup"]
    D -->|"Broad"| H["Selective EDA + rules + statistics + trained model"]
    E --> I["Risk calibration"]
    F --> I
    G --> I
    H --> I
    I --> J["Evidence explanation"]
    J --> K["Monitor / Review / Report"]
    K --> L["UI + auditable plan trace"]
```

The monorepo contains:

```text
apps/
  api/       Express API, agent planner, tools, detectors, synthetic dataset
  web/       React command center, CSV import, evidence export
packages/
  shared/    Shared TypeScript request/response contracts
ml/          Reproducible feature engineering, training, model selection
docs/        Architecture, dataset schema, demo, and contribution guidance
docker/      Production container definitions
```

## Dataset

The repository uses two synthetic data sources. The **IBM AMLSim Example Dataset** trains the supervised model with 10,000 labelled accounts, 1,323,234 transfer transactions, and 1,719 suspicious alerts across `fan_in` and `cycle` patterns. The Kaggle slug is `anshankul/ibm-amlsim-example-dataset`, licensed under Apache 2.0.

The live judge experience uses a deterministic CipherSAR retail-banking generator with:

- 35 customers across retail and business segments;
- normal card, ACH, and wire activity;
- customer `CUS-4521`: repeated cash deposits close to ₹10,000;
- customer `CUS-3108`: distributed small cash deposits across branches;
- customer `CUS-8842`: fast inbound/outbound cross-border wire flows.

Raw Kaggle files are intentionally gitignored. No real customer or financial data is included. See [Dataset schema](docs/DATASET.md), [model card](docs/MODEL_CARD.md), and the ready-to-import [demo CSV](data/demo-transactions.csv).

## Tech stack

- TypeScript with strict type checking
- React 19 + Vite
- Node.js + Express
- Optional Gemini Interactions API for report drafting
- jsPDF for reviewer PDF export
- Python 3.11, pandas, and scikit-learn for offline training
- Zod request validation
- Vitest + Supertest
- Docker + Nginx
- GitHub Actions

The interface is a responsive light-theme forensic command center with bank-neutral branding, model-governance surfaces, clear risk states, a persistent navigation shell, query-aware visualizations, and explicit human-control messaging.

## Local setup

Prerequisites: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

### Optional Gemini report drafting

Copy `.env.example` to `.env`, then add a newly generated Google AI Studio key:

```dotenv
GEMINI_API_KEY=your_new_key_here
GEMINI_MODEL=gemini-3.6-flash
```

The key is read only by the Express API and must never be prefixed with `VITE_` or committed to Git. If the key is absent, invalid, rate-limited, or unavailable, Report Studio automatically produces a local deterministic draft and identifies the fallback in the UI.

Useful commands:

```bash
npm test
npm run typecheck
npm run build
npm run dev:api
npm run dev:web
```

### Reproduce model training

Download and extract the [IBM AMLSim Example Dataset](https://www.kaggle.com/datasets/anshankul/ibm-amlsim-example-dataset/data) so its CSV files are under `data/raw/ibm-amlsim-example-dataset`, then run:

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r ml/requirements.txt
.venv/Scripts/python ml/train.py
```

On macOS/Linux, use `.venv/bin/python`. The command regenerates `apps/api/src/ml/aml-account-risk-v1.json` with a fixed seed, model-selection results, test metrics, feature importances, and portable decision trees.

## Usage

### Command center

1. Open the dashboard.
2. Try one of the example compliance questions.
3. Inspect the parsed intent, invoked steps, and intentionally skipped tools.
4. Select a suspicious entity to inspect its evidence and score contributions.
5. Use **Import data** to analyse a CSV matching the documented schema.
6. Use **Export evidence** to download the current findings as JSON.

### AI Report Studio

1. Complete at least one investigation.
2. Open **AI Report Studio** from the sidebar.
3. Select the source investigation and choose an executive summary, case narrative, or SAR review brief.
4. Generate the controlled draft and verify its source badge, evidence, limitations, and human-review notice.
5. Select **Download PDF** to export the reviewer copy.

Report drafts are decision support only. They are not filed SARs and do not replace a qualified compliance professional.

### API

Use the built-in synthetic dataset:

```bash
curl -X POST http://localhost:4000/api/investigations \
  -H "Content-Type: application/json" \
  -d '{"query":"Is customer ID 4521 suspicious?"}'
```

Analyse supplied data by adding `transactions` and, optionally, `customers` to the JSON body. The API validates a maximum of 100,000 records per collection.

Endpoints:

- `GET /api/health`
- `GET /api/examples`
- `GET /api/dataset/summary`
- `GET /api/dataset`
- `GET /api/model`
- `POST /api/investigations`
- `POST /api/reports`

## Docker

```bash
docker compose up --build
```

Open `http://localhost:8080`. Nginx serves the web app and proxies `/api` to the API container.

## Testing

The automated suite covers:

- query parsing and entity/filter extraction;
- plan adaptation and tool skipping;
- pattern detectors and risk scoring;
- trained-model metadata and portable runtime inference;
- end-to-end agent behavior;
- API health, validation, and investigations.

CI runs install, strict type checks, all tests, and the production build on every push and pull request.

## Governance and limitations

- A flag is evidence for review, not proof of money laundering.
- Scores are advisory and must not autonomously file a SAR/STR.
- Thresholds require institution-, product-, jurisdiction-, and segment-specific calibration.
- A production deployment requires authentication, authorization, encryption, retention controls, monitoring, data-lineage controls, independent validation, and regulatory/legal review.
- Holdout metrics measure this particular synthetic AMLSim dataset only and do not establish real-world performance.

See [Architecture and controls](docs/ARCHITECTURE.md) for the production-hardening path.

## Data sources

- Model training: [IBM AMLSim Example Dataset on Kaggle](https://www.kaggle.com/datasets/anshankul/ibm-amlsim-example-dataset/data), Apache 2.0.
- Live demo transactions and customer records: deterministic synthetic data generated locally in `apps/api/src/data/sample-data.ts`.
- AML pattern definitions: implemented from the challenge brief's structuring, smurfing, and layering examples and commonly understood transaction-monitoring concepts.
- No personal information is bundled with the repository. Gemini is optional and receives only the selected investigation summary and top findings when explicitly invoked from Report Studio.

## Contribution traceability

All work must be committed from the contributor's own GitHub account. Do not rewrite authorship or commit another person's work under their name.

- **Devesh Singhal** — repository owner and initial implementation.
- **Ankit Marik** — collaborator (`AnkitKumar61`); trained-model integration, model intelligence UI, evaluation, and associated documentation are developed on the current feature branch.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [Contribution workflow](docs/CONTRIBUTIONS.md).

## License

MIT — see [LICENSE](LICENSE).
