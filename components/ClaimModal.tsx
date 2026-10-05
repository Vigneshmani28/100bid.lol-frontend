"use client";

import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatCentsAsUsd } from "@/lib/money";
import type { BidPreparation, PaymentCreation, SlotSummary } from "@/lib/types";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyDollarSimpleIcon } from "@phosphor-icons/react";
import { AgreementCheckbox } from "./AgreementCheckbox";
import { WallCellPreview } from "./WallCellPreview";

type Step = "url" | "details" | "payment" | "success" | "outraced";

// Manual image upload is disabled for now — brand images come from the
// automatic favicon/og:image fetch or a pasted URL. Flip this back on to
// restore the "Upload image" button without touching the underlying
// upload state/handler, which stay wired up below.
const SHOW_IMAGE_UPLOAD = false;

interface ClaimModalProps {
  slot: SlotSummary;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClaimModal({ slot, onClose, onSuccess }: ClaimModalProps) {
  const [step, setStep] = useState<Step>("url");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const minDollars = slot.minimumNextBidCents / 100;
  // Held as the raw string the user typed, not a number: a numeric state
  // would turn an emptied field into 0, leaving a "0" that has to be
  // manually selected or cursored past before a new amount can be typed.
  const [bidInput, setBidInput] = useState(String(minDollars));
  const bidDollars = bidInput === "" ? Number.NaN : Number(bidInput);
  const [bidPreparation, setBidPreparation] = useState<BidPreparation | null>(
    null,
  );
  const [payment, setPayment] = useState<PaymentCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Distinct from `error`: a non-blocking heads-up shown on the details step
  // when we moved the user forward without metadata.
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Drives the reservation countdown on the payment step — re-synced to the
  // real clock the moment we land on that step, then ticked every second.
  const [now, setNow] = useState(() => Date.now());

  const title = slot.occupied
    ? `Take this spot #${slot.number}`
    : `Claim spot #${slot.number}`;

  // Seat-booking hold: the backend gives us bidPreparation.expiresAt — the
  // exact moment this reservation releases back to everyone else. Tick a
  // visible countdown so the user knows how long they have to pay, and lock
  // out the pay actions once it hits zero rather than letting them submit a
  // request the server will reject anyway.
  useEffect(() => {
    if (step !== "payment" || !bidPreparation) return;
    const sync = () => setNow(Date.now());
    // Deferred (not called synchronously in the effect body) so the first
    // sync still lands essentially immediately without triggering a
    // cascading render during this effect's commit.
    const syncTimeout = setTimeout(sync, 0);
    const id = setInterval(sync, 1000);
    return () => {
      clearTimeout(syncTimeout);
      clearInterval(id);
    };
  }, [step, bidPreparation]);

  const remainingMs = bidPreparation
    ? Math.max(0, new Date(bidPreparation.expiresAt).getTime() - now)
    : 0;
  const reservationExpired =
    step === "payment" && !!bidPreparation && remainingMs <= 0;
  // Only ever set on a live payment step — see `requestClose`.
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Backdrop click, the X button, and Escape all funnel through Modal's
  // single onClose prop. If we're mid-checkout, closing out is the user
  // cancelling their reservation — release the hold immediately instead of
  // making the next bidder wait out the full timer. Best-effort: if this
  // fails, the reservation still self-releases once it expires.
  function handleClose() {
    if (step === "payment" && bidPreparation) {
      void api.cancelBid(bidPreparation.bidId).catch(() => { });
    }
    onClose();
  }

  /**
   * What the X, Escape, backdrop click, and the Cancel button all go through.
   * While a live reservation is being paid for, dismissing the modal throws
   * away a held spot — worth one question first. Once the hold has expired
   * (or nothing is reserved yet) there's nothing to lose, so closing stays
   * immediate.
   */
  function requestClose() {
    if (step === "payment" && bidPreparation && !reservationExpired && !busy) {
      setConfirmingCancel(true);
      return;
    }
    handleClose();
  }

  // The reservation window ran out before payment was completed — the hold
  // is already gone server-side. Send the user back to review their details
  // (someone may have taken the spot, or the minimum bid may have moved) so
  // "Continue to payment" can request a fresh reservation.
  function handleStartOver() {
    setBidPreparation(null);
    setPayment(null);
    setAgreementAccepted(false);
    setError(
      "Your reservation window ran out, so this hold was released. Please review your bid and continue again.",
    );
    setStep("details");
  }

  // The cell preview shows the amount that will sit on the wall, so it tracks
  // the bid field live. A cleared or nonsense field falls back to the minimum
  // rather than flashing "$0" mid-edit — the real bid can never be lower.
  const previewBidCents =
    Number.isFinite(bidDollars) && bidDollars > 0
      ? bidDollars * 100
      : slot.minimumNextBidCents;

  /** Digits only, and no leading zeros to left-pad what the user typed. */
  function handleBidChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBidInput(e.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, ""));
  }

  async function handlePreview() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const metadata = await api.previewMetadata(websiteUrl);
      setBrandName(metadata.brandName);
      setImageUrl(metadata.imageUrl ?? "");
      setDescription(metadata.description ?? "");
    } catch {
      // A site we can't read is not a dead end — every field it would have
      // filled is editable by hand, and the bid itself only needs the URL. So
      // move the user forward with a name guessed from the domain and say what
      // happened, rather than stranding them on the URL step behind an error.
      setBrandName(brandNameFromUrl(websiteUrl));
      setImageUrl("");
      setDescription("");
      setNotice(
        "We couldn't read the details from that site, so nothing was filled in for you. Add your name, image, and description below — everything else works exactly the same.",
      );
    } finally {
      setBusy(false);
    }
    setStep("details");
  }

  async function handleContinueToPayment() {
    setError(null);
    setConfirmingCancel(false);
    if (!brandName.trim()) {
      setError("Enter a display name for your brand.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!Number.isInteger(bidDollars) || bidDollars < minDollars) {
      setError(
        `Your bid must be at least ${formatCentsAsUsd(minDollars * 100)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      const prepared = await api.prepareBid({
        slotNumber: slot.number,
        websiteUrl,
        email,
        bidDollars,
        brandName,
        description,
        imageUrl,
      });
      setBidPreparation(prepared);
      const paymentCreation = await api.createPayment(prepared.bidId);
      setPayment(paymentCreation);
      setStep("payment");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not prepare your bid.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so choosing the same file again still fires onChange
    if (!file) return;
    setUploadError(null);
    setUploadBusy(true);
    try {
      const { url } = await api.uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not upload that image.",
      );
    } finally {
      setUploadBusy(false);
    }
  }

  // The countdown hitting zero already disables the pay buttons, but this
  // guards the handler itself in case a click was already in flight — the
  // server would reject it as BID_EXPIRED anyway, so fail the same way
  // locally without the round trip.
  // Real providers (Dodo) hand back a hosted checkout URL to send the browser
  // to. The mock provider doesn't, and keeps the in-modal buttons below.
  const checkoutUrl =
    payment && typeof payment.checkout === "object" && payment.checkout !== null
      ? ((payment.checkout as { checkoutUrl?: unknown }).checkoutUrl as
        string | undefined)
      : undefined;

  function handleHostedCheckout() {
    if (!checkoutUrl) return;
    setBusy(true);
    // Full navigation, not a new tab: the reservation countdown lives on this
    // page, and Dodo returns the customer here via return_url when they're
    // done. A popup would leave a stale, still-counting modal behind it.
    window.location.href = checkoutUrl;
  }

  async function handlePay(outcome: "success" | "failure") {
    if (!payment || reservationExpired) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.completeMockPayment(
        payment.providerOrderId,
        outcome,
      );
      if (outcome === "failure" || !result.won) {
        setStep(
          result.won === false && outcome === "success" ? "outraced" : "url",
        );
        if (outcome === "failure")
          setError("Payment failed. You can try again.");
        setBusy(false);
        return;
      }
      setStep("success");
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Payment could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal titleId="claim-modal-title" title={title} onClose={requestClose}>
      {error && (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {step === "url" && (
        <div className="space-y-3 p-1">
          <p className="text-sm text-muted">
            Enter your brand&apos;s website. We&apos;ll pull your name,
            description, and image automatically.
          </p>
          <div className="block">
            <Label htmlFor="claim-website-url">Website URL</Label>
            <Input
              id="claim-website-url"
              type="text"
              inputMode="url"
              autoFocus
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbrand.com"
            />
          </div>
          <Button
            type="button"
            disabled={busy || !websiteUrl.trim()}
            onClick={handlePreview}
          >
            {busy ? "Checking…" : "Preview brand"}
          </Button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          {notice && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs leading-5 text-muted">
              {notice}
            </p>
          )}
          <div className="flex gap-4">
            <div className="flex-1 space-y-3 p-1">
              <div className="block">
                <Label htmlFor="claim-brand-name">Display name</Label>
                <Input
                  id="claim-brand-name"
                  type="text"
                  autoFocus
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  maxLength={120}
                  placeholder="Your brand name"
                />
              </div>
              <div className="block">
                <Label htmlFor="claim-image-url">Image URL</Label>
                <Input
                  id="claim-image-url"
                  type="text"
                  inputMode="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={2048}
                  placeholder="https://yourbrand.com/logo.png"
                />
                {SHOW_IMAGE_UPLOAD && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground">
                      {uploadBusy ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        disabled={uploadBusy}
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      or paste a URL above
                    </span>
                  </div>
                )}
                {SHOW_IMAGE_UPLOAD && uploadError && (
                  <span className="mt-1 block text-xs text-danger">
                    {uploadError}
                  </span>
                )}
                <span className="mt-1 block text-xs text-muted-foreground">
                  Fills your spot&apos;s cell on the wall.
                </span>
              </div>
              <div className="block">
                <Label htmlFor="claim-description">Description</Label>
                <Textarea
                  id="claim-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="A short line about your brand"
                />
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-col items-center gap-1.5 pt-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Your cell #{slot.number}
              </span>
              <WallCellPreview
                number={slot.number}
                bidAmount={formatCentsAsUsd(previewBidCents)}
                brandName={brandName}
                imageUrl={imageUrl}
              />
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                How it looks after checkout
              </span>
            </div>
          </div>

          <div className="block p-1">
            <Label htmlFor="claim-email">Email address</Label>
            <Input
              id="claim-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbrand.com"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Used for your receipt and a private link to manage this spot.
            </span>
          </div>

          <div className="space-y-2 p-1">
            <Label htmlFor="claim-bid">
              Your bid{" "}
              <span className="text-muted-foreground">
                (minimum {formatCentsAsUsd(minDollars * 100)})
              </span>
            </Label>

            <div className="relative">
              <CurrencyDollarSimpleIcon
                size={18}
                weight="regular"
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                id="claim-bid"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={9}
                value={bidInput}
                onChange={handleBidChange}
                placeholder={String(minDollars)}
                className="h-11 pl-10 pr-3 text-2xl font-semibold shadow-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setStep("url");
                setAgreementAccepted(false);
              }}
              variant="action-outline"
              size="action-auto"
            >
              Back
            </Button>

            <Button
              type="button"
              disabled={busy}
              onClick={handleContinueToPayment}
              className={[
                "relative flex-1",
                "px-6 py-4",
                "text-xs font-mono font-bold uppercase tracking-[0.12em]",
                "bg-primary",
                "text-primary-foreground",
                "hover:bg-primary/85",
                "active:scale-[0.96]",
                "transition-all duration-150 ease-in-out",
                "flex items-center justify-center gap-4",
                "group",
              ].join(" ")}
            >
              {busy ? "Preparing…" : "Continue to payment"}
            </Button>
          </div>
        </div>
      )}

      {step === "payment" &&
        bidPreparation &&
        payment &&
        (!confirmingCancel || reservationExpired) && (
          <div className="space-y-4">
            <div
              className={[
                "flex items-center justify-between rounded-lg border px-3 py-2",
                reservationExpired
                  ? "border-danger/40 bg-danger/10"
                  : remainingMs <= 60_000
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-background",
              ].join(" ")}
            >
              <span
                className={[
                  "text-xs font-medium",
                  reservationExpired || remainingMs <= 60_000
                    ? "text-danger"
                    : "text-muted",
                ].join(" ")}
              >
                {reservationExpired
                  ? "Reservation expired"
                  : "This spot is held for you"}
              </span>
              <span
                className={[
                  "font-mono text-sm font-semibold tabular-nums",
                  reservationExpired || remainingMs <= 60_000
                    ? "text-danger"
                    : "text-foreground",
                ].join(" ")}
                aria-live="polite"
              >
                {formatCountdown(remainingMs)}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                You&apos;re paying
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {bidPreparation.amountDisplay}
              </p>
              <p className="mt-1 text-xs text-muted">
                {bidPreparation.advertisement.brandName} · Spot #
                {bidPreparation.slotNumber}
              </p>
            </div>

            <AgreementCheckbox
              checked={agreementAccepted}
              onCheckedChange={setAgreementAccepted}
            />

            {reservationExpired ? (
              <>
                <p className="text-xs text-muted">
                  Your 5-minute hold ran out before payment completed, so this
                  spot was released back to everyone else. No charge was made.
                </p>
                <Button type="button" onClick={handleStartOver}>
                  Start over
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted">
                  {checkoutUrl
                    ? `You'll be taken to ${payment.provider === "dodo" ? "Dodo Payments" : payment.provider} to pay securely, then brought straight back here.`
                    : `This is a simulated checkout (${payment.provider} provider). No real money moves in development mode.`}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmingCancel(true)}
                    variant="action-outline"
                    size="action-auto"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    disabled={busy || !agreementAccepted}
                    onClick={
                      checkoutUrl
                        ? handleHostedCheckout
                        : () => handlePay("success")
                    }
                    className={[
                      "relative flex-1",
                      "px-6 py-4",
                      "text-xs font-mono font-bold uppercase tracking-[0.12em]",
                      "bg-primary",
                      "text-primary-foreground",
                      "hover:bg-primary/85",
                      "active:scale-[0.96]",
                      "transition-all duration-150 ease-in-out",
                      "flex items-center justify-center gap-4",
                      "group",
                    ].join(" ")}
                  >
                    {busy
                      ? checkoutUrl
                        ? "Redirecting…"
                        : "Processing…"
                      : `Pay ${bidPreparation.amountDisplay}`}
                  </Button>
                </div>
                {!checkoutUrl && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => handlePay("failure")}
                    variant="link"
                    size="sm"
                    className="w-full text-muted-foreground"
                  >
                    Simulate a failed payment (dev)
                  </Button>
                )}
              </>
            )}
          </div>
        )}

      {step === "payment" && confirmingCancel && !reservationExpired && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Give up spot #{slot.number}?
          </p>
          <p className="text-sm text-muted">
            The spot isn&apos;t yours until this payment goes through. Leaving
            now releases the hold straight away, so anyone else can claim it —
            and you&apos;d have to start over at whatever the bid has climbed to
            by then.
          </p>
          <p className="text-xs text-muted-foreground">
            You still have {formatCountdown(remainingMs)} left on this hold.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              autoFocus
              onClick={() => setConfirmingCancel(false)}
              className={[
                "relative flex-1",
                "px-6 py-4",
                "text-xs font-mono font-bold uppercase tracking-[0.12em]",
                "bg-primary",
                "text-primary-foreground",
                "hover:bg-primary/85",
                "active:scale-[0.96]",
                "transition-all duration-150 ease-in-out",
                "flex items-center justify-center gap-4",
                "group",
              ].join(" ")}
            >
              Keep my spot
            </Button>

            <Button
              type="button"
              onClick={handleClose}
              variant="action-outline"
              size="action-auto"
            >
              Yes, leave
            </Button>
          </div>
        </div>
      )}

      {step === "outraced" && (
        <div className="space-y-3 text-sm text-muted">
          <p className="text-foreground">
            Someone else&apos;s bid was confirmed first — this spot moved on
            before your payment went through.
          </p>
          <p>
            All sales are final, so this payment isn&apos;t refunded
            automatically. Reach out if you need help.
          </p>
          <Button
            type="button"
            onClick={onClose}
            variant="pill-outline"
            className="w-full text-foreground"
          >
            Close
          </Button>
        </div>
      )}

      {step === "success" && bidPreparation && (
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-2xl">
            🎉
          </div>
          <p className="text-base font-semibold text-foreground">
            Your brand is now live
          </p>
          <p className="text-sm text-muted">
            {bidPreparation.advertisement.brandName} now holds spot #
            {bidPreparation.slotNumber} at {bidPreparation.amountDisplay}.
          </p>
          <p className="text-xs text-muted-foreground">
            We&apos;ve emailed a private management link to {email}. Use it any
            time to update this spot.
          </p>
          <Button type="button" onClick={onClose}>
            View on wall
          </Button>
        </div>
      )}
    </Modal>
  );
}

/** Renders milliseconds remaining as "m:ss", e.g. 4:32, floored at 0:00. */
function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A reasonable display name to start from when a site's metadata couldn't be
 * read: "https://acme-corp.com/pricing" -> "Acme Corp". Returns "" for input
 * too malformed to parse, which just leaves the field empty.
 */
function brandNameFromUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const label =
      new URL(withScheme).hostname.replace(/^www\./, "").split(".")[0] ?? "";
    return label
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "";
  }
}

