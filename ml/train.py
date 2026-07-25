"""Train CipherSAR's portable AML account-risk model on IBM AMLSim data."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


FEATURES = [
    "sent_count",
    "sent_sum",
    "sent_mean",
    "sent_std",
    "sent_max",
    "sent_unique_counterparties",
    "received_count",
    "received_sum",
    "received_mean",
    "received_std",
    "received_max",
    "received_unique_counterparties",
    "total_count",
    "total_amount",
    "flow_ratio",
    "net_flow",
    "unique_counterparties",
    "active_steps",
]


def aggregate_side(
    transactions: pd.DataFrame,
    account_column: str,
    counterparty_column: str,
    prefix: str,
) -> pd.DataFrame:
    grouped = transactions.groupby(account_column, sort=False)
    result = grouped.agg(
        count=("TX_ID", "count"),
        sum=("TX_AMOUNT", "sum"),
        mean=("TX_AMOUNT", "mean"),
        std=("TX_AMOUNT", "std"),
        max=("TX_AMOUNT", "max"),
        unique_counterparties=(counterparty_column, "nunique"),
        first_step=("TIMESTAMP", "min"),
        last_step=("TIMESTAMP", "max"),
    )
    result.columns = [f"{prefix}_{column}" for column in result.columns]
    return result


def build_features(data_dir: Path) -> tuple[pd.DataFrame, pd.Series]:
    accounts = pd.read_csv(
        data_dir / "accounts.csv",
        usecols=["ACCOUNT_ID", "IS_FRAUD"],
    )
    transactions = pd.read_csv(
        data_dir / "transactions.csv",
        usecols=[
            "TX_ID",
            "SENDER_ACCOUNT_ID",
            "RECEIVER_ACCOUNT_ID",
            "TX_AMOUNT",
            "TIMESTAMP",
        ],
        dtype={
            "TX_ID": "int64",
            "SENDER_ACCOUNT_ID": "int32",
            "RECEIVER_ACCOUNT_ID": "int32",
            "TX_AMOUNT": "float64",
            "TIMESTAMP": "int16",
        },
    )

    sent = aggregate_side(
        transactions, "SENDER_ACCOUNT_ID", "RECEIVER_ACCOUNT_ID", "sent"
    )
    received = aggregate_side(
        transactions, "RECEIVER_ACCOUNT_ID", "SENDER_ACCOUNT_ID", "received"
    )
    frame = accounts.set_index("ACCOUNT_ID").join(sent).join(received).fillna(0)

    frame["total_count"] = frame["sent_count"] + frame["received_count"]
    frame["total_amount"] = frame["sent_sum"] + frame["received_sum"]
    frame["flow_ratio"] = frame["received_sum"] / (frame["sent_sum"] + 1.0)
    frame["net_flow"] = frame["received_sum"] - frame["sent_sum"]
    frame["unique_counterparties"] = (
        frame["sent_unique_counterparties"] + frame["received_unique_counterparties"]
    )
    first_step = frame[["sent_first_step", "received_first_step"]].replace(0, np.nan).min(axis=1)
    last_step = frame[["sent_last_step", "received_last_step"]].max(axis=1)
    frame["active_steps"] = (last_step - first_step).fillna(0).clip(lower=0) + 1
    labels = frame["IS_FRAUD"].astype(str).str.lower().eq("true").astype(int)
    return frame[FEATURES].replace([np.inf, -np.inf], 0).fillna(0), labels


def choose_threshold(labels: pd.Series, probabilities: np.ndarray) -> float:
    candidates = np.linspace(0.05, 0.95, 181)
    scores = [f1_score(labels, probabilities >= value) for value in candidates]
    return float(candidates[int(np.argmax(scores))])


def evaluate(
    labels: pd.Series, probabilities: np.ndarray, threshold: float
) -> dict[str, object]:
    predictions = probabilities >= threshold
    tn, fp, fn, tp = confusion_matrix(labels, predictions).ravel()
    return {
        "accounts": int(len(labels)),
        "fraud_accounts": int(labels.sum()),
        "threshold": round(threshold, 4),
        "precision": round(float(precision_score(labels, predictions)), 4),
        "recall": round(float(recall_score(labels, predictions)), 4),
        "f1": round(float(f1_score(labels, predictions)), 4),
        "pr_auc": round(float(average_precision_score(labels, probabilities)), 4),
        "roc_auc": round(float(roc_auc_score(labels, probabilities)), 4),
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("data/raw/ibm-amlsim-example-dataset"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("apps/api/src/ml/aml-account-risk-v1.json"),
    )
    args = parser.parse_args()

    features, labels = build_features(args.data_dir)
    train_x, remainder_x, train_y, remainder_y = train_test_split(
        features,
        labels,
        test_size=0.30,
        random_state=42,
        stratify=labels,
    )
    validation_x, test_x, validation_y, test_y = train_test_split(
        remainder_x,
        remainder_y,
        test_size=0.50,
        random_state=42,
        stratify=remainder_y,
    )

    scaler = StandardScaler().fit(train_x)
    logistic = LogisticRegression(
        class_weight="balanced",
        max_iter=2_000,
        random_state=42,
        solver="liblinear",
    ).fit(scaler.transform(train_x), train_y)
    logistic_validation = logistic.predict_proba(
        scaler.transform(validation_x)
    )[:, 1]
    forest = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=5,
        class_weight="balanced_subsample",
        max_features=0.75,
        n_jobs=-1,
        random_state=42,
    ).fit(train_x, train_y)
    forest_validation = forest.predict_proba(validation_x)[:, 1]
    candidates = {
        "class-weighted logistic regression": float(
            average_precision_score(validation_y, logistic_validation)
        ),
        "balanced random forest": float(
            average_precision_score(validation_y, forest_validation)
        ),
    }
    selected_name = max(candidates, key=candidates.get)
    if selected_name != "balanced random forest":
        raise RuntimeError("The portable forest was not the best validation candidate.")

    threshold = choose_threshold(validation_y, forest_validation)
    test_probabilities = forest.predict_proba(test_x)[:, 1]
    metrics = evaluate(test_y, test_probabilities, threshold)

    top_features = sorted(
        (
            {"feature": name, "importance": round(float(value), 6)}
            for name, value in zip(FEATURES, forest.feature_importances_, strict=True)
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )[:8]
    trees = []
    for estimator in forest.estimators_:
        tree = estimator.tree_
        leaf_probabilities = []
        for node_value in tree.value:
            counts = node_value[0]
            total = float(counts.sum())
            leaf_probabilities.append(
                round(float(counts[1] / total), 8) if total else 0.0
            )
        trees.append(
            {
                "left": tree.children_left.tolist(),
                "right": tree.children_right.tolist(),
                "feature": tree.feature.tolist(),
                "threshold": [
                    round(float(value), 8) for value in tree.threshold.tolist()
                ],
                "probability": leaf_probabilities,
            }
        )
    artifact = {
        "schemaVersion": 1,
        "modelId": "ciphersar-ibm-amlsim-random-forest-v1",
        "modelType": "balanced random forest",
        "trainedAt": pd.Timestamp.now(tz="UTC").isoformat(),
        "dataset": {
            "name": "IBM AMLSim Example Dataset",
            "kaggleSlug": "anshankul/ibm-amlsim-example-dataset",
            "license": "Apache 2.0",
            "accounts": int(len(features)),
            "transactions": 1_323_234,
            "positiveAccounts": int(labels.sum()),
        },
        "split": {
            "strategy": "stratified account holdout",
            "train": int(len(train_x)),
            "validation": int(len(validation_x)),
            "test": int(len(test_x)),
            "randomSeed": 42,
        },
        "features": FEATURES,
        "selection": {
            "metric": "validation PR-AUC",
            "candidates": {
                name: round(score, 4) for name, score in candidates.items()
            },
            "selected": selected_name,
        },
        "decisionThreshold": round(threshold, 4),
        "metrics": metrics,
        "topFeatures": top_features,
        "trees": trees,
        "governance": {
            "role": "decision_support",
            "limitations": [
                "The model was trained on synthetic AMLSim behavior, not production bank data.",
                "Account aggregates can identify network behavior but do not establish criminal intent.",
                "Institution-specific validation, drift monitoring, and human review are required.",
            ],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
