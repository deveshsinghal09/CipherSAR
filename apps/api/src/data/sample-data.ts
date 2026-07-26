import type { Customer, Transaction, TransactionType } from "@ciphersar/shared";

export interface SampleDataset {
  customers: Customer[];
  transactions: Transaction[];
}

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function isoDaysAgo(now: Date, days: number, hour = 10): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

const DEMO_CUSTOMER_NAMES = [
  "Aarav Mehta",
  "Sophia Carter",
  "Liam Brooks",
  "Noor Al-Farsi",
  "Mei Lin Tan",
  "Daniel Okafor",
  "Meridian Foods Ltd",
  "Priya Nair",
  "Ethan Walker",
  "Zara Rahman",
  "Marcus Chen",
  "Elena Rossi",
  "Rohan Kapoor",
  "Crescent Logistics LLC",
  "Olivia Bennett",
  "Hamza Siddiqui",
  "Grace Morgan",
  "Arjun Rao",
  "Hannah Clarke",
  "Samuel Lee",
  "Pacific Trade Partners",
  "Isha Verma",
  "Adam Wilson",
  "Leila Haddad",
  "Nicholas Grant",
  "Ananya Bose",
  "Yusuf Khan",
  "Harborline Technologies",
  "Emilia Stone",
  "Karan Malhotra",
  "Chloe Martin",
  "David Wong",
] as const;

export function createSampleDataset(now = new Date()): SampleDataset {
  const random = seeded(45_210_908);
  const customers: Customer[] = [];
  const transactions: Transaction[] = [];
  const countries = ["US", "GB", "AE", "SG"];
  const types: TransactionType[] = ["card", "ach", "wire_in", "wire_out"];

  for (let index = 1; index <= 32; index += 1) {
    const id = `CUS-${String(1000 + index).padStart(4, "0")}`;
    const country = countries[index % countries.length] ?? "US";
    const segment = index % 7 === 0 ? "business" : "retail";
    customers.push({
      id,
      name: DEMO_CUSTOMER_NAMES[index - 1] ?? `Demo customer ${index}`,
      segment,
      country,
      riskRating: index % 11 === 0 ? "elevated" : "standard",
      accountOpenedAt: isoDaysAgo(now, 500 + index * 11),
    });
    const count = 6 + Math.floor(random() * 8);
    for (let txIndex = 0; txIndex < count; txIndex += 1) {
      transactions.push({
        id: `TX-${id}-${txIndex + 1}`,
        customerId: id,
        timestamp: isoDaysAgo(now, 2 + Math.floor(random() * 55), 8 + (txIndex % 10)),
        amount: Math.round((35 + random() * 4_500) * 100) / 100,
        currency: "INR",
        type: types[Math.floor(random() * types.length)] ?? "ach",
        country,
        segment,
        channel: random() > 0.45 ? "online" : "mobile",
        counterpartyId: `CP-${1 + Math.floor(random() * 12)}`,
      });
    }
  }

  customers.push(
    {
      id: "CUS-4521",
      name: "Jordan Hale",
      segment: "retail",
      country: "US",
      riskRating: "standard",
      accountOpenedAt: isoDaysAgo(now, 620),
    },
    {
      id: "CUS-3108",
      name: "Northline Traders",
      segment: "business",
      country: "US",
      riskRating: "elevated",
      accountOpenedAt: isoDaysAgo(now, 880),
    },
    {
      id: "CUS-8842",
      name: "Orion Import Services",
      segment: "business",
      country: "AE",
      riskRating: "elevated",
      accountOpenedAt: isoDaysAgo(now, 1_100),
    },
  );

  const structuringAmounts = [
    9_200, 9_350, 9_475, 9_600, 9_725, 9_850, 9_300, 9_550, 9_900, 9_250,
    9_675, 9_825,
  ];
  structuringAmounts.forEach((amount, index) => {
    transactions.push({
      id: `TX-4521-${index + 1}`,
      customerId: "CUS-4521",
      timestamp: isoDaysAgo(now, 1 + (index % 6), 9 + (index % 7)),
      amount,
      currency: "INR",
      type: "cash_deposit",
      country: "US",
      branchId: `BR-${1 + (index % 4)}`,
      segment: "retail",
      channel: "branch",
    });
  });

  for (let index = 0; index < 14; index += 1) {
    transactions.push({
      id: `TX-3108-${index + 1}`,
      customerId: "CUS-3108",
      timestamp: isoDaysAgo(now, index % 5, 8 + (index % 8)),
      amount: 950 + (index % 6) * 275,
      currency: "INR",
      type: "cash_deposit",
      country: "US",
      branchId: `BR-${5 + (index % 5)}`,
      segment: "business",
      channel: "branch",
    });
  }

  const layeringTypes: TransactionType[] = [
    "wire_in",
    "wire_out",
    "wire_in",
    "wire_out",
    "wire_in",
    "wire_out",
  ];
  layeringTypes.forEach((type, index) => {
    transactions.push({
      id: `TX-8842-${index + 1}`,
      customerId: "CUS-8842",
      timestamp: isoDaysAgo(now, 2 - Math.floor(index / 3), 8 + index * 2),
      amount: type === "wire_in" ? 48_000 + index * 1_100 : 45_500 + index * 900,
      currency: "INR",
      type,
      country: index % 2 === 0 ? "AE" : "SG",
      segment: "business",
      channel: "online",
      counterpartyId: `CP-LAYER-${index + 1}`,
    });
  });

  return {
    customers,
    transactions: transactions.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  };
}
