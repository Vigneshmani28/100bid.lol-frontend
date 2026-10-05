"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CaretDownIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { formatDuration } from "@/lib/duration";
import { formatCentsAsUsd } from "@/lib/money";
import type { SlotSummary } from "@/lib/types";
import { BrandGlyph } from "./SlotCell";
import { Button } from "@/components/ui/button";
import { Lottie } from "lottie-react";
import fireAnimation from ".././app/assets/Fire.json";

const TOP_COUNT = 10;

/**
 * The spots currently held by the biggest bids, highest first.
 *
 * Ranks on `currentBidCents` — what each holder actually paid to be sitting
 * there right now — so the board answers "who is holding the wall" rather
 * than "who has ever bid the most". Ties break on spot number, which keeps
 * the order stable across reloads instead of shuffling equal bids around.
 */
export function topHolders(slots: SlotSummary[], limit = TOP_COUNT) {
  return slots
    .filter((slot) => slot.occupied && slot.ad)
    .sort(
      (a, b) => b.currentBidCents - a.currentBidCents || a.number - b.number,
    )
    .slice(0, limit);
}

/** Rank 1 is the loudest; 2 and 3 still stand out; the rest stay quiet. */
function rankStyles(rank: number) {
  if (rank === 1) return "border-primary/50 bg-primary/15 text-primary";
  if (rank <= 3) return "border-border-strong bg-surface-hover text-foreground";
  return "border-transparent bg-transparent text-muted-foreground";
}

export function Leaderboard({ slots }: { slots: SlotSummary[] }) {
  const leaders = topHolders(slots);

  if (leaders.length === 0) {
    return (
      <div className="border border-border bg-surface-hover/40 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          Nobody holds a spot yet
        </p>
        <p className="mt-1 text-sm text-muted">
          All 100 spots are still open. The first bid lands straight at number
          one.
        </p>
      </div>
    );
  }

  const topBid = leaders[0].currentBidCents;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        The{" "}
        {leaders.length === 1
          ? "highest bid"
          : `${leaders.length} highest bids`}{" "}
        holding a spot on the wall right now. Outbid any of them to take their
        place.
      </p>

      <ol className="divide-y divide-border/60 border-y border-border/60">
        {leaders.map((slot, index) => {
          const rank = index + 1;
          const ad = slot.ad!;
          // Every row is measured against the top bid, so the board reads as
          // a chart at a glance — you can see whether number one is running
          // away with it or the pack is tight.
          const share = topBid > 0 ? (slot.currentBidCents / topBid) * 100 : 0;

          return (
            <li key={slot.number} className="relative">
              {/* Proportional bid bar, behind the row content. */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-primary/[0.07]"
                style={{ width: `${share}%` }}
              />

              <a
                href={ad.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-3 py-3 pl-1 pr-1 transition-colors hover:bg-surface-hover/50"
              >
                {/* Rank */}
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    "font-mono text-[11px] font-bold tabular-nums",
                    rankStyles(rank),
                  ].join(" ")}
                >
                  {rank}
                </span>

                <BrandGlyph
                  name={ad.brandName}
                  faviconUrl={ad.faviconUrl}
                  imageUrl={ad.imageUrl}
                />

                {/* Brand */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                    {ad.brandName}
                    <ArrowUpRightIcon
                      size={12}
                      weight="bold"
                      aria-hidden="true"
                      className="ml-1 inline shrink-0 align-[-1px] text-muted-foreground/60 transition-colors group-hover:text-primary"
                    />
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    <span className="font-medium text-muted">
                      Spot #{slot.number}
                    </span>
                    {slot.ownershipStartedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          held {formatDuration(slot.ownershipStartedAt)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Bid */}
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatCentsAsUsd(slot.currentBidCents)}
                </p>
              </a>
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Ranked by the bid currently holding each spot. Take one over by bidding
        higher than its holder.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini Leaderboard                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The ambient version that floats on the canvas: just the podium, and a way
 * into the full board. Deliberately a peek rather than a panel of its own —
 * it stays narrow, sits in the existing floating layer, and collapses to a
 * single line so it can never become something to work around on the way to
 * the wall.
 */
export function LeaderboardMini({
  slots,
  onExpand,
  className = "",
  collapseSignal,
}: {
  slots: SlotSummary[];
  onExpand: () => void;
  className?: string;
  /**
   * Bump this (e.g. a counter) to force the podium shut — used on mobile so
   * starting a zoom/drag on the wall immediately gets it out of the way.
   * Ignored on mount so the podium still starts open.
   */
  collapseSignal?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const leaders = topHolders(slots, 3);

  const isMount = useRef(true);
  useEffect(() => {
    if (isMount.current) {
      isMount.current = false;
      return;
    }
    setCollapsed(true);
  }, [collapseSignal]);

  if (leaders.length === 0) return null;

  return (
    <div
      className={[
        "pointer-events-auto w-[188px] overflow-hidden rounded-xl sm:w-[236px]",
        "border border-border/40 bg-surface shadow-sm transition-shadow hover:shadow-md",
        className,
      ].join(" ")}
    >
      <Button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2.5 rounded-none px-3.5 py-2.5 text-left hover:bg-surface-hover/30"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Lottie
            src={fireAnimation}
            loop
            autoplay
            className="h-7 w-7"
          />
        </div>

        <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Top Holders
        </span>

        <CaretDownIcon
          size={12}
          weight="bold"
          aria-hidden="true"
          className={[
            "shrink-0 text-muted-foreground/50 transition-all duration-300 ease-out",
            collapsed ? "" : "rotate-180",
          ].join(" ")}
        />

        <span className="sr-only">
          {collapsed ? "Show" : "Hide"} the top holders
        </span>
      </Button>

      {!collapsed && (
        <>
          <div className="border-t border-border/40" />

          <ol className="space-y-0.5 px-1 py-1">
            {leaders.map((slot, index) => {
              const ad = slot.ad!;
              return (
                <li key={slot.number}>
                  <a
                    href={ad.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-hover/30"
                  >
                    <BrandGlyph
                      name={ad.brandName}
                      faviconUrl={ad.faviconUrl}
                      imageUrl={ad.imageUrl}
                      size="small"
                    />

                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground transition-colors group-hover:text-primary">
                      {ad.brandName}
                    </span>

                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground/60">
                      {formatCentsAsUsd(slot.currentBidCents)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>

          <div className="border-t border-border/40" />

          <Button
            type="button"
            onClick={onExpand}
            variant="ghost"
            size="sm"
            className="group w-full justify-between rounded-none px-3.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-hover/30 hover:text-foreground"
          >
            <span>View all top 10</span>
            <ArrowRightIcon
              size={13}
              weight="bold"
              aria-hidden="true"
              className="shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </Button>
        </>
      )}
    </div>
  );
}
