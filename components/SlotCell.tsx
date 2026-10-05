"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/duration";
import { formatCentsAsUsd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import type {
  AdSummary,
  OwnershipHistoryEntry,
  SlotSummary,
} from "@/lib/types";
import { ArrowUpRightIcon, PlusIcon } from "@phosphor-icons/react";
import { dummyHolders } from "@/lib/dummyHolders";

interface SlotCellProps {
  slot: SlotSummary;
  isOpenOnMobile: boolean;
  onToggleMobile: () => void;
  lockedSlotNumber: number | null;
  hoveredSlotNumber: number | null;
  onLockToggle: (slotNumber: number) => void;
  onHover: (slotNumber: number) => void;
  onHoverEnd: () => void;
  onClaim: () => void;
  onReport: () => void;
}

/* -------------------------------------------------------------------------- */
/* Slot Cell                                                                   */
/* -------------------------------------------------------------------------- */

export function SlotCell({
  slot,
  isOpenOnMobile: isOpen,
  onToggleMobile: onToggle,
  lockedSlotNumber,
  hoveredSlotNumber,
  onLockToggle,
  onHover,
  onHoverEnd,
  onClaim,
  onReport,
}: SlotCellProps) {
  const label = slot.occupied
    ? `Spot ${slot.number}, held by ${slot.ad?.brandName}, current bid ${formatCentsAsUsd(
      slot.currentBidCents,
    )}`
    : `Spot ${slot.number}, open, starting bid ${formatCentsAsUsd(
      slot.minimumNextBidCents,
    )}`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<OwnershipHistoryEntry[] | null>(null);
  const [historyRequested, setHistoryRequested] = useState(false);

  const isLocked = lockedSlotNumber === slot.number;
  const isHoveredFromParent = hoveredSlotNumber === slot.number;

  const [anchor, setAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // The desktop preview card measures itself and flips above the cell (with
  // the arrow flipped to match) whenever there isn't enough room below in
  // the viewport — this is what stops the card from being cut off when a
  // cell is near the bottom edge. It also gets clamped horizontally so it
  // never runs off the left/right edges either.
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{
    left: number;
    top: number;
    arrowLeft: number;
    placement: "above" | "below";
  } | null>(null);

  // On desktop, occupied spots can be inspected on hover. The preview closes
  // immediately when the pointer leaves, so sweeping across the wall never
  // leaves stale cards behind. A click locks it open for reading and links.
  const previewOpen = isLocked || isHoveredFromParent || isOpen;

  function loadHistory() {
    if (historyRequested || !slot.occupied) return;

    setHistoryRequested(true);

    api
      .getSlot(slot.number)
      .then((detail) => {
        setHistory(detail.history);
      })
      .catch(() => {
        setHistory([]);
      });
  }

  function updateAnchor() {
    const rect = wrapperRef.current?.getBoundingClientRect();

    if (!rect) return;

    setAnchor({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  function handleClick() {
    updateAnchor();
    loadHistory();

    /*
     * Desktop:
     * Click locks/unlocks the preview.
     *
     * Mobile:
     * Keep the existing mobile drawer behavior.
     */
    if (window.matchMedia("(max-width: 767px)").matches) {
      onToggle();
      return;
    }

    onLockToggle(slot.number);
  }

  function handleClose() {
    onHoverEnd();

    if (isLocked) {
      onLockToggle(slot.number);
    }

    if (isOpen) {
      onToggle();
    }
  }

  useEffect(() => {
    if (!previewOpen) return;

    updateAnchor();

    const handleResize = () => {
      updateAnchor();
    };

    const handleScroll = () => {
      updateAnchor();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [previewOpen]);

  // Runs synchronously after the card is in the DOM (but before the browser
  // paints), so it can measure the card's real height — which varies with
  // content like ownership history — and flip/clamp its position before the
  // user ever sees it. Re-runs when the anchor moves (scroll/resize/hover to
  // a new cell) or when history finishes loading and changes the card's
  // height.
  useLayoutEffect(() => {
    // No state to reset here: the portal (and this card) only render while
    // `previewOpen && anchor` are truthy, so once either goes false the card
    // unmounts on its own — no need to null out cardPos from an effect.
    if (!previewOpen || !anchor) return;

    const card = cardRef.current;
    if (!card) return;

    const GAP = 10;
    const EDGE_PADDING = 12;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - (anchor.top + anchor.height);
    const spaceAbove = anchor.top;
    const placement: "above" | "below" =
      spaceBelow < cardHeight + GAP && spaceAbove > spaceBelow
        ? "above"
        : "below";

    let top =
      placement === "above"
        ? anchor.top - cardHeight - GAP
        : anchor.top + anchor.height + GAP;

    top = Math.min(
      Math.max(top, EDGE_PADDING),
      Math.max(viewportHeight - cardHeight - EDGE_PADDING, EDGE_PADDING),
    );

    let left = anchor.left + anchor.width / 2 - cardWidth / 2;
    left = Math.min(
      Math.max(left, EDGE_PADDING),
      Math.max(viewportWidth - cardWidth - EDGE_PADDING, EDGE_PADDING),
    );

    const anchorCenterX = anchor.left + anchor.width / 2;
    const arrowLeft = Math.min(
      Math.max(anchorCenterX - left, 20),
      cardWidth - 20,
    );

    setCardPos({ left, top, arrowLeft, placement });
  }, [previewOpen, anchor, history]);

  useEffect(() => {
    if (!previewOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        wrapperRef.current?.contains(target) ||
        portalRef.current?.contains(target)
      ) {
        return;
      }

      handleClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      onMouseEnter={() => {
        if (!slot.occupied || window.matchMedia("(max-width: 767px)").matches)
          return;
        updateAnchor();
        loadHistory();
        onHover(slot.number);
      }}
      onMouseLeave={() => {
        if (!isLocked) {
          onHoverEnd();
        }
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-expanded={previewOpen}
        className={[
          "group relative flex aspect-square w-full",
          "items-center justify-center overflow-hidden",
          "rounded-[7px] border",
          "bg-transparent",
          "text-center",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/60",
          "focus-visible:ring-offset-1",
          "touch-manipulation",

          slot.occupied
            ? [
              "border-border/70",
              "hover:-translate-y-[1px]",
              "hover:border-foreground/30",
              "hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)]",
              "active:scale-[0.98]",
            ].join(" ")
            : [
              "border-border/60",
              "bg-background",
              "hover:-translate-y-[1px]",
              "hover:border-foreground/25",
              "hover:bg-surface",
              "hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)]",
              "active:scale-[0.98]",
            ].join(" "),

          previewOpen ? "ring-2 ring-foreground/25 ring-offset-1" : "",
        ].join(" ")}
      >
        {/* ------------------------------------------------------------------ */}
        {/* Spot number                                                        */}
        {/* ------------------------------------------------------------------ */}

        {!slot.occupied && (
          <span
            className={[
              "absolute left-1.5 top-1.5 z-20",
              "flex h-[15px] min-w-[15px] items-center justify-center",
              "rounded-[4px] px-1",
              "text-[7px] font-semibold leading-none tabular-nums",
            ].join(" ")}
          >
            {slot.number}
          </span>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Occupied cell                                                      */}
        {/* ------------------------------------------------------------------ */}

        {slot.occupied && slot.ad ? (
          <>
            <CellVisual ad={slot.ad} />

            {/* Bid */}
            <div className="absolute inset-x-0 bottom-1.5 z-20 flex items-center justify-center">
              <span
                className="
      inline-flex items-center justify-center
      rounded-[5px]
      bg-surface
      px-2 py-1
      text-[9px]
      font-semibold
      leading-none
      text-primary
      tabular-nums
      whitespace-nowrap
      shadow-sm
      transition-transform duration-150
      group-hover:scale-105
    "
              >
                {formatCentsAsUsd(slot.currentBidCents)}
              </span>
            </div>
          </>
        ) : (
          /* ---------------------------------------------------------------- */
          /* Available cell                                                    */
          /* ---------------------------------------------------------------- */
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Plus */}
            <span
              className="
          flex items-center justify-center
          text-muted-foreground
          transition-all duration-150
          group-hover:scale-105
          group-hover:border-foreground/30
          group-hover:text-foreground
        "
            >
              <PlusIcon size={13} weight="regular" />
            </span>

            {/* Available */}
            <span
              className="
          mt-1.5
          text-[7px]
          font-semibold
          uppercase
          tracking-[0.12em]
          leading-none
          text-muted-foreground
        "
            >
              Available
            </span>

            {/* Starting bid */}
            <span
              className="
          mt-1
          text-[9px]
          font-semibold
          leading-none
          tabular-nums
          text-primary
        "
            >
              $1
            </span>
          </div>
        )}

        {/* Very subtle hover layer */}
        <div
          className="
      pointer-events-none
      absolute inset-0 z-30
      bg-black/[0.025]
      opacity-0
      transition-opacity duration-150
      group-hover:opacity-100
    "
        />
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Portal                                                              */}
      {/* ------------------------------------------------------------------ */}

      {previewOpen &&
        anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div ref={portalRef}>
            {/* Desktop */}
            <div
              ref={cardRef}
              className="fixed z-[100] hidden w-[410px] md:block"
              style={{
                left: cardPos
                  ? cardPos.left
                  : anchor.left + anchor.width / 2 - 205,
                top: cardPos ? cardPos.top : anchor.top + anchor.height + 10,
                visibility: cardPos ? "visible" : "hidden",
              }}
            >
              {/* Invisible hover area */}
              <div
                className="
      absolute
      -top-5
      -bottom-5
      left-0
      w-full
    "
                aria-hidden="true"
              />

              <SlotPreviewCard
                slot={slot}
                history={history}
                onClaim={onClaim}
                onReport={onReport}
                placement={cardPos?.placement ?? "below"}
                arrowLeft={cardPos?.arrowLeft ?? 205}
              />
            </div>

            {/* Mobile */}
            <div className="md:hidden">
              <MobileDrawer
                slot={slot}
                history={history}
                onClose={handleClose}
                onClaim={onClaim}
                onReport={onReport}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cell Visual                                                                 */
/* -------------------------------------------------------------------------- */

function CellVisual({ ad }: { ad: AdSummary }) {
  const [failed, setFailed] = useState(false);

  const source = ad.imageUrl || ad.faviconUrl;
  const hasImage = !!source && !failed;

  if (hasImage) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt=""
          loading="lazy"
          className="
            object-cover
            select-none
            transition-transform
            duration-200
            ease-out
            group-hover:scale-[1.05]
          "
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className="
          flex h-10 w-10
          items-center justify-center
          rounded-lg
          bg-primary/10
          text-lg
          font-bold
          text-primary
        "
      >
        {ad.brandName.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand Glyph                                                                 */
/* -------------------------------------------------------------------------- */

export function BrandGlyph({
  name,
  faviconUrl,
  imageUrl = null,
  size = "normal",
}: {
  name: string;
  faviconUrl: string | null;
  imageUrl?: string | null;
  size?: "small" | "normal";
}) {
  const [failed, setFailed] = useState(false);

  const wrapperSize = size === "small" ? "h-6 w-6" : "h-9 w-9";
  const textSize = size === "small" ? "text-[9px]" : "text-sm";
  const source = imageUrl || faviconUrl;

  if (!source || failed) {
    return (
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-sm",
          "bg-muted text-muted-foreground",
          "font-semibold",
          wrapperSize,
          textSize,
        ].join(" ")}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden",
        "rounded-sm bg-background",
        wrapperSize,
      ].join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Preview Image                                                               */
/* -------------------------------------------------------------------------- */

function PreviewImage({
  ad,
  className = "",
}: {
  ad: AdSummary;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!ad.imageUrl || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ad.imageUrl}
      alt=""
      loading="lazy"
      className={`w-full object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Preview Hero                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The brand image treatment shared by the desktop hover card and the mobile
 * drawer, so a spot looks the same on both: the artwork sits sharp and
 * uncropped over a blurred, washed-out copy of itself, which fills the frame
 * with the brand's own colour instead of letterboxing it against flat grey.
 * Only `heightClass` differs between the two — the drawer is wider, so it can
 * afford a taller frame.
 */
function PreviewHero({
  ad,
  number,
  heightClass,
}: {
  ad: AdSummary;
  number: number;
  heightClass: string;
}) {
  if (!ad.imageUrl) return null;

  return (
    <div className={`relative overflow-hidden ${heightClass}`}>
      {/* Blurred brand-color background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.imageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 max-h-[58%] max-w-[62%] scale-125 object-contain opacity-70 blur-2xl"
      />

      {/* Soft wash to make the background less harsh */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

      {/* Subtle bottom fade for slot number */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />

      {/* Sharp original image */}
      <PreviewImage ad={ad} className={`relative z-10 ${heightClass}`} />

      {/* Slot number */}
      <div className="absolute bottom-3 left-3 z-20">
        <span className="rounded-full bg-black/45 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          #{number}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop Preview Card                                                        */
/* -------------------------------------------------------------------------- */

function SlotPreviewCard({
  slot,
  history,
  onClaim,
  onReport,
  placement = "below",
  arrowLeft = 205,
}: {
  slot: SlotSummary;
  history: OwnershipHistoryEntry[] | null;
  onClaim: () => void;
  onReport: () => void;
  placement?: "above" | "below";
  arrowLeft?: number;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl",
        "border border-border/80",
        "bg-surface/95 text-left",
        "shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
        "backdrop-blur-xl",
        placement === "above"
          ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
          : "animate-in fade-in slide-in-from-top-2 duration-150",
      ].join(" ")}
    >
      {/* Small pointer — points down from the bottom when the card had to
          flip above the cell, otherwise points up from the top as usual. */}
      <div
        className={[
          "absolute h-3 w-3 -translate-x-1/2 rotate-45 bg-surface",
          placement === "above"
            ? "-bottom-1.5 border-b border-r border-border/80"
            : "-top-1.5 border-l border-t border-border/80",
        ].join(" ")}
        style={{ left: arrowLeft }}
      />

      {/* Image */}
      {slot.occupied && slot.ad && (
        <PreviewHero
          ad={slot.ad}
          number={slot.number}
          heightClass="h-[155px]"
        />
      )}

      {/* Content */}
      <div className="p-4">
        <PreviewBody
          slot={slot}
          history={history}
          onClaim={onClaim}
          onReport={onReport}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile Drawer                                                               */
/* -------------------------------------------------------------------------- */

function MobileDrawer({
  slot,
  history,
  onClose,
  onClaim,
  onReport,
}: {
  slot: SlotSummary;
  history: OwnershipHistoryEntry[] | null;
  onClose: () => void;
  onClaim: () => void;
  onReport: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Spot ${slot.number} details`}
        className={[
          "absolute inset-x-0 bottom-0",
          "max-h-[88vh] overflow-y-auto",
          "rounded-t-[28px]",
          "border-t border-border/80",
          "bg-surface",
          "shadow-[0_-20px_60px_rgba(0,0,0,0.25)]",
          "animate-in slide-in-from-bottom duration-200",
        ].join(" ")}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-surface/95 pt-3 backdrop-blur-xl">
          <div className="mx-auto h-1.5 w-11 rounded-full bg-border-strong" />
        </div>

        {slot.occupied && slot.ad && (
          <div className="mt-3">
            <PreviewHero ad={slot.ad} number={slot.number} heightClass="h-48" />
          </div>
        )}

        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <PreviewBody
            slot={slot}
            history={history}
            onClaim={onClaim}
            onReport={onReport}
          />

          <Button
            type="button"
            onClick={onClose}
            variant="action-outline"
            className="mt-3 py-3"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preview Body                                                                */
/* -------------------------------------------------------------------------- */

function PreviewBody({
  slot,
  history,
  onClaim,
  onReport,
}: {
  slot: SlotSummary;
  history: OwnershipHistoryEntry[] | null;
  onClaim: () => void;
  onReport: () => void;
}) {
  const pastHolders = history ?? [];

  const currentBid = slot.occupied
    ? slot.currentBidCents
    : slot.minimumNextBidCents;

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Current holder                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-start justify-between gap-3">
        {slot.occupied && slot.ad ? (
          <a
            href={slot.ad.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-w-0 items-center gap-3 rounded-lg pr-1 transition-opacity hover:opacity-70"
            title={`Visit ${slot.ad.brandName}`}
          >
            <BrandGlyph
              name={slot.ad.brandName}
              faviconUrl={slot.ad.faviconUrl}
              imageUrl={slot.ad.imageUrl}
            />

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
                  {slot.ad.brandName}
                </p>

                <ArrowUpRightIcon
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="shrink-0 opacity-60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                />
              </div>

              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60" />
                Current holder
              </p>
            </div>
          </a>
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Spot #{slot.number}
            </p>

            <p className="mt-1 text-[17px] font-semibold tracking-tight text-foreground">
              Available space
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Description                                                        */}
      {/* ------------------------------------------------------------------ */}

      {slot.occupied && slot.ad?.description && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">
          {slot.ad.description}
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Bid                                                                 */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-4 border-y border-border/70 py-4">
        <div className="flex items-end justify-between gap-6">
          {/* Current / Starting Bid */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {slot.occupied ? "Current bid" : "Starting bid"}
            </p>

            <p className="mt-1.5 text-[30px] font-bold leading-none tracking-[-0.04em] text-foreground">
              {formatCentsAsUsd(currentBid)}
            </p>
          </div>

          {/* Next Bid */}
          <div className="pb-0.5 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Next bid
            </p>

            <p className="mt-1.5 text-[18px] font-semibold leading-none tracking-[-0.02em] text-foreground">
              {formatCentsAsUsd(slot.minimumNextBidCents)}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Small metadata                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
        {slot.occupied && slot.ownershipStartedAt && (
          <span>
            Held for{" "}
            <span className="font-medium text-foreground">
              {formatDuration(slot.ownershipStartedAt)}
            </span>
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Ownership history                                                   */}
      {/* ------------------------------------------------------------------ */}

      {slot.occupied && pastHolders.length > 0 && (
        <OwnershipHistory holders={pastHolders} slot={slot} />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                 */}
      {/* ------------------------------------------------------------------ */}

      <Button type="button" onClick={onClaim} className="mt-2">
        <span className="flex items-center gap-3">
          {slot.occupied ? `Take This Spot For ${formatCentsAsUsd(slot.minimumNextBidCents)}` : "Claim This Spot"}{ }
        </span>

        <ArrowUpRightIcon
          size={14}
          weight="bold"
          aria-hidden="true"
          className="opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </Button>

      <p className="mt-2 text-center text-[9px] text-muted-foreground">
        {slot.occupied
          ? "Place the next highest bid to take ownership."
          : "Reserve this space and put your brand on the wall."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ownership History                                                           */
/* -------------------------------------------------------------------------- */

function OwnershipHistory({
  holders,
  slot,
}: {
  holders: OwnershipHistoryEntry[];
  slot: SlotSummary;
}) {
  const [showAllHolders, setShowAllHolders] = useState(false);
  const visibleHolders = holders.slice(0, 4);

  return (
    <>
      <div className="mt-5">
        {/* Heading */}
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Who Held It
          </p>

          {holders.length > 1 && (
            <span className="text-[9px] tabular-nums text-muted-foreground">
              {holders.length} {holders.length === 1 ? "holder" : "holders"}
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          {visibleHolders.length > 1 && (
            <div className="absolute bottom-4 left-4 top-4 w-px bg-border/70" />
          )}

          <div>
            {visibleHolders.map((holder, index) => (
              <PreviousHolder
                key={`${holder.brandName}-${holder.startedAt}-${index}`}
                holder={holder}
              />
            ))}
          </div>
        </div>

        {/* More */}
        {holders.length > 4 && (
          <Button
            type="button"
            onClick={() => setShowAllHolders(true)}
            variant="action-outline"
            className="mt-3 mb-3 justify-between px-4 py-3 active:scale-[0.98]"
          >
            <span>View complete holders ledger</span>

            <span className="text-[10px] font-medium tracking-normal text-muted-foreground transition-colors group-hover:text-foreground">
              {holders.length} holders →
            </span>
          </Button>
        )}
      </div>

      {/* All Holders Modal */}
      {showAllHolders && (
        <AllHoldersModal
          holders={holders}
          slot={slot}
          onClose={() => setShowAllHolders(false)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Previous Holder                                                             */
/* -------------------------------------------------------------------------- */

function PreviousHolder({ holder }: { holder: OwnershipHistoryEntry }) {
  const hostname = getHostname(holder.websiteUrl);

  const content = (
    <>
      {/* Brand icon */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
        <BrandGlyph
          name={holder.brandName}
          faviconUrl={holder.faviconUrl}
          imageUrl={holder.imageUrl}
          size="small"
        />
      </div>

      {/* Brand information */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium leading-tight text-foreground">
          {holder.brandName}
        </p>

        {hostname ? (
          <p className="mt-1 truncate text-[10px] leading-none text-muted-foreground">
            {hostname}
          </p>
        ) : (
          <p className="mt-1 text-[10px] leading-none text-muted-foreground">
            Previous holder
          </p>
        )}
      </div>

      {/* Bid + time */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[12px] font-medium tabular-nums text-foreground">
          {formatCentsAsUsd(holder.amountCents)?.toLocaleString() ?? "—"}
        </span>

        {holder.endedAt && (
          <span className="text-[9px] tabular-nums text-muted-foreground">
            For {formatDuration(holder.startedAt, holder.endedAt)}
          </span>
        )}
      </div>
    </>
  );

  if (holder.websiteUrl) {
    return (
      <a
        href={holder.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="
          group flex min-h-[52px] items-center gap-3
          py-2.5 last:border-b-0
        "
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className="
        flex min-h-[52px] items-center gap-3
        py-2.5 last:border-b-0
      "
    >
      {content}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* All Holders Modal                                                           */
/* -------------------------------------------------------------------------- */

function AllHoldersModal({
  holders,
  slot,
  onClose,
}: {
  holders: OwnershipHistoryEntry[];
  slot: SlotSummary;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKey);

    // The wall lives inside a transformed (scaled) viewport, so this dialog is
    // portalled to <body> — otherwise `fixed` would resolve against the scaled
    // world and the header/footer would be clipped off-screen.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[3px] sm:items-center sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close ownership ledger"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      {/* Modal */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ownership-ledger-title"
        className="
          relative z-10
          flex w-full max-w-[520px] flex-col
          overflow-hidden
          rounded-t-[26px]
          border border-border/70
          bg-surface
          shadow-[0_30px_100px_rgba(0,0,0,0.22)]
          sm:rounded-[26px]
          max-h-[calc(100dvh-1.5rem)]
          sm:max-h-[calc(100dvh-2rem)]
        "
      >
        {/* ───────────────── Header ───────────────── */}
        <header className="px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="flex items-start justify-between pr-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Spot #{slot.number}
              </p>

              <h2
                id="ownership-ledger-title"
                className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-foreground"
              >
                Ownership ledger
              </h2>

              <p className="mt-1 max-w-[300px] text-[13px] leading-5 text-muted">
                Every holder and winning bid, newest first.
              </p>
            </div>
          </div>
        </header>

        {/* Close */}
        <Button
          type="button"
          onClick={onClose}
          aria-label="Close ownership ledger"
          variant="ghost"
          size="icon-sm"
          className="absolute right-5 top-5 text-muted-foreground"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 5L15 15M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Button>

        {/* ───────────────── Current holder ───────────────── */}
        {slot.ad && (
          <div className="mx-6 mb-6 sm:mx-7">
            <a
              href={slot.ad.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group
                flex items-center gap-3.5
                border-y border-border/70
                py-4
              "
            >
              {/* Logo */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                <BrandGlyph
                  name={slot.ad.brandName}
                  faviconUrl={slot.ad.faviconUrl}
                  imageUrl={slot.ad.imageUrl}
                />
              </div>

              {/* Holder */}
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                  Current holder
                </p>

                <p className="mt-0.5 truncate text-[14px] font-semibold text-foreground">
                  {slot.ad.brandName}
                  <span className="ml-1 text-muted-foreground/60 transition-colors group-hover:text-primary">
                    ↗
                  </span>
                </p>
              </div>

              {/* Bid */}
              <div className="shrink-0 text-right">
                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Current bid
                </p>

                <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-foreground">
                  {formatCentsAsUsd(slot.currentBidCents)}
                </p>
              </div>
            </a>
          </div>
        )}

        {/* ───────────────── History ───────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 sm:px-7">
          {/* Section heading */}
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">
                Previous holders
              </h3>

              <p className="mt-0.5 text-[11px] text-muted">
                {holders.length}{" "}
                {holders.length === 1 ? "brand has" : "brands have"} held this
                spot.
              </p>
            </div>

            <span className="text-[10px] tabular-nums text-muted-foreground">
              {holders.length} total
            </span>
          </div>

          {/* Holder list */}
          <ol className="divide-y divide-border/60">
            {holders.map((holder, index) => (
              <LedgerHolderRow
                key={`${holder.brandName}-${holder.startedAt}-${index}`}
                holder={holder}
                index={index}
              />
            ))}
          </ol>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function LedgerHolderRow({
  holder,
  index,
}: {
  holder: OwnershipHistoryEntry;
  index: number;
}) {
  const hostname = getHostname(holder.websiteUrl);

  const row = (
    <>
      {/* Number */}
      <span
        className="
          w-5 shrink-0
          text-[9px]
          font-medium
          tabular-nums
          text-muted-foreground/60
        "
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Logo */}
      <span
        className="
          flex h-9 w-9 shrink-0
          items-center justify-center
        "
      >
        <BrandGlyph
          name={holder.brandName}
          faviconUrl={holder.faviconUrl}
          imageUrl={holder.imageUrl}
        />
      </span>

      {/* Brand details */}
      <span className="min-w-0 flex-1">
        <span
          className="
            block truncate
            text-[13px]
            font-semibold
            text-foreground
            transition-colors duration-150
            group-hover:text-primary
          "
        >
          {holder.brandName}
        </span>

        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
          {hostname && (
            <>
              <span className="max-w-[110px] truncate">{hostname}</span>
              <span className="text-border">·</span>
            </>
          )}

          <span className="shrink-0">{formatLedgerDate(holder.startedAt)}</span>
        </span>

        <span className="mt-1 block text-[10px] text-muted-foreground">
          {holder.endedAt
            ? `${formatDuration(holder.startedAt, holder.endedAt)} held`
            : "Former holder"}
        </span>
      </span>

      {/* Bid */}
      <span className="shrink-0 text-right">
        <span className="block text-[14px] font-semibold tabular-nums text-foreground">
          {formatCentsAsUsd(holder.amountCents)}
        </span>

        {holder.websiteUrl && (
          <span
            className="
              mt-1 block
              text-[10px]
              text-muted-foreground/50
              transition-colors
              group-hover:text-primary
            "
          >
            ↗
          </span>
        )}
      </span>
    </>
  );

  if (holder.websiteUrl) {
    return (
      <li>
        <a
          href={holder.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            group
            flex min-h-[82px]
            items-center gap-2.5
            py-3.5
          "
        >
          {row}
        </a>
      </li>
    );
  }

  return (
    <li>
      <div className="flex min-h-[82px] items-center gap-2.5 py-3.5">{row}</div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatLedgerDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getHostname(url: string | null | undefined) {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
