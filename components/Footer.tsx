import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo />
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/terms"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Terms
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Privacy
          </Link>
          <span>·</span>
          <Link
            href="/rules"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Rules
          </Link>
          <span>·</span>
          <Link
            href="/advertising-guidelines"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Guidelines
          </Link>
          <span>·</span>
          <Link
            href="/refund-policy"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Refunds
          </Link>
          <span>·</span>
          <a
            href="mailto:100bid.lol@gmail.com"
            className="hover:text-foreground hover:underline transition-colors"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
