"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  number: string;
  title: string;
}

interface LegalTocProps {
  items: TocItem[];
  className?: string;
  variant: "desktop" | "mobile";
}

/** Scroll-spy table of contents shared by both layouts below. Desktop gets a
 * sticky sidebar; mobile gets a native <details> dropdown so long documents
 * (Terms runs 16+ clauses) stay navigable without permanently eating screen
 * space on a small viewport. */
export function LegalToc({ items, className, variant }: LegalTocProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const list = (
    <ul className="space-y-0.5 border-l border-border">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={[
                "-ml-px flex items-baseline gap-2.5 border-l px-3 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              <span className="font-mono text-muted-foreground">{item.number}</span>
              <span className="leading-snug">{item.title}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "mobile") {
    return (
      <details className={className}>
        <summary className="cursor-pointer list-none rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground marker:content-none">
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </span>
          </span>
        </summary>
        <div className="mt-3 pl-1">{list}</div>
      </details>
    );
  }

  return (
    <nav aria-label="Table of contents" className={className}>
      <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          On this page
        </p>
        {list}
      </div>
    </nav>
  );
}
