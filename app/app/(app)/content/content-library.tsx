"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Mail,
  MessageSquare,
  Bell,
  ImageIcon,
  ChevronDown,
} from "lucide-react";
import { TemplateCard } from "@/components/content/template-card";
import { AssetCard } from "@/components/content/asset-card";
import type {
  ContentTemplate,
  ContentAsset,
  ContentChannel,
  TemplateStatus,
} from "@/lib/content/types";
import { CHANNEL_CONFIG } from "@/lib/content/types";
import * as contentActions from "@/app/actions/content";

type ContentFilter = ContentChannel | "images" | null;

interface ContentLibraryProps {
  initialTemplates: ContentTemplate[];
  initialTotal: number;
  channelCounts: Record<string, number>;
  initialAssets: ContentAsset[];
}

export function ContentLibrary({
  initialTemplates,
  initialTotal,
  channelCounts,
  initialAssets,
}: ContentLibraryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState(initialTemplates);
  const [assets, setAssets] = useState(initialAssets);
  const [total, setTotal] = useState(initialTotal);
  const [contentFilter, setContentFilter] = useState<ContentFilter>(null);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | null>(null);
  const [search, setSearch] = useState("");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showingImages = contentFilter === "images";
  const channelFilter = contentFilter !== "images" ? contentFilter : null;

  const reload = (
    channel: ContentChannel | null,
    status: TemplateStatus | null,
    searchTerm: string
  ) => {
    startTransition(async () => {
      const result = await contentActions.fetchTemplates({
        channel: channel ?? undefined,
        status: status ?? undefined,
        search: searchTerm || undefined,
      });
      if ("error" in result) return;
      setTemplates(result.templates);
      setTotal(result.total);
    });
  };

  const handleContentFilter = (filter: ContentFilter) => {
    setContentFilter(filter);
    if (filter !== "images") {
      reload(filter, statusFilter, search);
    }
  };

  const handleStatusFilter = (status: TemplateStatus | null) => {
    setStatusFilter(status);
    reload(channelFilter, status, search);
  };

  const handleSearch = (term: string) => {
    setSearch(term);
    if (!showingImages) {
      reload(channelFilter, statusFilter, term);
    }
  };

  const handleEdit = (id: string) => {
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    router.push(`/content/${tmpl.channel}/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    const result = await contentActions.duplicateTemplate(id);
    if ("error" in result) return;
    reload(channelFilter, statusFilter, search);
  };

  const handleArchive = async (id: string) => {
    const result = await contentActions.archiveTemplate(id);
    if ("error" in result) return;
    reload(channelFilter, statusFilter, search);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    const result = await contentActions.deleteTemplate(id);
    if ("error" in result) return;
    reload(channelFilter, statusFilter, search);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    const result = await contentActions.deleteAsset(id);
    if ("error" in result) return;
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/content/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.asset) {
        setAssets((prev) => [data.asset, ...prev]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter assets by search when showing images
  const filteredAssets = search
    ? assets.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : assets;

  const totalItems = initialTotal + initialAssets.length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-text-main">
          Content
        </h1>

        {/* Create dropdown */}
        <div className="relative">
          <button
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Plus size={16} />
            Create New
            <ChevronDown size={14} />
          </button>
          {createMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setCreateMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-card-border bg-card py-1 shadow-lg">
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    router.push("/content/email/new");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-gray-50"
                >
                  <Mail
                    size={14}
                    style={{ color: CHANNEL_CONFIG.email.color }}
                  />
                  Email
                </button>
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    router.push("/content/sms/new");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-gray-50"
                >
                  <MessageSquare
                    size={14}
                    style={{ color: CHANNEL_CONFIG.sms.color }}
                  />
                  SMS
                </button>
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    router.push("/content/push/new");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-gray-50"
                >
                  <Bell
                    size={14}
                    style={{ color: CHANNEL_CONFIG.push.color }}
                  />
                  Push Notification
                </button>
                <div className="my-1 border-t border-card-border" />
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-gray-50"
                >
                  <ImageIcon size={14} className="text-text-main-muted" />
                  Upload Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        className="hidden"
      />

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <FilterPill
          active={contentFilter === null}
          onClick={() => handleContentFilter(null)}
          label={`All (${totalItems})`}
        />
        <FilterPill
          active={contentFilter === "email"}
          onClick={() => handleContentFilter("email")}
          label={`Email (${channelCounts.email ?? 0})`}
          color={CHANNEL_CONFIG.email.color}
        />
        <FilterPill
          active={contentFilter === "sms"}
          onClick={() => handleContentFilter("sms")}
          label={`SMS (${channelCounts.sms ?? 0})`}
          color={CHANNEL_CONFIG.sms.color}
        />
        <FilterPill
          active={contentFilter === "push"}
          onClick={() => handleContentFilter("push")}
          label={`Push (${channelCounts.push ?? 0})`}
          color={CHANNEL_CONFIG.push.color}
        />
        <FilterPill
          active={contentFilter === "images"}
          onClick={() => handleContentFilter("images")}
          label={`Images (${assets.length})`}
          color="#F59E0B"
        />

        {/* Status filters — only show for templates, not images */}
        {!showingImages && (
          <>
            <div className="mx-2 h-5 w-px bg-card-border" />
            <FilterPill
              active={statusFilter === null}
              onClick={() => handleStatusFilter(null)}
              label="All Status"
            />
            <FilterPill
              active={statusFilter === "draft"}
              onClick={() => handleStatusFilter("draft")}
              label="Draft"
            />
            <FilterPill
              active={statusFilter === "active"}
              onClick={() => handleStatusFilter("active")}
              label="Active"
            />
            <FilterPill
              active={statusFilter === "archived"}
              onClick={() => handleStatusFilter("archived")}
              label="Archived"
            />
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-md border border-card-border bg-card px-3 py-2">
        <Search size={16} className="text-text-main-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={
            showingImages ? "Search images..." : "Search templates..."
          }
          className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-main-muted"
        />
        {(isPending || uploading) && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>

      {/* Content grid */}
      {showingImages ? (
        // Images view
        filteredAssets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAssets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onCopyUrl={handleCopyUrl}
                onDelete={handleDeleteAsset}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={search ? "No images match your search" : "No images yet"}
            description={
              search
                ? "Try adjusting your search term."
                : "Upload images to use in your email templates."
            }
          />
        )
      ) : // All / channel view — templates + assets mixed when "All"
      contentFilter === null ? (
        // Show everything: templates then assets
        templates.length > 0 || assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={handleDeleteTemplate}
              />
            ))}
            {assets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onCopyUrl={handleCopyUrl}
                onDelete={handleDeleteAsset}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No content yet"
            description="Create your first template to get started."
          />
        )
      ) : // Filtered to a specific channel — templates only
      templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates match your filters"
          description="Try adjusting your filters or search term."
        />
      )}

      {/* Footer count */}
      {(showingImages ? filteredAssets.length > 0 : templates.length > 0) && (
        <p className="text-xs text-text-main-muted">
          {showingImages
            ? `${filteredAssets.length} image${filteredAssets.length !== 1 ? "s" : ""}`
            : `Showing ${templates.length} of ${total} template${total !== 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="font-headline text-lg font-semibold text-text-main">
        {title}
      </p>
      <p className="text-sm text-text-main-muted">{description}</p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "bg-card text-text-main-muted hover:bg-gray-100 hover:text-text-main"
      }`}
      style={
        active && color
          ? { backgroundColor: color + "18", color }
          : undefined
      }
    >
      {label}
    </button>
  );
}
