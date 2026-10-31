import type { Source } from "./api";

const CATEGORY_CODES: Record<string, string> = {
  Account: "ACC",
  Billing: "BIL",
  Technical: "TEC",
  Other: "OTH",
};

export function codeFor(category: string): string {
  return CATEGORY_CODES[category] ?? category.slice(0, 3).toUpperCase();
}

/** A category code set in split-flap cells; outlined when keywords answered. */
export function Flaps({
  code,
  source,
  size = "md",
  fresh = false,
  pending = false,
  onShell = false,
}: {
  code: string;
  source?: Source;
  size?: "sm" | "md" | "lg";
  fresh?: boolean;
  pending?: boolean;
  onShell?: boolean;
}) {
  return (
    <span
      className={onShell ? "flaps on-shell" : "flaps"}
      data-size={size}
      data-source={source}
      data-fresh={fresh || undefined}
      data-pending={pending || undefined}
      aria-hidden="true"
    >
      {code.split("").map((letter, index) => (
        <span className="flap" key={index}>
          {letter}
        </span>
      ))}
    </span>
  );
}
