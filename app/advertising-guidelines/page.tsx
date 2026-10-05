import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Advertising Content Guidelines",
  description: "100BID Advertising Content Guidelines - What you can and cannot advertise",
};

export default function AdvertisingGuidelinesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1>Advertising Content Guidelines</h1>
          <p className="text-sm text-muted-foreground">Last updated: September 1, 2026</p>

          <p>100BID is designed to showcase brands, products, creators, businesses, and projects. To keep the marketplace trustworthy, advertising content must meet these guidelines.</p>

          <h2>Allowed</h2>
          <p>Advertising may include legitimate:</p>
          <ul>
            <li>Businesses;</li>
            <li>Products;</li>
            <li>Services;</li>
            <li>Websites;</li>
            <li>Applications;</li>
            <li>Creators;</li>
            <li>Projects;</li>
            <li>Events; and</li>
            <li>Organizations.</li>
          </ul>

          <h2>Prohibited Content</h2>
          <p>You may not submit advertisements that:</p>
          <ul>
            <li>Promote illegal activity;</li>
            <li>Facilitate fraud or scams;</li>
            <li>Impersonate another person or organization;</li>
            <li>Make deliberately deceptive claims;</li>
            <li>Infringe copyrights, trademarks, or other intellectual-property rights;</li>
            <li>Contain malware or malicious code;</li>
            <li>Promote hate or targeted harassment;</li>
            <li>Contain sexually explicit material;</li>
            <li>Promote dangerous or unlawful activities;</li>
            <li>Attempt to manipulate users through deceptive interfaces; or</li>
            <li>Violate applicable advertising laws.</li>
          </ul>

          <h2>Trademark and Brand Usage</h2>
          <p>You must have the right to use any brand name, logo, image, or trademark included in your advertisement.</p>
          
          <p>A listing on 100BID does not itself establish that a brand has endorsed, sponsored, or partnered with the advertiser.</p>

          <h2>Accuracy</h2>
          <p>Advertising should accurately represent the advertised product, service, or organization.</p>
          
          <p>100BID may request additional information where an advertisement appears misleading or potentially infringing.</p>

          <h2>Moderation</h2>
          <p>100BID may reject, remove, disable, or request changes to advertising content that violates these guidelines or creates legal, security, or reputational risk.</p>
          
          <p>Repeated violations may result in suspension or termination.</p>

          <h2>Reporting</h2>
          <p>If you believe an advertisement violates these guidelines or infringes your rights, contact:</p>
          <p>
            <a href="mailto:100bid.lol@gmail.com">100bid.lol@gmail.com</a>
          </p>
          
          <p>Include the relevant spot, advertisement, and reason for your complaint where possible.</p>
        </article>
      </main>
    </div>
  );
}
