# CipherSAR AML account-risk model card

## Model

- ID: `ciphersar-ibm-amlsim-random-forest-v1`
- Type: balanced random forest
- Role: advisory decision support
- Runtime: portable JSON evaluated by the TypeScript API
- Decision threshold: 0.815, selected on the validation partition

The model ranks account-level suspicious behavior. It does not determine criminal intent, file a SAR/STR, or replace an authorized investigator.

## Training data

The model uses the synthetic [IBM AMLSim Example Dataset](https://www.kaggle.com/datasets/anshankul/ibm-amlsim-example-dataset/data), Kaggle slug `anshankul/ibm-amlsim-example-dataset`, distributed under Apache 2.0.

| File | Use |
| --- | --- |
| `accounts.csv` | Account ID and `IS_FRAUD` label |
| `transactions.csv` | Sender, receiver, amount, and simulated time step |
| `alerts.csv` | Label provenance and `fan_in` / `cycle` alert context |

Scale: 10,000 accounts, 1,323,234 transactions, and 1,719 labelled suspicious alerts. Raw files are gitignored.

## Features

Features are account aggregates available in both the training data and CipherSAR's runtime transaction contract:

- sent and received counts, sums, means, standard deviations, and maxima;
- unique inbound, outbound, and combined counterparties;
- total count and value;
- inbound/outbound flow ratio and net flow;
- active time span.

This deliberately avoids customer names and protected personal attributes.

## Validation

Accounts are split with a fixed seed and stratification: 70% training, 15% validation, and 15% untouched test. Validation PR-AUC selects between a class-weighted logistic regression baseline and the balanced random forest. The validation partition also selects the F1 threshold; the test partition is used only for final reporting.

| Test metric | Result |
| --- | ---: |
| Precision | 0.9942 |
| Recall | 0.6786 |
| F1 | 0.8066 |
| PR-AUC | 0.8922 |
| ROC-AUC | 0.9505 |
| True positive / false positive | 171 / 1 |
| True negative / false negative | 1,247 / 81 |

These figures describe synthetic AMLSim performance only. They must not be presented as expected bank-production results.

## Hybrid use

CipherSAR invokes the model selectively:

- direct threshold queries use aggregation and skip ML;
- targeted structuring/smurfing/layering queries use the requested explainable rule;
- broad anomaly and high-risk ranking queries combine rules, robust statistics, and trained-model probability.

For a model flag, the response records its probability, configured threshold, leading feature evidence, confidence, advisory risk score, and required analyst action.

An applicability gate prevents domain-shift overreach: inference requires at least 20 transactions and an 80% or greater wire-transfer share. Mixed retail card/cash populations continue through the rule and robust-statistical layers unless they contain a comparable transfer history.

## Reproducibility

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r ml/requirements.txt
.venv/Scripts/python ml/train.py
```

The trainer uses fixed package versions and random seed 42. It writes the complete model selection, split, metrics, provenance, governance notes, feature importances, and forest nodes to `apps/api/src/ml/aml-account-risk-v1.json`.

## Limitations and controls

- AMLSim is synthetic and has simplified behavioral distributions.
- Account aggregates may reveal suspicious network behavior but cannot establish intent.
- Recall is materially below precision; the rule layer remains important for known typologies.
- Production use requires institution-specific labelled data, temporal validation, segment testing, calibration, drift monitoring, fairness review, security review, and independent model validation.
- Every escalation remains subject to human approval.
