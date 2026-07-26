import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import type { GenerateReportRequest, InvestigationResponse } from "@ciphersar/shared";
import { z } from "zod";
import { InvestigationAgent } from "./agent/engine";
import { createSampleDataset } from "./data/sample-data";
import { getModelMetadata } from "./ml/model";
import { generateInvestigationReport } from "./reports/generator";

const transactionSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1),
  timestamp: z.string().datetime(),
  amount: z.number().nonnegative(),
  currency: z.string().min(3).max(3),
  type: z.enum([
    "cash_deposit",
    "cash_withdrawal",
    "wire_in",
    "wire_out",
    "card",
    "ach",
  ]),
  country: z.string().min(2),
  branchId: z.string().optional(),
  counterpartyId: z.string().optional(),
  segment: z.enum(["retail", "business", "private"]),
  channel: z.enum(["branch", "online", "mobile", "atm"]),
});

const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  segment: z.enum(["retail", "business", "private"]),
  country: z.string().min(2),
  riskRating: z.enum(["standard", "elevated"]),
  accountOpenedAt: z.string().datetime(),
});

const analyzeSchema = z.object({
  query: z.string().trim().min(3).max(1_000),
  transactions: z.array(transactionSchema).max(100_000).optional(),
  customers: z.array(customerSchema).max(100_000).optional(),
  policy: z
    .object({
      mediumRiskThreshold: z.number().min(1).max(99),
      highRiskThreshold: z.number().min(1).max(100),
      reviewThreshold: z.number().min(1).max(100),
      reportThreshold: z.number().min(1).max(100),
      minimumReportConfidence: z.number().min(0).max(1),
    })
    .refine(
      (policy) =>
        policy.mediumRiskThreshold < policy.highRiskThreshold &&
        policy.reviewThreshold <= policy.reportThreshold,
      "Policy thresholds must be ordered from lower to higher severity.",
    )
    .optional(),
});

const reportSchema = z.object({
  template: z.enum([
    "executive_summary",
    "case_narrative",
    "sar_review_brief",
  ]),
  investigation: z
    .object({
      investigationId: z.string().min(1),
      generatedAt: z.string().datetime(),
      decisionSummary: z.object({
        userRequest: z.string().min(1),
        detectedIntent: z.string().min(1),
        selectedTools: z.array(z.string()),
      }).passthrough(),
      metrics: z.object({
        inputTransactions: z.number().nonnegative(),
        analyzedTransactions: z.number().nonnegative(),
        analyzedCustomers: z.number().nonnegative(),
        flaggedEntities: z.number().nonnegative(),
        highRiskEntities: z.number().nonnegative(),
      }).passthrough(),
      findings: z.array(z.object({
        entityId: z.string().min(1),
        riskLevel: z.enum(["low", "medium", "high"]),
        riskScore: z.number().min(0).max(100),
        recommendedAction: z.enum(["monitor", "review", "report"]),
      }).passthrough()),
      summary: z.string(),
      safeguards: z.object({
        limitations: z.array(z.string()),
      }).passthrough(),
      model: z.object({
        id: z.string(),
        type: z.string(),
      }).passthrough(),
    })
    .passthrough(),
});

export function createApp(): express.Express {
  const app = express();
  const agent = new InvestigationAgent();

  app.disable("x-powered-by");
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "ciphersar-api",
      version: "0.1.0",
      time: new Date().toISOString(),
    });
  });

  app.get("/api/examples", (_request, response) => {
    response.json({
      examples: [
        "Find structuring patterns in the last 30 days",
        "Which customers made 10+ transactions under ₹10,000?",
        "Is customer ID 4521 suspicious?",
        "Flag high-risk customers",
        "Analyse this dataset for suspicious activity",
      ],
    });
  });

  app.get("/api/model", (_request, response) => {
    response.json(getModelMetadata());
  });

  app.get("/api/dataset/summary", (_request, response) => {
    const sample = createSampleDataset();
    response.json({
      name: "CipherSAR Synthetic Retail Banking Dataset",
      source: "Deterministically generated synthetic data",
      transactions: sample.transactions.length,
      customers: sample.customers.length,
      knownDemoPatterns: ["structuring", "smurfing", "layering"],
    });
  });

  app.get("/api/dataset", (_request, response) => {
    const sample = createSampleDataset();
    response.json({
      name: "CipherSAR Synthetic Retail Banking Dataset",
      source: "Deterministically generated synthetic data",
      customers: sample.customers,
      transactions: sample.transactions,
      knownDemoPatterns: ["structuring", "smurfing", "layering"],
    });
  });

  app.post("/api/investigations", async (request, response, next) => {
    try {
      const parsed = analyzeSchema.parse(request.body);
      const result = await agent.analyze(parsed);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reports", async (request, response, next) => {
    try {
      const parsed = reportSchema.parse(request.body);
      const report = await generateInvestigationReport({
        template: parsed.template,
        investigation: parsed.investigation as unknown as InvestigationResponse,
      } satisfies GenerateReportRequest);
      response.status(200).json(report);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: "not_found",
      message: "The requested CipherSAR endpoint does not exist.",
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        error: "validation_error",
        message: "The investigation request is invalid.",
        details: error.flatten(),
      });
      return;
    }
    response.status(500).json({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unexpected server error",
    });
  };
  app.use(errorHandler);

  return app;
}
