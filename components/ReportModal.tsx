"use client";

import { useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import type { ReportReason, SlotSummary } from "@/lib/types";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReportModalProps {
  slot: SlotSummary;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "MISLEADING", label: "Misleading or deceptive" },
  { value: "MALWARE_OR_PHISHING", label: "Malware or phishing" },
  { value: "TRADEMARK", label: "Trademark infringement" },
  { value: "OTHER", label: "Other" },
];

export function ReportModal({ slot, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>("INAPPROPRIATE_CONTENT");
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      await api.submitReport({
        slotNumber: slot.number,
        reason,
        details: details.trim() || undefined,
        reporterEmail: reporterEmail.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not submit your report.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      titleId="report-modal-title"
      title={`Report spot #${slot.number}`}
      onClose={onClose}
    >
      {submitted ? (
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-2xl">
            🚩
          </div>
          <p className="text-sm font-semibold text-foreground">
            Report received
          </p>
          <p className="text-sm text-muted">
            Thanks for flagging {slot.ad?.brandName ?? "this spot"}. Our team
            will review it shortly.
          </p>
          <Button
            type="button"
            onClick={onClose}
            variant="pill-outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="block">
            <Label htmlFor="report-reason">Reason</Label>
            {/* A native select, deliberately: shadcn's Select is a listbox
                built on a popover, which would be trapped inside this dialog
                and is more machinery than three fixed options need. */}
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary md:text-sm"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="block">
            <Label htmlFor="report-details">
              Details <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Tell us what's wrong with this spot…"
            />
          </div>

          <div className="block">
            <Label htmlFor="report-email">
              Your email{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="report-email"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              In case we need to follow up.
            </span>
          </div>

          <Button
            type="button"
            disabled={busy}
            onClick={handleSubmit}
            variant="pill"
            className="w-full"
          >
            {busy ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
