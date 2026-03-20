import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  PRD_PROMPT,
  FEATURE_SPEC_PROMPT,
  USER_STORIES_PROMPT,
  TECH_STACK_PROMPT,
} from "./prompts";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const BuildState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev: BaseMessage[], next: BaseMessage[]) => prev.concat(next),
    default: () => [],
  }),
  artifactType: Annotation<"prd" | "feature_spec" | "user_stories" | "tech_stack">,
  productIdea: Annotation<string>,
  context: Annotation<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact: Annotation<any>,
  feedback: Annotation<string>,
  status: Annotation<string>,
});

export type BuildStateType = typeof BuildState.State;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemPrompt(artifactType: BuildStateType["artifactType"]): string {
  switch (artifactType) {
    case "prd":
      return PRD_PROMPT;
    case "feature_spec":
      return FEATURE_SPEC_PROMPT;
    case "user_stories":
      return USER_STORIES_PROMPT;
    case "tech_stack":
      return TECH_STACK_PROMPT;
    default:
      throw new Error(`Unknown artifact type: ${artifactType satisfies never}`);
  }
}

const ARTIFACT_LABELS: Record<BuildStateType["artifactType"], string> = {
  prd: "Product Requirements Document",
  feature_spec: "Feature Specification",
  user_stories: "Epics & User Stories",
  tech_stack: "Technology Stack Recommendation",
};

/**
 * Safely parse a JSON string that may be wrapped in markdown fences.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(text: string): any {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

function createUnderstandNode(model: BaseChatModel) {
  return async (state: BuildStateType): Promise<Partial<BuildStateType>> => {
    const label = ARTIFACT_LABELS[state.artifactType];

    const messages: BaseMessage[] = [
      new SystemMessage(
        `You are helping prepare to generate a ${label}. ` +
        `Your job is to deeply understand the product idea, ask yourself follow-up questions, ` +
        `fill in reasonable assumptions, and produce a rich, expanded brief that the next step can use.\n\n` +
        `Think step-by-step:\n` +
        `1. Restate the product idea in your own words.\n` +
        `2. Identify any ambiguities or gaps.\n` +
        `3. Make reasonable assumptions for each gap and state them explicitly.\n` +
        `4. Produce an expanded brief that includes: target market, key use cases, competitive landscape, ` +
        `core constraints, and the user's explicit context (if provided).\n\n` +
        `Return the expanded brief as plain text — this will be passed to the generation step.`,
      ),
      new HumanMessage(
        `Product Idea: ${state.productIdea}\n\n` +
        `Additional Context: ${state.context || "None provided."}`,
      ),
    ];

    const response = await model.invoke(messages);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    return {
      messages: [response],
      context: content,
      status: "understanding",
    };
  };
}

function createGenerateNode(model: BaseChatModel) {
  return async (state: BuildStateType): Promise<Partial<BuildStateType>> => {
    const systemPrompt = getSystemPrompt(state.artifactType);

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Product Idea: ${state.productIdea}\n\n` +
        `Expanded Brief:\n${state.context}`,
      ),
    ];

    const response = await model.invoke(messages);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let artifact: any;
    try {
      artifact = parseJSON(content);
    } catch {
      // If parsing fails, store raw content so the refine step can attempt repair
      artifact = { _raw: content, _parseError: true };
    }

    return {
      messages: [response],
      artifact,
      status: "generating",
    };
  };
}

function createRefineNode(model: BaseChatModel) {
  return async (state: BuildStateType): Promise<Partial<BuildStateType>> => {
    const label = ARTIFACT_LABELS[state.artifactType];

    // If we had a parse error in generate, ask the model to fix the JSON
    const artifactJSON = state.artifact?._parseError
      ? state.artifact._raw
      : JSON.stringify(state.artifact, null, 2);

    const messages: BaseMessage[] = [
      new SystemMessage(
        `You are a quality reviewer for a ${label}.\n\n` +
        `Review the following artifact JSON for:\n` +
        `1. Completeness — are all required sections present and thorough?\n` +
        `2. Quality — are descriptions specific, not generic?\n` +
        `3. Consistency — do priorities, efforts, and timelines align?\n` +
        `4. Valid JSON — fix any structural issues.\n\n` +
        `Return the IMPROVED version as a single JSON object. ` +
        `If the artifact is already excellent, return it unchanged. ` +
        `Return ONLY the JSON object — no markdown fences, no commentary.`,
      ),
      new HumanMessage(
        `Original Product Idea: ${state.productIdea}\n\n` +
        `Artifact to review:\n${artifactJSON}`,
      ),
    ];

    const response = await model.invoke(messages);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let refined: any;
    try {
      refined = parseJSON(content);
    } catch {
      // If refinement still fails to parse, keep the original artifact
      refined = state.artifact?._parseError ? { error: "Failed to parse artifact" } : state.artifact;
    }

    return {
      messages: [response],
      artifact: refined,
      feedback: content,
      status: "completed",
    };
  };
}

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

export function createBuildGraph(model: BaseChatModel) {
  const graph = new StateGraph(BuildState)
    .addNode("understand", createUnderstandNode(model))
    .addNode("generate", createGenerateNode(model))
    .addNode("refine", createRefineNode(model))
    .addEdge("__start__", "understand")
    .addEdge("understand", "generate")
    .addEdge("generate", "refine")
    .addEdge("refine", END);

  return graph.compile();
}
