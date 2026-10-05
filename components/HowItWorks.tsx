const steps = [
  {
    title: "Pick a spot",
    body: "Choose any of the 100 spots on the wall — open ones start at $1, taken ones need a higher bid than the current holder.",
  },
  {
    title: "Show your brand",
    body: "Drop in your website URL. We pull your name, description, and image straight from your site — no uploads.",
  },
  {
    title: "Bid and pay",
    body: "Enter your email and your bid, then complete payment. Nothing is reserved until payment is confirmed.",
  },
  {
    title: "You're live",
    body: "Payment confirms instantly and your brand takes the spot. We email you a private link to manage it any time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-xl border border-border bg-background p-5"
            >
              <span className="text-sm font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
