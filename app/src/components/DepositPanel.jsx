import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShieldLend } from "../hooks/useShieldLend";
import TxStatus from "./TxStatus";
import PrivacyBadge from "./PrivacyBadge";
import { DepositIcon, LockIcon, CheckCircleIcon } from "./Icons";

const STEPS = [
  { id: 1, label: "Encrypt", desc: "Amount encrypted client-side using x25519 + RescueCipher" },
  { id: 2, label: "Submit", desc: "Ciphertext stored on Solana — zero plaintext on-chain" },
  { id: 3, label: "Done", desc: "SOL held in protocol vault, encrypted balance recorded" },
];

export default function DepositPanel({ onSuccess }) {
  const { publicKey } = useWallet();
  const { depositCollateral, mpcElapsed } = useShieldLend();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(0); // 0 = idle, 1-3 = steps
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const handleDeposit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setError(null);
    setTxHash(null);
    setStep(1);

    try {
      setStep(2);
      const { tx } = await depositCollateral(Number(amount));
      setStep(3);
      setTxHash(tx);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Deposit failed");
      setStep(0);
    }
  };

  const isRunning = step > 0 && step < 3;
  const isDone = step === 3;

  return (
    <div className="flex flex-col gap-4">
      {/* Step flow diagram */}
      <div className="flex items-start gap-0">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-mono transition-all duration-300 ${
                  step > s.id || isDone
                    ? "border-[#00c44f] bg-[#00c44f] text-[#080a08]"
                    : step === s.id
                    ? "border-[#00c44f] text-[#00c44f] bg-transparent"
                    : "border-[#1a2e1a] text-[#4a7a4a] bg-transparent"
                }`}
              >
                {step > s.id || isDone ? "✓" : s.id}
              </div>
              <span
                className={`font-mono text-[8px] tracking-widest mt-1.5 text-center ${
                  step >= s.id ? "text-[#00c44f]" : "text-[#4a7a4a]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mt-2.5 mx-1 transition-all duration-500 ${
                  step > s.id || isDone ? "bg-[#00c44f]" : "bg-[#1a2e1a]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current step description */}
      {step > 0 && step <= 3 && (
        <div className="bg-[#080a08] border border-[#1a2e1a] px-3 py-2 rounded-sm">
          <p className="font-mono text-[10px] text-[#4a7a4a]">
            {STEPS[step - 1]?.desc}
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[10px] text-[#4a7a4a] uppercase tracking-widest flex items-center gap-1.5">
          <LockIcon size={10} color="#4a7a4a" />
          Collateral Amount (SOL)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0000"
            disabled={isRunning}
            className="w-full bg-[#080a08] border border-[#1a2e1a] text-[#e8f5e8] font-mono text-sm px-3 py-2.5 rounded-sm placeholder-[#1a2e1a] focus:outline-none focus:border-[#00c44f] transition-colors disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#4a7a4a]">
            SOL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <PrivacyBadge label="Will be encrypted before submission" />
          <div className="flex gap-2">
            {["0.1", "0.5", "1"].map((v) => (
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

      {/* Privacy note */}
      <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2.5">
        <div className="flex items-start gap-2">
          <LockIcon size={11} color="#00c44f" />
          <div>
            <p className="font-mono text-[9px] text-[#4a7a4a] leading-relaxed">
              Your deposit amount is encrypted using x25519 ECDH + RescueCipher before
              leaving your browser. Only an{" "}
              <span className="text-[#00c44f]">encrypted ciphertext</span> is stored
              on Solana — the actual amount is known only to you and the Arcium MPC cluster.
            </p>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleDeposit}
        disabled={isRunning || !amount || !publicKey || isDone}
        className="w-full bg-[#00c44f] text-[#080a08] font-bold tracking-widest uppercase text-xs py-3 rounded-sm hover:bg-[#00e85c] active:bg-[#00a843] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ transform: isRunning ? "none" : undefined, transition: "background-color 0.1s, transform 0.1s" }}
        onMouseEnter={(e) => { if (!isRunning && !isDone) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
      >
        {isDone ? (
          <>
            <CheckCircleIcon size={13} color="#080a08" />
            Deposit Confirmed
          </>
        ) : isRunning ? (
          <>
            <div className="w-3 h-3 rounded-full border border-[#080a08] border-t-transparent animate-spin" />
            {step === 1 ? "Encrypting..." : step === 2 ? "Submitting..." : "Processing..."}
          </>
        ) : (
          <>
            <DepositIcon size={13} color="#080a08" />
            Deposit Collateral
          </>
        )}
      </button>

      {/* Status display */}
      {(isRunning || isDone || error) && (
        <TxStatus
          mpcStatus={isRunning ? "submitting" : isDone ? "done" : "error"}
          mpcElapsed={mpcElapsed}
          error={error}
          txHash={txHash}
          onDismiss={() => {
            setStep(0);
            setError(null);
            setTxHash(null);
            setAmount("");
          }}
        />
      )}
    </div>
  );
}
