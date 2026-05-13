import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShieldLend } from "../hooks/useShieldLend";
import { WarningIcon, LockIcon, CheckCircleIcon, ClockIcon, ShieldIcon } from "./Icons";

const STEPS = [
  { id: 1, label: "Session Key", desc: "Ephemeral x25519 keypair generated for result decryption" },
  { id: 2, label: "Queue MPC", desc: "check_liquidatable circuit submitted to Arcium cluster" },
  { id: 3, label: "MPC Compute", desc: "Encrypted LTV check inside MPC — no plaintext revealed" },
  { id: 4, label: "Decrypt", desc: "Result decrypted with your session key" },
];

export default function LiquidatePanel() {
  const { publicKey } = useWallet();
  const { checkLiquidatable, mpcElapsed } = useShieldLend();

  const [targetAddress, setTargetAddress] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  const handleCheck = async () => {
    if (!targetAddress || targetAddress.length < 32) return;
    setError(null);
    setCheckResult(null);
    setStep(1);
    try {
      setStep(2);
      const result = await checkLiquidatable(targetAddress);
      setStep(4);
      setCheckResult(result);
    } catch (err) {
      setError(err.message || "Liquidation check failed");
      setStep(0);
    }
  };

  const isRunning = step > 0 && step < 4;
  const isDone = step === 4;
  const isLiquidatable = checkResult?.isLiquidatable === true;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-4 py-3">
        <div className="flex items-start gap-3">
          <ShieldIcon size={18} color="#4a7a4a" />
          <div>
            <p className="font-sans text-xs text-[#4a7a4a] font-semibold mb-1">Privacy-Preserving Liquidation</p>
            <p className="font-mono text-[9px] text-[#4a7a4a] leading-relaxed">
              LTV checks run inside Arcium MPC on encrypted data. Only a binary result
              (liquidatable: yes/no) is returned, encrypted to your session key.
              No position details are ever exposed.
            </p>
          </div>
        </div>
      </div>

      {/* Step pipeline */}
      <div className="flex items-start gap-0">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all duration-300 ${
                (step > s.id && !error) || isDone
                  ? "border-[#00c44f] bg-[#00c44f] text-[#080a08]"
                  : step === s.id && !error
                  ? s.id === 3 ? "border-[#00c44f] text-[#00c44f] animate-pulse" : "border-[#00c44f] text-[#00c44f]"
                  : "border-[#1a2e1a] text-[#4a7a4a]"
              }`}>
                {(step > s.id && !error) || isDone ? "✓" : s.id === 3 ? "∞" : s.id}
              </div>
              <span className={`font-mono text-[8px] tracking-widest mt-1.5 text-center leading-tight px-0.5 ${
                step >= s.id && !error ? "text-[#00c44f]" : "text-[#4a7a4a]"
              }`}>{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mt-2.5 mx-0.5 transition-all duration-500 ${
                (step > s.id && !error) || isDone ? "bg-[#00c44f]" : "bg-[#1a2e1a]"
              }`} />
            )}
          </div>
        ))}
      </div>

      {step === 3 && (
        <div className="bg-[#080a08] border border-[#00c44f] rounded-sm px-3 py-2.5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00c44f] animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#4a7a4a]">MPC COMPUTING</span>
              <span className="font-mono text-[10px] text-[#00c44f]">{mpcElapsed}s</span>
            </div>
            <p className="font-mono text-[9px] text-[#4a7a4a] mt-0.5">
              check_liquidatable circuit running on Arcium devnet cluster...
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[10px] text-[#4a7a4a] uppercase tracking-widest flex items-center gap-1.5">
          <WarningIcon size={10} color="#4a7a4a" />
          Position Owner Address
        </label>
        <input
          type="text"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          placeholder="Enter Solana wallet address..."
          disabled={isRunning}
          className="w-full bg-[#080a08] border border-[#1a2e1a] text-[#e8f5e8] font-mono text-xs px-3 py-2.5 rounded-sm placeholder-[#1a2e1a] focus:outline-none focus:border-[#00c44f] transition-colors disabled:opacity-50"
        />
        {publicKey && (
          <button onClick={() => setTargetAddress(publicKey.toBase58())} disabled={isRunning}
            className="self-start font-mono text-[9px] text-[#4a7a4a] hover:text-[#00c44f] transition-colors disabled:opacity-40">
            Use my address
          </button>
        )}
      </div>

      {isDone && checkResult && (
        <div className={`border rounded-sm px-4 py-3 transition-all ${
          isLiquidatable ? "border-[#ff3b3b] bg-[#ff3b3b08]" : "border-[#00c44f] bg-[#00c44f08]"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isLiquidatable ? (
              <><div className="w-2 h-2 rounded-full bg-[#ff3b3b] animate-pulse" />
              <span className="font-mono text-sm text-[#ff3b3b] tracking-wide">LIQUIDATABLE</span></>
            ) : (
              <><CheckCircleIcon size={14} color="#00c44f" />
              <span className="font-mono text-sm text-[#00c44f] tracking-wide">HEALTHY</span></>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <LockIcon size={10} color="#4a7a4a" />
            <span className="font-mono text-[9px] text-[#4a7a4a]">
              Result decrypted from Arcium MPC ciphertext — verified on-chain
            </span>
          </div>
          {isLiquidatable ? (
            <div className="border-t border-[#ff3b3b22] pt-2 mt-2">
              <p className="font-mono text-[9px] text-[#ff3b3b] mb-2">
                Position exceeds 80% LTV threshold. As liquidator you receive collateral + 5% bonus.
              </p>
              <button
                className="w-full bg-[#ff3b3b] text-white font-bold tracking-widest uppercase text-xs py-2.5 rounded-sm hover:bg-[#ff5555] transition-colors flex items-center justify-center gap-2"
                onClick={() => alert("Extend: call program.methods.liquidate(...) with the position collateral amount.")}>
                <WarningIcon size={12} color="white" />
                Execute Liquidation
              </button>
            </div>
          ) : (
            <p className="font-mono text-[9px] text-[#4a7a4a]">
              LTV below 80% threshold. Position cannot be liquidated.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleCheck}
        disabled={isRunning || !targetAddress || isDone}
        className="w-full border border-[#1a2e1a] text-[#4a7a4a] font-bold tracking-widest uppercase text-xs py-3 rounded-sm hover:border-[#00c44f] hover:text-[#00c44f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
        style={{ transition: "border-color 0.1s, color 0.1s, transform 0.1s" }}>
        {isRunning ? (
          <><div className="w-3 h-3 rounded-full border border-[#4a7a4a] border-t-[#00c44f] animate-spin" />
          {step === 1 ? "Generating Session Key..." : step === 2 ? "Queuing MPC..." : step === 3 ? "MPC Computing..." : "Decrypting..."}</>
        ) : isDone ? (
          <><CheckCircleIcon size={13} color="#00c44f" /> Check Complete</>
        ) : (
          <><ClockIcon size={13} color="#4a7a4a" /> Run MPC Health Check</>
        )}
      </button>

      {isDone && (
        <button onClick={() => { setStep(0); setCheckResult(null); setTargetAddress(""); }}
          className="w-full border border-[#1a2e1a] text-[#4a7a4a] font-mono text-[10px] py-2 rounded-sm hover:border-[#00c44f] hover:text-[#00c44f] transition-colors tracking-widest uppercase">
          Check Another Position
        </button>
      )}

      {error && (
        <div className="bg-[#ff3b3b0a] border border-[#ff3b3b33] rounded-sm px-3 py-2">
          <p className="font-mono text-[10px] text-[#ff3b3b]">{error}</p>
        </div>
      )}
    </div>
  );
}
