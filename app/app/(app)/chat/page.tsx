"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSuggestions } from "@/components/chat/chat-suggestions";
import type { UIMessage } from "ai";

function ChatPageInner() {
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(
    searchParams.get("id") ?? undefined
  );
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState("");

  // Load existing conversation messages when user navigates to a saved conversation.
  useEffect(() => {
    const id = searchParams.get("id");

    if (!id) {
      setConversationId(undefined);
      setInitialMessages([]);
      return;
    }

    setConversationId(id);
    setLoadingHistory(true);
    fetch(`/api/chat/messages?id=${id}`)
      .then((res) => res.json())
      .then((msgs: UIMessage[]) => setInitialMessages(msgs))
      .catch(() => setInitialMessages([]))
      .finally(() => setLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => {},
  });

  // Sync DB-loaded messages into useChat when navigating to a saved conversation
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      setInput("");
      sendMessage({ text }, { body: { conversationId } });
    },
    [isLoading, sendMessage, conversationId]
  );

  const handleSuggestionSelect = useCallback(
    (prompt: string) => {
      sendMessage({ text: prompt }, { body: { conversationId } });
    },
    [sendMessage, conversationId]
  );

  const handleAction = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      sendMessage({ text }, { body: { conversationId } });
    },
    [sendMessage, conversationId]
  );

  // After first exchange on a new chat, fetch the conversation id from the server
  // so subsequent sends include it. Do NOT update the URL here — any URL change
  // (even replaceState) causes useSearchParams to re-fire, which re-fetches history
  // and clobbers the live useChat messages.
  useEffect(() => {
    if (messages.length > 0 && !conversationId) {
      fetch("/api/chat/conversations")
        .then((res) => res.json())
        .then((convos: Array<{ id: string }>) => {
          if (convos.length > 0 && !conversationId) {
            setConversationId(convos[0].id);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const isEmpty = messages.length === 0 && !loadingHistory;

  return (
    <div className="flex h-full w-full flex-col bg-dot-grid">
      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-[#94A3B8] animate-pulse">
              Loading conversation...
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
            <div className="text-center">
              <h1 className="font-headline text-3xl font-bold tracking-tight text-text-main">
                What can I help you with?
              </h1>
              <p className="mt-3 text-sm text-text-main-muted">
                I can query your contacts, create segments, check your data
                pipeline, and more.
              </p>
            </div>
            <ChatSuggestions onSelect={handleSuggestionSelect} />
          </div>
        ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSendMessage={handleAction}
                isChatBusy={isLoading}
              />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#64748B] shadow-sm ring-1 ring-[#DDE1E8]">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#0ACDBC]" />
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-[#94A3B8] shadow-sm ring-1 ring-[#DDE1E8] animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-bg">
          <div className="text-sm text-text-muted animate-pulse">Loading...</div>
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
