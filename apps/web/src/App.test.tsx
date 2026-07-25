import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

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
});
