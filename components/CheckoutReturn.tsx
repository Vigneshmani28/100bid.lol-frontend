"use client";

import { useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CheckIcon,
  ConfettiIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api, ApiRequestError } from "@/lib/api";
import { formatCentsAsUsd } from "@/lib/money";
import type { BidStatus } from "@/lib/types";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/button";

// The webhook that actually confirms a payment races the browser redirect,
// and usually loses it — the customer is often back here before Dodo has
// called us. So poll rather than reading the redirect's own status param,
// which is unverified and must never be trusted to award a spot.
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45_000;
// Past this, say so. A wait that silently runs longer than promised reads as
// broken even when it is fine.
const SLOW_AFTER_MS = 12_000;

type Outcome =
  | { kind: "waiting" }
  | { kind: "won"; bid: BidStatus }
  | { kind: "outraced"; bid: BidStatus }
  | { kind: "failed"; bid: BidStatus }
  | { kind: "cancelled"; bid: BidStatus }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

/**
 * Resolves what happened to a bid after the customer returns from a hosted
 * checkout. Mounted when the URL carries `?bid=<id>` — the `return_url` we
 * hand the payment provider.
 *
 * This component only ever *reports* an outcome. Ownership is decided
 * server-side by the verified webhook; if the customer closes the tab before
 * landing here, the spot is still awarded correctly and the confirmation
 * email still goes out.
 */
export function CheckoutReturn({
  bidId,
  cancelled,
  onResolved,
  onBidAgain,
}: {
  bidId: string;
  /**
   * True when this mount came from the provider's cancel_url (an explicit
   * back-out from hosted checkout) rather than return_url. No payment was
   * ever attempted in that case, so there's nothing to poll for — we look
   * the bid up once, just to hand back its slot number, and go straight to
   * the cancelled screen instead of the "confirming" wait.
   */
  cancelled?: boolean;
  onResolved: () => void;
  /** Reopens the claim flow on a spot — offered when a bid didn't land. */
  onBidAgain: (slotNumber: number) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "waiting" });
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ticker = setInterval(() => {
      if (active) setElapsedMs(Date.now() - startedAt);
    }, 1000);

    async function poll() {
      if (!active) return;
      try {
        const bid = await api.getBid(bidId);

        if (bid.status === "PAID") {
          if (!active) return;
          if (bid.holdsSlot) {
            setOutcome({ kind: "won", bid });
          } else {
            setOutcome({ kind: "outraced", bid });
          }
          return;
        }

        if (
          bid.status === "FAILED" ||
          bid.status === "CANCELLED" ||
          bid.status === "EXPIRED"
        ) {
          if (!active) return;
          setOutcome({ kind: "failed", bid });
          return;
        }

        // Customer explicitly backed out — the payment provider never took a
        // payment attempt, so there's no status left to arrive. One lookup
        // is enough to get the slot number for "try again"; skip polling.
        if (cancelled) {
          if (!active) return;
          setOutcome({ kind: "cancelled", bid });
          return;
        }
      } catch (err) {
        if (!active) return;
        setOutcome({
          kind: "error",
          message:
            err instanceof ApiRequestError
              ? err.message
              : "Could not check your payment status.",
        });
        return;
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        if (active) setOutcome({ kind: "timeout" });
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      active = false;
      clearInterval(ticker);
      if (timer) clearTimeout(timer);
    };
  }, [bidId, cancelled]);

  return (
    <Modal
      titleId="checkout-return-title"
      title={titleFor(outcome)}
      onClose={onResolved}
    >
      {outcome.kind === "waiting" && <Waiting elapsedMs={elapsedMs} />}

      {outcome.kind === "won" && (
        <Won bid={outcome.bid} onResolved={onResolved} />
      )}

      {outcome.kind === "outraced" && (
        <Setback
          heading={`Spot #${outcome.bid.slotNumber} went to someone else`}
          body="Your payment went through, but another bid was confirmed first — the spot moved on before yours landed."
          note="All sales are final, so this isn't refunded automatically. Reach out and we'll sort it out."
          bid={outcome.bid}
          onResolved={onResolved}
          onBidAgain={onBidAgain}
          retryLabel="Bid on it again"
        />
      )}

      {outcome.kind === "failed" && (
        <Setback
          heading={`Spot #${outcome.bid.slotNumber} is still open`}
          body="The payment didn't go through, so nothing was charged and the spot never changed hands."
          note="You can pick up right where you left off."
          bid={outcome.bid}
          onResolved={onResolved}
          onBidAgain={onBidAgain}
          retryLabel="Try again"
        />
      )}

      {outcome.kind === "cancelled" && (
        <Setback
          heading={`Spot #${outcome.bid.slotNumber} is still open`}
          body="You backed out of checkout before paying, so nothing was charged."
          note="You can pick up right where you left off."
          bid={outcome.bid}
          onResolved={onResolved}
          onBidAgain={onBidAgain}
          retryLabel="Try again"
        />
      )}

      {outcome.kind === "timeout" && (
        <Message
          tone="neutral"
          heading="Still confirming"
          body="Your payment is taking longer to confirm than usual — some payment methods do."
          note="Nothing is lost. If it succeeds the spot becomes yours, and the management link lands in your inbox."
          onResolved={onResolved}
        />
      )}

      {outcome.kind === "error" && (
        <Message
          tone="danger"
          heading="Couldn't check your payment"
          body={outcome.message}
          note="Your payment isn't affected by this — it's only our status check that failed."
          onResolved={onResolved}
        />
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Waiting                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A three-step tracker rather than a bare spinner. A spinner says "something
 * is happening"; this says *what*, which is what makes a wait tolerable. The
 * steps are honest about what we actually know: the customer finished the
 * hosted checkout, we're waiting on the provider's webhook, and the spot
 * flips only once that lands.
 */
function Waiting({ elapsedMs }: { elapsedMs: number }) {
  const steps = [
    { label: "Payment submitted", state: "done" as const },
    { label: "Confirming with the payment provider", state: "active" as const },
    { label: "Your spot goes live", state: "pending" as const },
  ];

  return (
    <div className="space-y-5">
      <ol className="space-y-3.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {step.state === "done" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckIcon size={11} weight="bold" aria-hidden="true" />
                </span>
              )}
              {step.state === "active" && (
                <span className="animate-step h-2.5 w-2.5 rounded-full bg-primary" />
              )}
              {step.state === "pending" && (
                <span className="h-2 w-2 rounded-full bg-border-strong" />
              )}
            </span>

            <span
              className={[
                "text-sm",
                step.state === "pending"
                  ? "text-muted-foreground"
                  : "text-foreground",
              ].join(" ")}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {elapsedMs > SLOW_AFTER_MS
          ? "Taking longer than usual — some payment methods confirm more slowly. You can safely leave this page; the spot is still awarded either way, and we'll email your management link."
          : "You can safely leave this page — if the payment goes through, the spot is yours and we'll email you a link to manage it."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Won                                                                         */
/* -------------------------------------------------------------------------- */

// Fixed pieces rather than randomised ones: a deterministic burst renders the
// same on the server and the client, and reads as designed instead of noisy.
const CONFETTI = [
  { x: "-96px", spin: "-320deg", delay: "0ms", tone: "bg-primary" },
  { x: "-64px", spin: "240deg", delay: "90ms", tone: "bg-success" },
  { x: "-38px", spin: "-180deg", delay: "30ms", tone: "bg-primary/70" },
  { x: "-14px", spin: "300deg", delay: "150ms", tone: "bg-foreground/70" },
  { x: "12px", spin: "-260deg", delay: "60ms", tone: "bg-primary" },
  { x: "40px", spin: "200deg", delay: "180ms", tone: "bg-success" },
  { x: "68px", spin: "-340deg", delay: "20ms", tone: "bg-primary/70" },
  { x: "100px", spin: "280deg", delay: "120ms", tone: "bg-foreground/70" },
  { x: "-78px", spin: "160deg", delay: "220ms", tone: "bg-primary" },
  { x: "56px", spin: "-220deg", delay: "260ms", tone: "bg-primary/70" },
];

function Won({ bid, onResolved }: { bid: BidStatus; onResolved: () => void }) {
  return (
    <div className="relative">
      {/* Confetti sits behind the content and ignores pointer events, so it
          can never intercept the button underneath it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center overflow-hidden"
      >
        {CONFETTI.map((piece, i) => (
          <span
            key={i}
            className={`animate-confetti absolute h-1.5 w-1.5 rounded-[1px] ${piece.tone}`}
            style={
              {
                "--confetti-x": piece.x,
                "--confetti-spin": piece.spin,
                animationDelay: piece.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative space-y-5 text-center">
        <div className="flex justify-center pt-2">
          <span className="animate-seal flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ConfettiIcon size={26} weight="fill" aria-hidden="true" />
          </span>
        </div>

        <div className="animate-rise" style={{ animationDelay: "120ms" }}>
          <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            Spot #{bid.slotNumber} is yours
          </p>
          <p className="mt-1 text-sm text-muted">
            {bid.brandName} is live on the wall.
          </p>
        </div>

        <div
          className="animate-rise space-y-4"
          style={{ animationDelay: "280ms" }}
        >
          <div className="border border-border bg-surface px-4 py-3 text-left">
            <p className="text-xs font-semibold text-foreground">
              Check your email
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              We&apos;ve sent a private link to manage this spot. If you don&apos;t
              see it in your inbox, check your <strong className="font-medium text-foreground">spam or promotions</strong> folder.
            </p>
          </div>

          <Button type="button" onClick={onResolved}>
            <span>See it on the wall</span>
            <ArrowRightIcon size={14} weight="bold" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Setbacks                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The didn't-win screens. Both end in something the customer can actually
 * do — a dead end offering only "close" is what made these feel flat.
 */
function Setback({
  heading,
  body,
  note,
  bid,
  onResolved,
  onBidAgain,
  retryLabel,
}: {
  heading: string;
  body: string;
  note: string;
  bid: BidStatus;
  onResolved: () => void;
  onBidAgain: (slotNumber: number) => void;
  retryLabel: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-muted">
          <WarningIcon size={17} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => onBidAgain(bid.slotNumber)}
          className="flex-1"
        >
          <span>{retryLabel}</span>
          <ArrowClockwiseIcon size={14} weight="bold" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          onClick={onResolved}
          variant="action-outline"
          size="action-auto"
        >
          Back
        </Button>
      </div>
    </div>
  );
}

/** The outcomes with no spot attached, so nothing to retry. */
function Message({
  tone,
  heading,
  body,
  note,
  onResolved,
}: {
  tone: "neutral" | "danger";
  heading: string;
  body: string;
  note: string;
  onResolved: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <span
          className={[
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "danger"
              ? "bg-danger/10 text-danger"
              : "bg-surface-hover text-muted",
          ].join(" ")}
        >
          <WarningIcon size={17} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>

      <Button type="button" onClick={onResolved}>
        Back to the wall
      </Button>
    </div>
  );
}

function titleFor(outcome: Outcome) {
  switch (outcome.kind) {
    case "won":
      return "Congratulations";
    case "outraced":
      return "Someone got there first";
    case "failed":
      return "Payment didn't go through";
    case "cancelled":
      return "Checkout cancelled";
    case "timeout":
      return "Still confirming";
    case "error":
      return "Couldn't check your payment";
    default:
      return "Confirming your payment";
  }
}
