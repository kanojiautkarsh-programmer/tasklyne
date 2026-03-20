/**
 * Security-focused tests for Zod validation schemas.
 */

import { describe, it, expect } from "vitest";
import {
  researchBodySchema,
  buildBodySchema,
  growthBodySchema,
  saveKeyBodySchema,
  deleteKeyBodySchema,
} from "@/lib/validations/agents";

describe("researchBodySchema", () => {
  const valid = {
    researchType: "market_analysis",
    query: "AI SaaS market size 2025",
    provider: "openai",
  };

  it("accepts valid input", () => {
    expect(researchBodySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid researchType", () => {
    const r = researchBodySchema.safeParse({ ...valid, researchType: "unknown" });
    expect(r.success).toBe(false);
  });

  it("rejects query exceeding max length", () => {
    const r = researchBodySchema.safeParse({ ...valid, query: "a".repeat(2001) });
    expect(r.success).toBe(false);
  });

  it("rejects query shorter than min length", () => {
    const r = researchBodySchema.safeParse({ ...valid, query: "ab" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid provider", () => {
    const r = researchBodySchema.safeParse({ ...valid, provider: "deepseek" });
    expect(r.success).toBe(false);
  });

  it("accepts optional apiKey within limits", () => {
    const r = researchBodySchema.safeParse({ ...valid, apiKey: "sk-test123" });
    expect(r.success).toBe(true);
  });

  it("rejects apiKey exceeding max length", () => {
    const r = researchBodySchema.safeParse({ ...valid, apiKey: "k".repeat(257) });
    expect(r.success).toBe(false);
  });
});

describe("buildBodySchema", () => {
  const valid = {
    artifactType: "prd",
    productIdea: "An AI-powered todo list for founders",
    provider: "openai",
  };

  it("accepts valid input", () => {
    expect(buildBodySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid artifactType", () => {
    const r = buildBodySchema.safeParse({ ...valid, artifactType: "wireframe" });
    expect(r.success).toBe(false);
  });

  it("rejects productIdea exceeding 5000 chars", () => {
    const r = buildBodySchema.safeParse({ ...valid, productIdea: "a".repeat(5001) });
    expect(r.success).toBe(false);
  });

  it("defaults provider to openai when missing", () => {
    const { artifactType, productIdea } = valid;
    const r = buildBodySchema.safeParse({ artifactType, productIdea });
    expect(r.success).toBe(true);
    expect(r.data?.provider).toBe("openai");
  });

  it("rejects context exceeding 5000 chars", () => {
    const r = buildBodySchema.safeParse({ ...valid, context: "x".repeat(5001) });
    expect(r.success).toBe(false);
  });
});

describe("growthBodySchema", () => {
  const valid = {
    campaignType: "cold_email",
    input: { companyName: "Acme", icp: "SaaS founders" },
    provider: "openai",
  };

  it("accepts valid input", () => {
    expect(growthBodySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid campaignType", () => {
    const r = growthBodySchema.safeParse({ ...valid, campaignType: "social_media" });
    expect(r.success).toBe(false);
  });

  it("rejects oversized input object", () => {
    const hugeInput: Record<string, string> = {};
    for (let i = 0; i < 200; i++) {
      hugeInput[`key${i}`] = "x".repeat(100);
    }
    const r = growthBodySchema.safeParse({ ...valid, input: hugeInput });
    expect(r.success).toBe(false);
  });

  it("defaults stream and sendNow to false", () => {
    const r = growthBodySchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.stream).toBe(false);
    expect(r.data?.sendNow).toBe(false);
  });

  it("accepts optional apiKey", () => {
    const r = growthBodySchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.apiKey).toBeUndefined();
  });
});

describe("saveKeyBodySchema", () => {
  it("accepts valid provider and apiKey", () => {
    const r = saveKeyBodySchema.safeParse({ provider: "anthropic", apiKey: "sk-ant-test" });
    expect(r.success).toBe(true);
  });

  it("rejects missing provider", () => {
    const r = saveKeyBodySchema.safeParse({ apiKey: "test" });
    expect(r.success).toBe(false);
  });

  it("rejects empty apiKey", () => {
    const r = saveKeyBodySchema.safeParse({ provider: "openai", apiKey: "" });
    expect(r.success).toBe(false);
  });
});

describe("deleteKeyBodySchema", () => {
  it("accepts valid provider", () => {
    const r = deleteKeyBodySchema.safeParse({ provider: "gemini" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const r = deleteKeyBodySchema.safeParse({ provider: "azure" });
    expect(r.success).toBe(false);
  });
});
