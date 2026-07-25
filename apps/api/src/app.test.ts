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
  });

  it("rejects malformed requests", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({ query: "" });
    expect(response.status).toBe(400);
  });
});
