import type { FeatureContribution, ModelMetadata, Transaction } from "@ciphersar/shared";
import artifactJson from "./aml-account-risk-v1.json";
import type { CustomerFeatures } from "../domain/features";
import { clamp, mean, round, sum } from "../domain/statistics";

interface PortableTree {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  probability: number[];
}

interface ModelArtifact {
  modelId: string;
  modelType: string;
  trainedAt: string;
  dataset: {
    name: string;
    accounts: number;
    transactions: number;
  };
  features: string[];
  decisionThreshold: number;
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    pr_auc: number;
    roc_auc: number;
  };
  topFeatures: Array<{ feature: string; importance: number }>;
  trees: PortableTree[];
}

const artifact = artifactJson as unknown as ModelArtifact;
const OUTBOUND = new Set(["wire_out"]);
const INBOUND = new Set(["wire_in"]);

export interface ModelScore {
  applicable: boolean;
  probability: number;
  threshold: number;
  flagged: boolean;
  contributions: FeatureContribution[];
}

export function getModelMetadata(): ModelMetadata {
  return {
    id: artifact.modelId,
    type: artifact.modelType,
    status: "active",
    trainedAt: artifact.trainedAt,
    dataset: artifact.dataset.name,
    datasetAccounts: artifact.dataset.accounts,
    datasetTransactions: artifact.dataset.transactions,
    decisionThreshold: artifact.decisionThreshold,
    metrics: {
      precision: artifact.metrics.precision,
      recall: artifact.metrics.recall,
      f1: artifact.metrics.f1,
      prAuc: artifact.metrics.pr_auc,
      rocAuc: artifact.metrics.roc_auc,
    },
    topFeatures: artifact.topFeatures,
    role: "decision_support",
  };
}

export function scoreCustomerWithModel(feature: CustomerFeatures): ModelScore {
  const transferCount = feature.wireInCount + feature.wireOutCount;
  const transferShare =
    feature.transactionCount > 0 ? transferCount / feature.transactionCount : 0;
  const applicable = transferCount >= 20 && transferShare >= 0.8;
  const values = modelFeatureVector(feature);
  const probabilities = artifact.trees.map((tree) => evaluateTree(tree, values));
  const probability = clamp(mean(probabilities), 0, 1);
  const strongest = artifact.topFeatures.slice(0, 3);
  const contributions: FeatureContribution[] = [
    {
      feature: "trained_model_probability",
      value: `${round(probability * 100, 1)}%`,
      contribution: round(18 + probability * 54, 1),
      reason: `The trained AMLSim model estimated ${round(probability * 100, 1)}% suspicious-account probability.`,
    },
    ...strongest.map(({ feature: name, importance }) => ({
      feature: `model_${name}`,
      value: round(values[artifact.features.indexOf(name)] ?? 0, 2),
      contribution: round(importance * 24, 1),
      reason: `${name.replaceAll("_", " ")} is a leading feature in the validated model.`,
    })),
  ];
  return {
    applicable,
    probability: round(probability, 4),
    threshold: artifact.decisionThreshold,
    flagged: applicable && probability >= artifact.decisionThreshold,
    contributions,
  };
}

function evaluateTree(tree: PortableTree, values: number[]): number {
  let node = 0;
  while ((tree.left[node] ?? -1) !== -1) {
    const featureIndex = tree.feature[node] ?? -1;
    const value = values[featureIndex] ?? 0;
    node =
      value <= (tree.threshold[node] ?? 0)
        ? (tree.left[node] ?? node)
        : (tree.right[node] ?? node);
  }
  return tree.probability[node] ?? 0;
}

function modelFeatureVector(feature: CustomerFeatures): number[] {
  const sent = feature.transactions.filter((item) => OUTBOUND.has(item.type));
  const received = feature.transactions.filter((item) => INBOUND.has(item.type));
  const sentAmounts = sent.map((item) => item.amount);
  const receivedAmounts = received.map((item) => item.amount);
  const sentSum = sum(sentAmounts);
  const receivedSum = sum(receivedAmounts);
  const combinedCounterparties = new Set(
    feature.transactions
      .map((item) => item.counterpartyId)
      .filter((value): value is string => Boolean(value)),
  );
  const lookup: Record<string, number> = {
    sent_count: sent.length,
    sent_sum: sentSum,
    sent_mean: mean(sentAmounts),
    sent_std: standardDeviation(sentAmounts),
    sent_max: Math.max(0, ...sentAmounts),
    sent_unique_counterparties: uniqueCounterparties(sent),
    received_count: received.length,
    received_sum: receivedSum,
    received_mean: mean(receivedAmounts),
    received_std: standardDeviation(receivedAmounts),
    received_max: Math.max(0, ...receivedAmounts),
    received_unique_counterparties: uniqueCounterparties(received),
    total_count: feature.transactionCount,
    total_amount: feature.totalAmount,
    flow_ratio: receivedSum / (sentSum + 1),
    net_flow: receivedSum - sentSum,
    unique_counterparties: combinedCounterparties.size,
    active_steps: feature.activeSpanDays,
  };
  return artifact.features.map((name) => lookup[name] ?? 0);
}

function uniqueCounterparties(transactions: Transaction[]): number {
  return new Set(
    transactions
      .map((item) => item.counterpartyId)
      .filter((value): value is string => Boolean(value)),
  ).size;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    sum(values.map((value) => (value - average) ** 2)) / (values.length - 1),
  );
}
