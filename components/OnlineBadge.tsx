"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DatafastOnline } from "@/lib/types";

// 10 minutes for now — DataFast's realtime window itself is a 10-minute
// rolling count, so polling faster doesn't buy much freshness. Easy to
// tighten later if the badge should feel more "live".
const POLL_INTERVAL_MS = 10 * 60_000;

/**
 * Live "N online · M visitors" badge, sourced from DataFast's
 * /analytics/realtime and /analytics/overview via our own backend proxy
 * (the df_ API key stays server-side — see
 * backend/src/services/datafastService.ts).
 *
 * Renders nothing until the first successful fetch, and holds the last
 * known numbers through any failed poll rather than disappearing — e.g. if
 * DATAFAST_API_KEY isn't configured in this environment, the nav just quietly
 * has no badge instead of flashing an error.
 */
export function OnlineBadge() {
  const [stats, setStats] = useState<DatafastOnline | null>(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      api
        .getDatafastOnline()
        .then((data) => {
          if (!cancelled) setStats(data);
        })
        .catch(() => {
          // Swallow — an unconfigured/unreachable DataFast shouldn't break
          // the nav. Keep showing the last known numbers, if any.
        });
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (stats === null) return null;

  return (
    <div
      className="
    inline-flex h-10 items-center gap-2
    rounded-full
    bg-background/90
    px-3.5
    backdrop-blur
  "
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>

      <span className="text-xs font-semibold text-foreground">
        {stats.online.toLocaleString()} online
      </span>

      {typeof stats.visitors === "number" && (
        <>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>

          <span className="text-xs font-medium text-muted">
            {stats.visitors.toLocaleString()} visitors
          </span>
        </>
      )}
    </div>
  );
}
