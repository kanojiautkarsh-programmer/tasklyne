import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_MODEL = "gpt-4o";

export function createOpenAIClient(apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model: DEFAULT_MODEL,
  });
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const client = new ChatOpenAI({
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
