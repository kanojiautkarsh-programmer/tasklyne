/**
 * Security tests for SSRF protection in extractWebContent.
 *
 * We test the URL validation logic by importing the tool and invoking it
 * with blocked addresses. The actual fetch won't fire because the SSRF
 * guard rejects before reaching the network call.
 */

import { describe, it, expect } from "vitest";
import { extractWebContent } from "@/lib/agents/research/tools";

describe("extractWebContent — SSRF protection", () => {
  const blockedUrls = [
    "http://localhost/admin",
    "http://127.0.0.1/secret",
    "http://10.0.0.1/metadata",
    "http://172.16.0.1/internal",
    "http://192.168.1.1/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "ftp://example.com/file",
    "file:///etc/passwd",
    "javascript:alert(1)",
  ];

  for (const url of blockedUrls) {
    it(`blocks ${url}`, async () => {
      const result = await extractWebContent.invoke({ url });
      const parsed = JSON.parse(result);
      expect(parsed.error).toBeDefined();
      expect(parsed.error).toMatch(/not allowed|Invalid URL|Only http/i);
    });
  }

  it("allows a normal HTTPS URL format (would fail at network, not SSRF guard)", async () => {
    // This URL is allowed by the SSRF guard but will fail at the network level
    // (since it's a non-existent host). The important thing is it does NOT
    // return an SSRF-related error message.
    const result = await extractWebContent.invoke({
      url: "https://this-domain-definitely-does-not-exist-xyz123.com/page",
    });
    const parsed = JSON.parse(result);
    // Should be a network error, not an SSRF block
    if (parsed.error) {
      expect(parsed.error).not.toMatch(/not allowed|Only http/i);
    }
  });
});
