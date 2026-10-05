import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

interface NavProps {
  onHowItWorksClick?: () => void;
}

export function Nav({ onHowItWorksClick }: NavProps) {
  return (
    <header className="border-b border-border bg-background">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"
        aria-label="Primary"
      >
        <Link href="/" className="rounded-sm" aria-label="100BID home">
          <Logo />
        </Link>
        <ul className="flex items-center gap-6 text-sm text-muted">
          {onHowItWorksClick && (
            <li>
              <button
                onClick={onHowItWorksClick}
                className="transition-colors hover:text-foreground bg-none border-none p-0 cursor-pointer"
              >
                How it works
              </button>
            </li>
          )}
          <li>
            <a
              href="/terms#about"
              className="transition-colors hover:text-foreground"
            >
              About
            </a>
          </li>
          <li>
            <Button type="button" asChild>
              <a href="/">View spots</a>
            </Button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
