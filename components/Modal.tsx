"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ModalProps = {
  titleId: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
};

/** Centered modal with backdrop, escape-to-close, and click-outside-to-close. */
export function Modal({
  titleId,
  title,
  onClose,
  children,
  panelClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "relative flex w-full max-w-md min-h-0 flex-col",
          "max-h-[calc(100dvh-1rem)]",
          "overflow-hidden",
          "rounded-t-2xl border border-border-strong bg-surface shadow-2xl",
          "pb-[env(safe-area-inset-bottom)]",
          "sm:max-h-[90vh] sm:rounded-2xl sm:p-5",
          panelClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 sm:border-0 sm:px-0 sm:pb-4 sm:pt-0">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close"
            variant="ghost"
            size="icon-sm"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:none] [-ms-overflow-style:none] sm:px-0 sm:py-0 [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
