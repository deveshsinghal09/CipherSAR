---
version: 1
slug: "apps-web-src-report-studio-tsx"
primary_target: "apps/web/src/report-studio.tsx"
related_targets: ["apps/web/src/styles.css"]
---

## Scope and mode

- Surface: AI Report Studio (`apps/web/src/report-studio.tsx`)
- Mode: Operate

## Audience, job, and action

Bank AML analysts and compliance reviewers turn a completed investigation into a controlled internal artifact. The primary action is Generate report; the secondary action is Download PDF after validating source, evidence, limitations, and safeguards.

## Content and constraints

The surface uses only completed investigation data. Gemini is an optional server-side wording layer with a deterministic fallback. It must expose provenance and mandatory human review, never imply that a draft is a filed SAR, and preserve the existing investigation logic.

## Chosen direction and memorable moment

The Regulatory Atlas. A preparation index sits beside a paper-like evidence dossier, so the report feels like a real object in a compliance workflow rather than an AI chat response.

## Unresolved decisions

MongoDB persistence and organization-specific report templates are intentionally deferred.
