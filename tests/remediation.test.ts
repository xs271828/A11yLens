import { describe, expect, it } from "vitest";
import { calculateReadiness, remediationFor } from "../server/remediation.js";

describe("calculateReadiness", () => {
  it("penalizes each failed rule once even when it affects multiple nodes", () => {
    const issues = [
      { ruleId: "color-contrast", impact: "serious" as const, status: "violation" as const },
      { ruleId: "color-contrast", impact: "serious" as const, status: "violation" as const },
      { ruleId: "image-alt", impact: "critical" as const, status: "violation" as const },
      { ruleId: "color-contrast", impact: "review" as const, status: "needs-review" as const },
    ];

    expect(calculateReadiness(issues)).toBe(72);
  });

  it("keeps clean reports at 100", () => {
    expect(calculateReadiness([])).toBe(100);
  });
});

describe("remediationFor", () => {
  it("returns an actionable control label fix", () => {
    const fix = remediationFor("button-name", "Buttons must have discernible text");
    expect(fix.example).toContain("aria-label");
    expect(fix.validation).toContain("screen reader");
  });
});
