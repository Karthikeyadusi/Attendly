"use client";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Class Compass Logo"
    >
      <circle cx="12" cy="12" r="10" className="text-primary/50" />
      <polygon points="12 2, 14 12, 12 22, 10 12" className="text-primary fill-current" />
    </svg>
  );
}
