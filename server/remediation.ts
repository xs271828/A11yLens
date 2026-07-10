import type { AuditIssue, Impact } from "../src/types.js";

type Remediation = AuditIssue["remediation"];

const fixes: Record<string, Remediation> = {
  "button-name": {
    summary: "Give the control an accessible name that states its action.",
    example: `<button aria-label="Open shopping cart"><CartIcon aria-hidden="true" /></button>`,
    validation: "Focus the button with a screen reader and confirm its announced name matches the visible action.",
  },
  "color-contrast": {
    summary: "Increase foreground/background contrast without relying on font weight alone.",
    example: `.helper-text { color: #4b5563; }`,
    validation: "Re-run the contrast rule in the rendered state and test focused, disabled, and hover variants.",
  },
  "image-alt": {
    summary: "Add concise alternative text, or an empty alt attribute when the image is decorative.",
    example: `<img src="product.jpg" alt="Canvas field backpack in moss green" />`,
    validation: "Hide the image and confirm the remaining text communicates the same purpose.",
  },
  label: {
    summary: "Associate a visible label with the form control using for/id or an explicit ARIA name.",
    example: `<label htmlFor="email">Email address</label>\n<input id="email" name="email" type="email" />`,
    validation: "Click the label and confirm focus moves to the intended field; verify the screen-reader announcement.",
  },
  "link-name": {
    summary: "Give the link an accessible name that describes its destination or purpose.",
    example: `<a href="/orders" aria-label="View order history"><HistoryIcon aria-hidden="true" /></a>`,
    validation: "Review links out of context and confirm each name remains distinguishable.",
  },
  "select-name": {
    summary: "Connect a visible label to the select control.",
    example: `<label htmlFor="country">Country</label>\n<select id="country" name="country">...</select>`,
    validation: "Confirm assistive technology announces both the label and current value.",
  },
};

export function remediationFor(ruleId: string, title: string): Remediation {
  return fixes[ruleId] ?? {
    summary: `Resolve “${title}” using the linked rule guidance and preserve the current interaction intent.`,
    validation: "Re-run automated checks, then verify the affected workflow with keyboard and assistive technology.",
  };
}

const weights: Record<Impact, number> = {
  critical: 18,
  serious: 10,
  moderate: 5,
  minor: 2,
  review: 0,
};

export function calculateReadiness(
  issues: Array<Pick<AuditIssue, "impact" | "status" | "ruleId">>,
): number {
  const rules = new Map<string, Impact>();
  for (const issue of issues) {
    if (issue.status === "violation" && !rules.has(issue.ruleId)) {
      rules.set(issue.ruleId, issue.impact);
    }
  }
  const penalty = [...rules.values()].reduce((total, impact) => total + weights[impact], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function defaultSemantic(
  ruleId: string,
  impact: Impact,
  failureSummary: string,
  remediation: Remediation,
): AuditIssue["semantic"] {
  const userImpactByRule: Record<string, string> = {
    "button-name": "Screen-reader users may hear an unnamed button and be unable to predict the action.",
    "color-contrast": "People with low vision or color-vision differences may not be able to read this content reliably.",
    "image-alt": "People who cannot see the image lose the information or purpose it contributes.",
    label: "Screen-reader and voice-control users may not know what information the field expects.",
    "link-name": "Screen-reader users may encounter an unnamed destination when navigating by links.",
  };

  return {
    userImpact:
      userImpactByRule[ruleId] ??
      `This ${impact === "review" ? "candidate" : impact + " issue"} may block or confuse people using assistive technology.`,
    evidence: failureSummary.replace(/^Fix (?:any|all) of the following:\s*/i, ""),
    recommendation: remediation.summary,
    confidence: impact === "review" ? "low" : "high",
    source: "rules",
    needsHumanReview: true,
  };
}
