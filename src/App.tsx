import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clipboard,
  Code2,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Focus,
  Gauge,
  Globe2,
  Info,
  LoaderCircle,
  Monitor,
  PanelRightOpen,
  Play,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { AuditIssue, AuditReport, Impact, ScanError } from "./types";

type FilterValue = "all" | Impact;
type DetailTab = "evidence" | "remediation";

const impactOrder: Impact[] = ["critical", "serious", "moderate", "minor", "review"];
const impactLabel: Record<Impact, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
  review: "Review",
};

const impactIcon: Record<Impact, typeof AlertTriangle> = {
  critical: X,
  serious: AlertTriangle,
  moderate: CircleDot,
  minor: Info,
  review: Eye,
};

function formatDuration(milliseconds: number): string {
  return milliseconds < 1_000 ? `${milliseconds} ms` : `${(milliseconds / 1_000).toFixed(1)} s`;
}

function issueCount(report: AuditReport | null, impact: Impact): number {
  return report?.issues.filter((issue) => issue.impact === impact).length ?? 0;
}

function exportReport(report: AuditReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ImpactBadge({ impact }: { impact: Impact }) {
  const Icon = impactIcon[impact];
  return (
    <span className={`impact-badge impact-${impact}`}>
      <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
      {impactLabel[impact]}
    </span>
  );
}

function TopBar({ report }: { report: AuditReport | null }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="A11yLens home">
        <span className="brand-mark"><Focus size={18} aria-hidden="true" /></span>
        <span>A11yLens</span>
      </a>
      <div className="header-context" aria-label="Current workspace">
        <span>Audits</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{report?.title ?? "New audit"}</strong>
      </div>
      <div className="topbar-actions">
        <span className="engine-status">
          {report?.engine.semanticMode === "ai" ? <Sparkles size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
          {report?.engine.semanticMode === "ai" ? "AI review on" : "Rules mode"}
        </span>
        <a className="icon-button" href="#report" aria-label="Open report workspace">
          <PanelRightOpen size={18} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

function ScanBar({
  target,
  setTarget,
  loading,
  onSubmit,
  onDemo,
}: {
  target: string;
  setTarget: (target: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
  onDemo: () => void;
}) {
  return (
    <section className="scan-band" id="audit" aria-labelledby="audit-heading">
      <div className="scan-heading">
        <div>
          <span className="section-kicker">Audit workspace</span>
          <div className="title-line">
            <h1 id="audit-heading">Accessibility audit</h1>
            <span className="standard-chip"><ShieldCheck size={13} aria-hidden="true" /> WCAG 2.2 AA</span>
          </div>
        </div>
        <button className="demo-button" type="button" onClick={onDemo} disabled={loading}>
          <Play size={15} fill="currentColor" aria-hidden="true" />
          Run demo
        </button>
      </div>
      <form className="scan-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="audit-url">Page URL</label>
        <div className="url-input-wrap">
          <span className="input-prefix"><Globe2 size={15} aria-hidden="true" /> URL</span>
          <Search size={17} aria-hidden="true" />
          <input
            id="audit-url"
            type="text"
            inputMode="url"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="https://example.com"
            autoComplete="url"
            disabled={loading}
          />
        </div>
        <button className="primary-button" type="submit" disabled={loading || !target.trim()}>
          {loading ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <ScanSearch size={17} aria-hidden="true" />}
          {loading ? "Scanning" : "Run audit"}
        </button>
      </form>
    </section>
  );
}

function Summary({ report }: { report: AuditReport }) {
  const scanned = new Date(report.scannedAt);
  const readinessState = report.summary.readiness >= 85 ? "Ready" : report.summary.readiness >= 60 ? "Review" : "At risk";
  return (
    <section className="summary-strip" aria-label="Audit summary">
      <div className="readiness-block">
        <div className="metric-icon metric-readiness"><Gauge size={20} aria-hidden="true" /></div>
        <div>
          <span className="metric-label">Automated readiness</span>
          <div className="readiness-line">
            <strong>{report.summary.readiness}</strong><span>/100</span>
          </div>
          <span className="score-state">{readinessState}</span>
        </div>
        <div className="readiness-track" aria-hidden="true">
          <span style={{ width: `${report.summary.readiness}%` }} />
        </div>
      </div>
      <div className="metric-block metric-violations">
        <span className="metric-label"><AlertTriangle size={13} aria-hidden="true" /> Violations</span>
        <strong>{report.summary.violations}<small> issues</small></strong>
        <span className="metric-note"><AlertTriangle size={13} aria-hidden="true" /> Action required</span>
      </div>
      <div className="metric-block metric-review">
        <span className="metric-label"><Eye size={13} aria-hidden="true" /> Needs review</span>
        <strong>{report.summary.needsReview}<small> item</small></strong>
        <span className="metric-note"><Eye size={13} aria-hidden="true" /> Human decision</span>
      </div>
      <div className="metric-block metric-passes">
        <span className="metric-label"><CheckCircle2 size={13} aria-hidden="true" /> Checks passed</span>
        <strong>{report.summary.passes}<small> rules</small></strong>
        <span className="metric-note success"><CheckCircle2 size={13} aria-hidden="true" /> Automated rules</span>
      </div>
      <div className="metric-block scan-meta">
        <span className="metric-label"><Monitor size={13} aria-hidden="true" /> Last scanned</span>
        <strong>{scanned.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
        <span className="metric-note">{formatDuration(report.durationMs)} / axe {report.engine.axe}</span>
      </div>
    </section>
  );
}

function Filters({
  report,
  active,
  onChange,
}: {
  report: AuditReport;
  active: FilterValue;
  onChange: (filter: FilterValue) => void;
}) {
  return (
    <aside className="filters" aria-label="Issue filters">
      <div className="panel-heading compact">
        <span><Filter size={15} aria-hidden="true" /> Filters</span>
        <button type="button" className="clear-filter" onClick={() => onChange("all")} disabled={active === "all"}>Clear</button>
      </div>
      <div className="filter-group">
        <button className={`filter-row ${active === "all" ? "selected" : ""}`} type="button" onClick={() => onChange("all")}>
          <span className="filter-name"><ShieldCheck size={15} aria-hidden="true" /> All findings</span>
          <span className="count-pill">{report.issues.length}</span>
        </button>
        {impactOrder.map((impact) => {
          const Icon = impactIcon[impact];
          return (
            <button
              key={impact}
              className={`filter-row ${active === impact ? "selected" : ""}`}
              type="button"
              onClick={() => onChange(impact)}
            >
              <span className="filter-name"><Icon size={15} aria-hidden="true" /> {impactLabel[impact]}</span>
              <span className="count-pill">{issueCount(report, impact)}</span>
            </button>
          );
        })}
      </div>
      <div className="scope-block">
        <span className="scope-label">Scan scope</span>
        <div><Check size={14} aria-hidden="true" /> WCAG 2.2 A / AA</div>
        <div><Check size={14} aria-hidden="true" /> Best practices</div>
        <div><Check size={14} aria-hidden="true" /> Rendered viewport</div>
      </div>
    </aside>
  );
}

function IssueList({
  issues,
  selectedId,
  onSelect,
}: {
  issues: AuditIssue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="issue-panel" id="issues" aria-labelledby="issues-heading">
      <div className="panel-heading">
        <div>
          <h2 id="issues-heading">Findings</h2>
          <span>{issues.length} shown / sorted by impact</span>
        </div>
        <span className="priority-label">Priority order</span>
      </div>
      <div className="issue-scroll">
        {issues.length === 0 ? (
          <div className="empty-filter"><CheckCircle2 size={24} aria-hidden="true" /><span>No findings in this filter</span></div>
        ) : (
          issues.map((issue, index) => (
            <button
              className={`issue-row ${selectedId === issue.id ? "selected" : ""}`}
              type="button"
              key={issue.id}
              onClick={() => onSelect(issue.id)}
              aria-pressed={selectedId === issue.id}
            >
              <span className={`severity-rail impact-${issue.impact}`} aria-hidden="true" />
              <span className="issue-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="issue-content">
                <span className="issue-topline"><ImpactBadge impact={issue.impact} /><code>{issue.ruleId}</code></span>
                <strong>{issue.title}</strong>
                <span className="issue-bottomline">
                  <span className="selector-line">{issue.selector || "Document-level finding"}</span>
                  <span>{issue.wcag[0] ? `WCAG ${issue.wcag[0]}` : "Practice"}</span>
                </span>
              </span>
              <ChevronRight className="issue-chevron" size={17} aria-hidden="true" />
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function EvidenceScreenshot({ report, issue }: { report: AuditReport; issue: AuditIssue }) {
  const bounds = issue.bounds;
  const overlay = bounds
    ? {
        left: `${(bounds.x / report.viewport.width) * 100}%`,
        top: `${(bounds.y / report.viewport.height) * 100}%`,
        width: `${(bounds.width / report.viewport.width) * 100}%`,
        height: `${(bounds.height / report.viewport.height) * 100}%`,
      }
    : undefined;

  return (
    <div className="screenshot-frame">
      <div className="browser-bar" aria-hidden="true">
        <span className="browser-dot red" /><span className="browser-dot yellow" /><span className="browser-dot green" />
        <span className="browser-address">{report.displayUrl}</span>
      </div>
      <div className="screenshot-canvas">
        <img src={report.screenshot} alt={`Captured page for ${report.title}`} />
        {overlay && <span className={`element-highlight impact-${issue.impact}`} style={overlay}><span>{issue.ruleId}</span></span>}
      </div>
    </div>
  );
}

function Inspector({
  report,
  issue,
  detailTab,
  setDetailTab,
  position,
  total,
  onMove,
}: {
  report: AuditReport;
  issue: AuditIssue;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  position: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copySelector = async () => {
    await navigator.clipboard.writeText(issue.selector || issue.html);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <section className="inspector" id="report" aria-labelledby="inspector-heading">
      <div className="panel-heading inspector-heading">
        <div>
          <span className="section-kicker">Finding {position} of {total}</span>
          <h2 id="inspector-heading">{issue.title}</h2>
        </div>
        <div className="inspector-actions">
          <ImpactBadge impact={issue.impact} />
          <div className="finding-navigation">
            <button type="button" onClick={() => onMove(-1)} disabled={position <= 1} aria-label="Previous finding"><ChevronLeft size={15} /></button>
            <button type="button" onClick={() => onMove(1)} disabled={position >= total} aria-label="Next finding"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
      <EvidenceScreenshot report={report} issue={issue} />
      <div className="detail-tabs" role="tablist" aria-label="Finding detail sections">
        <button role="tab" aria-selected={detailTab === "evidence"} className={detailTab === "evidence" ? "active" : ""} onClick={() => setDetailTab("evidence")} type="button">
          <Eye size={15} aria-hidden="true" /> Evidence
        </button>
        <button role="tab" aria-selected={detailTab === "remediation"} className={detailTab === "remediation" ? "active" : ""} onClick={() => setDetailTab("remediation")} type="button">
          <Code2 size={15} aria-hidden="true" /> Remediation
        </button>
      </div>
      {detailTab === "evidence" ? (
        <div className="detail-content" role="tabpanel">
          <div className="detail-summary-grid">
            <div className="detail-section">
              <div className="detail-label"><Sparkles size={14} aria-hidden="true" /> User impact <span className={`source-tag ${issue.semantic.source}`}>{issue.semantic.source}</span></div>
              <p>{issue.semantic.userImpact}</p>
            </div>
            <div className="detail-section">
              <div className="detail-label"><ShieldCheck size={14} aria-hidden="true" /> Rule evidence</div>
              <p>{issue.semantic.evidence}</p>
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-label">DOM target</div>
            <div className="code-line"><code>{issue.selector || issue.html}</code><button type="button" onClick={copySelector} aria-label="Copy DOM target">{copied ? <Check size={15} /> : <Clipboard size={15} />}</button></div>
            <pre className="html-evidence"><code>{issue.html}</code></pre>
          </div>
          <div className="detail-footer">
            <span>{issue.wcag.length > 0 ? issue.wcag.map((tag) => `WCAG ${tag}`).join(" / ") : "Best practice"}</span>
            <a href={issue.helpUrl} target="_blank" rel="noreferrer">Rule reference <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
        </div>
      ) : (
        <div className="detail-content" role="tabpanel">
          <div className="fix-summary">
            <span className="fix-icon"><Code2 size={17} aria-hidden="true" /></span>
            <div><span className="detail-label">Recommended change</span><p>{issue.semantic.recommendation}</p></div>
          </div>
          {issue.remediation.example && <pre className="fix-code"><code>{issue.remediation.example}</code></pre>}
          <div className="validation-block">
            <ShieldCheck size={17} aria-hidden="true" />
            <div><span className="detail-label">Validation</span><p>{issue.remediation.validation}</p></div>
          </div>
          <div className="human-review-note"><Info size={15} aria-hidden="true" /> Human review remains required before making a conformance claim.</div>
        </div>
      )}
    </section>
  );
}

function LoadingState({ phase }: { phase: number }) {
  const phases = ["Launching browser", "Capturing rendered page", "Running accessibility rules", "Building evidence report"];
  return (
    <section className="loading-workspace" aria-live="polite">
      <div className="loading-visual"><ScanSearch size={28} aria-hidden="true" /><span className="scan-line" /></div>
      <strong>{phases[Math.min(phase, phases.length - 1)]}</strong>
      <div className="phase-dots" aria-hidden="true">{phases.map((_, index) => <span key={index} className={index <= phase ? "active" : ""} />)}</div>
    </section>
  );
}

export function App() {
  const [target, setTarget] = useState("demo://checkout");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("evidence");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async (scanTarget: string) => {
    setLoading(true);
    setError(null);
    setPhase(0);
    const phaseTimer = window.setInterval(() => setPhase((value) => Math.min(value + 1, 3)), 1_200);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: scanTarget.trim() }),
      });
      const payload = (await response.json()) as AuditReport | ScanError;
      if (!response.ok || "error" in payload) {
        const scanError = payload as ScanError;
        throw new Error(scanError.detail ?? scanError.error);
      }
      setReport(payload);
      setFilter("all");
      setSelectedId(payload.issues[0]?.id ?? null);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "The audit could not be completed.");
    } finally {
      window.clearInterval(phaseTimer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runScan("demo://checkout");
  }, [runScan]);

  const filteredIssues = useMemo(
    () => report?.issues.filter((issue) => filter === "all" || issue.impact === filter) ?? [],
    [filter, report],
  );
  const selectedIssue = filteredIssues.find((issue) => issue.id === selectedId) ?? filteredIssues[0] ?? null;
  const selectedPosition = selectedIssue ? filteredIssues.findIndex((issue) => issue.id === selectedIssue.id) : -1;

  useEffect(() => {
    if (filteredIssues.length > 0 && !filteredIssues.some((issue) => issue.id === selectedId)) {
      setSelectedId(filteredIssues[0].id);
    }
  }, [filteredIssues, selectedId]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runScan(target);
  };

  const moveFinding = (direction: -1 | 1) => {
    if (selectedPosition < 0) return;
    const next = filteredIssues[selectedPosition + direction];
    if (next) {
      setSelectedId(next.id);
      setDetailTab("evidence");
    }
  };

  return (
    <div className="app-shell">
      <TopBar report={report} />
      <main>
        <ScanBar target={target} setTarget={setTarget} loading={loading} onSubmit={onSubmit} onDemo={() => { setTarget("demo://checkout"); void runScan("demo://checkout"); }} />
        {error && (
          <div className="error-banner" role="alert"><AlertTriangle size={18} aria-hidden="true" /><span><strong>Audit failed.</strong> {error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={17} /></button></div>
        )}
        {loading && !report ? <LoadingState phase={phase} /> : report ? (
          <>
            <div className="report-toolbar">
              <div className="report-title"><span className="page-favicon"><ArrowUpRight size={15} aria-hidden="true" /></span><div><strong>{report.title}</strong><span>{report.displayUrl}</span></div></div>
              <div className="workflow-path" aria-label="Audit workflow">
                <span className="complete"><Check size={12} aria-hidden="true" /> Target</span>
                <ChevronRight size={13} aria-hidden="true" />
                <span className={detailTab === "evidence" ? "active" : "complete"}>Findings</span>
                <ChevronRight size={13} aria-hidden="true" />
                <span className={detailTab === "remediation" ? "active" : ""}>Remediation</span>
              </div>
              <div className="report-actions">
                {loading && <span className="refreshing"><LoaderCircle className="spin" size={14} /> Refreshing report</span>}
                <button className="secondary-button" type="button" onClick={() => exportReport(report)}><Download size={15} aria-hidden="true" /> Export</button>
              </div>
            </div>
            <Summary report={report} />
            <div className="workspace-grid">
              <Filters report={report} active={filter} onChange={setFilter} />
              <IssueList issues={filteredIssues} selectedId={selectedIssue?.id ?? null} onSelect={(id) => { setSelectedId(id); setDetailTab("evidence"); }} />
              {selectedIssue && (
                <Inspector
                  report={report}
                  issue={selectedIssue}
                  detailTab={detailTab}
                  setDetailTab={setDetailTab}
                  position={selectedPosition + 1}
                  total={filteredIssues.length}
                  onMove={moveFinding}
                />
              )}
            </div>
          </>
        ) : <LoadingState phase={phase} />}
      </main>
    </div>
  );
}
