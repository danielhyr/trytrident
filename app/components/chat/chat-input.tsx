"use client";

import { SendHorizonal } from "lucide-react";
import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from "react";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          onSubmit(input);
        }
      }
    },
    [input, isLoading, onSubmit]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onInputChange(e.target.value);
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    },
    [onInputChange]
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(input);
      }
    },
    [input, isLoading, onSubmit]
  );

  return (
    <div className="px-4 py-3">
      <form
        onSubmit={handleFormSubmit}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-full border border-[#DDE1E8] bg-white px-4 py-2 shadow-md"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message Trident..."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0ACDBC] text-white transition-all hover:bg-[#09b8a9] disabled:opacity-30"
        >
          <SendHorizonal size={15} />
        </button>
      </form>
    </div>
  );
}
