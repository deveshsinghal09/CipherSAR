# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CipherSAR is built for bank anti-money-laundering analysts, compliance reviewers, investigators, and hackathon judges evaluating the quality of an agentic AML workflow. Analysts use it to move from a natural-language question to a reviewable, evidence-backed decision without manually choosing every analytical step.

## Product Purpose

CipherSAR analyzes customer and transaction data for suspicious activity. It interprets a user's query, narrows the data scope, selects only the necessary analytical tools, detects relevant patterns, assigns risk, explains the evidence, and recommends a human-controlled escalation action.

Success means a reviewer can understand what the agent decided, why it selected or skipped each tool, which evidence supports each flag, and what should happen next.

## Positioning

CipherSAR makes the investigation plan itself inspectable. It does not present anomaly scores as an opaque answer: every result includes the parsed intent, filters, analyzed scope, selected and skipped tools, risk contributions, evidence, limitations, and a recommended next action.

## Operating Context

The core workflow starts with a natural-language compliance question such as finding structuring activity in the last 30 days, locating customers with repeated sub-threshold transactions, or investigating one customer. Users can inspect investigations, review queues, customers, transactions, datasets, model information, audit events, and policy thresholds from one workspace.

The product works with its bundled synthetic demonstration dataset and analyst-imported CSV transaction data. Monetary values are presented in Indian rupees.

## Capabilities and Constraints

- The agent dynamically plans investigations and must not run a fixed full pipeline for every query.
- EDA is selective and is skipped for narrow threshold or single-entity questions when it is not necessary.
- Detection uses a hybrid of AML rules, statistical features, and a trained model as decision support.
- Results are classified as low, medium, or high risk and mapped to monitor, review, or report recommendations.
- Every adverse result requires a concise, human-readable explanation and supporting evidence.
- Human review is mandatory before escalation or reporting.
- Existing backend endpoints, transaction logic, model behavior, and data schemas must remain compatible.
- Gemini is an optional server-side report-writing aid. The app must remain usable when no Gemini key is configured.
- Report generation must not imply that an AI-written draft is a filed regulatory report.
- Deployment changes are out of scope until the user explicitly requests them.
- Database persistence is currently optional; MongoDB may be added later but is not required for the report workflow.

## Brand Commitments

The product name is CipherSAR. The interface must feel appropriate for a financial institution: modern, premium, light, precise, trustworthy, and operational. It must avoid generic template-dashboard styling, consumer-fintech playfulness, excessive animation, and decorative effects that weaken reviewer confidence.

## Evidence on Hand

- A runnable React/Vite web application and Express API.
- Agent planning, feature engineering, anomaly detection, risk classification, explanations, and escalation logic with automated tests.
- A deterministic synthetic retail-banking dataset with known AML demonstration patterns.
- Model metadata and evaluation metrics for a balanced random forest trained from AMLSim-derived data.
- No real customer claims, regulatory approvals, bank affiliation, or production deployment assurance may be fabricated.

## Product Principles

- Show the decision path, not only the verdict.
- Preserve human authority over consequential escalation.
- Use the least analytical machinery required by the user's question.
- Make dense evidence fast to scan and easy to defend.
- Degrade safely when optional AI services are unavailable.

## Accessibility & Inclusion

The web interface must support keyboard navigation, visible focus states, readable contrast, reduced-motion preferences, responsive layouts, semantic status feedback, and non-color cues for risk and state.
