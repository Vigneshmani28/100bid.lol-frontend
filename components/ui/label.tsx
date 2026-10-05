"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** The small caption above a field. Matches the app's existing field labels. */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "mb-1 block text-xs font-medium text-muted select-none",
        "group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
