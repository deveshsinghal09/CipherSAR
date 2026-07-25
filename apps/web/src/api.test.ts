import { afterEach, describe, expect, it, vi } from "vitest";
import { runInvestigation } from "./api";

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
});
