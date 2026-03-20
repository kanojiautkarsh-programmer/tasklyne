import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { getResearchTools } from "./tools";
import { getPromptForType } from "./prompts";

// ---------------------------------------------------------------------------
// State definition
// ---------------------------------------------------------------------------

const ResearchState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  researchType: Annotation<"market_analysis" | "competitor" | "sentiment">,
  query: Annotation<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchResults: Annotation<any[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: Annotation<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: Annotation<any>,
  status: Annotation<string>,
});

export type ResearchStateType = typeof ResearchState.State;

// ---------------------------------------------------------------------------
// Graph factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns a compiled LangGraph for research tasks.
 *
 * The graph follows a linear pipeline:
 *   plan -> search -> analyze -> report -> END
 *
 * Each node reads from / writes to the shared ResearchState.
 */
export function createResearchGraph(model: BaseChatModel) {
  const tools = getResearchTools(model);

  // Bind tools to the model so it can generate tool-call messages.
  // All LangChain chat model providers implement bindTools, but the base
  // type marks it as optional — assert it exists at runtime.
  if (!model.bindTools) {
    throw new Error("The selected model does not support tool binding.");
  }
  const modelWithTools = model.bindTools(tools);

  // -----------------------------------------------------------------------
  // Node: plan
  // -----------------------------------------------------------------------
  async function plan(
    state: typeof ResearchState.State,
  ): Promise<Partial<typeof ResearchState.State>> {
    const systemPrompt = getPromptForType(state.researchType);

    const planResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Research query: ${state.query}\n\n` +
          `Create a detailed search plan. List 3-5 specific web searches that would ` +
          `help gather comprehensive data for this ${state.researchType.replace("_", " ")} task. ` +
          `For each search, explain what information you expect to find. ` +
          `Return your plan as a numbered list of search queries.`,
      ),
    ]);

    return {
      messages: [planResponse],
      status: "planning_complete",
    };
  }

  // -----------------------------------------------------------------------
  // Node: search
  // -----------------------------------------------------------------------
  async function search(
    state: typeof ResearchState.State,
  ): Promise<Partial<typeof ResearchState.State>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const planContent =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Ask the model to use the search tools based on its plan
    const searchRequest = await modelWithTools.invoke([
      new SystemMessage(
        `You are a research assistant with access to web search and content extraction tools. ` +
          `Execute the search plan below by calling the web_search tool for each planned query. ` +
          `After searching, use extract_web_content on the most promising URLs to get detailed information.\n\n` +
          `IMPORTANT: Call the tools — do not just describe what you would search for.`,
      ),
      new HumanMessage(`Search plan:\n${planContent}\n\nExecute these searches now.`),
    ]);

    // Collect any tool calls the model made and execute them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectedResults: any[] = [];
    const newMessages: BaseMessage[] = [searchRequest];

    if (searchRequest.tool_calls && searchRequest.tool_calls.length > 0) {
      for (const toolCall of searchRequest.tool_calls) {
        const matchedTool = tools.find((t) => t.name === toolCall.name);
        if (matchedTool) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (matchedTool as any).invoke(toolCall.args);
            const parsed =
              typeof result === "string" ? JSON.parse(result) : result;
            collectedResults.push({
              tool: toolCall.name,
              args: toolCall.args,
              result: parsed,
            });
          } catch (error) {
            collectedResults.push({
              tool: toolCall.name,
              args: toolCall.args,
              error:
                error instanceof Error ? error.message : "Tool execution failed",
            });
          }
        }
      }
    }

    // If the model didn't make tool calls, do a fallback search with the original query
    if (collectedResults.length === 0) {
      try {
        const webSearch = tools.find((t) => t.name === "web_search");
        if (webSearch) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fallbackResult = await (webSearch as any).invoke({ query: state.query });
          const parsed =
            typeof fallbackResult === "string"
              ? JSON.parse(fallbackResult)
              : fallbackResult;
          collectedResults.push({
            tool: "web_search",
            args: { query: state.query },
            result: parsed,
          });
        }
      } catch (error) {
        collectedResults.push({
          tool: "web_search",
          args: { query: state.query },
          error:
            error instanceof Error ? error.message : "Fallback search failed",
        });
      }
    }

    newMessages.push(
      new AIMessage(
        `Search completed. Found ${collectedResults.length} result sets.`,
      ),
    );

    return {
      messages: newMessages,
      searchResults: collectedResults,
      status: "search_complete",
    };
  }

  // -----------------------------------------------------------------------
  // Node: analyze
  // -----------------------------------------------------------------------
  async function analyze(
    state: typeof ResearchState.State,
  ): Promise<Partial<typeof ResearchState.State>> {
    const systemPrompt = getPromptForType(state.researchType);
    const searchData = JSON.stringify(state.searchResults, null, 2);

    const analysisResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Research query: ${state.query}\n\n` +
          `Here is the raw data gathered from web searches:\n\n${searchData}\n\n` +
          `Analyze this data thoroughly. Identify key patterns, extract relevant facts, ` +
          `cross-reference information from multiple sources, and note any gaps in the data. ` +
          `Provide your analysis as structured observations grouped by topic.`,
      ),
    ]);

    const analysisContent =
      typeof analysisResponse.content === "string"
        ? analysisResponse.content
        : JSON.stringify(analysisResponse.content);

    return {
      messages: [analysisResponse],
      analysis: analysisContent,
      status: "analysis_complete",
    };
  }

  // -----------------------------------------------------------------------
  // Node: report
  // -----------------------------------------------------------------------
  async function report(
    state: typeof ResearchState.State,
  ): Promise<Partial<typeof ResearchState.State>> {
    const systemPrompt = getPromptForType(state.researchType);

    const reportResponse = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Research query: ${state.query}\n\n` +
          `Analysis:\n${state.analysis}\n\n` +
          `Raw search data:\n${JSON.stringify(state.searchResults, null, 2)}\n\n` +
          `Based on all data gathered and the analysis above, produce the final structured JSON report ` +
          `as specified in your instructions. The report must be ONLY a valid JSON object — no markdown ` +
          `fences, no commentary outside the JSON. Ensure all fields from the required schema are present.`,
      ),
    ]);

    const reportContent =
      typeof reportResponse.content === "string"
        ? reportResponse.content
        : JSON.stringify(reportResponse.content);

    // Attempt to parse the JSON report
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedReport: any;
    try {
      // Strip potential markdown code fences
      const cleaned = reportContent
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedReport = JSON.parse(cleaned);
    } catch {
      parsedReport = {
        raw_report: reportContent,
        parse_error: "The model did not return valid JSON. Raw output preserved.",
      };
    }

    return {
      messages: [reportResponse],
      report: parsedReport,
      status: "complete",
    };
  }

  // -----------------------------------------------------------------------
  // Build the graph
  // -----------------------------------------------------------------------

  const graph = new StateGraph(ResearchState)
    .addNode("plan", plan)
    .addNode("search", search)
    .addNode("analyze", analyze)
    .addNode("report", report)
    .addEdge(START, "plan")
    .addEdge("plan", "search")
    .addEdge("search", "analyze")
    .addEdge("analyze", "report")
    .addEdge("report", END);

  return graph.compile();
}
