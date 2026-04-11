"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, ImagePlus } from "lucide-react";
import { ComposerTopBar } from "@/components/content/composer-top-bar";
import {
  IosPushMockup,
  AndroidPushMockup,
} from "@/components/content/push-mockup";
import { PersonalizationPanel } from "@/components/content/personalization-panel";
import { renderLiquid } from "@/lib/liquid/engine";
import { SAMPLE_CONTEXT } from "@/lib/liquid/contact-context";
import * as contentActions from "@/app/actions/content";
import type { ContentTemplate } from "@/lib/content/types";

interface PushEditorProps {
  template?: ContentTemplate;
}

export function PushEditor({ template }: PushEditorProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const activeFieldRef = useRef<"title" | "body">("title");

  const [name, setName] = useState(template?.name ?? "Untitled Push");
  const [pushTitle, setPushTitle] = useState(template?.push_title ?? "");
  const [bodyText, setBodyText] = useState(template?.body_text ?? "");
  const [imageUrl, setImageUrl] = useState(template?.push_image_url ?? "");
  const [clickAction, setClickAction] = useState(
    template?.push_click_action ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(template?.status ?? "draft");
  const [publishing, setPublishing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const [previewTitle, setPreviewTitle] = useState("");
  const [previewBody, setPreviewBody] = useState("");

  // Debounced preview rendering
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const ctx = SAMPLE_CONTEXT as unknown as Record<string, unknown>;
        const [t, b] = await Promise.all([
          pushTitle ? renderLiquid(pushTitle, ctx) : Promise.resolve(""),
          bodyText ? renderLiquid(bodyText, ctx) : Promise.resolve(""),
        ]);
        setPreviewTitle(t);
        setPreviewBody(b);
      } catch {
        setPreviewTitle(pushTitle);
        setPreviewBody(bodyText);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pushTitle, bodyText]);

  const insertVariable = useCallback(
    (variable: string) => {
      if (activeFieldRef.current === "title") {
        const el = titleRef.current;
        if (!el) {
          setPushTitle((prev) => prev + variable);
          return;
        }
        const start = el.selectionStart ?? pushTitle.length;
        const end = el.selectionEnd ?? pushTitle.length;
        setPushTitle(
          pushTitle.substring(0, start) + variable + pushTitle.substring(end)
        );
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + variable.length;
          el.setSelectionRange(pos, pos);
        });
      } else {
        const el = bodyRef.current;
        if (!el) {
          setBodyText((prev) => prev + variable);
          return;
        }
        const start = el.selectionStart ?? bodyText.length;
        const end = el.selectionEnd ?? bodyText.length;
        setBodyText(
          bodyText.substring(0, start) + variable + bodyText.substring(end)
        );
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + variable.length;
          el.setSelectionRange(pos, pos);
        });
      }
    },
    [pushTitle, bodyText]
  );

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        push_title: pushTitle,
        body_text: bodyText,
        push_image_url: imageUrl || undefined,
        push_click_action: clickAction || undefined,
        body_json: { title: pushTitle, body: bodyText, imageUrl, clickAction },
      };

      if (template) {
        const result = await contentActions.updateTemplate(
          template.id,
          payload
        );
        if ("error" in result) {
          alert(result.error);
          return;
        }
      } else {
        const result = await contentActions.createTemplate({
          ...payload,
          channel: "push",
        });
        if ("error" in result) {
          alert(result.error);
          return;
        }
        router.replace(`/content/push/${result.template.id}`);
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
        channel="push"
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
              Push Notification
            </h2>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center gap-1.5 rounded-md border border-card-border px-2.5 py-1 text-xs font-medium text-text-main-muted transition-colors hover:border-accent hover:text-accent"
            >
              <User size={12} />
              Insert Variable
            </button>
          </div>

          {/* Title */}
          <label className="mb-1 text-xs font-medium text-text-main-muted">
            Title
          </label>
          <div className="mb-1 flex items-center gap-2">
            <input
              ref={titleRef}
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              onFocus={() => (activeFieldRef.current = "title")}
              placeholder="Notification title..."
              className="flex-1 rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-text-main outline-none transition-colors placeholder:text-text-main-muted focus:border-card-border-focus"
            />
          </div>
          <p className="mb-4 text-right font-data text-[10px] text-text-main-muted">
            {pushTitle.length} / 50
          </p>

          {/* Body */}
          <label className="mb-1 text-xs font-medium text-text-main-muted">
            Body
          </label>
          <textarea
            ref={bodyRef}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            onFocus={() => (activeFieldRef.current = "body")}
            placeholder="Notification body text..."
            className="mb-1 min-h-[120px] resize-none rounded-md border border-card-border bg-input-bg p-3 text-sm text-text-main outline-none transition-colors placeholder:text-text-main-muted focus:border-card-border-focus"
          />
          <p className="mb-6 text-right font-data text-[10px] text-text-main-muted">
            {bodyText.length} / 150
          </p>

          {/* Image URL */}
          <label className="mb-1 text-xs font-medium text-text-main-muted">
            Image URL (optional)
          </label>
          <div className="mb-6 flex items-center gap-2 rounded-md border border-card-border bg-input-bg px-3 py-2">
            <ImagePlus size={14} className="text-text-main-muted" />
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-main-muted"
            />
          </div>

          {/* Click Action URL */}
          <label className="mb-1 text-xs font-medium text-text-main-muted">
            Click Action URL (optional)
          </label>
          <input
            type="text"
            value={clickAction}
            onChange={(e) => setClickAction(e.target.value)}
            placeholder="https://yourshop.com/sale"
            className="rounded-md border border-card-border bg-input-bg px-3 py-2 text-sm text-text-main outline-none transition-colors placeholder:text-text-main-muted focus:border-card-border-focus"
          />
        </div>

        {/* Right: Preview (40%) */}
        <div className="flex flex-[2] flex-col items-center justify-center gap-6 overflow-y-auto bg-gray-50 p-6">
          <p className="text-xs font-medium text-text-main-muted">
            Live Preview (sample data)
          </p>
          <IosPushMockup
            title={previewTitle}
            body={previewBody}
            imageUrl={imageUrl || undefined}
          />
          <AndroidPushMockup
            title={previewTitle}
            body={previewBody}
            imageUrl={imageUrl || undefined}
          />
        </div>

        {/* Personalization Panel */}
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
