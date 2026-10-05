export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
      <p className="mb-4 inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
        Exactly 100 spots. No exceptions.
      </p>
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
        100 brands. 100 spots.
        <br />
        <span className="text-primary">Highest bid wins.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted sm:text-lg">
        Claim an open spot or outbid the brand that holds it. No accounts, no
        subscriptions — just your website, your email, and your bid.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="#wall"
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Explore the 100 spots
        </a>
        <a
          href="#how-it-works"
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface"
        >
          How it works
        </a>
      </div>
    </section>
  );
}
