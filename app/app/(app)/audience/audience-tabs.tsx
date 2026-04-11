"use client";

import { useState } from "react";
import type { Segment } from "@/lib/segments/types";
import type { ContactListResult } from "@/lib/api/segments";
import { SegmentList } from "./segment-list";
import { SegmentDetail } from "./segment-detail";
import { ContactList } from "./contact-list";

interface AudienceTabsProps {
  initialSegments: Segment[];
  initialContacts: ContactListResult["contacts"];
  initialTotal: number;
  lifecycleCounts: Record<string, number>;
  role: string;
}

type Tab = "segments" | "contacts";

export function AudienceTabs({
  initialSegments,
  initialContacts,
  initialTotal,
  lifecycleCounts,
  role,
}: AudienceTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("segments");
  const [segments, setSegments] = useState(initialSegments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null
  );

  const canManage = role === "owner" || role === "admin";
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) ?? null;

  function handleSegmentCreated(segment: Segment) {
    setSegments((prev) => [segment, ...prev]);
  }

  function handleSegmentUpdated(segment: Segment) {
    setSegments((prev) =>
      prev.map((s) => (s.id === segment.id ? segment : s))
    );
  }

  function handleSegmentDeleted(segmentId: string) {
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    setSelectedSegmentId(null);
  }

  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("segments");
            setSelectedSegmentId(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "segments"
              ? "border-b-2 border-accent text-accent"
              : "text-text-main-muted hover:text-text-main"
          }`}
        >
          Segments
          <span className="ml-1.5 font-data text-xs text-text-main-muted">
            {segments.filter((s) => s.status === "active").length}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("contacts");
            setSelectedSegmentId(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "contacts"
              ? "border-b-2 border-accent text-accent"
              : "text-text-main-muted hover:text-text-main"
          }`}
        >
          Contacts
          <span className="ml-1.5 font-data text-xs text-text-main-muted">
            {lifecycleCounts.total ?? 0}
          </span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "segments" && !selectedSegment && (
        <SegmentList
          segments={segments}
          canManage={canManage}
          onSelect={(id) => setSelectedSegmentId(id)}
          onCreated={handleSegmentCreated}
        />
      )}

      {activeTab === "segments" && selectedSegment && (
        <SegmentDetail
          segment={selectedSegment}
          canManage={canManage}
          onBack={() => setSelectedSegmentId(null)}
          onUpdated={handleSegmentUpdated}
          onDeleted={handleSegmentDeleted}
        />
      )}

      {activeTab === "contacts" && (
        <ContactList
          initialContacts={initialContacts}
          initialTotal={initialTotal}
          lifecycleCounts={lifecycleCounts}
        />
      )}
    </>
  );
}
