import { MARK } from "./mark";

// Same drawing as src/app/icon.svg and public/logo.svg.
export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect width="32" height="32" rx="8" fill={MARK.tile} />
      <path d={MARK.leftHalf} fill={MARK.light} />
      <path d={MARK.leftFold} fill={MARK.accent} />
      <path d={MARK.rightHalf} fill={MARK.accent} />
      <path d={MARK.rightFold} fill={MARK.light} />
    </svg>
  );
}
