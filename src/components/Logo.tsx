
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
      aria-label="Attendly Logo"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" className="text-primary/50" />
      <line x1="16" y1="2" x2="16" y2="6" className="text-primary/50" />
      <line x1="8" y1="2" x2="8" y2="6" className="text-primary/50" />
      <line x1="3" y1="10" x2="21" y2="10" className="text-primary/50" />
      <path d="m9 16 2 2 4-4" className="text-primary" />
    </svg>
  );
}
