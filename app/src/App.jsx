import { useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { RPC_URL } from "./lib/constants";
import { useShieldLend } from "./hooks/useShieldLend";
import { usePosition } from "./hooks/usePosition";
import { formatSOL } from "./lib/arcium";
import { INTEREST_RATE_BPS, LIQ_THRESHOLD_BPS, MAX_LTV_BPS, RESERVE_FEE_BPS } from "./lib/constants";

const lamportsToSolNumber = (lamports) => Number(lamports || 0) / 1e9;

// ── Icons ────────────────────────────────────────────────────
const Shield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const Lock = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const Eye = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const Zap = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const Check = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ value, label, sub, accent = false }) {
  return (
    <div style={{
      background: "rgba(0,196,79,0.04)",
      border: "1px solid rgba(0,196,79,0.15)",
      borderRadius: 12,
      padding: "28px 24px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        fontSize: 38, fontWeight: 700, letterSpacing: "-1px",
        color: accent ? "#00c44f" : "#f0fdf4",
        fontFamily: "'Space Mono', monospace",
      }}>{value}</div>
      <div style={{ fontSize: 13, color: "#86efac", fontWeight: 600, letterSpacing: "0.05em" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#4d7c5e", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Circuit Badge ─────────────────────────────────────────────
function CircuitBadge({ name, desc, active }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px",
      background: active ? "rgba(0,196,79,0.08)" : "rgba(0,196,79,0.03)",
      border: `1px solid ${active ? "rgba(0,196,79,0.4)" : "rgba(0,196,79,0.1)"}`,
      borderRadius: 10,
      transition: "all 0.2s",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "#00c44f",
        boxShadow: active ? "0 0 8px #00c44f" : "none",
        animation: active ? "pulse 2s infinite" : "none",
      }} />
      <div>
        <div style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#86efac", marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: "#4d7c5e" }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────
function AmountInput({ value, onChange, disabled, placeholder = "0.000" }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(0,196,79,0.2)",
          borderRadius: 10,
          color: "#f0fdf4",
          fontSize: 22, fontFamily: "'Space Mono', monospace",
          fontWeight: 700, padding: "18px 72px 18px 20px",
          outline: "none", transition: "border-color 0.2s",
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={e => e.target.style.borderColor = "rgba(0,196,79,0.6)"}
        onBlur={e => e.target.style.borderColor = "rgba(0,196,79,0.2)"}
      />
      <span style={{
        position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
        fontSize: 13, color: "#4d7c5e", fontFamily: "'Space Mono', monospace",
      }}>SOL</span>
    </div>
  );
}

// ── Primary Button ────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "18px 24px",
        background: disabled || loading ? "rgba(0,196,79,0.2)" : "#00c44f",
        color: disabled || loading ? "#4d7c5e" : "#052210",
        border: "none", borderRadius: 10,
        fontSize: 14, fontWeight: 800,
        letterSpacing: "0.12em", textTransform: "uppercase",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        transition: "all 0.15s", fontFamily: "'Space Mono', monospace",
      }}
      onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.background = "#00e85c"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.background = disabled ? "rgba(0,196,79,0.2)" : "#00c44f"; e.currentTarget.style.transform = "none"; }}
    >
      {loading && <div style={{ width: 16, height: 16, border: "2px solid #052210", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

// ── Ghost Button ──────────────────────────────────────────────
function GhostBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 24px",
        background: active ? "rgba(0,196,79,0.12)" : "transparent",
        color: active ? "#00c44f" : "#4d7c5e",
        border: `1px solid ${active ? "rgba(0,196,79,0.4)" : "rgba(0,196,79,0.15)"}`,
        borderRadius: 8, fontSize: 12, fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase",
        cursor: "pointer", transition: "all 0.15s",
        fontFamily: "'Space Mono', monospace",
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#86efac"; e.currentTarget.style.borderColor = "rgba(0,196,79,0.3)"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#4d7c5e"; e.currentTarget.style.borderColor = "rgba(0,196,79,0.15)"; } }}
    >
      {children}
    </button>
  );
}

// ── Privacy Notice ────────────────────────────────────────────
function PrivacyNotice({ text }) {
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "14px 16px",
      background: "rgba(0,196,79,0.04)",
      border: "1px solid rgba(0,196,79,0.12)",
      borderRadius: 10,
    }}>
      <div style={{ color: "#00c44f", marginTop: 1, flexShrink: 0 }}><Lock size={14} /></div>
      <p style={{ fontSize: 12, color: "#4d7c5e", lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Deposit Panel ─────────────────────────────────────────────
function DepositPanel({ onSuccess }) {
  const { publicKey } = useWallet();
  const { depositCollateral } = useShieldLend();
  const [amount, setAmount] = useState("");
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
      <div style={{ fontSize: 13, color: "#4d7c5e" }}>{amount} SOL encrypted with Arcium and transferred to the ShieldLend vault PDA on devnet. Check console logs for proof.</div>
      <GhostBtn onClick={() => { setDone(false); setAmount(""); }}>New Deposit</GhostBtn>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Collateral Amount
        </label>
        <AmountInput value={amount} onChange={setAmount} disabled={loading} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["0.1", "0.5", "1.0", "2.0"].map(v => (
            <button key={v} onClick={() => setAmount(v)} style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6,
              color: "#4d7c5e", fontSize: 11, cursor: "pointer",
              fontFamily: "'Space Mono', monospace", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,196,79,0.5)"; e.currentTarget.style.color = "#86efac"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,196,79,0.2)"; e.currentTarget.style.color = "#4d7c5e"; }}
            >{v}</button>
          ))}
        </div>
      </div>

      <PrivacyNotice text="Your deposit is encrypted client-side using x25519 ECDH + RescueCipher before leaving your browser. Only a ciphertext is stored on Solana — the actual amount is private." />

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

// ── Borrow Panel ──────────────────────────────────────────────
function BorrowPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { queueBorrowValidation, finaliseBorrow } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle"); // idle | validating | done | rejected
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
        <div style={{
          padding: "20px", borderRadius: 12,
          background: "rgba(0,196,79,0.06)", border: "1px solid rgba(0,196,79,0.3)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00c44f", animation: "pulse 1s infinite", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: "#86efac", fontWeight: 600, marginBottom: 4 }}>MPC Computing</div>
            <div style={{ fontSize: 12, color: "#4d7c5e" }}>validate_borrow circuit running on Arcium cluster — LTV check in encrypted state</div>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}>
          <div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>✓ MPC Approved</div>
          <div style={{ color: "#4d7c5e", fontSize: 12 }}>LTV within safe limits — borrow confirmed</div>
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
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>
              Available: {availableBorrowSOL.toFixed(4)} SOL
            </span>
            <button onClick={() => setAmount(availableBorrowSOL.toFixed(4))} style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6,
              color: "#86efac", fontSize: 11, cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}>Max</button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["Max LTV", `${Number(MAX_LTV_BPS) / 100}%`],
          ["Liq. Threshold", `${Number(LIQ_THRESHOLD_BPS) / 100}%`],
          ["Borrow APR", `${Number(INTEREST_RATE_BPS) / 100}%`],
          ["Circuit", "validate_borrow"],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: "14px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(0,196,79,0.1)" }}>
            <div style={{ fontSize: 10, color: "#4d7c5e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{k}</div>
            <div style={{ fontSize: 15, color: "#86efac", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      <PrivacyNotice text="LTV validation runs inside Arcium MPC on encrypted values. No node sees your plaintext collateral or borrow amount — only a binary valid/invalid result is returned." />

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>
          Connect your wallet to borrow
        </div>
      ) : (
        <PrimaryBtn onClick={handleBorrow} disabled={!amount || Number(amount) <= 0 || stage === "validating" || stage === "done"} loading={stage === "validating"}>
          <Zap size={15} /> Borrow via MPC
        </PrimaryBtn>
      )}
    </div>
  );
}

// ── Repay Panel ──────────────────────────────────────────────
function RepayPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { repay } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle");
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);

  const hasBorrow = Boolean(position?.borrowLamports && BigInt(position.borrowLamports.toString()) > 0n);
  const borrowSOL = position ? lamportsToSolNumber(position.borrowLamportsNumber) : 0;

  const setRepayPercent = (pct) => {
    if (!borrowSOL) return;
    setAmount((borrowSOL * pct).toFixed(4));
  };

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
      {!hasBorrow && (
        <div style={{ padding: "16px", borderRadius: 10, background: "rgba(0,196,79,0.04)", border: "1px solid rgba(0,196,79,0.12)", color: "#4d7c5e", fontSize: 12 }}>
          No active borrow found in your position PDA.
        </div>
      )}

      {stage === "done" && (
        <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}>
          <div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Repay Confirmed</div>
          <div style={{ color: "#4d7c5e", fontSize: 12, wordBreak: "break-all" }}>{tx}</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Repay Amount
        </label>
        <AmountInput value={amount} onChange={setAmount} disabled={stage === "repaying" || !hasBorrow} />
        {hasBorrow && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {[
              ["25%", 0.25],
              ["50%", 0.5],
              ["100%", 1],
            ].map(([label, pct]) => (
              <button key={label} onClick={() => setRepayPercent(pct)} style={{
                padding: "6px 14px", background: "transparent",
                border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6,
                color: "#4d7c5e", fontSize: 11, cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <PrivacyNotice text="Repay first accounts for slot-based borrow interest, then sends SOL back into the vault PDA and stores a fresh encrypted borrow-balance ciphertext." />

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>
          Connect your wallet to repay
        </div>
      ) : (
        <PrimaryBtn onClick={handleRepay} disabled={!amount || Number(amount) <= 0 || stage === "repaying" || !hasBorrow} loading={stage === "repaying"}>
          Repay Borrow
        </PrimaryBtn>
      )}
    </div>
  );
}

// ── Withdraw Panel ───────────────────────────────────────────
function WithdrawPanel({ position, onSuccess }) {
  const { publicKey } = useWallet();
  const { withdrawCollateral } = useShieldLend();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("idle");
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);

  const hasCollateral = Boolean(position?.collateralLamports && BigInt(position.collateralLamports.toString()) > 0n);
  const availableWithdrawSOL = !position
    ? 0
    : position.borrowLamportsNumber === 0
      ? lamportsToSolNumber(position.collateralLamportsNumber)
      : Math.max(
          0,
          lamportsToSolNumber(position.collateralLamportsNumber - Math.ceil((position.borrowLamportsNumber * 10_000) / Number(MAX_LTV_BPS)))
        );

  const handleWithdraw = async () => {
    if (!amount || !publicKey) return;
    setError(null);
    setTx(null);
    setStage("withdrawing");
    try {
      const signature = await withdrawCollateral(Number(amount));
      console.log("[ShieldLend UI] Withdraw result", { tx: signature, amountSOL: Number(amount) });
      setTx(signature);
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
      {stage === "done" && (
        <div style={{ padding: "20px", borderRadius: 12, background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.4)", textAlign: "center" }}>
          <div style={{ color: "#00c44f", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Withdraw Confirmed</div>
          <div style={{ color: "#4d7c5e", fontSize: 12, wordBreak: "break-all" }}>{tx}</div>
        </div>
      )}

      {error && (
        <div style={{ padding: "16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Withdraw Amount
        </label>
        <AmountInput value={amount} onChange={setAmount} disabled={stage === "withdrawing" || !hasCollateral} />
        {hasCollateral && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>
              Available: {availableWithdrawSOL.toFixed(4)} SOL
            </span>
            <button onClick={() => setAmount(availableWithdrawSOL.toFixed(4))} style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid rgba(0,196,79,0.2)", borderRadius: 6,
              color: "#86efac", fontSize: 11, cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}>Max</button>
          </div>
        )}
      </div>

      <PrivacyNotice text="Withdrawals are only allowed when the remaining collateral keeps the position inside the max LTV limit." />

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>
          Connect your wallet to withdraw
        </div>
      ) : (
        <PrimaryBtn onClick={handleWithdraw} disabled={!amount || Number(amount) <= 0 || stage === "withdrawing" || !hasCollateral} loading={stage === "withdrawing"}>
          Withdraw Collateral
        </PrimaryBtn>
      )}
    </div>
  );
}

// ── Liquidate Panel ───────────────────────────────────────────
function LiquidatePanel() {
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
          The check_liquidatable circuit computes LTV entirely inside Arcium MPC on encrypted data.
          Only a yes/no result is returned — no position details are ever exposed.
        </p>
      </div>

      {stage === "checking" && (
        <div style={{
          padding: "18px", borderRadius: 12,
          background: "rgba(0,196,79,0.06)", border: "1px solid rgba(0,196,79,0.3)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00c44f", animation: "pulse 1s infinite", flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: "#86efac" }}>check_liquidatable circuit running on Arcium cluster...</div>
        </div>
      )}

      {result && (
        <div style={{
          padding: "20px", borderRadius: 12,
          background: result.liquidatable ? "rgba(239,68,68,0.08)" : "rgba(0,196,79,0.08)",
          border: `1px solid ${result.liquidatable ? "rgba(239,68,68,0.4)" : "rgba(0,196,79,0.4)"}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: result.liquidatable ? "#ef4444" : "#00c44f", marginBottom: 8 }}>
            {result.liquidatable ? "⚠ LIQUIDATABLE" : "✓ HEALTHY"}
          </div>
          <div style={{ fontSize: 12, color: "#4d7c5e" }}>
            {result.liquidatable ? "Position exceeds 80% LTV threshold" : "Position is below 80% LTV threshold"}
          </div>
        </div>
      )}
      {error && (
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
          {error}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#4d7c5e", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Space Mono', monospace" }}>
          Position Owner Address
        </label>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Enter Solana wallet address..."
          disabled={stage === "checking"}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(0,196,79,0.2)",
            borderRadius: 10, color: "#f0fdf4",
            fontSize: 13, fontFamily: "'Space Mono', monospace",
            padding: "16px 20px", outline: "none",
            opacity: stage === "checking" ? 0.5 : 1,
          }}
        />
        {publicKey && (
          <button onClick={() => setAddress(publicKey.toBase58())}
            style={{ marginTop: 8, background: "none", border: "none", color: "#4d7c5e", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
            → Use my address
          </button>
        )}
      </div>

      {!publicKey ? (
        <div style={{ textAlign: "center", padding: "16px", color: "#4d7c5e", fontSize: 13, border: "1px dashed rgba(0,196,79,0.2)", borderRadius: 10 }}>
          Connect your wallet to run check
        </div>
      ) : (
        <PrimaryBtn onClick={handleCheck} disabled={!address || stage === "checking" || stage === "done"} loading={stage === "checking"}>
          Run MPC Health Check
        </PrimaryBtn>
      )}

      {stage === "done" && (
        <GhostBtn onClick={() => { setStage("idle"); setResult(null); setAddress(""); }}>Check Another</GhostBtn>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
function ShieldLendApp() {
  const { connected } = useWallet();
  const { position, protocolState, refresh } = usePosition();
  const { getRecentActions } = useShieldLend();
  const [activeTab, setActiveTab] = useState("deposit");
  const [showApp, setShowApp] = useState(false);

  const TABS = [
    { key: "deposit", label: "Deposit" },
    { key: "borrow", label: "Borrow" },
    { key: "repay", label: "Repay" },
    { key: "withdraw", label: "Withdraw" },
    { key: "liquidate", label: "Liquidate" },
  ];

  const healthLabel = !position || position.borrowLamportsNumber === 0
    ? "No debt"
    : position.healthFactor >= 1.5
      ? "Healthy"
      : position.healthFactor >= 1.1
        ? "Watch"
        : "Risky";

  const positionRows = position
    ? [
        ["Collateral", formatSOL(position.collateralLamports)],
        ["Borrow", formatSOL(position.borrowLamports)],
        ["Available", formatSOL(position.availableBorrowLamports)],
        ["LTV", `${(position.ltvBps / 100).toFixed(2)}%`],
        ["Health", position.healthFactor === Infinity ? "∞" : position.healthFactor.toFixed(2)],
        ["Last Slot", position.lastUpdateSlot?.toString?.() || "—"],
        ["Status", healthLabel],
      ]
    : [["Collateral", "—"], ["Borrow", "—"], ["Available", "—"], ["LTV", "—"], ["Health", "—"], ["Last Slot", "—"], ["Status", "—"]];

  const protocolRows = [
    ["Total Deposits", protocolState ? `${protocolState.totalDepositsSOL.toFixed(4)} SOL` : "—"],
    ["Total Borrows", protocolState ? `${protocolState.totalBorrowsSOL.toFixed(4)} SOL` : "—"],
    ["Reserve Fee", `${Number(RESERVE_FEE_BPS) / 100}% interest`],
    ["APR", `${Number(INTEREST_RATE_BPS) / 100}%`],
    ["Max LTV", `${Number(MAX_LTV_BPS) / 100}%`],
  ];
  const recentActions = getRecentActions();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050d07",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#f0fdf4",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,196,79,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,196,79,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        pointerEvents: "none",
      }} />

      {/* Glow blobs */}
      <div style={{ position: "fixed", top: "-20%", left: "60%", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,196,79,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-10%", left: "-10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,196,79,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: "1px solid rgba(0,196,79,0.12)",
        background: "rgba(5,13,7,0.8)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: "#00c44f" }}><Shield /></div>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>Shield</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", color: "#00c44f" }}>Lend</span>
            </div>
            <div style={{
              fontSize: 10, padding: "3px 10px",
              background: "rgba(0,196,79,0.1)", border: "1px solid rgba(0,196,79,0.3)",
              borderRadius: 20, color: "#00c44f", letterSpacing: "0.1em",
              fontFamily: "'Space Mono', monospace",
            }}>DEVNET</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 16 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c44f", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>Arcium MPC Live · Cluster 456</span>
            </div>
            <WalletMultiButton style={{
              background: "#00c44f", color: "#052210",
              fontSize: 12, fontWeight: 700, borderRadius: 8,
              padding: "10px 20px", border: "none",
            }} />
          </div>
        </div>
      </div>

      {/* Hero */}
      {!showApp && (
        <div style={{ paddingTop: 64, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px 60px", width: "100%" }}>

            {/* Tag */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.25)", borderRadius: 20, marginBottom: 40 }}>
              <Lock size={12} />
              <span style={{ fontSize: 12, color: "#86efac", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}>BUILT ON ARCIUM MPC NETWORK</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 28, maxWidth: 800 }}>
              Lend & Borrow<br />
              <span style={{ color: "#00c44f" }}>Completely Private</span>
            </h1>

            <p style={{ fontSize: 18, color: "#4d7c5e", lineHeight: 1.7, maxWidth: 560, marginBottom: 48 }}>
              ShieldLend is the first Solana lending protocol where collateral, borrow amounts, and health factors are
              all encrypted inside <strong style={{ color: "#86efac" }}>Arcium's MPC cluster</strong>.
              Zero plaintext on-chain.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 80 }}>
              <button
                onClick={() => setShowApp(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "18px 36px", background: "#00c44f",
                  color: "#052210", border: "none", borderRadius: 12,
                  fontSize: 15, fontWeight: 800, cursor: "pointer",
                  letterSpacing: "0.05em", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#00e85c"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#00c44f"; e.currentTarget.style.transform = "none"; }}
              >
                Launch App <ArrowRight size={18} />
              </button>
              <a
                href="https://docs.arcium.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "18px 36px",
                  background: "transparent",
                  color: "#86efac", border: "1px solid rgba(0,196,79,0.3)", borderRadius: 12,
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                  textDecoration: "none", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,196,79,0.6)"; e.currentTarget.style.background = "rgba(0,196,79,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,196,79,0.3)"; e.currentTarget.style.background = "transparent"; }}
              >
                How It Works
              </a>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 80 }}>
              <StatCard value="3" label="MPC Circuits" sub="check_liquidatable · validate_borrow · apply_interest" accent />
              <StatCard value="75%" label="Max LTV" sub="Liq. threshold: 80%" />
              <StatCard value="5%" label="Borrow APR" sub="Fixed rate, MPC interest calc." />
              <StatCard value="4" label="Recovery Nodes" sub="Cluster offset 456 · Arcium devnet" />
            </div>

            {/* How it works */}
            <div style={{ marginBottom: 80 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 40 }}>
                How <span style={{ color: "#00c44f" }}>Privacy Works</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                {[
                  { step: "01", title: "Encrypt Client-Side", body: "Your collateral and borrow amounts are encrypted in your browser using x25519 ECDH + RescueCipher before any data leaves your device." },
                  { step: "02", title: "Store Ciphertext On-Chain", body: "Only the encrypted ciphertext is written to Solana. No plaintext amounts are ever stored on-chain or visible to block explorers." },
                  { step: "03", title: "MPC Computes in Secret", body: "LTV validation, interest accrual, and liquidation checks all run inside Arcium's encrypted MPC cluster — no node sees plaintext." },
                  { step: "04", title: "Encrypted Result Back to You", body: "Results are re-encrypted to your session key and returned on-chain. Only you can decrypt them using your ephemeral private key." },
                ].map(({ step, title, body }) => (
                  <div key={step} style={{
                    padding: "28px 24px",
                    background: "rgba(0,196,79,0.03)",
                    border: "1px solid rgba(0,196,79,0.12)",
                    borderRadius: 14,
                  }}>
                    <div style={{ fontSize: 11, color: "#00c44f", fontFamily: "'Space Mono', monospace", marginBottom: 14, letterSpacing: "0.1em" }}>STEP {step}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#f0fdf4" }}>{title}</div>
                    <p style={{ fontSize: 13, color: "#4d7c5e", lineHeight: 1.7, margin: 0 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Circuits */}
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>
                MPC <span style={{ color: "#00c44f" }}>Circuits</span>
              </h2>
              <p style={{ fontSize: 14, color: "#4d7c5e", marginBottom: 32 }}>Three encrypted circuits power all protocol logic</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <CircuitBadge name="check_liquidatable" desc="Computes LTV health check on encrypted collateral + borrow. Returns binary: liquidatable or healthy." active />
                <CircuitBadge name="validate_borrow" desc="Validates a new borrow request against the 75% LTV ceiling using encrypted position data." active />
                <CircuitBadge name="apply_interest" desc="Applies simple interest accrual to encrypted borrow balance without revealing the amount." active />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Panel */}
      {showApp && (
        <div style={{ paddingTop: 64, minHeight: "100vh", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px" }}>

            {/* Back */}
            <button onClick={() => setShowApp(false)} style={{
              background: "none", border: "none", color: "#4d7c5e", fontSize: 13,
              cursor: "pointer", marginBottom: 32, display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Space Mono', monospace",
            }}>← Back to overview</button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>

              {/* Left: main panel */}
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  {TABS.map(t => (
                    <GhostBtn key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                      {t.label}
                    </GhostBtn>
                  ))}
                </div>

                <div style={{
                  background: "rgba(0,196,79,0.03)",
                  border: "1px solid rgba(0,196,79,0.15)",
                  borderRadius: 16, padding: 32,
                }}>
                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
                      {activeTab === "deposit" && "Deposit Collateral"}
                      {activeTab === "borrow" && "Borrow Against Collateral"}
                      {activeTab === "repay" && "Repay Borrow"}
                      {activeTab === "withdraw" && "Withdraw Collateral"}
                      {activeTab === "liquidate" && "Liquidation Check"}
                    </h2>
                    <p style={{ fontSize: 13, color: "#4d7c5e", margin: 0 }}>
                      {activeTab === "deposit" && "Encrypted client-side before hitting Solana"}
                      {activeTab === "borrow" && "MPC validates LTV — no plaintext exposed"}
                      {activeTab === "repay" && "Transfer SOL back into the vault and update your position PDA"}
                      {activeTab === "withdraw" && "Return collateral only when your position remains healthy"}
                      {activeTab === "liquidate" && "Privacy-preserving health factor check"}
                    </p>
                  </div>

                  {activeTab === "deposit" && <DepositPanel onSuccess={refresh} />}
                  {activeTab === "borrow" && <BorrowPanel position={position} onSuccess={refresh} />}
                  {activeTab === "repay" && <RepayPanel position={position} onSuccess={refresh} />}
                  {activeTab === "withdraw" && <WithdrawPanel position={position} onSuccess={refresh} />}
                  {activeTab === "liquidate" && <LiquidatePanel />}
                </div>
              </div>

              {/* Right: info sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Position */}
                <div style={{ background: "rgba(0,196,79,0.03)", border: "1px solid rgba(0,196,79,0.15)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,196,79,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4" }}>My Position</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c44f" }} />
                      <span style={{ fontSize: 10, color: "#00c44f", fontFamily: "'Space Mono', monospace" }}>ENCRYPTED</span>
                    </div>
                  </div>
                  {!connected ? (
                    <div style={{ padding: "32px 24px", textAlign: "center", color: "#4d7c5e", fontSize: 13 }}>
                      Connect wallet to view your encrypted position
                    </div>
                  ) : (
                    <div style={{ padding: "16px 24px" }}>
                      {positionRows.map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(0,196,79,0.08)" }}>
                          <span style={{ fontSize: 11, color: "#4d7c5e", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}>{k}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "#86efac", fontFamily: "'Space Mono', monospace" }}>{v}</span>
                            {k === "Collateral" && position?.collateralHex !== "—" && <Eye size={10} style={{ color: "#4d7c5e" }} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Protocol stats */}
                <div style={{ background: "rgba(0,196,79,0.03)", border: "1px solid rgba(0,196,79,0.15)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,196,79,0.12)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4" }}>Protocol</span>
                  </div>
                  <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {protocolRows.map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#4d7c5e" }}>{k}</span>
                        <span style={{ fontSize: 12, color: "#86efac", fontFamily: "'Space Mono', monospace" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active circuits */}
                <div style={{ background: "rgba(0,196,79,0.03)", border: "1px solid rgba(0,196,79,0.15)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,196,79,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c44f", animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4" }}>MPC Circuits</span>
                  </div>
                  <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {["check_liquidatable", "validate_borrow", "apply_interest"].map(c => (
                      <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(0,196,79,0.06)" }}>
                        <Check size={12} style={{ color: "#00c44f" }} />
                        <span style={{ fontSize: 11, color: "#86efac", fontFamily: "'Space Mono', monospace" }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div style={{ background: "rgba(0,196,79,0.03)", border: "1px solid rgba(0,196,79,0.15)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,196,79,0.12)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4" }}>Recent Activity</span>
                  </div>
                  <div style={{ padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentActions.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#4d7c5e" }}>No actions this session</div>
                    ) : recentActions.slice(0, 5).map((item) => (
                      <div key={`${item.action}-${item.at}`} style={{ padding: "10px 0", borderBottom: "1px solid rgba(0,196,79,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "#86efac", fontFamily: "'Space Mono', monospace" }}>{item.action}</span>
                          <span style={{ fontSize: 11, color: "#4d7c5e", fontFamily: "'Space Mono', monospace" }}>{item.amountSOL} SOL</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#2d4a35", fontFamily: "'Space Mono', monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.tx}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(0,196,79,0.1)",
        padding: "24px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1200, margin: "0 auto",
        position: "relative", zIndex: 1,
      }}>
        <span style={{ fontSize: 12, color: "#4d7c5e" }}>Powered by <a href="https://arcium.com" style={{ color: "#86efac" }}>Arcium MPC</a></span>
        <span style={{ fontSize: 11, color: "#2d4a35", fontFamily: "'Space Mono', monospace" }}>Cluster Offset: 456 · Recovery: 4 nodes</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #050d07; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input::placeholder { color: #2d4a35; }
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button { -webkit-appearance:none; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050d07; } ::-webkit-scrollbar-thumb { background: #1a3a22; border-radius: 2px; }
      `}</style>
    </div>
  );
}

export default function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ShieldLendApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
