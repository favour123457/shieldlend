import { LockIcon, EyeOffIcon } from "./Icons";

/**
 * PrivacyBadge — Shown next to any encrypted value.
 * Signals to the user that this value is ciphertext,
 * never stored as plaintext on Solana.
 */
export default function PrivacyBadge({ label = "Encrypted", variant = "default" }) {
  if (variant === "large") {
    return (
      <div className="flex items-center gap-2 bg-[#0d110d] border border-[#1a2e1a] px-3 py-1.5 rounded-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00c44f] animate-pulse" />
        <LockIcon size={11} color="#00c44f" />
        <span className="font-mono text-[9px] tracking-[0.2em] text-[#00c44f] uppercase">
          {label}
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1">
        <div className="w-1 h-1 rounded-full bg-[#00c44f] animate-pulse" />
        <span className="font-mono text-[8px] tracking-[0.15em] text-[#00c44f] uppercase">
          enc
        </span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-[#00c44f] animate-pulse" />
      <span className="font-mono text-[9px] tracking-[0.2em] text-[#00c44f] uppercase">
        {label}
      </span>
    </div>
  );
}

/**
 * CiphertextPreview — Shows first 4 bytes of a ciphertext as hex + "..."
 */
export function CiphertextPreview({ bytes, label }) {
  const isEmpty = !bytes || Array.from(bytes).every((b) => b === 0);

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="font-mono text-[9px] tracking-widest text-[#4a7a4a] uppercase">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <EyeOffIcon size={10} color="#4a7a4a" />
        <span className="font-mono text-xs text-[#4a7a4a]">
          {isEmpty
            ? "—"
            : `0x${Array.from(bytes)
                .slice(0, 4)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")}...`}
        </span>
      </div>
      {!isEmpty && <PrivacyBadge variant="inline" />}
    </div>
  );
}

/**
 * MpcSecuredTag — Header-level "MPC Secured" indicator
 */
export function MpcSecuredTag() {
  return (
    <div className="flex items-center gap-1.5 text-[#00c44f]">
      <LockIcon size={12} color="#00c44f" />
      <span className="font-mono text-[9px] tracking-widest uppercase">
        MPC Secured
      </span>
    </div>
  );
}
