import { useRef, useState, useCallback } from "react";
import type { StreamEvent } from "@/types/ai";

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  status: string;
  error: string | null;
}

export function useStreamingAgent() {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
    status: "",
    error: null,
  });

  const startStream = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      onDone?: (data: unknown) => void,
    ) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isStreaming: true,
        content: "",
        status: "Starting...",
        error: null,
      });

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const event: StreamEvent = JSON.parse(payload);

              switch (event.type) {
                case "token":
                  setState((prev) => ({
                    ...prev,
                    content: prev.content + (event.data as string),
                  }));
                  break;
                case "status":
                  setState((prev) => ({
                    ...prev,
                    status: event.data as string,
                  }));
                  break;
                case "tool_call":
                case "tool_result":
                  break;
                case "error":
                  setState((prev) => ({
                    ...prev,
                    error: event.data as string,
                  }));
                  break;
                case "done":
                  if (onDone) {
                    try {
                      onDone(event.data);
                    } catch {
                      // ignore parse errors
                    }
                  }
                  break;
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            status: "Cancelled",
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: err instanceof Error ? err.message : "Stream failed",
        }));
      } finally {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
        }));
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setState({ isStreaming: false, content: "", status: "", error: null });
  }, []);

  return { state, startStream, cancel, reset };
}
