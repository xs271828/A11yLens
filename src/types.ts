export type Impact = "critical" | "serious" | "moderate" | "minor" | "review";

export type AuditIssue = {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  impact: Impact;
  status: "violation" | "needs-review";
  wcag: string[];
  helpUrl: string;
  selector: string;
  html: string;
  failureSummary: string;
  bounds: { x: number; y: number; width: number; height: number } | null;
  remediation: {
    summary: string;
    example?: string;
    validation: string;
  };
  semantic: {
    userImpact: string;
    evidence: string;
    recommendation: string;
    confidence: "high" | "medium" | "low";
    source: "rules" | "ai";
    needsHumanReview: boolean;
  };
};

export type AuditReport = {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  scannedAt: string;
  durationMs: number;
  viewport: { width: number; height: number };
  screenshot: string;
  summary: {
    readiness: number;
    violations: number;
    needsReview: number;
    passes: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  issues: AuditIssue[];
  engine: {
    axe: string;
    browser: string;
    semanticMode: "rules" | "ai";
  };
};

export type ScanRequest = {
  target: string;
};

export type ScanError = {
  error: string;
  detail?: string;
};
