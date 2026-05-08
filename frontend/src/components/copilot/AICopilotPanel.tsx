import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAIStream } from "@/hooks/useAIStream";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { MediaPreview } from "./MediaPreview";
import { FileUploadZone } from "./FileUploadZone";
import { ExamplePrompts } from "./ExamplePrompts";
import { QuestionForm } from "./QuestionForm";
import { MarkdownMessage } from "./MarkdownMessage";
import { CardBlock } from "./CardBlock";
import { ChartBlock } from "./ChartBlock";
import type {
  CopilotConversation,
  CopilotConversationDetail,
  CopilotMessage,
} from "@/types";

interface AttachedFile {
  url: string;
  mediaType: string;
  filename: string;
  sizeBytes: number;
}

interface AICopilotPanelProps {
  onClose?: () => void;
  fullPage?: boolean;
}

export function AICopilotPanel({ onClose, fullPage = false }: AICopilotPanelProps) {
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<CopilotConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConvRef = useRef<CopilotConversationDetail | null>(null);
  activeConvRef.current = activeConversation;

  // Ref so handleStreamDone can call resetStream without being in its dep array
  const resetStreamRef = useRef<() => void>(() => {});

  const handleStreamDone = useCallback(async (_messageId: string) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    try {
      const detail = await api.get<CopilotConversationDetail>(
        `/copilot/conversations/${conv.id}/`
      );
      setActiveConversation(detail);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === detail.id
            ? { ...c, title: detail.title, last_message: detail.messages[detail.messages.length - 1] ?? null }
            : c
        )
      );
      resetStreamRef.current();
    } catch {
      /* ignore */
    }
  }, []);

  const { state: stream, submit, submitToolResult, reset: resetStream } = useAIStream(
    activeConversation?.id ?? null,
    handleStreamDone,
  );

  resetStreamRef.current = resetStream;

  useEffect(() => {
    setLoadingConvs(true);
    api.get<CopilotConversation[]>("/copilot/conversations/")
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, stream.liveText]);

  useEffect(() => {
    if (view === "chat") inputRef.current?.focus();
  }, [view]);

  const handleNewConversation = useCallback(async () => {
    const conv = await api.post<CopilotConversation>("/copilot/conversations/", {});
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation({ ...conv, messages: [] });
    resetStream();
    setView("chat");
  }, [resetStream]);

  const handleSelectConversation = useCallback(async (id: string) => {
    setLoadingChat(true);
    const detail = await api.get<CopilotConversationDetail>(`/copilot/conversations/${id}/`);
    setActiveConversation(detail);
    resetStream();
    setView("chat");
    setLoadingChat(false);
  }, [resetStream]);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.delete(`/copilot/conversations/${id}/`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
      setView("list");
    }
  }, [activeConversation?.id]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && !attached) || stream.isStreaming || !activeConversation) return;
    setInput("");
    setAttached(null);
    submit(text, attached?.url, attached?.mediaType);
  }, [input, attached, stream.isStreaming, activeConversation, submit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages: CopilotMessage[] = activeConversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !stream.pendingUserContent;

  const chatContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[440px]"}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-brand-border/30 shrink-0">
        {!fullPage && (
          <button onClick={() => { setView("list"); resetStream(); }} className="text-brand-muted hover:text-brand-text">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <Bot className="w-4 h-4 text-brand-accent" />
        <span className="text-sm font-medium text-brand-text truncate flex-1">
          {activeConversation?.title || "New conversation"}
        </span>
        {onClose && !fullPage && (
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-lg leading-none">×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-3">
        {loadingChat && <div className="flex justify-center py-4"><LoadingSpinner /></div>}

        {isEmpty && !loadingChat && (
          <ExamplePrompts onSelect={(p) => submit(p)} />
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[80%]">
                {msg.media_url && (
                  <div className="flex justify-end">
                    <MediaPreview url={msg.media_url} mediaType={msg.media_type ?? "image"} />
                  </div>
                )}
                <div className="bg-brand-accent text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-0.5">
                {msg.thinking_content && (
                  <ThinkingBlock
                    content={msg.thinking_content}
                    duration={msg.thinking_duration ?? null}
                    isStreaming={false}
                  />
                )}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <ToolCallBlock toolCalls={msg.tool_calls} />
                )}
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm">
                  <MarkdownMessage content={msg.content} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Pending user message */}
        {stream.pendingUserContent !== null && (
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              {stream.pendingMediaUrl && (
                <div className="flex justify-end">
                  <MediaPreview
                    url={stream.pendingMediaUrl}
                    mediaType={stream.pendingMediaType ?? "image"}
                  />
                </div>
              )}
              <div className="bg-brand-accent text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">
                {stream.pendingUserContent}
              </div>
            </div>
          </div>
        )}

        {/* Streaming AI response */}
        {(stream.toolCalls.length > 0 || stream.liveThinking || stream.liveText || stream.isStreaming) && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-0.5">
              <ToolCallBlock toolCalls={stream.toolCalls} />
              {(stream.liveThinking || (stream.isStreaming && !stream.liveText)) && (
                <ThinkingBlock
                  content={stream.liveThinking}
                  duration={stream.thinkingDuration}
                  isStreaming={stream.isStreaming && !stream.thinkingDuration}
                />
              )}
              {stream.liveText && (
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm">
                  <MarkdownMessage content={stream.liveText} />
                  {stream.isStreaming && <span className="inline-block w-1 h-4 bg-brand-muted animate-pulse ml-0.5 align-text-bottom" />}
                </div>
              )}
              {stream.isStreaming && !stream.liveText && !stream.liveThinking && stream.toolCalls.length === 0 && (
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-brand-border/20 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {stream.cardBlocks.map((block, i) => (
          <div key={i} className="flex justify-start w-full">
            <div className="w-full max-w-[90%]">
              <CardBlock block={block} />
            </div>
          </div>
        ))}
        {stream.chartBlocks.map((block, i) => (
          <div key={i} className="flex justify-start w-full">
            <div className="w-full max-w-[90%]">
              <ChartBlock block={block} />
            </div>
          </div>
        ))}

        {/* Question form */}
        {stream.questionForm && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full">
              <QuestionForm
                form={stream.questionForm}
                onSubmit={submitToolResult}
                disabled={stream.isStreaming}
              />
            </div>
          </div>
        )}

        {stream.streamError && (
          <div className="text-xs text-red-500 px-3">{stream.streamError}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-brand-border/30 shrink-0">
        <FileUploadZone onAttach={setAttached} attached={attached} disabled={stream.isStreaming}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Fundy AI..."
            rows={1}
            disabled={stream.isStreaming || !!stream.questionForm}
            className="flex-1 resize-none bg-transparent text-sm text-brand-text placeholder:text-brand-muted focus:outline-none py-2 pr-2 min-h-[36px] max-h-24"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attached) || stream.isStreaming || !!stream.questionForm}
            className="mb-1 p-2 rounded-lg bg-brand-accent text-white disabled:opacity-40 hover:bg-brand-accent/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </FileUploadZone>
      </div>
    </div>
  );

  const listContent = (
    <div className={`flex flex-col ${fullPage ? "h-full" : "h-[440px]"}`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-accent" />
          <span className="text-sm font-medium text-brand-text">Fundy AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleNewConversation} className="p-1.5 rounded-lg hover:bg-brand-border/20 text-brand-muted hover:text-brand-text transition-colors" title="New conversation">
            <Plus className="w-4 h-4" />
          </button>
          {onClose && !fullPage && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-border/20 text-brand-muted hover:text-brand-text transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <Bot className="w-8 h-8 text-brand-muted/50" />
            <p className="text-sm text-brand-muted">No conversations yet.</p>
            <button onClick={handleNewConversation} className="text-sm text-brand-accent hover:underline">Start one</button>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className="group flex items-start gap-2 px-3 py-2.5 hover:bg-brand-border/20 cursor-pointer border-b border-brand-border/10 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{conv.title || "Untitled"}</p>
                {conv.last_message && (
                  <p className="text-xs text-brand-muted truncate mt-0.5">{conv.last_message.content}</p>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-brand-muted hover:text-red-500 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 border-r border-brand-border/30 overflow-hidden">
          {listContent}
        </div>
        <div className="flex-1 overflow-hidden">
          {activeConversation ? chatContent : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-brand-muted">
              <Bot className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select or start a conversation</p>
              <button onClick={handleNewConversation} className="text-sm text-brand-accent hover:underline">New conversation</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return view === "chat" ? chatContent : listContent;
}
