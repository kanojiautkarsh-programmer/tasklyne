import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Web search tool using the Tavily REST API.
 * Requires TAVILY_API_KEY environment variable.
 */
export const webSearchTool = tool(
  async ({ query }): Promise<string> => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "TAVILY_API_KEY environment variable is not set. Web search is unavailable.",
      );
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Tavily search failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    const results = (data.results ?? []).map(
      (r: { title: string; url: string; content: string; score: number }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        relevanceScore: r.score,
      }),
    );

    return JSON.stringify(
      { answer: data.answer ?? null, results },
      null,
      2,
    );
  },
  {
    name: "web_search",
    description:
      "Search the web for current information about a topic. Returns relevant search results with titles, URLs, and snippets.",
    schema: z.object({
      query: z.string().describe("The search query to look up"),
    }),
  },
);

/**
 * Extracts text content from a URL.
 * Fetches the page HTML, strips tags, and returns the first 5000 characters.
 * Blocks requests to private / internal IP ranges to prevent SSRF.
 */
export const extractWebContent = tool(
  async ({ url }): Promise<string> => {
    // ---- SSRF protection ----
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return JSON.stringify({ error: "Invalid URL", url });
    }

    // Only allow HTTP(S) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return JSON.stringify({
        error: "Only http and https URLs are allowed",
        url,
      });
    }

    // Block private / reserved IP ranges and localhost
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]$/,
      /^\[fc/,
      /^\[fd/,
      /^\[fe80/,
      /^metadata\.google\.internal$/,
    ];

    if (blockedPatterns.some((p) => p.test(hostname))) {
      return JSON.stringify({
        error: "Requests to private/internal addresses are not allowed",
        url,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; TaskLyne/1.0; Research Agent)",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
      });

      if (!response.ok) {
        return JSON.stringify({
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          url,
        });
      }

      const html = await response.text();

      // Strip script/style blocks and HTML tags to get plain text
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const truncated = text.slice(0, 5000);

      return JSON.stringify({
        url,
        contentLength: text.length,
        truncated: text.length > 5000,
        content: truncated,
      });
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to extract content",
        url,
      });
    } finally {
      clearTimeout(timeout);
    }
  },
  {
    name: "extract_web_content",
    description:
      "Fetch a web page and extract its text content. Useful for reading articles, documentation, or reviews from a URL.",
    schema: z.object({
      url: z.string().describe("The URL of the web page to extract content from"),
    }),
  },
);

/**
 * Creates a sentiment analysis tool powered by the provided LLM.
 * The tool sends the text to the model with a structured prompt and
 * returns JSON-formatted sentiment data.
 */
export function createSentimentTool(model: BaseChatModel) {
  return tool(
    async ({ text }): Promise<string> => {
      const truncatedText = text.slice(0, 3000);

      const response = await model.invoke([
        new SystemMessage(
          `You are a sentiment analysis engine. Analyze the provided text and return ONLY valid JSON with this exact structure:
{
  "overall_sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": <number between 0 and 1>,
  "positive_aspects": ["<positive themes found>"],
  "negative_aspects": ["<negative themes found>"],
  "key_topics": ["<main topics discussed>"],
  "emotional_tone": "<brief description of the emotional tone>"
}
Do not include any text outside the JSON object.`,
        ),
        new HumanMessage(truncatedText),
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Validate that the model returned parseable JSON
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return JSON.stringify({
          overall_sentiment: "unknown",
          confidence: 0,
          raw_analysis: content,
          error: "LLM did not return valid JSON",
        });
      }
    },
    {
      name: "analyze_sentiment",
      description:
        "Analyze the sentiment of a piece of text. Returns structured sentiment analysis with overall sentiment, confidence score, and key themes.",
      schema: z.object({
        text: z
          .string()
          .describe(
            "The text to analyze for sentiment (reviews, comments, mentions, etc.)",
          ),
      }),
    },
  );
}

/** Returns all research tools, including the LLM-powered sentiment tool. */
export function getResearchTools(model: BaseChatModel) {
  return [webSearchTool, extractWebContent, createSentimentTool(model)];
}
