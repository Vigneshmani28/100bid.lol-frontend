import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LegalToc } from "./LegalToc";
import { ArrowLeft } from "lucide-react";

export interface LegalBlock {
  p?: string;
  list?: string[];
}

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  /** Short summary shown under the title, above the divider. */
  intro?: string;
  /** Unnumbered lead-in paragraphs shown above the first numbered section — not part of the TOC. */
  leadIn?: LegalBlock[];
  sections: LegalSection[];
  contact?: { label: string; email: string };
}

/** Shared reference-document shell for /terms, /privacy, /rules — sticky
 * table of contents on desktop, a collapsible one on mobile, numbered
 * sections with stable anchor ids so links to specific clauses stay valid. */
export function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  intro,
  leadIn,
  sections,
  contact,
}: LegalPageProps) {
  const toc = sections.map((section, i) => ({
    id: section.id,
    number: String(i + 1).padStart(2, "0"),
    title: section.title,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to 100BID
          </Link>

          <div className="mt-6 border-b border-border pb-8">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <div className="mt-4 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              Last updated {lastUpdated}
            </div>
            {intro && (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                {intro}
              </p>
            )}
          </div>

          <LegalToc items={toc} className="mt-6 lg:hidden" variant="mobile" />

          <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
            <LegalToc items={toc} className="hidden lg:block" variant="desktop" />

            <div className="min-w-0">
              {leadIn && leadIn.length > 0 && (
                <div className="space-y-3 pb-8">
                  {leadIn.map((block, i) => (
                    <LegalBlockView key={i} block={block} />
                  ))}
                </div>
              )}

              {sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 border-t border-border py-8 first:border-t-0 first:pt-0"
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-1.5 text-lg font-semibold text-foreground sm:text-xl">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {section.blocks.map((block, bi) => (
                      <LegalBlockView key={bi} block={block} />
                    ))}
                  </div>
                </section>
              ))}

              {contact && (
                <div className="mt-2 border border-primary/20 bg-primary/5 p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Questions?
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {contact.label}{" "}
                    <a
                      href={`mailto:${contact.email}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.list) {
    return (
      <ul className="space-y-1.5">
        {block.list.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
            <span
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed text-muted">{block.p}</p>;
}
