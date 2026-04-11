"use client";

import { useState, useRef, useTransition } from "react";
import { X, Search, Upload, Trash2, Image } from "lucide-react";
import type { ContentAsset } from "@/lib/content/types";
import * as contentActions from "@/app/actions/content";

interface AssetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  initialAssets: ContentAsset[];
}

export function AssetPicker({
  open,
  onClose,
  onSelect,
  initialAssets,
}: AssetPickerProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!open) return null;

  const filtered = search
    ? assets.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : assets;

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/content/assets/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }

      setAssets((prev) => [data.asset, ...prev]);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;
    startTransition(async () => {
      const result = await contentActions.deleteAsset(assetId);
      if ("success" in result) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    });
  };

  const formatSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
          <h3 className="font-headline text-sm font-semibold text-text-main">
            Asset Library
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-main-muted hover:bg-gray-100 hover:text-text-main"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search + Upload */}
        <div className="flex items-center gap-2 border-b border-card-border px-4 py-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-card-border bg-input-bg px-2 py-1.5">
            <Search size={14} className="text-text-main-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="flex-1 bg-transparent text-xs text-text-main outline-none placeholder:text-text-main-muted"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            <Upload size={12} />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
            {uploadError}
          </div>
        )}

        {/* Asset grid / drop zone */}
        <div
          ref={dropZoneRef}
          className={`overflow-y-auto p-4 transition-colors ${dragOver ? "bg-accent/5" : ""}`}
          style={{ maxHeight: "400px" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative cursor-pointer rounded-lg border border-card-border p-2 transition-all hover:border-accent hover:shadow-sm"
                  onClick={() => {
                    onSelect(asset.public_url);
                    onClose();
                  }}
                >
                  <div className="mb-2 flex h-24 items-center justify-center rounded bg-gray-50">
                    {asset.mime_type.startsWith("image/") ? (
                      <img
                        src={asset.public_url}
                        alt={asset.name}
                        className="max-h-full max-w-full rounded object-contain"
                      />
                    ) : (
                      <Image size={24} className="text-text-main-muted" />
                    )}
                  </div>
                  <p className="truncate text-[10px] font-medium text-text-main">
                    {asset.name}
                  </p>
                  {asset.file_size_bytes && (
                    <p className="font-data text-[9px] text-text-main-muted">
                      {formatSize(asset.file_size_bytes)}
                    </p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset.id);
                    }}
                    className="absolute right-1 top-1 rounded p-1 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className={`mb-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-accent bg-accent/5" : "border-card-border"}`}
              >
                <Image size={32} className="mx-auto mb-3 text-text-main-muted" />
                <p className="text-sm text-text-main-muted">
                  {search
                    ? "No assets match your search"
                    : "Drop images here or click Upload"}
                </p>
                <p className="mt-1 text-xs text-text-main-muted">
                  JPEG, PNG, GIF, WebP, SVG up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isPending && (
          <div className="border-t border-card-border px-4 py-2 text-center text-xs text-text-main-muted">
            Updating...
          </div>
        )}
      </div>
    </div>
  );
}
