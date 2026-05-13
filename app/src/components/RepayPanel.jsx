import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShieldLend } from "../hooks/useShieldLend";
import TxStatus from "./TxStatus";
import PrivacyBadge from "./PrivacyBadge";
import { ArrowDownLeftIcon, LockIcon, CheckCircleIcon } from "./Icons";

export default function RepayPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { repay } = useShieldLend();

  const [amount, setAmount] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const hasBorrow = position?.hasBorrow;

  const handleRepay = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setError(null);
    setRunning(true);
    setDone(false);

    try {
      const tx = await repay(Number(amount));
      setTxHash(tx);
      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Repay failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* No borrow warning */}
      {!hasBorrow && (
        <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2">
          <p className="font-mono text-[10px] text-[#4a7a4a]">
            No active borrow to repay.
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[10px] text-[#4a7a4a] uppercase tracking-widest flex items-center gap-1.5">
          <ArrowDownLeftIcon size={10} color="#4a7a4a" />
          Repay Amount (SOL)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0000"
            disabled={running || !hasBorrow}
            className="w-full bg-[#080a08] border border-[#1a2e1a] text-[#e8f5e8] font-mono text-sm px-3 py-2.5 rounded-sm placeholder-[#1a2e1a] focus:outline-none focus:border-[#00c44f] transition-colors disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#4a7a4a]">
            SOL
          </span>
        </div>
        <div className="flex items-center justify-between">
          <PrivacyBadge label="New borrow balance encrypted before update" />
        </div>
      </div>

      {/* Note on how repay works */}
      <div className="bg-[#080a08] border border-[#1a2e1a] rounded-sm px-3 py-2.5">
        <div className="flex items-start gap-2">
          <LockIcon size={11} color="#00c44f" />
          <p className="font-mono text-[9px] text-[#4a7a4a] leading-relaxed">
            On repay, your new (reduced) borrow balance is encrypted client-side
            and stored on-chain as a fresh ciphertext. The actual remaining amount
            is never exposed as plaintext.
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleRepay}
        disabled={running || !amount || !publicKey || done || !hasBorrow}
        className="w-full bg-[#00c44f] text-[#080a08] font-bold tracking-widest uppercase text-xs py-3 rounded-sm hover:bg-[#00e85c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        onMouseEnter={(e) => { if (!running) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
        style={{ transition: "background-color 0.1s, transform 0.1s" }}
      >
        {done ? (
          <><CheckCircleIcon size={13} color="#080a08" /> Repaid</>
        ) : running ? (
          <><div className="w-3 h-3 rounded-full border border-[#080a08] border-t-transparent animate-spin" /> Repaying...</>
        ) : (
          <><ArrowDownLeftIcon size={13} color="#080a08" /> Repay</>
        )}
      </button>

      {error && (
        <div className="bg-[#ff3b3b0a] border border-[#ff3b3b33] rounded-sm px-3 py-2">
          <p className="font-mono text-[10px] text-[#ff3b3b]">{error}</p>
        </div>
      )}
      {done && txHash && (
        <TxStatus
          mpcStatus="done"
          txHash={txHash}
          onDismiss={() => { setDone(false); setTxHash(null); setAmount(""); }}
        />
      )}
    </div>
  );
}
