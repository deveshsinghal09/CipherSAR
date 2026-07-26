---
name: CipherSAR
description: A regulatory intelligence workspace for explainable AML investigations.
colors:
  regulatory-ink: "#0B1F33"
  evidence-green: "#08775B"
  signal-blue: "#176B87"
  ledger-paper: "#FFFFFF"
  canvas-mist: "#F2F5F7"
  rule-line: "#D8E0E7"
  secondary-ink: "#445467"
  alert-red: "#BC3545"
  review-amber: "#98620B"
typography:
  display:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 650
    lineHeight: 1.02
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  control: "6px"
  surface: "10px"
  feature: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.regulatory-ink}"
    textColor: "{colors.ledger-paper}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  card:
    backgroundColor: "{colors.ledger-paper}"
    textColor: "{colors.regulatory-ink}"
    rounded: "{rounded.surface}"
    padding: "20px"
  input:
    backgroundColor: "{colors.ledger-paper}"
    textColor: "{colors.regulatory-ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
---

# Design System: CipherSAR

## Overview

**Creative North Star: "The Regulatory Atlas"**

CipherSAR should feel like a precise intelligence desk assembled from modern transaction ledgers, investigation dossiers, and risk-committee briefing material. Information is dense but ordered: rules, indices, and aligned figures create confidence while selective fields of green and blue identify actions and analytical context.

The system is emphatically light and operational. It avoids both generic rounded SaaS cards and theatrical cyber-security visuals. The memorable object is the report dossier: evidence, decision path, and human review controls read as one defensible record.

**Key Characteristics:**

- Ledger-like alignment and compact labels for evidence.
- Editorial hierarchy without decorative headlines.
- Restrained color with high-meaning accents.
- Visible analytical scope, provenance, and human control.
- Responsive density that becomes stacked records on small screens.

## Colors

The palette uses cool paper neutrals, dark regulatory ink, and sparse institutional signals.

### Primary

- **Regulatory Ink:** Owns primary actions, headings, and navigational anchors.
- **Evidence Green:** Marks selected state, validated controls, and positive system readiness.

### Secondary

- **Signal Blue:** Identifies analytical context, filters, and informational system state.

### Tertiary

- **Alert Red:** Reserved for high-risk evidence and destructive or interrupted states.
- **Review Amber:** Reserved for medium risk and pending human judgment.

### Neutral

- **Ledger Paper:** Primary reading surfaces.
- **Canvas Mist:** Application background and quiet grouping.
- **Rule Line:** Table rules, control borders, and structural dividers.
- **Secondary Ink:** Supporting copy and metadata.

**The Sparse Signal Rule.** Accent color communicates state or action; it never becomes ambient decoration.

## Typography

**Display Font:** Archivo (with Arial fallback)

**Body Font:** Manrope (with Arial fallback)

**Label/Mono Font:** JetBrains Mono (with Consolas fallback)

**Character:** Archivo gives dossier headings a compact archival authority without slipping into newspaper styling. Manrope keeps long operational copy contemporary and calm. JetBrains Mono turns evidence, identifiers, scores, and tool steps into inspectable operational data.

### Hierarchy

- **Display** (650, responsive, 1.02): Used only for a page thesis or report title.
- **Headline** (650, 24–34px, 1.12): Primary workspace and section titles.
- **Title** (650, 14–18px, 1.3): Panel and record titles.
- **Body** (450, 14px, 1.6): Explanations and workflow guidance; keep readable lines near 70ch.
- **Label** (600, 10px, 0.06em): Indices, timestamps, fields, and compact status metadata.

**The Evidence Type Rule.** Use monospace only where a reviewer benefits from exact alignment or machine-like provenance.

## Layout

The desktop shell uses a fixed 256px navigation column, a compact 68px context bar, and a fluid evidence canvas capped at 1680px. Primary screens use asymmetric grids that give evidence tables more room than supporting controls. Spacing follows an 8px rhythm with 4px allowed only inside dense metadata.

At tablet width the navigation becomes an overlay and two-column analytical regions collapse deliberately. On mobile, tables become readable records, primary actions remain visible, and secondary metadata is reordered below the decision.

## Elevation & Depth

Depth is structural, not decorative. Most surfaces are separated by tonal fields and rule lines. Low ambient shadows are reserved for the command surface, open overlays, and the report paper floating above its workbench.

**The Paper Stack Rule.** A shadow must imply a real layer in the analyst workflow; ordinary panels remain flat.

## Shapes

Controls use precise 6px corners, panels use 10px corners, and only focal workspaces may use 16px. Pills are limited to compact statuses whose shape helps them scan as tokens. Risk charts and scores may use circles when the geometry encodes a quantity.

## Components

### Buttons

- **Shape:** Compact rectangular controls with precise corners.
- **Primary:** Regulatory ink with white text; reserved for one clear action per region.
- **Hover / Focus:** Small tonal shift and a high-contrast two-stage focus ring; no bouncing.
- **Secondary / Ghost:** Paper or transparent surfaces with visible structural borders.

### Chips

- **Style:** Compact state tokens with text plus color, never color alone.
- **State:** Selected chips gain a leading mark or stronger border.

### Cards / Containers

- **Corner Style:** Restrained 10px surfaces.
- **Background:** Ledger paper on canvas mist.
- **Shadow Strategy:** Flat by default; focal layers only.
- **Border:** Cool rule lines define most structure.
- **Internal Padding:** 16–24px depending on density.

### Inputs / Fields

- **Style:** White field, strong ink text, 1px rule, and 6px corners.
- **Focus:** Evidence-green border plus a visible outer focus ring.
- **Error / Disabled:** Error includes text and icon; disabled state remains readable.

### Navigation

Navigation is a quiet index, not a stack of floating buttons. The active item uses a left rule, stronger ink, and a lightly tinted field. Mobile navigation preserves the same order and labels.

### Report Dossier

The report workspace pairs a narrow preparation rail with a paper-like preview. The final document exposes source, model, timestamp, investigation identifier, human-review disclaimer, and export action within the same evidence frame.

## Do's and Don'ts

### Do:

- **Do** align scores, identifiers, amounts, and timestamps for rapid comparison.
- **Do** expose tool selection, skipped work, provenance, and limitations near conclusions.
- **Do** use empty, loading, error, and AI-fallback states that explain the next safe action.
- **Do** keep the application primarily light and readable during long review sessions.

### Don't:

- **Don't** recreate the generic dashboard pattern of evenly sized floating statistic cards.
- **Don't** use neon glows, glassmorphism, or cyber-security theatrics.
- **Don't** hide consequential actions behind icon-only controls.
- **Don't** imply that an AI-generated draft is a filed SAR or replaces human review.
- **Don't** expose API keys or customer evidence in client-side configuration.
