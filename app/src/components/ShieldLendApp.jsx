import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { INTEREST_RATE_BPS, MAX_LTV_BPS, RESERVE_FEE_BPS } from "../lib/constants";
import { formatSOL } from "../lib/arcium";
import { usePosition } from "../hooks/usePosition";
import { useShieldLend } from "../hooks/useShieldLend";
import { ArrowRight, ShieldLendMark, WalletIcon } from "./Icons";
import { BorrowPanel, DepositPanel, LiquidatePanel, RepayPanel, WithdrawPanel } from "./Panels";
import { GhostBtn, StatCard, WalletBalancePill } from "./ui";

export default function ShieldLendApp() {
  const { connected } = useWallet();
  const { position, protocolState, refresh } = usePosition();
  const { getRecentActions } = useShieldLend();
  const [activeTab, setActiveTab] = useState("deposit");
  const [showApp, setShowApp] = useState(false);

  const tabs = [
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
        ["Health", position.healthFactor === Infinity ? "infinite" : position.healthFactor.toFixed(2)],
        ["Last Slot", position.lastUpdateSlot?.toString?.() || "-"],
        ["Status", healthLabel],
      ]
    : [["Collateral", "-"], ["Borrow", "-"], ["Available", "-"], ["LTV", "-"], ["Health", "-"], ["Last Slot", "-"], ["Status", "-"]];

  const protocolRows = [
    ["Total Deposits", protocolState ? `${protocolState.totalDepositsSOL.toFixed(4)} SOL` : "-"],
    ["Total Borrows", protocolState ? `${protocolState.totalBorrowsSOL.toFixed(4)} SOL` : "-"],
    ["Reserve Fee", `${Number(RESERVE_FEE_BPS) / 100}% interest`],
    ["APR", `${Number(INTEREST_RATE_BPS) / 100}%`],
    ["Max LTV", `${Number(MAX_LTV_BPS) / 100}%`],
  ];

  const protocolSummary = [
    {
      label: "Private Collateral",
      value: position ? formatSOL(position.collateralLamports) : "-",
      caption: "Encrypted position PDA",
    },
    {
      label: "Borrow Capacity",
      value: position ? formatSOL(position.availableBorrowLamports) : "-",
      caption: `${Number(MAX_LTV_BPS) / 100}% max LTV`,
    },
    {
      label: "Health Factor",
      value: position ? (position.healthFactor === Infinity ? "infinite" : position.healthFactor.toFixed(2)) : "-",
      caption: "Higher is safer",
    },
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
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,196,79,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,196,79,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        pointerEvents: "none",
      }} />

      <TopBar />

      {!showApp && (
        <Hero onLaunch={() => setShowApp(true)} />
      )}

      {showApp && (
        <div style={{ paddingTop: 64, minHeight: "100vh", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1360, margin: "0 auto", padding: "48px 32px" }}>
            <button onClick={() => setShowApp(false)} style={{
              background: "none", border: "none", color: "#4d7c5e", fontSize: 13,
              cursor: "pointer", marginBottom: 32, display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Space Mono', monospace",
            }}>Back to overview</button>

            <LiveDeskSummary protocolSummary={protocolSummary} />

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 34, alignItems: "start" }}>
              <main>
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                  {tabs.map(t => (
                    <GhostBtn key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                      {t.label}
                    </GhostBtn>
                  ))}
                </div>

                <section style={{
                  background: "rgba(0,196,79,0.035)",
                  border: "1px solid rgba(0,196,79,0.15)",
                  borderRadius: 16, padding: 34,
                }}>
                  <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontSize: 29, fontWeight: 900, marginBottom: 8 }}>
                      {activeTab === "deposit" && "Deposit Collateral"}
                      {activeTab === "borrow" && "Borrow Against Collateral"}
                      {activeTab === "repay" && "Repay Borrow"}
                      {activeTab === "withdraw" && "Withdraw Collateral"}
                      {activeTab === "liquidate" && "Liquidation Check"}
                    </h2>
                    <p style={{ fontSize: 15, color: "#6aa878", lineHeight: 1.55, margin: 0 }}>
                      {activeTab === "deposit" && "Encrypted client-side before hitting Solana"}
                      {activeTab === "borrow" && "Private validation before funds leave the vault"}
                      {activeTab === "repay" && "Transfer SOL back into the vault and update your position"}
                      {activeTab === "withdraw" && "Return collateral only when your position remains healthy"}
                      {activeTab === "liquidate" && "Privacy-preserving health factor check"}
                    </p>
                  </div>

                  {activeTab === "deposit" && <DepositPanel onSuccess={refresh} />}
                  {activeTab === "borrow" && <BorrowPanel position={position} onSuccess={refresh} />}
                  {activeTab === "repay" && <RepayPanel position={position} onSuccess={refresh} />}
                  {activeTab === "withdraw" && <WithdrawPanel position={position} onSuccess={refresh} />}
                  {activeTab === "liquidate" && <LiquidatePanel />}
                </section>
              </main>

              <Sidebar
                connected={connected}
                position={position}
                positionRows={positionRows}
                protocolRows={protocolRows}
                recentActions={recentActions}
              />
            </div>
          </div>
        </div>
      )}

      <footer style={{
        borderTop: "1px solid rgba(0,196,79,0.1)",
        padding: "24px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1360, margin: "0 auto",
        position: "relative", zIndex: 1,
      }}>
        <span style={{ fontSize: 12, color: "#4d7c5e" }}>Powered by <a href="https://arcium.com" style={{ color: "#86efac" }}>Arcium MPC</a></span>
        <span style={{ fontSize: 11, color: "#2d4a35", fontFamily: "'Space Mono', monospace" }}>Cluster Offset: 456 · Recovery: 4 nodes</span>
      </footer>

      <GlobalStyles />
    </div>
  );
}

function TopBar() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: "1px solid rgba(0,196,79,0.12)",
      background: "rgba(5,13,7,0.8)", backdropFilter: "blur(20px)",
    }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldLendMark size={38} />
          <div>
            <span style={{ fontSize: 22, fontWeight: 900 }}>Shield</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#00c44f" }}>Lend</span>
          </div>
          <div style={{
            fontSize: 10, padding: "3px 10px",
            background: "rgba(0,196,79,0.1)", border: "1px solid rgba(0,196,79,0.3)",
            borderRadius: 20, color: "#00c44f", letterSpacing: "0.1em",
            fontFamily: "'Space Mono', monospace",
          }}>DEVNET</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c44f", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: "#6aa878", fontFamily: "'Space Mono', monospace" }}>Devnet · Cluster 456</span>
          </div>
          <WalletBalancePill />
          <WalletMultiButton style={{
            background: "#00c44f", color: "#052210",
            fontSize: 13, fontWeight: 800, borderRadius: 8,
            padding: "10px 20px", border: "none",
          }} />
        </div>
      </div>
    </div>
  );
}

function Hero({ onLaunch }) {
  return (
    <div style={{ paddingTop: 64, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "80px 32px 60px", width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(0,196,79,0.08)", border: "1px solid rgba(0,196,79,0.25)", borderRadius: 20, marginBottom: 40 }}>
          <ShieldLendMark size={22} />
          <span style={{ fontSize: 12, color: "#86efac", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}>PRIVATE DEVNET LENDING VAULT</span>
        </div>

        <h1 style={{ fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 28, maxWidth: 800 }}>
          Lend & Borrow<br />
          <span style={{ color: "#00c44f" }}>Completely Private</span>
        </h1>

        <p style={{ fontSize: 20, color: "#6aa878", lineHeight: 1.75, maxWidth: 660, marginBottom: 48 }}>
          Deposit devnet SOL into a program-controlled vault, borrow against it, repay with slot-based interest,
          and keep sensitive position checks moving through <strong style={{ color: "#86efac" }}>Arcium MPC</strong>.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 80 }}>
          <button
            onClick={onLaunch}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "18px 36px", background: "#00c44f",
              color: "#052210", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              letterSpacing: "0.05em", transition: "all 0.2s",
            }}
          >
            Launch App <ArrowRight size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 80 }}>
          <StatCard value="Live" label="Private Checks" sub="Borrowing and health checks stay confidential" accent />
          <StatCard value="75%" label="Max LTV" sub="Liq. threshold: 80%" />
          <StatCard value="5%" label="Borrow APR" sub="Fixed rate, private interest calc." />
          <StatCard value="4" label="Recovery Nodes" sub="Cluster offset 456 · Arcium devnet" />
        </div>

        <div style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 40 }}>
            How <span style={{ color: "#00c44f" }}>Privacy Works</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { step: "01", title: "Encrypt Client-Side", body: "Your collateral and borrow amounts are encrypted in your browser before sensitive checks run." },
              { step: "02", title: "Store Ciphertext On-Chain", body: "Only encrypted snapshots are written to Solana alongside the vault accounting needed for devnet testing." },
              { step: "03", title: "Compute Privately", body: "Borrow limits, interest, and health checks can run without exposing the user-facing position details." },
              { step: "04", title: "Move Real Devnet SOL", body: "Deposits, borrows, repayments, and withdrawals all interact with the ShieldLend vault PDA." },
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
      </div>
    </div>
  );
}

function LiveDeskSummary({ protocolSummary }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 24, alignItems: "stretch", marginBottom: 28 }}>
      <div style={{
        padding: "26px 28px",
        border: "1px solid rgba(0,196,79,0.16)",
        background: "linear-gradient(135deg, rgba(0,196,79,0.075), rgba(5,13,7,0.70))",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{ position: "absolute", right: 22, top: 22, color: "rgba(0,196,79,0.30)", animation: "float 5s ease-in-out infinite" }}>
          <ShieldLendMark size={96} />
        </div>
        <div style={{ position: "relative", maxWidth: 620 }}>
          <div style={{ fontSize: 12, color: "#00c44f", fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
            Live Borrow Desk
          </div>
          <h2 style={{ fontSize: 34, lineHeight: 1.12, fontWeight: 900, marginBottom: 12 }}>
            Private credit controls, visible wallet proof.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#6aa878", maxWidth: 560, margin: 0 }}>
            Use the tabs below to move SOL through the ShieldLend vault PDA. The app reads your devnet wallet balance,
            tracks your encrypted position account, and logs every Solana/Arcium step in the console.
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)", gap: 10 }}>
        {protocolSummary.map((item) => (
          <div key={item.label} style={{
            padding: "15px 18px",
            border: "1px solid rgba(0,196,79,0.14)",
            background: "rgba(0,0,0,0.24)",
            borderRadius: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
          }}>
            <div>
              <div style={{ fontSize: 12, color: "#6aa878", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#365f42", fontFamily: "'Space Mono', monospace" }}>{item.caption}</div>
            </div>
            <div style={{ fontSize: 20, color: "#f0fdf4", fontWeight: 900, fontFamily: "'Space Mono', monospace", textAlign: "right" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ connected, position, positionRows, protocolRows, recentActions }) {
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <InfoCard title="My Position" badge="ENCRYPTED">
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
                  {k === "Collateral" && position?.collateralHex !== "-" && <WalletIcon size={10} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      <InfoCard title="Protocol">
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {protocolRows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#4d7c5e" }}>{k}</span>
              <span style={{ fontSize: 12, color: "#86efac", fontFamily: "'Space Mono', monospace" }}>{v}</span>
            </div>
          ))}
        </div>
      </InfoCard>

      <InfoCard title="Recent Activity">
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
      </InfoCard>
    </aside>
  );
}

function InfoCard({ title, badge, children }) {
  return (
    <div style={{ background: "rgba(0,196,79,0.03)", border: "1px solid rgba(0,196,79,0.15)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(0,196,79,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4" }}>{title}</span>
        {badge && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c44f" }} />
            <span style={{ fontSize: 10, color: "#00c44f", fontFamily: "'Space Mono', monospace" }}>{badge}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #050d07; }
      @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      @keyframes spin { to{transform:rotate(360deg)} }
      @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
      input::placeholder { color: #2d4a35; }
      input::-webkit-outer-spin-button,input::-webkit-inner-spin-button { -webkit-appearance:none; }
      ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050d07; } ::-webkit-scrollbar-thumb { background: #1a3a22; border-radius: 2px; }
    `}</style>
  );
}
