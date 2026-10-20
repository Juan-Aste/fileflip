// FileFlip mark: a page with a tangerine folded corner and two "flip" arrows.
// Same drawing as src/app/icon.svg and public/logo.svg.
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect width="32" height="32" rx="8" fill="#0b6f6a" />
      <path
        d="M9 7.5A1.5 1.5 0 0 1 10.5 6H19l5 5v13.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 9 24.5z"
        fill="#fff"
      />
      <path d="M19 6v3.5a1.5 1.5 0 0 0 1.5 1.5H24z" fill="#f26b3a" />
      <path
        d="M12.5 16.5h7l-2.2-2.2M20.5 20.5h-7l2.2 2.2"
        fill="none"
        stroke="#0b6f6a"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
