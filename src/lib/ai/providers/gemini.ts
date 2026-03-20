import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const DEFAULT_MODEL = "gemini-2.0-flash";

export function createGeminiClient(apiKey: string) {
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: DEFAULT_MODEL,
  });
}

export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new ChatGoogleGenerativeAI({
      apiKey,
      model: DEFAULT_MODEL,
      maxOutputTokens: 5,
    });
    await client.invoke([{ role: "user", content: "hi" }]);
    return true;
  } catch {
    return false;
  }
}
