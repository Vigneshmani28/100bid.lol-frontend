import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { DataFastAnalytics } from "@/components/DataFastAnalytics";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://100bid.lol";

const title = "100BID - 100 Brand Spots. Claim Your Spot.";

const description =
  "100BID is a wall of exactly 100 advertising spots. Claim an open spot or compete for one already owned — each spot belongs to whoever holds the current winning bid.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: title,
    template: "%s · 100BID",
  },

  description,

  applicationName: "100BID",

  keywords: [
    "100bid",
    "advertising",
    "bidding",
    "brand spots",
    "auction",
  ],

  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "100BID",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title,
    description,
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        GeistMono.variable,
        "font-sans",
        poppins.variable
      )}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <DataFastAnalytics />
        {children}
      </body>
    </html>
  );
}