export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" className="fill-surface" />

        <rect x="1" y="1" width="8" height="8" rx="2" className="fill-foreground" />
        <rect x="12" y="1" width="8" height="8" rx="2" className="fill-foreground" />
        <rect x="23" y="1" width="8" height="8" rx="2" className="fill-foreground" />

        <rect x="1" y="12" width="8" height="8" rx="2" className="fill-foreground" />
        <rect x="12" y="12" width="8" height="8" rx="2" className="fill-primary" />
        <rect x="23" y="12" width="8" height="8" rx="2" className="fill-foreground" />

        <rect x="1" y="23" width="8" height="8" rx="2" className="fill-foreground" />
        <rect x="12" y="23" width="8" height="8" rx="2" className="fill-foreground" />
        <rect x="23" y="23" width="8" height="8" rx="2" className="fill-foreground" />
      </svg>

      <span className="text-2xl font-semibold tracking-tight text-foreground">
        100<span className="text-primary">bid</span>.lol
      </span>
    </span>
  );
}