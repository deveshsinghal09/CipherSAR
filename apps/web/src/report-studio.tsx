/**
 * THESIS: The report reads as an evidence dossier, not a generic AI text panel.
 * OWN-WORLD: Cool ledger paper, regulatory ink, ruled metadata, and sparse evidence green.
 * STORY: Select a completed investigation, choose the reviewer artifact, generate, verify, export.
 * FIRST VIEWPORT: A narrow preparation index sits beside a large paper preview and clear primary action.
 * FORM: Regulatory Atlas; grounded direction seven; operate mode; seed e835159d.
 */
import type {
  GeneratedReport,
  InvestigationResponse,
  ReportTemplate,
} from "@ciphersar/shared";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateReport } from "./api";
import { Button, EmptyState, Skeleton } from "./components/ui";

const REPORT_TEMPLATES: Array<{
  id: ReportTemplate;
  name: string;
  detail: string;
}> = [
  {
    id: "executive_summary",
    name: "Executive summary",
    detail: "Concise risk, scope, and decision overview for senior reviewers.",
  },
  {
    id: "case_narrative",
    name: "Case narrative",
    detail: "Evidence-led chronology for an internal investigation record.",
  },
  {
    id: "sar_review_brief",
    name: "SAR review brief",
    detail: "Pre-filing decision support; never treated as a filed report.",
  },
];

export function ReportStudio({
  investigations,
}: {
  investigations: InvestigationResponse[];
}) {
  const [selectedInvestigationId, setSelectedInvestigationId] = useState(
    investigations[0]?.investigationId ?? "",
  );
  const [template, setTemplate] =
    useState<ReportTemplate>("executive_summary");
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reviewerConfirmed, setReviewerConfirmed] = useState(false);
  const generationSequence = useRef(0);

  useEffect(() => {
    if (
      investigations.length > 0 &&
      !investigations.some(
        (item) => item.investigationId === selectedInvestigationId,
      )
    ) {
      setSelectedInvestigationId(investigations[0]?.investigationId ?? "");
    }
  }, [investigations, selectedInvestigationId]);

  const investigation = useMemo(
    () =>
      investigations.find(
        (item) => item.investigationId === selectedInvestigationId,
      ) ??
      investigations[0] ??
      null,
    [investigations, selectedInvestigationId],
  );

  const createReport = async () => {
    if (!investigation) return;
    const requestSequence = generationSequence.current + 1;
    generationSequence.current = requestSequence;
    setLoading(true);
    setError(null);
    setExportError(null);
    setReviewerConfirmed(false);
    try {
      const generated = await generateReport({
        investigation,
        template,
      });
      if (generationSequence.current === requestSequence) {
        setReport(generated);
      }
    } catch (caught) {
      if (generationSequence.current === requestSequence) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The report draft could not be generated.",
        );
      }
    } finally {
      if (generationSequence.current === requestSequence) {
        setLoading(false);
      }
    }
  };

  const downloadPdf = async () => {
    if (!report || !reviewerConfirmed) return;
    setDownloading(true);
    setExportError(null);
    try {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 54;
      const contentWidth = pageWidth - margin * 2;
      let y = 56;

      const ensureSpace = (height: number) => {
        if (y + height <= pageHeight - 52) return;
        document.addPage();
        y = 56;
      };

      const write = (
        text: string,
        options: {
          size?: number;
          style?: "normal" | "bold";
          color?: [number, number, number];
          gap?: number;
        } = {},
      ) => {
        const size = options.size ?? 10;
        const lineHeight = size * 1.45;
        document.setFont("helvetica", options.style ?? "normal");
        document.setFontSize(size);
        document.setTextColor(...(options.color ?? [11, 31, 51]));
        const lines = document.splitTextToSize(
          pdfSafe(text),
          contentWidth,
        ) as string[];
        for (const line of lines) {
          ensureSpace(lineHeight);
          document.text(line, margin, y);
          y += lineHeight;
        }
        y += options.gap ?? 8;
      };

      document.setFillColor(11, 31, 51);
      document.rect(0, 0, pageWidth, 12, "F");
      write("CipherSAR / AI REPORT DOSSIER", {
        size: 8,
        style: "bold",
        color: [8, 119, 91],
        gap: 16,
      });
      write(report.title, { size: 22, style: "bold", gap: 6 });
      write(report.subtitle, { size: 10, color: [68, 84, 103], gap: 14 });
      write(
        `${report.reportId}  |  ${new Date(report.generatedAt).toLocaleString("en-IN")}  |  ${report.source === "gemini" ? `Gemini · ${report.model}` : "Local deterministic engine"}`,
        { size: 8, color: [68, 84, 103], gap: 18 },
      );
      write("EXECUTIVE SUMMARY", {
        size: 9,
        style: "bold",
        color: [8, 119, 91],
        gap: 7,
      });
      write(report.executiveSummary, { size: 10, gap: 18 });

      for (const section of report.sections) {
        write(section.heading.toUpperCase(), {
          size: 9,
          style: "bold",
          color: [23, 107, 135],
          gap: 7,
        });
        write(section.content, { size: 10, gap: 17 });
      }

      write("LIMITATIONS", {
        size: 9,
        style: "bold",
        color: [152, 98, 11],
        gap: 7,
      });
      for (const limitation of report.limitations) {
        write(`• ${limitation}`, { size: 9, color: [68, 84, 103], gap: 5 });
      }
      write(report.disclaimer, {
        size: 8,
        style: "bold",
        color: [188, 53, 69],
        gap: 0,
      });

      document.save(`${report.investigationId}-${template}.pdf`);
    } catch (caught) {
      setExportError(
        caught instanceof Error
          ? `PDF export failed: ${caught.message}`
          : "PDF export failed. Retry the download.",
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!investigation) {
    return (
      <div className="workspace-view report-studio">
        <ReportHeader />
        <section className="report-empty">
          <EmptyState
            icon={FileText}
            title="Complete an investigation first"
            detail="Report Studio uses an investigation's agent decisions, evidence, risk findings, and safeguards. Run an investigation, then return here to draft a reviewer-ready report."
          />
        </section>
      </div>
    );
  }

  return (
    <div className="workspace-view report-studio">
      <ReportHeader />

      <div className="report-workbench">
        <aside className="report-controls" aria-label="Report preparation">
          <div className="report-controls__heading">
            <span>Preparation index</span>
            <strong>Draft settings</strong>
          </div>

          <label className="report-field">
            <span>Source investigation</span>
            <select
              value={investigation.investigationId}
              disabled={loading}
              onChange={(event) => {
                generationSequence.current += 1;
                setSelectedInvestigationId(event.target.value);
                setReport(null);
                setError(null);
                setExportError(null);
                setReviewerConfirmed(false);
              }}
            >
              {investigations.map((item) => (
                <option key={item.investigationId} value={item.investigationId}>
                  {item.investigationId} · {item.metrics.flaggedEntities} flags
                </option>
              ))}
            </select>
          </label>

          <fieldset className="report-template-list">
            <legend>Artifact type</legend>
            {REPORT_TEMPLATES.map((item) => (
              <label
                className={`report-template ${template === item.id ? "is-selected" : ""}`}
                key={item.id}
              >
                <input
                  type="radio"
                  name="report-template"
                  value={item.id}
                  checked={template === item.id}
                  disabled={loading}
                  onChange={() => {
                    generationSequence.current += 1;
                    setTemplate(item.id);
                    setReport(null);
                    setError(null);
                    setExportError(null);
                    setReviewerConfirmed(false);
                  }}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                <i aria-hidden="true">
                  {template === item.id ? <CheckCircle2 size={16} /> : null}
                </i>
              </label>
            ))}
          </fieldset>

          <dl className="report-source-facts">
            <div>
              <dt>Intent</dt>
              <dd>{humanize(investigation.parsedQuery.intent)}</dd>
            </div>
            <div>
              <dt>Findings</dt>
              <dd>{investigation.metrics.flaggedEntities}</dd>
            </div>
            <div>
              <dt>High risk</dt>
              <dd>{investigation.metrics.highRiskEntities}</dd>
            </div>
            <div>
              <dt>Tools used</dt>
              <dd>{investigation.plan.steps.length}</dd>
            </div>
          </dl>

          <div className="report-privacy-note">
            <ShieldCheck size={17} />
            <p>
              Gemini receives only the selected investigation summary and top
              findings. The API key remains on the server.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="report-generate"
            onClick={() => void createReport()}
            loading={loading}
            leadingIcon={<Sparkles size={17} />}
          >
            {report ? "Regenerate draft" : "Generate report"}
          </Button>
        </aside>

        <section className="report-preview" aria-live="polite">
          {loading ? (
            <ReportSkeleton />
          ) : report ? (
            <article className="report-paper">
              <header className="report-paper__header">
                <div className="report-paper__brand">
                  <ShieldCheck size={18} />
                  <span>CipherSAR</span>
                  <em>AI report dossier</em>
                </div>
                <div className="report-paper__actions">
                  <span
                    className={`report-provider report-provider--${report.source}`}
                  >
                    {report.source === "gemini" ? (
                      <BrainCircuit size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {report.source === "gemini"
                      ? `Gemini · ${report.model}`
                      : "Local fallback"}
                  </span>
                  <label className="report-review-check">
                    <input
                      type="checkbox"
                      checked={reviewerConfirmed}
                      onChange={(event) =>
                        setReviewerConfirmed(event.target.checked)
                      }
                    />
                    <span>Evidence reviewed</span>
                  </label>
                  <Button
                    onClick={() => void downloadPdf()}
                    loading={downloading}
                    disabled={!reviewerConfirmed}
                    leadingIcon={<Download size={15} />}
                  >
                    Download PDF
                  </Button>
                </div>
              </header>

              <div className="report-paper__meta">
                <span>{report.reportId}</span>
                <span>{report.investigationId}</span>
                <span>
                  <Clock3 size={12} />
                  {new Date(report.generatedAt).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="report-paper__title">
                <span>Reviewer draft</span>
                <h2>{report.title}</h2>
                <p>{report.subtitle}</p>
              </div>

              <section className="report-summary">
                <span>Executive summary</span>
                <p>{report.executiveSummary}</p>
              </section>

              <div className="report-section-list">
                {report.sections.map((section) => (
                  <section key={section.heading}>
                    <h3>{section.heading}</h3>
                    <p>{section.content}</p>
                  </section>
                ))}
              </div>

              <section className="report-limitations">
                <h3>Limitations and reviewer controls</h3>
                <ul>
                  {report.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>

              <footer className="report-paper__footer">
                <AlertTriangle size={17} />
                <p>{report.disclaimer}</p>
              </footer>
            </article>
          ) : (
            <div className="report-preview__empty">
              <div className="report-preview__folio">CS / REPORT</div>
              <FileText size={34} strokeWidth={1.5} />
              <h2>Evidence becomes a reviewer-ready dossier here.</h2>
              <p>
                Choose an artifact type and generate the draft. CipherSAR keeps
                the agent plan, risk evidence, limitations, and human controls
                visible in the final document.
              </p>
              <div className="report-preview__sequence">
                <span>01 Select</span>
                <span>02 Generate</span>
                <span>03 Validate</span>
                <span>04 Export</span>
              </div>
            </div>
          )}

          {error ? (
            <div className="report-error" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Report generation stopped</strong>
                <span>{error} Check the API and try again.</span>
              </div>
            </div>
          ) : null}
          {exportError ? (
            <div className="report-error" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>PDF export stopped</strong>
                <span>{exportError}</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ReportHeader() {
  return (
    <header className="report-studio__header">
      <div>
        <span>Report Studio</span>
        <h1>Turn evidence into a defensible review brief.</h1>
        <p>
          Generate a controlled draft from the selected investigation, verify
          every conclusion, and export the reviewer copy as PDF.
        </p>
      </div>
      <div className="report-studio__assurance">
        <ShieldCheck size={18} />
        <span>Human approval gate</span>
        <strong>Always required</strong>
      </div>
    </header>
  );
}

function ReportSkeleton() {
  return (
    <div className="report-paper report-paper--loading" aria-label="Generating report">
      <div className="report-paper__header">
        <Skeleton className="report-skeleton__brand" />
        <Skeleton className="report-skeleton__button" />
      </div>
      <Skeleton className="report-skeleton__meta" />
      <Skeleton className="report-skeleton__title" />
      <Skeleton className="report-skeleton__line" />
      <Skeleton className="report-skeleton__line report-skeleton__line--short" />
      <Skeleton className="report-skeleton__section" />
      <Skeleton className="report-skeleton__section" />
    </div>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function pdfSafe(value: string): string {
  return value
    .replaceAll("₹", "INR ")
    .replaceAll("—", "-")
    .replaceAll("·", "|")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'");
}
