---
version: 1
slug: "apps-web-src-app-tsx"
primary_target: "apps/web/src/App.tsx"
related_targets: ["apps/web/src/signal-room.css"]
---

## Scope and mode

- Surface: CipherSAR application shell and Command Center (`apps/web/src/App.tsx`)
- Mode: Operate

## Audience, job, and action

Bank AML analysts ask a natural-language compliance question, see the agent's query-aware plan, inspect evidence, and choose a human-controlled escalation action. The primary action is Investigate; navigation and data import remain clearly secondary.

## Content and constraints

The surface preserves existing query preparation, API calls, dataset loading, investigation history, review controls, and workspace navigation. It must keep rupee formatting, explainability, tool selection, and human-review safeguards visible.

## Chosen direction and memorable moment

The Signal Strip Room. An expandable graphite navigation instrument opens onto an asymmetrical white command stage and collapses into an 80px rail when analysts need more evidence space. Workspace search and human-control context live in the top strip. When an investigation is prepared, a cobalt signal tape exposes intent, scope, selected analytical route, and human control before the evidence sheets begin.

## Unresolved decisions

Organization-specific identity, role-based navigation, and persisted personal workspace preferences remain intentionally deferred.
