import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Lock, WalletIcon } from "./Icons";

export function StatCard({ value, label, sub, accent = false }) {
  return (
    <div className="stat-card" style={{
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

export function WalletBalancePill() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balanceSOL, setBalanceSOL] = useState(null);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalanceSOL(null);
      return;
    }
    const lamports = await connection.getBalance(publicKey, "confirmed");
    setBalanceSOL(lamports / 1e9);
  }, [connection, publicKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBalance().catch(() => setBalanceSOL(null));
    if (!publicKey) return undefined;
    const id = setInterval(() => {
      refreshBalance().catch(() => setBalanceSOL(null));
    }, 15_000);
    return () => clearInterval(id);
  }, [publicKey, refreshBalance]);

  return (
    <button
      className="wallet-balance-pill"
      onClick={() => refreshBalance().catch(() => setBalanceSOL(null))}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 13px",
        minHeight: 42,
        background: "rgba(0,196,79,0.07)",
        border: "1px solid rgba(0,196,79,0.22)",
        borderRadius: 8,
        color: "#86efac",
        fontFamily: "'Space Mono', monospace",
        cursor: connected ? "pointer" : "default",
      }}
      title="Refresh devnet wallet balance"
    >
      <WalletIcon size={16} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
        <span style={{ fontSize: 9, color: "#4d7c5e", letterSpacing: "0.12em", textTransform: "uppercase" }}>Wallet</span>
        <span style={{ fontSize: 13, fontWeight: 800 }}>
          {connected ? (balanceSOL === null ? "Reading..." : `${balanceSOL.toFixed(4)} SOL`) : "Not connected"}
        </span>
      </div>
    </button>
  );
}

export function AmountInput({ value, onChange, disabled, placeholder = "0.000" }) {
  return (
    <div className="amount-input-wrap" style={{ position: "relative" }}>
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
          fontSize: 28, fontFamily: "'Space Mono', monospace",
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

export function PrimaryBtn({ children, onClick, disabled, loading }) {
  return (
    <button
      className="primary-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "18px 24px",
        background: disabled || loading ? "rgba(0,196,79,0.2)" : "#00c44f",
        color: disabled || loading ? "#4d7c5e" : "#052210",
        border: "none", borderRadius: 10,
        fontSize: 15, fontWeight: 800,
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

export function GhostBtn({ children, onClick, active }) {
  return (
    <button
      className="ghost-btn"
      onClick={onClick}
      style={{
        padding: "12px 24px",
        background: active ? "rgba(0,196,79,0.12)" : "transparent",
        color: active ? "#00c44f" : "#4d7c5e",
        border: `1px solid ${active ? "rgba(0,196,79,0.4)" : "rgba(0,196,79,0.15)"}`,
        borderRadius: 8, fontSize: 13, fontWeight: 700,
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

export function PrivacyNotice({ text }) {
  return (
    <div className="privacy-notice" style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "14px 16px",
      background: "rgba(0,196,79,0.04)",
      border: "1px solid rgba(0,196,79,0.12)",
      borderRadius: 10,
    }}>
      <div style={{ color: "#00c44f", marginTop: 1, flexShrink: 0 }}><Lock size={14} /></div>
      <p style={{ fontSize: 13, color: "#6aa878", lineHeight: 1.65, margin: 0 }}>{text}</p>
    </div>
  );
}
