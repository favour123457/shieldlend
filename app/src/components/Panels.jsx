import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { INTEREST_RATE_BPS, LIQ_THRESHOLD_BPS, MAX_LTV_BPS } from "../lib/constants";
import { useShieldLend } from "../hooks/useShieldLend";
import { Check, Eye, Lock, Zap } from "./Icons";
import { AmountInput, GhostBtn, PrimaryBtn, PrivacyNotice } from "./ui";

const lamportsToSolNumber = (lamports) => Number(lamports || 0) / 1e9;

export function DepositPanel({ onSuccess }) {
  const { publicKey } = useWallet();
  const { depositCollateral } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [shieldNote, setShieldNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const handleDeposit = async () => {
    if (!amount || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const result = await depositCollateral(Number(amount));
      console.log("[ShieldLend UI] Deposit proof result", result);
      setShieldNote(result.shieldNote);
      setDone(true);
      onSuccess?.();
    } catch (err) {
      console.error("[ShieldLend UI] Deposit failed", err);
      setError(err.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ textAlign: "center", padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,196,79,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00c44f" }}><Check size={28} /></div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f0fdf4" }}>Deposit Confirmed</div>
      <div style={{ fontSize: 13, color: "#4d7c5e" }}>{amount} SOL encrypted with Arcium and transferred to the ShieldLend vault PDA on devnet.</div>
      <div style={{ width: "100%", maxWidth: 460, padding: "18px 20px", border: "1px solid rgba(0,196,79,0.24)", borderRadius: 12, background: "rgba(0,196,79,0.06)", textAlign: "left" }}>
        <div style={{ fontSize: 10, color: "#00c44f", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>Shielded receipt minted</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "#6aa878" }}>Received</span>
          <span style={{ fontSize: 22, color: "#f0fdf4", fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>{shieldNote?.amountSOL ?? amount} {shieldNote?.symbol || "shSOL"}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#4d7c5e", lineHeight: 1.6 }}>
          Backed 1:1 by vault SOL and stored as encrypted collateral receipt state in your position PDA.
        </div>
      </div>
      <GhostBtn onClick={() => { setDone(false); setAmount(""); setShieldNote(null); }}>New Deposit</GhostBtn>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Collateral Amount
        </label>
        <AmountInput value={amount} onChange={setAmount} disabled={loading} />
        <div className="quick-amount-row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["0.1", "0.5", "1.0", "2.0"].map(v => (
            <button key={v} onClick={() => setAmount(v)} style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6,
              color: "#4d7c5e", fontSize: 11, cursor: "pointer",
              fontFamily: "'Space Mono', monospace", transition: "all 0.15s",
            }}>{v}</button>
          ))}
        </div>
      </div>

      <PrivacyNotice text="Your SOL deposit is encrypted client-side and mints a 1:1 shSOL shielded collateral note inside your position PDA. The receipt backs borrowing without exposing the raw collateral amount in the app flow." />

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>
          Connect your wallet to deposit
        </div>
      ) : (
        <PrimaryBtn onClick={handleDeposit} disabled={!amount || Number(amount) <= 0} loading={loading}>
          <Lock size={15} /> Encrypt & Deposit
        </PrimaryBtn>
      )}
      {error && <div style={{ color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{error}</div>}
    </div>
  );
}

export function BorrowPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { queueBorrowValidation, finaliseBorrow } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState(null);
  const availableBorrowSOL = position ? lamportsToSolNumber(position.availableBorrowLamports) : 0;

  const handleBorrow = async () => {
    if (!amount || !publicKey) return;
    setError(null);
    setStage("validating");
    try {
      const result = await queueBorrowValidation(Number(amount));
      console.log("[ShieldLend UI] Borrow MPC result", result);
      if (!result.isValid) {
        setStage("rejected");
        setError("MPC rejected: borrow would exceed 75% LTV.");
        return;
      }
      await finaliseBorrow(Number(amount), result.encRequested);
      onSuccess?.();
      setStage("done");
    } catch (err) {
      console.error("[ShieldLend UI] Borrow failed", err);
      setStage("rejected");
      setError(err.message || "Borrow failed");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {stage === "validating" && (
        <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.06)", border: "1px solid rgba(0,196,79,0.3)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00c44f", animation: "pulse 1s infinite", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: "#86efac", fontWeight: 600, marginBottom: 4 }}>Private Check Running</div>
            <div style={{ fontSize: 12, color: "#4d7c5e" }}>Checking your borrow limit privately before releasing funds</div>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}>
          <div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Approved</div>
          <div style={{ color: "#4d7c5e", fontSize: 12 }}>LTV within safe limits. Borrow confirmed.</div>
        </div>
      )}
      {stage === "rejected" && error && (
        <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Borrow Amount
        </label>
        <AmountInput value={amount} onChange={setAmount} disabled={stage === "validating"} />
        {position && (
          <div className="amount-meta-row" style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>Available: {availableBorrowSOL.toFixed(4)} SOL</span>
            <button onClick={() => setAmount(availableBorrowSOL.toFixed(4))} style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6, color: "#86efac", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>Max</button>
          </div>
        )}
      </div>

      <div className="metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["Max LTV", `${Number(MAX_LTV_BPS) / 100}%`],
          ["Liq. Threshold", `${Number(LIQ_THRESHOLD_BPS) / 100}%`],
          ["Borrow APR", `${Number(INTEREST_RATE_BPS) / 100}%`],
          ["Privacy", "Encrypted"],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: "14px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(0,196,79,0.1)" }}>
            <div style={{ fontSize: 10, color: "#4d7c5e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{k}</div>
            <div style={{ fontSize: 15, color: "#86efac", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      <PrivacyNotice text="Borrow validation runs privately on encrypted values. The app only receives an approve or reject result." />

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>Connect your wallet to borrow</div>
      ) : (
        <PrimaryBtn onClick={handleBorrow} disabled={!amount || Number(amount) <= 0 || stage === "validating" || stage === "done"} loading={stage === "validating"}>
          <Zap size={15} /> Borrow Privately
        </PrimaryBtn>
      )}
    </div>
  );
}

export function RepayPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { repay } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle");
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);
  const hasBorrow = Boolean(position?.borrowLamports && BigInt(position.borrowLamports.toString()) > 0n);
  const borrowSOL = position ? lamportsToSolNumber(position.borrowLamportsNumber) : 0;

  const handleRepay = async () => {
    if (!amount || !publicKey) return;
    setError(null);
    setTx(null);
    setStage("repaying");
    try {
      const signature = await repay(Number(amount));
      console.log("[ShieldLend UI] Repay result", { tx: signature, amountSOL: Number(amount) });
      setTx(signature);
      setStage("done");
      onSuccess?.();
    } catch (err) {
      console.error("[ShieldLend UI] Repay failed", err);
      setError(err.message || "Repay failed");
      setStage("idle");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {!hasBorrow && <div style={{ padding: "16px", borderRadius: 10, background: "rgba(0,196,79,0.04)", border: "1px solid rgba(0,196,79,0.12)", color: "#4d7c5e", fontSize: 12 }}>No active borrow found in your position PDA.</div>}
      {stage === "done" && <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}><div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Repay Confirmed</div><div style={{ color: "#4d7c5e", fontSize: 12, wordBreak: "break-all" }}>{tx}</div></div>}
      {error && <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{error}</div>}
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>Repay Amount</label>
        <AmountInput value={amount} onChange={setAmount} disabled={stage === "repaying" || !hasBorrow} />
        {hasBorrow && (
          <div className="quick-amount-row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {[["25%", 0.25], ["50%", 0.5], ["100%", 1]].map(([label, pct]) => (
              <button key={label} onClick={() => setAmount((borrowSOL * pct).toFixed(4))} style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6, color: "#4d7c5e", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>{label}</button>
            ))}
          </div>
        )}
      </div>
      <PrivacyNotice text="Repay accounts for slot-based borrow interest, sends SOL back into the vault PDA, and stores a fresh encrypted borrow balance." />
      {!publicKey ? <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>Connect your wallet to repay</div> : (
        <PrimaryBtn onClick={handleRepay} disabled={!amount || Number(amount) <= 0 || stage === "repaying" || !hasBorrow} loading={stage === "repaying"}>Repay Borrow</PrimaryBtn>
      )}
    </div>
  );
}

export function WithdrawPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { withdrawCollateral } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle");
  const [tx, setTx] = useState(null);
  const [burnedNote, setBurnedNote] = useState(null);
  const [error, setError] = useState(null);
  const hasCollateral = Boolean(position?.collateralLamports && BigInt(position.collateralLamports.toString()) > 0n);
  const availableWithdrawSOL = !position
    ? 0
    : position.borrowLamportsNumber === 0
      ? lamportsToSolNumber(position.collateralLamportsNumber)
      : Math.max(0, lamportsToSolNumber(position.collateralLamportsNumber - Math.ceil((position.borrowLamportsNumber * 10_000) / Number(MAX_LTV_BPS))));

  const handleWithdraw = async () => {
    if (!amount || !publicKey) return;
    setError(null);
    setTx(null);
    setStage("withdrawing");
    try {
      const result = await withdrawCollateral(Number(amount));
      console.log("[ShieldLend UI] Withdraw result", { ...result, amountSOL: Number(amount) });
      setTx(result.tx);
      setBurnedNote(result.shieldNote);
      setStage("done");
      onSuccess?.();
    } catch (err) {
      console.error("[ShieldLend UI] Withdraw failed", err);
      setError(err.message || "Withdraw failed");
      setStage("idle");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {stage === "done" && <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}><div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Withdraw Confirmed</div><div style={{ color: "#6aa878", fontSize: 12, marginBottom: 8 }}>{burnedNote?.burnedAmountSOL ?? amount} {burnedNote?.symbol || "shSOL"} burned to redeem SOL.</div><div style={{ color: "#4d7c5e", fontSize: 12, wordBreak: "break-all" }}>{tx}</div></div>}
      {error && <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{error}</div>}
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>Withdraw Amount</label>
        <AmountInput value={amount} onChange={setAmount} disabled={stage === "withdrawing" || !hasCollateral} />
        {hasCollateral && (
          <div className="amount-meta-row" style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>Available: {availableWithdrawSOL.toFixed(4)} SOL</span>
            <button onClick={() => setAmount(availableWithdrawSOL.toFixed(4))} style={{ padding: "6px 14px", background: "transparent", border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6, color: "#86efac", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>Max</button>
          </div>
        )}
      </div>
      <PrivacyNotice text="Withdrawals burn the matching shSOL receipt note, redeem SOL from the vault, and are only allowed when the remaining shielded collateral keeps the position inside the max LTV limit." />
      {!publicKey ? <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>Connect your wallet to withdraw</div> : (
        <PrimaryBtn onClick={handleWithdraw} disabled={!amount || Number(amount) <= 0 || stage === "withdrawing" || !hasCollateral} loading={stage === "withdrawing"}>Withdraw Collateral</PrimaryBtn>
      )}
    </div>
  );
}

export function LiquidatePanel() {
  const { publicKey } = useWallet();
  const { checkLiquidatable } = useShieldLend();
  const [address, setAddress] = useState("");
  const [stage, setStage] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async () => {
    if (!address) return;
    setStage("checking");
    setResult(null);
    setError(null);
    try {
      const mpcResult = await checkLiquidatable(address);
      console.log("[ShieldLend UI] Liquidation MPC result", mpcResult);
      setResult({ liquidatable: mpcResult.isLiquidatable, tx: mpcResult.tx });
      setStage("done");
    } catch (err) {
      console.error("[ShieldLend UI] Liquidation check failed", err);
      setError(err.message || "Liquidation check failed");
      setStage("idle");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.04)", border: "1px solid rgba(0,196,79,0.12)" }}>
        <div style={{ fontSize: 13, color: "#86efac", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Eye size={14} /> Privacy-Preserving Liquidation
        </div>
        <p style={{ fontSize: 12, color: "#4d7c5e", lineHeight: 1.7, margin: 0 }}>
          Check whether a position is still healthy without showing the underlying collateral or debt amounts. Only a yes/no result is returned.
        </p>
      </div>
      {stage === "checking" && <div style={{ padding: "18px", borderRadius: 12, background: "rgba(0,196,79,0.06)", border: "1px solid rgba(0,196,79,0.3)", display: "flex", alignItems: "center", gap: 16 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00c44f", animation: "pulse 1s infinite", flexShrink: 0 }} /><div style={{ fontSize: 12, color: "#86efac" }}>Private health check running...</div></div>}
      {result && <div style={{ padding: "20px", borderRadius: 12, background: result.liquidatable ? "rgba(239,68,68,0.08)" : "rgba(0,196,79,0.08)", border: `1px solid ${result.liquidatable ? "rgba(239,68,68,0.4)" : "rgba(0,196,79,0.4)"}`, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: result.liquidatable ? "#ef4444" : "#00c44f", marginBottom: 8 }}>{result.liquidatable ? "LIQUIDATABLE" : "HEALTHY"}</div><div style={{ fontSize: 12, color: "#4d7c5e" }}>{result.liquidatable ? "Position exceeds 80% LTV threshold" : "Position is below 80% LTV threshold"}</div></div>}
      {error && <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{error}</div>}
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>Position Owner Address</label>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Enter Solana wallet address..."
          disabled={stage === "checking"}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,196,79,0.2)", borderRadius: 10, color: "#f0fdf4", fontSize: 13, fontFamily: "'Space Mono', monospace", padding: "16px 20px", outline: "none", opacity: stage === "checking" ? 0.5 : 1 }}
        />
        {publicKey && <button onClick={() => setAddress(publicKey.toBase58())} style={{ marginTop: 8, background: "none", border: "none", color: "#4d7c5e", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>Use my address</button>}
      </div>
      {!publicKey ? <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>Connect your wallet to run check</div> : (
        <PrimaryBtn onClick={handleCheck} disabled={!address || stage === "checking" || stage === "done"} loading={stage === "checking"}>Run Private Health Check</PrimaryBtn>
      )}
      {stage === "done" && <GhostBtn onClick={() => { setStage("idle"); setResult(null); setAddress(""); }}>Check Another</GhostBtn>}
    </div>
  );
}
