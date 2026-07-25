import { Search } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, Card, EmptyState, Skeleton } from "./ui";

describe("shared UI primitives", () => {
  it("renders an accessible loading button", () => {
    const markup = renderToStaticMarkup(
      <Button loading variant="primary">
        Investigate
      </Button>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("button--primary");
    expect(markup).toContain("Investigate");
  });

  it("renders card, empty, and skeleton states consistently", () => {
    const markup = renderToStaticMarkup(
      <Card aria-label="Results">
        <EmptyState
          icon={Search}
          title="No findings"
          detail="Try widening your query."
        />
        <Skeleton className="test-skeleton" />
      </Card>,
    );

    expect(markup).toContain('aria-label="Results"');
    expect(markup).toContain("ui-empty-state");
    expect(markup).toContain("No findings");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("test-skeleton");
  });
});
