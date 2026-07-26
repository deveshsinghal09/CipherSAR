import type {
  GenerateReportRequest,
  GeneratedReport,
  InvestigationResponse,
  ReportSection,
  ReportTemplate,
} from "@ciphersar/shared";
import { z } from "zod";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";
// Stable production model; deployments may override it with GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const REPORT_DISCLAIMER =
  "AI-assisted decision-support draft. A qualified human compliance professional must validate the evidence, conclusions, and filing decision before escalation.";

const generatedContentSchema = z.object({
  title: z.string().trim().min(4).max(160),
  subtitle: z.string().trim().min(4).max(240),
  executiveSummary: z.string().trim().min(20).max(2_500),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(2).max(120),
        content: z.string().trim().min(10).max(4_000),
      }),
    )
    .min(3)
    .max(8),
  limitations: z.array(z.string().trim().min(4).max(500)).min(1).max(8),
});

const responseJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    executiveSummary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          content: { type: "string" },
        },
        required: ["heading", "content"],
        additionalProperties: false,
      },
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "title",
    "subtitle",
    "executiveSummary",
    "sections",
    "limitations",
  ],
  additionalProperties: false,
} as const;

export async function generateInvestigationReport(
  request: GenerateReportRequest,
): Promise<GeneratedReport> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (apiKey) {
    try {
      const content = await generateWithGemini(request, apiKey, model);
      return assembleReport(request, content, "gemini", model);
    } catch (error) {
      const fallback = createLocalContent(request);
      fallback.limitations.unshift(
        `Gemini generation was unavailable; a deterministic local draft was created instead (${safeErrorMessage(error)}).`,
      );
      return assembleReport(request, fallback, "local", "deterministic-v1");
    }
  }

  return assembleReport(
    request,
    createLocalContent(request),
    "local",
    "deterministic-v1",
  );
}

async function generateWithGemini(
  request: GenerateReportRequest,
  apiKey: string,
  model: string,
): Promise<z.infer<typeof generatedContentSchema>> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      store: false,
      input: buildPrompt(request),
      generation_config: {
        thinking_level: "low",
      },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseJsonSchema,
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const output = extractOutputText(payload);
  if (!output) throw new Error("Gemini returned no report text");

  return generatedContentSchema.parse(JSON.parse(output));
}

function buildPrompt({ investigation, template }: GenerateReportRequest): string {
  const compactFindings = investigation.findings.slice(0, 8).map((finding) => ({
    entityType: finding.entityType,
    entityId: finding.entityId,
    customerId: finding.customerId,
    riskScore: finding.riskScore,
    riskLevel: finding.riskLevel,
    pattern: finding.pattern,
    confidence: finding.confidence,
    aggregateAmountInr: finding.aggregateAmount,
    transactionCount: finding.transactionCount,
    windowStart: finding.windowStart,
    windowEnd: finding.windowEnd,
    evidence: finding.evidence.slice(0, 5),
    explanation: finding.explanation,
    recommendedAction: finding.recommendedAction,
  }));

  const reportFacts = {
    template,
    investigationId: investigation.investigationId,
    generatedAt: investigation.generatedAt,
    userRequest: investigation.decisionSummary.userRequest,
    detectedIntent: investigation.decisionSummary.detectedIntent,
    targetPattern: investigation.decisionSummary.targetPattern,
    targetEntity: investigation.decisionSummary.targetEntity,
    filters: investigation.decisionSummary.appliedFilters,
    strategy: investigation.decisionSummary.strategy,
    toolsUsed: investigation.decisionSummary.selectedTools,
    inputScope: investigation.decisionSummary.inputScope,
    analyzedScope: investigation.decisionSummary.analyzedScope,
    metrics: investigation.metrics,
    findings: compactFindings,
    model: {
      id: investigation.model.id,
      type: investigation.model.type,
      role: investigation.model.role,
    },
    safeguards: investigation.safeguards,
  };

  return [
    "You are drafting an internal AML investigation report for a regulated financial institution.",
    "Use only the supplied facts. Never invent customers, transactions, laws, certainty, or filing outcomes.",
    "Use Indian rupees (INR) for amounts. Keep identifiers exact.",
    "Write in concise professional language suitable for a compliance reviewer.",
    "Clearly distinguish detected signals from verified misconduct.",
    "Recommend human review where appropriate and state that this is decision support.",
    `Requested report template: ${templateLabel(template)}.`,
    "Return only JSON matching the requested schema.",
    JSON.stringify(reportFacts),
  ].join("\n");
}

function extractOutputText(payload: Record<string, unknown>): string | null {
  const direct = payload.output_text ?? payload.outputText;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = steps[stepIndex];
    if (!step || typeof step !== "object") continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    const text = content
      .map((block) =>
        block &&
        typeof block === "object" &&
        "text" in block &&
        typeof block.text === "string"
          ? block.text
          : "",
      )
      .join("");
    if (text.trim()) return text.trim();
  }
  return null;
}

function createLocalContent({
  investigation,
  template,
}: GenerateReportRequest): z.infer<typeof generatedContentSchema> {
  const topFindings = investigation.findings.slice(0, 5);
  const highRisk = investigation.findings.filter(
    (finding) => finding.riskLevel === "high",
  );
  const reportRecommended = investigation.findings.filter(
    (finding) => finding.recommendedAction === "report",
  );

  const findingsText =
    topFindings.length > 0
      ? topFindings
          .map(
            (finding, index) =>
              `${index + 1}. ${finding.entityId} — ${finding.riskLevel.toUpperCase()} risk (${finding.riskScore}/100), ${humanize(finding.pattern)}. ${finding.explanation}`,
          )
          .join("\n")
      : "No suspicious entities were returned for the selected query and scope.";

  const sections: ReportSection[] = [
    {
      heading: "Investigation scope and agent decision",
      content: `${investigation.decisionSummary.strategy} The agent interpreted the request as ${humanize(investigation.decisionSummary.detectedIntent)} and analyzed ${investigation.metrics.analyzedTransactions.toLocaleString("en-IN")} of ${investigation.metrics.inputTransactions.toLocaleString("en-IN")} available transactions across ${investigation.metrics.analyzedCustomers.toLocaleString("en-IN")} customers.`,
    },
    {
      heading: "Material findings",
      content: findingsText,
    },
    {
      heading: "Escalation recommendation",
      content:
        reportRecommended.length > 0
          ? `${reportRecommended.length} finding(s) meet the configured report recommendation threshold. Place these cases in human review before deciding whether any regulatory filing is required.`
          : highRisk.length > 0
            ? `${highRisk.length} high-risk finding(s) require prompt analyst review. Current evidence does not itself constitute a filing decision.`
            : "Continue monitoring the identified activity and document any additional evidence before escalating.",
    },
    {
      heading: "Method and controls",
      content: `The agent selected ${investigation.decisionSummary.selectedTools.map(humanize).join(", ")}. ${investigation.decisionSummary.skippedToolCount} unnecessary tool(s) were skipped. The active ${investigation.model.type} model is used only as decision support alongside AML rules and statistical features.`,
    },
  ];

  return {
    title: templateTitle(template, investigation.investigationId),
    subtitle: `Investigation ${investigation.investigationId} · ${humanize(investigation.decisionSummary.detectedIntent)}`,
    executiveSummary: `${investigation.summary} The analysis returned ${investigation.metrics.flaggedEntities} flagged entities, including ${investigation.metrics.highRiskEntities} high-risk entities. All recommended actions remain subject to qualified human review.`,
    sections,
    limitations: [
      ...investigation.safeguards.limitations,
      "This local draft uses deterministic templates and has not been enhanced by Gemini.",
    ],
  };
}

function assembleReport(
  request: GenerateReportRequest,
  content: z.infer<typeof generatedContentSchema>,
  source: GeneratedReport["source"],
  model: string,
): GeneratedReport {
  return {
    reportId: `RPT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    investigationId: request.investigation.investigationId,
    generatedAt: new Date().toISOString(),
    ...content,
    source,
    model,
    disclaimer: REPORT_DISCLAIMER,
  };
}

function templateTitle(
  template: ReportTemplate,
  investigationId: string,
): string {
  const label = templateLabel(template);
  return `${label}: ${investigationId}`;
}

function templateLabel(template: ReportTemplate): string {
  if (template === "case_narrative") return "Case narrative";
  if (template === "sar_review_brief") return "SAR review brief";
  return "Executive investigation summary";
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return "invalid structured response";
  if (error instanceof Error && error.name === "TimeoutError") return "request timed out";
  return "provider error";
}
