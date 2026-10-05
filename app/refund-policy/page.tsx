import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "100BID Refund Policy - Non-refundable transactions and when refunds are available",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1>Refund Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: September 1, 2026</p>

          <p>100BID operates a limited marketplace containing exactly 100 advertising spots.</p>
          
          <p>Because a successful transaction can affect the availability and ownership of a limited advertising spot, payments are generally non-refundable once successfully completed, except where a refund is required by law or expressly approved by 100BID.</p>

          <h2>Refunds may be considered when:</h2>
          <ul>
            <li>A duplicate payment was processed;</li>
            <li>A technical error resulted in an incorrect charge;</li>
            <li>100BID cannot provide the purchased advertising service;</li>
            <li>A transaction was unauthorized and is verified as such; or</li>
            <li>Applicable law requires a refund.</li>
          </ul>

          <h2>No Refunds for Change of Mind</h2>
          <p>A refund is generally not available because:</p>
          <ul>
            <li>You no longer want the advertising spot;</li>
            <li>You changed your advertising strategy;</li>
            <li>Your advertisement received fewer visitors than expected;</li>
            <li>Your campaign did not generate expected sales or conversions; or</li>
            <li>Another bidder subsequently outbid you.</li>
          </ul>

          <h2>Advertising Performance</h2>
          <p>100BID does not guarantee:</p>
          <ul>
            <li>A specific number of impressions;</li>
            <li>Traffic;</li>
            <li>Clicks;</li>
            <li>Leads;</li>
            <li>Sales;</li>
            <li>Conversions; or</li>
            <li>Revenue.</li>
          </ul>

          <h2>Requesting a Refund</h2>
          <p>Contact:</p>
          <p>
            <a href="mailto:100bid.lol@gmail.com">100bid.lol@gmail.com</a>
          </p>
          
          <p>Include your transaction information and a description of the issue.</p>
          
          <p>Each request will be reviewed according to this policy and applicable law.</p>
        </article>
      </main>
    </div>
  );
}
