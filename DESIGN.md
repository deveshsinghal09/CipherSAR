---
name: CipherSAR
description: A signal-room interface for explainable AML investigations.
colors:
  graphite: "#15141C"
  cobalt: "#5362E8"
  cobalt-wash: "#EEF0FF"
  chalk: "#F7F8FA"
  paper: "#FFFFFF"
  rule: "#DDE1E8"
  slate: "#596170"
  mint: "#11A77B"
  signal-red: "#E94A5A"
  review-amber: "#B36A08"
typography:
  display:
    fontFamily: "Anybody, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.75rem)"
    fontWeight: 650
    lineHeight: 0.92
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Schibsted Grotesk, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.55
  label:
    fontFamily: "Azeret Mono, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  control: "4px"
  surface: "8px"
  feature: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "13px 18px"
  evidence-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.surface}"
    padding: "24px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
---

# Design System: CipherSAR

## Overview

**Creative North Star: "The Signal Strip Room"**

CipherSAR feels like a purpose-built financial crime operations room: a narrow graphite instrument rail, a bright investigation stage, and cobalt evidence tapes that make the agent's decisions visible. It is serious enough for a bank but avoids the familiar pale sidebar and floating-card dashboard.

The interface is document-led rather than widget-led. Queries open an investigation; a horizontal signal tape shows what the agent understood; evidence gathers into precise white sheets; and a strong vertical case strip holds reviewer status and escalation context.

**Key Characteristics:**

- A graphite navigation instrument that expands for orientation and collapses into a compact rail.
- One asymmetrical command stage as the first-view focal point.
- Cobalt evidence tapes for scope, planning, and analytical context.
- White evidence sheets with ruled, ledger-like information.
- Sparse semantic color and explicit human-review controls.

## Colors

The palette combines chalk-white reading space with a graphite frame and one assertive cobalt analytical signal.

### Primary

- **Graphite:** Navigation, primary text, and the operational frame.
- **Evidence Cobalt:** Primary actions, agent context, selected state, and the signature signal tape.

### Secondary

- **Verification Mint:** Successful controls, low risk, and trustworthy system readiness.

### Tertiary

- **Signal Red:** High-risk evidence and interrupted states.
- **Review Amber:** Medium risk and pending analyst judgment.

### Neutral

- **Chalk:** Application canvas and long-session working background.
- **Paper:** Evidence sheets, tables, inputs, and report pages.
- **Rule:** Structural dividers and ledger lines.
- **Slate:** Supporting explanations and metadata.

**The Cobalt Tape Rule.** Cobalt appears as a continuous analytical field or decisive action, never as decorative scattered accents.

## Typography

**Display Font:** Anybody (with Arial fallback)

**Body Font:** Schibsted Grotesk (with Arial fallback)

**Label/Mono Font:** Azeret Mono (with Consolas fallback)

**Character:** Anybody creates a compact, engineered display voice with variable-width character. Schibsted Grotesk stays calm and readable for evidence. Azeret Mono is reserved for values, identifiers, filters, timestamps, and decision provenance.

### Hierarchy

- **Display** (650, responsive, 0.92): The command-center thesis and major report title.
- **Headline** (650, 26–40px, 1.02): Workspace and evidence-sheet headings.
- **Title** (650, 14–18px, 1.25): Panel and record titles.
- **Body** (450, 14px, 1.55): Guidance and evidence explanations, kept near 70ch.
- **Label** (600, 10px, 0.04em): Exact operational metadata and dense status labels.

**The Measurement Rule.** Monospace is used only where precision or alignment improves review speed.

## Layout

Desktop uses a 252px graphite navigation instrument that collapses to an 80px rail, a 64px context strip, and a fluid workstage capped at 1760px. The command surface is asymmetrical: thesis and query occupy the broad field while agent readiness occupies a compact fact column. Results favor wide evidence tables with a narrower decision strip.

At tablet size the rail becomes an overlay and analytical columns stack. On mobile, the command form becomes vertical, evidence tables become horizontally scrollable records, and navigation remains fully labeled inside the overlay. Spacing follows an 8px rhythm, with 4px reserved for data-dense metadata.

## Elevation & Depth

Depth comes from physical workflow hierarchy. The command stage and evidence sheets receive directional shadows; ordinary controls and nested information rely on tonal changes or rules. Graphite navigation stays visually flush.

**The Evidence Stack Rule.** Only an actionable work surface may float; content inside it is divided, not placed inside another card.

## Shapes

Controls use engineered 4px corners, evidence sheets use 8px, and focal stages use at most 12px. Pills are limited to small statuses. Surfaces are mostly rectangular so tables, reports, and case records align into a consistent operational geometry.

## Components

### Buttons

- **Shape:** Compact rectangular control with 4px corners.
- **Primary:** Cobalt with white text and one clear action per region.
- **Hover / Focus:** Darker cobalt on hover and a graphite-plus-cobalt focus treatment.
- **Secondary / Ghost:** Paper or transparent backgrounds with structural rules.

### Chips

- **Style:** Compact, squared status tokens using label plus semantic color.
- **State:** Selected filters gain a filled tint and stronger foreground; status always includes text.

### Cards / Containers

- **Corner Style:** Evidence-sheet corners at 8px.
- **Background:** Paper on chalk; graphite is reserved for navigation.
- **Shadow Strategy:** Directional shadow for focal working layers only.
- **Border:** Rules divide evidence instead of nested containers.
- **Internal Padding:** 16–32px based on information density.

### Inputs / Fields

- **Style:** White field, graphite text, visible rule, and 4px corners.
- **Focus:** Cobalt border with an offset focus ring.
- **Error / Disabled:** Error gives a recovery instruction; disabled controls stay legible.

### Navigation

The desktop navigation is fully labeled by default and collapses to an icon-led rail with accessible hover/focus labels. The active destination becomes a cobalt tile. The mobile overlay restores full text labels, traps focus while open, closes with Escape, and preserves the same information order.

### Signal Tape

A full-width cobalt band exposes prepared scope, selected analytical behavior, and human-control status. It clips into view once after query state changes and collapses to stacked rows on narrow screens.

### Case Strip

Report and evidence workspaces use a narrow vertical cobalt band to keep case status, source, and review gates visually attached to the document.

## Do's and Don'ts

### Do:

- **Do** make agent intent, selected tools, skipped work, and scope visible.
- **Do** align scores, identifiers, amounts, and timestamps for rapid comparison.
- **Do** use one strong cobalt field to orient each complex workflow.
- **Do** make empty, loading, error, and AI-fallback states explain the next safe action.
- **Do** preserve human review as a visible gate before escalation.
- **Do** keep workspace search, navigation collapse, and analyst controls keyboard accessible.

### Don't:

- **Don't** return to a wide pale sidebar with stacked rounded navigation buttons.
- **Don't** build screens from evenly sized statistic cards.
- **Don't** use gradients, glassmorphism, neon, or cyber-security theatrics.
- **Don't** hide consequential actions behind unexplained icon-only controls.
- **Don't** imply that an AI draft is a filed SAR or replaces human review.
- **Don't** expose API keys or customer evidence in client-side configuration.
