import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  Send,
  ArrowLeft,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type {
  CopilotConversation,
  CopilotConversationDetail,
  CopilotMessage,
} from "@/types";

interface AICopilotPanelProps {
  onClose: () => void;
}

export function AICopilotPanel({ onClose }: AICopilotPanelProps) {
  const [conversations, setConversations] = useState<CopilotConversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<CopilotConversationDetail | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<CopilotConversation[]>("/copilot/conversations/")
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  useEffect(() => {
    if (view === "chat") {
      inputRef.current?.focus();
    }
  }, [view]);

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.post<CopilotConversation>(
        "/copilot/conversations/",
        {}
      );
      setConversations((prev) => [conv, ...prev]);
      setActiveConversation({ ...conv, messages: [] });
      setView("chat");
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, []);

  const handleSelectConversation = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const detail = await api.get<CopilotConversationDetail>(
        `/copilot/conversations/${id}/`
      );
      setActiveConversation(detail);
      setView("chat");
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await api.delete(`/copilot/conversations/${id}/`);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversation?.id === id) {
          setActiveConversation(null);
          setView("list");
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [activeConversation?.id]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeConversation || sending) return;

    const userMessageText = input.trim();
    setInput("");
    setSending(true);

    const tempUserMsg: CopilotMessage = {
      id: Date.now(),
      role: "user",
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    setActiveConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, tempUserMsg],
          }
        : null
    );

    try {
      const response = await api.post<CopilotMessage>(
        `/copilot/conversations/${activeConversation.id}/messages/`,
        { message: userMessageText }
      );
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, response],
            }
          : null
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                title: c.title || userMessageText.slice(0, 100),
                last_message: response,
              }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: Date.now() + 1,
                  role: "assistant" as const,
                  content:
                    "Sorry, I encountered an error. Please try again.",
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : null
      );
    } finally {
      setSending(false);
    }
  }, [input, activeConversation, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[32rem] bg-white rounded-2xl shadow-modal flex flex-col overflow-hidden border border-brand-border/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-brand-border/20 flex items-center gap-3 bg-white">
        {view === "chat" && (
          <button
            onClick={() => setView("list")}
            className="p-1 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-brand-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-brand-text">AI Copilot</h3>
          <p className="text-[10px] text-brand-muted">
            Ask me anything about your data
          </p>
        </div>
        <button
          onClick={handleNewConversation}
          className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {view === "list" ? (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-brand-accent" />
              </div>
              <p className="text-sm font-medium text-brand-text mb-1">
                Welcome to AI Copilot
              </p>
              <p className="text-xs text-brand-muted mb-4">
                I can help you understand your campaigns, investments, and team
                tasks.
              </p>
              <button
                onClick={handleNewConversation}
                className="px-4 py-2 bg-brand-accent text-white text-sm font-semibold rounded-xl hover:bg-brand-accent/90 transition-colors"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSelectConversation(conv.id);
                }}
                className="w-full text-left p-4 border-b border-brand-border/10 hover:bg-brand-bg/60 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-text truncate">
                      {conv.title || "New conversation"}
                    </p>
                    {conv.last_message && (
                      <p className="text-xs text-brand-muted truncate mt-0.5">
                        {conv.last_message.content}
                      </p>
                    )}
                    <p className="text-[10px] text-brand-muted mt-1">
                      {formatRelativeTime(conv.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-brand-muted hover:text-red-500 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeConversation?.messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-brand-muted">
                  Ask me about your campaigns, investments, or tasks.
                </p>
              </div>
            )}
            {activeConversation?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-brand-accent/10 text-brand-text"
                      : "bg-white text-brand-text shadow-sm border border-brand-border/20"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                </div>
                <div className="bg-white shadow-sm border border-brand-border/20 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-brand-muted rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-brand-border/20 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={sending}
                className="flex-1 bg-brand-bg border border-brand-border/60 rounded-xl px-3.5 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/50 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2 bg-brand-accent text-white rounded-xl hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
