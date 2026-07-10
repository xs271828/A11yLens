import { describe, expect, it } from "vitest";
import { demoPage } from "../server/demo-page.js";

describe("demo audit target", () => {
  it("contains deliberate, stable accessibility fixtures", () => {
    expect(demoPage).toContain("<select>");
    expect(demoPage).toContain("<img src=");
    expect(demoPage).toContain("color: #a9aeab");
  });
});
