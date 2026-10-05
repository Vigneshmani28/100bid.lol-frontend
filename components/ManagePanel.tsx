"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api, ApiRequestError } from "@/lib/api";
import type { ManageData } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { WallCellPreview } from "./WallCellPreview";

interface ManagePanelProps {
  token: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Live on the wall",
    className: "bg-success/15 text-success",
  },
  PENDING: { label: "Pending", className: "bg-muted-foreground/15 text-muted" },
  FLAGGED: { label: "Under review", className: "bg-danger/15 text-danger" },
  REJECTED: {
    label: "Removed by moderation",
    className: "bg-danger/15 text-danger",
  },
};

export function ManagePanel({ token }: ManagePanelProps) {
  const [data, setData] = useState<ManageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit form state — kept separate from `data` so the two "refresh from
  // site" and "save my own edits" actions can't stomp on each other, and so
  // in-progress edits survive a background refresh of `data`.
  const [editBrandName, setEditBrandName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const editInitialized = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getManage(token)
      .then((manageData) => {
        if (!cancelled) {
          setData(manageData);
          setError(null);
          if (!editInitialized.current) {
            editInitialized.current = true;
            setEditBrandName(manageData.advertisement?.brandName ?? "");
            setEditDescription(manageData.advertisement?.description ?? "");
            setEditImageUrl(manageData.advertisement?.imageUrl ?? "");
          }
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiRequestError
            ? friendlyManageError(err.code, err.message)
            : "Could not load this spot. Try again in a moment.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleRefreshMetadata() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const updated = await api.refreshManageMetadata(token);
      setData((cur) =>
        cur
          ? {
            ...cur,
            advertisement: cur.advertisement
              ? {
                ...cur.advertisement,
                brandName: updated.brandName,
                description: updated.description,
                imageUrl: updated.imageUrl,
                faviconUrl: updated.faviconUrl,
                websiteUrl: updated.websiteUrl,
              }
              : cur.advertisement,
          }
          : cur,
      );
      setRefreshedAt(Date.now());
      // A fresh scrape is the one case where overwriting the edit form makes
      // sense — the whole point of "Refresh now" is to pull in the latest.
      setEditBrandName(updated.brandName);
      setEditDescription(updated.description ?? "");
      setEditImageUrl(updated.imageUrl ?? "");
    } catch (err) {
      setRefreshError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not refresh your brand details.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSaveEdits() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateManageAdvertisement(token, {
        brandName: editBrandName,
        description: editDescription,
        imageUrl: editImageUrl,
      });
      setData((cur) =>
        cur
          ? {
            ...cur,
            advertisement: cur.advertisement
              ? {
                ...cur.advertisement,
                brandName: updated.brandName,
                description: updated.description,
                imageUrl: updated.imageUrl,
                faviconUrl: updated.faviconUrl,
                websiteUrl: updated.websiteUrl,
              }
              : cur.advertisement,
          }
          : cur,
      );
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not save your changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing to do, link is still visible in the address bar.
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Manage your spot
      </h1>
      <p className="mt-1 text-sm text-muted">
        This private link is the only way to manage your spot. Keep it safe —
        anyone with it can act on your behalf.
      </p>

      {loading && (
        <div role="status" aria-live="polite" className="mt-8 space-y-3">
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="h-32 animate-pulse rounded-lg border border-border bg-surface" />
          <span className="sr-only">Loading your spot…</span>
        </div>
      )}

      {!loading && error && (
        <div className="mt-8 rounded-lg border border-danger/40 bg-surface p-4 text-sm text-danger">
          <p>{error}</p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Back to the wall
          </Link>
        </div>
      )}

      {!loading && !error && data && (
        <div className="mt-8 space-y-4">
          {!data.isCurrentOwner && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-muted">
              <p className="font-medium text-foreground">
                This spot has since been outbid
              </p>
              <p className="mt-1">
                Spot #{data.slotNumber} is now held by someone else, so this
                listing no longer appears on the wall. You can still view and
                edit it below — your changes stay attached to your part of
                this spot&apos;s history, and if you win the spot again they&apos;ll
                pick up right where you left them.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border-strong bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BrandGlyph
                  name={
                    data.advertisement?.brandName ?? `Spot ${data.slotNumber}`
                  }
                  imageUrl={data.advertisement?.imageUrl ?? null}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {data.advertisement?.brandName ??
                      `Spot #${data.slotNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Spot #{data.slotNumber}
                  </p>
                </div>
              </div>
              {data.advertisement && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_LABEL[data.advertisement.status]?.className ??
                    "bg-muted-foreground/15 text-muted"
                    }`}
                >
                  {STATUS_LABEL[data.advertisement.status]?.label ??
                    data.advertisement.status}
                </span>
              )}
            </div>

            {data.advertisement?.description && (
              <p className="mt-3 text-sm text-muted">
                {data.advertisement.description}
              </p>
            )}

            {data.advertisement?.websiteUrl && (
              <a
                href={data.advertisement.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block truncate text-xs text-primary hover:underline"
              >
                {data.advertisement.websiteUrl}
              </a>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {data.isCurrentOwner ? "Current bid" : "Your bid"}
                </dt>
                <dd className="font-medium text-foreground">
                  {data.isCurrentOwner
                    ? data.currentBidDisplay
                    : data.yourBidDisplay}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {data.isCurrentOwner ? "Held since" : "Held until"}
                </dt>
                <dd className="font-medium text-foreground">
                  {formatManageDate(
                    data.isCurrentOwner
                      ? data.ownershipStartedAt
                      : data.ownershipEndedAt,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {data.advertisement && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-foreground">
                Edit your listing
              </h2>
              <p className="mt-1 text-xs text-muted">
                {data.isCurrentOwner
                  ? "Change what shows on the wall for this spot."
                  : "Change what shows for your part of this spot's history."}
              </p>

              <div className="mt-3 flex gap-4">
                <div className="flex-1 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Display name
                    </span>
                    <input
                      type="text"
                      value={editBrandName}
                      onChange={(e) => setEditBrandName(e.target.value)}
                      maxLength={120}
                      placeholder="Your brand name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Image URL
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      maxLength={2048}
                      placeholder="https://yourbrand.com/logo.png"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Description
                    </span>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="A short line about your brand"
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-shrink-0 flex-col items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Spot #{data.slotNumber}
                  </span>
                  <WallCellPreview
                    number={data.slotNumber}
                    bidAmount={
                      data.isCurrentOwner
                        ? data.currentBidDisplay
                        : data.yourBidDisplay
                    }
                    brandName={editBrandName}
                    imageUrl={editImageUrl}
                  />
                  <span className="text-center text-[10px] leading-tight text-muted-foreground">
                    {data.isCurrentOwner
                      ? "How it looks on the wall"
                      : "How it looked while you held it"}
                  </span>
                </div>
              </div>

              {saveError && (
                <p className="mt-2 text-xs text-danger">{saveError}</p>
              )}
              {savedAt && !saveError && (
                <p className="mt-2 text-xs text-success">Changes saved.</p>
              )}

              <Button
                type="button"
                disabled={saving || !editBrandName.trim()}
                onClick={handleSaveEdits}
                size="sm"
                className="mt-3"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Refresh brand details
            </h2>
            <p className="mt-1 text-xs text-muted">
              We&apos;ll re-fetch your name, description, and image from{" "}
              {data.advertisement?.websiteUrl ?? "your website"}.
            </p>
            {refreshError && (
              <p className="mt-2 text-xs text-danger">{refreshError}</p>
            )}
            {refreshedAt && !refreshError && (
              <p className="mt-2 text-xs text-success">
                Brand details refreshed.
              </p>
            )}
            <Button
              type="button"
              disabled={refreshing}
              onClick={handleRefreshMetadata}
              size="sm"
              className="mt-3"
            >
              {refreshing ? "Refreshing…" : "Refresh now"}
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Your private link
            </h2>
            <p className="mt-1 text-xs text-muted">
              Bookmark this page or save the link below — it&apos;s the only way
              back in.
            </p>
            <Button
              type="button"
              onClick={handleCopyLink}
              variant="pill-outline"
              size="sm"
              className="mt-3 text-foreground"
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the wall
          </Link>
        </div>
      )}
    </section>
  );
}

function friendlyManageError(code: string, fallback: string): string {
  if (code === "MANAGEMENT_TOKEN_EXPIRED") {
    return "This management link has expired. Reach out if you still hold this spot and need access restored.";
  }
  if (code === "MANAGEMENT_TOKEN_INVALID") {
    // Being outbid no longer invalidates this link — it still opens a past
    // holder's own listing. This now only fires for a genuinely wrong/dead
    // link (mistyped, or for a slot this advertiser never held).
    return "This management link is invalid — check that it was copied correctly.";
  }
  return fallback;
}

/** "Jan 5, 2026", or an em dash if there's nothing to show yet. */
function formatManageDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BrandGlyph({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      width={44}
      height={44}
      className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}
