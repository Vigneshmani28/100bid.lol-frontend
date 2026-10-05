export function About() {
  return (
    <section id="about" className="border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          About 100BID
        </h2>
        <p className="mt-4 text-balance text-sm leading-relaxed text-muted sm:text-base">
          100BID is a fixed-size advertising wall — exactly 100 spots, forever.
          There&apos;s no bidding war timer and no auction house drama: whoever
          places the highest bid owns the spot until someone outbids them.
          Ownership changes hands the moment a winning payment is verified, and
          every past owner is recorded in the spot&apos;s history.
        </p>
      </div>
    </section>
  );
}
