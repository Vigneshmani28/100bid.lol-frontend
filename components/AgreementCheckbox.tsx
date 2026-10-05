"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface AgreementCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function AgreementCheckbox({
  checked,
  onCheckedChange,
}: AgreementCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="terms-agreement"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />

      <Label
        htmlFor="terms-agreement"
        className="cursor-pointer text-sm leading-relaxed text-muted"
      >
        I have read and agree to the{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
        >
          Terms of Service
        </Link>{" "}
        of 100BID.
      </Label>
    </div>
  );
}
