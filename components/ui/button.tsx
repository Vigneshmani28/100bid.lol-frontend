import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * 100BID's button.
 *
 * The `action` variants carry the wall's signature look — square edges, mono
 * uppercase with wide tracking, and a press that scales the whole control
 * down rather than nudging it. That treatment is what a primary commitment
 * looks like here (Claim, Pay, Continue), so it lives in a variant instead of
 * being retyped as a class array at every call site.
 *
 * `pill` variants are the quieter counterpart used by the floating canvas
 * controls and dialog dismissals, where a square block would shout.
 */
const buttonVariants = cva(
  [
    // Both `group` and `group/button`: children of these buttons use plain
    // `group-hover:` (the arrow nudge, the expanding rule), so the unnamed
    // group has to be present too.
    "group group/button inline-flex shrink-0 items-center justify-center",
    "whitespace-nowrap bg-clip-padding transition-all outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        // The primary commitment: solid, square, mono, presses inward.
        action: [
          "relative gap-4 border border-transparent",
          "font-mono text-xs font-bold uppercase tracking-[0.12em]",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/85",
          "active:scale-[0.96]",
          "duration-150 ease-in-out",
        ].join(" "),
        // Same shape and rhythm, but recessive — the "not this one" choice
        // sitting beside an action button.
        "action-outline": [
          "relative gap-4 border border-border",
          "font-mono text-xs font-bold uppercase tracking-[0.12em]",
          "text-muted",
          "hover:bg-surface-hover hover:text-foreground",
          "active:scale-[0.96]",
          "duration-150 ease-in-out",
        ].join(" "),
        "action-danger": [
          "relative gap-4 border border-danger/40",
          "font-mono text-xs font-bold uppercase tracking-[0.12em]",
          "text-danger",
          "hover:bg-danger/10",
          "active:scale-[0.96]",
          "duration-150 ease-in-out",
        ].join(" "),

        // Rounded, lower-key controls.
        pill: "rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover",
        "pill-outline":
          "rounded-full border border-border text-sm font-medium text-muted hover:bg-surface-hover hover:text-foreground",
        ghost:
          "rounded-lg text-muted hover:bg-surface-hover hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Matches the block proportions the wall's primary buttons use.
        action: "w-full px-6 py-4",
        "action-auto": "px-6 py-4",
        default: "px-4 py-2.5",
        sm: "px-3 py-2 text-xs",
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
    },
    defaultVariants: {
      variant: "action",
      size: "action",
    },
  },
);

function Button({
  className,
  variant = "action",
  size = "action",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
