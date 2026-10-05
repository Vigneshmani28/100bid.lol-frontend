import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "100BID Terms of Use - Marketplace advertising spots",
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About 100BID",
    blocks: [
      { p: "100BID provides a marketplace for purchasing advertising placement by competing to claim a spot — whoever's payment is currently highest holds it." },
      { p: "The platform contains a fixed set of 100 advertising spots. A spot may be:" },
      {
        list: [
          "Open and available to claim;",
          "Currently held by an advertiser; or",
          "Reopened to claim when the applicable conditions are met.",
        ],
      },
      { p: "100BID does not guarantee any particular number of visitors, impressions, clicks, leads, sales, or other advertising results." },
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    blocks: [
      { p: "You must be legally permitted to use the platform and enter into binding agreements in your jurisdiction." },
      { p: "By using 100BID, you represent that:" },
      {
        list: [
          "The information you provide is accurate;",
          "You have authority to use any payment method you provide;",
          "You are not using the platform for unlawful purposes;",
          "Your advertising content complies with applicable laws and these Terms.",
        ],
      },
      { p: "If you are using 100BID on behalf of a company or organization, you represent that you have authority to bind that organization." },
    ],
  },
  {
    id: "claiming-a-spot",
    title: "Claiming a Spot",
    blocks: [
      { p: "A claim represents a commitment to acquire the applicable advertising spot at the stated amount, subject to these Terms and the platform's rules." },
      { p: "Before submitting a claim, you are responsible for reviewing:" },
      {
        list: [
          "The current amount required to hold the spot;",
          "The amount you are submitting;",
          "The applicable advertising spot;",
          "Any displayed fees or charges; and",
          "The applicable rules.",
        ],
      },
      { p: "A submitted claim may not be withdrawn solely because you later change your mind." },
      { p: "100BID may reject, cancel, or invalidate a claim where we reasonably believe that it resulted from fraud, abuse, technical malfunction, manipulation, unauthorized activity, or a violation of these Terms." },
    ],
  },
  {
    id: "winning-and-holding",
    title: "Holding a Spot",
    blocks: [
      { p: "An advertiser whose claim succeeds receives the advertising rights associated with the applicable spot according to the rules displayed on 100BID." },
      { p: "Ownership or holding of a spot does not transfer ownership of 100BID, its website, technology, trademarks, or intellectual property." },
      { p: "The holder of a spot receives only the advertising rights expressly provided by the platform." },
    ],
  },
  {
    id: "advertising-content",
    title: "Advertising Content",
    blocks: [
      { p: "Advertisers are responsible for all content submitted for display." },
      { p: "You must have the necessary rights, permissions, and licenses to use:" },
      {
        list: [
          "Logos;",
          "Brand names;",
          "Images;",
          "Videos;",
          "Text;",
          "Product names;",
          "Trademarks; and",
          "Other intellectual property.",
        ],
      },
      { p: "You may not submit content that is unlawful, misleading, fraudulent, defamatory, infringing, hateful, sexually explicit, or otherwise prohibited by our Advertising Content Guidelines." },
      { p: "100BID may review, reject, remove, or disable advertising content at any time when reasonably necessary to enforce these Terms or comply with applicable law." },
    ],
  },
  {
    id: "third-party-brands",
    title: "Third-Party Brands and Trademarks",
    blocks: [
      { p: "Displaying a brand name, logo, or trademark on 100BID does not create an endorsement, sponsorship, partnership, or affiliation with that brand unless expressly stated." },
      { p: "You are responsible for obtaining permission where permission is required." },
      { p: "100BID may remove advertising content if we receive a credible intellectual-property complaint or reasonably believe that content infringes another person's rights." },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    blocks: [
      { p: "Payments are processed through third-party payment providers." },
      { p: "100BID does not store complete payment-card details unless expressly stated in our Privacy Policy." },
      { p: "You authorize the applicable payment provider to process charges associated with your transaction." },
      { p: "Displayed prices may include or exclude applicable taxes, fees, or other charges as indicated at checkout." },
    ],
  },
  {
    id: "refunds-and-cancellations",
    title: "Refunds and Cancellations",
    blocks: [
      { p: "Because advertising spots are limited and competitive, transactions may generally be non-refundable once payment has been successfully completed, except where:" },
      {
        list: [
          "Required by applicable law;",
          "100BID expressly agrees to a refund;",
          "The transaction was processed incorrectly; or",
          "A refund is required under our Refund Policy.",
        ],
      },
      { p: "Nothing in these Terms limits any mandatory consumer rights that cannot legally be excluded." },
    ],
  },
  {
    id: "prohibited-activities",
    title: "Prohibited Activities",
    blocks: [
      { p: "You may not:" },
      {
        list: [
          "Manipulate or interfere with the claiming process;",
          "Use bots or automated systems to submit claims without authorization;",
          "Create fraudulent transactions;",
          "Attempt to bypass payment requirements;",
          "Impersonate another person or business;",
          "Submit misleading advertising;",
          "Upload content that infringes intellectual-property rights;",
          "Attempt to access another user's information;",
          "Interfere with the security or operation of 100BID;",
          "Use 100BID for unlawful activity; or",
          "Attempt to exploit bugs, vulnerabilities, or technical errors.",
        ],
      },
    ],
  },
  {
    id: "platform-availability",
    title: "Platform Availability",
    blocks: [
      { p: "100BID is provided on an availability basis." },
      { p: "We may temporarily suspend or modify the platform for:" },
      {
        list: [
          "Maintenance;",
          "Security;",
          "Updates;",
          "Technical problems;",
          "Legal requirements; or",
          "Other operational reasons.",
        ],
      },
      { p: "We do not guarantee that the platform will always be uninterrupted, error-free, or available." },
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    blocks: [
      { p: "The 100BID name, logo, website, software, design, graphics, interface, and other platform materials are owned by or licensed to 100BID and are protected by applicable intellectual-property laws." },
      { p: "You may not copy, reproduce, modify, distribute, reverse engineer, or commercially exploit platform materials without authorization." },
    ],
  },
  {
    id: "user-content",
    title: "User Content",
    blocks: [
      { p: "You retain ownership of content you submit to 100BID." },
      { p: "By submitting advertising content, you grant 100BID a limited license to host, reproduce, display, resize, format, and technically modify that content as necessary to operate and promote the advertising service." },
      { p: "This license ends when the relevant content is removed, except where continued use is reasonably necessary for legal, security, accounting, or archival purposes." },
    ],
  },
  {
    id: "suspension-and-termination",
    title: "Suspension and Termination",
    blocks: [
      { p: "100BID may suspend or terminate access where we reasonably believe that a user:" },
      {
        list: [
          "Violated these Terms;",
          "Engaged in fraud or abuse;",
          "Created a security risk;",
          "Submitted prohibited content; or",
          "Used the platform unlawfully.",
        ],
      },
      { p: "Termination does not automatically cancel obligations that arose before termination." },
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    blocks: [
      { p: "To the maximum extent permitted by law, 100BID will not be liable for indirect, incidental, consequential, special, or punitive damages arising from use of the platform." },
      { p: "100BID does not guarantee advertising performance, traffic, conversions, revenue, or business results." },
      { p: "Nothing in these Terms excludes liability that cannot legally be excluded." },
    ],
  },
  {
    id: "changes-to-terms",
    title: "Changes to These Terms",
    blocks: [
      { p: "We may update these Terms from time to time." },
      { p: "When material changes are made, we may provide reasonable notice through the platform or other appropriate means." },
      { p: "Continued use of 100BID after the effective date of updated Terms constitutes acceptance of the updated Terms, to the extent permitted by law." },
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    blocks: [
      { p: "These Terms are governed by the laws applicable to the jurisdiction specified by 100BID in its final published legal information, without prejudice to mandatory rights that apply to users under applicable law." },
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      lastUpdated="September 1, 2026"
      intro="100BID is a marketplace with exactly 100 advertising spots. Any spot can be claimed by paying more than its current amount — including a spot someone already holds, by paying more than they did. By accessing or using 100BID, you agree to these Terms of Use."
      leadIn={[
        { p: "Welcome to 100BID." },
        { p: "The platform contains exactly 100 advertising spots, and each spot may be acquired by submitting a qualifying claim. If you do not agree with these Terms, please do not use the platform." },
      ]}
      sections={sections}
      contact={{
        label: "For legal, advertising, intellectual-property, or Terms-related questions, contact",
        email: "100bid.lol@gmail.com",
      }}
    />
  );
}
