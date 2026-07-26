import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("CipherSAR API", () => {
  const app = createApp();

  it("reports health", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("returns a structured adaptive investigation", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({ query: "Find structuring patterns in the last 30 days" });

    expect(response.status).toBe(200);
    expect(response.body.parsedQuery.intent).toBe("pattern_search");
    expect(response.body.plan.steps.length).toBeGreaterThan(4);
    expect(response.body.findings[0].explanation).toContain("analyst validation");
    expect(response.body.policy.highRiskThreshold).toBe(70);
  });

  it("generates a reviewer report with a safe local fallback", async () => {
    const investigation = await request(app)
      .post("/api/investigations")
      .send({ query: "Find structuring patterns in the last 30 days" });

    const response = await request(app)
      .post("/api/reports")
      .send({
        investigation: investigation.body,
        template: "sar_review_brief",
      });

    expect(response.status).toBe(200);
    expect(response.body.investigationId).toBe(
      investigation.body.investigationId,
    );
    expect(response.body.sections.length).toBeGreaterThanOrEqual(3);
    expect(response.body.disclaimer).toContain("human");
    expect(["gemini", "local"]).toContain(response.body.source);
  });

  it("returns the synthetic dataset for workspace views", async () => {
    const response = await request(app).get("/api/dataset");
    expect(response.status).toBe(200);
    expect(response.body.customers.length).toBeGreaterThan(30);
    expect(response.body.transactions.length).toBeGreaterThan(100);
  });

  it("exposes the active trained model card", async () => {
    const response = await request(app).get("/api/model");
    expect(response.status).toBe(200);
    expect(response.body.type).toBe("balanced random forest");
    expect(response.body.dataset).toContain("AMLSim");
    expect(response.body.metrics.prAuc).toBeGreaterThan(0.85);
  });

  it("applies validated policy thresholds to recommendations", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({
        query: "Find structuring patterns in the last 30 days",
        policy: {
          mediumRiskThreshold: 20,
          highRiskThreshold: 95,
          reviewThreshold: 95,
          reportThreshold: 100,
          minimumReportConfidence: 1,
        },
      });
    expect(response.status).toBe(200);
    expect(response.body.findings[0].riskLevel).toBe("medium");
    expect(response.body.findings[0].recommendedAction).toBe("monitor");
  });

  it("rejects malformed requests", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({ query: "" });
    expect(response.status).toBe(400);
  });
});
