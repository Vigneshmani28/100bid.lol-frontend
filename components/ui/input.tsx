import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The wall's text field.
 *
 * Matches the border/background/focus treatment every hand-rolled input in
 * this app already used, so swapping them over is invisible. Two deliberate
 * differences from stock shadcn: no `dark:` variants (the app has a single
 * dark palette rather than a toggled theme), and `--input` is used as a
 * border colour only — as a background it would render fields the colour of
 * their own border.
 *
 * `text-base` below the `md` breakpoint is not a typo: iOS Safari zooms the
 * viewport when a focused field's text is under 16px.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2",
        "text-base text-foreground transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "focus-visible:border-primary focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
