import type {
  AmlPattern,
  ParsedQuery,
  QueryFilters,
  QueryIntent,
  TransactionType,
} from "@ciphersar/shared";

const PATTERN_TERMS: Array<[RegExp, AmlPattern]> = [
  [/\bstructur(?:e|ing|ed)\b/i, "structuring"],
  [/\bsmurf(?:ing)?\b/i, "smurfing"],
  [/\blayer(?:ing|ed)?\b/i, "layering"],
  [/\brapid[\s-]*(?:cash[\s-]*)?out\b|\bcash[\s-]*out\b/i, "rapid_cash_out"],
  [/\bvelocity\b|\btoo many transactions\b/i, "unusual_velocity"],
  [/\banomal(?:y|ies|ous)\b|\boutlier/i, "general_anomaly"],
];

const TRANSACTION_TYPES: Array<[RegExp, TransactionType]> = [
  [/\bcash deposits?\b/i, "cash_deposit"],
  [/\bcash withdrawals?\b/i, "cash_withdrawal"],
  [/\bwire(?:s)?\s+(?:in|inbound)\b/i, "wire_in"],
  [/\bwire(?:s)?\s+(?:out|outbound)\b/i, "wire_out"],
  [/\bcard(?:\s+transactions?)?\b/i, "card"],
  [/\bach\b/i, "ach"],
];

function parseMoney(value: string): number {
  const normalized = value.replace(/[,$\s]/g, "").toLowerCase();
  const multiplier = normalized.endsWith("m")
    ? 1_000_000
    : normalized.endsWith("k")
      ? 1_000
      : 1;
  return Number.parseFloat(normalized.replace(/[km]$/, "")) * multiplier;
}

function addIfDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

export function parseQuery(rawQuery: string, now = new Date()): ParsedQuery {
  const raw = rawQuery.trim();
  const filters: QueryFilters = {};
  const lower = raw.toLowerCase();

  const pattern = PATTERN_TERMS.find(([expression]) => expression.test(raw))?.[1];
  const transactionType = TRANSACTION_TYPES.find(([expression]) =>
    expression.test(raw),
  )?.[1];

  const customerMatch = raw.match(
    /\bcustomer(?:\s+id)?\s*(?:is|=|#|:)?\s*([a-z]*-?\d{2,})\b/i,
  );
  const lastDaysMatch = raw.match(/\b(?:last|past|previous)\s+(\d{1,4})\s+days?\b/i);
  const minimumTransactionsMatch = raw.match(
    /\b(\d+)\s*\+?\s*(?:or more\s+)?transactions?\b/i,
  );
  const underMatch = raw.match(
    /\b(?:under|below|less than)\s*\$?\s*([\d,.]+\s*[km]?)\b/i,
  );
  const aboveMatch = raw.match(
    /\b(?:over|above|more than)\s*\$?\s*([\d,.]+\s*[km]?)\b/i,
  );
  const dateRangeMatch = raw.match(
    /\b(?:from|between)\s+(\d{4}-\d{2}-\d{2})\s+(?:to|and)\s+(\d{4}-\d{2}-\d{2})\b/i,
  );
  const countryMatch = raw.match(
    /\b(?:country|jurisdiction)\s*(?:is|=|:)?\s*([a-z][a-z\s-]{1,30})\b/i,
  );

  addIfDefined(filters, "customerId", customerMatch?.[1]?.toUpperCase());
  addIfDefined(filters, "lastDays", lastDaysMatch ? Number(lastDaysMatch[1]) : undefined);
  addIfDefined(
    filters,
    "minimumTransactions",
    minimumTransactionsMatch ? Number(minimumTransactionsMatch[1]) : undefined,
  );
  addIfDefined(filters, "amountBelow", underMatch?.[1] ? parseMoney(underMatch[1]) : undefined);
  addIfDefined(filters, "amountAbove", aboveMatch?.[1] ? parseMoney(aboveMatch[1]) : undefined);
  addIfDefined(filters, "transactionType", transactionType);
  addIfDefined(filters, "country", countryMatch?.[1]?.trim());

  if (dateRangeMatch?.[1] && dateRangeMatch[2]) {
    filters.dateFrom = dateRangeMatch[1];
    filters.dateTo = dateRangeMatch[2];
  } else if (filters.lastDays) {
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - filters.lastDays);
    filters.dateFrom = from.toISOString();
    filters.dateTo = now.toISOString();
  }

  if (/\b(retail|business|private)\s+(?:customers?|segment)\b/i.test(raw)) {
    const segment = lower.match(/\b(retail|business|private)\b/)?.[1];
    if (segment === "retail" || segment === "business" || segment === "private") {
      filters.segment = segment;
    }
  }

  let intent: QueryIntent;
  if (filters.customerId) {
    intent = "customer_investigation";
  } else if (
    filters.minimumTransactions !== undefined ||
    ((filters.amountBelow !== undefined || filters.amountAbove !== undefined) &&
      /\bwhich|who|customers?\b/i.test(raw))
  ) {
    intent = "threshold_aggregation";
  } else if (pattern && pattern !== "general_anomaly") {
    intent = "pattern_search";
  } else if (/\bhigh[\s-]*risk|riskiest|rank(?:ing)?\b/i.test(raw)) {
    intent = "high_risk_ranking";
  } else {
    intent = "broad_analysis";
  }

  const signalCount = [
    Boolean(pattern),
    Boolean(filters.customerId),
    Boolean(filters.dateFrom),
    Boolean(filters.minimumTransactions),
    filters.amountBelow !== undefined || filters.amountAbove !== undefined,
    Boolean(filters.transactionType),
    Boolean(filters.segment),
  ].filter(Boolean).length;
  const confidence = Math.min(0.98, 0.72 + signalCount * 0.04);

  return {
    raw,
    intent,
    ...(pattern ? { pattern } : {}),
    filters,
    confidence,
    interpretation: describeInterpretation(intent, pattern, filters),
  };
}

function describeInterpretation(
  intent: QueryIntent,
  pattern: AmlPattern | undefined,
  filters: QueryFilters,
): string {
  const scope: string[] = [];
  if (filters.customerId) scope.push(`customer ${filters.customerId}`);
  if (filters.lastDays) scope.push(`the last ${filters.lastDays} days`);
  if (filters.minimumTransactions) {
    scope.push(`${filters.minimumTransactions}+ transactions`);
  }
  if (filters.amountBelow !== undefined) {
    scope.push(`amounts below $${filters.amountBelow.toLocaleString("en-US")}`);
  }
  if (filters.amountAbove !== undefined) {
    scope.push(`amounts above $${filters.amountAbove.toLocaleString("en-US")}`);
  }
  if (filters.transactionType) {
    scope.push(filters.transactionType.replaceAll("_", " "));
  }
  if (filters.country) scope.push(`country ${filters.country}`);

  const subject =
    intent === "broad_analysis"
      ? "a broad suspicious-activity analysis"
      : intent === "threshold_aggregation"
        ? "a direct threshold aggregation"
        : intent === "customer_investigation"
          ? "an on-demand customer investigation"
          : intent === "high_risk_ranking"
            ? "a high-risk entity ranking"
            : `a targeted ${pattern?.replaceAll("_", " ") ?? "AML pattern"} search`;

  return `Run ${subject}${scope.length ? ` scoped to ${scope.join(", ")}` : ""}.`;
}

