import { useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { AIStreamState, QuestionForm, ToolCallState } from "@/types";

const API_BASE = "/api";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

const INITIAL_STATE: AIStreamState = {
  pendingUserContent: null,
  pendingMediaUrl: null,
  pendingMediaType: null,
  liveThinking: "",
  thinkingDuration: null,
  liveText: "",
  toolCalls: [],
  questionForm: null,
  isStreaming: false,
  streamError: null,
};

export function useAIStream(
  conversationId: string | null,
  onDone: (messageId: string) => void,
) {
  const [state, setState] = useState<AIStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const _consumeStream = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setState((s) => ({ ...s, isStreaming: true, streamError: null }));

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setState((s) => ({
            ...s,
            isStreaming: false,
            streamError: `Request failed: ${res.status}`,
          }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              let data: Record<string, unknown>;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                eventType = "";
                continue;
              }

              switch (eventType) {
                case "thinking_delta":
                  setState((s) => ({
                    ...s,
                    liveThinking: s.liveThinking + (data.delta as string),
                  }));
                  break;
                case "thinking_done":
                  setState((s) => ({
                    ...s,
                    thinkingDuration: data.duration_seconds as number,
                  }));
                  break;
                case "text_delta":
                  setState((s) => ({
                    ...s,
                    liveText: s.liveText + (data.delta as string),
                  }));
                  break;
                case "tool_start":
                  setState((s) => ({
                    ...s,
                    toolCalls: [
                      ...s.toolCalls,
                      {
                        tool_call_id: data.tool_call_id as string,
                        tool_name: data.tool_name as string,
                        input: data.input as Record<string, unknown>,
                      },
                    ],
                  }));
                  break;
                case "tool_result":
                  setState((s) => ({
                    ...s,
                    toolCalls: s.toolCalls.map((tc) =>
                      tc.tool_call_id === data.tool_call_id
                        ? { ...tc, result: data.result }
                        : tc,
                    ),
                  }));
                  break;
                case "question_form":
                  setState((s) => ({
                    ...s,
                    isStreaming: false,
                    questionForm: data as unknown as QuestionForm,
                  }));
                  break;
                case "done":
                  setState((s) => ({ ...s, isStreaming: false }));
                  onDone(data.message_id as string);
                  break;
                case "error":
                  setState((s) => ({
                    ...s,
                    isStreaming: false,
                    streamError: data.message as string,
                  }));
                  break;
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({
            ...s,
            isStreaming: false,
            streamError: "Connection error. Please try again.",
          }));
        }
      }
    },
    [onDone],
  );

  const submit = useCallback(
    (content: string, mediaUrl?: string, mediaType?: string) => {
      if (!conversationId) return;
      setState({
        ...INITIAL_STATE,
        pendingUserContent: content,
        pendingMediaUrl: mediaUrl ?? null,
        pendingMediaType: mediaType ?? null,
        isStreaming: true,
      });
      _consumeStream(
        `${API_BASE}/copilot/conversations/${conversationId}/messages/stream/`,
        { content, media_url: mediaUrl ?? null, media_type: mediaType ?? null },
      );
    },
    [conversationId, _consumeStream],
  );

  const submitToolResult = useCallback(
    (toolCallId: string, answers: Record<string, unknown>) => {
      if (!conversationId) return;
      setState((s) => ({
        ...s,
        questionForm: null,
        liveThinking: "",
        thinkingDuration: null,
        liveText: "",
        toolCalls: [],
        isStreaming: true,
        streamError: null,
      }));
      _consumeStream(
        `${API_BASE}/copilot/conversations/${conversationId}/messages/tool_result/`,
        { tool_call_id: toolCallId, answers },
      );
    },
    [conversationId, _consumeStream],
  );

  return { state, submit, submitToolResult, reset };
}
