import { afterEach, describe, expect, it, vi } from "vitest";
import { getModelMetadata, runInvestigation } from "./api";

describe("web API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains an empty proxy error instead of exposing a JSON parser failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 500 })),
    );

    await expect(
      runInvestigation({ query: "Flag high-risk customers" }),
    ).rejects.toThrow("CipherSAR API is unavailable");
  });

  it("preserves a structured API validation message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid investigation" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      runInvestigation({ query: "Flag high-risk customers" }),
    ).rejects.toThrow("Invalid investigation");
  });

  it("loads the active model card without requiring an investigation", async () => {
    const model = {
      id: "model-v1",
      type: "balanced random forest",
      status: "active",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(model), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(getModelMetadata()).resolves.toEqual(model);
    expect(fetch).toHaveBeenCalledWith("/api/model", undefined);
  });
});
