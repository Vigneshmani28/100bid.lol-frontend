"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RecentClaim } from "@/lib/types";

const POLL_INTERVAL_MS = 60_000;

function displayHost(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

/**
 * Endlessly scrolling ticker of the 10 most recent claims, e.g.
 * "brand.com claimed #42". The list is rendered twice so the -50% keyframe
 * loops seamlessly. Renders nothing until there is at least one claim, and
 * keeps the last known list through failed polls.
 */
export function RecentClaimsMarquee() {
  const [claims, setClaims] = useState<RecentClaim[]>([]);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      api
        .listRecentClaims()
        .then((data) => {
          if (!cancelled) setClaims(data.claims);
        })
        .catch(() => {
          // Decorative ticker — stay quiet on failure.
        });
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (claims.length === 0) return <div className="hidden flex-1 sm:block" />;

  const items = [...claims, ...claims];

  return (
    <div
      className="claims-marquee pointer-events-auto order-last w-full min-w-0 basis-full overflow-hidden rounded-full border border-border bg-background/90 py-1.5 backdrop-blur sm:order-none sm:w-auto sm:flex-1 sm:basis-0 sm:py-2"
      style={{
        maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
      }}
      aria-label="Recently claimed spots"
    >
      <ul className="animate-claims-marquee flex w-max items-center">
        {items.map((c, i) => (
          <li
            key={i}
            aria-hidden={i >= claims.length}
            className="flex shrink-0 items-center gap-1.5 px-4 text-xs whitespace-nowrap"
          >
            <span className="font-semibold text-foreground">
              {displayHost(c.websiteUrl, c.brandName)}
            </span>
            <span className="text-muted">claimed</span>
            <span className="font-semibold text-primary">#{c.slotNumber}</span>
            <span aria-hidden="true" className="ml-3 text-muted-foreground/40">
              •
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
