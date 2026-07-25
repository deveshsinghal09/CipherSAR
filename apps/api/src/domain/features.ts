import type { Transaction } from "@ciphersar/shared";
import { median, robustZScore, sum } from "./statistics";

export interface CustomerFeatures {
  customerId: string;
  transactions: Transaction[];
  transactionCount: number;
  totalAmount: number;
  medianAmount: number;
  activeDays: number;
  activeSpanDays: number;
  branchCount: number;
  countryCount: number;
  counterpartyCount: number;
  maxDailyCount: number;
  cashDepositCount: number;
  nearThresholdCount: number;
  smallCashCount: number;
  cashDepositAmount: number;
  inboundAmount: number;
  outboundAmount: number;
  wireInCount: number;
  wireOutCount: number;
  rapidFlowRatio: number;
  countRobustZ: number;
  volumeRobustZ: number;
  medianAmountRobustZ: number;
}

export function groupByCustomer(
  transactions: Transaction[],
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.customerId) ?? [];
    group.push(transaction);
    groups.set(transaction.customerId, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  }
  return groups;
}

export function engineerCustomerFeatures(
  transactions: Transaction[],
): CustomerFeatures[] {
  const basic = [...groupByCustomer(transactions)].map(([customerId, items]) =>
    basicFeatures(customerId, items),
  );
  const counts = basic.map((item) => item.transactionCount);
  const volumes = basic.map((item) => item.totalAmount);
  const medians = basic.map((item) => item.medianAmount);

  return basic.map((item) => ({
    ...item,
    countRobustZ: robustZScore(item.transactionCount, counts),
    volumeRobustZ: robustZScore(item.totalAmount, volumes),
    medianAmountRobustZ: robustZScore(item.medianAmount, medians),
  }));
}

function basicFeatures(
  customerId: string,
  transactions: Transaction[],
): Omit<
  CustomerFeatures,
  "countRobustZ" | "volumeRobustZ" | "medianAmountRobustZ"
> {
  const amounts = transactions.map((transaction) => transaction.amount);
  const dateCounts = new Map<string, number>();
  const dates = transactions.map((transaction) =>
    transaction.timestamp.slice(0, 10),
  );
  for (const date of dates) dateCounts.set(date, (dateCounts.get(date) ?? 0) + 1);

  const first = transactions[0]?.timestamp;
  const last = transactions.at(-1)?.timestamp;
  const activeSpanDays =
    first && last
      ? Math.max(
          1,
          Math.ceil(
            (new Date(last).getTime() - new Date(first).getTime()) / 86_400_000,
          ) + 1,
        )
      : 0;

  const cashDeposits = transactions.filter(
    (transaction) => transaction.type === "cash_deposit",
  );
  const outbound = transactions.filter((transaction) =>
    ["cash_withdrawal", "wire_out", "ach"].includes(transaction.type),
  );
  const cashDepositAmount = sum(cashDeposits.map((item) => item.amount));
  const inboundAmount = sum(
    transactions
      .filter((transaction) =>
        ["cash_deposit", "wire_in"].includes(transaction.type),
      )
      .map((item) => item.amount),
  );
  const outboundAmount = sum(outbound.map((item) => item.amount));

  return {
    customerId,
    transactions,
    transactionCount: transactions.length,
    totalAmount: sum(amounts),
    medianAmount: median(amounts),
    activeDays: new Set(dates).size,
    activeSpanDays,
    branchCount: new Set(
      transactions.map((transaction) => transaction.branchId).filter(Boolean),
    ).size,
    countryCount: new Set(transactions.map((transaction) => transaction.country))
      .size,
    counterpartyCount: new Set(
      transactions
        .map((transaction) => transaction.counterpartyId)
        .filter(Boolean),
    ).size,
    maxDailyCount: Math.max(0, ...dateCounts.values()),
    cashDepositCount: cashDeposits.length,
    nearThresholdCount: cashDeposits.filter(
      (transaction) => transaction.amount >= 8_000 && transaction.amount < 10_000,
    ).length,
    smallCashCount: cashDeposits.filter(
      (transaction) => transaction.amount >= 500 && transaction.amount < 3_000,
    ).length,
    cashDepositAmount,
    inboundAmount,
    outboundAmount,
    wireInCount: transactions.filter((item) => item.type === "wire_in").length,
    wireOutCount: transactions.filter((item) => item.type === "wire_out").length,
    rapidFlowRatio:
      inboundAmount > 0 ? Math.min(2, outboundAmount / inboundAmount) : 0,
  };
}
