import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "100BID Privacy Policy - How we handle your data",
};

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    blocks: [
      { p: "Depending on how you use 100BID, we may collect the following." },
      { p: "Information you provide may include:" },
      {
        list: [
          "Name;",
          "Email address;",
          "Company or brand name;",
          "Advertising information;",
          "Content submitted for advertising;",
          "Communications you send to us; and",
          "Other information you voluntarily provide.",
        ],
      },
      { p: "When you make a payment, payment information may be processed by our third-party payment provider. We may receive transaction information such as:" },
      {
        list: [
          "Transaction identifier;",
          "Payment status;",
          "Amount;",
          "Currency;",
          "Payment method type;",
          "Billing information; and",
          "Relevant fraud-prevention information.",
        ],
      },
      { p: "We do not need to store your complete card number to provide the service." },
      { p: "When you use 100BID, we may automatically collect technical information such as:" },
      {
        list: [
          "IP address;",
          "Browser type;",
          "Device type;",
          "Operating system;",
          "Pages viewed;",
          "Referring website;",
          "Approximate location derived from IP address; and",
          "Date and time of activity.",
        ],
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    blocks: [
      { p: "We may use information to:" },
      {
        list: [
          "Provide and operate 100BID;",
          "Process transactions;",
          "Manage advertising spots;",
          "Confirm claims and transactions;",
          "Prevent fraud and abuse;",
          "Maintain platform security;",
          "Respond to support requests;",
          "Improve the website;",
          "Monitor platform performance;",
          "Comply with legal obligations; and",
          "Communicate important service information.",
        ],
      },
    ],
  },
  {
    id: "advertising-information",
    title: "Advertising Information",
    blocks: [
      { p: "Information submitted as part of an advertising campaign may be displayed publicly on the 100BID platform." },
      { p: "You should not submit confidential information that you do not want publicly displayed." },
    ],
  },
  {
    id: "payment-providers",
    title: "Payment Providers",
    blocks: [
      { p: "Payments are processed through third-party payment providers." },
      { p: "These providers may independently process payment and personal information according to their own privacy policies." },
      { p: "100BID does not control the privacy practices of third-party payment providers." },
    ],
  },
  {
    id: "cookies",
    title: "Cookies and Similar Technologies",
    blocks: [
      { p: "100BID may use cookies and similar technologies to:" },
      {
        list: [
          "Keep the website functioning;",
          "Remember preferences;",
          "Maintain sessions;",
          "Understand website usage; and",
          "Improve performance and security.",
        ],
      },
      { p: "Where required by law, we will request appropriate consent before using non-essential cookies." },
    ],
  },
  {
    id: "information-sharing",
    title: "Information Sharing",
    blocks: [
      { p: "We may share information with service providers that help us operate 100BID, including providers for:" },
      {
        list: [
          "Payment processing;",
          "Hosting;",
          "Analytics;",
          "Email delivery;",
          "Security;",
          "Fraud prevention; and",
          "Customer support.",
        ],
      },
      { p: "We may also disclose information when required by law or when reasonably necessary to protect the rights, safety, security, or property of 100BID, our users, or others." },
      { p: "We do not sell personal information merely for the purpose of selling personal information." },
    ],
  },
  {
    id: "data-retention",
    title: "Data Retention",
    blocks: [
      { p: "We retain information for as long as reasonably necessary to:" },
      {
        list: [
          "Provide our services;",
          "Complete transactions;",
          "Maintain business and financial records;",
          "Resolve disputes;",
          "Prevent fraud;",
          "Comply with legal obligations; or",
          "Enforce our agreements.",
        ],
      },
      { p: "Retention periods may vary depending on the type of information." },
    ],
  },
  {
    id: "security",
    title: "Security",
    blocks: [
      { p: "We use reasonable technical and organizational measures designed to protect information against unauthorized access, alteration, disclosure, or destruction." },
      { p: "However, no internet transmission or storage system can be guaranteed to be completely secure." },
    ],
  },
  {
    id: "your-rights",
    title: "Your Rights",
    blocks: [
      { p: "Depending on your location and applicable law, you may have rights concerning your personal information, including the right to:" },
      {
        list: [
          "Request access;",
          "Request correction;",
          "Request deletion;",
          "Request restriction of processing;",
          "Object to certain processing;",
          "Request data portability; or",
          "Withdraw consent where processing is based on consent.",
        ],
      },
      { p: "To exercise applicable rights, contact us using the details below." },
    ],
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    blocks: [
      { p: "100BID is not intended for children who are not legally permitted to enter into transactions or use the service." },
      { p: "We do not knowingly collect personal information from children in violation of applicable law." },
    ],
  },
  {
    id: "international-processing",
    title: "International Processing",
    blocks: [
      { p: "Your information may be processed in countries other than the country in which you live." },
      { p: "Where required, we will use appropriate safeguards for international transfers." },
    ],
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to This Policy",
    blocks: [
      { p: "We may update this Privacy Policy from time to time." },
      { p: "The updated version will be posted on this page with a revised \"Last updated\" date." },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated="September 1, 2026"
      intro="This Privacy Policy explains how 100BID collects, uses, stores, and protects information when you use our website and services."
      sections={sections}
      contact={{ label: "For privacy questions or requests, contact", email: "100bid.lol@gmail.com" }}
    />
  );
}
