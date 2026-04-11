"use client";

interface PushMockupProps {
  title: string;
  body: string;
  imageUrl?: string;
}

/** iOS lock screen notification preview */
export function IosPushMockup({ title, body, imageUrl }: PushMockupProps) {
  return (
    <div className="w-[280px]">
      <p className="mb-2 text-center text-[10px] font-medium text-text-main-muted">
        iOS
      </p>
      <div className="rounded-2xl bg-white/95 p-3 shadow-md backdrop-blur-sm">
        {/* App header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[8px] font-bold text-white">
            T
          </div>
          <span className="text-[10px] font-medium text-gray-500">
            TRIDENT
          </span>
          <span className="ml-auto text-[10px] text-gray-400">now</span>
        </div>
        {/* Content */}
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-900 line-clamp-1">
              {title || "Notification title"}
            </p>
            <p className="mt-0.5 text-xs text-gray-600 line-clamp-3">
              {body || "Notification body preview..."}
            </p>
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-10 w-10 rounded-md object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Android notification shade preview */
export function AndroidPushMockup({ title, body, imageUrl }: PushMockupProps) {
  return (
    <div className="w-[280px]">
      <p className="mb-2 text-center text-[10px] font-medium text-text-main-muted">
        Android
      </p>
      <div className="rounded-xl bg-white p-3 shadow-md">
        {/* App header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[7px] font-bold text-white">
            T
          </div>
          <span className="text-[10px] text-gray-500">Trident</span>
          <span className="text-[10px] text-gray-400">· now</span>
          <span className="ml-auto text-[10px] text-gray-400">▾</span>
        </div>
        {/* Content */}
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-900 line-clamp-1">
              {title || "Notification title"}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-600 line-clamp-2">
              {body || "Notification body preview..."}
            </p>
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}
