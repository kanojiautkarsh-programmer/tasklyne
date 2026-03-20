export type AIProvider = "openai" | "anthropic" | "gemini";

export type ModelConfig = {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
};

export interface AgentTask {
  id: string;
  agentType: "research" | "build" | "growth";
  status: "pending" | "running" | "completed" | "failed";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output?: Record<string, any>;
  createdAt: string;
}

export interface StreamEvent {
  type: "token" | "tool_call" | "tool_result" | "status" | "error" | "done";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
