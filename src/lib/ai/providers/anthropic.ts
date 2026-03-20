import { ChatAnthropic } from "@langchain/anthropic";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function createAnthropicClient(apiKey: string) {
  return new ChatAnthropic({
    apiKey,
    model: DEFAULT_MODEL,
  });
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const client = new ChatAnthropic({
      apiKey,
      model: DEFAULT_MODEL,
      maxTokens: 5,
    });
    await client.invoke([{ role: "user", content: "hi" }]);
    return true;
  } catch {
    return false;
  }
}
