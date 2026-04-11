"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Monitor, Smartphone, ChevronDown, Blocks } from "lucide-react";
import { ComposerTopBar } from "@/components/content/composer-top-bar";
import { PersonalizationPanel } from "@/components/content/personalization-panel";
import { compileMjmlClient as compileMjml } from "@/lib/content/mjml-client";
import {
  DEFAULT_EMAIL_BLOCKS,
  DEFAULT_EMAIL_TEMPLATE,
} from "@/lib/content/mjml-blocks";
import { renderLiquid } from "@/lib/liquid/engine";
import { SAMPLE_CONTEXT } from "@/lib/liquid/contact-context";
import * as contentActions from "@/app/actions/content";
import type { ContentTemplate } from "@/lib/content/types";

interface EmailEditorProps {
  template?: ContentTemplate;
}

export function EmailEditor({ template }: EmailEditorProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const [name, setName] = useState(template?.name ?? "Untitled Email");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [preheader, setPreheader] = useState(template?.preheader ?? "");
  const [mjmlSource, setMjmlSource] = useState<string>(
    (template?.body_json as string) ?? DEFAULT_EMAIL_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(template?.status ?? "draft");
  const [publishing, setPublishing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [compiledHtml, setCompiledHtml] = useState("");
  const [mjmlErrors, setMjmlErrors] = useState<
    Array<{ message: string; line: number }>
  >([]);

  // Compile MJML + render Liquid preview (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!mjmlSource) {
        setCompiledHtml("");
        setMjmlErrors([]);
        return;
      }

      const { html, errors } = compileMjml(mjmlSource);
      setMjmlErrors(errors);

      if (html) {
        try {
          const rendered = await renderLiquid(
            html,
            SAMPLE_CONTEXT as unknown as Record<string, unknown>
          );
          setCompiledHtml(rendered);
        } catch {
          setCompiledHtml(html);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mjmlSource]);

  // Update iframe when compiled HTML changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !compiledHtml) return;

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(compiledHtml);
      doc.close();
    }
  }, [compiledHtml]);

  // Auto-save every 30 seconds (only for existing templates)
  useEffect(() => {
    if (!template) return;

    autoSaveTimer.current = setInterval(() => {
      autoSave();
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, name, subject, preheader, mjmlSource]);

  const autoSave = async () => {
    if (!template) return;
    const { html } = compileMjml(mjmlSource);
    await contentActions.updateTemplate(template.id, {
      name,
      subject,
      preheader,
      body_json: mjmlSource,
      body_html: html,
      body_text: stripHtml(html),
    });
  };

  const insertVariable = useCallback(
    (variable: string) => {
      const editor = editorRef.current;
      if (!editor) {
        setMjmlSource((prev) => prev + variable);
        return;
      }
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const newSource =
        mjmlSource.substring(0, start) +
        variable +
        mjmlSource.substring(end);
      setMjmlSource(newSource);
      requestAnimationFrame(() => {
        editor.focus();
        const pos = start + variable.length;
        editor.setSelectionRange(pos, pos);
      });
    },
    [mjmlSource]
  );

  const insertBlock = (mjml: string) => {
    const editor = editorRef.current;
    if (!editor) {
      // Insert before the closing </mj-body> tag
      setMjmlSource((prev) => {
        const idx = prev.lastIndexOf("</mj-body>");
        if (idx === -1) return prev + "\n" + mjml;
        return prev.substring(0, idx) + "\n    " + mjml + "\n  " + prev.substring(idx);
      });
      return;
    }
    const start = editor.selectionStart;
    const newSource =
      mjmlSource.substring(0, start) +
      "\n    " +
      mjml +
      "\n" +
      mjmlSource.substring(start);
    setMjmlSource(newSource);
    setBlockMenuOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { html } = compileMjml(mjmlSource);

      const payload = {
        name,
        subject,
        preheader,
        body_json: mjmlSource,
        body_html: html,
        body_text: stripHtml(html),
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
          channel: "email",
        });
        if ("error" in result) {
          alert(result.error);
          return;
        }
        router.replace(`/content/email/${result.template.id}`);
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
        channel="email"
        name={name}
        saving={saving}
        status={status}
        publishing={publishing}
        onNameChange={setName}
        onSave={save}
        onPublish={publish}
      />

      {/* Subject + Preheader bar */}
      <div className="flex gap-4 border-b border-card-border bg-card px-6 py-3">
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs font-medium text-text-main-muted whitespace-nowrap">
            Subject:
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line..."
            className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-main-muted"
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs font-medium text-text-main-muted whitespace-nowrap">
            Preheader:
          </label>
          <input
            type="text"
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            placeholder="Preview text..."
            className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-main-muted"
          />
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Left: MJML Code Editor */}
        <div className="flex flex-1 flex-col border-r border-card-border">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-card-border bg-card px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="font-data text-xs text-text-main-muted">
                MJML
              </span>

              {/* Block inserter */}
              <div className="relative">
                <button
                  onClick={() => setBlockMenuOpen(!blockMenuOpen)}
                  className="flex items-center gap-1 rounded-md border border-card-border px-2 py-1 text-xs text-text-main-muted hover:border-accent hover:text-accent"
                >
                  <Blocks size={12} />
                  Insert Block
                  <ChevronDown size={10} />
                </button>
                {blockMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setBlockMenuOpen(false)}
                    />
                    <div className="absolute left-0 z-20 mt-1 w-52 rounded-md border border-card-border bg-card py-1 shadow-lg">
                      {DEFAULT_EMAIL_BLOCKS.map((block) => (
                        <button
                          key={block.name}
                          onClick={() => insertBlock(block.mjml)}
                          className="flex w-full items-center px-3 py-2 text-xs text-text-main hover:bg-gray-50"
                        >
                          {block.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center gap-1 rounded-md border border-card-border px-2 py-1 text-xs text-text-main-muted hover:border-accent hover:text-accent"
            >
              <User size={12} />
              Variables
            </button>
          </div>

          {/* Code textarea */}
          <textarea
            ref={editorRef}
            value={mjmlSource}
            onChange={(e) => setMjmlSource(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-none bg-gray-900 p-4 font-data text-xs leading-relaxed text-green-400 outline-none"
          />

          {/* MJML errors */}
          {mjmlErrors.length > 0 && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2">
              {mjmlErrors.map((err, i) => (
                <p key={i} className="font-data text-[10px] text-red-600">
                  Line {err.line}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Right: HTML Preview */}
        <div className="flex flex-1 flex-col">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between border-b border-card-border bg-card px-4 py-2">
            <span className="font-data text-xs text-text-main-muted">
              Preview
            </span>
            <div className="flex items-center gap-1 rounded-md border border-card-border p-0.5">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`rounded p-1 ${previewMode === "desktop" ? "bg-accent/10 text-accent" : "text-text-main-muted hover:text-text-main"}`}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`rounded p-1 ${previewMode === "mobile" ? "bg-accent/10 text-accent" : "text-text-main-muted hover:text-text-main"}`}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          {/* iframe preview */}
          <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-100 p-4">
            <div
              className={`bg-white shadow-md transition-all ${
                previewMode === "mobile"
                  ? "w-[375px] rounded-xl"
                  : "w-full max-w-[680px]"
              }`}
            >
              <iframe
                ref={iframeRef}
                title="Email Preview"
                className="h-[600px] w-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
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

/** Strip HTML tags to get plain text */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
