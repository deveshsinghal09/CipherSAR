# Five-minute demo script

## 1. Frame the problem — 30 seconds

"Static AML rules generate too many alerts and still miss multi-step behavior. CipherSAR lets an analyst ask a compliance question and creates the smallest defensible investigation plan for that query."

## 2. Targeted typology — 60 seconds

Run:

```text
Find structuring patterns in the last 30 days
```

Show:

- parsed structuring intent and 30-day filter;
- dynamic plan steps;
- selective EDA and unrelated tools in the skipped section;
- `CUS-4521`, evidence, score contributions, confidence, and action.

## 3. Deterministic query — 45 seconds

Run:

```text
Which customers made 10+ transactions under $10,000?
```

Point out that CipherSAR uses direct aggregation and does not invoke ML when it is unnecessary.

## 4. Single-customer investigation — 45 seconds

Run:

```text
Is customer ID 4521 suspicious?
```

Show the lookup-first plan, entity-specific scope, and explanation.

## 5. Broad investigation — 60 seconds

Run:

```text
Analyse this dataset for suspicious activity
```

Show selective EDA, multiple typologies, trained-model evidence, risk distribution, and data-quality summary. Open **Model intelligence** and show the holdout metrics, leading features, training scale, and decision-support limitation.

## 6. Data portability and governance — 45 seconds

- Import `data/demo-transactions.csv`.
- Export the findings evidence package.
- Point out the persistent "decision support only" and human-review controls.

## 7. Close — 15 seconds

"CipherSAR reduces unnecessary computation and alert noise while giving investigators evidence they can inspect, challenge, and defend."

## Judge questions

**Is this really an agent?**  
Yes. The query parser and planner choose tools and sequence per request. The returned plan trace proves which tools were run and skipped.

**Did you train a model?**  
Yes. The selected balanced random forest was trained on 10,000 labelled IBM AMLSim accounts and 1,323,234 transactions. On the untouched test set it achieved 99.4% precision, 67.9% recall, 89.2% PR-AUC, and 95.1% ROC-AUC. CipherSAR still skips ML for direct threshold questions and retains explainable rules for known typologies.

**Can this file reports automatically?**  
No. Recommendations are advisory; an authorized human must review and approve escalation.

**How would you productionize it?**  
Add institutional calibration, access control, case management, immutable audit logs, entity resolution, policy packs, independent validation, and monitored deployment.
