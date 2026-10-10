import type { Model3DKind } from "@invitation/shared";

/** A flat picture of each 3D object, used in pickers and template cards. */
export default function ModelIcon({ kind, color = "#d4a017", size = 56 }: { kind: Model3DKind; color?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };
  switch (kind) {
    case "rings":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth={5}>
          <circle cx="24" cy="34" r="14" />
          <circle cx="40" cy="34" r="14" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} fill={color}>
          <path d="M32 54C10 38 6 26 6 19a13 13 0 0 1 26-3 13 13 0 0 1 26 3c0 7-4 19-26 35z" />
        </svg>
      );
    case "balloons":
      return (
        <svg {...common}>
          <ellipse cx="22" cy="24" rx="12" ry="15" fill={color} />
          <ellipse cx="42" cy="20" rx="11" ry="14" fill="#e9a8b8" />
          <path d="M22 39l3 20M42 34l-3 25" stroke="#8a8a80" strokeWidth={1.5} />
        </svg>
      );
    case "cake":
      return (
        <svg {...common}>
          <rect x="8" y="40" width="48" height="16" rx="3" fill="#f5e6d3" />
          <rect x="16" y="26" width="32" height="14" rx="3" fill={color} />
          <rect x="30.5" y="14" width="3" height="12" fill="#fffdf5" stroke="#cfc8b8" strokeWidth={0.5} />
          <path d="M32 6c3 3 3 6 0 8-3-2-3-5 0-8z" fill="#ffb347" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <rect x="10" y="26" width="44" height="30" rx="2" fill={color} />
          <rect x="7" y="19" width="50" height="9" rx="2" fill={color} />
          <rect x="29" y="19" width="6" height="37" fill="#f6f0e2" />
          <path d="M32 19c-8-10-16-4-10 0zM32 19c8-10 16-4 10 0z" fill="none" stroke="#f6f0e2" strokeWidth={3} />
        </svg>
      );
    case "stars":
      return (
        <svg {...common} fill={color}>
          <path d="M26 6l5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1z" transform="translate(6 8) scale(0.95)" />
          <path d="M50 8l2 5 5 .5-4 3.500 1 5-4.500-3-4.500 3 1-5-4-3.500 5-.5z" />
        </svg>
      );
    case "custom":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round">
          <path d="M32 6l22 12v28L32 58 10 46V18z" />
          <path d="M10 18l22 12 22-12M32 30v28" />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round">
          <circle cx="32" cy="32" r="20" />
          <path d="M18 46L46 18" />
        </svg>
      );
  }
}
