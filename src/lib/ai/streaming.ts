import type { StreamEvent } from "@/types/ai";

/**
 * Converts a LangChain streaming response into a Server-Sent Events Response.
 *
 * Each chunk's content is extracted and sent as a JSON-encoded SSE `data:` line.
 * When the stream completes, a final `data: [DONE]` event is emitted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createStreamResponse(stream: AsyncIterable<any>): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk?.content ?? chunk?.text ?? "");

          if (!content) continue;

          const event: StreamEvent = { type: "token", data: content };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errorEvent: StreamEvent = {
          type: "error",
          data: error instanceof Error ? error.message : "Unknown error",
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
