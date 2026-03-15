import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Search,
  X,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChatSocket } from "@/hooks/useChatSocket";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type {
  ChatRoom,
  ChatMessageDetail,
  ChatMessagePage,
  UserProfileMinimal,
} from "@/types";

export function ChatPage() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageDetail[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  // Fetch rooms
  useEffect(() => {
    api
      .get<ChatRoom[]>("/chat/rooms/")
      .then(setRooms)
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, []);

  // Fetch messages when room changes
  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    api
      .get<ChatMessagePage>(`/chat/rooms/${selectedRoomId}/messages/`)
      .then((data) => setMessages([...data.results].reverse()))
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [selectedRoomId]);

  const handleNewMessage = useCallback(
    (msg: ChatMessageDetail) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Update room's last_message
      setRooms((prev) =>
        prev.map((r) =>
          r.id === msg.room ? { ...r, last_message: msg } : r
        )
      );
    },
    []
  );

  const { connected, sendMessage } = useChatSocket({
    roomId: selectedRoomId,
    onMessage: handleNewMessage,
  });

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  const handleRoomCreated = useCallback(
    (room: ChatRoom) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev;
        return [room, ...prev];
      });
      setSelectedRoomId(room.id);
      setShowNewChat(false);
    },
    []
  );

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh-64px)]">
      {/* Room list */}
      <div className="w-80 border-r border-brand-border/30 bg-white flex flex-col">
        <div className="p-4 border-b border-brand-border/20 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-text">Messages</h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-6 text-center text-brand-muted">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-2 text-sm text-brand-accent hover:underline"
              >
                Start a new chat
              </button>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                currentUserId={profile?.id || ""}
                isSelected={room.id === selectedRoomId}
                onClick={() => setSelectedRoomId(room.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 flex flex-col bg-brand-bg/30">
        {selectedRoom ? (
          <ChatThread
            room={selectedRoom}
            messages={messages}
            currentUserId={profile?.id || ""}
            connected={connected}
            loading={loadingMessages}
            onSend={handleSend}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-brand-muted">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">
                Select a conversation
              </p>
              <p className="text-sm mt-1">
                or start a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onRoomCreated={handleRoomCreated}
        />
      )}
    </div>
  );
}

function RoomItem({
  room,
  currentUserId,
  isSelected,
  onClick,
}: {
  room: ChatRoom;
  currentUserId: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const roomName = getRoomName(room, currentUserId);
  const otherUser = room.participants_detail.find(
    (p) => p.id !== currentUserId
  );

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-brand-border/10 hover:bg-brand-bg/60 transition-colors ${
        isSelected
          ? "bg-brand-accent/[0.06] border-l-[3px] border-l-brand-accent"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {room.room_type === "direct" && otherUser ? (
          <Avatar
            src={otherUser.avatar_url}
            name={otherUser.full_name || "?"}
            size="sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-brand-accent" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-text truncate">
            {roomName}
          </p>
          {room.last_message && (
            <p className="text-xs text-brand-muted truncate mt-0.5">
              {room.last_message.sender_detail.full_name}:{" "}
              {room.last_message.content}
            </p>
          )}
        </div>
        {room.last_message && (
          <span className="text-[10px] text-brand-muted whitespace-nowrap">
            {formatTime(room.last_message.created_at)}
          </span>
        )}
      </div>
    </button>
  );
}

function ChatThread({
  room,
  messages,
  currentUserId,
  connected,
  loading,
  onSend,
}: {
  room: ChatRoom;
  messages: ChatMessageDetail[];
  currentUserId: string;
  connected: boolean;
  loading: boolean;
  onSend: (content: string) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomName = getRoomName(room, currentUserId);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-brand-border/20 bg-white flex items-center gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-brand-text">{roomName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-brand-muted">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex -space-x-2">
          {room.participants_detail.slice(0, 5).map((p) => (
            <Avatar
              key={p.id}
              src={p.avatar_url}
              name={p.full_name || "?"}
              size="sm"
              className="ring-2 ring-white"
            />
          ))}
          {room.participants_detail.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-brand-bg border-2 border-white flex items-center justify-center">
              <span className="text-[10px] text-brand-muted font-medium">
                +{room.participants_detail.length - 5}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-brand-muted">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar
                  src={msg.sender_detail.avatar_url}
                  name={msg.sender_detail.full_name || "?"}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div
                  className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}
                >
                  <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs font-medium text-brand-text">
                      {msg.sender_detail.full_name}
                    </span>
                    <span className="text-[10px] text-brand-muted">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-sm ${
                      isOwn
                        ? "bg-brand-accent/10 text-brand-text"
                        : "bg-white text-brand-text shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-brand-border/20 bg-white">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-brand-bg border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/50"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || !connected}
            className="p-2.5 bg-brand-accent text-white rounded-xl hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function NewChatModal({
  onClose,
  onRoomCreated,
}: {
  onClose: () => void;
  onRoomCreated: (room: ChatRoom) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserProfileMinimal[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<UserProfileMinimal[]>(
          `/users/search/?search=${encodeURIComponent(search)}`
        );
        setResults(data);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleSelect = async (user: UserProfileMinimal) => {
    setCreating(true);
    try {
      const room = await api.post<ChatRoom>("/chat/rooms/direct/", {
        participant_id: user.id,
      });
      onRoomCreated(room);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-brand-border/20 flex items-center justify-between">
          <h3 className="font-semibold text-brand-text">New Message</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-brand-bg text-brand-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              autoFocus
              className="w-full bg-brand-bg border border-brand-border/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/50"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto px-2 pb-4">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner />
            </div>
          ) : results.length === 0 && search.length >= 2 ? (
            <p className="text-sm text-brand-muted text-center py-6">
              No users found
            </p>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={creating}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-bg transition-colors disabled:opacity-50"
              >
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name || "?"}
                  size="sm"
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-brand-text">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-brand-muted capitalize">
                    {user.role.replace("_", " ")}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getRoomName(room: ChatRoom, currentUserId: string): string {
  if (room.room_type === "campaign" && room.campaign_title) {
    return room.campaign_title;
  }
  const other = room.participants_detail.find((p) => p.id !== currentUserId);
  return other?.full_name || "Chat";
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
