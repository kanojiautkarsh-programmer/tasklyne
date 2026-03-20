/**
 * Zod schemas for agent API route request bodies.
 * Enforces size limits to prevent abuse and token waste.
 */

import { z } from "zod/v3";

// ── Shared ─────────────────────────────────────────────────────────────

const providerSchema = z.enum(["openai", "anthropic", "gemini"]);

const apiKeySchema = z
  .string()
  .min(1, "API key must not be empty")
  .max(256, "API key is too long");

// ── Research Agent ─────────────────────────────────────────────────────

export const researchBodySchema = z.object({
  researchType: z.enum(["market_analysis", "competitor", "sentiment"]),
  query: z
    .string()
    .min(3, "Query must be at least 3 characters")
    .max(2000, "Query must be at most 2000 characters"),
  provider: providerSchema,
  apiKey: apiKeySchema.optional(),
});

export type ResearchBody = z.infer<typeof researchBodySchema>;

// ── Build Agent ────────────────────────────────────────────────────────

export const buildBodySchema = z.object({
  artifactType: z.enum(["prd", "feature_spec", "user_stories", "tech_stack"]),
  productIdea: z
    .string()
    .min(3, "Product idea must be at least 3 characters")
    .max(5000, "Product idea must be at most 5000 characters"),
  context: z
    .string()
    .max(5000, "Context must be at most 5000 characters")
    .optional(),
  provider: providerSchema.optional().default("openai"),
  apiKey: apiKeySchema.optional(),
});

export type BuildBody = z.infer<typeof buildBodySchema>;

// ── Growth Agent ───────────────────────────────────────────────────────

// Use a loose record with sensible limits for forward compatibility.
const campaignInputSchema = z
  .record(z.string().max(100), z.unknown())
  .refine(
    (obj) => JSON.stringify(obj).length <= 10_000,
    "Input object is too large (max ~10 KB serialised)",
  );

export const growthBodySchema = z.object({
  campaignType: z.enum(["cold_email", "blog", "onboarding"]),
  input: campaignInputSchema,
  provider: providerSchema.optional().default("openai"),
  apiKey: apiKeySchema.optional(),
  apolloApiKey: apiKeySchema.optional(),
  sendNow: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(false),
});

export type GrowthBody = z.infer<typeof growthBodySchema>;

// ── Keys API ───────────────────────────────────────────────────────────

export const saveKeyBodySchema = z.object({
  provider: providerSchema,
  apiKey: apiKeySchema,
});

export const deleteKeyBodySchema = z.object({
  provider: providerSchema,
});

// ── Task Creation (Quick-start from modal) ──────────────────────────────

export const taskCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Task name is required")
    .max(200, "Task name must be at most 200 characters"),
  goal: z
    .string()
    .min(1, "Goal is required")
    .max(2000, "Goal must be at most 2000 characters"),
  agentType: z.enum(["research", "build", "growth"]),
});

export type TaskCreateBody = z.infer<typeof taskCreateSchema>;
