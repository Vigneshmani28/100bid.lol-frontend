"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { api, ApiRequestError } from "@/lib/api";
import type { SlotSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { Modal } from "./Modal";
import { SlotCell } from "./SlotCell";
import { ClaimModal } from "./ClaimModal";
import { CheckoutReturn } from "./CheckoutReturn";
import { Leaderboard, LeaderboardMini } from "./Leaderboard";
import { ReportModal } from "./ReportModal";
import { ZoomPanViewport } from "./ZoomPanViewport";
import { ThemeToggle } from "./ThemeToggle";
import { OnlineBadge } from "./OnlineBadge";
import { RecentClaimsMarquee } from "./RecentClaimsMarquee";
import Link from "next/link";
import { Lottie } from "lottie-react";
import orangeCat from "../app/assets/Orange Cat Peeping.json";

// There are exactly 100 cells — always. The 10x10 grid itself is a fixed,
// deterministic size (not responsive, since panning/zooming replaces the
// need for breakpoints). What makes it feel like a large explorable canvas
// rather than a plain HTML grid is that it sits inside a much bigger
// "world": ZoomPanViewport fits the whole world in view by default (so all
// 100 cells are visible at once, small, with room to breathe), and zooming
// in moves the camera through that same fixed space toward individual
// cells. The world is a fixed size, not infinite — it's just larger than
// the content it holds.
const GRID_COLS = 10;
const CELL_PX = 84;
const GAP_PX = 8;
const GRID_PX = GRID_COLS * CELL_PX + (GRID_COLS - 1) * GAP_PX;
// Keep the world only a little larger than the wall. The old oversized
// margin made the actual 10×10 wall tiny on a phone at the fit view. A pixel
// wall should open with the grid immediately legible, then give people room
// to explore once they zoom in.
const WORLD_MARGIN = 86;
const WORLD_PX = GRID_PX + WORLD_MARGIN * 2;
const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_PX}px)`,
  gridAutoRows: `${CELL_PX}px`,
  gap: GAP_PX,
};
// No visual styling here on purpose: the dotted "digital canvas" texture is
// rendered once by ZoomPanViewport as a fixed backdrop behind the world, so
// it never scales or pans with the camera — only the cells themselves live
// inside this box. This is purely invisible layout space that centers the
// 10x10 grid inside a footprint larger than the grid, giving panning real
// room to move once zoomed in.
const worldStyle: CSSProperties = {
  width: WORLD_PX,
  height: WORLD_PX,
};

const pillClass =
  "pointer-events-auto border border-border bg-background/90 backdrop-blur";

/** The larger "world" the 100-cell grid sits centered inside — see the comment above. */
function WorldCanvas({ children }: { children: ReactNode }) {
  return (
    <div style={worldStyle} className="flex items-center justify-center">
      {children}
    </div>
  );
}

/**
 * The entire homepage is one fullscreen, edge-to-edge pan/zoom canvas — like
 * a pixel-wall site — with small floating pill controls layered on top
 * instead of a traditional navbar/hero/footer page. The floating rows below
 * use `pointer-events-none` so drag gestures pass straight through to the
 * canvas anywhere that isn't an actual pill/button.
 */
export function SlotWall() {
  const [slots, setSlots] = useState<SlotSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [claimSlotNumber, setClaimSlotNumber] = useState<number | null>(null);
  const [reportSlotNumber, setReportSlotNumber] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  // Set when a hosted checkout redirects back here with ?bid=<id> — see
  // CheckoutReturn and the provider's return_url.
  const [returnedBidId, setReturnedBidId] = useState<string | null>(null);
  // True when that redirect was the provider's cancel_url (an explicit
  // back-out) rather than return_url — tells CheckoutReturn to skip the
  // "confirming" wait and show a cancelled state right away.
  const [returnedCancelled, setReturnedCancelled] = useState(false);
  const [lockedSlotNumber, setLockedSlotNumber] = useState<number | null>(null);
  // Bumped on mobile to force the top-holders podium shut the instant the
  // user starts panning/zooming the wall, so it never sits in the way of
  // the gesture. Desktop leaves the podium exactly as the user left it —
  // see the `matchMedia` check in the handler below, which mirrors the
  // breakpoint SlotCell already uses for its own mobile/desktop branching.
  const [leaderboardCollapseSignal, setLeaderboardCollapseSignal] = useState(0);
  const handleWallGestureStart = useCallback(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setLeaderboardCollapseSignal((n) => n + 1);
    }
  }, []);
  const [hoveredSlotNumber, setHoveredSlotNumber] = useState<number | null>(
    null,
  );

  const reload = useCallback(async () => {
    try {
      const { slots } = await api.listSlots();
      setSlots(slots);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not load the 100 spots.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listSlots()
      .then(({ slots }) => {
        if (!cancelled) setSlots(slots);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Could not load the 100 spots.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reading the URL is exactly the "subscribe to an external system" case
  // effects exist for, and it has to happen after mount: doing it in a lazy
  // useState initializer would render different markup on the server (no
  // window) than on the client, which is a hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bidId = params.get("bid");
    if (!bidId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setReturnedBidId(bidId);
    setReturnedCancelled(params.get("checkout") === "cancelled");
    // Drop the param so a refresh (or a shared link) doesn't reopen this.
    params.delete("bid");
    params.delete("checkout");
    // Dodo appends its own unverified result params; they're no use to us.
    params.delete("payment_id");
    params.delete("status");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);

  const claimSlot =
    claimSlotNumber != null
      ? (slots?.find((s) => s.number === claimSlotNumber) ?? null)
      : null;
  const reportSlot =
    reportSlotNumber != null
      ? (slots?.find((s) => s.number === reportSlotNumber) ?? null)
      : null;
  const firstOpenSlot = useMemo(
    () => slots?.find((s) => !s.occupied) ?? null,
    [slots],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {error && (
        <div className="flex h-full items-center justify-center p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {!error && !slots && (
        <ZoomPanViewport
          contentWidth={WORLD_PX}
          contentHeight={WORLD_PX}
          className="absolute inset-0"
        >
          <WorldCanvas>
            <div role="status" aria-live="polite" style={gridStyle}>
              {Array.from({ length: 100 }, (_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-border bg-surface"
                />
              ))}
              <span className="sr-only">Loading the 100 spots…</span>
            </div>
          </WorldCanvas>
        </ZoomPanViewport>
      )}

      {slots && (
        <ZoomPanViewport
          contentWidth={WORLD_PX}
          contentHeight={WORLD_PX}
          className="absolute inset-0"
          onGestureStart={handleWallGestureStart}
        >
          <WorldCanvas>
            <ul style={gridStyle}>
              {slots.map((slot) => (
                <li key={slot.number} className="relative">
                  <SlotCell
                    slot={slot}
                    isOpenOnMobile={openSlot === slot.number}
                    onToggleMobile={() =>
                      setOpenSlot((cur) =>
                        cur === slot.number ? null : slot.number,
                      )
                    }
                    lockedSlotNumber={lockedSlotNumber}
                    hoveredSlotNumber={hoveredSlotNumber}
                    onLockToggle={(slotNumber) => {
                      setLockedSlotNumber((cur) =>
                        cur === slotNumber ? null : slotNumber,
                      );
                    }}
                    onHover={(slotNumber) => {
                      setHoveredSlotNumber(slotNumber);
                      // When hovering over a different occupied cell, clear the lock
                      if (
                        lockedSlotNumber !== null &&
                        lockedSlotNumber !== slotNumber
                      ) {
                        setLockedSlotNumber(null);
                      }
                    }}
                    onHoverEnd={() => {
                      // Only clear hovered if we don't have a lock
                      if (lockedSlotNumber === null) {
                        setHoveredSlotNumber(null);
                      }
                    }}
                    onClaim={() => {
                      setOpenSlot(null);
                      setClaimSlotNumber(slot.number);
                      setLockedSlotNumber(null);
                      setHoveredSlotNumber(null);
                    }}
                    onReport={() => {
                      setOpenSlot(null);
                      setReportSlotNumber(slot.number);
                      setLockedSlotNumber(null);
                      setHoveredSlotNumber(null);
                    }}
                  />
                </li>
              ))}
            </ul>
          </WorldCanvas>
        </ZoomPanViewport>
      )}

      {/* Floating top row: just the logo — the wall's live numbers moved to
          the bottom-right meter, where they have room to be read. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 sm:flex-nowrap sm:items-start sm:p-4">
        <div className={`flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4`}>
          <Logo />
        </div>
        <RecentClaimsMarquee />
        <div className="pointer-events-auto flex items-center gap-2">
          <OnlineBadge />

          <ThemeToggle />
        </div>
      </div>

      {/* Floating bottom row: info + mobile board button on the left, the
          top-holders podium on the right. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
        <div className="relative flex flex-col items-start gap-2">
          {/* Cat animation */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-2px] w-24 h-24 pointer-events-none">
            <Lottie
              src={orangeCat}
              loop
              autoplay
            />
          </div>

          {/* Button */}
          <div className="pointer-events-none flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  setInfoOpen(true);
                }}
                size="sm"
                className={`${pillClass} h-11 px-6 text-xs font-semibold cursor-pointer text-foreground hover:text-white`}
              >
                WAIT... WHAT ?
              </Button>
            </div>
          </div>
        </div>
        {/* The podium — shown on every screen size now, so mobile gets the
            same live top-3 peek desktop always has, not just a button. */}
        {slots && (
          <LeaderboardMini
            slots={slots}
            onExpand={() => { setLeaderboardOpen(true); }}
            collapseSignal={leaderboardCollapseSignal}
          />
        )}
      </div>

      {returnedBidId && (
        <CheckoutReturn
          bidId={returnedBidId}
          cancelled={returnedCancelled}
          onResolved={() => {
            setReturnedBidId(null);
            setReturnedCancelled(false);
            void reload();
          }}
          onBidAgain={(slotNumber) => {
            // Straight back into the claim flow on the same spot, with fresh
            // slot data so the minimum bid reflects whatever just happened.
            setReturnedBidId(null);
            setReturnedCancelled(false);
            void reload();
            setClaimSlotNumber(slotNumber);
          }}
        />
      )}

      {leaderboardOpen && slots && (
        <Modal
          titleId="leaderboard-title"
          title="Top 10 holders"
          onClose={() => setLeaderboardOpen(false)}
          panelClassName="sm:max-w-lg"
        >
          <Leaderboard slots={slots} />
        </Modal>
      )}

      {infoOpen && (
        <Modal
          titleId="how-it-works-title"
          title="How 100BID works"
          onClose={() => setInfoOpen(false)}
          panelClassName="sm:max-w-2xl"
        >
          <div className="space-y-6">
            {/* Hero explanation */}
            <div className="border border-border bg-surface-hover/40 p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-primary">
                The idea
              </p>

              <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
                100 spots. One wall.
                <br />
                <span className="text-muted">
                  Own a piece of the attention.
                </span>
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted">
                100BID is a public advertising wall with 100 spots. Pick a spot, place your bid, and keep it as long as nobody outbids you.
              </p>
            </div>

            {/* Simple flow */}
            <div>
              <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
                How it works
              </p>

              <div className="space-y-0">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface text-xs font-mono font-bold text-foreground">
                      01
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>

                  <div className="pb-6">
                    <p className="text-sm font-semibold text-foreground">
                      Pick a spot
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Choose any of the 100 spots on the wall and attach your
                      brand, project, profile, or link.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface text-xs font-mono font-bold text-foreground">
                      02
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>

                  <div className="pb-6">
                    <p className="text-sm font-semibold text-foreground">
                      Pay to claim it
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Your payment becomes the amount someone else has to beat
                      to take the spot from you.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-xs font-mono font-bold text-primary">
                      03
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>

                  <div className="pb-6">
                    <p className="text-sm font-semibold text-foreground">
                      Hold the spot
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Once your payment is verified, you become the current
                      holder. Your brand stays on the wall until someone pays
                      more.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface text-xs font-mono font-bold text-foreground">
                      04
                    </div>
                    <div className="mt-2 h-full w-px bg-border" />
                  </div>

                  <div className="pb-6">
                    <p className="text-sm font-semibold text-foreground">
                      Someone pays more
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      You lose the spot when another advertiser&apos;s claim
                      pays more than yours. Your previous ownership is kept in
                      the spot&apos;s history.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-xs font-mono font-bold text-primary">
                    05
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Come back and reclaim it
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Losing a spot doesn&apos;t mean you&apos;re out forever.
                      You can claim the same spot again and take it back by
                      paying more than the current amount.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual example */}
            <div className="border border-border">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Example
                </p>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">You pay</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    $10
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Someone pays</span>
                  <span className="font-mono text-sm font-bold text-primary">
                    $11
                  </span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">New holder</span>
                  <span className="text-sm font-semibold text-foreground">
                    Them
                  </span>
                </div>

                <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted">
                  You no longer hold the spot, but your ownership remains
                  visible in the spot&apos;s history.
                </p>
              </div>
            </div>

            {/* What makes it different */}
            <div className="border-t border-border pt-5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
                The important part
              </p>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Exactly 100
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    The wall never grows. There are always 100 spots.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No countdown
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    A spot stays yours until someone pays more than you did.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Always public
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Anyone can see who currently holds each spot.
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    History stays
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Every previous holder becomes part of the ledger.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom statement */}
            <div className="border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">
                Think of it as a public leaderboard for attention.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                If you want the spot, pay more than its current amount.
              </p>
            </div>

            {/* Legal links */}
            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                Legal
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 text-xs border border-border rounded hover:bg-surface-hover transition-colors"
                >
                  Terms of Use
                </Link>
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 text-xs border border-border rounded hover:bg-surface-hover transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 text-xs border border-border rounded hover:bg-surface-hover transition-colors"
                >
                  Rules
                </Link>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {claimSlot && (
        <ClaimModal
          slot={claimSlot}
          onClose={() => setClaimSlotNumber(null)}
          onSuccess={() => {
            reload();
          }}
        />
      )}

      {reportSlot && (
        <ReportModal
          slot={reportSlot}
          onClose={() => setReportSlotNumber(null)}
        />
      )}
    </div>
  );
}
