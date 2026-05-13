import { LockIcon, ShieldIcon } from "./Icons";

/**
 * HealthBar — Privacy-preserving health indicator.
 *
 * In traditional lending (Aave, Solend), health factor is publicly
 * derivable from plaintext on-chain data. In ShieldLend, the position
 * health is ONLY known to the user — it's computed inside Arcium MPC
 * and the result is encrypted back to the user's session key.
 *
 * This component reflects that: it shows "PRIVATE" by default,
 * and only reveals the health after the user runs an MPC check
 * and decrypts the result.
 */
export default function HealthBar({ lastCheckResult }) {
  const isLiquidatable = lastCheckResult?.isLiquidatable === true;
  const hasResult = lastCheckResult !== null && lastCheckResult !== undefined;

  return (
    <div className="bg-[#0d110d] border border-[#1a2e1a] rounded-sm p-4">
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans text-xs text-[#4a7a4a] uppercase tracking-widest">
          Position Health
        </span>
        <div className="flex items-center gap-1.5">
          <LockIcon size={10} color="#4a7a4a" />
          <span className="font-mono text-[9px] text-[#4a7a4a] tracking-widest">
            MPC-VERIFIED
          </span>
        </div>
      </div>

      {!hasResult ? (
        /* Default: private state, not yet checked */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldIcon size={20} color="#1a2e1a" />
            <div>
              <div className="font-mono text-sm text-[#1a2e1a] tracking-widest">
                ██████████
              </div>
              <div className="font-mono text-[9px] text-[#4a7a4a] tracking-widest mt-0.5 uppercase">
                Private — run MPC check to reveal
              </div>
            </div>
          </div>
          <div className="h-1 bg-[#080a08] rounded-full border border-[#1a2e1a] overflow-hidden">
            <div className="h-full w-0 bg-[#1a2e1a]" />
          </div>
          <p className="font-mono text-[9px] text-[#4a7a4a] leading-relaxed">
            Your health factor is computed inside the Arcium MPC cluster.
            No one — including the protocol — can see it until you request a check.
          </p>
        </div>
      ) : isLiquidatable ? (
        /* Liquidatable */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff3b3b] animate-pulse" />
            <span className="font-mono text-sm text-[#ff3b3b]">LIQUIDATABLE</span>
          </div>
          <div className="h-1 bg-[#080a08] rounded-full border border-[#ff3b3b44] overflow-hidden">
            <div className="h-full w-full bg-[#ff3b3b]" />
          </div>
          <p className="font-mono text-[9px] text-[#ff3b3b]">
            MPC confirmed: position exceeds 80% LTV threshold.
          </p>
        </div>
      ) : (
        /* Healthy */
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00c44f] animate-pulse" />
            <span className="font-mono text-sm text-[#00c44f]">HEALTHY</span>
          </div>
          <div className="h-1 bg-[#080a08] rounded-full border border-[#1a2e1a] overflow-hidden">
            <div className="h-full w-1/2 bg-[#00c44f] transition-all duration-1000" />
          </div>
          <p className="font-mono text-[9px] text-[#4a7a4a]">
            MPC confirmed: position is below 80% LTV threshold.
          </p>
        </div>
      )}
    </div>
  );
}
