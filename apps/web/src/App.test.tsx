import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App, formatSyncAge } from "./App";

describe("dataset sync status", () => {
  it("formats elapsed time from the latest successful sync", () => {
    const syncedAt = new Date("2026-07-26T10:00:00.000Z").getTime();

    expect(formatSyncAge(syncedAt, syncedAt + 20_000)).toBe("just now");
    expect(formatSyncAge(syncedAt, syncedAt + 50_000)).toBe("just now");
    expect(formatSyncAge(syncedAt, syncedAt + 2 * 60_000)).toBe(
      "2 minutes ago",
    );
    expect(formatSyncAge(syncedAt, syncedAt + 60 * 60_000)).toBe("1 hour ago");
  });
});

describe("investigation start behavior", () => {
  it("starts in a prepared state without displaying analysis results", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Ready to investigate");
    expect(markup).toContain("No analysis runs until you start it.");
    expect(markup).not.toContain('aria-label="Investigation metrics"');
    expect(markup).not.toContain('aria-label="Active trained model"');
  });

  it("uses bank-neutral branding and does not render an analyst profile", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Financial Crime Compliance");
    expect(markup).toContain("₹10k");
    expect(markup).not.toContain("Veyra Bank");
    expect(markup).not.toContain("Ankit Marik");
    expect(markup).not.toContain("AML analyst");
  });

  it("renders the production workspace shell with accessible navigation controls", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Collapse sidebar"');
    expect(markup).toContain('aria-label="Search workspace"');
    expect(markup).toContain('aria-label="Open analyst profile menu"');
    expect(markup).toContain('aria-label="Application navigation"');
    expect(markup).toContain("AML intelligence");
  });
});
