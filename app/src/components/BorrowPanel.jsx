import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShieldLend } from "../hooks/useShieldLend";
import TxStatus from "./TxStatus";
import PrivacyBadge from "./PrivacyBadge";
import { ArrowUpRightIcon, LockIcon, CheckCircleIcon } from "./Icons";

const STEPS = [
  { id: 1, label: "Encrypt", desc: "Borrow amount encrypted with your session key" },
  { id: 2, label: "Submit", desc: "Queuing validate_borrow circuit in Arcium MPC" },
  { id: 3, label: "MPC", desc: "Arcium cluster verifies LTV in encrypted state — no plaintext revealed" },
  { id: 4, label: "Done", desc: "MPC approved — SOL transferred to your wallet" },
];

export default function BorrowPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const {
    queueBorrowValidation,
    finaliseBorrow,
    mpcElapsed,
  } = useShieldLend();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const hasCollateral = position?.hasCollateral;

  const handleBorrow = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    if (!hasCollateral) return;
    setError(null);
    setTxHash(null);
    setStep(1);

    try {
      setStep(2);
      // MPC validation
      const result = await queueBorrowValidation(Number(amount), position);

      if (!result.isValid) {
        setError("MPC rejected: borrow would exceed 75% LTV. Reduce amount or add collateral.");
        setStep(0);
        return;
      }

      // MPC approved — finalise
      setStep(4);
      const tx = await finaliseBorrow(Number(amount), result.encRequested);
      setTxHash(tx);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Borrow failed");
      setStep(0);
    }
  };

  const isRunning = step > 0 && step < 4;
  const isDone = step === 4 && !!txHash;

  return (
    <div className="flex flex-col gap-4">
      {/* Step pipeline */}
      <div className="flex items-start gap-0">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center min-w-0">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all duration-300 ${
                  (step > s.id && !error) || isDone
                    ? "border-[#00c44f] bg-[#00c44f] text-[#080a08]"
                    : step === s.id && !error
                    ? s.id === 3
                      ? "border-[#00c44f] text-[#00c44f] animate-pulse"
                      : "border-[#00c44f] text-[#00c44f]"
                    : "border-[#1a2e1a] text-[#4a7a4a]"
                }`}
              >
                {(step > s.id && !error) || isDone ? "✓" : s.id === 3 ? "∞" : s.id}
              </div>
              <span
                className={`font-mono text-[8px] tracking-widest mt-1.5 text-center leading-tight ${
                  step >= s.id && !error ? "text-[#00c44f]" : "text-[#4a7a4a]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mt-2.5 mx-0.5 transition-all duration-500 ${
                  (step > s.id && !error) || isDone ? "bg-[#00c44f]" : "bg-[#1a2e1a]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* MPC status */}
      {step === 3 && (
        <div className="bg-[#080a08] border border-[#00c44f] rounded-sm px-3 py-2.5 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#00c44f] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#4a7a4a]">MPC COMPUTING</span>
              <span className="font-mono text-[10px] text-[#00c44f]">{mpcElapsed}s</span>
            </div>
            <p className="font-mono text-[9px] text-[#4a7a4a] mt-0.5">
              Arcium cluster evaluating LTV in encrypted state...
            </p>
          </div>
        </div>
      )}

      {/* Not enough collateral warning */}
      {!hasCollateral && (
        <div className="bg-[#f59e0b0a] border border-[#f59e0b33] rounded-sm px-3 py-2">
          <p className="font-mono text-[10px] text-[#f59e0b]">
            Deposit collateral first before borrowing.
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[10px] text-[#4a7a4a] uppercase tracking-widest flex items-center gap-1.5">
          <ArrowUpRightIcon size={10} color="#4a7a4a" />
          Borrow Amount (SOL)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0000"
            disabled={isRunning || !hasCollateral}
            className="w-full bg-[#080a08] border border-[#1a2e1a] text-[#e8f5e8] font-mono text-sm px-3 py-2.5 rounded-sm placeholder-[#1a2e1a] focus:outline-none focus:border-[#00c44f] transition-colors disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#4a7a4a]">
            SOL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <PrivacyBadge label="MPC validates LTV — no plaintext check" />
          <div className="flex gap-2">
            {["0.1", "0.25", "0.5"].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                disabled={isRunning}
                className="font-mono text-[9px] text-[#4a7a4a] border border-[#1a2e1a] px-1.5 py-0.5 rounded-sm hover:border-[#00c44f] hover:text-[#00c44f] transition-colors disabled:opacity-40"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LTV parameters info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2">
          <div className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">Max LTV</div>
          <div className="font-mono text-sm text-[#e8f5e8] mt-1">75%</div>
        </div>
        <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2">
          <div className="font-mono text-[9px] text-[#4a7a4a] uppercase tracking-widest">APR</div>
          <div className="font-mono text-sm text-[#e8f5e8] mt-1">5.00%</div>
        </div>
      </div>

      {/* Privacy explanation */}
      <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2.5">
        <div className="flex items-start gap-2">
          <LockIcon size={11} color="#00c44f" />
          <p className="font-mono text-[9px] text-[#4a7a4a] leading-relaxed">
            Your borrow is validated inside Arcium MPC. The cluster computes whether{" "}
            <span className="text-[#e8f5e8]">(borrow / collateral) ≤ 75%</span> on
            encrypted inputs — no node ever sees the plaintext values.
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleBorrow}
        disabled={isRunning || !amount || !publicKey || isDone || !hasCollateral}
        className="w-full bg-[#00c44f] text-[#080a08] font-bold tracking-widest uppercase text-xs py-3 rounded-sm hover:bg-[#00e85c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        onMouseEnter={(e) => { if (!isRunning && !isDone) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
        style={{ transition: "background-color 0.1s, transform 0.1s" }}
      >
        {isDone ? (
          <><CheckCircleIcon size={13} color="#080a08" /> Borrow Confirmed</>
        ) : isRunning ? (
          <>
            <div className="w-3 h-3 rounded-full border border-[#080a08] border-t-transparent animate-spin" />
            {step === 1 ? "Encrypting..." : step === 2 ? "Queuing MPC..." : step === 3 ? "MPC Computing..." : "Finalising..."}
          </>
        ) : (
          <><ArrowUpRightIcon size={13} color="#080a08" /> Borrow via MPC</>
        )}
      </button>

      {/* Error / status */}
      {error && (
        <div className="bg-[#ff3b3b0a] border border-[#ff3b3b33] rounded-sm px-3 py-2">
          <p className="font-mono text-[10px] text-[#ff3b3b]">{error}</p>
        </div>
      )}
      {isDone && txHash && (
        <TxStatus
          mpcStatus="done"
          txHash={txHash}
          onDismiss={() => { setStep(0); setTxHash(null); setAmount(""); }}
        />
      )}
    </div>
  );
}
