"use client";

import { useEffect, useRef } from "react";

export function DotGridSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    // Listen on the parent (main), not the pointer-events-none div itself
    const parent = el.parentElement;
    if (!parent) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const mask = `radial-gradient(circle 220px at ${x}px ${y}px, black 0%, black 50%, transparent 100%)`;
      el.style.webkitMaskImage = mask;
      el.style.maskImage = mask;
      el.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      el.style.opacity = "0";
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={spotlightRef}
      className="dot-grid-spotlight pointer-events-none absolute inset-0 z-0"
      style={{ opacity: 0 }}
    />
  );
}
