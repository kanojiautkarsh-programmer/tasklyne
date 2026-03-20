import type { AIProvider, ModelConfig } from "@/types/ai";
import { createOpenAIClient, validateOpenAIKey } from "./providers/openai";
import {
  createAnthropicClient,
  validateAnthropicKey,
} from "./providers/anthropic";
import { createGeminiClient, validateGeminiKey } from "./providers/gemini";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const AVAILABLE_MODELS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-haiku-20241022",
  ],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
};

export function createModelFromConfig(
  config: ModelConfig,
): ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI {
  const { provider, apiKey, model, temperature } = config;

  switch (provider) {
    case "openai": {
      const client = createOpenAIClient(apiKey);
      if (model) client.model = model;
      if (temperature !== undefined) client.temperature = temperature;
      return client;
    }
    case "anthropic": {
      const client = createAnthropicClient(apiKey);
      if (model) client.model = model;
      if (temperature !== undefined) client.temperature = temperature;
      return client;
    }
    case "gemini": {
      const client = createGeminiClient(apiKey);
      if (model) client.model = model;
      if (temperature !== undefined) client.temperature = temperature;
      return client;
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider satisfies never}`);
  }
}

export async function validateApiKey(
  provider: AIProvider,
  apiKey: string,
): Promise<boolean> {
  switch (provider) {
    case "openai":
      return validateOpenAIKey(apiKey);
    case "anthropic":
      return validateAnthropicKey(apiKey);
    case "gemini":
      return validateGeminiKey(apiKey);
    default:
      throw new Error(`Unsupported AI provider: ${provider satisfies never}`);
  }
}

export function getAvailableModels(provider: AIProvider): string[] {
  return AVAILABLE_MODELS[provider] ?? [];
}
