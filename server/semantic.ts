import { z } from "zod";
import type { AuditIssue } from "../src/types.js";

const responseSchema = z.object({
  issues: z.array(
    z.object({
      id: z.string(),
      userImpact: z.string(),
      evidence: z.string(),
      recommendation: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
});

function parseJsonContent(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced?.[1] ?? content);
}

export async function enrichWithSemanticAi(
  issues: AuditIssue[],
  screenshot: string,
  pageTitle: string,
): Promise<{ issues: AuditIssue[]; enabled: boolean }> {
  const apiKey = process.env.A11YLENS_AI_API_KEY;
  const model = process.env.A11YLENS_AI_MODEL;
  if (!apiKey || !model) return { issues, enabled: false };

  const baseUrl = (process.env.A11YLENS_AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const candidates = issues.slice(0, 12).map((issue) => ({
    id: issue.id,
    rule: issue.ruleId,
    impact: issue.impact,
    selector: issue.selector,
    html: issue.html,
    failure: issue.failureSummary,
  }));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an accessibility review assistant. Use only the supplied screenshot and axe evidence. Never claim WCAG conformance. Return concise JSON with an issues array.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Review the page titled ${JSON.stringify(pageTitle)}. For each item, return id, userImpact, evidence, recommendation, and confidence (high, medium, or low). Flag uncertainty in the wording. Findings: ${JSON.stringify(candidates)}`,
              },
              { type: "image_url", image_url: { url: screenshot, detail: "low" } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return { issues, enabled: false };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { issues, enabled: false };

    const parsed = responseSchema.parse(parseJsonContent(content));
    const byId = new Map(parsed.issues.map((issue) => [issue.id, issue]));
    return {
      enabled: true,
      issues: issues.map((issue) => {
        const semantic = byId.get(issue.id);
        if (!semantic) return issue;
        return {
          ...issue,
          semantic: {
            ...semantic,
            source: "ai" as const,
            needsHumanReview: true,
          },
        };
      }),
    };
  } catch {
    return { issues, enabled: false };
  }
}
