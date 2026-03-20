/**
 * Growth Agent - LangGraph State Machine
 *
 * Defines the state schema and graph topology for cold-email, blog, and
 * onboarding campaign workflows.
 *
 * Graph: plan -> research -> generate -> review -> END
 */

import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  COLD_EMAIL_PROMPT,
  BLOG_CONTENT_PROMPT,
  ONBOARDING_PROMPT,
  interpolatePrompt,
} from "./prompts";
import { searchLeadsApollo } from "./integrations";

// ---------------------------------------------------------------------------
// State definition
// ---------------------------------------------------------------------------

const GrowthState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  campaignType: Annotation<"cold_email" | "blog" | "onboarding">(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Annotation<Record<string, any>>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leads: Annotation<any[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatedContent: Annotation<any>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: Annotation<any>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  status: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "pending",
  }),
});

export type GrowthStateType = typeof GrowthState.State;

// ---------------------------------------------------------------------------
// Helper – safely extract string content from an LLM response
// ---------------------------------------------------------------------------

function extractContent(msg: BaseMessage): string {
  return typeof msg.content === "string"
    ? msg.content
    : JSON.stringify(msg.content);
}

// ---------------------------------------------------------------------------
// Node: plan
// ---------------------------------------------------------------------------

function createPlanNode(model: BaseChatModel) {
  return async (state: typeof GrowthState.State) => {
    const { campaignType, input } = state;

    const planPrompt = `You are a growth marketing strategist. The user wants to create a "${campaignType}" campaign.

Here is the input they provided:
${JSON.stringify(input, null, 2)}

Create a brief campaign plan that includes:
1. Goal and target audience
2. Key messaging angle
3. Tone and style notes
4. Success metrics to consider

Be concise – this plan will guide the content generation step.`;

    const response = await model.invoke([
      new SystemMessage(planPrompt),
      new HumanMessage(
        `Plan a ${campaignType} campaign with the information above.`,
      ),
    ]);

    return {
      messages: [response],
      status: "planning",
    };
  };
}

// ---------------------------------------------------------------------------
// Node: research
// ---------------------------------------------------------------------------

function createResearchNode(model: BaseChatModel) {
  return async (state: typeof GrowthState.State) => {
    const { campaignType, input } = state;

    if (campaignType === "cold_email") {
      // Attempt to search leads via Apollo if key is available
      const apolloApiKey = input.apolloApiKey as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let leads = (input.leads as any[]) ?? [];

      if (apolloApiKey && leads.length === 0) {
        const searchQuery = input.query ?? input.industry ?? input.productInfo ?? "";
        const fetched = await searchLeadsApollo({
          query: String(searchQuery),
          industry: input.industry as string | undefined,
          limit: input.limit ? Number(input.limit) : 10,
          apolloApiKey,
        });
        if (fetched.length > 0) {
          leads = fetched;
        }
      }

      return {
        messages: [
          new AIMessage(
            leads.length > 0
              ? `Found ${leads.length} leads for outreach.`
              : "No external leads found – will use any leads provided in the input.",
          ),
        ],
        leads,
        status: "researching",
      };
    }

    if (campaignType === "blog") {
      // Use the LLM to research the topic and outline key points
      const researchPrompt = `Research the following topic and provide key points, statistics, and angles that would make a compelling blog post.

Topic: ${input.topic ?? ""}
Keywords: ${Array.isArray(input.keywords) ? input.keywords.join(", ") : input.keywords ?? ""}
Audience: ${input.audience ?? ""}

Provide your research as a concise list of insights.`;

      const response = await model.invoke([
        new SystemMessage(researchPrompt),
        new HumanMessage("What are the key points to cover?"),
      ]);

      return {
        messages: [response],
        status: "researching",
      };
    }

    // onboarding – analyse product features
    const analysisPrompt = `Analyse the following product and its features. Identify the most impactful features for onboarding emails.

Product: ${input.productName ?? ""}
Features:
${Array.isArray(input.features) ? input.features.join("\n- ") : input.features ?? ""}

Provide a ranked list of features by user impact.`;

    const response = await model.invoke([
      new SystemMessage(analysisPrompt),
      new HumanMessage("Which features matter most for new users?"),
    ]);

    return {
      messages: [response],
      status: "researching",
    };
  };
}

// ---------------------------------------------------------------------------
// Node: generate
// ---------------------------------------------------------------------------

function createGenerateNode(model: BaseChatModel) {
  return async (state: typeof GrowthState.State) => {
    const { campaignType, input, leads, messages } = state;

    // Collect prior context from planning & research messages
    const contextMessages = messages.map(extractContent).join("\n\n");

    let systemPrompt: string;

    switch (campaignType) {
      case "cold_email": {
        // If we have leads, generate for the first one as a template
        const leadInfo = leads[0] ?? {
          name: input.leadName ?? "there",
          company: input.leadCompany ?? "your company",
          title: input.leadRole ?? "professional",
        };

        systemPrompt = interpolatePrompt(COLD_EMAIL_PROMPT, {
          leadName: leadInfo.name ?? "there",
          leadCompany: leadInfo.company ?? "your company",
          leadRole: leadInfo.title ?? input.leadRole ?? "professional",
          leadIndustry: input.industry ?? input.leadIndustry ?? "technology",
          productInfo: input.productInfo ?? input.product ?? "our product",
        });
        break;
      }

      case "blog": {
        systemPrompt = interpolatePrompt(BLOG_CONTENT_PROMPT, {
          topic: input.topic ?? "",
          keywords: Array.isArray(input.keywords)
            ? input.keywords.join(", ")
            : (input.keywords ?? ""),
          audience: input.audience ?? "general audience",
        });
        break;
      }

      case "onboarding": {
        systemPrompt = interpolatePrompt(ONBOARDING_PROMPT, {
          productName: input.productName ?? "our product",
          features: Array.isArray(input.features)
            ? input.features.map((f: string) => `- ${f}`).join("\n")
            : (input.features ?? ""),
        });
        break;
      }

      default:
        systemPrompt = "Generate marketing content based on the user input.";
    }

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Here is additional context from planning and research:\n\n${contextMessages}\n\nGenerate the content now.`,
      ),
    ]);

    const rawContent = extractContent(response);

    // Attempt to parse JSON from the LLM output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let generatedContent: any;
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      generatedContent = JSON.parse(cleaned);
    } catch {
      generatedContent = { raw: rawContent };
    }

    return {
      messages: [response],
      generatedContent,
      status: "generating",
    };
  };
}

// ---------------------------------------------------------------------------
// Node: review
// ---------------------------------------------------------------------------

function createReviewNode(model: BaseChatModel) {
  return async (state: typeof GrowthState.State) => {
    const { campaignType, generatedContent } = state;

    const reviewPrompt = `You are a senior marketing reviewer. Review the following ${campaignType} content for:
1. Quality and clarity
2. Appropriate tone and professionalism
3. CAN-SPAM / GDPR compliance (for emails)
4. SEO best practices (for blog content)
5. Accuracy and completeness

Content to review:
${JSON.stringify(generatedContent, null, 2)}

If the content is acceptable, respond with a JSON object:
{ "approved": true, "notes": "<brief positive note>" }

If it needs changes, respond with:
{ "approved": false, "issues": ["<issue 1>", "<issue 2>"], "suggestions": ["<suggestion 1>", "<suggestion 2>"] }

Return ONLY valid JSON.`;

    const response = await model.invoke([
      new SystemMessage(reviewPrompt),
      new HumanMessage("Review this content."),
    ]);

    const rawReview = extractContent(response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let review: any;
    try {
      const cleaned = rawReview
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      review = JSON.parse(cleaned);
    } catch {
      review = { approved: true, notes: rawReview };
    }

    return {
      messages: [response],
      campaign: {
        type: campaignType,
        content: generatedContent,
        review,
      },
      status: "completed",
    };
  };
}

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

/**
 * Creates a compiled LangGraph for the Growth Agent.
 *
 * @param model - A LangChain BaseChatModel created via the BYOK model router.
 * @returns A compiled graph ready to `.invoke()` or `.stream()`.
 */
export function createGrowthGraph(model: BaseChatModel) {
  const graph = new StateGraph(GrowthState)
    .addNode("plan", createPlanNode(model))
    .addNode("research", createResearchNode(model))
    .addNode("generate", createGenerateNode(model))
    .addNode("review", createReviewNode(model))
    .addEdge(START, "plan")
    .addEdge("plan", "research")
    .addEdge("research", "generate")
    .addEdge("generate", "review")
    .addEdge("review", END);

  return graph.compile();
}

export { GrowthState };
