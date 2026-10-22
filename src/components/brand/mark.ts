// Fileflect mark: a page split by a mirror line; the right half is the left half
// reflected with its colors swapped (white/tangerine). Shared by LogoMark and the
// Open Graph image; src/app/icon.svg and public/logo.svg repeat the same paths
// (regenerate the PNG icons with `node scripts/brand/icons.mjs`).
export const MARK = {
  tile: "#0b6f6a",
  light: "#ffffff",
  accent: "#f26b3a",
  leftHalf: "M15.4 6H12.4L7.5 10.9V24.5A1.5 1.5 0 0 0 9 26H15.4Z",
  leftFold: "M12.4 6V9.4A1.5 1.5 0 0 1 10.9 10.9H7.5Z",
  rightHalf: "M16.6 6H19.6L24.5 10.9V24.5A1.5 1.5 0 0 1 23 26H16.6Z",
  rightFold: "M19.6 6V9.4A1.5 1.5 0 0 0 21.1 10.9H24.5Z",
} as const;
