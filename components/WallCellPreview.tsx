"use client";

import { useState } from "react";

/**
 * Mimics the exact markup/sizing of the real wall grid cell (see SlotCell's
 * full-bleed CellVisual) so the user sees precisely how their spot will
 * render, live as they edit the display name / image URL. Shared between
 * ClaimModal (checkout preview) and ManagePanel (edit preview) — both need
 * the same live-as-you-type behavior driven by controlled input state.
 */
export function WallCellPreview({
  number,
  brandName,
  imageUrl,
  bidAmount,
}: {
  number: number;
  brandName: string;
  imageUrl: string;
  bidAmount: string;
}) {
  const trimmedImageUrl = imageUrl.trim();
  const trimmedName = brandName.trim() || "?";

  const [imgFailure, setImgFailure] = useState<{
    url: string;
    failed: boolean;
  }>({
    url: trimmedImageUrl,
    failed: false,
  });

  if (imgFailure.url !== trimmedImageUrl) {
    setImgFailure({ url: trimmedImageUrl, failed: false });
  }

  const imageFailed = imgFailure.url === trimmedImageUrl && imgFailure.failed;
  const hasImage = !!trimmedImageUrl && !imageFailed;

  return (
    <div
      aria-label={`Preview of spot #${number}`}
      className={[
        "group relative flex aspect-square w-20",
        "items-center justify-center overflow-hidden",
        "rounded-[7px] border border-border/70",
        "bg-transparent",
        "text-center",
      ].join(" ")}
    >
      {/* Brand image or initial */}
      {hasImage ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmedImageUrl}
            alt=""
            className="
              object-cover
              select-none
              transition-transform
              duration-200
              ease-out
              group-hover:scale-[1.05]
            "
            onError={() =>
              setImgFailure({
                url: trimmedImageUrl,
                failed: true,
              })
            }
          />
        </div>
      ) : (
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
            {trimmedName.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      {/* Bid amount */}
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
          {bidAmount}
        </span>
      </div>
    </div>
  );
}
