"use client";

interface PhoneMockupProps {
  children: React.ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="mx-auto w-[280px]">
      {/* Phone frame */}
      <div className="rounded-[32px] border-2 border-gray-300 bg-gray-100 p-2">
        {/* Notch */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-gray-300" />

        {/* Screen */}
        <div className="min-h-[400px] rounded-[24px] bg-white p-4">
          {/* Status bar */}
          <div className="mb-4 flex items-center justify-between text-[10px] font-medium text-gray-500">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-3 rounded-sm border border-gray-400">
                <div className="h-full w-2/3 rounded-sm bg-gray-400" />
              </div>
            </div>
          </div>

          {/* Message header */}
          <div className="mb-4 text-center">
            <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500">
              T
            </div>
            <p className="text-[10px] text-gray-500">Trident</p>
          </div>

          {/* Message content */}
          {children}
        </div>

        {/* Home indicator */}
        <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}

/** SMS bubble inside the phone mockup */
export function SmsBubble({ text }: { text: string }) {
  if (!text) {
    return (
      <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-xs text-gray-400">
        Your message preview will appear here...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="max-w-[220px] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-xs leading-relaxed text-gray-900 whitespace-pre-wrap">
        {text}
      </div>
      <p className="text-center text-[9px] text-gray-400">
        Reply STOP to unsubscribe
      </p>
    </div>
  );
}
