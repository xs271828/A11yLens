import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "../server/security.js";

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.2", "192.168.1.1", "169.254.1.2", "::1", "fd00::1"])(
    "blocks %s",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("allows %s", (address) =>
    expect(isPrivateAddress(address)).toBe(false),
  );
});

describe("assertPublicUrl", () => {
  it("rejects local and credential-bearing URLs before navigation", async () => {
    await expect(assertPublicUrl("http://localhost:3000")).rejects.toThrow("Private");
    await expect(assertPublicUrl("https://user:pass@example.com")).rejects.toThrow("credentials");
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow("HTTP");
  });
});
