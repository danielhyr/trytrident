"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { ComposerTopBar } from "@/components/content/composer-top-bar";
import { CharacterCounter } from "@/components/content/character-counter";
import { PhoneMockup, SmsBubble } from "@/components/content/phone-mockup";
import { PersonalizationPanel } from "@/components/content/personalization-panel";
import { renderLiquid } from "@/lib/liquid/engine";
import { SAMPLE_CONTEXT } from "@/lib/liquid/contact-context";
import * as contentActions from "@/app/actions/content";
import type { ContentTemplate } from "@/lib/content/types";

interface SmsEditorProps {
  template?: ContentTemplate;
}

export function SmsEditor({ template }: SmsEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(template?.name ?? "Untitled SMS");
  const [bodyText, setBodyText] = useState(template?.body_text ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(template?.status ?? "draft");
  const [publishing, setPublishing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [preview, setPreview] = useState("");

  // Debounced preview rendering
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!bodyText) {
        setPreview("");
        return;
      }
      try {
        const rendered = await renderLiquid(
          bodyText,
          SAMPLE_CONTEXT as unknown as Record<string, unknown>
        );
        setPreview(rendered);
      } catch {
        setPreview(bodyText);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bodyText]);

  const insertVariable = useCallback(
    (variable: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setBodyText((prev) => prev + variable);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText =
        bodyText.substring(0, start) + variable + bodyText.substring(end);
      setBodyText(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + variable.length;
        textarea.setSelectionRange(pos, pos);
      });
    },
    [bodyText]
  );

  const save = async () => {
    setSaving(true);
    try {
      if (template) {
        const result = await contentActions.updateTemplate(template.id, {
          name,
          body_text: bodyText,
          body_json: { text: bodyText },
        });
        if ("error" in result) {
          alert(result.error);
          return;
        }
      } else {
        const result = await contentActions.createTemplate({
          name,
          channel: "sms",
          body_text: bodyText,
          body_json: { text: bodyText },
        });
        if ("error" in result) {
          alert(result.error);
          return;
        }
        router.replace(`/content/sms/${result.template.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!template) {
      await save();
      return;
    }
    setPublishing(true);
    try {
      const newStatus = status === "active" ? "draft" : "active";
      const result = await contentActions.updateTemplate(template.id, {
        status: newStatus,
      });
      if ("error" in result) {
        alert(result.error);
        return;
      }
      setStatus(newStatus);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <ComposerTopBar
        channel="sms"
        name={name}
        saving={saving}
        status={status}
        publishing={publishing}
        onNameChange={setName}
        onSave={save}
        onPublish={publish}
      />

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Editor (60%) */}
        <div className="flex flex-[3] flex-col overflow-y-auto border-r border-card-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-sm font-semibold text-text-main">
              Message Body
            </h2>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center gap-1.5 rounded-md border border-card-border px-2.5 py-1 text-xs font-medium text-text-main-muted transition-colors hover:border-accent hover:text-accent"
            >
              <User size={12} />
              Insert Variable
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Type your SMS message here... Use {{ contact.first_name }} for personalization."
            className="mb-3 min-h-[200px] flex-1 resize-none rounded-md border border-card-border bg-input-bg p-3 font-body text-sm text-text-main outline-none transition-colors placeholder:text-text-main-muted focus:border-card-border-focus"
          />

          <div className="flex items-center justify-between">
            <CharacterCounter text={bodyText} />
            <p className="text-[10px] text-text-main-muted">
              &quot;Reply STOP to unsubscribe&quot; appended automatically
            </p>
          </div>
        </div>

        {/* Right: Preview (40%) */}
        <div className="flex flex-[2] flex-col items-center justify-center overflow-y-auto bg-gray-50 p-6">
          <p className="mb-4 text-xs font-medium text-text-main-muted">
            Live Preview (sample data)
          </p>
          <PhoneMockup>
            <SmsBubble text={preview} />
          </PhoneMockup>
        </div>

        {/* Personalization Panel overlay */}
        <PersonalizationPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onInsert={(v) => {
            insertVariable(v);
            setPanelOpen(false);
          }}
        />
      </div>
    </div>
  );
}
