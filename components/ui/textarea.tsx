import * as React from "react";

import { cn } from "@/lib/utils";

/** Multi-line counterpart to Input — same borders, focus, and 16px mobile rule. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full resize-none rounded-lg border border-border bg-background px-3 py-2",
        "text-base text-foreground transition-colors outline-none md:text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
