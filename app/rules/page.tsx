import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Rules",
  description: "100BID Rules - How to claim and hold spots",
};

const sections: LegalSection[] = [
  {
    id: "open-spots",
    title: "Open Spots",
    blocks: [
      { p: "When a spot is open, users may submit a qualifying claim at or above the minimum amount displayed by 100BID." },
      { p: "Once a valid claim is accepted, the spot becomes associated with that advertiser according to the applicable platform rules." },
    ],
  },
  {
    id: "reclaiming-a-spot",
    title: "Reclaiming a Spot",
    blocks: [
      { p: "If a spot already has a holder, another user may submit a higher qualifying claim." },
      { p: "If the higher claim is successfully completed, the previous holder loses the advertising rights associated with that spot and the new advertiser becomes the holder." },
    ],
  },
  {
    id: "claim-amounts",
    title: "Claim Amounts",
    blocks: [
      { p: "The minimum amount required to acquire or reclaim a spot is displayed before you submit a claim." },
      { p: "Users are responsible for checking the amount before confirming a claim." },
    ],
  },
  {
    id: "valid-claims",
    title: "Valid Claims",
    blocks: [
      { p: "A claim must be successfully submitted and, where required, successfully paid before it becomes effective." },
      { p: "A claim may be rejected or cancelled if it is:" },
      {
        list: [
          "Unsuccessful;",
          "Unpaid;",
          "Fraudulent;",
          "Unauthorized;",
          "Created through technical abuse; or",
          "Otherwise invalid under the Terms of Use.",
        ],
      },
    ],
  },
  {
    id: "no-fake-claims",
    title: "No Fake Claims",
    blocks: [
      { p: "Users may not claim against themselves, manipulate prices, coordinate artificial claims, or use multiple identities to manipulate the marketplace." },
      { p: "100BID may cancel suspicious transactions and restrict accounts or access where necessary." },
    ],
  },
  {
    id: "advertising-rights",
    title: "Advertising Rights",
    blocks: [
      { p: "Holding a spot gives the holder the advertising rights provided by 100BID." },
      { p: "It does not provide:" },
      {
        list: [
          "Ownership of the 100BID platform;",
          "Ownership of the spot itself as property;",
          "Ownership of the website;",
          "Trademark rights in 100BID;",
          "Guaranteed traffic; or",
          "Guaranteed advertising performance.",
        ],
      },
    ],
  },
  {
    id: "advertising-content",
    title: "Advertising Content",
    blocks: [
      { p: "A holder must provide advertising content that complies with the Advertising Content Guidelines." },
      { p: "100BID may reject content that violates the rules or applicable law." },
    ],
  },
  {
    id: "technical-problems",
    title: "Technical Problems",
    blocks: [
      { p: "If a technical error materially affects the claiming process, 100BID may investigate and take reasonable corrective action, including cancelling affected claims or transactions where appropriate." },
    ],
  },
  {
    id: "final-decision",
    title: "Final Decision",
    blocks: [
      { p: "100BID reserves the right to determine whether a claim or transaction is valid when there is evidence of fraud, technical malfunction, abuse, or a violation of the platform rules." },
    ],
  },
];

export default function RulesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Rules"
      lastUpdated="September 1, 2026"
      intro="100BID has exactly 100 advertising spots. Each spot can be acquired by paying to claim it — the highest valid claim determines the current holder of a spot."
      sections={sections}
      contact={{ label: "Questions about how claiming works? Contact", email: "100bid.lol@gmail.com" }}
    />
  );
}
