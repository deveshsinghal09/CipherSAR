# CipherSAR Design System

## Product context

CipherSAR is an evidence-first AML investigation copilot for bank compliance analysts, AML leads, and risk officers. It turns natural-language questions into an explicit, auditable execution plan, invokes only the necessary analysis tools, and returns explainable transaction/customer risk with a recommended action.

Primary jobs:
- Ask a targeted AML question without constructing SQL or tuning rules.
- See which tools the agent chose, in what order, and why.
- Inspect suspicious customers, transactions, and linked activity.
- Understand the evidence behind every score.
- Escalate to monitor, review, or report while retaining human control.

Core screens:
- Investigation command center / overview
- Query investigation workspace
- Customer 360 risk profile
- Alert review queue
- Dataset import and quality report
- Audit trail

## Visual direction

Use a sophisticated "forensic noir" interface: dark, calm, evidence-dense, and operational. The product should feel like a premium investigation instrument, not a crypto dashboard or generic AI SaaS.

Use only these fonts:
- UI and headings: Inter, 400–700
- Data, IDs, thresholds, timestamps, and agent trace: IBM Plex Mono, 400–600

Never use a decorative serif. Do not introduce blue/purple tech gradients. Avoid excessive glow, glass, and oversized empty hero areas.

## Color tokens

- Canvas: #090C0B
- Surface 1: #101412
- Surface 2: #151A17
- Elevated glass: rgba(24, 30, 27, 0.82)
- Border subtle: rgba(225, 232, 226, 0.10)
- Border strong: rgba(225, 232, 226, 0.18)
- Text primary: #F2F5F1
- Text secondary: #A5AFA7
- Text muted: #6F7B72
- Brand / intelligence: #B7F171
- Brand soft: rgba(183, 241, 113, 0.12)
- Information: #74D9C8
- Information soft: rgba(116, 217, 200, 0.12)
- Warning / medium risk: #F2B84B
- Warning soft: rgba(242, 184, 75, 0.12)
- Danger / high risk: #FF6B61
- Danger soft: rgba(255, 107, 97, 0.12)
- Low risk: #79C99E

Risk colors are semantic and must never be used decoratively.

## Background and depth

Use #090C0B as the global background. A very subtle radial dot grid may appear in the command/search region only: 28px spacing, #F2F5F1 at 4% opacity. Add restrained green-teal ambient light behind the agent command panel at no more than 10% opacity.

Cards use #101412 or rgba(24, 30, 27, 0.82), 1px subtle borders, and 14–18px radii. Glass blur is allowed only for the command bar, popovers, and sticky header. Most data surfaces should be opaque for legibility. Shadows: 0 18px 60px rgba(0,0,0,0.28).

## Layout

Desktop-first analyst workspace, responsive down to tablet and mobile.

- Left rail: 248px expanded, 72px compact
- Top utility bar: 64px
- Content max width: none; use the available viewport for investigation data
- Page padding: 24px desktop, 16px tablet, 12px mobile
- Grid: 12 columns, 20px gutters
- Dashboard prioritizes command input, active plan, risk overview, and review queue above the fold
- Use progressive disclosure: summary first, evidence on expand

## Spacing and shape

4px base spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.

- Buttons: 10–12px radius
- Inputs: 12px radius
- Cards: 16px radius
- Pills/badges: full radius
- Table rows: 52–60px
- Minimum touch target: 44px

## Typography

- Page title: Inter 28–32px / 1.15 / 650
- Section title: Inter 18–20px / 1.25 / 650
- Card metric: Inter 28–36px / 1 / 650
- Body: Inter 14px / 1.5 / 400
- Label: Inter 11px / 1.2 / 600, uppercase, 0.08em tracking
- Mono evidence: IBM Plex Mono 12–13px / 1.55

Use tabular numerals for currency, counts, and scores.

## Components

### Agent command bar

A prominent but compact natural-language input with sample query chips, dataset scope, and a lime "Investigate" action. Show parsing states inline: intent, filters, entity, and pattern. Never present the AI as infallible.

### Execution plan trace

A vertical or horizontal tool trace showing only invoked tools. Each step has a tool icon, tool name, reason, input scope, duration, and status. Skipped tools may appear in a collapsed "not needed" explanation. Current step uses a subtle brand pulse.

### Risk score

Display 0–100 with both number and label. Use a compact radial gauge or segmented bar, never color alone. Labels: Low (0–34), Medium (35–69), High (70–100), while allowing the engine to return threshold context.

### Evidence cards

Each flag includes:
- pattern name
- concise natural-language reason
- exact supporting facts and thresholds
- feature contribution
- confidence
- data window
- recommended action

### Tables

Sticky headers, row selection, sortable columns, visible filters, keyboard focus, and compact density. Customer IDs and transaction IDs use IBM Plex Mono. Risk badges pair icon, label, and color.

### Empty, loading, and error states

- Loading: skeletons shaped like the final surface plus an agent step status
- Empty: state what was searched and suggest a broader query
- Error: preserve the query, identify the failed tool, offer retry or partial results
- Dataset quality issues: warn before analysis and quantify affected rows

## Motion

Use 160–220ms transitions with cubic-bezier(0.4, 0, 0.2, 1). Agent steps may enter with a 12px upward fade. Risk values animate only on first reveal. Respect prefers-reduced-motion. No looping decorative motion except a restrained live/status pulse.

## Accessibility

- WCAG 2.2 AA contrast
- Visible 2px #B7F171 focus ring with 2px offset
- Full keyboard navigation
- Text/icon redundancy for risk state
- aria-live for agent progress and toast messages
- Charts require summaries and accessible legends
- Never encode suspicious/clear status through color alone

## Dashboard composition

The initial dashboard should contain:
1. Compact left navigation with CipherSAR wordmark and a small shield/network mark
2. Header with active dataset, date freshness, notifications, and analyst profile
3. Welcome line and agent command bar with three realistic query chips
4. Four restrained metrics: transactions scanned, high-risk entities, review queue, false-positive reduction
5. Main investigation card showing a completed example query: "Find structuring patterns in the last 30 days"
6. Visible dynamic execution plan: filter window → structuring features → hybrid detector → explain risk; full EDA marked as skipped because it was unnecessary
7. High-risk customer table with score, detected pattern, evidence summary, amount, and action
8. Risk distribution chart and pattern breakdown
9. Right-side "Why this was flagged" evidence panel for one selected customer, including 12 cash deposits between $9,200 and $9,900, 4 branches, 6 days, and an aggregate amount
10. Clear "Send to review" primary action and "Monitor" secondary action

## Voice

Precise, calm, and accountable. Prefer "The detector found…" over "AI believes…". Explanations should state evidence and thresholds, not vague model language. Recommendations must be advisory and preserve human approval.
