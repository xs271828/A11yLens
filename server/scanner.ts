import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { AuditIssue, AuditReport, Impact } from "../src/types.js";
import { assertPublicUrl } from "./security.js";
import { calculateReadiness, defaultSemantic, remediationFor } from "./remediation.js";
import { enrichWithSemanticAi } from "./semantic.js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const axeVersion = (require("axe-core/package.json") as { version: string }).version;
const viewport = { width: 1440, height: 900 };
const installedBrowserPaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

type AxeNode = {
  html: string;
  target: Array<string | string[]>;
  failureSummary?: string;
};

type AxeResult = {
  id: string;
  impact: Exclude<Impact, "review"> | null;
  tags: string[];
  help: string;
  description: string;
  helpUrl: string;
  nodes: AxeNode[];
};

type AxeResults = {
  violations: AxeResult[];
  incomplete: AxeResult[];
  passes: AxeResult[];
};

function selectorFromTarget(target: AxeNode["target"]): string {
  const first = target[0];
  return Array.isArray(first) ? first.at(-1) ?? "" : first ?? "";
}

async function boundsFor(page: Page, selector: string) {
  if (!selector) return null;
  try {
    const box = await page.locator(selector).first().boundingBox({ timeout: 1_000 });
    if (!box) return null;
    return {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  } catch {
    return null;
  }
}

function tagsToWcag(tags: string[]): string[] {
  return tags
    .filter((tag) => /^wcag\d{3,4}$/.test(tag))
    .map((tag) => `${tag.slice(4, -2)}.${tag.slice(-2, -1)}.${tag.slice(-1)}`)
    .filter((value, index, values) => values.indexOf(value) === index);
}

async function flattenResults(
  page: Page,
  results: AxeResult[],
  status: AuditIssue["status"],
  limit: number,
): Promise<AuditIssue[]> {
  const flattened = results
    .flatMap((result) =>
      result.nodes.map((node, nodeIndex) => ({ result, node, nodeIndex })),
    )
    .slice(0, limit);

  return Promise.all(
    flattened.map(async ({ result, node, nodeIndex }) => {
      const impact: Impact = status === "needs-review" ? "review" : result.impact ?? "moderate";
      const selector = selectorFromTarget(node.target);
      const remediation = remediationFor(result.id, result.help);
      const failureSummary = node.failureSummary ?? result.description;
      return {
        id: `${result.id}-${nodeIndex}-${Math.random().toString(36).slice(2, 7)}`,
        ruleId: result.id,
        title: result.help,
        description: result.description,
        impact,
        status,
        wcag: tagsToWcag(result.tags),
        helpUrl: result.helpUrl,
        selector,
        html: node.html,
        failureSummary,
        bounds: await boundsFor(page, selector),
        remediation,
        semantic: defaultSemantic(result.id, impact, failureSummary, remediation),
      } satisfies AuditIssue;
    }),
  );
}

async function protectContext(context: BrowserContext): Promise<void> {
  const validatedHosts = new Set<string>();
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      await route.continue();
      return;
    }
    try {
      const parsed = new URL(url);
      if (!validatedHosts.has(parsed.hostname)) {
        await assertPublicUrl(url);
        validatedHosts.add(parsed.hostname);
      }
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}

export async function scanPage(
  target: string,
  options: { trustedLocal?: boolean; displayUrl?: string } = {},
): Promise<AuditReport> {
  const startedAt = Date.now();
  const safeTarget = options.trustedLocal ? new URL(target) : await assertPublicUrl(target);
  const executablePath =
    process.env.A11YLENS_BROWSER_PATH ?? installedBrowserPaths.find((candidate) => existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  const browserVersion = browser.version();
  const context = await browser.newContext({
    viewport,
    colorScheme: "light",
    reducedMotion: "reduce",
    userAgent: "A11yLens/0.1 accessibility audit bot",
  });
  if (!options.trustedLocal) await protectContext(context);

  try {
    const page = await context.newPage();
    await page.goto(safeTarget.toString(), { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForTimeout(500);
    await page.addScriptTag({ path: axePath });

    const [title, screenshotBuffer, axeResults] = await Promise.all([
      page.title(),
      page.screenshot({ type: "jpeg", quality: 76, fullPage: false }),
      page.evaluate(`(async () => window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]
        },
        resultTypes: ["violations", "incomplete", "passes"]
      }))()`) as Promise<AxeResults>,
    ]);

    const screenshot = `data:image/jpeg;base64,${screenshotBuffer.toString("base64")}`;
    const [violations, reviews] = await Promise.all([
      flattenResults(page, axeResults.violations, "violation", 40),
      flattenResults(page, axeResults.incomplete, "needs-review", 10),
    ]);
    const semanticResult = await enrichWithSemanticAi([...violations, ...reviews], screenshot, title);
    const issues = semanticResult.issues;
    const count = (impact: Impact) => issues.filter((issue) => issue.impact === impact).length;

    return {
      id: `audit-${Date.now().toString(36)}`,
      title: title || safeTarget.hostname,
      url: safeTarget.toString(),
      displayUrl: options.displayUrl ?? safeTarget.toString(),
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      viewport,
      screenshot,
      summary: {
        readiness: calculateReadiness(issues),
        violations: violations.length,
        needsReview: reviews.length,
        passes: axeResults.passes.length,
        critical: count("critical"),
        serious: count("serious"),
        moderate: count("moderate"),
        minor: count("minor"),
      },
      issues,
      engine: {
        axe: axeVersion,
        browser: `Chromium ${browserVersion}`,
        semanticMode: semanticResult.enabled ? "ai" : "rules",
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
